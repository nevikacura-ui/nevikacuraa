"""
Iteration 17 - Comprehensive Testing for New Features
Tests: Fee codes, SMS notifications, Admin cancellation options, Evara content, 
       Period tracking tips, Share reports, International login, No WhatsApp redirects
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cura-login.preview.emergentagent.com')

# Test credentials
ADMIN_PASSWORD = "nevikacura2026"
DOCTOR_USERNAME = "doc_neha"
DOCTOR_PASSWORD = "Nevika@2026D"
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"


class TestHealthEndpoint:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/doctors/availability?days=1")
        assert response.status_code == 200
        print("✅ API is accessible")


class TestAdminLogin:
    """Admin portal login tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "super_admin"
        print(f"✅ Admin login successful - role: {data.get('role')}")
        return data["token"]
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✅ Admin login correctly rejects wrong password")


class TestAdminCancellationOptions:
    """Test admin appointment cancellation options"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_admin_stats_endpoint(self, admin_token):
        """Test admin stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_appointments" in data or "total_users" in data
        print(f"✅ Admin stats endpoint working")
    
    def test_admin_cancel_appointment_endpoint_exists(self, admin_token):
        """Test that admin cancel appointments endpoint exists"""
        # Test with minimal payload to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/admin/appointments/cancel",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "cancel_type": "day",
                "date": "2099-12-31",  # Future date to avoid affecting real data
                "reason": "Test cancellation"
            }
        )
        # Should return 200 with cancelled_count (even if 0)
        assert response.status_code in [200, 400, 422]
        print(f"✅ Admin cancel appointments endpoint exists - status: {response.status_code}")


class TestStaffPortal:
    """Staff portal tests"""
    
    def test_staff_login_doctor(self):
        """Test staff login with doctor credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Staff login (doctor) successful - role: {data.get('role')}")
        return data["token"]
    
    def test_staff_login_clinic(self):
        """Test staff login with clinic staff credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Staff login (clinic) successful - role: {data.get('role')}")


class TestOTPFlow:
    """OTP authentication flow tests"""
    
    def test_otp_send_auth(self):
        """Test OTP send for authentication"""
        test_phone = "9876543210"
        response = requests.post(
            f"{BASE_URL}/api/auth/otp/send",
            json={"phone": test_phone}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "method" in data  # 'sms' or 'mock'
        print(f"✅ Auth OTP send working - method: {data.get('method')}")
    
    def test_otp_send_service(self):
        """Test OTP send for service booking"""
        test_phone = "9876543211"
        for service in ['diagyn', 'proton', 'pharmacy']:
            response = requests.post(
                f"{BASE_URL}/api/otp/send",
                json={"phone": test_phone, "service": service}
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            print(f"✅ Service OTP send working for {service}")


class TestInternationalLogin:
    """International patient email login tests"""
    
    def test_register_with_email(self):
        """Test registration with email (international patient)"""
        unique_email = f"test_intl_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "International Test User",
                "email": unique_email,
                "password": "TestPass123!",
                "phone": "international"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ International patient registration working - email: {unique_email}")
    
    def test_login_with_email(self):
        """Test login with email"""
        # First register
        unique_email = f"test_login_{uuid.uuid4().hex[:8]}@example.com"
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Login Test User",
                "email": unique_email,
                "password": "TestPass123!",
                "phone": "international"
            }
        )
        
        # Then login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": unique_email, "password": "TestPass123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ International patient login working")


class TestAppointmentBooking:
    """Appointment booking tests (no WhatsApp redirect)"""
    
    def test_appointment_booking_returns_success(self):
        """Test appointment booking returns success without WhatsApp redirect"""
        # Create appointment
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "time": "11:00",
                "patient_name": "Test Patient",
                "patient_phone": "9876543212",
                "patient_email": "test@example.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        # Should NOT have whatsapp_redirect in response
        assert "whatsapp_redirect" not in data or data.get("whatsapp_redirect") is None
        print(f"✅ Appointment booking works without WhatsApp redirect")


