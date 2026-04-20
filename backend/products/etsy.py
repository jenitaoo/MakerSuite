# ============================================================================
# backend/products/etsy.py
#
# Etsy-specific product listing actions
# ============================================================================

import logging
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser
from asgiref.sync import async_to_sync

from integrations.factory import AdapterFactory
from integrations.exceptions import (
    PlatformAuthError,
    PlatformRateLimitError,
    PlatformValidationError,
    PlatformNotFoundError,
    PlatformIntegrationError,
)
from .models import ExternalProductListing, MAX_PRODUCT_IMAGES

logger = logging.getLogger(__name__)


class EtsyProductActions:
    """Etsy-specific product listing actions (deactivate, push, sync)"""

    @action(detail=True, methods=["post"], url_path="deactivate-etsy", parser_classes=[JSONParser])
    def deactivate_etsy(self, request, pk=None):
        """
        POST /api/products/{id}/deactivate-etsy/

        Deactivate the Etsy listing for this product.
        Changes listing state from "active" to "inactive" (doesn't delete).
        """
        product = self.get_object()
        linked_listing = ExternalProductListing.objects.filter(
            product=product, platform="Etsy"
        ).first()

        if not linked_listing:
            return Response({"status": "no_listing"})

        try:
            etsy_token = request.user.etsy_token
        except Exception:
            return Response({"error": "etsy_not_connected"}, status=400)

        try:
            adapter = AdapterFactory.get_adapter("etsy", etsy_token, linked_listing.shop_id)

            # Wrap async call
            async_to_sync(adapter.deactivate_listing)(linked_listing)

            # Update local cache
            linked_listing.raw = {**linked_listing.raw, "state": "inactive"}
            linked_listing.save(update_fields=["raw"])

            logger.info(f"Deactivated Etsy listing {linked_listing.platform_listing_id} for product {product.id}")
            return Response({"status": "deactivated"})

        except PlatformAuthError as e:
            logger.warning(f"Auth error deactivating listing: {e.message}")
            return Response({
                "error": "Authentication failed",
                "detail": e.message,
                "requires_reauth": e.requires_reauth
            }, status=401)

        except PlatformRateLimitError as e:
            retry_after = e.details.get('retry_after', 60)
            logger.warning(f"Rate limited deactivating listing, retry after {retry_after}s")
            return Response({
                "error": "Rate limited",
                "retry_after": retry_after,
                "detail": e.message
            }, status=429)

        except PlatformNotFoundError as e:
            logger.error(f"Listing not found on Etsy: {e.message}")
            return Response({
                "error": "Listing not found on Etsy",
                "detail": e.message
            }, status=404)

        except PlatformValidationError as e:
            logger.error(f"Validation error: {e.message}")
            return Response({
                "error": "Invalid listing data",
                "detail": e.message,
                "field": e.details.get('field')
            }, status=400)

        except PlatformIntegrationError as e:
            logger.error(f"Etsy error: {e.message}")
            return Response({
                "error": "Etsy error",
                "detail": e.message,
                "code": e.error_code
            }, status=e.status_code)

    @action(detail=True, methods=["post"], url_path="push-to-etsy", parser_classes=[JSONParser])
    def push_to_etsy(self, request, pk=None):
        """
        POST /api/products/{id}/push-to-etsy/

        Create new Etsy listing or update existing one.

        Request body:
        {
            "tags": ["handmade", "vintage"],
            "materials": ["wool", "silk"],
            "who_made": "i_did",
            "when_made": "made_to_order",
            "should_auto_renew": true,
            "is_taxable": true,
            "listing_type": "physical"
        }
        """
        product = self.get_object()
        linked_listing = ExternalProductListing.objects.filter(
            product=product, platform="Etsy"
        ).first()

        # Extract Etsy fields from request
        etsy_fields = {k: v for k, v in {
            "tags": request.data.get("tags"),
            "materials": request.data.get("materials"),
            "who_made": request.data.get("who_made"),
            "when_made": request.data.get("when_made"),
            "should_auto_renew": request.data.get("should_auto_renew"),
            "is_taxable": request.data.get("is_taxable"),
            "listing_type": request.data.get("listing_type"),
        }.items() if v is not None}

        if not product.internal_price:
            return Response(
                {"error": "Product has no price set. Add a price before pushing to Etsy."},
                status=400
            )

        try:
            etsy_token = request.user.etsy_token
        except Exception:
            return Response({"error": "etsy_not_connected"}, status=400)

        try:
            adapter = AdapterFactory.get_adapter("etsy", etsy_token, None)

            if not linked_listing:
                # ========== CREATE NEW LISTING ==========
                return self._create_etsy_listing(
                    request, product, adapter, etsy_fields
                )
            else:
                # ========== UPDATE EXISTING LISTING ==========
                return self._update_etsy_listing(
                    request, product, linked_listing, adapter, etsy_fields
                )

        except PlatformAuthError as e:
            logger.warning(f"Auth error pushing listing: {e.message}")
            return Response({
                "error": "Authentication failed - please reconnect Etsy",
                "detail": e.message,
                "requires_reauth": e.requires_reauth
            }, status=401)

        except PlatformRateLimitError as e:
            retry_after = e.details.get('retry_after', 60)
            logger.warning(f"Rate limited pushing listing, retry after {retry_after}s")
            return Response({
                "error": "Etsy rate limited",
                "retry_after": retry_after,
                "detail": e.message
            }, status=429)

        except PlatformValidationError as e:
            logger.error(f"Validation error: {e.message}")
            return Response({
                "error": "Invalid product data for Etsy",
                "detail": e.message,
                "field": e.details.get('field')
            }, status=400)

        except PlatformNotFoundError as e:
            logger.error(f"Reference listing not found: {e.message}")
            return Response({
                "error": "Reference listing not found",
                "detail": e.message
            }, status=404)

        except PlatformIntegrationError as e:
            logger.error(f"Etsy error: {e.message}")
            return Response({
                "error": "Etsy API error",
                "detail": e.message,
                "code": e.error_code
            }, status=e.status_code)

    def _create_etsy_listing(self, request, product, adapter, etsy_fields):
        """Create new listing on Etsy."""
        # Get reference listing (for shop_id and required profile IDs)
        reference = ExternalProductListing.objects.filter(
            owner=request.user.userprofile,
            platform="Etsy",
            shop_id__isnull=False
        ).first()

        reference_raw = reference.raw if reference else None
        shop_id = reference.shop_id if reference else None

        if not shop_id:
            return Response({
                "error": "No shop_id available. Create at least one listing manually first."
            }, status=400)

        # Call adapter to create listing
        result = async_to_sync(adapter.create_listing)(
            product=product,
            shop_id=shop_id,
            reference_listing_raw=reference_raw,
            etsy_fields=etsy_fields
        )

        new_listing_id = result.external_id
        raw_data = result.raw_data

        # Create database record
        linked_listing = ExternalProductListing.objects.create(
            owner=request.user.userprofile,
            product=product,
            platform="Etsy",
            platform_listing_id=new_listing_id,
            shop_id=shop_id,
            listing_title=product.title,
            listing_description=product.description,
            listing_price=product.internal_price,
            listing_quantity=product.internal_quantity,
            raw=raw_data,
            etsy_tags=etsy_fields.get("tags", []),
            etsy_materials=etsy_fields.get("materials", []),
            etsy_who_made=etsy_fields.get("who_made", "i_did"),
            etsy_when_made=etsy_fields.get("when_made", "made_to_order"),
            etsy_should_auto_renew=etsy_fields.get("should_auto_renew", True),
            etsy_is_taxable=etsy_fields.get("is_taxable", True),
            etsy_listing_type=etsy_fields.get("listing_type", "physical"),
        )

        # Mark product as listed on Etsy
        if "Etsy" not in product.platforms:
            product.platforms.append("Etsy")
            product.save(update_fields=["platforms"])

        # Upload images
        _push_images_to_etsy(adapter, product, linked_listing, etsy_image_count=0)

        listing_state = raw_data.get("state", "draft")
        logger.info(f"Created Etsy listing {new_listing_id} for product {product.id}")

        return Response({
            "status": "created",
            "listing_id": new_listing_id,
            "listing_state": listing_state,
        })

    def _update_etsy_listing(self, request, product, linked_listing, adapter, etsy_fields):
        """Update existing listing on Etsy."""
        # Update etsy_* fields on linked_listing model
        update_fields = []
        field_map = {
            "tags": "etsy_tags",
            "materials": "etsy_materials",
            "who_made": "etsy_who_made",
            "when_made": "etsy_when_made",
            "should_auto_renew": "etsy_should_auto_renew",
            "is_taxable": "etsy_is_taxable",
            "listing_type": "etsy_listing_type",
        }
        for frontend_key, model_field in field_map.items():
            if frontend_key in etsy_fields:
                setattr(linked_listing, model_field, etsy_fields[frontend_key])
                update_fields.append(model_field)
        if update_fields:
            linked_listing.save(update_fields=update_fields)

        # Call adapter to update listing
        result = async_to_sync(adapter.update_listing)(linked_listing, product)

        # Refresh listing data from Etsy
        listings = async_to_sync(adapter.fetch_listings)(
            linked_listing.shop_id,
            limit=100
        )
        updated = next(
            (l for l in listings if l.external_id == linked_listing.platform_listing_id),
            None
        )
        if updated:
            linked_listing.raw = updated.raw_data
            linked_listing.save(update_fields=["raw"])

        # Ensure product marked as listed on Etsy
        if "Etsy" not in product.platforms:
            product.platforms.append("Etsy")
            product.save(update_fields=["platforms"])

        # Upload any unpushed images
        etsy_image_count = len(linked_listing.raw.get("images", []))
        _push_images_to_etsy(adapter, product, linked_listing, etsy_image_count)

        logger.info(f"Updated Etsy listing {linked_listing.platform_listing_id} for product {product.id}")

        return Response({"status": "pushed", "result": result})


