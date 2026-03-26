from django.db import models

# Create your models here.
from django.db import models
from authentication.models import UserProfile
from products.models import Product


class RawMaterial(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    unit_type = models.CharField(max_length=50)  # e.g. "balls", "grams", "metres", "sheets"
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    low_stock_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=10, null=True, blank=True)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    source = models.CharField(max_length=255, blank=True, null=True)
    brand = models.CharField(max_length=255, blank=True, null=True)
    supplier = models.CharField(max_length=500, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    custom_fields = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit_type})"

    @property
    def is_low_stock(self):
        if self.low_stock_threshold is None:
            return False
        return self.quantity <= self.low_stock_threshold

class Make(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    units_produced = models.PositiveIntegerField(default=0)
    date_made = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def units_sold(self):
        return sum(log.units_sold for log in self.salelogs.all())

    @property
    def available_units(self):
        return self.units_produced - self.units_sold

class MakeMaterial(models.Model):
    make = models.ForeignKey(Make, on_delete=models.CASCADE, related_name="make_materials")
    material = models.ForeignKey(RawMaterial, on_delete=models.PROTECT, related_name="make_materials")
    quantity_used = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ("make", "material")

    def __str__(self):
        return f"{self.make.name} — {self.material.name}"


class SaleTag(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("owner", "name")

    def __str__(self):
        return self.name


class SaleLog(models.Model):
    SOURCE_ETSY = "etsy"
    SOURCE_MANUAL = "manual"
    SOURCE_CHOICES = [
        (SOURCE_ETSY, "Etsy"),
        (SOURCE_MANUAL, "Manual"),
    ]

    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    make = models.ForeignKey(Make, on_delete=models.CASCADE, related_name="salelogs")
    units_sold = models.PositiveIntegerField()
    sale_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    tags = models.ManyToManyField(SaleTag, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.make.name} — {self.units_sold} sold on {self.sale_date}"


class InventoryLog(models.Model):
    CHANGE_RESTOCK = "restock"
    CHANGE_MAKE_COMPLETION = "make_completion"
    CHANGE_MANUAL_ADD = "manual_add"
    CHANGE_MANUAL_DEDUCT = "manual_deduct"
    CHANGE_SALE = "sale"
    CHANGE_CHOICES = [
        (CHANGE_RESTOCK, "Restock"),
        (CHANGE_MAKE_COMPLETION, "Make Completion"),
        (CHANGE_MANUAL_ADD, "Manual Add"),
        (CHANGE_MANUAL_DEDUCT, "Manual Deduct"),
        (CHANGE_SALE, "Sale"),
    ]

    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    material = models.ForeignKey(RawMaterial, on_delete=models.SET_NULL, null=True, blank=True)
    make = models.ForeignKey(Make, on_delete=models.SET_NULL, null=True, blank=True)
    change_type = models.CharField(max_length=20, choices=CHANGE_CHOICES)
    quantity_change = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.change_type} — {self.quantity_change} on {self.created_at.date()}"