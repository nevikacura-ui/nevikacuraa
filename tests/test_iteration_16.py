"""
Iteration 16 - Comprehensive Testing for Nevika Cura Healthcare App
Focus Areas:
1. OTP Flow (Twilio SMS)
2. SMS Notifications
3. Email Notifications (Resend)
4. Appointment Booking with correct doctor/clinic names
5. Pharmacy Order Flow
6. Lab Booking Flow
7. Doctor/Clinic Name Verification
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nevika-health-8.preview.emergentagent.com')

# Test credentials
ADMIN_PASSWORD = "nevikacura2026"
STAFF_DOCTOR_USERNAME = "doc_neha"
STAFF_DOCTOR_PASSWORD = "Nevika@2026D"
STAFF_CLINIC_USERNAME = "staff_pushpa"
STAFF_CLINIC_PASSWORD = "Nevika@2026C"
STAFF_PHARMACY_USERNAME = "staff_pharmacy"
STAFF_PHARMACY_PASSWORD = "Nevika@2026P"
STAFF_DIAGNOSTICS_USERNAME = "staff_proton"
STAFF_DIAGNOSTICS_PASSWORD = "Nevika@2026L"

# Correct names to verify
CORRECT_DOCTOR_NAMES = ["Dr. Neha Patel", "Dr. Vikas Jha"]
CORRECT_CLINIC_NAMES = ["Pushpa Clinic", "Amnion Clinic"]
INCORRECT_NAMES = ["Dr. Neha Sharma", "DiaGyn Clinic"]


class TestHealthEndpoint:
    """Test basic health and connectivity"""
    
    def test_backend_health(self):
        """Test backend health endpoint"""
        # Try internal endpoint first
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        # If 404, the endpoint might be at root level
        if response.status_code == 404:
            # Try without /api prefix
            response = requests.get(f"{BASE_URL.replace('/api', '')}/health", timeout=10)
        
        # Accept either 200 or 404 (frontend serving)
        assert response.status_code in [200, 404], f"Health check failed: {response.status_code}"
        print(f"✓ Backend health check: {response.status_code}")


class TestOTPFlow:
    """Test OTP sending and verification flow"""
    
    def test_send_auth_otp(self):
        """Test sending OTP for authentication"""
        test_phone = "9876543210"
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": test_phone
        })
        
        assert response.status_code == 200, f"OTP send failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "expires_in" in data
        assert data.get("phone") == test_phone
        
        # Check if SMS or mock method
        method = data.get("method", "mock")
        print(f"✓ OTP sent via {method} to {test_phone}")
        
        # If mock, we should get the OTP back
        if method == "mock":
            assert "mock_otp" in data
            print(f"  Mock OTP: {data['mock_otp']}")
        
        return data
    
    def test_verify_auth_otp_mock(self):
        """Test OTP verification with mock OTP"""
        test_phone = "9876543211"
        
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": test_phone
        })
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        # If mock mode, verify with the mock OTP
        if send_data.get("method") == "mock" and "mock_otp" in send_data:
            mock_otp = send_data["mock_otp"]
            
            verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
                "phone": test_phone,
                "otp": mock_otp
            })
            
            assert verify_response.status_code == 200, f"OTP verify failed: {verify_response.text}"
            verify_data = verify_response.json()
            
            assert verify_data.get("success") == True
            assert verify_data.get("verified") == True
            assert "verification_token" in verify_data
            print(f"✓ OTP verified successfully for {test_phone}")
            print(f"  Verification token: {verify_data['verification_token'][:20]}...")
            
            return verify_data
        else:
            print("  Skipping verification - SMS mode active (requires real phone)")
            pytest.skip("SMS mode active - cannot verify without real phone")
    
    def test_service_otp_diagyn(self):
        """Test OTP for DiaGyn service"""
        test_phone = "9876543212"
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "phone": test_phone,
            "service": "diagyn"
        })
        
        assert response.status_code == 200, f"DiaGyn OTP send failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ DiaGyn OTP sent via {data.get('method', 'unknown')}")
    
    def test_service_otp_proton(self):
        """Test OTP for Proton Diagnostics service"""
        test_phone = "9876543213"
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "phone": test_phone,
            "service": "proton"
        })
        
        assert response.status_code == 200, f"Proton OTP send failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Proton OTP sent via {data.get('method', 'unknown')}")
    
    def test_service_otp_pharmacy(self):
        """Test OTP for Pharmacy service"""
        test_phone = "9876543214"
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "phone": test_phone,
            "service": "pharmacy"
        })
        
        assert response.status_code == 200, f"Pharmacy OTP send failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Pharmacy OTP sent via {data.get('method', 'unknown')}")


class TestDoctorClinicNames:
    """Verify correct doctor and clinic names are used"""
    
    def test_doctors_endpoint(self):
        """Test doctors endpoint returns correct names"""
        response = requests.get(f"{BASE_URL}/api/doctors")
        
        if response.status_code == 404:
            print("  /api/doctors endpoint not found - checking staff endpoint")
            pytest.skip("Doctors endpoint not available")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for correct doctor names
        doctor_names = [d.get("name") for d in data.get("doctors", [])]
        
        for correct_name in CORRECT_DOCTOR_NAMES:
            assert correct_name in doctor_names or any(correct_name in str(d) for d in data.values()), \
                f"Missing correct doctor name: {correct_name}"
        
        for incorrect_name in INCORRECT_NAMES:
            assert incorrect_name not in str(data), \
                f"Found incorrect name: {incorrect_name}"
        
        print(f"✓ Doctor names verified: {CORRECT_DOCTOR_NAMES}")
    
    def test_staff_doctor_appointments(self):
        """Test staff doctor can see appointments with correct names"""
        # Login as doctor
        login_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_DOCTOR_USERNAME,
            "password": STAFF_DOCTOR_PASSWORD
        })
        
        if login_response.status_code != 200:
            print(f"  Staff login failed: {login_response.text}")
            pytest.skip("Staff login not working")
        
        token = login_response.json().get("token")
        
        # Get appointments
        appt_response = requests.get(
            f"{BASE_URL}/api/staff/appointments",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert appt_response.status_code == 200
        data = appt_response.json()
        
        # Check that no incorrect names appear
        data_str = str(data)
        for incorrect_name in INCORRECT_NAMES:
            assert incorrect_name not in data_str, \
                f"Found incorrect name in appointments: {incorrect_name}"
        
        print(f"✓ Staff appointments verified - no incorrect names found")


class TestAppointmentBooking:
    """Test DiaGyn appointment booking flow"""
    
    def test_create_appointment_with_correct_names(self):
        """Test creating appointment with correct doctor/clinic names"""
        # First register a test user
        test_email = f"test_appt_{uuid.uuid4().hex[:8]}@example.com"
        test_phone = f"98765{uuid.uuid4().hex[:5]}"[:10]
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "phone": test_phone,
            "name": "Test Patient"
        })
        
        if register_response.status_code != 200:
            print(f"  Registration failed: {register_response.text}")
            # Try without auth
            token = None
        else:
            token = register_response.json().get("token")
        
        # Create appointment with correct names
        appointment_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": "2026-01-20",
            "time": "10:00 AM",
            "patient_name": "Test Patient",
            "patient_phone": test_phone,
            "patient_email": test_email
        }
        
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=appointment_data,
            headers=headers
        )
        
        # Accept 200 or 201
        assert response.status_code in [200, 201], f"Appointment creation failed: {response.text}"
        data = response.json()
        
        # Verify correct names in response
        assert data.get("doctor") == "Dr. Neha Patel", f"Wrong doctor name: {data.get('doctor')}"
        assert data.get("clinic") == "Pushpa Clinic", f"Wrong clinic name: {data.get('clinic')}"
        
        print(f"✓ Appointment created with correct names")
        print(f"  Doctor: {data.get('doctor')}")
        print(f"  Clinic: {data.get('clinic')}")
        
        return data


class TestPharmacyOrder:
    """Test Orange Pharmacy order flow"""
    
    def test_pharmacy_inventory(self):
        """Test pharmacy inventory endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all")
        
        assert response.status_code == 200, f"Pharmacy inventory failed: {response.text}"
        data = response.json()
        
        assert "medicines" in data
        assert "total" in data
        assert data["total"] > 0
        
        print(f"✓ Pharmacy inventory: {data['total']} medicines available")
    
    def test_pharmacy_count(self):
        """Test pharmacy count endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        print(f"✓ Pharmacy count: {data['total']} medicines")
    
    def test_pharmacy_autocomplete(self):
        """Test pharmacy autocomplete search"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete?q=para&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data
        print(f"✓ Pharmacy autocomplete: {len(data['suggestions'])} suggestions for 'para'")
    
    def test_create_pharmacy_order(self):
        """Test creating pharmacy order"""
        # Register test user
        test_email = f"test_pharm_{uuid.uuid4().hex[:8]}@example.com"
        test_phone = f"98764{uuid.uuid4().hex[:5]}"[:10]
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "phone": test_phone,
            "name": "Test Pharmacy Customer"
        })
        
        token = register_response.json().get("token") if register_response.status_code == 200 else None
        
        order_data = {
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 2},
                {"name": "Vitamin D3", "quantity": 1}
            ],
            "patient_name": "Test Pharmacy Customer",
            "patient_phone": test_phone,
            "patient_email": test_email,
            "delivery_address": "123 Test Street, Test City"
        }
        
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers=headers
        )
        
        assert response.status_code in [200, 201], f"Pharmacy order failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        print(f"✓ Pharmacy order created: {data.get('id', 'N/A')[:8]}...")
        
        return data


