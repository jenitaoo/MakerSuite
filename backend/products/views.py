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
    Supports:
    - Listing all products for the authenticated user
    - Creating new products
    - Updating internal product details
    - Deleting products
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    # This custom action retrieves a product along with its associated external listings in one response.
    @action(detail=True, methods=["get"])
    def with_listings(self, request, pk=None):
        product = self.get_object()
        listings = ExternalProductListing.objects.filter(product=product)

        return Response({
            "product": ProductSerializer(product).data,
            "external_listings": ExternalProductListingSerializer(listings, many=True).data
        })

    # This custom action triggers synchronization of the specific product with all linked external platforms.
    # This gives us the POST /products/{id}/sync/ endpoint.
    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.sync_product(product)
        return Response({"status": "synced"})

    # This custom action creates listings on all external platforms where the specific product is not yet listed.
    # This gives us the POST /products/{id}/create_missing/ endpoint.
    @action(detail=True, methods=["post"])
    def create_missing(self, request, pk=None):
        product = self.get_object()
        manager = SyncManager(request.user.userprofile)
        manager.create_missing_listings(product)
        return Response({"status": "created_missing"})

    # This custom action pushes updates for the specific product to etsy.
    # This gives us the POST /products/{id}/push-to-etsy/ endpoint.
    # Note: if the product is not yet listed on Etsy, this will create a new listing.
    # If it is already listed, it will update the existing listing.
    @action(detail=True, methods=["post"], url_path="push-to-etsy")
    def push_to_etsy(self, request, pk=None):
        product = self.get_object()

        # find listing linked to THIS product
        linked_listing = ExternalProductListing.objects.filter(
            product=product,
            platform="Etsy"
        ).first()

        try:
            etsy_token = request.user.etsy_token
            adapter = EtsyAdapter(
                access_token=etsy_token.access_token,
                etsy_user_id=etsy_token.etsy_user_id
            )

            if not linked_listing:
                # no Etsy listing linked to this product yet — create one
                # use any existing listing as reference for shop-specific fields
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

                result = adapter.create_listing(product, shop_id, reference_raw)
                new_listing_id = str(result.get("listing_id"))

                # fetch the new listing directly to get full raw data
                import requests as req
                listing_res = req.get(
                    f"https://api.etsy.com/v3/application/listings/{new_listing_id}",
                    headers=adapter._headers(),
                    params={"includes": "Images"}
                )
                raw_data = listing_res.json() if listing_res.ok else result

                # save the new ExternalProductListing
                ExternalProductListing.objects.create(
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
                )

                # add Etsy to platforms
                if "Etsy" not in product.platforms:
                    product.platforms.append("Etsy")
                    product.save(update_fields=["platforms"])

                return Response({"status": "created", "listing_id": new_listing_id})

            else:
                # listing exists — update it
                result = adapter.update_listing(linked_listing, product)

                # re-fetch from Etsy and update raw
                listings_json = adapter.fetch_listings(linked_listing.shop_id)
                updated = next(
                    (l for l in listings_json.get("results", [])
                    if str(l.get("listing_id")) == linked_listing.platform_listing_id),
                    None
                )
                if updated:
                    linked_listing.raw = updated  # assign new dict, not mutate
                    linked_listing.save(update_fields=["raw"])

                # add Etsy to platforms
                if "Etsy" not in product.platforms:
                    product.platforms.append("Etsy")
                    product.save(update_fields=["platforms"])

                return Response({"status": "pushed", "result": result})

        except Exception as e:
            return Response({"error": str(e)}, status=500)

class ExternalProductListingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing external marketplace listings.
    Supports:
    - Viewing all listings for the authenticated user
    - Linking listings to internal products
    - Editing platform-specific listing details
    - Preparing for sync operations
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