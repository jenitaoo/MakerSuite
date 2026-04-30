"""
This module defines the BasePlatformAdapter interface
What this does is it defines a common set of methods that all platform adapters (Etsy, Shopify, etc.) must implement.
This module also defines the data structures (PlatformListing, PlatformOrder) that adapters should return,

This allows the rest of the system (SyncManager, views) to interact with a consistent interface
 regardless of which platform is being used.

Platform specific logic is implemented in the actual adapter classes (e.g. EtsyAdapter) which inherit from this base class
and implement the abstract methods.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


@dataclass
class PlatformListing:
    """
    Normalized representation of a product listing across platforms.

    Purpose:
    - Unified type for Etsy, Shopify, eBay, etc. listings
    - Decouples business logic from platform-specific API responses
    - Allows same sync/inventory logic to work across all platforms

    Design note:
    raw_data preserves platform-specific response for:
    - Debugging
    - Schema version changes (can re-transform if API changes)
    - Platform-specific fields that don't fit normalized fields
    """
    external_id: str  # Platform's unique ID (Etsy listing_id, Shopify product_id, etc.)
    sku: str  # Product SKU (normalized across platforms)
    platform: str  # "etsy", "shopify", etc.
    title: str
    description: str
    price: float  # In original currency
    quantity: int
    status: str  # "active", "inactive", "draft"
    created_at: datetime
    updated_at: datetime
    images: List[str] = field(default_factory=list)  # Image URLs
    raw_data: Dict[str, Any] = field(default_factory=dict)  # Platform-specific response

    def __str__(self):
        return f"<{self.platform.upper()}:{self.external_id}> {self.title} (${self.price})"


@dataclass
class PlatformOrder:
    """
    Normalized representation of an order/receipt across platforms.

    Purpose:
    - Unified type for Etsy receipts, Shopify orders, etc.
    - Allows SyncManager to process orders from any platform uniformly
    """
    external_id: str  # Platform's order ID
    platform: str  # "etsy", "shopify"
    customer_name: str
    customer_email: str
    total_price: float  # Total order value
    currency: str  # "USD", "EUR", etc.
    status: str  # "processing", "shipped", "completed"
    created_at: datetime
    updated_at: datetime
    items: List[Dict[str, Any]] = field(default_factory=list)  # Line items
    raw_data: Dict[str, Any] = field(default_factory=dict)  # Platform response

    def __str__(self):
        return f"<{self.platform.upper()} Order {self.external_id}> Total: {self.currency}{self.total_price}"


class BasePlatformAdapter(ABC):
    """
    Abstract base class for all platform adapters.

    CONTRACT:
    - All async methods (enables concurrent multi-shop operations)
    - All return Normalized types (PlatformListing, PlatformOrder)
    - All raise PlatformIntegrationError subclasses (unified error handling)
    - All accept model instances (not raw token strings)

    BENEFITS:
    1. Interchangeable: AdapterFactory.get_adapter() returns any adapter
    2. Testable: Mock this interface completely
    3. Extensible: Add Shopify/eBay just by implementing interface
    4. Decoupled: Views don't know which platform they're talking to

    IMPLEMENTING A NEW PLATFORM:
    1. Create backend/integrations/adapters/{platform}/adapter.py
    2. Implement all 16 abstract methods
    3. Implement _to_platform_listing() and _to_platform_order() transformers
    4. Register in AdapterFactory
    5. Done! All existing sync/inventory logic works.
    """

    platform_name: str  # e.g., "etsy", "shopify"

    #  AUTHENTICATION & HEALTH

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Verify token is valid and API is accessible.

        Used:
        - After OAuth callback (confirm connection works)
        - Before syncing (fail early if token expired)
        - In monitoring endpoints

        Returns: True if healthy, raises exception otherwise
        """
        pass

    #  SHOP/ACCOUNT INFO

    @abstractmethod
    async def get_shop_info(self) -> Dict[str, Any]:
        """
        Fetch authenticated user's shop metadata.

        Returns dict with:
        {
            "shop_name": str,
            "shop_id": str,
            "currency": str,
            "timezone": str,
            ...
        }

        Used: OAuth callback to confirm connection
        """
        pass

    #  LISTING OPERATIONS

    @abstractmethod
    async def fetch_listings(
        self,
        shop_id: int,
        limit: int = 100,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> List[PlatformListing]:
        """Fetch listings from shop (paginated)."""
        pass

    @abstractmethod
    async def create_listing(
        self,
        product,  # Product model
        shop_id: int,
        reference_listing_raw: Optional[Dict] = None,
        etsy_fields: Optional[Dict] = None,
    ) -> PlatformListing:
        """Create new listing on platform."""
        pass

    @abstractmethod
    async def update_listing(
        self,
        listing,  # ExternalProductListing model
        product,  # Product model
    ) -> Dict[str, Any]:
        """Update existing listing (metadata + inventory)."""
        pass

    @abstractmethod
    async def deactivate_listing(self, listing) -> bool:
        """Deactivate listing (move to inactive state, don't delete)."""
        pass

    @abstractmethod
    async def delete_listing(self, listing) -> bool:
        """Delete listing (permanent)."""
        pass

    #  INVENTORY/VARIANT MANAGEMENT

    @abstractmethod
    async def update_inventory(
        self,
        listing,  # ExternalProductListing
        product,  # Product
    ) -> Dict[str, Any]:
        """Update inventory quantity for listing."""
        pass

    #  ORDER OPERATIONS

    @abstractmethod
    async def fetch_receipts(
        self,
        shop_id: int,
        since_timestamp: int = 0,
    ) -> List[PlatformOrder]:
        """
        Fetch orders/receipts from shop.

        Args:
            shop_id: Shop ID on platform
            since_timestamp: Only fetch orders after this Unix timestamp
                           (enables incremental sync)

        Returns: List of PlatformOrder objects
        """
        pass

    # IMAGE OPERATIONS

    @abstractmethod
    async def upload_image(
        self,
        listing,  # ExternalProductListing
        image_file,  # File-like object
        rank: int = 1,
    ) -> Dict[str, Any]:
        """Upload image to listing."""
        pass