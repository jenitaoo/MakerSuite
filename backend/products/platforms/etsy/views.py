from django.http import HttpResponseForbidden, JsonResponse
from django.views import View
from .etsy import EtsyAdapter
from .importer import EtsyImporter

class EtsyImportListingsView(View):
    def post(self, request, shop_id):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        etsy_token = request.user.etsy_token

        adapter = EtsyAdapter(etsy_token)

        listings_json = adapter.fetch_listings(shop_id)
        results = listings_json.get("results", [])

        importer = EtsyImporter()
        imported_ids = []

        for listing in results:
            external_listing = importer.import_listing(
                listing_json=listing,
                owner=request.user.userprofile
            )
            imported_ids.append(external_listing.id)

        return JsonResponse({"imported_listing_ids": imported_ids})
