from django.urls import path
from .etsy_oath import EtsyLoginView, EtsyCallbackView, EtsyPingView, EtsyShopView

urlpatterns = [
    path("login/", EtsyLoginView.as_view()),
    path("callback/", EtsyCallbackView.as_view()),
    path("ping/", EtsyPingView.as_view()),
    path("shop/", EtsyShopView.as_view()),
]
