from rest_framework import serializers
from .models import RawMaterial, Make, MakeMaterial, SaleTag, SaleLog, InventoryLog


class RawMaterialSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = RawMaterial
        fields = [
            'id', 'owner', 'name', 'unit', 'quantity',
            'low_stock_threshold', 'cost_per_unit',
            'source', 'brand', 'supplier_url', 'sku',
            'notes', 'custom_fields', 'is_low_stock',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MakeMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)

    class Meta:
        model = MakeMaterial
        fields = ['id', 'make', 'material', 'material_name', 'material_unit', 'quantity_used']
        read_only_fields = ['id']


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
        queryset=SaleTag.objects.all(),
        write_only=True,
        source='tags',
        required=False,
    )

    class Meta:
        model = SaleLog
        fields = [
            'id', 'owner', 'make', 'units_sold', 'sale_date',
            'notes', 'tags', 'tag_ids', 'source', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MakeSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    units_sold = serializers.IntegerField(read_only=True)
    available_units = serializers.IntegerField(read_only=True)
    make_materials = MakeMaterialSerializer(many=True, read_only=True)
    salelogs = SaleLogSerializer(many=True, read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)

    class Meta:
        model = Make
        fields = [
            'id', 'owner', 'name', 'status', 'product', 'product_title',
            'units_produced', 'units_sold', 'available_units',
            'date_made', 'notes', 'completed_at',
            'make_materials', 'salelogs',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']


class InventoryLogSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    material_name = serializers.CharField(source='material.name', read_only=True)
    make_name = serializers.CharField(source='make.name', read_only=True)

    class Meta:
        model = InventoryLog
        fields = [
            'id', 'owner', 'material', 'material_name',
            'make', 'make_name', 'change_type',
            'quantity_change', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']