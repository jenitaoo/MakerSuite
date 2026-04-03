"""
Models for the Product Listings Feature.
"""
from django.db import models
from authentication.models import UserProfile

MAX_PRODUCT_IMAGES = 10


class Product(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    internal_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    platforms = models.JSONField(default=list)
    internal_quantity = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not isinstance(self.platforms, list):
            self.platforms = []
        if "MakerSuite" not in self.platforms:
            self.platforms.append("MakerSuite")
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    """
    One internal image belonging to a Product.
    rank controls display order (0 = primary).
    pushed_to_etsy tracks whether this image has been sent to Etsy,
    so we never push the same image twice.
    """
    product = models.ForeignKey(Product, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/")
    rank = models.PositiveIntegerField(default=0)
    pushed_to_etsy = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["rank", "created_at"]

    def __str__(self):
        return f"{self.product.title} — image {self.rank}"


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

    # --------------------------------------------------
    # Etsy-specific fields
    # When Shopify is added, add shopify_* fields in a new block below.
    # Product stays platform-agnostic.
    # --------------------------------------------------
    etsy_tags = models.JSONField(default=list, blank=True)
    etsy_materials = models.JSONField(default=list, blank=True)
    etsy_who_made = models.CharField(max_length=50, default="i_did", blank=True)
    etsy_when_made = models.CharField(max_length=50, default="made_to_order", blank=True)
    etsy_should_auto_renew = models.BooleanField(default=True)
    etsy_is_taxable = models.BooleanField(default=True)
    etsy_listing_type = models.CharField(max_length=50, default="physical", blank=True)

    class Meta:
        unique_together = ('owner', 'platform', 'platform_listing_id')

    def __str__(self):
        return f"{self.platform} - {self.platform_listing_id}"