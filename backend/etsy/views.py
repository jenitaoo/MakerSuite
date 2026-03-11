from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from products.models import ExternalProductListing
from authentication.models import UserProfile

class EtsyListingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, shop_id):
        # ensure shop_id is an int (error protection against bad input)
        try:
            shop_id_int = int(shop_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid shop_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = request.user.userprofile
        except UserProfile.DoesNotExist:
            return Response({"detail": "User profile not found."}, status=status.HTTP_404_NOT_FOUND)

        listings = ExternalProductListing.objects.filter(owner=profile, shop_id=shop_id_int)

        data = []
        for l in listings:
            raw = l.raw or {}
            # do not mutate l.shop_id here unless you intend to save it
            data.append({
                "id": l.id,
                "platform": l.platform,
                "external_id": raw.get("listing_id"),
                "title": raw.get("title"),
                "description": raw.get("description"),
                "price": {
                    "amount": raw.get("price", {}).get("amount"),
                    "currency": raw.get("price", {}).get("currency_code"),
                },
                "quantity": raw.get("quantity"),
                "state": raw.get("state"),
                "tags": raw.get("tags", []),
                "materials": raw.get("materials", []),
                "skus": raw.get("skus", []),
                "images": raw.get("images"),
                "videos": raw.get("videos"),
                "url": raw.get("url"),
                "shop_id": raw.get("shop_id"),
                "user_id": raw.get("user_id"),
                "when_made": raw.get("when_made"),
                "is_supply": raw.get("is_supply"),
                "is_personalizable": raw.get("is_personalizable"),
                "personalization_instructions": raw.get("personalization_instructions"),
                "personalization_is_required": raw.get("personalization_is_required"),
                "personalization_char_count_max": raw.get("personalization_char_count_max"),
                "has_variations": raw.get("has_variations"),
                "inventory": raw.get("inventory"),
                "taxonomy_id": raw.get("taxonomy_id"),
                "listing_type": raw.get("listing_type"),
                "views": raw.get("views"),
                "num_favorers": raw.get("num_favorers"),
                "created_timestamp": raw.get("created_timestamp"),
                "updated_timestamp": raw.get("updated_timestamp"),
                "processing_min": raw.get("processing_min"),
                "processing_max": raw.get("processing_max"),
                "shipping_profile_id": raw.get("shipping_profile_id"),
                "shop_section_id": raw.get("shop_section_id"),
            })

        return Response(data)
