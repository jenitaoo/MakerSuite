"""
Inventory models.

SaleLog refactor (April 2026):
- SaleLog now references Product directly instead of Project.
- This better reflects the maker's mental model: sales happen on products,
  makes happen on projects. A project can exist without any sales.
- Project.units_sold is now derived via the linked product's sale logs.
- Project.in_stock = units_made - units_sold (unchanged, but now via product).
"""
import io
from PIL import Image as PilImage
from django.core.files.base import ContentFile
from django.db import models
from authentication.models import UserProfile
from products.models import Product
import re
from django.core.exceptions import ValidationError

def clean(self):
    super().clean()

    if self.unit_type:
        self.unit_type = self.unit_type.lower().strip()

        if not re.match(r"^[a-z]+$", self.unit_type):
            raise ValidationError(
                "Unit type must contain only lowercase letters with no spaces, numbers or special characters."
            )

    if self.quantity is not None and self.quantity < 0:
        raise ValidationError("Quantity cannot be negative.")

    if self.low_stock_threshold is not None and self.low_stock_threshold < 0:
        raise ValidationError("Low stock threshold cannot be negative.")

    if self.custom_fields is None:
        self.custom_fields = {}

def validate_unit_type(value):
    if not re.match(r"^[a-z]+$", value):
        raise ValidationError(
            "Unit type must contain only lowercase letters with no spaces, numbers or special characters."
        )

def _resize_to_jpeg(field, max_px=1200):
    """
    Open an ImageField, resize to max_px on longest side, re-save as JPEG.
    Mutates the field in place (save=False). Call before super().save().
    """
    img = PilImage.open(field)

    # Apply EXIF orientation before anything else
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    if img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail((max_px, max_px), PilImage.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85, optimize=True)
    buffer.seek(0)
    filename = field.name.rsplit(".", 1)[0] + ".jpg"
    field.save(filename, ContentFile(buffer.read()), save=False)


class RawMaterial(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    unit_type = models.CharField(
        max_length=50,
        validators=[validate_unit_type]
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=None, null=True, blank=True)
    low_stock_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=None, null=True, blank=True)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    source = models.CharField(max_length=255, blank=True, null=True)
    brand = models.CharField(max_length=255, blank=True, null=True)
    supplier = models.CharField(max_length=500, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to="material_photos/", null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit_type})"

    def save(self, *args, **kwargs):
        # Only process on first save (new upload), not on every model.save()
        if self.photo and not self.pk:
            _resize_to_jpeg(self.photo)
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_low_stock(self):
        if self.low_stock_threshold is None:
            return False
        if self.quantity is None:
            return False
        return 0 < self.quantity <= self.low_stock_threshold


class Project(models.Model):
    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    stock_adjustment = models.IntegerField(default=0)

    def __str__(self):
        return self.name

    @property
    def units_made(self):
        return sum(log.units_made for log in self.make_logs.all())

    @property
    def units_sold(self):
        if self.product:
            return sum(log.units_sold for log in self.product.sale_logs.all())
        return 0

    @property
    def in_stock(self):
        return self.units_made - self.units_sold + self.stock_adjustment

    @property
    def avg_duration_minutes(self):
        logs_with_duration = [
            log for log in self.make_logs.all()
            if log.duration_minutes is not None and log.units_made > 0
        ]
        if not logs_with_duration:
            return None
        total_minutes = sum(log.duration_minutes for log in logs_with_duration)
        total_units = sum(log.units_made for log in logs_with_duration)
        return round(total_minutes / total_units, 1)

    @property
    def material_cost_per_unit(self):
        from decimal import Decimal
        total = Decimal("0")
        for pm in self.project_materials.all():
            if pm.quantity_used is None:
                continue
            if pm.material.cost_per_unit is None:
                return None
            total += pm.quantity_used * pm.material.cost_per_unit
        return total if total > 0 else None


class ProjectImage(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="project_images/")
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"Image for {self.project.name}"

    def save(self, *args, **kwargs):
        if self.image and not self.pk:
            _resize_to_jpeg(self.image)
        super().save(*args, **kwargs)


class ProjectMaterial(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="project_materials")
    material = models.ForeignKey(RawMaterial, on_delete=models.PROTECT, related_name="project_materials")
    quantity_used = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ("project", "material")

    def __str__(self):
        return f"{self.project.name} — {self.material.name}"


class MakeLog(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="make_logs")
    units_made = models.PositiveIntegerField()
    date_made = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    deducted_materials = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project.name} — {self.units_made} made on {self.date_made}"


class InventoryLog(models.Model):
    CHANGE_RESTOCK = "restock"
    CHANGE_MAKE = "make"
    CHANGE_MANUAL_ADD = "manual_add"
    CHANGE_MANUAL_DEDUCT = "manual_deduct"
    CHANGE_SALE = "sale"
    CHANGE_CHOICES = [
        (CHANGE_RESTOCK, "Restock"),
        (CHANGE_MAKE, "Make"),
        (CHANGE_MANUAL_ADD, "Manual Add"),
        (CHANGE_MANUAL_DEDUCT, "Manual Deduct"),
        (CHANGE_SALE, "Sale"),
    ]

    owner = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    material = models.ForeignKey(RawMaterial, on_delete=models.SET_NULL, null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    change_type = models.CharField(max_length=20, choices=CHANGE_CHOICES)
    quantity_change = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.change_type} — {self.quantity_change} on {self.created_at.date()}"