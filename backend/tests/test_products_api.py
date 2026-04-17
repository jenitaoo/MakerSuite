import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestProductsAPI:
    """Test suite for products endpoints"""

    def test_list_products(self, authenticated_client, test_product):
        """TC-API-17: Get all products"""
        url = reverse('products-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response might be list or paginated dict
        if isinstance(response.data, dict):
            assert len(response.data['results']) > 0
        else:
            assert len(response.data) > 0

    def test_create_product(self, authenticated_client):
        """TC-API-18: Create a new product"""
        url = reverse('products-list')
        data = {
            'title': 'New Product',
            'description': 'A beautiful handmade product',
            'internal_price': 30.00,
            'internal_quantity': 5
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'New Product'

    def test_get_product_detail(self, authenticated_client, test_product):
        """TC-API-19: Get product detail with price and quantity"""
        url = reverse('products-detail', args=[test_product.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == test_product.title
        assert float(response.data['internal_price']) == 25.00
        assert response.data['internal_quantity'] == 10

    def test_get_product_sales(self, authenticated_client, test_product):
        """TC-API-20: Get sales history for a product"""
        url = reverse('products-sales', args=[test_product.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_update_product_price(self, authenticated_client, test_product):
        """TC-API-21: Update product price"""
        url = reverse('products-detail', args=[test_product.id])
        data = {'internal_price': 35.00}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert float(response.data['internal_price']) == 35.00