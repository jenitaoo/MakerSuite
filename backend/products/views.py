from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from decimal import Decimal

from .platforms.etsy.etsy import EtsyAdapter
from .models import Product, ProductImage, ExternalProductListing, MAX_PRODUCT_IMAGES, SaleTag, SaleLog, Market, MarketProduct
from .serializers import ProductSerializer, ProductImageSerializer, ExternalProductListingSerializer, SaleTagSerializer, SaleLogSerializer, MarketSerializer, MarketProductSerializer
from .sync import SyncManager


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user.userprofile)

    def get_serializer_context(self):
        return {"request": self.request}

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        for img in product.images.all():
            img.image.delete(save=False)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="log-sale", parser_classes=[JSONParser])
    def log_sale(self, request, pk=None):
        """
        POST /api/products/{id}/log-sale/
        Log a sale for this product.
        - Decrements product.internal_quantity
        - Creates a SaleLog linked to this product
        - Creates an InventoryLog entry
        - If product has a linked project, the project's in_stock is
          automatically updated via Project.units_sold (derived from product sale logs)
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"log_sale called for product {pk} with data: {request.data}")
        product = self.get_object()

        units_sold = request.data.get("units_sold")
        sale_date = request.data.get("sale_date")
        tag_ids = request.data.get("tag_ids", [])
        source = request.data.get("source", "manual")
        notes = request.data.get("notes", "")
        sale_price = request.data.get("sale_price", None)
        unit_prices = request.data.get("unit_prices", [])

        if not units_sold:
            return Response({"error": "units_sold is required"}, status=400)
        if not sale_date:
            return Response({"error": "sale_date is required"}, status=400)

        try:
            units_sold = int(units_sold)
            if units_sold <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "units_sold must be a positive integer"}, status=400)

        current_qty = product.internal_quantity or 0
        if units_sold > current_qty:
            return Response(
                {"error": f"Cannot log {units_sold} sold — only {current_qty} in stock"},
                status=400
            )

        # Import here to avoid circular imports
        from products.models import SaleTag, SaleLog
        from inventory.models import InventoryLog

        # Ensure Etsy tag exists if source is etsy
        if source == "etsy":
            etsy_tag, _ = SaleTag.objects.get_or_create(
                owner=request.user.userprofile,
                name="Etsy",
            )
            if etsy_tag.id not in tag_ids:
                tag_ids.append(etsy_tag.id)

        tags = SaleTag.objects.filter(
            id__in=tag_ids,
            owner=request.user.userprofile,
        )

        sale_log = SaleLog.objects.create(
            owner=request.user.userprofile,
            product=product,
            units_sold=units_sold,
            sale_date=sale_date,
            source=source,
            notes=notes or None,
            sale_price=sale_price,
            unit_prices=unit_prices or [],
        )
        sale_log.tags.set(tags)

        # Decrement product internal_quantity
        product.internal_quantity = max(0, current_qty - units_sold)
        product.save(update_fields=["internal_quantity"])

        # Decrement on Etsy too if linked, logic handled in function
        _sync_quantity_to_etsy(request.user, product, product.internal_quantity)

        # Log to InventoryLog for audit trail
        InventoryLog.objects.create(
            owner=request.user.userprofile,
            project=product.project_set.first(),  # linked project if any
            change_type=InventoryLog.CHANGE_SALE,
            quantity_change=-units_sold,
            notes=notes or f"Sale logged for product: {product.title}",
        )

        return Response(SaleLogSerializer(sale_log).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="sales")
    def sales(self, request, pk=None):
        """
        GET /api/products/{id}/sales/
        Returns all sale logs for this product.
        """
        product = self.get_object()
        from products.models import SaleLog
        from products.serializers import SaleLogSerializer
        logs = product.sale_logs.all().order_by("-sale_date")
        return Response(SaleLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["post"], url_path="deactivate-etsy", parser_classes=[JSONParser])
    def deactivate_etsy(self, request, pk=None):
        product = self.get_object()
        linked_listing = ExternalProductListing.objects.filter(
            product=product, platform="Etsy"
        ).first()

        if not linked_listing:
            return Response({"status": "no_listing"})

        try:
            import requests as req_lib
            try:
                etsy_token = request.user.etsy_token
            except Exception:
                return Response({"error": "etsy_not_connected"}, status=400)

            adapter = EtsyAdapter(etsy_token)
            url = f"{adapter.BASE_URL}/shops/{linked_listing.shop_id}/listings/{linked_listing.platform_listing_id}"
            response = req_lib.patch(url, headers=adapter._headers(), json={"state": "inactive"})

            if response.status_code == 401:
                return Response({"error": "etsy_token_expired"}, status=401)

            response.raise_for_status()
            linked_listing.raw = {**linked_listing.raw, "state": "inactive"}
            linked_listing.save(update_fields=["raw"])
            return Response({"status": "deactivated"})

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=["get"])
    def with_listings(self, request, pk=None):
        product = self.get_object()
        listings = ExternalProductListing.objects.filter(product=product)
        return Response({
            "product": ProductSerializer(product, context={"request": request}).data,
            "external_listings": ExternalProductListingSerializer(listings, many=True).data
        })

    @action(detail=True, methods=["post"], url_path="images", parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        product = self.get_object()
        files = request.FILES.getlist("images")

        if not files:
            return Response({"error": "No images provided."}, status=400)

        existing_count = product.images.count()
        if existing_count + len(files) > MAX_PRODUCT_IMAGES:
            slots = MAX_PRODUCT_IMAGES - existing_count
            return Response(
                {"error": f"Too many images. You can upload {slots} more (max {MAX_PRODUCT_IMAGES} total)."},
                status=400
            )

        created = []
        for i, file in enumerate(files):
            img = ProductImage.objects.create(
                product=product, image=file, rank=existing_count + i,
            )
            created.append(ProductImageSerializer(img).data)

        return Response({"uploaded": created}, status=201)

    @action(detail=True, methods=["delete"], url_path="images/(?P<image_id>[^/.]+)")
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        try:
            img = product.images.get(id=image_id)
        except ProductImage.DoesNotExist:
            return Response({"error": "Image not found."}, status=404)
        img.image.delete(save=False)
        img.delete()
        return Response(status=204)

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.sync_product(product)
        return Response({"status": "synced"})

    @action(detail=True, methods=["post"], url_path="push-to-etsy", parser_classes=[JSONParser])
    def push_to_etsy(self, request, pk=None):
        product = self.get_object()

        linked_listing = ExternalProductListing.objects.filter(
            product=product, platform="Etsy"
        ).first()

        etsy_fields = {k: v for k, v in {
            "tags": request.data.get("tags"),
            "materials": request.data.get("materials"),
            "who_made": request.data.get("who_made"),
            "when_made": request.data.get("when_made"),
            "should_auto_renew": request.data.get("should_auto_renew"),
            "is_taxable": request.data.get("is_taxable"),
            "listing_type": request.data.get("listing_type"),
        }.items() if v is not None}

        if not product.internal_price:
            return Response(
                {"error": "Product has no price set. Add a price before pushing to Etsy."},
                status=400
            )

        try:
            import requests as req_lib
            etsy_token = request.user.etsy_token
            adapter = EtsyAdapter(etsy_token)

            if not linked_listing:
                reference = ExternalProductListing.objects.filter(
                    owner=request.user.userprofile,
                    platform="Etsy",
                    shop_id__isnull=False
                ).first()

                reference_raw = reference.raw if reference else None
                shop_id = reference.shop_id if reference else None

                if not shop_id:
                    return Response({"error": "No shop_id available. Refresh Database first."}, status=400)

                result = adapter.create_listing(product, shop_id, reference_raw, etsy_fields)
                new_listing_id = str(result.get("listing_id"))

                listing_res = req_lib.get(
                    f"https://api.etsy.com/v3/application/listings/{new_listing_id}",
                    headers=adapter._headers(),
                    params={"includes": "Images"}
                )
                raw_data = listing_res.json() if listing_res.ok else result

                linked_listing = ExternalProductListing.objects.create(
                    owner=request.user.userprofile,
                    product=product,
                    platform="Etsy",
                    platform_listing_id=new_listing_id,
                    shop_id=shop_id,
                    listing_title=product.title,
                    listing_description=product.description,
                    listing_price=product.internal_price,
                    listing_quantity=product.internal_quantity,
                    raw=raw_data,
                    etsy_tags=etsy_fields.get("tags", []),
                    etsy_materials=etsy_fields.get("materials", []),
                    etsy_who_made=etsy_fields.get("who_made", "i_did"),
                    etsy_when_made=etsy_fields.get("when_made", "made_to_order"),
                    etsy_should_auto_renew=etsy_fields.get("should_auto_renew", True),
                    etsy_is_taxable=etsy_fields.get("is_taxable", True),
                    etsy_listing_type=etsy_fields.get("listing_type", "physical"),
                )

                if "Etsy" not in product.platforms:
                    product.platforms.append("Etsy")
                    product.save(update_fields=["platforms"])

                _push_images_to_etsy(adapter, product, linked_listing, etsy_image_count=0)
                listing_state = raw_data.get("state", "draft")
                return Response({
                    "status": "created",
                    "listing_id": new_listing_id,
                    "listing_state": listing_state,
                })

            else:
                update_fields = []
                field_map = {
                    "tags": "etsy_tags", "materials": "etsy_materials",
                    "who_made": "etsy_who_made", "when_made": "etsy_when_made",
                    "should_auto_renew": "etsy_should_auto_renew",
                    "is_taxable": "etsy_is_taxable", "listing_type": "etsy_listing_type",
                }
                for frontend_key, model_field in field_map.items():
                    if frontend_key in etsy_fields:
                        setattr(linked_listing, model_field, etsy_fields[frontend_key])
                        update_fields.append(model_field)
                if update_fields:
                    linked_listing.save(update_fields=update_fields)

                result = adapter.update_listing(linked_listing, product)

                listings_json = adapter.fetch_listings(linked_listing.shop_id)
                updated = next(
                    (l for l in listings_json.get("results", [])
                     if str(l.get("listing_id")) == linked_listing.platform_listing_id),
                    None
                )
                if updated:
                    linked_listing.raw = updated
                    linked_listing.save(update_fields=["raw"])

                if "Etsy" not in product.platforms:
                    product.platforms.append("Etsy")
                    product.save(update_fields=["platforms"])

                etsy_image_count = len(linked_listing.raw.get("images", []))
                _push_images_to_etsy(adapter, product, linked_listing, etsy_image_count)
                return Response({"status": "pushed", "result": result})

        except Exception as e:
            import requests as req_lib
            if isinstance(e, req_lib.exceptions.HTTPError) and e.response is not None and e.response.status_code == 401:
                return Response({"error": "etsy_token_expired"}, status=401)
            return Response({"error": str(e)}, status=500)


def _push_images_to_etsy(adapter, product, listing, etsy_image_count: int):
    slots_available = MAX_PRODUCT_IMAGES - etsy_image_count
    if slots_available <= 0:
        return
    unpushed = product.images.filter(pushed_to_etsy=False).order_by("rank")[:slots_available]
    for img in unpushed:
        img.image.open("rb")
        try:
            adapter.upload_image(listing, img.image)
            img.pushed_to_etsy = True
            img.save(update_fields=["pushed_to_etsy"])
        finally:
            img.image.close()

def _sync_quantity_to_etsy(user, product, new_quantity: int):
    """
    Silently push updated quantity to Etsy after a sale is logged.
    Never raises — Etsy sync failure should not block the sale from logging.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        etsy_token = user.etsy_token
    except Exception as e:
        logger.warning(f"No Etsy token for user {user.id}: {e}")
        return  # No Etsy connected — skip silently

    listing = ExternalProductListing.objects.filter(
        product=product,
        platform="Etsy",
    ).first()

    if not listing:
        logger.info(f"Product {product.id} not listed on Etsy, skipping sync")
        return  # Product not listed on Etsy — skip silently

    try:
        adapter = EtsyAdapter(etsy_token)
        adapter.update_quantity(listing, new_quantity)
        logger.info(f"Successfully synced product {product.id} to Etsy with quantity {new_quantity}")
    except Exception as e:
        logger.error(f"Failed to sync product {product.id} quantity to Etsy: {e}", exc_info=True)
        return  # Etsy sync failed — log sale still succeeds

