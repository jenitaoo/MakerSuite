from products.models import ExternalProductListing

class EtsyImporter:
    @staticmethod
    def import_listing(listing_json, owner):
        """
        Convert Etsy listing JSON into ExternalProductListing.
        Does NOT create internal Product yet, that is a separate workflow.
        """

        # Normalised fields
        title = listing_json.get("title", "")
        description = listing_json.get("description", "")
        price_amount = listing_json["price"]["amount"] / 100
        currency = listing_json["price"]["currency_code"]
        quantity = listing_json.get("quantity", 0)

        # Create or update the external listing
        listing, created = ExternalProductListing.objects.update_or_create(
            owner=owner,
            platform="etsy",
            platform_listing_id=str(listing_json["listing_id"]),
            defaults={
                "listing_title": title,
                "listing_description": description,
                "listing_price": price_amount,
                "listing_currency": currency,
                "listing_quantity": quantity,
                "raw": listing_json,
            }
        )

        return listing