def _push_images_to_etsy(adapter, product, listing, etsy_image_count: int):
    """
    Upload unpushed product images to Etsy listing.

    Handles rate limits and auth errors gracefully.
    Continues uploading remaining images even if one fails.
    """
    slots_available = MAX_PRODUCT_IMAGES - etsy_image_count
    if slots_available <= 0:
        logger.debug(f"No image slots available for listing {listing.platform_listing_id}")
        return

    unpushed = product.images.filter(pushed_to_etsy=False).order_by("rank")[:slots_available]

    for img in unpushed:
        try:
            with img.image.open("rb") as f:
                async_to_sync(adapter.upload_image)(listing, f, rank=img.rank)
                img.pushed_to_etsy = True
                img.save(update_fields=["pushed_to_etsy"])
                logger.debug(f"Uploaded image {img.id} to listing {listing.platform_listing_id}")

        except PlatformRateLimitError as e:
            # Stop uploading to respect rate limit
            retry_after = e.details.get('retry_after', 60)
            logger.warning(f"Rate limited uploading image {img.id}, will retry later. Retry after {retry_after}s")
            break

        except PlatformAuthError as e:
            # Auth failed — stop uploading
            logger.error(f"Auth error uploading image {img.id}: {e.message}")
            break

        except PlatformIntegrationError as e:
            # Other platform errors — log and continue
            logger.error(f"Failed to upload image {img.id}: {e.message}")
            continue

        except Exception as e:
            # Unexpected errors — log and continue
            logger.error(f"Unexpected error uploading image {img.id}: {e}", exc_info=True)
            continue


