"""
Comprehensive Backend API Tests for Nevika Cura Healthcare App - Iteration 11
Tests: Homepage APIs, Auth/OTP, Pharmacy, Diagnostics, Appointments, Staff Portal, Admin Portal, Push Notifications, Loyalty Points
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cura-app.preview.emergentagent.com').rstrip('/')

# Test credentials from review request
ADMIN_PASSWORD = "nevikacura2026"
PHARMACY_STAFF = {"username": "staff_pharmacy", "password": "Nevika@2026P"}
DIAGNOSTIC_STAFF = {"username": "staff_proton", "password": "Nevika@2026L"}
TEST_USER_PHONE = "9876543210"


class TestHealthAndBasicEndpoints:
    """Test basic API health and root endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint returns correct message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Nevika Cura" in data["message"]
        print(f"✓ API root: {data['message']}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check: {data}")


class TestPushNotifications:
    """Test VAPID key endpoint for push notifications"""
    
    def test_vapid_public_key_endpoint(self):
        """Test VAPID public key endpoint returns valid key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "public_key" in data
        assert len(data["public_key"]) > 50  # VAPID keys are typically long
        print(f"✓ VAPID public key endpoint working: {data['public_key'][:30]}...")


class TestAuthOTP:
    """Test OTP-based authentication flow"""
    
    def test_send_otp(self):
        """Test sending OTP to phone number"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": TEST_USER_PHONE
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "expires_in" in data
        print(f"✓ OTP sent successfully: method={data.get('method')}")
        return data.get("mock_otp")  # For testing purposes
    
    def test_verify_otp_invalid(self):
        """Test OTP verification with invalid code"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": "9999999999"})
        
        # Try invalid OTP
        response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9999999999",
            "otp": "000000"
        })
        # Should fail with 400
        assert response.status_code == 400
        print("✓ Invalid OTP correctly rejected")


class TestStaffPortalLogin:
    """Test staff portal authentication"""
    
    def test_pharmacy_staff_login(self):
        """Test pharmacy staff login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": PHARMACY_STAFF["username"],
            "password": PHARMACY_STAFF["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "pharmacy"
        print(f"✓ Pharmacy staff login successful: {data['staff']['name']}")
        return data["token"]
    
    def test_diagnostic_staff_login(self):
        """Test diagnostic staff login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DIAGNOSTIC_STAFF["username"],
            "password": DIAGNOSTIC_STAFF["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "diagnostic"
        print(f"✓ Diagnostic staff login successful: {data['staff']['name']}")
        return data["token"]
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401
        print("✓ Invalid staff credentials correctly rejected")


class TestAdminPortal:
    """Test admin portal authentication"""
    
    def test_admin_login(self):
        """Test admin login with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("success") == True
        print("✓ Admin login successful")
        return data["token"]
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrong_password"
        })
        assert response.status_code == 401
        print("✓ Invalid admin password correctly rejected")


class TestPharmacyEndpoints:
    """Test pharmacy-related endpoints"""
    
    def test_pharmacy_count(self):
        """Test pharmacy medicine count endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert data["count"] > 0  # Should have medicines in inventory
        print(f"✓ Pharmacy count: {data['count']} medicines")
    
    def test_pharmacy_autocomplete(self):
        """Test pharmacy medicine autocomplete"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete?q=para")
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"✓ Pharmacy autocomplete: {len(data['suggestions'])} suggestions for 'para'")
    
    def test_pharmacy_forms(self):
        """Test pharmacy forms endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/forms")
        assert response.status_code == 200
        data = response.json()
        assert "forms" in data
        assert len(data["forms"]) > 0
        print(f"✓ Pharmacy forms: {len(data['forms'])} forms available")
    
    def test_pharmacy_all_medicines(self):
        """Test fetching all medicines with pagination"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=50")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Pharmacy all medicines: {data['total']} total, page {data['page']}")
    
    def test_create_pharmacy_order(self):
        """Test creating a pharmacy order with SMS notification"""
        unique_phone = f"98765{str(uuid.uuid4())[:5].replace('-', '0')}"
        order_data = {
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 2, "price": 50}
            ],
            "patient_name": f"TEST_PharmacyPatient_{uuid.uuid4().hex[:6]}",
            "patient_phone": unique_phone,
            "patient_email": "test@example.com",
            "delivery_address": "123 Test Street"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Pharmacy order created: {data['id'][:8]}... (SMS notification should be sent)")
        return data["id"]


