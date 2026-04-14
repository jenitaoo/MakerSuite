"""
Models for the Product Listings Feature.
"""
from django.db import models
from authentication.models import UserProfile
from django.conf import settings

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

class Market(models.Model):
    class ApplicationStatus(models.TextChoices):
        NOT_APPLIED = "not_applied", "Not Applied"
        APPLIED = "applied", "Applied"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="markets"
    )
    name = models.CharField(max_length=255)
    date = models.DateField()
    location = models.CharField(max_length=500, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    application_status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.NOT_APPLIED
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return self.name

    @property
    def is_upcoming(self):
        from django.utils import timezone
        return self.date >= timezone.now().date()

class MarketProduct(models.Model):
    market = models.ForeignKey(
        Market, on_delete=models.CASCADE, related_name="market_products"
    )
    product = models.ForeignKey(
        "products.Product", on_delete=models.CASCADE
    )
    units_brought = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("market", "product")



class SaleTag(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("owner", "name")

    def __str__(self):
        return self.name


class SaleLog(models.Model):
    """
    Represents a sale of a product.
    Now linked to Product directly — sales are a Marketplace concern.
    The linked project (via product.project) is used to update stock counts.
    """
    SOURCE_ETSY = "etsy"
    SOURCE_MANUAL = "manual"
    SOURCE_CHOICES = [
        (SOURCE_ETSY, "Etsy"),
        (SOURCE_MANUAL, "Manual"),
    ]

    owner = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="markets"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="sale_logs",
    )
    market = models.ForeignKey(
        "Market",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_logs",
    )
    units_sold = models.PositiveIntegerField()
    sale_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    tags = models.ManyToManyField(SaleTag, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)
    unit_prices = models.JSONField(default=list, blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    external_id = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.product.title} — {self.units_sold} sold on {self.sale_date}"

