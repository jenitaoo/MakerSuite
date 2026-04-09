"""
Serializers for the Product and ExternalProductListing models.
"""
from rest_framework import serializers
from .models import Product, ProductImage, ExternalProductListing, MAX_PRODUCT_IMAGES


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