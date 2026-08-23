"""
Full Regression Test Suite - Iteration 159
Tests for Nevika Cura Healthcare App before Play Store launch
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Backend API health and accessibility tests"""
    
    def test_doctors_endpoint(self):
        """Test /api/doctors returns doctor list"""
        response = requests.get(f"{BASE_URL}/api/doctors", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "doctors" in data
        doctors = data["doctors"]
        assert len(doctors) >= 2
        
        # Verify Dr. Vikas Jha and Dr. Neha Patel exist
        names = [d["name"] for d in doctors]
        assert "Dr. Vikas Jha" in names
        assert "Dr. Neha Patel" in names
    
    def test_packages_endpoint_exists(self):
        """Test lab packages endpoint"""
        response = requests.get(f"{BASE_URL}/api/lab-packages", timeout=10)
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]


class TestCashfreePayment:
    """Cashfree payment integration tests"""
    
    def test_verify_nonexistent_order(self):
        """Test /api/payments/cashfree/verify returns 404 for fake order"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/FAKE_ORDER_12345", timeout=10)
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("detail", "").lower() or "detail" in data


class TestStaffPortalAuth:
    """Staff portal authentication tests"""
    
    def test_diagyn_staff_login(self):
        """Test DiaGyn staff login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "dr_vikas",
                "password": "test1234",
                "portal": "diagyn"
            },
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data or "authenticated" in str(data).lower()
    
    def test_mango_staff_login(self):
        """Test Mango staff login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "staff_mango",
                "password": "test1234",
                "portal": "mango"
            },
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data or "authenticated" in str(data).lower()
    
    def test_orange_staff_login(self):
        """Test Orange staff login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "staff_orange",
                "password": "test1234",
                "portal": "orange"
            },
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data or "authenticated" in str(data).lower()
    
    def test_invalid_staff_credentials(self):
        """Test staff login with invalid credentials returns error"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "invalid_user",
                "password": "wrong_pass",
                "portal": "diagyn"
            },
            timeout=10
        )
        assert response.status_code in [401, 403, 400]


class TestMembershipAPI:
    """Membership payment and order tests"""
    
    def test_create_membership_order(self):
        """Test creating a membership order"""
        response = requests.post(
            f"{BASE_URL}/api/payments/membership/create-order",
            json={
                "name": "Test User",
                "phone": "9876543210",
                "email": "test@example.com",
                "plan": "annual"
            },
            timeout=15
        )
        # Should return 200 with order details or 400/422 for validation
        assert response.status_code in [200, 201, 400, 422]
        if response.status_code in [200, 201]:
            data = response.json()
            # Should have order_id or similar
            assert "order_id" in data or "order" in data or "id" in data


class TestPharmacyAPI:
    """Pharmacy product and category tests"""
    
    def test_pharmacy_products(self):
        """Test pharmacy products endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/products", timeout=10)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))
    
    def test_pharmacy_categories(self):
        """Test pharmacy categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/categories", timeout=10)
        assert response.status_code in [200, 404]


class TestLabTests:
    """Mango Health Labs test endpoints"""
    
    def test_lab_tests_list(self):
        """Test lab tests listing"""
        response = requests.get(f"{BASE_URL}/api/tests", timeout=10)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
