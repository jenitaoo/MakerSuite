from rest_framework import serializers
from .models import RawMaterial, Project, ProjectMaterial, MakeLog, SaleTag, SaleLog, InventoryLog


class RawMaterialSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.ReadOnlyField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = RawMaterial
        fields = [
            'id', 'owner', 'name', 'unit_type', 'quantity',
            'low_stock_threshold', 'cost_per_unit',
            'source', 'brand', 'supplier', 'sku',
            'notes', 'custom_fields', 'is_low_stock',
            'created_at', 'updated_at', 'tags',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.ReadOnlyField(source='material.name')
    material_unit_type = serializers.ReadOnlyField(source='material.unit_type')

    class Meta:
        model = ProjectMaterial
        fields = ['id', 'material', 'material_name', 'material_unit_type', 'quantity_used']


class MakeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MakeLog
        fields = [
            'id', 'project', 'units_made', 'date_made',
            'notes', 'deducted_materials', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SaleTagSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SaleTag
        fields = ['id', 'owner', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class SaleLogSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    tags = SaleTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=SaleTag.objects.all(),
        source='tags',
        required=False,
    )
    unit_prices = serializers.JSONField(required=False)
    sale_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = SaleLog
        fields = [
            'id', 'owner', 'project', 'units_sold', 'sale_date',
            'notes', 'tags', 'tag_ids', 'source', 'created_at', 'unit_prices', 'sale_price'
        ]
        read_only_fields = ['id', 'created_at']


class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    units_made = serializers.ReadOnlyField()
    units_sold = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()
    project_materials = ProjectMaterialSerializer(many=True, read_only=True)
    make_logs = MakeLogSerializer(many=True, read_only=True)
    sale_logs = SaleLogSerializer(many=True, read_only=True)
    product_title = serializers.SerializerMethodField()
    product_price = serializers.SerializerMethodField()

    def get_product_title(self, obj):
        return obj.product.title if obj.product else None

    def get_product_price(self, obj):
        return str(obj.product.internal_price) if obj.product else None

    class Meta:
        model = Project
        fields = [
            'id', 'owner', 'name', 'product', 'product_title',
            'units_made', 'units_sold', 'in_stock',
            'notes', 'project_materials', 'make_logs', 'sale_logs',
            'created_at', 'updated_at', 'product_price',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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
            'id', 'owner', 'material', 'material_name',
            'project', 'project_name', 'change_type',
            'quantity_change', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']