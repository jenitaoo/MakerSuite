"""
This module defines the base class for platform adapters that interact with external product listing platforms.
Each platform (e.g., Etsy, eBay) should implement its own adapter and implementations of the below methods
and inherit from this base class.
"""
class BasePlatformAdapter:
    platform_name = None

    def __init__(self, user_profile):
        self.user_profile = user_profile

    def fetch_listings(self):
        raise NotImplementedError

    def create_listing(self, product):
        raise NotImplementedError

    def update_listing(self, listing, product):
        raise NotImplementedError

    def fetch_receipts(self, shop_id, since_timestamp=0):
        raise NotImplementedError

    def delete_listing(self, listing):
        raise NotImplementedError
