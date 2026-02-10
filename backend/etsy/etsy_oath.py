"""
This module handles OAuth2 authentication with Etsy, including login, callback handling, and token management.
It also provides a ping endpoint to test the connection with Etsy's API.
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

from products.platforms.etsy import EtsyAdapter

from .models import EtsyToken

def build_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


class EtsyLoginView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

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

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        resp = requests.post(token_url, data=data, headers=headers)

        if resp.status_code != 200:
            return HttpResponse(f"Token exchange failed: {resp.text}", status=resp.status_code)

        payload = resp.json()

        EtsyToken.objects.update_or_create(
            user=request.user,
            defaults={
                "access_token": payload["access_token"],
                "refresh_token": payload.get("refresh_token"),
                "expires_at": timezone.now() + timezone.timedelta(seconds=payload["expires_in"]),
            },
        )

        return HttpResponse("Etsy connected. You may now call /api/etsy/ping/.")


class EtsyPingView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        try:
            token = request.user.etsy_token
        except EtsyToken.DoesNotExist:
            return HttpResponseForbidden("No Etsy token. Authenticate first.")

        if token.is_expired():
            return HttpResponseForbidden("Token expired.")

        headers = {
            "Authorization": f"Bearer {token.access_token}",
            "x-api-key": settings.ETSY_KEYSTRING,
        }

        resp = requests.get("https://api.etsy.com/v3/application/openapi-ping", headers=headers)

        return JsonResponse({"status": resp.status_code, "body": resp.json()})

class EtsyShopView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("Login required.")

        token = request.user.etsy_token.access_token
        adapter = EtsyAdapter(token)

        data = adapter.get_shop()
        return JsonResponse(data)
