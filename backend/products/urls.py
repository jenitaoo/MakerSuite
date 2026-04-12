from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ExternalProductListingViewSet, SaleTagViewSet, MarketViewSet
from .api import ProductListView

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'external-listings', ExternalProductListingViewSet, basename='external-listings')
router.register(r'tags', SaleTagViewSet, basename='saletag')
router.register(r'markets', MarketViewSet, basename='market')

urlpatterns = [
    path("product-list/", ProductListView.as_view(), name="product-list-api"),
    path("", include(router.urls)),
]