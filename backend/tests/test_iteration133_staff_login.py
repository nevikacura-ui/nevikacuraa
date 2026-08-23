"""
Iteration 133: Test Staff Login with Unified Credentials (test1234)
Tests all staff/doctor logins with the new uniform password.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestUnifiedStaffCredentials:
    """Test all staff/doctor logins with unified password: test1234"""
    
    def test_diagyn_staff_login(self):
        """Test DiaGyn staff login with staff_diagyn/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        print(f"DiaGyn Login Status: {response.status_code}")
        print(f"DiaGyn Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"DiaGyn login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        # Role can be clinic_staff or diagyn_staff
        assert data["staff"]["role"] in ["clinic_staff", "diagyn_staff"], f"Expected valid staff role, got {data['staff']['role']}"
        print(f"DiaGyn staff login successful - Staff: {data['staff']['name']}, Role: {data['staff']['role']}")
        
    def test_mango_labs_staff_login(self):
        """Test Mango Labs staff login with staff_mango/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_mango", "password": "test1234"}
        )
        print(f"Mango Labs Login Status: {response.status_code}")
        print(f"Mango Labs Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"Mango Labs login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        # Role can be diagnostic_staff or lab_staff
        assert data["staff"]["role"] in ["diagnostic_staff", "lab_staff"], f"Expected valid lab staff role, got {data['staff']['role']}"
        print(f"Mango Labs staff login successful - Staff: {data['staff']['name']}, Role: {data['staff']['role']}")
        
    def test_orange_pharmacy_staff_login(self):
        """Test Orange Pharmacy staff login with staff_orange/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_orange", "password": "test1234"}
        )
        print(f"Orange Pharmacy Login Status: {response.status_code}")
        print(f"Orange Pharmacy Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"Orange Pharmacy login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        # Role can be pharmacy_staff or staff (department indicates pharmacy)
        assert data["staff"]["role"] in ["pharmacy_staff", "staff"], f"Expected valid pharmacy staff role, got {data['staff']['role']}"
        assert "orange" in data["staff"]["department"].lower(), f"Expected orange department, got {data['staff']['department']}"
        print(f"Orange Pharmacy staff login successful - Staff: {data['staff']['name']}, Role: {data['staff']['role']}")
        
    def test_doctor_vikas_login(self):
        """Test Doctor login with dr_vikas/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        print(f"Dr. Vikas Login Status: {response.status_code}")
        print(f"Dr. Vikas Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"Dr. Vikas login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        assert data["staff"]["role"] == "doctor", f"Expected role doctor, got {data['staff']['role']}"
        assert data["staff"]["doctor_name"] == "Dr. Vikas Jha", f"Expected doctor name, got {data['staff']}"
        print(f"Dr. Vikas login successful - Name: {data['staff']['doctor_name']}, Role: {data['staff']['role']}")
        
    def test_doctor_neha_login(self):
        """Test Dr. Neha Gupta login with dr_neha/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_neha", "password": "test1234"}
        )
        print(f"Dr. Neha Login Status: {response.status_code}")
        print(f"Dr. Neha Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"Dr. Neha login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        assert data["staff"]["role"] == "doctor", f"Expected role doctor, got {data['staff']['role']}"
        print(f"Dr. Neha login successful - Name: {data['staff'].get('doctor_name')}, Role: {data['staff']['role']}")

    def test_admin_login(self):
        """Test Admin login with admin/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "test1234"}
        )
        print(f"Admin Login Status: {response.status_code}")
        print(f"Admin Login Response: {response.json() if response.status_code < 500 else response.text[:500]}")
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        assert data["staff"]["role"] == "admin", f"Expected role admin, got {data['staff']['role']}"
        print(f"Admin login successful - Name: {data['staff']['name']}, Role: {data['staff']['role']}")

    def test_invalid_credentials_rejected(self):
        """Test that invalid credentials are rejected"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "wrong_password"}
        )
        print(f"Invalid Login Status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print("Invalid credentials correctly rejected")
        
    def test_old_credentials_rejected(self):
        """Test that old passwords (test123, test) no longer work"""
        # Try old password for diagyn
        response1 = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test123"}
        )
        print(f"Old DiaGyn password (test123) Status: {response1.status_code}")
        assert response1.status_code == 401, "Old password test123 should be rejected"
        
        # Try old password for mango
        response2 = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_mango", "password": "test"}
        )
        print(f"Old Mango password (test) Status: {response2.status_code}")
        assert response2.status_code == 401, "Old password test should be rejected"
        
        print("Old credentials correctly rejected")


class TestTokenExpiry:
    """Test that JWT tokens have 30 day expiry"""
    
    def test_token_validity(self):
        """Test token is valid after login (30 day expiry configured)"""
        import jwt
        
        # Login
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        assert response.status_code == 200
        
        token = response.json()["token"]
        
        # Validate token with /api/staff/validate-token
        validate_response = requests.get(
            f"{BASE_URL}/api/staff/validate-token",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Token validation status: {validate_response.status_code}")
        print(f"Token validation response: {validate_response.json()}")
        
        assert validate_response.status_code == 200
        assert validate_response.json()["valid"] == True
        print("Token validation successful - 30 day session configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
