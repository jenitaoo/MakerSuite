import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestMaterialsAPI:
    """Test suite for materials endpoints"""

    def test_list_materials(self, authenticated_client, test_material):
        """TC-API-07: Get all materials for authenticated user"""
        url = reverse('material-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response might be list or paginated dict
        if isinstance(response.data, dict):
            assert len(response.data['results']) > 0
        else:
            assert len(response.data) > 0

    def test_create_material(self, authenticated_client):
        """TC-API-08: Create a new material"""
        url = reverse('material-list')
        data = {
            'name': 'New Material',
            'unit_type': 'ml',
            'quantity': 500.00,
            'cost_per_unit': 0.05
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Material'
        assert response.data['unit_type'] == 'ml'

    def test_update_material_quantity(self, authenticated_client, test_material):
        """TC-API-09: Update material quantity (restock)"""
        url = reverse('material-detail', args=[test_material.id])
        data = {'quantity': 500.00}  # Restock from 250 to 500
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert float(response.data['quantity']) == 500.0

    def test_get_material_detail(self, authenticated_client, test_material):
        """TC-API-10: Get material with detail including cost"""
        url = reverse('material-detail', args=[test_material.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == test_material.name
        assert float(response.data['cost_per_unit']) == 0.01
        assert response.data['is_low_stock'] == False

    def test_delete_material(self, authenticated_client, test_material):
        """TC-API-11: Delete material"""
        url = reverse('material-detail', args=[test_material.id])
        response = authenticated_client.delete(url)
 
        assert response.status_code == status.HTTP_204_NO_CONTENT