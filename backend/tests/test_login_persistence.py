"""
Test suite for Login Persistence Bug Fix
Tests staff login, admin login, and token validation endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestStaffLogin:
    """Staff login endpoint tests - verifies token and staff info are returned"""
    
    def test_staff_login_success_admin(self):
        """Test admin login returns token and staff info"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify token is returned
        assert "token" in data, "Token not returned in response"
        assert len(data["token"]) > 50, "Token seems too short"
        
        # Verify staff info is returned
        assert "staff" in data, "Staff info not returned in response"
        staff = data["staff"]
        
        assert staff.get("name") == "Admin User", f"Expected 'Admin User', got {staff.get('name')}"
        assert staff.get("role") == "admin", f"Expected 'admin' role, got {staff.get('role')}"
        assert staff.get("department") == "admin", f"Expected 'admin' department, got {staff.get('department')}"
        
        print(f"PASS: Admin login successful - token length: {len(data['token'])}")
    
    def test_staff_login_success_doctor(self):
        """Test doctor login returns token and staff info"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_neha",
            "password": "test1234"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify token is returned
        assert "token" in data, "Token not returned in response"
        
        # Verify staff info is returned
        assert "staff" in data, "Staff info not returned in response"
        staff = data["staff"]
        
        assert "Dr. Neha" in staff.get("name", ""), f"Expected 'Dr. Neha' in name, got {staff.get('name')}"
        assert staff.get("role") == "doctor", f"Expected 'doctor' role, got {staff.get('role')}"
        assert staff.get("department") == "diagyn", f"Expected 'diagyn' department, got {staff.get('department')}"
        
        print(f"PASS: Doctor login successful - name: {staff.get('name')}")
    
    def test_staff_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid credentials correctly rejected with 401")
    
    def test_staff_login_missing_fields(self):
        """Test login with missing fields returns error"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin"
            # Missing password
        })
        
        assert response.status_code in [400, 401, 422], f"Expected 400/401/422, got {response.status_code}"
        print(f"PASS: Missing fields correctly rejected with {response.status_code}")


class TestAuthMeEndpoint:
    """Tests for /api/auth/me endpoint - validates token and returns user data"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_auth_me_with_valid_token(self, admin_token):
        """Test /api/auth/me returns user data with valid token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify user data is returned
        assert "id" in data, "User ID not returned"
        assert "name" in data, "User name not returned"
        assert data.get("name") == "Admin User", f"Expected 'Admin User', got {data.get('name')}"
        assert data.get("role") == "admin", f"Expected 'admin' role, got {data.get('role')}"
        
        print(f"PASS: /api/auth/me returned user data: {data.get('name')}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/auth/me correctly rejected request without token")
    
    def test_auth_me_with_invalid_token(self):
        """Test /api/auth/me returns 401 with invalid token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_12345"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/auth/me correctly rejected invalid token with {response.status_code}")


class TestPatientAuthEndpoint:
    """Tests for /api/patient-auth/me endpoint"""
    
    def test_patient_auth_me_without_token(self):
        """Test /api/patient-auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/patient-auth/me")
        
        # Should return 401 or similar error without token
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404, got {response.status_code}"
        print(f"PASS: /api/patient-auth/me correctly handled request without token: {response.status_code}")
    
    def test_patient_auth_me_with_invalid_token(self):
        """Test /api/patient-auth/me returns error with invalid token"""
        response = requests.get(f"{BASE_URL}/api/patient-auth/me", headers={
            "Authorization": "Bearer invalid_patient_token"
        })
        
        # Should return 401/403 with invalid token
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/patient-auth/me correctly rejected invalid token: {response.status_code}")


class TestTokenValidation:
    """Tests for token validation behavior - key to login persistence fix"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff token for tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get staff token")
    
    def test_token_revalidation_success(self, staff_token):
        """Test that valid token can be revalidated multiple times (simulates page reload)"""
        # First validation
        response1 = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {staff_token}"
        })
        assert response1.status_code == 200, "First validation failed"
        
        # Wait a moment
        time.sleep(0.5)
        
        # Second validation (simulates page reload)
        response2 = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {staff_token}"
        })
        assert response2.status_code == 200, "Second validation failed"
        
        # Verify same user data returned
        data1 = response1.json()
        data2 = response2.json()
        assert data1.get("id") == data2.get("id"), "User ID mismatch between validations"
        
        print("PASS: Token revalidation works correctly (simulates page reload)")
    
    def test_expired_token_returns_401(self):
        """Test that expired/invalid token returns 401 (not 500)"""
        # Use a clearly invalid token
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid"
        })
        
        # Should return 401 (unauthorized), not 500 (server error)
        assert response.status_code in [401, 403], f"Expected 401/403 for invalid token, got {response.status_code}"
        print(f"PASS: Invalid token correctly returns {response.status_code} (not 500)")


class TestStaffInfoStructure:
    """Tests to verify staff info structure matches what frontend expects"""
    
    def test_staff_info_has_required_fields(self):
        """Test that staff info contains all fields needed for localStorage caching"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        
        assert response.status_code == 200
        
        staff = response.json().get("staff", {})
        
        # Required fields for frontend caching
        required_fields = ["id", "name", "role"]
        for field in required_fields:
            assert field in staff, f"Missing required field: {field}"
        
        # Optional but expected fields
        expected_fields = ["department", "clinic", "clinics"]
        for field in expected_fields:
            if field not in staff:
                print(f"INFO: Optional field '{field}' not present")
        
        print(f"PASS: Staff info has all required fields: {list(staff.keys())}")
    
    def test_doctor_staff_info_has_doctor_name(self):
        """Test that doctor staff info includes doctor_name field"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_neha",
            "password": "test1234"
        })
        
        assert response.status_code == 200
        
        staff = response.json().get("staff", {})
        
        # Doctor should have doctor_name field
        assert "doctor_name" in staff, "Doctor staff info missing doctor_name field"
        assert staff.get("doctor_name") is not None, "doctor_name should not be None for doctors"
        
        print(f"PASS: Doctor staff info has doctor_name: {staff.get('doctor_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
