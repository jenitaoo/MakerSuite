from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RawMaterialViewSet, ProjectViewSet

router = DefaultRouter()
router.register(r'materials', RawMaterialViewSet, basename='material')
router.register(r'projects', ProjectViewSet, basename='project')

urlpatterns = [
    path('', include(router.urls)),
]