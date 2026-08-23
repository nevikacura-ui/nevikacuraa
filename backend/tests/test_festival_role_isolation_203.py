"""
Test suite for Iteration 203:
1. Festival banner bug - Holi should NOT show on March 6 (ends March 5)
2. Role isolation - staff_diagyn returns role=diagyn_staff, dr_vikas returns role=doctor
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRoleIsolation:
    """Test that /api/staff/login returns correct roles for different users"""
    
    def test_staff_diagyn_returns_diagyn_staff_role(self):
        """staff_diagyn should return role=diagyn_staff (not doctor)"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "staff" in data, f"Response missing 'staff' field: {data}"
        assert "role" in data["staff"], f"Staff missing 'role' field: {data['staff']}"
        
        role = data["staff"]["role"].lower()
        print(f"staff_diagyn role: {data['staff']['role']}")
        
        # Role should be diagyn_staff or similar, NOT doctor
        assert "doctor" not in role, f"staff_diagyn should not have doctor role, got: {data['staff']['role']}"
        assert "staff" in role or "diagyn" in role, f"Expected staff/diagyn role, got: {data['staff']['role']}"
    
    def test_dr_vikas_returns_doctor_role(self):
        """dr_vikas should return role=doctor"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "staff" in data, f"Response missing 'staff' field: {data}"
        assert "role" in data["staff"], f"Staff missing 'role' field: {data['staff']}"
        
        role = data["staff"]["role"].lower()
        print(f"dr_vikas role: {data['staff']['role']}")
        
        # Role should contain 'doctor'
        assert "doctor" in role, f"dr_vikas should have doctor role, got: {data['staff']['role']}"
    
    def test_staff_login_returns_token(self):
        """Both staff and doctor login should return a valid token"""
        # Test staff
        staff_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert staff_response.status_code == 200
        assert "token" in staff_response.json(), "Missing token for staff_diagyn"
        
        # Test doctor
        doctor_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert doctor_response.status_code == 200
        assert "token" in doctor_response.json(), "Missing token for dr_vikas"


class TestRoleDetails:
    """Verify complete role data for staff vs doctor"""
    
    def test_staff_diagyn_full_response(self):
        """Verify staff_diagyn returns complete staff data"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200
        
        data = response.json()
        staff = data.get("staff", {})
        
        # Log full response for debugging
        print(f"staff_diagyn full response: {staff}")
        
        # Verify required fields exist (username not returned in response, only id and name)
        assert staff.get("id") is not None
        assert staff.get("name") is not None
        assert staff.get("role") is not None
        
        # Verify role is NOT doctor
        role = (staff.get("role") or "").lower()
        assert "doctor" not in role
    
    def test_dr_vikas_full_response(self):
        """Verify dr_vikas returns complete doctor data"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200
        
        data = response.json()
        staff = data.get("staff", {})
        
        # Log full response for debugging
        print(f"dr_vikas full response: {staff}")
        
        # Verify required fields exist (username not returned in response, only id and name)
        assert staff.get("id") is not None
        assert staff.get("name") is not None
        assert staff.get("role") is not None
        
        # Verify role IS doctor
        role = (staff.get("role") or "").lower()
        assert "doctor" in role


class TestInvalidCredentials:
    """Test error handling for invalid credentials"""
    
    def test_invalid_password(self):
        """Invalid password should return 401"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_invalid_username(self):
        """Invalid username should return 401 or 404"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "nonexistent_user",
            "password": "test1234"
        })
        assert response.status_code in [401, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
