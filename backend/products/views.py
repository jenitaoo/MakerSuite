# ============================================================================
# backend/products/views.py
#
# Generic product CRUD operations
# Etsy actions in etsy.py, Shopify in shopify.py (Stub)
# When you implement a new platform:
# 1. Create adapter in integrations.adapters.{platform}
# 2. Add to AdapterFactory
# 3. Add platform-specific actions to ProductViewSet (like push_to_{platform}, deactivate_{platform})
# 4. Use SyncManager to sync product data across platforms
# 5. Add ProductActions to the ProductViewSet inheritance
# ============================================================================

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
import logging

from .models import Product, ProductImage, ExternalProductListing, MAX_PRODUCT_IMAGES, SaleTag, SaleLog, Market, MarketProduct
from .serializers import ProductSerializer, ProductImageSerializer, ExternalProductListingSerializer, SaleTagSerializer, SaleLogSerializer, MarketSerializer, MarketProductSerializer
from .etsy import EtsyProductActions, sync_quantity_to_etsy

logger = logging.getLogger(__name__)


class ProductViewSet(EtsyProductActions, viewsets.ModelViewSet):
    """
    Product CRUD operations + Etsy/Shopify listing management

    Endpoints:
    - GET/POST /api/products/
    - GET/PUT/DELETE /api/products/{id}/
    - POST /api/products/{id}/log-sale/
    - GET /api/products/{id}/sales/
    - POST /api/products/{id}/deactivate-etsy/     (from EtsyProductActions)
    - POST /api/products/{id}/push-to-etsy/        (from EtsyProductActions)
    - POST /api/products/{id}/images/
    - DELETE /api/products/{id}/images/{image_id}/
    - GET /api/products/{id}/with_listings/
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        """Filter products by authenticated user."""
        return Product.objects.filter(owner=self.request.user.userprofile)

    def get_serializer_context(self):
        """Pass request to serializers."""
        return {"request": self.request}

    def perform_create(self, serializer):
        """Create product owned by authenticated user."""
        serializer.save(owner=self.request.user.userprofile)

    def destroy(self, request, *args, **kwargs):
        """Delete product and its images."""
        product = self.get_object()
        for img in product.images.all():
            img.image.delete(save=False)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="log-sale", parser_classes=[JSONParser])
    def log_sale(self, request, pk=None):
        """
        POST /api/products/{id}/log-sale/

        Log a manual sale for this product.
        - Decrements product.internal_quantity
        - Creates a SaleLog linked to this product
        - Creates an InventoryLog entry
        - Syncs quantity to Etsy if product has linked listing

        Request body:
        {
            "units_sold": 2,
            "sale_date": "2024-01-15",
            "tag_ids": [1, 2],
            "source": "manual",
            "notes": "Sold at craft fair",
            "sale_price": 59.98,
            "unit_prices": [{"unit": 1, "price": "29.99"}, ...]
        }
        """
        product = self.get_object()

        units_sold = request.data.get("units_sold")
        sale_date = request.data.get("sale_date")
        tag_ids = request.data.get("tag_ids", [])
        source = request.data.get("source", "manual")
        notes = request.data.get("notes", "")
        sale_price = request.data.get("sale_price", None)
        unit_prices = request.data.get("unit_prices", [])

        # Validate units_sold
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

        # Check sufficient inventory
        current_qty = product.internal_quantity or 0
        if units_sold > current_qty:
            return Response(
                {"error": f"Cannot log {units_sold} sold — only {current_qty} in stock"},
                status=400
            )

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

        with transaction.atomic():
            # Create sale log
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

            # Decrement product inventory
            product.internal_quantity = max(0, current_qty - units_sold)
            product.save(update_fields=["internal_quantity"])

            # Sync quantity to Etsy (silent failure OK)
            sync_quantity_to_etsy(request.user, product, product.internal_quantity)

            # Log to InventoryLog for audit trail
            InventoryLog.objects.create(
                owner=request.user.userprofile,
                project=product.project_set.first(),
                change_type=InventoryLog.CHANGE_SALE,
                quantity_change=-units_sold,
                notes=notes or f"Sale logged for product: {product.title}",
            )

        logger.info(f"Logged sale for product {product.id}: {units_sold} units")
        return Response(SaleLogSerializer(sale_log).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="sales")
    def sales(self, request, pk=None):
        """
        GET /api/products/{id}/sales/

        Returns all sale logs for this product, ordered by date.
        """
        product = self.get_object()
        logs = product.sale_logs.all().order_by("-sale_date")
        return Response(SaleLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["get"])
    def with_listings(self, request, pk=None):
        """
        GET /api/products/{id}/with_listings/

        Returns product + all external listings (Etsy, Shopify, etc.)
        """
        product = self.get_object()
        listings = ExternalProductListing.objects.filter(product=product)
        return Response({
            "product": ProductSerializer(product, context={"request": request}).data,
            "external_listings": ExternalProductListingSerializer(listings, many=True).data
        })

    @action(detail=True, methods=["post"], url_path="images", parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        """
        POST /api/products/{id}/images/

        Upload multiple images for this product.
        Max 10 images total per product.
        """
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
                product=product,
                image=file,
                rank=existing_count + i,
            )
            created.append(ProductImageSerializer(img).data)

        logger.info(f"Uploaded {len(created)} images for product {product.id}")
        return Response({"uploaded": created}, status=201)

    @action(detail=True, methods=["delete"], url_path="images/(?P<image_id>[^/.]+)")
    def delete_image(self, request, pk=None, image_id=None):
        """
        DELETE /api/products/{id}/images/{image_id}/

        Delete a specific image from the product.
        """
        product = self.get_object()
        try:
            img = product.images.get(id=image_id)
        except ProductImage.DoesNotExist:
            return Response({"error": "Image not found."}, status=404)

        img.image.delete(save=False)
        img.delete()
        logger.info(f"Deleted image {image_id} from product {product.id}")
        return Response(status=204)


class ExternalProductListingViewSet(viewsets.ModelViewSet):
    """
    External platform listings (Etsy, Shopify, etc.)

    Endpoints:
    - GET/POST /api/external-listings/
    - GET/PUT/DELETE /api/external-listings/{id}/
    """
    serializer_class = ExternalProductListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter by authenticated user."""
        return ExternalProductListing.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        """Create listing owned by authenticated user."""
        serializer.save(owner=self.request.user.userprofile)


