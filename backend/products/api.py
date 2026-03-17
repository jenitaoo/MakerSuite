from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

class ProductListView(ListAPIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

from authentication.models import UserProfile
from .models import Product
from .serializers import ProductSerializer

# This module contains API views for the Product model. It allows authenticated users to retrieve a list of their products.

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20

class ProductListView(ListAPIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    serializer_class = ProductSerializer
    pagination_class =  StandardResultsSetPagination # Use DRF's built-in pagination

    def get_queryset(self):
        # owner is a UserProfile FK on Product
        try:
            profile = self.request.user.userprofile
        except UserProfile.DoesNotExist:
            return Product.objects.none()
        return Product.objects.filter(owner=profile).order_by("-updated_at")
