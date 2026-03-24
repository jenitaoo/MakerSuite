from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, permissions

from .platforms.etsy.etsy import EtsyAdapter
from .models import Product, ExternalProductListing
from .serializers import ProductSerializer, ExternalProductListingSerializer
from .sync import SyncManager

class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing internal products.
    Supports:
    - Listing all products for the authenticated user
    - Creating new products
    - Updating internal product details
    - Deleting products
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    # This custom action retrieves a product along with its associated external listings in one response.
    @action(detail=True, methods=["get"])
    def with_listings(self, request, pk=None):
        product = self.get_object()
        listings = ExternalProductListing.objects.filter(product=product)

        return Response({
            "product": ProductSerializer(product).data,
            "external_listings": ExternalProductListingSerializer(listings, many=True).data
        })

    # This custom action triggers synchronization of the specific product with all linked external platforms.
    # This gives us the POST /products/{id}/sync/ endpoint.
    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.sync_product(product)
        return Response({"status": "synced"})

    # This custom action creates listings on all external platforms where the specific product is not yet listed.
    # This gives us the POST /products/{id}/create_missing/ endpoint.
    @action(detail=True, methods=["post"])
    def create_missing(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.create_missing_listings(product)
        return Response({"status": "created_missing"})

    # This custom action pushes updates for the specific product to etsy.
    # This gives us the POST /products/{id}/push-to-etsy/ endpoint.
    # Note: if the product is not yet listed on Etsy, this will create a new listing.
    # If it is already listed, it will update the existing listing.
    @action(detail=True, methods=["post"], url_path="push-to-etsy")
    def push_to_etsy(self, request, pk=None):
        product = self.get_object()

        # Find an existing Etsy listing for this product, if any, to use as a reference for required fields and shop_id
        listing = ExternalProductListing.objects.filter(
            owner=request.user.userprofile,
            platform="Etsy",
            shop_id__isnull=False
        ).first()

        try:
            etsy_token = request.user.etsy_token
            adapter = EtsyAdapter(
                access_token=etsy_token.access_token,
                etsy_user_id=etsy_token.etsy_user_id
            )

            if not listing:
                # no Etsy listing exists yet — create one
                result = adapter.create_listing(product, shop_id=etsy_token.etsy_user_id)
            else:
                # listing exists — update it
                result = adapter.update_listing(listing, product)

                # re-fetch from Etsy and update raw
                listings_json = adapter.fetch_listings(listing.shop_id)
                updated = next(
                    (l for l in listings_json.get("results", [])
                    if str(l.get("listing_id")) == listing.platform_listing_id),
                    None
                )
                if updated:
                    listing.raw = updated
                    listing.save(update_fields=["raw"])

            return Response({"status": "pushed", "result": result})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class ExternalProductListingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing external marketplace listings.
    Supports:
    - Viewing all listings for the authenticated user
    - Linking listings to internal products
    - Editing platform-specific listing details
    - Preparing for sync operations
    """
    serializer_class = ExternalProductListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExternalProductListing.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)