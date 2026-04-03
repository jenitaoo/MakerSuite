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
            "Content-Type": "application/json",
        }

    def _build_update_payload(self, listing, product):
        """
        Build the Etsy update payload by combining:
        - Core fields from the internal Product (title, description, price, quantity)
        - Etsy-specific fields from ExternalProductListing (tags, materials, who_made, etc.)
        This keeps Product platform-agnostic while allowing per-platform overrides.
        """
        return {
            # Core fields — always come from the internal product
            "title": product.title,
            "description": product.description,
            "price": float(product.internal_price),
            "quantity": product.internal_quantity,
            # Etsy-specific fields — come from the listing record
            "tags": listing.etsy_tags or [],
            "materials": listing.etsy_materials or [],
            "who_made": listing.etsy_who_made or "i_did",
            "when_made": listing.etsy_when_made or "made_to_order",
            "is_supply": False,  # ← add this
            "should_auto_renew": listing.etsy_should_auto_renew,
            "is_taxable": listing.etsy_is_taxable,
            "type": listing.etsy_listing_type or "physical",
        }

    def _build_inventory_payload(self, product, listing):
        """
        Build Etsy inventory payload including variations.
        """
        raw_sku = product.sku or ""
        sku = raw_sku.strip("[]'\" ").replace("'", "").replace('"', "") if raw_sku.startswith("[") else raw_sku

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
        url = f"{self.BASE_URL}/users/{self.etsy_user_id}/shops"
        response = requests.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def fetch_listings(self, shop_id):
        url = f"{self.BASE_URL}/shops/{shop_id}/listings"
        params = {"includes": "Images"}
        response = requests.get(url, headers=self._headers(), params=params)
        print("Etsy fetch_listings status:", response.status_code)
        print("Etsy fetch_listings body:", response.text)
        response.raise_for_status()
        return response.json()

    def create_listing(self, product, shop_id, reference_listing_raw=None, etsy_fields=None):
        """
        Create a new draft listing on Etsy.
        etsy_fields: optional dict of Etsy-specific fields (tags, materials, who_made, etc.)
        Falls back to safe defaults if not provided.
        """
        url = f"{self.BASE_URL}/shops/{shop_id}/listings"

        shipping_profile_id = None
        return_policy_id = None
        taxonomy_id = 1239

        if reference_listing_raw:
            shipping_profile_id = reference_listing_raw.get("shipping_profile_id")
            return_policy_id = reference_listing_raw.get("return_policy_id")
            taxonomy_id = reference_listing_raw.get("taxonomy_id", taxonomy_id)

        if not shipping_profile_id:
            raise ValueError(
                "No shipping_profile_id available. "
                "Ensure at least one Etsy listing exists in the database to use as a reference."
            )

        if not product.internal_price:
            raise ValueError("Product has no price set. Add a price before pushing to Etsy.")
        
        if not return_policy_id:
            raise ValueError(
                "No return_policy_id available. "
                "Ensure at least one Etsy listing exists in the database to use as a reference."
            )

        fields = etsy_fields or {}

        payload = {
            "title": product.title,
            "description": product.description or "",
            "price": float(product.internal_price),
            "quantity": product.internal_quantity or 1,
            "who_made": fields.get("who_made", "i_did"),
            "when_made": fields.get("when_made", "made_to_order"),
            "tags": fields.get("tags", []),
            "materials": fields.get("materials", []),
            "should_auto_renew": fields.get("should_auto_renew", True),
            "is_taxable": fields.get("is_taxable", True),
            "type": fields.get("listing_type", "physical"),
            "taxonomy_id": taxonomy_id,
            "shipping_profile_id": shipping_profile_id,
            "return_policy_id": return_policy_id,
            "readiness_state_id": reference_listing_raw.get("readiness_state_id", 1404120877583),
        }

        response = requests.post(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def update_listing(self, listing, product):
        """
        Full Etsy update pipeline:
        - update core listing fields (including Etsy-specific fields from listing record)
        - update inventory (price + quantity via variations)
        Images are uploaded separately via the edit page UI.
        """
        core = self._update_core_listing(listing, product)
        inventory = self.update_inventory(listing, product)
        return {
            "core": core,
            "inventory": inventory,
        }

    def _update_core_listing(self, listing, product):
        url = f"{self.BASE_URL}/shops/{listing.shop_id}/listings/{listing.platform_listing_id}"
        payload = self._build_update_payload(listing, product)
        print("Etsy update payload:", payload)
        response = requests.patch(url, headers=self._headers(), json=payload)
        print("Etsy update response:", response.status_code, response.text)
        response.raise_for_status()
        return response.json()

    def update_inventory(self, listing, product):
        url = f"{self.BASE_URL}/listings/{listing.platform_listing_id}/inventory"
        payload = self._build_inventory_payload(product, listing)
        response = requests.put(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def upload_image(self, listing, image_file, rank=1):
        url = f"{self.BASE_URL}/shops/{listing.shop_id}/listings/{listing.platform_listing_id}/images"

        # Determine content type from filename since ImageField files don't have content_type
        import mimetypes
        content_type, _ = mimetypes.guess_type(image_file.name)
        content_type = content_type or "image/jpeg"

        m = MultipartEncoder(
            fields={
                "image": (image_file.name, image_file, content_type),
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
        pass  # Etsy does not support hard deletes via API; instead, we can set quantity to 0 and state to "inactive" if needed.