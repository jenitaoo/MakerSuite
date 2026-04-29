import base64
import hashlib
import secrets
import requests
import logging

from django.conf import settings
from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from django.shortcuts import redirect
from django.utils import timezone
from django.views import View
from .models import EtsyToken

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from asgiref.sync import async_to_sync
from integrations.factory import AdapterFactory
from integrations.exceptions import PlatformAuthError, PlatformIntegrationError
from products.models import ExternalProductListing, Product
from products.sync import SyncManager
from authentication.models import UserProfile

logger = logging.getLogger(__name__)


def build_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def extract_etsy_user_id(access_token: str) -> str:
    return access_token.split(".", 1)[0]


class EtsyLoginView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        return_to = request.GET.get("return_to", "/")
        request.session["etsy_auth_return"] = return_to

        code_verifier = secrets.token_urlsafe(64)
        request.session["etsy_code_verifier"] = code_verifier

        code_challenge = build_code_challenge(code_verifier)

        state = secrets.token_urlsafe(16)
        request.session["etsy_state"] = state

        auth_url = (
            "https://www.etsy.com/oauth/connect"
            f"?response_type=code"
            f"&client_id={settings.ETSY_KEYSTRING}"
            f"&redirect_uri={settings.ETSY_REDIRECT_URI}"
            f"&scope={settings.ETSY_SCOPES}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
            f"&state={state}"
        )

        return redirect(auth_url)


class EtsyCallbackView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        code = request.GET.get("code")
        if not code:
            return HttpResponse("Missing code", status=400)

        verifier = request.session.get("etsy_code_verifier")
        if not verifier:
            return HttpResponse("Missing code_verifier", status=400)

        returned_state = request.GET.get("state")
        expected_state = request.session.get("etsy_state")
        if not returned_state or returned_state != expected_state:
            return HttpResponse("Invalid state", status=400)

        token_url = "https://api.etsy.com/v3/public/oauth/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": settings.ETSY_KEYSTRING,
            "redirect_uri": settings.ETSY_REDIRECT_URI,
            "code": code,
            "code_verifier": verifier,
        }

        resp = requests.post(token_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        if resp.status_code != 200:
            return HttpResponse(f"Token exchange failed: {resp.text}", status=resp.status_code)

        payload = resp.json()
        etsy_user_id = extract_etsy_user_id(payload["access_token"])

        EtsyToken.objects.update_or_create(
            user=request.user,
            defaults={
                "etsy_user_id": etsy_user_id,
                "access_token": payload["access_token"],
                "refresh_token": payload.get("refresh_token"),
                "expires_at": timezone.now() + timezone.timedelta(seconds=payload["expires_in"]),
            },
        )

        return_to = request.session.pop("etsy_auth_return", "/")
        return redirect(f"{settings.FRONTEND_URL}{return_to}")


class EtsyDisconnectView(View):
    def post(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")
        try:
            request.user.etsy_token.delete()
        except EtsyToken.DoesNotExist:
            pass
        return HttpResponse(status=204)


class EtsyConnectionStatusView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        try:
            token = request.user.etsy_token
            expired = token.is_expired()
            has_refresh = bool(token.refresh_token)

            return JsonResponse({
                "etsy_connected": True,
                "etsy_needs_reauth": expired and not has_refresh,
                "etsy_token_expired": expired,
            })
        except EtsyToken.DoesNotExist:
            return JsonResponse({
                "etsy_connected": False,
                "etsy_needs_reauth": False,
                "etsy_token_expired": False,
            })


class EtsyPingView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        try:
            token = request.user.etsy_token
        except EtsyToken.DoesNotExist:
            return HttpResponseForbidden("No Etsy token. Authenticate first.")

        headers = {
            "Authorization": f"Bearer {token.get_valid_token()}",
            "x-api-key": settings.ETSY_KEYSTRING,
        }

        resp = requests.get("https://api.etsy.com/v3/application/openapi-ping", headers=headers)
        return JsonResponse({"status": resp.status_code, "body": resp.json()})


class EtsyShopInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """GET /api/etsy/shop/ - Get authenticated shop info"""
        try:
            etsy_token = request.user.etsy_token
        except Exception:
            return Response({"error": "etsy_not_connected"}, status=400)

        try:
            adapter = AdapterFactory.get_adapter("etsy", etsy_token, None)
            data = async_to_sync(adapter.get_shop_info)()
            return Response(data)

        except PlatformAuthError as e:
            return Response({"error": e.message, "requires_reauth": e.requires_reauth}, status=401)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


class EtsyListingsView(APIView):
    """GET /api/etsy/shops/{shop_id}/listings/ - List imported listings from DB"""
    permission_classes = [IsAuthenticated]

    def get(self, request, shop_id):
        try:
            profile = request.user.userprofile
        except UserProfile.DoesNotExist:
            return Response({"detail": "User profile not found."}, status=404)

        listings = ExternalProductListing.objects.filter(owner=profile, shop_id=shop_id)

        data = []
        for l in listings:
            raw = l.raw or {}
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
                "url": raw.get("url"),
                "shop_id": raw.get("shop_id"),
                "taxonomy_id": raw.get("taxonomy_id"),
                "listing_type": raw.get("listing_type"),
                "views": raw.get("views"),
                "num_favorers": raw.get("num_favorers"),
                "shipping_profile_id": raw.get("shipping_profile_id"),
            })

        return Response(data)


