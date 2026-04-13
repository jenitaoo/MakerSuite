"""
Etsy OAuth token model with automatic refresh support.

Design decisions documented for report:
- select_for_update() prevents race conditions when multiple requests
  fire simultaneously on an expired token
- Refresh happens 5 minutes before actual expiry (REFRESH_BUFFER_SECONDS)
  to account for network latency and clock skew
- Refresh token rotation: Etsy issues a new refresh token on every refresh,
  old one is immediately invalidated — must store the new one atomically
- 90-day refresh token expiry: if user is inactive for 90 days, a full
  re-authentication (OAuth redirect) is required
"""
from django.db import models, transaction
from django.utils import timezone
from django.conf import settings
import requests

# Refresh 5 minutes before actual expiry to avoid edge case failures
REFRESH_BUFFER_SECONDS = 300


class EtsyToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="etsy_token"
    )
    etsy_user_id = models.CharField(max_length=100)
    access_token = models.TextField()
    refresh_token = models.TextField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"EtsyToken for {self.user.username}"

    def is_expired(self):
        """Returns True if the access token has expired or will expire within the buffer window."""
        if not self.expires_at:
            return True
        buffer = timezone.timedelta(seconds=REFRESH_BUFFER_SECONDS)
        return timezone.now() >= (self.expires_at - buffer)

    def refresh(self):
        """
        Exchange the refresh token for a new access token and refresh token.

        Etsy rotates refresh tokens on every use — the old refresh token is
        immediately invalidated. The new tokens are saved atomically inside a
        database transaction to prevent partial saves.

        Raises:
            ValueError: if no refresh token is stored (full re-auth required)
            requests.HTTPError: if Etsy rejects the refresh (e.g. refresh token expired)
        """
        if not self.refresh_token:
            raise ValueError("No refresh token available. User must re-authenticate.")

        response = requests.post(
            "https://api.etsy.com/v3/public/oauth/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "refresh_token",
                "client_id": settings.ETSY_KEYSTRING,
                "refresh_token": self.refresh_token,
            },
        )
        response.raise_for_status()
        payload = response.json()

        # Atomically save new tokens — if this fails, the old tokens remain intact
        with transaction.atomic():
            self.access_token = payload["access_token"]
            self.refresh_token = payload.get("refresh_token", self.refresh_token)
            self.expires_at = timezone.now() + timezone.timedelta(seconds=payload["expires_in"])
            self.save(update_fields=["access_token", "refresh_token", "expires_at", "updated_at"])

    def get_valid_token(self):
        """
        Returns a valid access token, refreshing automatically if needed.

        Uses select_for_update() to prevent race conditions — if multiple
        requests fire simultaneously on an expired token, only one will
        execute the refresh. Others wait and then find a valid token.

        This is the method EtsyAdapter should call instead of accessing
        access_token directly.

        Raises:
            ValueError: if refresh token is missing (needs full re-auth)
            requests.HTTPError: if Etsy refresh fails (refresh token expired after 90 days)
        """
        with transaction.atomic():
            # Lock this token row — only one thread can refresh at a time
            token = EtsyToken.objects.select_for_update().get(pk=self.pk)

            if token.is_expired():
                token.refresh()
                # Update self to reflect new token values
                self.access_token = token.access_token
                self.refresh_token = token.refresh_token
                self.expires_at = token.expires_at

        return self.access_token