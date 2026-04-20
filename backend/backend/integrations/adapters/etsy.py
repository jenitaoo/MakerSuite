"""
This module provides the EtsyAdapter class, which implements the BasePlatformAdapter interface for integrating with Etsy's API.
It implements the required methods.

"""

import httpx
import logging
import mimetypes
from typing import Dict, List, Optional, Any
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from asgiref.sync import sync_to_async

from products.models import Product, ExternalProductListing

from integrations.interfaces import BasePlatformAdapter, PlatformListing, PlatformOrder
from integrations.exceptions import (
    PlatformAuthError,
    PlatformAPIError,
    PlatformIntegrationError,
    PlatformRateLimitError,
    PlatformValidationError,
    PlatformNotFoundError,
)

logger = logging.getLogger(__name__)


class EtsyAdapter(BasePlatformAdapter):
    """
    Async adapter for Etsy API v3.

    ARCHITECTURE NOTES:

    1. Token Management:
       - Accepts EtsyToken model instance
       - Calls get_valid_token() before every request
       - Token refresh happens automatically if expired
       - Race conditions prevented via select_for_update()

    2. HTTP Layer:
       - Uses httpx.AsyncClient for concurrent requests
       - Single _request() method handles all HTTP verbs
       - Automatic error mapping to PlatformIntegrationError subclasses
       - Timeout: 30 seconds per request

    3. Data Transformation:
       - Etsy response → PlatformListing/PlatformOrder
       - Stored in raw_data field for debugging/schema changes
       - Normalization handles price divisors, timestamp conversion, etc.

    4. Error Handling:
       - Maps HTTP status codes to specific exceptions
       - Preserves Etsy error details in exception.details dict
       - Enables context-aware retries (RateLimitError vs ValidationError)

    5. Concurrency:
       - Async methods allow multiple shops to sync simultaneously
       - Client cleanup via __aenter__/__aexit__ or explicit _close_client()

    Usage:
        adapter = EtsyAdapter(etsy_token_model)
        listings = await adapter.fetch_listings(limit=100)
        # Client cleaned up automatically if used with async context manager
    """

    platform_name = "etsy"
    BASE_URL = "https://api.etsy.com/v3/application"

    def __init__(self, etsy_token):
        """
        Initialize adapter with EtsyToken model instance.

        Args:
            etsy_token: EtsyToken model with get_valid_token() method

        Design decision: Accept model instance, not raw token string.
        Allows adapter to call get_valid_token() automatically,
        hiding token refresh logic from caller.
        """
        self._token = etsy_token
        self._client: Optional[httpx.AsyncClient] = None
        logger.debug(f"EtsyAdapter initialized for user {etsy_token.user.username}")

    #  HTTP CLIENT MANAGEMENT

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client (lazy initialization)."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _close_client(self):
        """Close HTTP client (call on cleanup)."""
        if self._client:
            await self._client.aclose()
            self._client = None

    #  TOKEN & HEADERS

    async def _get_access_token(self) -> str:
        """
        Get valid access token, auto-refreshing if needed.

        Wraps sync EtsyToken.get_valid_token() for async context.
        sync_to_async() runs the sync DB operation in a thread pool,
        keeping the async event loop free for other requests.


        Raises:
            PlatformAuthError: if refresh token missing or refresh fails
        """
        try:
            return await sync_to_async(self._token.get_valid_token)()
        except ValueError as e:
            logger.error(f"EtsyToken refresh failed: {e}")
            raise PlatformAuthError(
                f"Etsy token refresh failed: {str(e)}",
                platform=self.platform_name,
                requires_reauth=True,
            ) from e
        except Exception as e:
            logger.error(f"Unexpected token error: {e}", exc_info=True)
            raise PlatformAuthError(
                f"Unable to get valid Etsy token: {str(e)}",
                platform=self.platform_name,
                requires_reauth=True,
            ) from e

    async def _headers(self) -> Dict[str, str]:
        """
        Build request headers with fresh access token.

        Called before every request to ensure token is fresh.
        Etsy requires:
        - Authorization: Bearer {access_token}
        - x-api-key: {ETSY_KEYSTRING}:{ETSY_SHARED_SECRET}
        """
        token = await self._get_access_token()  # ← await it
        return {
            "Authorization": f"Bearer {token}",
            "x-api-key": f"{settings.ETSY_KEYSTRING}:{settings.ETSY_SHARED_SECRET}",
            "Content-Type": "application/json",
        }

    #  ERROR HANDLING

    def _handle_response_error(self, response: httpx.Response, context: str) -> None:
        """
        Map HTTP errors to PlatformIntegrationError subclasses.

        Args:
            response: HTTP response object
            context: What operation was attempted (for logging)

        Raises:
            Appropriate PlatformIntegrationError subclass

        Design notes:
        - Etsy error structure: {"error": {"code": ..., "message": ...}}
        - Falls back to response.text if JSON parse fails
        - Maps status codes to specific exceptions
        - Preserves Etsy error details for debugging
        """
        status_code = response.status_code

        try:
            data = response.json()
            error_message = data.get("error", {}).get("message", response.text)
        except Exception:
            error_message = response.text

        logger.warning(
            f"Etsy API error [{status_code}] during {context}: {error_message}",
            extra={"status_code": status_code, "context": context}
        )

        # Map status codes to exceptions
        if status_code == 401 or status_code == 403:
            raise PlatformAuthError(
                f"Etsy authentication failed: {error_message}",
                platform=self.platform_name,
                requires_reauth=(status_code == 401),
            )

        elif status_code == 404:
            raise PlatformNotFoundError(
                f"Resource not found: {error_message}",
                platform=self.platform_name,
            )

        elif status_code == 429:
            # Rate limit — Etsy sends Retry-After header
            retry_after = int(response.headers.get("Retry-After", 60))
            raise PlatformRateLimitError(
                f"Etsy rate limit exceeded. Retry after {retry_after}s",
                retry_after=retry_after,
                platform=self.platform_name,
            )

        elif status_code == 400:
            raise PlatformValidationError(
                f"Invalid request: {error_message}",
                platform=self.platform_name,
            )

        elif status_code >= 500:
            raise PlatformAPIError(
                f"Etsy server error [{status_code}]: {error_message}",
                status_code=status_code,
                platform=self.platform_name,
                retryable=True,
            )

        else:
            raise PlatformAPIError(
                f"Etsy API error [{status_code}]: {error_message}",
                status_code=status_code,
                platform=self.platform_name,
            )

    #  HTTP METHODS

    async def _request(
        self,
        method: str,
        endpoint: str,
        context: str = "",
        **kwargs,
    ) -> Dict[str, Any]:
        """Make HTTP request to Etsy API."""
        headers = await self._headers()  # ← await it
        url = f"{self.BASE_URL}{endpoint}"

        client = await self._get_client()

        logger.debug(f"Etsy {method} {endpoint}")

        try:
            response = await client.request(
                method,
                url,
                headers=headers,
                **kwargs,
            )

            if response.status_code >= 400:
                self._handle_response_error(response, context or f"{method} {endpoint}")

            return response.json()

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Etsy API request failed: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Etsy API request failed: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def _get(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """GET request."""
        return await self._request("GET", endpoint, **kwargs)

    async def _post(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """POST request."""
        return await self._request("POST", endpoint, **kwargs)

    async def _patch(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """PATCH request."""
        return await self._request("PATCH", endpoint, **kwargs)

    async def _put(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """PUT request."""
        return await self._request("PUT", endpoint, **kwargs)

    #  DATA TRANSFORMATION

    def _to_platform_listing(self, etsy_data: Dict[str, Any]) -> PlatformListing:
        """
        Transform Etsy listing to normalized PlatformListing.

        Handles:
        - Image URL extraction and ranking
        - Price divisor conversion (Etsy API returns cents)
        - State → status mapping
        - Timestamp conversion

        Design decision: Store raw_data for debugging and schema version changes.
        If Etsy API changes, we can update transformation without losing original data.
        """
        images = [
            img["url_fullxfull"] for img in etsy_data.get("images", [])
        ]

        # Map Etsy state to normalized status
        status_map = {
            "active": "active",
            "inactive": "inactive",
            "draft": "draft",
            "sold_out": "inactive",
            "deactivated": "inactive",
        }
        status = status_map.get(etsy_data.get("state"), "inactive")

        # Handle price (Etsy returns as dict with amount/divisor)
        price_data = etsy_data.get("price", {})
        if isinstance(price_data, dict):
            amount = float(price_data.get("amount", 0))
            divisor = float(price_data.get("divisor", 100))
            price = amount / divisor
        else:
            price = float(price_data or 0)

        return PlatformListing(
            external_id=str(etsy_data["listing_id"]),
            title=etsy_data.get("title", ""),
            description=etsy_data.get("description", ""),
            price=price,
            quantity=etsy_data.get("quantity", 0),
            status=status,
            created_at=datetime.fromtimestamp(etsy_data.get("create_date", 0)),
            updated_at=datetime.fromtimestamp(etsy_data.get("updated_date", 0)),
            images=images,
            sku=etsy_data.get("sku", ""),
            platform=self.platform_name,
            raw_data=etsy_data,
        )

    def _to_platform_order(self, etsy_data: Dict[str, Any]) -> PlatformOrder:
        """Transform Etsy receipt to normalized PlatformOrder."""
        items = []
        for txn in etsy_data.get("transactions", []):
            price_data = txn.get("price", {})
            if isinstance(price_data, dict):
                price = float(price_data.get("amount", 0)) / 100
            else:
                price = float(price_data or 0)

            items.append({
                "sku": txn.get("sku", ""),
                "title": txn.get("title", ""),
                "quantity": txn.get("quantity", 1),
                "price": price,
            })

        # Total price conversion
        total_data = etsy_data.get("total_price", {})
        if isinstance(total_data, dict):
            total = float(total_data.get("amount", 0)) / 100
        else:
            total = float(total_data or 0)

        return PlatformOrder(
            external_id=str(etsy_data["receipt_id"]),
            platform=self.platform_name,
            customer_name=etsy_data.get("buyer_user_id", "Unknown"),
            customer_email=etsy_data.get("buyer_email", ""),
            total_price=total,
            currency=etsy_data.get("total_price", {}).get("currency_code", "USD"),
            status=etsy_data.get("status", "processing"),
            created_at=datetime.fromtimestamp(etsy_data.get("create_date", 0)),
            updated_at=datetime.fromtimestamp(etsy_data.get("update_date", 0)),
            items=items,
            raw_data=etsy_data,
        )

    #  INTERFACE IMPLEMENTATION

    async def health_check(self) -> bool:
        """Verify token is valid and API is accessible."""
        try:
            await self.get_shop_info()
            logger.info("Etsy health check passed")
            return True
        except PlatformAuthError:
            logger.warning("Etsy health check failed: auth error")
            raise
        except Exception as e:
            logger.error(f"Etsy health check failed: {e}")
            return False

    async def get_shop_info(self) -> Dict[str, Any]:
        """
        Fetch authenticated user's shop info.

        Endpoint: /v3/application/shops/1
        Note: Always uses shop ID "1" (authenticated user's shop)
        """
        logger.debug("Fetching Etsy shop info")

        try:
            data = await self._get(
                "/v3/application/shops/1",
                context="fetch shop info"
            )

            shop_info = {
                "shop_name": data.get("shop_name"),
                "shop_id": data.get("shop_id"),
                "user_id": data.get("user_id"),
                "currency": data.get("currency_code"),
                "timezone": data.get("shop_timezone"),
                "created_at": datetime.fromtimestamp(data.get("create_date", 0)),
            }

            logger.info(f"Etsy shop: {shop_info['shop_name']} (ID: {shop_info['shop_id']})")
            return shop_info

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch shop info: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Failed to fetch Etsy shop info: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def fetch_listings(
        self,
        shop_id: int,
        limit: int = 100,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> List[PlatformListing]:
        """
        Fetch listings from Etsy shop.

        Args:
            shop_id: Etsy shop ID
            limit: Max items (clamped to 100)
            offset: Pagination offset
            status: Filter by status ("active", "inactive", "draft")

        Returns:
            List of PlatformListing objects

        Design note: Includes images in single API call (includes="Images")
        """
        logger.debug(f"Fetching Etsy listings (shop={shop_id}, limit={limit})")

        # Map normalized status to Etsy state parameter
        state_map = {
            "active": "active",
            "inactive": "inactive",
            "draft": "draft",
        }
        etsy_state = state_map.get(status) if status else None

        params = {
            "limit": min(limit, 100),  # Etsy max is 100
            "offset": offset,
            "includes": "Images",
        }
        if etsy_state:
            params["state"] = etsy_state

        try:
            data = await self._get(
                f"/v3/application/shops/{shop_id}/listings",
                params=params,
                context="fetch listings"
            )

            listings = [
                self._to_platform_listing(item)
                for item in data.get("results", [])
            ]

            logger.info(f"Fetched {len(listings)} Etsy listings from shop {shop_id}")
            return listings

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch listings: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Failed to fetch Etsy listings: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def create_listing(
        self,
        product: 'Product',
        shop_id: int,
        reference_listing_raw: Optional[Dict] = None,
        etsy_fields: Optional[Dict] = None,
    ) -> PlatformListing:
        """
        Create new listing on Etsy.

        Args:
            product: Product model instance with title, description, price, qty
            shop_id: Etsy shop ID
            reference_listing_raw: Existing listing data (for IDs like shipping_profile_id)
            etsy_fields: Platform-specific fields (who_made, when_made, tags, etc.)

        Returns:
            Created PlatformListing with external_id

        Design notes:
        - Requires reference_listing_raw OR first existing listing
          (to extract required profile IDs)
        - Images uploaded separately after creation
        - Returns listing data with images included
        """
        logger.debug(f"Creating Etsy listing: {product.title}")

        # Validate required product fields
        required = ["title", "description", "internal_price", "internal_quantity"]
        for field in required:
            if not getattr(product, field, None):
                raise PlatformValidationError(
                    f"Product missing required field: {field}",
                    field=field,
                    platform=self.platform_name,
                )

        try:
            # Get reference listing for required Etsy fields
            if not reference_listing_raw:
                existing = await self.fetch_listings(shop_id, limit=1)
                if not existing:
                    raise PlatformValidationError(
                        "No existing listing to reference. Create at least one listing manually.",
                        platform=self.platform_name,
                    )
                reference_listing_raw = existing[0].raw_data

            # Extract required IDs from reference
            shipping_profile_id = reference_listing_raw.get("shipping_profile_id")
            return_policy_id = reference_listing_raw.get("return_policy_id")

            if not shipping_profile_id or not return_policy_id:
                raise PlatformValidationError(
                    "Reference listing missing shipping/return policy IDs",
                    platform=self.platform_name,
                )

            taxonomy_id = reference_listing_raw.get("taxonomy_id", 1239)
            readiness_state_id = reference_listing_raw.get("readiness_state_id", 1404120877583)

            # Build payload
            etsy_fields = etsy_fields or {}
            payload = {
                "title": product.title,
                "description": product.description or "",
                "price": float(product.internal_price),
                "quantity": int(product.internal_quantity) or 1,
                "sku": str(product.sku or ""),
                "tags": etsy_fields.get("tags", [])[:13],  # Etsy max 13
                "materials": etsy_fields.get("materials", [])[:12],  # Etsy max 12
                "who_made": etsy_fields.get("who_made", "i_did"),
                "when_made": etsy_fields.get("when_made", "made_to_order"),
                "should_auto_renew": etsy_fields.get("should_auto_renew", True),
                "is_taxable": etsy_fields.get("is_taxable", True),
                "type": etsy_fields.get("listing_type", "physical"),
                "taxonomy_id": taxonomy_id,
                "shipping_profile_id": shipping_profile_id,
                "return_policy_id": return_policy_id,
                "readiness_state_id": readiness_state_id,
            }

            result = await self._post(
                f"/v3/application/shops/{shop_id}/listings",
                json=payload,
                context="create listing"
            )

            listing_id = result["listing_id"]
            logger.info(f"Created Etsy listing {listing_id}: {product.title}")

            # Upload images if provided
            if hasattr(product, 'images') and product.images.exists():
                await self._upload_product_images(shop_id, listing_id, product)

            return self._to_platform_listing(result)

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create listing: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Failed to create Etsy listing: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def update_listing(
        self,
        listing: 'ExternalProductListing',
        product: 'Product',
    ) -> Dict[str, Any]:
        """
        Update existing listing (metadata + inventory).

        Args:
            listing: ExternalProductListing model
            product: Product model with updated data

        Returns:
            {"core": {...}, "inventory": {...}} response

        Design notes:
        - Etsy separates metadata (title, description) from inventory
        - Calls _update_core_listing() and update_inventory() separately
        - Both must succeed (atomic from caller's perspective)
        """
        logger.debug(f"Updating Etsy listing {listing.platform_listing_id}")

        if not listing.shop_id or not listing.platform_listing_id:
            raise PlatformValidationError(
                "Listing missing shop_id or platform_listing_id",
                platform=self.platform_name,
            )

        try:
            # Update metadata
            core_result = await self._update_core_listing(listing, product)

            # Update inventory
            inventory_result = await self.update_inventory(listing, product)

            logger.info(f"Updated Etsy listing {listing.platform_listing_id}")
            return {"core": core_result, "inventory": inventory_result}

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Failed to update listing: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Failed to update Etsy listing: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def _update_core_listing(
        self,
        listing: 'ExternalProductListing',
        product: 'Product',
    ) -> Dict[str, Any]:
        """Update listing metadata (title, description, tags, etc.)."""
        payload = {
            "title": product.title,
            "description": product.description or "",
            "price": float(product.internal_price),
            "quantity": int(product.internal_quantity) or 0,
            "tags": listing.etsy_tags or [],
            "materials": listing.etsy_materials or [],
            "who_made": listing.etsy_who_made or "i_did",
            "when_made": listing.etsy_when_made or "made_to_order",
            "is_supply": False,
            "should_auto_renew": listing.etsy_should_auto_renew,
            "is_taxable": listing.etsy_is_taxable,
            "type": listing.etsy_listing_type or "physical",
        }

        return await self._patch(
            f"/v3/application/shops/{listing.shop_id}/listings/{listing.platform_listing_id}",
            json=payload,
            context="update listing metadata"
        )

    async def update_inventory(
        self,
        listing: 'ExternalProductListing',
        product: 'Product',
    ) -> Dict[str, Any]:
        """
        Update listing inventory via Etsy's inventory endpoint.

        Note: This is the bulk inventory update, separate from metadata.
        """
        logger.debug(f"Updating inventory for listing {listing.platform_listing_id}")

        raw_sku = product.sku or ""
        # Clean SKU: remove brackets, quotes, etc.
        if raw_sku.startswith("["):
            sku = raw_sku.strip("[]'\" ").replace("'", "").replace('"', "")
        else:
            sku = raw_sku

        readiness_state_id = listing.raw.get("readiness_state_id")
        if not readiness_state_id:
            raise PlatformValidationError(
                f"No readiness_state_id found in listing raw data",
                platform=self.platform_name,
            )

        payload = {
            "products": [
                {
                    "sku": sku,
                    "offerings": [
                        {
                            "price": float(product.internal_price),
                            "quantity": int(product.internal_quantity) or 0,
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

        return await self._put(
            f"/v3/application/listings/{listing.platform_listing_id}/inventory",
            json=payload,
            context="update inventory"
        )

    async def deactivate_listing(self, listing: 'ExternalProductListing') -> bool:
        """Deactivate listing (move to inactive state)."""
        logger.debug(f"Deactivating Etsy listing {listing.platform_listing_id}")

        try:
            await self._patch(
                f"/v3/application/shops/{listing.shop_id}/listings/{listing.platform_listing_id}",
                json={"state": "inactive"},
                context="deactivate listing"
            )
            logger.info(f"Deactivated Etsy listing {listing.platform_listing_id}")
            return True

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Failed to deactivate listing: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Failed to deactivate Etsy listing: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def delete_listing(self, listing: 'ExternalProductListing') -> bool:
        """Delete listing (permanent)."""
        logger.debug(f"Deleting Etsy listing {listing.platform_listing_id}")
        # Etsy DELETE is not commonly used; implement if needed
        raise NotImplementedError("Etsy listing deletion not yet implemented")

    async def fetch_receipts(
        self,
        shop_id: int,
        since_timestamp: int = 0,
    ) -> List[PlatformOrder]:
        """
        Fetch paid receipts from Etsy shop.

        Args:
            shop_id: Etsy shop ID
            since_timestamp: Unix timestamp (only fetch receipts after this)

        Returns:
            List of PlatformOrder objects

        Design notes:
        - Filters by was_paid=true (only paid orders)
        - Includes transactions for full order details
        - Supports incremental sync via since_timestamp
        """
        logger.debug(f"Fetching Etsy receipts (shop={shop_id}, since={since_timestamp})")

        params = {
            "was_paid": "true",
            "min_created": since_timestamp,
            "limit": 100,
            "includes": "Transactions",
        }

        try:
            data = await self._get(
                f"/v3/application/shops/{shop_id}/receipts",
                params=params,
                context="fetch receipts"
            )

            orders = [
                self._to_platform_order(item)
                for item in data.get("results", [])
            ]

            logger.info(f"Fetched {len(orders)} Etsy receipts")
            return orders

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch receipts: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Failed to fetch Etsy receipts: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def upload_image(
        self,
        listing: 'ExternalProductListing',
        image_file,
        rank: int = 1,
    ) -> Dict[str, Any]:
        """
        Upload image to listing via multipart form data.

        Args:
            listing: ExternalProductListing model
            image_file: File-like object (Django UploadedFile)
            rank: Image rank/order (1 = primary)

        Returns:
            API response
        """
        logger.debug(f"Uploading image to Etsy listing {listing.platform_listing_id}")

        content_type, _ = mimetypes.guess_type(image_file.name)
        content_type = content_type or "image/jpeg"

        files = {
            "image": (image_file.name, image_file.read(), content_type),
            "rank": (None, str(rank)),
            "overwrite": (None, "true"),
        }

        try:
            result = await self._request(
                "POST",
                f"/v3/application/shops/{listing.shop_id}/listings/{listing.platform_listing_id}/images",
                json=False,  # Don't set Content-Type
                files=files,
                context="upload image"
            )
            logger.info(f"Uploaded image to listing {listing.platform_listing_id}")
            return result

        except PlatformIntegrationError:
            raise
        except Exception as e:
            logger.error(f"Failed to upload image: {e}", exc_info=True)
            raise PlatformAPIError(
                f"Failed to upload Etsy image: {str(e)}",
                platform=self.platform_name,
            ) from e

    async def _upload_product_images(
        self,
        shop_id: int,
        listing_id: int,
        product: 'Product',
    ) -> None:
        """Upload all product images to a listing."""
        if not hasattr(product, 'images'):
            return

        for idx, product_image in enumerate(product.images.all()[:10]):  # Etsy max 10
            try:
                with product_image.image.open('rb') as f:
                    await self.upload_image(
                        type('DummyListing', (), {
                            'shop_id': shop_id,
                            'platform_listing_id': listing_id,
                        })(),
                        f,
                        rank=idx + 1,
                    )
            except Exception as e:
                logger.warning(f"Failed to upload image {idx}: {e}")
                # Don't fail the whole creation for one image
                continue

    #  ASYNC CONTEXT MANAGER

    async def __aenter__(self):
        """Allow use with async with statement."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up client on exit."""
        await self._close_client()
        return False

