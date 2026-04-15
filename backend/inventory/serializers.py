from rest_framework import serializers
from .models import RawMaterial, Project, ProjectImage, ProjectMaterial, MakeLog, InventoryLog


class RawMaterialSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.ReadOnlyField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    photo_url = serializers.SerializerMethodField()

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if obj.photo:
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    class Meta:
        model = RawMaterial
        fields = [
            "id",
            "owner",
            "name",
            "unit_type",
            "quantity",
            "low_stock_threshold",
            "cost_per_unit",
            "source",
            "brand",
            "supplier",
            "sku",
            "notes",
            "tags",
            "custom_fields",
            "photo",
            "created_at",
            "updated_at",
            "is_low_stock",
            "photo_url",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "photo_url"]
        extra_kwargs = {
            "photo": {"write_only": True, "required": False}
        }
class ProjectImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None

    class Meta:
        model = ProjectImage
        fields = ["id", "image_url", "order"]


class ProjectMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.ReadOnlyField(source="material.name")
    material_unit_type = serializers.ReadOnlyField(source="material.unit_type")
    material_cost_per_unit = serializers.ReadOnlyField(source="material.cost_per_unit")
    material_photo_url = serializers.SerializerMethodField()

    def get_material_photo_url(self, obj):
        if obj.material.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.material.photo.url)
            return obj.material.photo.url
        return None

    class Meta:
        model = ProjectMaterial
        fields = [
            "id", "material", "material_name", "material_unit_type",
            "material_cost_per_unit", "material_photo_url", "quantity_used",
        ]


class MakeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MakeLog
        fields = [
            "id", "project", "units_made", "date_made",
            "notes", "deducted_materials", "duration_minutes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    units_made = serializers.ReadOnlyField()
    units_sold = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()
    avg_duration_minutes = serializers.ReadOnlyField()
    material_cost_per_unit = serializers.SerializerMethodField()
    project_materials = ProjectMaterialSerializer(many=True, read_only=True)
    make_logs = MakeLogSerializer(many=True, read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    product_title = serializers.SerializerMethodField()
    product_price = serializers.SerializerMethodField()

    def get_product_title(self, obj):
        return obj.product.title if obj.product else None

    def get_product_price(self, obj):
        return str(obj.product.internal_price) if obj.product else None

    def get_material_cost_per_unit(self, obj):
        cost = obj.material_cost_per_unit
        return str(cost) if cost is not None else None

    class Meta:
        model = Project
        fields = [
            "id", "owner", "name", "product", "product_title", "product_price",
            "units_made", "units_sold", "in_stock",
            "avg_duration_minutes", "material_cost_per_unit",
            "notes", "images", "project_materials", "make_logs",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InventoryLogSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    material_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()

    def get_material_name(self, obj):
        return obj.material.name if obj.material else None

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None

    class Meta:
        model = InventoryLog
        fields = [
            "id", "owner", "material", "material_name",
            "project", "project_name", "change_type",
            "quantity_change", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]