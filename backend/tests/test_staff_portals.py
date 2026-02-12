"""
Test Suite for Orange Pharmacy and Mango Labs Staff Portals
Tests authentication, orders, medicines, tests, and status workflows
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://staff-pay-portal-1.preview.emergentagent.com')

# Test credentials
PHARMACY_CREDENTIALS = {"username": "staff_pharmacy", "password": "staff123"}
MANGO_CREDENTIALS = {"username": "staff_mango", "password": "staff123"}


class TestStaffAuthentication:
    """Test staff login endpoints"""
    
    def test_pharmacy_staff_login_success(self):
        """Test pharmacy staff login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json=PHARMACY_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "pharmacy_staff"
        assert data["staff"]["department"] == "Orange Pharmacy"
    
    def test_mango_staff_login_success(self):
        """Test mango labs staff login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json=MANGO_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "lab_staff"
        assert data["staff"]["department"] == "Mango Health Labs"
    
    def test_staff_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "invalid_user", "password": "wrong_password"}
        )
        assert response.status_code in [401, 404]


class TestPharmacyMedicines:
    """Test Orange Pharmacy medicine CRUD operations"""
    
    @pytest.fixture
    def pharmacy_token(self):
        """Get authentication token for pharmacy staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json=PHARMACY_CREDENTIALS
        )
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, pharmacy_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {pharmacy_token}"}
    
    def test_get_medicines_list(self, auth_headers):
        """Test getting list of medicines"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
    
    def test_create_medicine(self, auth_headers):
        """Test creating a new medicine with pricing"""
        medicine_data = {
            "name": f"Test Medicine {uuid.uuid4().hex[:8]}",
            "generic_name": "Test Generic",
            "manufacturer": "Test Manufacturer",
            "category": "Pain Relief",
            "mrp": 200.0,
            "discount_percent": 15,
            "stock_quantity": 100,
            "unit": "strip"
        }
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/medicines",
            json=medicine_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "medicine" in data
        # Verify sale price calculation (MRP * (1 - discount/100))
        expected_sale_price = 200.0 * (1 - 15/100)
        assert data["medicine"]["sale_price"] == expected_sale_price
    
    def test_get_pharmacy_dashboard_stats(self, auth_headers):
        """Test getting pharmacy dashboard statistics"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/dashboard/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "today_orders" in data
        assert "pending_orders" in data
        assert "out_for_delivery" in data
        assert "completed_today" in data


class TestPharmacyOrders:
    """Test Orange Pharmacy order operations"""
    
    @pytest.fixture
    def pharmacy_token(self):
        """Get authentication token for pharmacy staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json=PHARMACY_CREDENTIALS
        )
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, pharmacy_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {pharmacy_token}"}
    
    def test_get_orders_list(self, auth_headers):
        """Test getting list of pharmacy orders"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert "status_counts" in data


class TestMangoLabsTests:
    """Test Mango Labs test catalog CRUD operations"""
    
    @pytest.fixture
    def mango_token(self):
        """Get authentication token for mango labs staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json=MANGO_CREDENTIALS
        )
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, mango_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {mango_token}"}
    
    def test_get_tests_list(self, auth_headers):
        """Test getting list of lab tests"""
        response = requests.get(
            f"{BASE_URL}/api/mango/tests",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert "total" in data
    
    def test_create_lab_test(self, auth_headers):
        """Test creating a new lab test with pricing"""
        test_data = {
            "name": f"Test Lab {uuid.uuid4().hex[:8]}",
            "code": f"TL{uuid.uuid4().hex[:4].upper()}",
            "category": "Biochemistry",
            "price": 500.0,
            "home_collection_price": 550.0,
            "sample_type": "Blood",
            "turnaround_time": "24 Hours",
            "fasting_required": True
        }
        response = requests.post(
            f"{BASE_URL}/api/mango/tests",
            json=test_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "test" in data
        assert data["test"]["price"] == 500.0
    
    def test_get_mango_dashboard_stats(self, auth_headers):
        """Test getting mango labs dashboard statistics"""
        response = requests.get(
            f"{BASE_URL}/api/mango/dashboard/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "today_bookings" in data
        assert "pending_collection" in data
        assert "in_process" in data
        assert "reports_ready" in data


class TestMangoLabsBookings:
    """Test Mango Labs booking operations"""
    
    @pytest.fixture
    def mango_token(self):
        """Get authentication token for mango labs staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json=MANGO_CREDENTIALS
        )
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, mango_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {mango_token}"}
    
    def test_get_bookings_list(self, auth_headers):
        """Test getting list of lab bookings"""
        response = requests.get(
            f"{BASE_URL}/api/mango/bookings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data
        assert "total" in data
        assert "status_counts" in data


class TestImageSearch:
    """Test pharmacy image search endpoint"""
    
    @pytest.fixture
    def pharmacy_token(self):
        """Get authentication token for pharmacy staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json=PHARMACY_CREDENTIALS
        )
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, pharmacy_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {pharmacy_token}"}
    
    def test_image_search(self, auth_headers):
        """Test medicine image search"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/image-search",
            params={"query": "paracetamol"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "images" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
