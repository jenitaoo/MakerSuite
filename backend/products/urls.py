from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ExternalProductListingViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'external-listings', ExternalProductListingViewSet, basename='external-listings')

urlpatterns = router.urls