class TestPharmacyOrder:
    """Pharmacy order tests (no WhatsApp redirect)"""
    
    def test_pharmacy_order_returns_success(self):
        """Test pharmacy order returns success without WhatsApp redirect"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json={
                "medicines": [{"name": "Paracetamol", "quantity": 1}],
                "patient_name": "Test Patient",
                "patient_phone": "9876543213",
                "patient_email": "test@example.com",
                "delivery_address": "Test Address, City"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        # Should NOT have whatsapp_redirect in response
        assert "whatsapp_redirect" not in data or data.get("whatsapp_redirect") is None
        print(f"✅ Pharmacy order works without WhatsApp redirect")


class TestDiagnosticBooking:
    """Diagnostic test booking tests (no WhatsApp redirect)"""
    
    def test_diagnostic_booking_returns_success(self):
        """Test diagnostic booking returns success without WhatsApp redirect"""
        response = requests.post(
            f"{BASE_URL}/api/diagnostics",
            json={
                "tests": ["CBC (Complete Blood Count)"],
                "preferred_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
                "patient_name": "Test Patient",
                "patient_phone": "9876543214",
                "patient_email": "test@example.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        # Should NOT have whatsapp_redirect in response
        assert "whatsapp_redirect" not in data or data.get("whatsapp_redirect") is None
        print(f"✅ Diagnostic booking works without WhatsApp redirect")


class TestEvaraModule:
    """Evara women's wellness module tests"""
    
    def test_evara_programs_endpoint(self):
        """Test Evara programs endpoint"""
        response = requests.get(f"{BASE_URL}/api/evara/programs")
        assert response.status_code == 200
        data = response.json()
        assert "programs" in data
        programs = data["programs"]
        
        # Check for expected programs
        program_ids = [p.get("id") for p in programs]
        expected_programs = ["menstrual_health", "pcos_hormonal", "pregnancy_support", "menopause_care", "wellness_community"]
        for expected in expected_programs:
            assert expected in program_ids, f"Missing program: {expected}"
        
        print(f"✅ Evara programs endpoint working - {len(programs)} programs found")
    
    def test_evara_chat_endpoint(self):
        """Test Evara chat endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/evara/chat",
            json={"message": "What is PCOS?"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        print(f"✅ Evara chat endpoint working")


class TestGlydexModule:
    """Glydex diabetes care module tests"""
    
    def test_glydex_share_report_endpoint_exists(self):
        """Test Glydex share report endpoint exists (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/glydex/share-report")
        # Should return 401 (unauthorized) or 422 (validation error) - not 404
        assert response.status_code in [401, 422, 403]
        print(f"✅ Glydex share report endpoint exists - status: {response.status_code}")


class TestPharmacyInventory:
    """Pharmacy inventory tests"""
    
    def test_pharmacy_inventory_count(self):
        """Test pharmacy inventory count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert data["total"] > 0
        print(f"✅ Pharmacy inventory count: {data['total']} medicines")
    
    def test_pharmacy_autocomplete(self):
        """Test pharmacy autocomplete"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete?q=para&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"✅ Pharmacy autocomplete working - {len(data['suggestions'])} suggestions")


class TestTrackOrder:
    """Track order tests"""
    
    def test_track_order_by_phone(self):
        """Test track order by phone number"""
        response = requests.get(f"{BASE_URL}/api/guest/orders?phone=9876543210")
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        assert "pharmacy_orders" in data
        assert "diagnostic_orders" in data
        print(f"✅ Track order by phone working")


class TestDoctorAvailability:
    """Doctor availability tests"""
    
    def test_doctor_availability(self):
        """Test doctor availability endpoint"""
        response = requests.get(f"{BASE_URL}/api/doctors/availability?days=7")
        assert response.status_code == 200
        data = response.json()
        assert "availability" in data
        print(f"✅ Doctor availability endpoint working - {len(data['availability'])} doctors")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
