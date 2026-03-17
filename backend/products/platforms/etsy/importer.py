# products/importers/etsy_importer.py
from django.db import transaction
from django.utils import timezone

from products.models import ExternalProductListing, Product

class EtsyImporter:
    @staticmethod
    def import_listing(listing_json, owner):
        """
        Convert Etsy listing JSON into ExternalProductListing and ensure an associated Product exists.
        Always creates or links an internal Product for every imported Etsy listing.
        """
        # Normalised fields
        title = listing_json.get("title", "") or "Untitled"
        description = listing_json.get("description", "") or ""
        # Etsy price in cents
        price_amount = None
        try:
            price_amount = listing_json["price"]["amount"] / 100
        except Exception:
            # fallback if price structure differs
            price_amount = listing_json.get("price", {}).get("amount") or None

        currency = listing_json.get("price", {}).get("currency_code") or listing_json.get("currency") or None
        quantity = listing_json.get("quantity", 0)
        platform_id = str(listing_json.get("listing_id"))

        # Extract first image URL (rank=1)
        images = listing_json.get("images") or []
        first_image = next((img for img in images if img.get("rank") == 1), None)
        image_url = first_image.get("url_570xN") if first_image else None

        with transaction.atomic():
            # Create or update the external listing
            listing, created = ExternalProductListing.objects.update_or_create(
                owner=owner,
                platform="Etsy",
                platform_listing_id=platform_id,
                defaults={
                    "listing_title": title,
                    "listing_description": description,
                    "listing_price": price_amount,
                    "listing_currency": currency,
                    "listing_quantity": quantity,
                    "listing_image_url": image_url,
                    "raw": listing_json,
                }
            )

            # Force save image URL regardless of linked state
            if image_url:
                ExternalProductListing.objects.filter(pk=listing.pk).update(listing_image_url=image_url)

            # If already linked, return early
            if listing.product is not None:
                listing.linked_at = listing.linked_at or timezone.now()
                listing.save(update_fields=["linked_at"])
                return listing

            # Try to find an existing Product to link to
            product = None
            # 1) Try SKU from raw (common places)
            sku = None
            # Etsy may store SKU in different places; try a few keys
            sku = listing_json.get("sku") or listing_json.get("skus") or listing_json.get("variations", {}).get("sku")
            if sku:
                product = Product.objects.filter(owner=owner, sku=sku).first()

            # 2) Try exact title match (case-insensitive)
            if not product and title:
                product = Product.objects.filter(owner=owner, title__iexact=title).first()

            # 3) Create a new Product if none found
            if not product:
                product = Product.objects.create(
                    owner=owner,
                    title=title,
                    description=description,
                    sku=sku or None,
                    internal_price=price_amount,
                    internal_quantity=quantity
                )

            # Link listing -> product
            listing.product = product
            listing.linked_at = timezone.now()
            listing.save(update_fields=["product", "linked_at"])

        return listing
