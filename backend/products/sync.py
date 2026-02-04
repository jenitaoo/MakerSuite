"""
This module manages synchronization of product listings between the local system
and various external platforms like Etsy and Shopify.
"""

from .platforms.etsy import EtsyAdapter
from .models import ExternalProductListing

class SyncManager:
    def __init__(self, user_profile):
        self.user_profile = user_profile
        self.adapters = {
            "etsy": EtsyAdapter(user_profile),
            # "shopify": ShopifyAdapter(user_profile),
            # "amazon": AmazonAdapter(user_profile),
        }

    def sync_product(self, product):
        listings = ExternalProductListing.objects.filter(product=product)

        for listing in listings:
            adapter = self.adapters.get(listing.platform)
            adapter.update_listing(listing, product)

    def create_missing_listings(self, product):
        existing_platforms = set(
            ExternalProductListing.objects.filter(product=product)
            .values_list("platform", flat=True)
        )

        for platform, adapter in self.adapters.items():
            if platform not in existing_platforms:
                adapter.create_listing(product)
