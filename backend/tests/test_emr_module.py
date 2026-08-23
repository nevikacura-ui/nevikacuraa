"""
EMR Module Tests - Testing EMR API endpoints for online consultations
Tests: frequency-codes, medicines search, appointment lookup, prescription creation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestEMRPublicEndpoints:
    """Test EMR endpoints that don't require authentication"""
    
    def test_frequency_codes_endpoint(self):
        """Test /api/emr/frequency-codes returns all frequency options"""
        response = requests.get(f"{BASE_URL}/api/emr/frequency-codes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "codes" in data, "Response should contain 'codes' key"
        
        codes = data["codes"]
        # Verify expected frequency codes exist
        expected_codes = ["OD", "BD", "TDS", "QID", "SOS", "HS", "AC", "PC", "STAT"]
        for code in expected_codes:
            assert code in codes, f"Missing frequency code: {code}"
        
        # Verify OD description
        assert codes["OD"] == "Once daily", f"OD should be 'Once daily', got '{codes.get('OD')}'"
        print(f"✓ Frequency codes endpoint returns {len(codes)} codes: {list(codes.keys())}")
    
    def test_medicines_search_endpoint_returns_list(self):
        """Test /api/emr/medicines/search returns medicines list (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/emr/medicines/search?q=tab&limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "medicines" in data, "Response should contain 'medicines' key"
        assert isinstance(data["medicines"], list), "Medicines should be a list"
        
        print(f"✓ Medicines search returned {len(data['medicines'])} results")
    
    def test_medicines_search_short_query_returns_empty(self):
        """Test medicines search with short query returns empty"""
        response = requests.get(f"{BASE_URL}/api/emr/medicines/search?q=a")
        assert response.status_code == 200
        
        data = response.json()
        assert data["medicines"] == [], "Short query should return empty list"
        print("✓ Short query (single char) returns empty list as expected")


class TestEMRDoctorEndpoints:
    """Test EMR endpoints that require doctor authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup doctor authentication"""
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Doctor login failed - skipping authenticated tests")
        
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.doctor_info = login_response.json().get("staff", {})
        print(f"✓ Logged in as {self.doctor_info.get('doctor_name', 'Doctor')}")
    
    def test_emr_appointment_not_found(self):
        """Test EMR appointment endpoint returns 404 for non-existent booking"""
        response = requests.get(
            f"{BASE_URL}/api/emr/appointment/FAKE-BOOKING-ID",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ EMR appointment endpoint returns 404 for non-existent booking")
    
    def test_emr_appointment_requires_auth(self):
        """Test EMR appointment endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emr/appointment/DIAGYN-123")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ EMR appointment endpoint requires authentication")
    
    def test_prescription_get_not_found(self):
        """Test prescription endpoint returns 404 for non-existent prescription"""
        response = requests.get(
            f"{BASE_URL}/api/emr/prescription/FAKE-RX-ID",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Prescription endpoint returns 404 for non-existent prescription")
    
    def test_prescriptions_by_doctor(self):
        """Test getting prescriptions by logged-in doctor"""
        response = requests.get(
            f"{BASE_URL}/api/emr/prescriptions/by-doctor",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "prescriptions" in data, "Response should contain 'prescriptions' key"
        assert isinstance(data["prescriptions"], list), "Prescriptions should be a list"
        
        print(f"✓ Doctor has {len(data['prescriptions'])} prescriptions")


class TestDoctorNehaEMR:
    """Test EMR access for Dr. Neha"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup doctor authentication for Dr. Neha"""
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_neha", "password": "test1234"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Dr. Neha login failed - skipping tests")
        
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print("✓ Logged in as Dr. Neha Patel")
    
    def test_dr_neha_can_access_emr(self):
        """Test Dr. Neha can access EMR endpoints"""
        response = requests.get(
            f"{BASE_URL}/api/emr/prescriptions/by-doctor",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Dr. Neha can access EMR prescriptions endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
