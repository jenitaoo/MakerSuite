"""
Models for the Product Listings Feature.
This module defines the data structures for managing products and their external listings.
"""
from django.db import models
from django.forms import IntegerField
from authentication.models import UserProfile

"""
Product model representing an internal product in the system.
This model stores the original version of the product within our system. External platform listings can be mapped to this product
"""
class Product(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    internal_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    internal_quantity = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

"""
ExternalProductListing model representing a product listing on an external platform (e.g. Etsy or Shopify).
This stores normalised fields and the raw API response as JSON.
A listing may be linked to an internal Product once normalised.
"""
class ExternalProductListing(models.Model):
    shop_id = models.IntegerField(null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    platform = models.CharField(max_length=50)
    platform_listing_id = models.CharField(max_length=100)
    listing_image_url = models.URLField(max_length=500, blank=True, null=True)
    listing_title = models.CharField(max_length=255, blank=True, null=True)
    listing_description = models.TextField(blank=True, null=True)
    listing_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    listing_currency = models.CharField(max_length=10, blank=True, null=True)
    listing_quantity = models.IntegerField(null=True, blank=True)
    raw = models.JSONField()
    last_synced = models.DateTimeField(auto_now=True)
    linked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('owner', 'platform', 'platform_listing_id')

    def __str__(self):
        return f"{self.platform} - {self.platform_listing_id}"
