from django.http import HttpResponseForbidden, JsonResponse
from django.views import View
from .etsy import EtsyAdapter
from .importer import EtsyImporter
from products.sync import SyncManager


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
        imported_products = []

        for listing in results:
            external_listing = importer.import_listing(
                listing_json=listing,
                owner=request.user.userprofile
            )
            imported_ids.append(external_listing.id)
            # Collect linked products for receipt sync
            if external_listing.product:
                imported_products.append(external_listing.product)

        # Sync Etsy receipts → create SaleLogs for any unseen Etsy sales
        if imported_products:
            manager = SyncManager(request.user.userprofile)
            for product in imported_products:
                try:
                    manager.sync_receipts_for_product(product)
                except Exception:
                    pass  # Never block the import if receipt sync fails

        return JsonResponse({"imported_listing_ids": imported_ids})