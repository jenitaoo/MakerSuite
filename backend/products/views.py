from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, permissions

from .platforms.etsy.etsy import EtsyAdapter
from .models import Product, ExternalProductListing
from .serializers import ProductSerializer, ExternalProductListingSerializer
from .sync import SyncManager

class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing internal products.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    @action(detail=True, methods=["get"])
    def with_listings(self, request, pk=None):
        product = self.get_object()
        listings = ExternalProductListing.objects.filter(product=product)
        return Response({
            "product": ProductSerializer(product).data,
            "external_listings": ExternalProductListingSerializer(listings, many=True).data
        })

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.sync_product(product)
        return Response({"status": "synced"})

    @action(detail=True, methods=["post"])
    def create_missing(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.create_missing_listings(product)
        return Response({"status": "created_missing"})

    @action(detail=True, methods=["post"], url_path="push-to-etsy")
    def push_to_etsy(self, request, pk=None):
        product = self.get_object()

        linked_listing = ExternalProductListing.objects.filter(
            product=product,
            platform="Etsy"
        ).first()

        # Extract Etsy-specific fields from request body if provided.
        # These are saved to the ExternalProductListing record first,
        # then read by the adapter when building the Etsy API payload.
        # This keeps Product platform-agnostic — Etsy fields never touch the Product model.
        etsy_fields = {
            "tags": request.data.get("tags"),
            "materials": request.data.get("materials"),
            "who_made": request.data.get("who_made"),
            "when_made": request.data.get("when_made"),
            "should_auto_renew": request.data.get("should_auto_renew"),
            "is_taxable": request.data.get("is_taxable"),
            "listing_type": request.data.get("listing_type"),
        }
        # Remove keys where no value was sent (don't overwrite existing with None)
        etsy_fields = {k: v for k, v in etsy_fields.items() if v is not None}

        try:
            etsy_token = request.user.etsy_token
            adapter = EtsyAdapter(
                access_token=etsy_token.access_token,
                etsy_user_id=etsy_token.etsy_user_id
            )

            if not linked_listing:
                # No Etsy listing linked yet — create one
                reference = ExternalProductListing.objects.filter(
                    owner=request.user.userprofile,
                    platform="Etsy",
                    shop_id__isnull=False
                ).first()

                reference_raw = reference.raw if reference else None
                shop_id = reference.shop_id if reference else None

                if not shop_id:
                    return Response(
                        {"error": "No shop_id available. Refresh Database first."},
                        status=400
                    )

                result = adapter.create_listing(product, shop_id, reference_raw, etsy_fields)
                new_listing_id = str(result.get("listing_id"))

                import requests as req
                listing_res = req.get(
                    f"https://api.etsy.com/v3/application/listings/{new_listing_id}",
                    headers=adapter._headers(),
                    params={"includes": "Images"}
                )
                raw_data = listing_res.json() if listing_res.ok else result

                # Save the new listing with Etsy-specific fields populated
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

                if "Etsy" not in product.platforms:
                    product.platforms.append("Etsy")
                    product.save(update_fields=["platforms"])

                return Response({"status": "created", "listing_id": new_listing_id})

            else:
                # Listing exists — save Etsy fields to the listing record first, then push
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

                # Now push to Etsy — adapter reads etsy_* fields from linked_listing
                result = adapter.update_listing(linked_listing, product)

                # Re-fetch from Etsy and update raw
                listings_json = adapter.fetch_listings(linked_listing.shop_id)
                updated = next(
                    (l for l in listings_json.get("results", [])
                     if str(l.get("listing_id")) == linked_listing.platform_listing_id),
                    None
                )
                if updated:
                    linked_listing.raw = updated
                    linked_listing.save(update_fields=["raw"])

                if "Etsy" not in product.platforms:
                    product.platforms.append("Etsy")
                    product.save(update_fields=["platforms"])

                return Response({"status": "pushed", "result": result})

        except Exception as e:
            import requests as req_lib
            if isinstance(e, req_lib.exceptions.HTTPError) and e.response is not None and e.response.status_code == 401:
                return Response({"error": "etsy_token_expired"}, status=401)
            return Response({"error": str(e)}, status=500)


class ExternalProductListingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing external marketplace listings.
    """
    serializer_class = ExternalProductListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExternalProductListing.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user.userprofile,
            platforms=["MakerSuite"]
        )