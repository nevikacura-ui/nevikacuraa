"""
Test suite for Matrix Rain Features - Iteration 252
Tests: Clinic Override API, Orange/Labs pages, DiaGyn Staff Portal
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestClinicOverrideAPI:
    """Tests for /api/clinic-override endpoints"""
    
    def test_get_active_overrides(self):
        """Test GET /api/clinic-override/active returns override data"""
        response = requests.get(f"{BASE_URL}/api/clinic-override/active")
        assert response.status_code == 200
        
        data = response.json()
        assert "overrides" in data
        assert isinstance(data["overrides"], list)
        
        # Check if there's at least one override (as per test data)
        if len(data["overrides"]) > 0:
            override = data["overrides"][0]
            # Verify override structure
            assert "doctor_id" in override or "doctor_name" in override
            assert "date" in override
            assert "session" in override
            assert "override_clinic" in override
            assert "override_clinic_name" in override
            print(f"Found {len(data['overrides'])} active override(s)")
            print(f"First override: {override.get('doctor_name')} - {override.get('date')} {override.get('session')}")
    
    def test_override_data_structure(self):
        """Test that override data has correct structure"""
        response = requests.get(f"{BASE_URL}/api/clinic-override/active")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["overrides"]) > 0:
            override = data["overrides"][0]
            # Check expected fields
            expected_fields = ["doctor_name", "date", "session", "override_clinic", "override_clinic_name"]
            for field in expected_fields:
                assert field in override, f"Missing field: {field}"
            
            # Validate session value
            assert override["session"] in ["morning", "evening"], f"Invalid session: {override['session']}"
            
            # Validate clinic value
            assert override["override_clinic"] in ["pushpa", "amnion"], f"Invalid clinic: {override['override_clinic']}"


class TestHealthAPI:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"


class TestStaffLogin:
    """Tests for staff login API"""
    
    def test_staff_login_success(self):
        """Test staff login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "diagyn_staff",
            "password": "test1234"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 0
        print(f"Login successful, token received")
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        # Should return 401 or 400 for invalid credentials
        assert response.status_code in [400, 401, 403]


class TestDiaGynStaffEndpoints:
    """Tests for DiaGyn staff portal endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for staff"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "diagyn_staff",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff authentication failed")
    
    def test_staff_config(self, auth_token):
        """Test GET /api/diagyn-staff/config"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Config should have clinics and doctor_schedule
        assert "clinics" in data or "doctor_schedule" in data
        print(f"Config loaded successfully")
    
    def test_staff_appointments_by_date(self, auth_token):
        """Test GET /api/diagyn-staff/appointments/by-date"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": "2026-03-23", "clinic": "Pushpa Clinic"},
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "appointments" in data
        assert isinstance(data["appointments"], list)
        print(f"Found {len(data['appointments'])} appointments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
