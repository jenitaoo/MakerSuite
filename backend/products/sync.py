"""
This module manages synchronization of product listings between the local system
and various external platforms like Etsy and Shopify.
"""

from products.platforms.etsy.etsy import EtsyAdapter
from .models import ExternalProductListing

class SyncManager:
    def __init__(self, user_profile):
        self.user_profile = user_profile
        user = user_profile.user
        self.adapters = {}

        try:
            etsy_token = user.etsy_token
            self.adapters["etsy"] = EtsyAdapter(etsy_token)
        except Exception:
            pass  # No Etsy token, skip Etsy adapter silently

    def sync_product(self, product):
        listings = ExternalProductListing.objects.filter(product=product)
        for listing in listings:
            if listing.product is None:
                continue
            adapter = self.adapters.get(listing.platform.lower())
            if not adapter:
                continue  # Platform not connected, skip
            adapter.update_listing(listing, product)

    def create_missing_listings(self, product):
        existing_platforms = set(
            ExternalProductListing.objects.filter(product=product)
            .values_list("platform", flat=True)
        )

        for platform, adapter in self.adapters.items():
            if platform not in existing_platforms:
                adapter.create_listing(product)

                # Add platform to product
                platform_name = platform.capitalize()  # "etsy" -> "Etsy"
                if platform_name not in product.platforms:
                    product.platforms.append(platform_name)
                    product.save(update_fields=["platforms"])

    def sync_receipts_for_product(self, product):
        """
        Pull Etsy receipts and create SaleLogs for any unseen transactions.
        Platform-agnostic — works for any adapter that implements fetch_receipts.
        """
        listings = ExternalProductListing.objects.filter(
            product=product,
            platform__in=self.adapters.keys()
        )

        for listing in listings:
            adapter = self.adapters.get(listing.platform.lower())
            if not adapter:
                continue

            # Get last sync timestamp to avoid re-processing old receipts
            last_sync = listing.last_synced
            since_ts = 0 # set to 0 to fetch all receipts inc historical

            try:
                receipts = adapter.fetch_receipts(listing.shop_id, since_ts)
            except Exception:
                continue  # Don't block sync if receipts fail

            self._process_receipts(receipts, product, listing, listing.platform)

            # Update last_synced
            from django.utils import timezone
            listing.last_synced = timezone.now()
            listing.save(update_fields=["last_synced"])

    def _process_receipts(self, receipts, product, listing, platform):
        """
        Platform-agnostic receipt processing.
        Etsy receipt structure and Shopify order structure are normalized here.
        """
        from .models import SaleLog, SaleTag
        from django.utils.dateparse import parse_datetime
        import datetime

        for receipt in receipts:
            # Normalize across platforms
            if platform.lower() == "etsy":
                receipt_id = str(receipt.get("receipt_id"))
                created_ts = receipt.get("create_timestamp")
                sale_date = datetime.date.fromtimestamp(created_ts) if created_ts else None
                transactions = receipt.get("transactions", [])
            elif platform.lower() == "shopify":
                receipt_id = str(receipt.get("id"))
                sale_date = receipt.get("created_at", "")[:10]  # "2026-04-14"
                transactions = receipt.get("line_items", [])
            else:
                continue

            for transaction in transactions:
                # Match transaction to this product via listing_id
                if platform.lower() == "etsy":
                    listing_id = str(transaction.get("listing_id"))
                    units_sold = transaction.get("quantity", 1)
                    price = transaction.get("price", {})
                    sale_price = price.get("amount", 0) / price.get("divisor", 100) if price else None
                    external_id = f"etsy_{receipt_id}_{listing_id}"
                elif platform.lower() == "shopify":
                    listing_id = str(transaction.get("product_id"))
                    units_sold = transaction.get("quantity", 1)
                    sale_price = float(transaction.get("price", 0))
                    external_id = f"shopify_{receipt_id}_{listing_id}"

                # Only process transactions for this product's listing
                if listing_id != listing.platform_listing_id:
                    continue

                # Deduplicate — skip if already logged
                if SaleLog.objects.filter(external_id=external_id).exists():
                    continue

                # Get or create Etsy sale tag
                etsy_tag, _ = SaleTag.objects.get_or_create(
                    owner=self.user_profile,
                    name=platform.capitalize(),
                )

                # Create the sale log
                sale_log = SaleLog.objects.create(
                    owner=self.user_profile,
                    product=product,
                    units_sold=units_sold,
                    sale_date=sale_date,
                    source=SaleLog.SOURCE_ETSY if platform.lower() == "etsy" else SaleLog.SOURCE_MANUAL,
                    sale_price=str(round(sale_price * units_sold, 2)) if sale_price else None,
                    unit_prices=[{"unit": i + 1, "price": str(sale_price)} for i in range(units_sold)] if sale_price else [],
                    external_id=external_id,
                )
                sale_log.tags.set([etsy_tag])

                # Decrement internal stock
                product.internal_quantity = max(0, (product.internal_quantity or 0) - units_sold)
                product.save(update_fields=["internal_quantity"])