from rest_framework.decorators import action
from rest_framework import viewsets, permissions
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
