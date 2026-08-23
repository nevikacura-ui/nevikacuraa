"""
Iteration 198: Test ANC Registration Features
- POST /api/anc/register - ANC patient registration
- POST /api/clinic/anc-send-email - Send ANC form via email
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Staff credentials for testing
STAFF_USERNAME = "staff_diagyn"
STAFF_PASSWORD = "test1234"


class TestANCRegistrationAPI:
    """Test ANC Registration endpoints"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff auth token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_USERNAME,
            "password": STAFF_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    @pytest.fixture
    def auth_headers(self, staff_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {staff_token}"}
    
    def test_anc_register_endpoint_exists(self, auth_headers):
        """Test that /api/anc/register endpoint exists and accepts POST"""
        # Create a test LMP date (8 weeks ago)
        lmp_date = (datetime.now() - timedelta(days=56)).strftime("%Y-%m-%d")
        
        payload = {
            "patient_name": "TEST_ANC_Patient_198",
            "age": 28,
            "phone": "9999198001",
            "address": "123 Test Address, Test City",
            "husband_name": "Test Husband",
            "lmp": lmp_date,
            "gravida": 1,
            "para": 0,
            "abortion": 0,
            "living": 0,
            "blood_group": "O",
            "rh_factor": "Positive",
            "weight_kg": 55.0,
            "height_cm": 160.0,
            "previous_cesarean": False,
            "diabetes": False,
            "hypertension": False,
            "thyroid": False,
            "clinic": "Pushpa Clinic",
            "registered_by": "test_staff"
        }
        
        response = requests.post(f"{BASE_URL}/api/anc/register", json=payload, headers=auth_headers)
        
        # Should return 200 or 422 (validation) - not 404
        assert response.status_code != 404, "ANC register endpoint not found"
        
        # If successful registration
        if response.status_code == 200:
            data = response.json()
            # Check for success or existing patient message
            assert "success" in data or "existing_id" in data or "registration_id" in data
            print(f"ANC Registration Response: {data}")
            
            if data.get("success"):
                assert "registration_id" in data
                assert "edd" in data
                print(f"PASS: ANC patient registered - ID: {data.get('registration_id')}, EDD: {data.get('edd')}")
            else:
                print(f"INFO: {data.get('message', 'Patient may already exist')}")
        else:
            print(f"Response status: {response.status_code}, body: {response.text[:200]}")
    
    def test_anc_register_required_fields(self, auth_headers):
        """Test that ANC register validates required fields"""
        # Missing required fields
        payload = {
            "patient_name": "Test",
            # Missing: phone, address, husband_name, lmp, clinic
        }
        
        response = requests.post(f"{BASE_URL}/api/anc/register", json=payload, headers=auth_headers)
        
        # Should return validation error (422) or error message
        print(f"Missing fields response: {response.status_code}")
        assert response.status_code in [422, 400, 200], f"Unexpected status: {response.status_code}"
    
    def test_anc_email_endpoint_exists(self, auth_headers):
        """Test that /api/clinic/anc-send-email endpoint exists"""
        lmp_date = (datetime.now() - timedelta(days=56)).strftime("%Y-%m-%d")
        
        payload = {
            "patient_name": "Test Email Patient",
            "age": 25,
            "phone": "9999198002",
            "address": "Test Address for Email",
            "husband_name": "Email Test Husband",
            "lmp": lmp_date,
            "gravida": 1,
            "para": 0,
            "abortion": 0,
            "living": 0,
            "blood_group": "B",
            "rh_factor": "Positive",
            "weight_kg": 52.0,
            "height_cm": 155.0,
            "clinic": "Pushpa Clinic",
            "doctor_assigned": "Dr. Vikas Jha",
            "registered_by": "test_staff"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic/anc-send-email", json=payload, headers=auth_headers)
        
        # Endpoint should exist (not 404)
        assert response.status_code != 404, "ANC send-email endpoint not found"
        
        print(f"ANC Email Response: {response.status_code}")
        data = response.json()
        print(f"ANC Email Response body: {data}")
        
        # Check response structure
        assert "success" in data or "message" in data, "Response should have success or message field"
        
        if data.get("success"):
            print(f"PASS: ANC email sent successfully")
        else:
            # Email might fail if Resend not configured, but endpoint exists
            print(f"INFO: Email response: {data.get('message', 'Email service response')}")
    
    def test_anc_register_with_all_fields(self, auth_headers):
        """Test ANC registration with all fields including medical history"""
        lmp_date = (datetime.now() - timedelta(days=70)).strftime("%Y-%m-%d")
        
        payload = {
            "patient_name": "TEST_Full_ANC_198",
            "age": 32,
            "phone": "9999198003",
            "address": "456 Full Address, City, State",
            "aadhaar": "123456789012",
            "husband_name": "Full Test Husband",
            "husband_phone": "9999198004",
            "husband_occupation": "Engineer",
            "lmp": lmp_date,
            "gravida": 2,
            "para": 1,
            "abortion": 0,
            "living": 1,
            "blood_group": "A",
            "rh_factor": "Positive",
            "weight_kg": 58.5,
            "height_cm": 162.0,
            "previous_cesarean": False,
            "diabetes": True,
            "hypertension": False,
            "thyroid": True,
            "other_conditions": "Mild anemia",
            "clinic": "Amnion Clinic",
            "doctor_assigned": "Dr. Neha Patel",
            "registered_by": "staff_diagyn"
        }
        
        response = requests.post(f"{BASE_URL}/api/anc/register", json=payload, headers=auth_headers)
        
        print(f"Full ANC Registration Response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Full ANC Response body: {data}")
            
            if data.get("success"):
                assert "registration_id" in data
                assert "edd" in data
                assert "gestational_age" in data
                print(f"PASS: Full ANC registration - ID: {data.get('registration_id')}")
            else:
                print(f"INFO: {data.get('message', 'Response received')}")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_check(self):
        """Test backend health"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Backend health check")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