class EtsyImportListingsView(APIView):
    """POST /api/etsy/shops/{shop_id}/import/ - Fetch listings from Etsy and save to DB"""
    permission_classes = [IsAuthenticated]

    def post(self, request, shop_id):
        try:
            etsy_token = request.user.etsy_token
        except Exception:
            return Response({"error": "etsy_not_connected"}, status=400)

        try:
            profile = request.user.userprofile
        except UserProfile.DoesNotExist:
            return Response({"detail": "User profile not found."}, status=404)

        try:
            adapter = AdapterFactory.get_adapter("etsy", etsy_token, shop_id)
            listings = async_to_sync(adapter.fetch_listings)(shop_id=shop_id, limit=100)

            logger.info(f"[IMPORT] Fetched {len(listings)} listings from Etsy")

            imported = 0
            updated = 0
            errors = 0

            for listing in listings:
                try:
                    logger.info(f"[IMPORT] Processing listing {listing.external_id}: {listing.title[:50]}, qty={listing.quantity}")

                    existing = ExternalProductListing.objects.filter(
                        owner=profile,
                        platform="Etsy",
                        platform_listing_id=listing.external_id,
                    ).first()

                    if existing:
                        logger.info(f"[IMPORT] Updating existing listing {listing.external_id} (old qty={existing.listing_quantity})")

                        # Update all fields from Etsy
                        existing.raw = listing.raw_data
                        existing.listing_title = listing.title
                        existing.listing_description = listing.description
                        existing.listing_price = listing.price
                        existing.listing_quantity = listing.quantity
                        existing.listing_currency = listing.raw_data.get("price", {}).get("currency_code")

                        # Etsy-specific fields
                        existing.etsy_tags = listing.raw_data.get("tags", [])
                        existing.etsy_materials = listing.raw_data.get("materials", [])
                        existing.etsy_who_made = listing.raw_data.get("who_made", "i_did")
                        existing.etsy_when_made = listing.raw_data.get("when_made", "made_to_order")
                        existing.etsy_should_auto_renew = listing.raw_data.get("should_auto_renew", True)
                        existing.etsy_is_taxable = listing.raw_data.get("is_taxable", True)
                        existing.etsy_listing_type = listing.raw_data.get("listing_type", "physical")

                        # Primary image URL
                        images = listing.raw_data.get("images", [])
                        if images:
                            existing.listing_image_url = images[0].get("url_fullxfull")

                        existing.save()
                        logger.info(f"[IMPORT] Saved listing {listing.external_id} (new qty={listing.quantity})")

                        # Update linked Product
                        if existing.product:
                            logger.info(f"[IMPORT] Updating linked Product {existing.product.id}")
                            existing.product.internal_quantity = listing.quantity
                            existing.product.internal_price = listing.price
                            existing.product.save(update_fields=["internal_quantity", "internal_price"])
                        else:
                            logger.info(f"[IMPORT] Listing {listing.external_id} has no linked Product")

                        updated += 1
                    else:
                        logger.info(f"[IMPORT] Creating new listing {listing.external_id}")

                        images = listing.raw_data.get("images", [])
                        image_url = images[0].get("url_fullxfull") if images else None

                        ExternalProductListing.objects.create(
                            owner=profile,
                            platform="Etsy",
                            platform_listing_id=listing.external_id,
                            shop_id=shop_id,
                            listing_title=listing.title,
                            listing_description=listing.description,
                            listing_price=listing.price,
                            listing_quantity=listing.quantity,
                            listing_currency=listing.raw_data.get("price", {}).get("currency_code"),
                            listing_image_url=image_url,
                            etsy_tags=listing.raw_data.get("tags", []),
                            etsy_materials=listing.raw_data.get("materials", []),
                            etsy_who_made=listing.raw_data.get("who_made", "i_did"),
                            etsy_when_made=listing.raw_data.get("when_made", "made_to_order"),
                            etsy_should_auto_renew=listing.raw_data.get("should_auto_renew", True),
                            etsy_is_taxable=listing.raw_data.get("is_taxable", True),
                            etsy_listing_type=listing.raw_data.get("listing_type", "physical"),
                            raw=listing.raw_data,
                        )
                        imported += 1

                except Exception as e:
                    logger.error(f"[IMPORT] Error processing listing {listing.external_id}: {e}", exc_info=True)
                    errors += 1

            logger.info(f"[IMPORT] Done: imported={imported}, updated={updated}, errors={errors}, total={len(listings)}")

            # ── Sync Etsy receipts as sale logs ──────────────────────────────
            imported_sales = 0
            sales_errors = 0
            try:
                from products.sync import SyncManager
                from products.models import Product, ExternalProductListing
                manager = SyncManager(profile)
                linked_product_ids = ExternalProductListing.objects.filter(
                    owner=profile,
                    platform="Etsy",
                    shop_id=shop_id,
                    product__isnull=False,
                ).values_list("product_id", flat=True).distinct()

                linked_products = Product.objects.filter(id__in=linked_product_ids)

                for product in linked_products:
                    try:
                        manager.sync_receipts_for_product(product)
                        imported_sales += 1
                    except Exception as e:
                        logger.error(f"[IMPORT] Error syncing receipts for product {product.id}: {e}", exc_info=True)
                        sales_errors += 1

                logger.info(f"[IMPORT] Receipt sync done: products_synced={imported_sales}, sales_errors={sales_errors}")
            except Exception as e:
                logger.error(f"[IMPORT] Receipt sync failed: {e}", exc_info=True)

            return Response({
                "status": "success",
                "imported": imported,
                "updated": updated,
                "errors": errors,
                "total": len(listings),
                "sales_synced": imported_sales,
                "sales_errors": sales_errors,
            })

        except PlatformAuthError as e:
            return Response({"error": e.message, "requires_reauth": e.requires_reauth}, status=401)
        except PlatformIntegrationError as e:
            return Response({"error": e.message}, status=e.status_code)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


class EtsyUploadImageView(APIView):
    """POST /api/etsy/shops/{shop_id}/listings/{listing_id}/images/ - Upload image"""
    permission_classes = [IsAuthenticated]

    def post(self, request, shop_id, listing_id):
        listing = ExternalProductListing.objects.filter(
            owner=request.user.userprofile,
            platform="Etsy",
            platform_listing_id=str(listing_id)
        ).first()

        if not listing:
            return Response({"error": "Listing not found"}, status=404)

        image_file = request.FILES.get("image")
        rank = request.POST.get("rank", 1)

        if not image_file:
            return Response({"error": "No image provided"}, status=400)

        try:
            etsy_token = request.user.etsy_token
        except Exception:
            return Response({"error": "etsy_not_connected"}, status=400)

        try:
            adapter = AdapterFactory.get_adapter("etsy", etsy_token, shop_id)
            result = async_to_sync(adapter.upload_image)(listing, image_file, int(rank))
            return Response({"uploaded": True, "result": result})

        except PlatformAuthError as e:
            return Response({"error": e.message}, status=401)
        except PlatformIntegrationError as e:
            return Response({"error": e.message}, status=e.status_code)
        except Exception as e:
            return Response({"error": str(e)}, status=500)