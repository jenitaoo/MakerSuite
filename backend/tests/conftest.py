import pytest
import uuid
from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from authentication.models import UserProfile
from inventory.models import RawMaterial, Project, ProjectMaterial, MakeLog
from products.models import Product, ExternalProductListing

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_user(db):
    """Create a test user with unique username"""
    username = f'testuser_{uuid.uuid4().hex[:12]}'
    password = 'TestPass123!'
    
    user = User.objects.create_user(
        username=username,
        email=f'{username}@test.com',
        password=password
    )
    user.test_password = password
    return user

@pytest.fixture
def authenticated_client(api_client, test_user):
    """Return authenticated API client"""
    api_client.force_authenticate(user=test_user)
    return api_client

@pytest.fixture
def test_material(db, test_user):
    """Create a test material"""
    return RawMaterial.objects.create(
        owner=test_user.userprofile,
        name='Test Material',
        unit_type='grams',
        quantity=Decimal('10.00'),
        cost_per_unit=Decimal('0.01'),
        low_stock_threshold=Decimal('2.00')
    )

@pytest.fixture
def test_project(db, test_user, test_material):
    """Create a test project WITH material dependency"""
    project = Project.objects.create(
        owner=test_user.userprofile,
        name='Test Project'
    )
    # Create the ProjectMaterial AFTER project
    ProjectMaterial.objects.create(
        project=project,
        material=test_material,
        quantity_used=Decimal('1.00')
    )
    return project

@pytest.fixture
def test_make_log(db, test_project):
    """Create a test make log"""
    return MakeLog.objects.create(
        project=test_project,
        units_made=5,
        date_made='2025-04-17',
        duration_minutes=60
    )

@pytest.fixture
def test_product(db, test_user, test_project):
    """Create a test product linked to project"""
    product = Product.objects.create(
        owner=test_user.userprofile,
        title='Test Product',
        description='A test product',
        internal_price=Decimal('25.00'),
        internal_quantity=10
    )
    test_project.product = product
    test_project.save()
    return product

@pytest.fixture
def test_external_listing(db, test_user, test_product):
    """Create test Etsy listing"""
    return ExternalProductListing.objects.create(
        product=test_product,
        platform='Etsy',
        platform_listing_id=f'etsy_{uuid.uuid4().hex[:12]}',
        shop_id='987654321',
        external_url='https://www.etsy.com/listing/123456789'
    )

@pytest.fixture
def test_sale_log(db, test_user, test_product):
    """Create a test sale log"""
    from products.models import SaleLog
    return SaleLog.objects.create(
        product=test_product,
        owner=test_user.userprofile,  # Add this
        units_sold=2,
        sale_price=Decimal('25.00'),
        sale_date='2025-04-17',
        source='manual'
    )