def normalise_listing(listing):
    price = listing.get("price", {})
    return {
        "id": listing.get("listing_id"),
        "title": listing.get("title"),
        "description": listing.get("description"),
        "price": price.get("amount") / 100 if price else None,
        "currency": price.get("currency_code") if price else None,
        "quantity": listing.get("quantity"),
        "platform": "etsy",
        "raw": listing
    }
