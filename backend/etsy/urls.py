from django.urls import path
from .views import EtsyPingView

urlpatterns = [
    path("ping/", EtsyPingView.as_view()),
]
