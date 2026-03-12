from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, ExternalProductListingViewSet
from .api import ProductListView

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'external-listings', ExternalProductListingViewSet, basename='external-listings')

urlpatterns = [
    path("", include(router.urls)),
    path("products/list/", ProductListView.as_view(), name="product-list-api"),
]
