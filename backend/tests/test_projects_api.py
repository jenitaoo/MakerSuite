import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestProjectsAPI:
    """Test suite for projects endpoints"""

    def test_list_projects(self, authenticated_client, test_project):
        """TC-API-12: Get all projects for authenticated user"""
        url = reverse('project-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response might be list or paginated dict
        if isinstance(response.data, dict):
            assert len(response.data['results']) > 0
        else:
            assert len(response.data) > 0

    def test_create_project(self, authenticated_client):
        """TC-API-13: Create a new project"""
        url = reverse('project-list')
        data = {
            'name': 'New Project',
            'notes': 'Testing project creation'
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Project'

    def test_get_project_detail_with_statistics(self, authenticated_client, test_project, test_make_log):
        """TC-API-14: Get project detail with computed statistics"""
        url = reverse('project-detail', args=[test_project.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == test_project.name
        assert response.data['units_made'] == 5  # From make_log
        assert response.data['in_stock'] == 5    # units_made - units_sold
        assert 'avg_duration_minutes' in response.data
        assert 'material_cost_per_unit' in response.data

    def test_update_project(self, authenticated_client, test_project):
        """TC-API-15: Update project details"""
        url = reverse('project-detail', args=[test_project.id])
        data = {'name': 'Updated Project Name'}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Project Name'

    def test_link_product_to_project(self, authenticated_client, test_project, test_product):
        """TC-API-16: Link a product to a project"""
        url = reverse('project-detail', args=[test_project.id])
        data = {'product': test_product.id}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['product'] == test_product.id