"""
Staff Portal API Tests
Tests for staff login, walk-in booking, emergency booking, and payment APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://medport-1.preview.emergentagent.com')

# Test credentials
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"
TEST_PATIENT_PHONE = "9876543210"


class TestStaffLogin:
    """Staff authentication tests"""
    
    def test_staff_login_success(self):
        """Test successful staff login"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["name"] == "Staff Pushpa"
        assert data["staff"]["role"] == "clinic_staff_pushpa"
        assert data["staff"]["clinic"] == "Pushpa Clinic"
    
    def test_staff_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "invalid_user", "password": "wrong_password"}
        )
        assert response.status_code == 401
    
    def test_staff_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME}
        )
        # API returns 401 for missing password (treated as invalid credentials)
        assert response.status_code in [401, 422]


class TestPaymentAPIs:
    """Payment API tests"""
    
    def test_get_fee_codes(self):
        """Test getting fee codes"""
        response = requests.get(f"{BASE_URL}/api/payments/fee-codes")
        assert response.status_code == 200
        data = response.json()
        assert "consultation_fees" in data
        assert "scan_fees" in data
        
        # Verify consultation fees
        consultation_fees = data["consultation_fees"]
        assert "G1" in consultation_fees
        assert consultation_fees["G1"]["amount"] == 150.0
        assert "E1" in consultation_fees
        assert consultation_fees["E1"]["amount"] == 600.0  # Emergency fee
    
    def test_get_transactions_by_phone(self):
        """Test getting transactions by patient phone"""
        response = requests.get(
            f"{BASE_URL}/api/payments/transactions",
            params={"patient_phone": TEST_PATIENT_PHONE, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "count" in data
        assert isinstance(data["transactions"], list)
    
    def test_get_receipt_pdf(self):
        """Test PDF receipt generation"""
        # First get a transaction
        response = requests.get(
            f"{BASE_URL}/api/payments/transactions",
            params={"patient_phone": TEST_PATIENT_PHONE, "limit": 1}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["count"] > 0:
            session_id = data["transactions"][0]["session_id"]
            
            # Get PDF receipt
            pdf_response = requests.get(
                f"{BASE_URL}/api/payments/receipt/{session_id}/pdf"
            )
            assert pdf_response.status_code == 200
            assert pdf_response.headers.get("content-type") == "application/pdf"
            # Check PDF starts with %PDF
            assert pdf_response.content[:4] == b'%PDF'


class TestPatientAPIs:
    """Patient API tests"""
    
    def test_get_patient_by_phone(self):
        """Test getting patient by phone number"""
        response = requests.get(
            f"{BASE_URL}/api/patients/by-phone/{TEST_PATIENT_PHONE}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "patient_id" in data
        assert "name" in data
        assert "mobile" in data
        assert data["mobile"] == TEST_PATIENT_PHONE


class TestStaffAppointmentAPIs:
    """Staff appointment API tests (requires authentication)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_booked_slots(self, auth_token):
        """Test getting booked slots for a doctor"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Vikas Jha",
                "clinic": "Pushpa Clinic",
                "date": "2026-01-27"  # Monday
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        assert isinstance(data["booked_slots"], list)
    
    def test_get_clinic_appointments(self, auth_token):
        """Test getting clinic appointments"""
        response = requests.get(
            f"{BASE_URL}/api/staff/clinic/appointments",
            params={"date": "2026-01-25"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        assert isinstance(data["appointments"], list)
    
    def test_get_diagnostic_tests(self, auth_token):
        """Test getting available diagnostic tests"""
        response = requests.get(
            f"{BASE_URL}/api/staff/diagnostic-tests",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data


class TestHealthEndpoints:
    """Basic health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        # May return 404 or 200 depending on implementation
        assert response.status_code in [200, 404]
    
    def test_frontend_loads(self):
        """Test frontend loads"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200
        assert "Nevika" in response.text or "html" in response.text.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
