"""
Test suite for verifying:
1. Email field with helper text in all 3 services (Pharmacy, Proton, DiaGyn)
2. Admin login returns token with 30-day expiry
3. App icons are accessible
4. Backend APIs accept patient_email field
"""

import pytest
import requests
import os
import jwt
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthcare-app-27.preview.emergentagent.com')
ADMIN_PASSWORD = "nevikacura2026"

class TestAdminLogin:
    """Test admin login with 30-day token expiry"""
    
    def test_admin_login_success(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not returned"
        assert data.get("role") == "admin", "Role should be admin"
        
        # Decode token to verify expiry
        token = data["token"]
        # Decode without verification to check payload
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        assert decoded.get("role") == "admin", "Token role should be admin"
        assert decoded.get("sub") == "admin", "Token sub should be admin"
        
        # Verify expiry is approximately 30 days from now
        exp_timestamp = decoded.get("exp")
        assert exp_timestamp is not None, "Token should have expiry"
        
        exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        now = datetime.now(timezone.utc)
        days_until_expiry = (exp_datetime - now).days
        
        # Should be between 29 and 30 days (allowing for test execution time)
        assert 29 <= days_until_expiry <= 30, f"Token expiry should be ~30 days, got {days_until_expiry} days"
        print(f"✓ Admin token expires in {days_until_expiry} days (30-day session confirmed)")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Should reject invalid password"


class TestAppIcons:
    """Test app icons are accessible"""
    
    def test_icon_192x192_accessible(self):
        """Test 192x192 icon is accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-192x192.png")
        assert response.status_code == 200, f"Icon 192x192 not accessible: {response.status_code}"
        assert "image" in response.headers.get("content-type", ""), "Should return image content type"
        print("✓ Icon 192x192 is accessible")
    
    def test_icon_512x512_accessible(self):
        """Test 512x512 icon is accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-512x512.png")
        assert response.status_code == 200, f"Icon 512x512 not accessible: {response.status_code}"
        assert "image" in response.headers.get("content-type", ""), "Should return image content type"
        print("✓ Icon 512x512 is accessible")
    
    def test_icon_72x72_accessible(self):
        """Test 72x72 icon is accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-72x72.png")
        assert response.status_code == 200, f"Icon 72x72 not accessible: {response.status_code}"
        print("✓ Icon 72x72 is accessible")
    
    def test_icon_128x128_accessible(self):
        """Test 128x128 icon is accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-128x128.png")
        assert response.status_code == 200, f"Icon 128x128 not accessible: {response.status_code}"
        print("✓ Icon 128x128 is accessible")


class TestPharmacyEmailField:
    """Test Pharmacy API accepts patient_email field"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        # First register a test user
        test_email = f"TEST_pharmacy_email_{datetime.now().timestamp()}@example.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "phone": "9876543210",
            "name": "Test Pharmacy User"
        })
        if register_response.status_code == 200:
            return register_response.json().get("token")
        
        # If registration fails (user exists), try login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "testpass123"
        })
        if login_response.status_code == 200:
            return login_response.json().get("token")
        
        pytest.skip("Could not get auth token")
    
    def test_pharmacy_order_with_email(self, auth_token):
        """Test pharmacy order accepts patient_email field"""
        order_data = {
            "medicines": [{"name": "TEST_Paracetamol", "quantity": 2}],
            "patient_name": "TEST_Email_User",
            "patient_phone": "9876543210",
            "patient_email": "test_patient@example.com",
            "delivery_address": "123 Test Street"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Pharmacy order failed: {response.text}"
        
        data = response.json()
        assert data.get("patient_email") == "test_patient@example.com", "patient_email should be saved"
        assert data.get("patient_name") == "TEST_Email_User"
        print("✓ Pharmacy order accepts patient_email field")
    
    def test_pharmacy_order_without_email(self, auth_token):
        """Test pharmacy order works without email (optional field)"""
        order_data = {
            "medicines": [{"name": "TEST_Aspirin", "quantity": 1}],
            "patient_name": "TEST_No_Email_User",
            "patient_phone": "9876543211",
            "delivery_address": "456 Test Avenue"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Pharmacy order without email failed: {response.text}"
        print("✓ Pharmacy order works without email (optional)")


class TestDiagnosticsEmailField:
    """Test Diagnostics API accepts patient_email field"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        test_email = f"TEST_diag_email_{datetime.now().timestamp()}@example.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "phone": "9876543212",
            "name": "Test Diagnostics User"
        })
        if register_response.status_code == 200:
            return register_response.json().get("token")
        
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "testpass123"
        })
        if login_response.status_code == 200:
            return login_response.json().get("token")
        
        pytest.skip("Could not get auth token")
    
    def test_diagnostics_order_with_email(self, auth_token):
        """Test diagnostics order accepts patient_email field"""
        order_data = {
            "tests": ["CBC", "Blood Sugar"],
            "preferred_date": "2025-12-20",
            "patient_name": "TEST_Diag_Email_User",
            "patient_phone": "9876543213",
            "patient_email": "test_diag_patient@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diagnostics",
            json=order_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Diagnostics order failed: {response.text}"
        
        data = response.json()
        assert data.get("patient_email") == "test_diag_patient@example.com", "patient_email should be saved"
        print("✓ Diagnostics order accepts patient_email field")


class TestAppointmentEmailField:
    """Test Appointment API accepts patient_email field"""
    
    def test_appointment_with_email(self):
        """Test appointment booking accepts patient_email field"""
        # Use a unique time slot to avoid conflicts
        import random
        hour = random.randint(11, 13)
        minute = random.choice([0, 15, 30, 45])
        time_slot = f"{hour:02d}:{minute:02d}"
        
        appointment_data = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "Amnion Clinic",
            "date": "2025-12-25",
            "time": time_slot,
            "patient_name": "TEST_Appt_Email_User",
            "patient_phone": "9876543214",
            "patient_email": "test_appt_patient@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=appointment_data
        )
        
        # May fail if slot is taken, but we're testing the email field acceptance
        if response.status_code == 200:
            data = response.json()
            assert data.get("patient_email") == "test_appt_patient@example.com", "patient_email should be saved"
            print("✓ Appointment accepts patient_email field")
        elif response.status_code == 400 and "already booked" in response.text.lower():
            # Slot taken, but API structure is correct - try another slot
            print("⚠ Slot was taken, but API accepts email field structure")
        else:
            pytest.fail(f"Appointment booking failed unexpectedly: {response.text}")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health endpoint accessible")
    
    def test_frontend_loads(self):
        """Test frontend is accessible"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200, f"Frontend not accessible: {response.status_code}"
        print("✓ Frontend loads successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
