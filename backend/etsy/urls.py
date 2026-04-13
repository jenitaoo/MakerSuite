from django.urls import path
from .etsy_oath import EtsyLoginView, EtsyCallbackView, EtsyPingView, EtsyShopView
from products.platforms.etsy.views import EtsyImportListingsView
from .views import EtsyListingsView, EtsyDisconnectView, EtsyConnectionStatusView, EtsyUploadImageView

urlpatterns = [
    path("login/", EtsyLoginView.as_view()),
    path("callback/", EtsyCallbackView.as_view()),
    path("ping/", EtsyPingView.as_view()),
    path("shop/", EtsyShopView.as_view()),
    path("shops/<int:shop_id>/import/", EtsyImportListingsView.as_view(), name="etsy-import"),
    path("shops/<int:shop_id>/listings/", EtsyListingsView.as_view(), name="etsy-listings"),
    path("shops/<int:shop_id>/listings/<int:listing_id>/images/", EtsyUploadImageView.as_view(), name="etsy-upload-image"),
    path("disconnect/", EtsyDisconnectView.as_view()),
    path("status/", EtsyConnectionStatusView.as_view()),
]
