"""
This module manages synchronization of product listings between the local system
and various external platforms like Etsy and Shopify.
"""

from products.platforms.etsy.etsy import EtsyAdapter
from .models import ExternalProductListing

class SyncManager:
    def __init__(self, user_profile):
        self.user_profile = user_profile
        user = user_profile.user
        self.adapters = {}

        try:
            etsy_token = user.etsy_token
            self.adapters["etsy"] = EtsyAdapter(etsy_token)
        except Exception:
            pass  # No Etsy token, skip Etsy adapter silently

    def sync_product(self, product):
        listings = ExternalProductListing.objects.filter(product=product)
        for listing in listings:
            if listing.product is None:
                continue
            adapter = self.adapters.get(listing.platform.lower())
            if not adapter:
                continue  # Platform not connected, skip
            adapter.update_listing(listing, product)

    def create_missing_listings(self, product):
        existing_platforms = set(
            ExternalProductListing.objects.filter(product=product)
            .values_list("platform", flat=True)
        )

        for platform, adapter in self.adapters.items():
            if platform not in existing_platforms:
                adapter.create_listing(product)

                # Add platform to product
                platform_name = platform.capitalize()  # "etsy" -> "Etsy"
                if platform_name not in product.platforms:
                    product.platforms.append(platform_name)
                    product.save(update_fields=["platforms"])