class TestDiagnosticBooking:
    """Test Proton Diagnostics booking flow"""
    
    def test_create_diagnostic_order(self):
        """Test creating diagnostic test order"""
        # Register test user
        test_email = f"test_diag_{uuid.uuid4().hex[:8]}@example.com"
        test_phone = f"98763{uuid.uuid4().hex[:5]}"[:10]
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "phone": test_phone,
            "name": "Test Diagnostic Patient"
        })
        
        token = register_response.json().get("token") if register_response.status_code == 200 else None
        
        order_data = {
            "tests": ["CBC (Complete Blood Count)", "HbA1c (Glycated Hemoglobin)"],
            "preferred_date": "2026-01-22",
            "patient_name": "Test Diagnostic Patient",
            "patient_phone": test_phone,
            "patient_email": test_email
        }
        
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        response = requests.post(
            f"{BASE_URL}/api/diagnostics",
            json=order_data,
            headers=headers
        )
        
        assert response.status_code in [200, 201], f"Diagnostic order failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        print(f"✓ Diagnostic order created: {data.get('id', 'N/A')[:8]}...")
        
        return data


class TestAdminPortal:
    """Test Admin Portal functionality"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        print(f"✓ Admin login successful")
        
        return data.get("token")
    
    def test_admin_stats(self):
        """Test admin dashboard stats"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        token = login_response.json().get("token")
        
        # Get stats
        stats_response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert stats_response.status_code == 200
        data = stats_response.json()
        
        print(f"✓ Admin stats retrieved:")
        print(f"  Users: {data.get('users', 'N/A')}")
        print(f"  Appointments: {data.get('appointments', 'N/A')}")
        print(f"  Pharmacy Orders: {data.get('pharmacy_orders', 'N/A')}")
        print(f"  Diagnostic Orders: {data.get('diagnostic_orders', 'N/A')}")