class ExternalProductListingViewSet(viewsets.ModelViewSet):
    serializer_class = ExternalProductListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExternalProductListing.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

class SaleTagViewSet(viewsets.ModelViewSet):
    serializer_class = SaleTagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SaleTag.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    def destroy(self, request, *args, **kwargs):
        tag = self.get_object()
        if tag.name == "Etsy":
            return Response(
                {"error": "The Etsy tag is reserved and cannot be deleted"},
                status=400
            )
        return super().destroy(request, *args, **kwargs)

class MarketViewSet(viewsets.ModelViewSet):
    serializer_class = MarketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Market.objects
            .filter(owner=self.request.user)  # ← was .userprofile
            .prefetch_related("market_products__product", "sale_logs")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)  # ← was .userprofile
        # Auto-create a matching sale tag for this market
        market = serializer.save(owner=self.request.user)
        SaleTag.objects.get_or_create(
            owner=self.request.user.userprofile,
            name=market.name,
        )

    @action(detail=True, methods=["get", "post"], url_path="products")
    def products(self, request, pk=None):
        market = self.get_object()

        if request.method == "GET":
            qs = market.market_products.select_related("product")
            return Response(MarketProductSerializer(qs, many=True).data)

        serializer = MarketProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]

        if product.owner != request.user.userprofile:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        mp, created = MarketProduct.objects.update_or_create(
            market=market,
            product=product,
            defaults={"units_brought": serializer.validated_data.get("units_brought", 1)},
        )
        return Response(
            MarketProductSerializer(mp).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["patch", "delete"], url_path="products/(?P<product_pk>[^/.]+)")
    def product_detail(self, request, pk=None, product_pk=None):
        market = self.get_object()
        from django.shortcuts import get_object_or_404
        mp = get_object_or_404(MarketProduct, market=market, product_id=product_pk)

        if request.method == "DELETE":
            mp.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = MarketProductSerializer(mp, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="sales")
    def sales(self, request, pk=None):
        market = self.get_object()

        if request.method == "GET":
            qs = market.sale_logs.select_related("product").order_by("-sale_date")
            return Response(SaleLogSerializer(qs, many=True).data)

        # POST — log a sale against this market
        data = request.data.copy()
        serializer = SaleLogSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data["product"]
        if product.owner != request.user.userprofile:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        units_sold = serializer.validated_data["units_sold"]
        current_qty = product.internal_quantity or 0
        if units_sold > current_qty:
            return Response(
                {"error": f"Cannot log {units_sold} sold — only {current_qty} in stock"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.db import transaction
        with transaction.atomic():
            sale = serializer.save(
                owner=request.user.userprofile,
                market=market,
                source=SaleLog.SOURCE_MANUAL,
            )
            product.internal_quantity = max(0, current_qty - units_sold)
            product.save(update_fields=["internal_quantity"])
            # Push updated quantity to Etsy if product has a linked listing
            _sync_quantity_to_etsy(request.user, product, product.internal_quantity)

        return Response(SaleLogSerializer(sale).data, status=status.HTTP_201_CREATED)