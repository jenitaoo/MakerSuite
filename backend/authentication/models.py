from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    etsy_access_token = models.CharField(max_length=500, null=True, blank=True)
    etsy_refresh_token = models.CharField(max_length=500, null=True, blank=True)
    etsy_token_expires = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s profile"
