"""
Etsy platform adapter.

Token refresh is handled transparently via EtsyToken.get_valid_token().
The adapter never accesses access_token directly — it always calls
get_valid_token() which refreshes automatically if the token is within
5 minutes of expiry or already expired.
"""
import requests
from ..base import BasePlatformAdapter
from django.conf import settings
from requests_toolbelt import MultipartEncoder


class EtsyAdapter(BasePlatformAdapter):
    platform_name = "etsy"
    BASE_URL = "https://api.etsy.com/v3/application"

    def __init__(self, etsy_token):
        """
        Accept the full EtsyToken model instance rather than a raw access token.
        This allows the adapter to call get_valid_token() on every request,
        ensuring the token is always fresh without the caller needing to manage it.
        """
        self._token = etsy_token

    def _get_access_token(self):
        """
        Get a valid access token, refreshing automatically if needed.
        Called internally before every API request.
        """
        return self._token.get_valid_token()

    def _headers(self):
        return {
            "Authorization": f"Bearer {self._get_access_token()}",
            "x-api-key": f"{settings.ETSY_KEYSTRING}:{settings.ETSY_SHARED_SECRET}",
            "Content-Type": "application/json",
        }

    def _build_update_payload(self, listing, product):
        return {
            "title": product.title,
            "description": product.description,
            "price": float(product.internal_price),
            "quantity": product.internal_quantity,
            "tags": listing.etsy_tags or [],
            "materials": listing.etsy_materials or [],
            "who_made": listing.etsy_who_made or "i_did",
            "when_made": listing.etsy_when_made or "made_to_order",
            "is_supply": False,
            "should_auto_renew": listing.etsy_should_auto_renew,
            "is_taxable": listing.etsy_is_taxable,
            "type": listing.etsy_listing_type or "physical",
        }

    def _build_inventory_payload(self, product, listing):
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
                            "readiness_state_id": readiness_state_id,
                        }
                    ],
                }
            ],
            "price_on_property": [],
            "quantity_on_property": [],
            "sku_on_property": [],
        }

    def get_shop(self):
        url = f"{self.BASE_URL}/users/{self._token.etsy_user_id}/shops"
        response = requests.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def fetch_listings(self, shop_id):
        url = f"{self.BASE_URL}/shops/{shop_id}/listings"
        params = {"includes": "Images"}
        response = requests.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        return response.json()

    def create_listing(self, product, shop_id, reference_listing_raw=None, etsy_fields=None):
        url = f"{self.BASE_URL}/shops/{shop_id}/listings"

        shipping_profile_id = None
        return_policy_id = None
        taxonomy_id = 1239

        if reference_listing_raw:
            shipping_profile_id = reference_listing_raw.get("shipping_profile_id")
            return_policy_id = reference_listing_raw.get("return_policy_id")
            taxonomy_id = reference_listing_raw.get("taxonomy_id", taxonomy_id)

        if not shipping_profile_id:
            raise ValueError("No shipping_profile_id available. Ensure at least one Etsy listing exists.")
        if not return_policy_id:
            raise ValueError("No return_policy_id available. Ensure at least one Etsy listing exists.")

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
        core = self._update_core_listing(listing, product)
        inventory = self.update_inventory(listing, product)
        return {"core": core, "inventory": inventory}

    def _update_core_listing(self, listing, product):
        url = f"{self.BASE_URL}/shops/{listing.shop_id}/listings/{listing.platform_listing_id}"
        payload = self._build_update_payload(listing, product)
        response = requests.patch(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def update_inventory(self, listing, product):
        url = f"{self.BASE_URL}/listings/{listing.platform_listing_id}/inventory"
        payload = self._build_inventory_payload(product, listing)
        response = requests.put(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def update_quantity(self, listing, new_quantity: int):
        """
        Push updated quantity to Etsy after a sale is logged in MakerSuite.
        Uses the core listing PATCH endpoint — lightweight, no inventory payload needed.
        Fails silently if listing has no shop_id (shouldn't happen but defensive).
        """
        if not listing.shop_id or not listing.platform_listing_id:
            return None
        url = f"{self.BASE_URL}/shops/{listing.shop_id}/listings/{listing.platform_listing_id}"
        response = requests.patch(url, headers=self._headers(), json={"quantity": new_quantity})
        response.raise_for_status()
        # Update raw so the local cache reflects new quantity
        if listing.raw:
            listing.raw["quantity"] = new_quantity
            listing.save(update_fields=["raw"])
        return response.json()

    def upload_image(self, listing, image_file, rank=1):
        url = f"{self.BASE_URL}/shops/{listing.shop_id}/listings/{listing.platform_listing_id}/images"

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
            "Authorization": f"Bearer {self._get_access_token()}",
            "x-api-key": f"{settings.ETSY_KEYSTRING}:{settings.ETSY_SHARED_SECRET}",
            "Content-Type": m.content_type,
        }

        response = requests.post(url, data=m, headers=headers)
        response.raise_for_status()
        return response.json()

    def fetch_receipts(self, shop_id: int, since_timestamp: int = 0):
        """
        Fetch paid receipts from Etsy since a given Unix timestamp.
        Returns list of receipts each with transactions.
        """
        url = f"{self.BASE_URL}/shops/{shop_id}/receipts"
        params = {
            "was_paid": "true",
            "min_created": since_timestamp,
            "limit": 100,
        }
        response = requests.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        return response.json().get("results", [])

    def delete_listing(self, listing):
        pass