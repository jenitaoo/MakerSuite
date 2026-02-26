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

    def _build_update_payload(self, listing, product):
        """
        Build the Etsy update payload from the internal Product model.
        """
        return {
            "title": product.title,
            "description": product.description,
            "price": str(product.price),  # Etsy requires string
            "quantity": product.quantity,
            # other fields to be added later
        }

    def _build_inventory_payload(self, product):
        """
        Build Etsy inventory payload including variations.
        """
        return {
            "products": [
                {
                    "sku": product.sku or "",
                    "offerings": [
                        {
                            "price": str(product.price),
                            "quantity": product.quantity,
                            "is_enabled": True,
                        }
                    ]
                }
            ],
            "price_on_property": [],
            "quantity_on_property": [],
            "sku_on_property": []
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
        payload = self._build_update_payload(listing, product)

        response = requests.put(url, headers=self._headers(), json=payload)

        print("Etsy update_listing status:", response.status_code)
        print("Etsy update_listing body:", response.text)

        response.raise_for_status()
        return response.json()

    def update_inventory(self, listing, product):
        url = f"{self.BASE_URL}/listings/{listing.platform_listing_id}/inventory"
        payload = self._build_inventory_payload(product)

        response = requests.put(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def upload_images(self, listing, product):
        """
        Upload images to Etsy for this listing.
        """
        for image in product.images.all():  # adjust to your model
            url = f"{self.BASE_URL}/listings/{listing.platform_listing_id}/images"

            files = {
                "image": open(image.file.path, "rb")
            }

            response = requests.post(url, headers={
                "Authorization": f"Bearer {self.access_token}",
                "x-api-key": f"{settings.ETSY_KEYSTRING}:{settings.ETSY_SHARED_SECRET}",
            }, files=files)

            response.raise_for_status()


    def delete_listing(self, listing):
        # Step 1: delete listing on Etsy
        pass
