"""
This module manages synchronization of product listings between the local system
and various external platforms like Etsy and Shopify.
"""

from products.platforms.etsy.etsy import EtsyAdapter
from .models import ExternalProductListing

class SyncManager:
    def __init__(self, user_profile):
        self.user_profile = user_profile
        user = user_profile.user # Get Django User
        etsy_token = user.etsy_token

        self.adapters = {
            "etsy": EtsyAdapter(
                access_token=etsy_token.access_token,
                etsy_user_id=etsy_token.etsy_user_id
            ),
            # "shopify": ShopifyAdapter(user_profile),
            # "amazon": AmazonAdapter(user_profile),
        }

    def sync_product(self, product):
        listings = ExternalProductListing.objects.filter(product=product)

        for listing in listings:
            if listing.product is None:
                print(f"Skipping listing {listing.id}: no internal product attached.")
                continue

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