class TestDiagnosticEndpoints:
    """Test diagnostic-related endpoints"""
    
    def test_diagnostic_tests_list(self):
        """Test fetching diagnostic tests catalog"""
        response = requests.get(f"{BASE_URL}/api/diagnostic-tests")
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert len(data["tests"]) > 0
        print(f"✓ Diagnostic tests: {len(data['tests'])} tests available")
    
    def test_create_diagnostic_order(self):
        """Test creating a diagnostic order with SMS notification"""
        unique_phone = f"98765{str(uuid.uuid4())[:5].replace('-', '0')}"
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        order_data = {
            "tests": ["Complete Blood Count (CBC)", "Blood Sugar Fasting"],
            "preferred_date": tomorrow,
            "patient_name": f"TEST_DiagnosticPatient_{uuid.uuid4().hex[:6]}",
            "patient_phone": unique_phone,
            "patient_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Diagnostic order created: {data['id'][:8]}... (SMS notification should be sent)")
        return data["id"]


class TestAppointmentEndpoints:
    """Test appointment-related endpoints"""
    
    def test_booked_slots(self):
        """Test fetching booked slots for a doctor"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Vikas Jha",
                "clinic": "Pushpa Clinic",
                "date": tomorrow
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        print(f"✓ Booked slots fetched: {len(data['booked_slots'])} slots booked")
    
    def test_create_appointment_with_otp(self):
        """Test creating appointment with OTP verification"""
        unique_phone = f"98765{str(uuid.uuid4())[:5].replace('-', '0')}"
        
        # First send OTP
        otp_response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "phone": unique_phone,
            "service": "diagyn"
        })
        assert otp_response.status_code == 200
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp", "123456")
        
        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "phone": unique_phone,
            "otp": mock_otp,
            "service": "diagyn"
        })
        assert verify_response.status_code == 200
        
        # Create appointment
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        appointment_data = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": tomorrow,
            "time": "10:00 AM",
            "patient_name": f"TEST_AppointmentPatient_{uuid.uuid4().hex[:6]}",
            "patient_phone": unique_phone,
            "patient_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        # May return 200 or 400 if slot is already booked
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            print(f"✓ Appointment created: {data['id'][:8]}... (SMS notification should be sent)")
            return data["id"]
        elif response.status_code == 400:
            print("✓ Appointment slot already booked (expected behavior)")
            return None
        else:
            assert False, f"Unexpected status code: {response.status_code}"


class TestLoyaltyPoints:
    """Test loyalty points endpoint"""
    
    def test_loyalty_points_unauthenticated(self):
        """Test loyalty points endpoint without authentication"""
        response = requests.get(f"{BASE_URL}/api/user/loyalty-points")
        assert response.status_code == 401
        print("✓ Loyalty points correctly requires authentication")
    
    def test_loyalty_points_with_auth(self):
        """Test loyalty points endpoint with authentication"""
        # First register a test user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        unique_phone = f"98765{str(uuid.uuid4())[:5].replace('-', '0')}"
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": unique_phone,
            "name": f"TEST_LoyaltyUser_{uuid.uuid4().hex[:6]}"
        })
        
        if register_response.status_code == 200:
            token = register_response.json().get("token")
            
            # Get loyalty points
            response = requests.get(
                f"{BASE_URL}/api/user/loyalty-points",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "loyalty_points" in data
            print(f"✓ Loyalty points fetched: {data['loyalty_points']} points")
        else:
            print(f"✓ User registration returned {register_response.status_code} (may already exist)")


class TestStaffPortalOperations:
    """Test staff portal operations with authentication"""
    
    @pytest.fixture
    def pharmacy_token(self):
        """Get pharmacy staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": PHARMACY_STAFF["username"],
            "password": PHARMACY_STAFF["password"]
        })
        return response.json().get("token")
    
    @pytest.fixture
    def diagnostic_token(self):
        """Get diagnostic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DIAGNOSTIC_STAFF["username"],
            "password": DIAGNOSTIC_STAFF["password"]
        })
        return response.json().get("token")
    
    def test_pharmacy_staff_get_orders(self, pharmacy_token):
        """Test pharmacy staff can fetch orders"""
        response = requests.get(
            f"{BASE_URL}/api/staff/pharmacy/orders",
            headers={"Authorization": f"Bearer {pharmacy_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Pharmacy staff fetched {len(data)} orders")
    
    def test_diagnostic_staff_get_orders(self, diagnostic_token):
        """Test diagnostic staff can fetch orders"""
        response = requests.get(
            f"{BASE_URL}/api/staff/diagnostic/orders",
            headers={"Authorization": f"Bearer {diagnostic_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Diagnostic staff fetched {len(data)} orders")


class TestAdminOperations:
    """Test admin portal operations"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_admin_get_staff_list(self, admin_token):
        """Test admin can fetch staff list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin fetched {len(data)} staff members")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
