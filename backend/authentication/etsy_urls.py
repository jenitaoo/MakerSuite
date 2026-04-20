from django.urls import path
from .etsy_views import (
    EtsyLoginView,
    EtsyCallbackView,
    EtsyDisconnectView,
    EtsyConnectionStatusView,
    EtsyPingView,
    EtsyShopInfoView,
    EtsyImportListingsView,
    EtsyListingsView,
    EtsyUploadImageView,
)

urlpatterns = [
    path("login/", EtsyLoginView.as_view(), name="etsy-login"),
    path("callback/", EtsyCallbackView.as_view(), name="etsy-callback"),
    path("disconnect/", EtsyDisconnectView.as_view(), name="etsy-disconnect"),
    path("status/", EtsyConnectionStatusView.as_view(), name="etsy-status"),
    path("ping/", EtsyPingView.as_view(), name="etsy-ping"),
    path("shop/", EtsyShopInfoView.as_view(), name="etsy-shop"),
    path("shop/", EtsyShopInfoView.as_view(), name="etsy-shop"),
    path("shops/<int:shop_id>/import/", EtsyImportListingsView.as_view(), name="etsy-import"),
    path("shops/<int:shop_id>/listings/", EtsyListingsView.as_view(), name="etsy-listings"),
    path("shops/<int:shop_id>/listings/<int:listing_id>/images/", EtsyUploadImageView.as_view(), name="etsy-upload-image"),
]