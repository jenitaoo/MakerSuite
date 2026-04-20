# ============================================================================
# backend/products/shopify.py
#
# Shopify-specific product listing actions (TODO - implement when needed)
# ============================================================================

import logging
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


class ShopifyProductActions:
    """
    Shopify-specific product listing actions.

    Placeholder for future implementation.
    When ready:
    1. Add ShopifyProductActions to ProductViewSet inheritance
    2. Implement actions: deactivate_shopify, push_to_shopify, etc.
    3. Use ShopifyAdapter (from integrations.adapters.shopify)
    """

    @action(detail=True, methods=["post"], url_path="deactivate-shopify")
    def deactivate_shopify(self, request, pk=None):
        """Deactivate Shopify product listing (TODO)."""
        return Response({"error": "Shopify not yet implemented"}, status=501)

    @action(detail=True, methods=["post"], url_path="push-to-shopify")
    def push_to_shopify(self, request, pk=None):
        """Create or update Shopify product listing (TODO)."""
        return Response({"error": "Shopify not yet implemented"}, status=501)