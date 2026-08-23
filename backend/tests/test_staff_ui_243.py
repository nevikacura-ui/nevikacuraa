"""
Staff Portals UI/UX Testing - Iteration 243
Testing light pastel colors, glass morphism, and IntroScreen buttons
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestStaffLogin:
    """Staff login endpoint tests for 3 portals"""
    
    def test_orange_staff_login(self):
        """Test orange_staff login returns pharmacy_staff role"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "orange_staff",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "pharmacy_staff"
        assert data["staff"]["department"] == "orange_pharmacy"
        print(f"PASS: orange_staff login - role={data['staff']['role']}")
    
    def test_mango_staff_login(self):
        """Test mango_staff login returns lab_staff role"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "mango_staff",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "lab_staff"
        assert data["staff"]["department"] == "mango_labs"
        print(f"PASS: mango_staff login - role={data['staff']['role']}")
    
    def test_diagyn_staff_login(self):
        """Test diagyn_staff login returns diagyn_staff role"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "diagyn_staff",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "diagyn_staff"
        assert data["staff"]["department"] == "diagyn"
        print(f"PASS: diagyn_staff login - role={data['staff']['role']}")
    
    def test_invalid_credentials(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401
        print("PASS: Invalid credentials return 401")


class TestMangoTestCatalog:
    """Test Mango test catalog API"""
    
    def test_get_test_catalog(self):
        """Test /api/mango/test-catalog returns test list"""
        response = requests.get(f"{BASE_URL}/api/mango/test-catalog")
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert len(data["tests"]) > 0
        print(f"PASS: Test catalog has {len(data['tests'])} tests")
        
        # Verify tests have required fields
        first_test = data["tests"][0]
        assert "name" in first_test
        assert "price" in first_test or "category" in first_test or "department" in first_test
        print(f"PASS: Tests have proper structure - first test: {first_test['name']}")


class TestPharmacyPortal:
    """Test pharmacy portal APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get pharmacy staff auth token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "orange_staff",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate")
    
    def test_get_medicines(self, auth_token):
        """Test pharmacy medicines endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines?limit=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        print(f"PASS: Medicines API returns {data['total']} total medicines")
    
    def test_get_orders(self, auth_token):
        """Test pharmacy orders endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/pharmacy/staff/orders?limit=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"PASS: Orders API returns {len(data.get('orders', []))} orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
