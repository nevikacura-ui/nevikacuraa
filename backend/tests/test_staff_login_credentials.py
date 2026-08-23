"""
Test Staff Login Credentials for all three portals:
- DiaGyn Staff Portal
- Mango Labs Staff Portal  
- Orange Pharmacy Staff Portal
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestStaffLoginCredentials:
    """Test staff login credentials for all portals"""
    
    def test_diagyn_staff_login(self):
        """Test DiaGyn staff login with staff_diagyn/test123"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test123"}
        )
        print(f"DiaGyn Login Status: {response.status_code}")
        print(f"DiaGyn Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"DiaGyn login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        assert data["staff"]["name"], "Staff name not returned"
        print(f"✅ DiaGyn staff login successful - Staff: {data['staff']['name']}")
        
    def test_mango_labs_staff_login(self):
        """Test Mango Labs staff login with staff_mango/test"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_mango", "password": "test"}
        )
        print(f"Mango Labs Login Status: {response.status_code}")
        print(f"Mango Labs Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"Mango Labs login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        assert data["staff"]["name"], "Staff name not returned"
        print(f"✅ Mango Labs staff login successful - Staff: {data['staff']['name']}")
        
    def test_orange_pharmacy_staff_login(self):
        """Test Orange Pharmacy staff login with staff_orange/test"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_orange", "password": "test"}
        )
        print(f"Orange Pharmacy Login Status: {response.status_code}")
        print(f"Orange Pharmacy Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"Orange Pharmacy login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        assert data["staff"]["name"], "Staff name not returned"
        print(f"✅ Orange Pharmacy staff login successful - Staff: {data['staff']['name']}")
        
    def test_invalid_credentials_rejected(self):
        """Test that invalid credentials are rejected"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "invalid_user", "password": "wrong_password"}
        )
        print(f"Invalid Login Status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
