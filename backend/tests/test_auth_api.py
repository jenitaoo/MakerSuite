import pytest
from django.urls import reverse
from rest_framework import status
import uuid

@pytest.mark.django_db
class TestAuthenticationAPI:
    """Test suite for authentication endpoints"""

    def test_user_registration_valid(self, api_client):
        """TC-API-01: User registration with valid credentials"""
        url = reverse('register')
        data = {
            'username': f'newuser_{uuid.uuid4().hex[:8]}',  # Make unique
            'email': f'newuser_{uuid.uuid4().hex[:8]}@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!'
        }
        response = api_client.post(url, data)

        # Debug: Print response if it fails
        if response.status_code != 201:
            print(f"Registration failed: {response.data}")

        assert response.status_code == 201
        assert response.data['username'] == data['username']

    def test_user_registration_duplicate_username(self, api_client, test_user):
        """TC-API-02: User registration with existing username"""
        url = reverse('register')
        data = {
            'username': test_user.username,  # Already exists
            'email': 'different@example.com',
            'password': 'SecurePass123!'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data

    def test_user_login_valid(self, api_client, test_user):
        """TC-API-03: User login with valid credentials"""
        url = reverse('login')
        data = {
            'username': test_user.username,
            'password': test_user.test_password
        }
        response = api_client.post(url, data)
        if response.status_code != 200:
            print(f"Login error: {response.data}")

        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data
        assert 'message' in response.data

    def test_user_login_invalid_password(self, api_client, test_user):
        """TC-API-04: User login with invalid password"""
        url = reverse('login')
        data = {
            'username': 'testmaker',
            'password': 'WrongPassword123!'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_profile(self, authenticated_client, test_user):
        """TC-API-05: Get authenticated user profile"""
        url = reverse('profile')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == test_user.username
        assert response.data['email'] == test_user.email

    def test_unauthorized_access_denied(self, api_client):
        """TC-API-06: Unauthenticated request to protected endpoint"""
        url = reverse('profile')
        response = api_client.get(url)

        assert response.status_code in [401, 403]