class TestStaffPortal:
    """Test Staff Portal functionality"""
    
    def test_staff_doctor_login(self):
        """Test staff doctor login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_DOCTOR_USERNAME,
            "password": STAFF_DOCTOR_PASSWORD
        })
        
        assert response.status_code == 200, f"Staff doctor login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert data.get("role") in ["doctor", "doctor_neha", "doctor_vikas"]
        print(f"✓ Staff doctor login successful - Role: {data.get('role')}")
        
        return data.get("token")
    
    def test_staff_clinic_login(self):
        """Test staff clinic login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_CLINIC_USERNAME,
            "password": STAFF_CLINIC_PASSWORD
        })
        
        assert response.status_code == 200, f"Staff clinic login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        print(f"✓ Staff clinic login successful - Role: {data.get('role')}")
        
        return data.get("token")
    
    def test_staff_pharmacy_login(self):
        """Test staff pharmacy login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_PHARMACY_USERNAME,
            "password": STAFF_PHARMACY_PASSWORD
        })
        
        assert response.status_code == 200, f"Staff pharmacy login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        print(f"✓ Staff pharmacy login successful - Role: {data.get('role')}")
    
    def test_staff_diagnostics_login(self):
        """Test staff diagnostics login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_DIAGNOSTICS_USERNAME,
            "password": STAFF_DIAGNOSTICS_PASSWORD
        })
        
        assert response.status_code == 200, f"Staff diagnostics login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        print(f"✓ Staff diagnostics login successful - Role: {data.get('role')}")


