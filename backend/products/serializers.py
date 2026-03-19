"""
This module contains serializers for the Product and ExternalProductListing models.
They allow communication between the backend and frontend by converting model instances to and from JSON format.
"""
from rest_framework import serializers
from .models import Product, ExternalProductListing

class ProductSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    image_url = serializers.SerializerMethodField()
    platform = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        listing = obj.externalproductlisting_set.first()
        return listing.listing_image_url if listing else None

    def get_platform(self, obj):
        listing = obj.externalproductlisting_set.first()
        return listing.platform.capitalize() if listing else None

    class Meta:
        model = Product
        fields = [
            'id',
            'owner',
            'image_url',
            'title',
            'description',
            'sku',
            'platform',
            'internal_price',
            'internal_quantity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

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
        ]
        read_only_fields = ['id', 'last_synced']