"""
Patient Portal API Tests - Iteration 49
Tests for Patient Portal OTP Login and History features
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test patient credentials
TEST_PATIENT_MOBILE = "9876543210"
TEST_PATIENT_NAME = "Rahul Kumar"
TEST_PATIENT_ID = "NC-2026-00001"


class TestPatientPortalOTP:
    """Patient Portal OTP Login Tests"""
    
    def test_send_otp_success(self):
        """Test sending OTP to registered patient"""
        response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={TEST_PATIENT_MOBILE}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "mock_otp" in data  # Mock OTP for testing
        assert len(data["mock_otp"]) == 6
    
    def test_send_otp_unregistered_patient(self):
        """Test sending OTP to unregistered patient returns 404"""
        response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile=1111111111")
        assert response.status_code == 404
        data = response.json()
        assert "not registered" in data["detail"].lower()
    
    def test_verify_otp_success(self):
        """Test OTP verification with correct OTP"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={TEST_PATIENT_MOBILE}")
        assert send_response.status_code == 200
        mock_otp = send_response.json()["mock_otp"]
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patients/portal/verify-otp?mobile={TEST_PATIENT_MOBILE}&otp={mock_otp}"
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] == True
        assert "token" in data
        assert data["patient"]["patient_id"] == TEST_PATIENT_ID
        assert data["patient"]["name"] == TEST_PATIENT_NAME
    
    def test_verify_otp_invalid(self):
        """Test OTP verification with invalid OTP"""
        # First send OTP to create a valid OTP record
        requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={TEST_PATIENT_MOBILE}")
        
        # Try to verify with wrong OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patients/portal/verify-otp?mobile={TEST_PATIENT_MOBILE}&otp=000000"
        )
        assert verify_response.status_code == 401
        data = verify_response.json()
        assert "invalid" in data["detail"].lower()


class TestPatientPortalProfile:
    """Patient Portal Profile Tests"""
    
    @pytest.fixture
    def patient_token(self):
        """Get patient token via OTP login"""
        send_response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={TEST_PATIENT_MOBILE}")
        mock_otp = send_response.json()["mock_otp"]
        verify_response = requests.post(
            f"{BASE_URL}/api/patients/portal/verify-otp?mobile={TEST_PATIENT_MOBILE}&otp={mock_otp}"
        )
        return verify_response.json()["token"]
    
    def test_get_profile_with_token(self, patient_token):
        """Test getting patient profile with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/patients/portal/me",
            headers={"Authorization": f"Bearer {patient_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["patient_id"] == TEST_PATIENT_ID
        assert data["name"] == TEST_PATIENT_NAME
        assert data["mobile"] == TEST_PATIENT_MOBILE
    
    def test_get_profile_without_token(self):
        """Test getting profile without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/patients/portal/me")
        assert response.status_code == 401
    
    def test_get_profile_invalid_token(self):
        """Test getting profile with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/patients/portal/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestPatientHistory:
    """Patient History Endpoint Tests"""
    
    def test_get_patient_history(self):
        """Test getting patient history"""
        response = requests.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/history")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["patient_id"] == TEST_PATIENT_ID
        assert data["name"] == TEST_PATIENT_NAME
        assert "appointments" in data
        assert "pharmacy_orders" in data
        assert "diagnostic_orders" in data
        assert "bills" in data
        assert "summary" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_appointments" in summary
        assert "total_pharmacy_orders" in summary
        assert "total_diagnostic_orders" in summary
        assert "total_bills" in summary
    
    def test_get_patient_history_not_found(self):
        """Test getting history for non-existent patient"""
        response = requests.get(f"{BASE_URL}/api/patients/NC-9999-99999/history")
        assert response.status_code == 404
    
    def test_get_patient_appointments(self):
        """Test getting patient appointments"""
        response = requests.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/appointments")
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        
        # Verify appointment structure if any exist
        if len(data["appointments"]) > 0:
            apt = data["appointments"][0]
            assert "doctor" in apt
            assert "clinic" in apt
            assert "date" in apt
            assert "status" in apt
    
    def test_get_patient_prescriptions(self):
        """Test getting patient prescriptions"""
        response = requests.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/prescriptions")
        assert response.status_code == 200
        data = response.json()
        assert "prescriptions" in data
    
    def test_get_patient_lab_reports(self):
        """Test getting patient lab reports"""
        response = requests.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/lab-reports")
        assert response.status_code == 200
        data = response.json()
        assert "lab_reports" in data
    
    def test_get_patient_bills(self):
        """Test getting patient bills"""
        response = requests.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/bills")
        assert response.status_code == 200
        data = response.json()
        assert "bills" in data


class TestPatientLookup:
    """Patient Lookup Tests"""
    
    def test_lookup_existing_patient(self):
        """Test looking up existing patient by mobile"""
        response = requests.get(f"{BASE_URL}/api/patients/lookup?mobile={TEST_PATIENT_MOBILE}")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert data["patient"]["patient_id"] == TEST_PATIENT_ID
        assert data["patient"]["name"] == TEST_PATIENT_NAME
    
    def test_lookup_non_existing_patient(self):
        """Test looking up non-existing patient"""
        response = requests.get(f"{BASE_URL}/api/patients/lookup?mobile=1111111111")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
    
    def test_lookup_invalid_mobile(self):
        """Test looking up with invalid mobile number"""
        response = requests.get(f"{BASE_URL}/api/patients/lookup?mobile=123")
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
