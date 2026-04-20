import base64
import hashlib
import secrets
import requests

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
from integrations.exceptions import PlatformAuthError

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