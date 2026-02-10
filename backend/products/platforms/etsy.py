"""
This module contains the Etsy platform adapter for interacting with Etsy's API.
It implements methods to fetch, create, update, and delete product listings on Etsy.
"""
import requests
from .base import BasePlatformAdapter
from django.conf import settings

class EtsyAdapter(BasePlatformAdapter):
    platform_name = "etsy"
    BASE_URL = "https://api.etsy.com/v3/application"

    def __init__(self, access_token):
        self.access_token = access_token

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "x-api-key": settings.ETSY_KEYSTRING
        }

    def get_shop(self):
        url = f"{self.BASE_URL}/shops"
        response = requests.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def fetch_listings(self):
        # Step 1: call Etsy API
        # Step 2: return normalized listing data
        pass

    def create_listing(self, product):
        # Step 1: send product data to Etsy
        # Step 2: return Etsy listing ID
        pass

    def update_listing(self, listing, product):
        # Step 1: send updated fields to Etsy
        pass

    def delete_listing(self, listing):
        # Step 1: delete listing on Etsy
        pass
