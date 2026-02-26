"""
This module contains the Etsy platform adapter for interacting with Etsy's API.
It implements methods to fetch, create, update, and delete product listings on Etsy.
"""
import requests
from ..base import BasePlatformAdapter
from django.conf import settings

class EtsyAdapter(BasePlatformAdapter):
    platform_name = "etsy"
    BASE_URL = "https://api.etsy.com/v3/application"

    def __init__(self, access_token, etsy_user_id):
        self.access_token = access_token
        self.etsy_user_id = etsy_user_id

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "x-api-key": f"{settings.ETSY_KEYSTRING}:{settings.ETSY_SHARED_SECRET}",
            "Content-Type":"application/json",
        }

    def get_shop(self):
        """
        Fetch the authenticated user's shop using the Etsy endpoint:
        GET /v3/application/users/{user_id}/shops
        """
        url = f"{self.BASE_URL}/users/{self.etsy_user_id}/shops"
        response = requests.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def fetch_listings(self, shop_id):
        """
        Fetch the authenticated user's listings using the Etsy endpoint:
        GET v3/application/shops/{shop_id}/listings/draft
        """
        url = f"{self.BASE_URL}/shops/{shop_id}/listings" # listings vs listings/active works because my shop is temporarily in Developer Mode
        response = requests.get(url, headers=self._headers())
        print("Etsy fetch_listings status:", response.status_code)
        print("Etsy fetch_listings body:", response.text)
        response.raise_for_status()
        return response.json()


    def create_listing(self, product):
        # Step 1: send product data to Etsy
        # Step 2: return Etsy listing ID
        pass

    def update_listing(self, listing, product):
        """
        Update an existing Etsy listing with fields from the internal Product.
        """
        url = f"{self.BASE_URL}/listings/{listing.platform_listing_id}"

        payload = {
            "title": product.title,
            "description": product.description,
            "price": str(product.price),  # Etsy requires string
            "quantity": product.quantity,
            # Add more fields later
        }

        response = requests.put(url, headers=self._headers(), json=payload)

        print("Etsy update_listing status:", response.status_code)
        print("Etsy update_listing body:", response.text)

        response.raise_for_status()
        return response.json()

    def delete_listing(self, listing):
        # Step 1: delete listing on Etsy
        pass
