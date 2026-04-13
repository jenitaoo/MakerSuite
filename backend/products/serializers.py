"""
Serializers for the Product and ExternalProductListing models.
"""
from rest_framework import serializers
from .models import Product, ProductImage, ExternalProductListing, MAX_PRODUCT_IMAGES, SaleTag, SaleLog, Market, MarketProduct


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        return obj.image.url if obj.image else None

    class Meta:
        model = ProductImage
        fields = ['id', 'url', 'rank', 'pushed_to_etsy', 'created_at']
        read_only_fields = ['id', 'pushed_to_etsy', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    etsy_listing_state = serializers.SerializerMethodField()
    linked_project_id = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        first = obj.images.first()
        if first:
            return first.image.url
        listing = obj.externalproductlisting_set.first()
        return listing.listing_image_url if listing else None

    def get_etsy_listing_state(self, obj):
        listing = obj.externalproductlisting_set.filter(platform="Etsy").first()
        if listing and listing.raw:
            return listing.raw.get("state")
        return None

    def get_linked_project_id(self, obj):
        from inventory.models import Project
        project = Project.objects.filter(product=obj).first()
        return project.id if project else None

    class Meta:
        model = Product
        fields = [
            'id',
            'owner',
            'image_url',
            'images',
            'platforms',
            'etsy_listing_state',
            'title',
            'description',
            'sku',
            'internal_price',
            'internal_quantity',
            'created_at',
            'updated_at',
            'linked_project_id',
        ]
        read_only_fields = ['id', 'image_url', 'images', 'etsy_listing_state', 'created_at', 'updated_at']


class ExternalProductListingSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ExternalProductListing
        fields = [
            'id',
            'product',
            'owner',
            'platform',
            'platform_listing_id',
            'listing_title',
            'listing_description',
            'listing_price',
            'listing_currency',
            'listing_quantity',
            'listing_image_url',
            'raw',
            'last_synced',
            'etsy_tags',
            'etsy_materials',
            'etsy_who_made',
            'etsy_when_made',
            'etsy_should_auto_renew',
            'etsy_is_taxable',
            'etsy_listing_type',
        ]
        read_only_fields = ['id', 'last_synced']

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
            'id', 'owner', 'product', 'market', 'units_sold', 'sale_date',
            'notes', 'tags', 'tag_ids', 'source', 'created_at',
            'unit_prices', 'sale_price',
        ]
        read_only_fields = ['id', 'created_at']


class MarketProductSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source="product.title", read_only=True)

    class Meta:
        model = MarketProduct
        fields = ['id', 'product', 'product_title', 'units_brought']
        read_only_fields = ['id', 'product_title']

class MarketSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    is_upcoming = serializers.ReadOnlyField()
    market_products = MarketProductSerializer(many=True, read_only=True)
    total_revenue = serializers.SerializerMethodField()
    units_sold = serializers.SerializerMethodField()
    products_brought = serializers.SerializerMethodField()

    def get_total_revenue(self, obj):
        from decimal import Decimal
        total = sum(
            (log.sale_price or Decimal("0")) * log.units_sold
            for log in obj.sale_logs.all()
        )
        return f"€{total:.2f}" if total else None

    def get_units_sold(self, obj):
        return sum(log.units_sold for log in obj.sale_logs.all()) or None

    def get_products_brought(self, obj):
        return obj.market_products.count() or None

    class Meta:
        model = Market
        fields = [
            'id', 'owner', 'name', 'date', 'location', 'notes',
            'application_status', 'is_upcoming', 'market_products',
            'total_revenue', 'units_sold', 'products_brought', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']