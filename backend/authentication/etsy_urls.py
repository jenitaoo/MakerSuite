from django.urls import path
from .etsy_views import (
    EtsyLoginView,
    EtsyCallbackView,
    EtsyDisconnectView,
    EtsyConnectionStatusView,
    EtsyPingView,
    EtsyShopInfoView,
)

urlpatterns = [
    path("login/", EtsyLoginView.as_view(), name="etsy-login"),
    path("callback/", EtsyCallbackView.as_view(), name="etsy-callback"),
    path("disconnect/", EtsyDisconnectView.as_view(), name="etsy-disconnect"),
    path("status/", EtsyConnectionStatusView.as_view(), name="etsy-status"),
    path("ping/", EtsyPingView.as_view(), name="etsy-ping"),
    path("shop/", EtsyShopInfoView.as_view(), name="etsy-shop"),

]