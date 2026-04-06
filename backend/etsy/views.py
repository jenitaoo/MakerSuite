"""
Etsy OAuth2 views and API views.
Token refresh is handled automatically by EtsyToken.get_valid_token() —
these views only handle the initial OAuth flow and connection status.
"""
import base64
import hashlib
import secrets
import requests

from django.conf import settings
from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from django.shortcuts import redirect
from django.utils import timezone
from django.views import View
from django.http import JsonResponse, HttpResponseForbidden
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from products.models import ExternalProductListing
from authentication.models import UserProfile
from products.platforms.etsy.etsy import EtsyAdapter
from .models import EtsyToken


def build_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def extract_etsy_user_id(access_token: str) -> str:
    return access_token.split(".", 1)[0]


class EtsyLoginView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        # Store where to return after auth completes
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
    """
    POST /api/etsy/disconnect/
    Removes the stored Etsy token, effectively disconnecting the account.
    The user will need to re-authenticate to use Etsy features again.
    """
    def post(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")
        try:
            request.user.etsy_token.delete()
        except EtsyToken.DoesNotExist:
            pass
        return HttpResponse(status=204)


class EtsyConnectionStatusView(View):
    """
    GET /api/etsy/status/
    Returns whether the user has a valid Etsy connection.
    Used by the Profile page for accurate real-time connection status
    instead of the stale value stored in the auth context.

    etsy_connected: True if a token record exists
    etsy_needs_reauth: True if token is expired AND has no refresh token
                       (automatic refresh is not possible — full re-auth required)
    etsy_token_expired: True if the access token is currently expired
    """
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


class EtsyShopView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        try:
            etsy_token = request.user.etsy_token
        except EtsyToken.DoesNotExist:
            return HttpResponseForbidden("No Etsy token. Authenticate first.")

        try:
            adapter = EtsyAdapter(etsy_token)
            data = adapter.get_shop()
            return JsonResponse(data)
        except Exception as e:
            if "401" in str(e):
                return HttpResponse("Token expired.", status=401)
            return HttpResponse(str(e), status=500)


class EtsyListingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, shop_id):
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


class EtsyUploadImageView(View):
    def post(self, request, shop_id, listing_id):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        listing = ExternalProductListing.objects.filter(
            owner=request.user.userprofile,
            platform="Etsy",
            platform_listing_id=str(listing_id)
        ).first()

        if not listing:
            return JsonResponse({"error": "Listing not found"}, status=404)

        image_file = request.FILES.get("image")
        rank = request.POST.get("rank", 1)

        if not image_file:
            return JsonResponse({"error": "No image provided"}, status=400)

        try:
            etsy_token = request.user.etsy_token
            adapter = EtsyAdapter(etsy_token)
            result = adapter.upload_image(listing, image_file, int(rank))
            return JsonResponse({"uploaded": True, "result": result})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)