def sync_quantity_to_etsy(user, product, new_quantity: int):
    """
    Silently push updated quantity to Etsy after a sale is logged.

    Never raises exceptions — sale logging must always succeed
    even if Etsy sync fails.

    Used in: log_sale action and market sale logging
    """
    try:
        etsy_token = user.etsy_token
    except Exception as e:
        logger.debug(f"No Etsy token for user {user.id}: {e}")
        return

    listing = ExternalProductListing.objects.filter(
        product=product,
        platform="Etsy",
    ).first()

    if not listing:
        logger.debug(f"Product {product.id} not listed on Etsy, skipping inventory sync")
        return

    if not listing.shop_id or not listing.platform_listing_id:
        logger.warning(f"Product {product.id} listing incomplete (missing shop_id or platform_listing_id), skipping sync")
        return

    try:
        adapter = AdapterFactory.get_adapter("etsy", etsy_token, listing.shop_id)
        async_to_sync(adapter.update_inventory)(listing, product)
        logger.info(f"Synced product {product.id} to Etsy with quantity {new_quantity}")

    except PlatformAuthError as e:
        logger.error(f"Auth error syncing product {product.id} quantity: {e.message}")
        return

    except PlatformRateLimitError as e:
        retry_after = e.details.get('retry_after', 60)
        logger.warning(f"Rate limited syncing product {product.id} quantity, retry after {retry_after}s")
        return

    except PlatformValidationError as e:
        logger.error(f"Validation error syncing product {product.id} quantity: {e.message}")
        return

    except PlatformNotFoundError as e:
        logger.error(f"Listing not found on Etsy for product {product.id}: {e.message}")
        listing.product = None
        listing.save(update_fields=["product"])
        return

    except PlatformIntegrationError as e:
        logger.error(f"Etsy error syncing product {product.id} quantity: {e.message}")
        return

    except Exception as e:
        logger.error(f"Unexpected error syncing product {product.id} quantity: {e}", exc_info=True)
        return
