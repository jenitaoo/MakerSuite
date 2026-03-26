from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RawMaterialViewSet, MakeViewSet, SaleTagViewSet

router = DefaultRouter()
router.register(r'materials', RawMaterialViewSet, basename='material')
router.register(r'makes', MakeViewSet, basename='make')
router.register(r'tags', SaleTagViewSet, basename='saletag')

urlpatterns = [
    path('', include(router.urls)),
]