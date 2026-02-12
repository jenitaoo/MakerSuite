from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class EtsyToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="etsy_token"
    )
    etsy_user_id = models.CharField(max_length=50, null=True, blank=True)
    access_token = models.TextField()
    refresh_token = models.TextField(null=True, blank=True)
    expires_at = models.DateTimeField()

    def is_expired(self):
        return timezone.now() >= self.expires_at
