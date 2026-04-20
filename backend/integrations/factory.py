""""
This module defines the AdapterFactory class,
which instances of platform adapters based on the specified platform name.
It currently supports Etsy and can be easily extended to support additional platforms like Shopify in the future.

The factory provides a centralized way to manage adapter creation and ensures that the correct adapter is returned for each platform.
"""
from .adapters.etsy import EtsyAdapter

class AdapterFactory:
    """Factory for creating platform adapters."""

    _adapters = {
        "etsy": EtsyAdapter,
        # "shopify": ShopifyAdapter,  # Add later
    }

    @staticmethod
    def get_adapter(platform: str, token, shop_id: int):
        """Get an adapter for a platform."""
        platform_lower = platform.lower()

        if platform_lower not in AdapterFactory._adapters:
            raise ValueError(
                f"Unsupported platform: {platform}. "
                f"Supported: {list(AdapterFactory._adapters.keys())}"
            )

        AdapterClass = AdapterFactory._adapters[platform_lower]
        return AdapterClass(token)

    @staticmethod
    def get_supported_platforms():
        """Return list of supported platforms."""
        return list(AdapterFactory._adapters.keys())