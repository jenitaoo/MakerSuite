from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .platforms.etsy.etsy import EtsyAdapter
from .models import Product, ProductImage, ExternalProductListing, MAX_PRODUCT_IMAGES
from .serializers import ProductSerializer, ProductImageSerializer, ExternalProductListingSerializer
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
        """
        DELETE /api/products/{id}/
        Deletes the product and all associated images from MakerSuite.
        Does NOT touch Etsy — call /deactivate-etsy/ first if needed.
        """
        product = self.get_object()

        # Delete all internal images from disk
        for img in product.images.all():
            img.image.delete(save=False)

        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="deactivate-etsy", parser_classes=[JSONParser])
    def deactivate_etsy(self, request, pk=None):
        """
        POST /api/products/{id}/deactivate-etsy/
        Sets the linked Etsy listing state to 'inactive' (draft).
        Etsy does not allow permanent deletion via API — deactivating is the closest equivalent.
        The seller must go to Etsy manually to permanently delete the listing.
        Returns:
            {"status": "deactivated"} on success
            {"status": "no_listing"} if no Etsy listing is linked
            {"error": "..."} on failure
        """
        product = self.get_object()

        linked_listing = ExternalProductListing.objects.filter(
            product=product,
            platform="Etsy"
        ).first()

        if not linked_listing:
            return Response({"status": "no_listing"})

        try:
            import requests as req_lib
            try:
                etsy_token = request.user.etsy_token
            except Exception:
                return Response(
                    {"error": "etsy_not_connected"},
                    status=400
                )
            adapter = EtsyAdapter(etsy_token)

            url = f"{adapter.BASE_URL}/shops/{linked_listing.shop_id}/listings/{linked_listing.platform_listing_id}"
            response = req_lib.patch(
                url,
                headers=adapter._headers(),
                json={"state": "inactive"},
            )

            if response.status_code == 401:
                return Response({"error": "etsy_token_expired"}, status=401)

            response.raise_for_status()

            # Update raw state locally so UI reflects change immediately
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
        """
        POST /api/products/{id}/images/
        Upload one or more images. Rejects if total would exceed MAX_PRODUCT_IMAGES.
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

        return Response({"uploaded": created}, status=201)

    @action(detail=True, methods=["delete"], url_path="images/(?P<image_id>[^/.]+)")
    def delete_image(self, request, pk=None, image_id=None):
        """
        DELETE /api/products/{id}/images/{image_id}/
        """
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

    @action(detail=True, methods=["post"])
    def create_missing(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.create_missing_listings(product)
        return Response({"status": "created_missing"})

    @action(detail=True, methods=["post"], url_path="push-to-etsy", parser_classes=[JSONParser])
    def push_to_etsy(self, request, pk=None):
        product = self.get_object()

        linked_listing = ExternalProductListing.objects.filter(
            product=product,
            platform="Etsy"
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

                # Return draft status so frontend can show draft badge
                listing_state = raw_data.get("state", "draft")
                return Response({
                    "status": "created",
                    "listing_id": new_listing_id,
                    "listing_state": listing_state,
                })

            else:
                update_fields = []
                field_map = {
                    "tags": "etsy_tags",
                    "materials": "etsy_materials",
                    "who_made": "etsy_who_made",
                    "when_made": "etsy_when_made",
                    "should_auto_renew": "etsy_should_auto_renew",
                    "is_taxable": "etsy_is_taxable",
                    "listing_type": "etsy_listing_type",
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
    """
    Push unpushed internal images to Etsy.
    For new listings (etsy_image_count=0): push all.
    For existing listings: push unpushed images up to (MAX - etsy_image_count) slots.
    Marks each image as pushed_to_etsy=True after successful upload.
    """
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


class ExternalProductListingViewSet(viewsets.ModelViewSet):
    serializer_class = ExternalProductListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExternalProductListing.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)