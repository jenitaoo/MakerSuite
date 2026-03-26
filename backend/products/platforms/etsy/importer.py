from django.db import transaction
from django.utils import timezone
from products.models import ExternalProductListing, Product

class EtsyImporter:
    @staticmethod
    def import_listing(listing_json, owner):
        title = listing_json.get("title", "") or "Untitled"
        description = listing_json.get("description", "") or ""

        price_amount = None
        try:
            price_amount = listing_json["price"]["amount"] / 100
        except Exception:
            price_amount = listing_json.get("price", {}).get("amount") or None

        currency = listing_json.get("price", {}).get("currency_code") or listing_json.get("currency") or None
        quantity = listing_json.get("quantity", 0)
        platform_id = str(listing_json.get("listing_id"))

        images = listing_json.get("images") or []
        first_image = next((img for img in images if img.get("rank") == 1), None)
        image_url = first_image.get("url_570xN") if first_image else None

        skus = listing_json.get("skus") or []
        sku = skus[0] if skus else None

        with transaction.atomic():
            listing, created = ExternalProductListing.objects.update_or_create(
                owner=owner,
                platform="Etsy",
                platform_listing_id=platform_id,
                defaults={
                    "shop_id": listing_json.get("shop_id"),
                    "listing_title": title,
                    "listing_description": description,
                    "listing_price": price_amount,
                    "listing_currency": currency,
                    "listing_quantity": quantity,
                    "listing_image_url": image_url,
                    "raw": listing_json,
                }
            )

            if image_url:
                ExternalProductListing.objects.filter(pk=listing.pk).update(listing_image_url=image_url)

            # if already linked to a product, just update it and return
            if listing.product is not None:
                p = listing.product
                p.title = title
                p.description = description
                p.internal_price = price_amount
                p.internal_quantity = quantity
                if "Etsy" not in p.platforms:
                    p.platforms.append("Etsy")
                p.save(update_fields=["title", "description", "internal_price", "internal_quantity", "platforms"])
                listing.linked_at = listing.linked_at or timezone.now()
                listing.save(update_fields=["linked_at"])
                return listing

            # not yet linked — find or create a Product
            product = None

            # only match by SKU if that product has no Etsy listing already
            if sku:
                candidate = Product.objects.filter(owner=owner, sku=sku).first()
                if candidate and not ExternalProductListing.objects.filter(
                    product=candidate, platform="Etsy"
                ).exists():
                    product = candidate

            # create a new Product if no match found
            if not product:
                product = Product.objects.create(
                    owner=owner,
                    title=title,
                    description=description,
                    sku=sku or None,
                    internal_price=price_amount,
                    internal_quantity=quantity,
                    platforms=["MakerSuite", "Etsy"],
                )
            else:
                if "Etsy" not in product.platforms:
                    product.platforms.append("Etsy")
                    product.save(update_fields=["platforms"])

            listing.product = product
            listing.linked_at = timezone.now()
            listing.save(update_fields=["product", "linked_at"])

        return listing