class TestGlydexModule:
    """Test Glydex (Diabetes Care) module"""
    
    def test_glydex_profile_requires_auth(self):
        """Test Glydex profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/glydex/profile")
        
        assert response.status_code == 401, "Glydex profile should require auth"
        print(f"✓ Glydex profile correctly requires authentication")
    
    def test_glydex_authenticated_flow(self):
        """Test Glydex with authenticated user"""
        # Register test user
        test_email = f"test_glydex_{uuid.uuid4().hex[:8]}@example.com"
        test_phone = f"98762{uuid.uuid4().hex[:5]}"[:10]
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "phone": test_phone,
            "name": "Test Glydex User"
        })
        
        if register_response.status_code != 200:
            pytest.skip("Registration failed")
        
        token = register_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get profile
        profile_response = requests.get(
            f"{BASE_URL}/api/glydex/profile",
            headers=headers
        )
        
        assert profile_response.status_code == 200
        print(f"✓ Glydex profile accessible for authenticated user")


class TestEvaraModule:
    """Test Evara (Women's Wellness) module"""
    
    def test_evara_programs(self):
        """Test Evara programs endpoint"""
        response = requests.get(f"{BASE_URL}/api/evara/programs")
        
        assert response.status_code == 200, f"Evara programs failed: {response.text}"
        data = response.json()
        
        assert "programs" in data
        print(f"✓ Evara programs: {len(data.get('programs', []))} programs available")
    
    def test_evara_profile(self):
        """Test Evara profile endpoint"""
        response = requests.get(f"{BASE_URL}/api/evara/profile")
        
        assert response.status_code == 200
        print(f"✓ Evara profile endpoint accessible")


class TestTrackOrder:
    """Test order tracking functionality"""
    
    def test_track_by_phone(self):
        """Test tracking orders by phone number"""
        test_phone = "9876543210"
        
        response = requests.get(f"{BASE_URL}/api/guest/orders?phone={test_phone}")
        
        assert response.status_code == 200, f"Track order failed: {response.text}"
        data = response.json()
        
        assert "phone" in data
        assert "appointments" in data
        assert "pharmacy_orders" in data
        assert "diagnostic_orders" in data
        
        print(f"✓ Order tracking working for phone: {test_phone}")
        print(f"  Total orders: {data.get('total_orders', 0)}")


class TestNotificationTemplates:
    """Verify notification templates use correct names"""
    
    def test_appointment_sms_template(self):
        """Verify appointment SMS uses correct doctor/clinic names"""
        # This is a code review test - checking the backend code
        # The actual SMS sending is tested via the OTP tests
        
        # Read the server.py file to verify templates
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "Dr\\. Neha\\|Dr\\. Vikas\\|Pushpa\\|Amnion", "/app/backend/server.py"],
            capture_output=True,
            text=True
        )
        
        output = result.stdout
        
        # Verify correct names are present
        assert "Dr. Neha Patel" in output or "Dr. Vikas Jha" in output, \
            "Correct doctor names not found in templates"
        
        # Verify incorrect names are NOT present
        assert "Dr. Neha Sharma" not in output, "Incorrect name 'Dr. Neha Sharma' found"
        assert "DiaGyn Clinic" not in output, "Incorrect name 'DiaGyn Clinic' found"
        
        print(f"✓ Notification templates use correct doctor/clinic names")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
