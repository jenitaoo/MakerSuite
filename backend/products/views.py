from rest_framework.decorators import action
from rest_framework import viewsets, permissions
from .models import Product, ExternalProductListing
from .serializers import ProductSerializer, ExternalProductListingSerializer

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
