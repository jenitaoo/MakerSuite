import pytest
from django.urls import reverse
from rest_framework import status
import json

@pytest.mark.django_db
class TestSalesAPI:
    """Test suite for sales endpoints"""

    def test_get_product_sales_list(self, authenticated_client, test_product):
        """TC-API-22: Get all sales for a product"""
        url = reverse('products-sales', args=[test_product.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_create_sale_log_manual(self, authenticated_client, test_product):
        """TC-API-23: Create a sale log manually via log-sale endpoint"""
        url = reverse('products-log-sale', args=[test_product.id])
        data = {
            'units_sold': 2,
            'sale_date': '2025-04-17',
            'source': 'manual',
            'sale_price': '25.00',
            'notes': 'Manual sale entry'
        }
        response = authenticated_client.post(
            url,
            data=json.dumps(data),  # Convert to JSON string
            content_type='application/json'
        )

        assert response.status_code == status.HTTP_201_CREATED, f"Got: {response.data}"

    def test_etsy_receipt_deduplication(self, authenticated_client, test_product, test_user):
        """TC-API-24: Etsy receipts should not duplicate on re-sync"""
        import json
        url = reverse('products-log-sale', args=[test_product.id])

        data = {
            'units_sold': 1,
            'sale_date': '2025-04-17',
            'source': 'etsy',
            'sale_price': '25.00',
            'notes': 'Etsy sale'
        }
        response1 = authenticated_client.post(
            url,
            data=json.dumps(data),  # Convert to JSON string
            content_type='application/json'
        )
        assert response1.status_code == status.HTTP_201_CREATED, f"Got: {response1.data}"

        response2 = authenticated_client.post(
            url,
            data=json.dumps(data),  # Convert to JSON string
            content_type='application/json'
        )

        assert response2.status_code == status.HTTP_201_CREATED