class SaleTagViewSet(viewsets.ModelViewSet):
    """
    Sale tags for categorizing sales (Etsy, Shopify, craft fair, etc.)

    Endpoints:
    - GET/POST /api/tags/
    - GET/PUT/DELETE /api/tags/{id}/
    """
    serializer_class = SaleTagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter by authenticated user."""
        return SaleTag.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        """Create tag owned by authenticated user."""
        serializer.save(owner=self.request.user.userprofile)

    def destroy(self, request, *args, **kwargs):
        """Prevent deleting reserved 'Etsy' tag."""
        tag = self.get_object()
        if tag.name == "Etsy":
            return Response(
                {"error": "The Etsy tag is reserved and cannot be deleted"},
                status=400
            )
        return super().destroy(request, *args, **kwargs)

class MarketViewSet(viewsets.ModelViewSet):
    """
    Markets (craft fairs, pop-ups, etc.)

    Endpoints:
    - GET/POST /api/markets/
    - GET/PUT/DELETE /api/markets/{id}/
    - GET /api/markets/{id}/products/ - list products in market
    - POST /api/markets/{id}/products/ - add product to market
    - GET /api/markets/{id}/sales/ - list sales from market
    - POST /api/markets/{id}/sales/ - log sale from market
    """
    serializer_class = MarketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter by authenticated user."""
        return Market.objects.filter(owner=self.request.user).prefetch_related(
            "market_products__product", "sale_logs"
        )

    def perform_create(self, serializer):
        """Create market owned by authenticated user."""
        market = serializer.save(owner=self.request.user)
        # Auto-create matching sale tag
        SaleTag.objects.get_or_create(
            owner=self.request.user.userprofile,
            name=market.name,
        )

    @action(detail=True, methods=["get", "post"], url_path="products")
    def products(self, request, pk=None):
        """GET/POST products in this market."""

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
        """PATCH/DELETE product in market."""
        from .models import MarketProduct
        from .serializers import MarketProductSerializer
        from django.shortcuts import get_object_or_404

        market = self.get_object()
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
        """GET/POST sales from this market."""
        from django.db import transaction

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

        with transaction.atomic():
            sale = serializer.save(
                owner=request.user.userprofile,
                market=market,
                source=SaleLog.SOURCE_MANUAL,
            )
            product.internal_quantity = max(0, current_qty - units_sold)
            product.save(update_fields=["internal_quantity"])
            # Push updated quantity to Etsy if product has a linked listing
            sync_quantity_to_etsy(request.user, product, product.internal_quantity)

        return Response(SaleLogSerializer(sale).data, status=status.HTTP_201_CREATED)