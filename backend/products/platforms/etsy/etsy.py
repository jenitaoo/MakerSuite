"""
This module contains the Etsy platform adapter for interacting with Etsy's API.
It implements methods to fetch, create, update, and delete product listings on Etsy.
"""
import requests
from ..base import BasePlatformAdapter
from django.conf import settings
from requests_toolbelt import MultipartEncoder

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
            "price": float(product.internal_price),  # Etsy requires string
            "quantity": product.internal_quantity,
            # other fields to be added later
        }


    def _build_inventory_payload(self, product, listing):
        """
        Build Etsy inventory payload including variations.
        """
        # clean the SKU — strip the list formatting if stored as "['WHI']"
        raw_sku = product.sku or ""
        sku = raw_sku.strip("[]'\" ").replace("'", "").replace('"', "") if raw_sku.startswith("[") else raw_sku

        # Etsy requires readiness_state_id for inventory updates; use existing value or default to "Ready for Processing"
        readiness_state_id = listing.raw.get("readiness_state_id")
        if not readiness_state_id:
            raise ValueError(f"No readiness_state_id found in raw data for listing {listing.platform_listing_id}")

        return {
            "products": [
                {
                    "sku": sku,
                    "offerings": [
                        {
                            "price": float(product.internal_price),
                            "quantity": product.internal_quantity,
                            "is_enabled": True,
                            "readiness_state_id": readiness_state_id
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
        params = {"includes": "Images"}
        response = requests.get(url, headers=self._headers(), params=params)
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
        Full Etsy update pipeline:
        - update core listing fields
        - update inventory (variations)
        Images are uploaded separately via the edit page UI, so not handled here.
        """
        # 1. Update core listing fields
        core = self._update_core_listing(listing, product)

        # 2. Update inventory
        inventory = self.update_inventory(listing, product)

        return {
            "core": core,
            "inventory": inventory,
        }

    def _update_core_listing(self, listing, product):
        url = f"{self.BASE_URL}/shops/{listing.shop_id}/listings/{listing.platform_listing_id}"
        payload = self._build_update_payload(listing, product)
        response = requests.patch(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def update_inventory(self, listing, product):
        url = f"{self.BASE_URL}/listings/{listing.platform_listing_id}/inventory"
        payload = self._build_inventory_payload(product, listing)  # pass listing
        response = requests.put(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def upload_image(self, listing, image_file, rank=1):
        url = f"{self.BASE_URL}/shops/{listing.shop_id}/listings/{listing.platform_listing_id}/images"

        m = MultipartEncoder(
            fields={
                "image": (image_file.name, image_file.read(), image_file.content_type),
                "rank": str(rank),
                "overwrite": "true",
            }
        )

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "x-api-key": f"{settings.ETSY_KEYSTRING}:{settings.ETSY_SHARED_SECRET}",
            "Content-Type": m.content_type,
        }

        response = requests.post(url, data=m, headers=headers)
        response.raise_for_status()
        return response.json()


    def delete_listing(self, listing):
        # Step 1: delete listing on Etsy
        pass
