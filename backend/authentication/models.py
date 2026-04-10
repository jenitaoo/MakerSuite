from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=255, null=True, blank=True, default='')
    photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    etsy_access_token = models.CharField(max_length=500, null=True, blank=True)
    etsy_refresh_token = models.CharField(max_length=500, null=True, blank=True)
    etsy_token_expires = models.DateTimeField(null=True, blank=True)

    # Used for pricing calculator — defaults to Irish minimum wage
    hourly_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=14.15,
        help_text="Your hourly rate in euros, used to calculate labour cost per product."
    )

    def __str__(self):
        return f"{self.user.username}'s profile"