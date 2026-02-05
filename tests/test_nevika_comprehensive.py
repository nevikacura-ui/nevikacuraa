"""
Comprehensive Test Suite for Nevika Cura Healthcare Application
Tests: DiaGyn, Proton Diagnostics, Orange Pharmacy, Staff Portal, Admin Portal
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nevika-dashboard.preview.emergentagent.com')

# Test credentials
CREDENTIALS = {
    "doctor_neha": {"username": "doc_pushpa_01", "password": "Nevika@2026D"},
    "doctor_vikas": {"username": "doc_amnion_01", "password": "Nevika@2026D"},
    "staff_pushpa": {"username": "staff_pushpa", "password": "Nevika@2026C"},
    "staff_amnion": {"username": "staff_amnion", "password": "Nevika@2026C"},
    "staff_pharmacy": {"username": "staff_pharmacy", "password": "Nevika@2026P"},
    "staff_proton": {"username": "staff_proton", "password": "Nevika@2026L"},
    "admin": {"password": "nevikacura2026"}
}

# Today's date (Friday Jan 10, 2026)
TODAY = "2026-01-10"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """API Health Check Tests"""
    
    def test_backend_health(self, api_client):
        """Test backend health endpoint"""
        response = api_client.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Backend health check passed")


class TestStaffLogin:
    """Staff Portal Login Tests"""
    
    def test_doctor_neha_login(self, api_client):
        """Test Dr. Neha Patel login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["doctor_neha"])
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["name"] is not None
        assert "doctor_clinics" in data
        print(f"✓ Dr. Neha Patel login successful - Clinics: {data.get('doctor_clinics', [])}")
        return data["token"]
    
    def test_doctor_vikas_login(self, api_client):
        """Test Dr. Vikas Jha login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["doctor_vikas"])
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "doctor_clinics" in data
        print(f"✓ Dr. Vikas Jha login successful - Clinics: {data.get('doctor_clinics', [])}")
        return data["token"]
    
    def test_pushpa_clinic_staff_login(self, api_client):
        """Test Pushpa Clinic Staff login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["staff_pushpa"])
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("clinic") == "Pushpa Clinic"
        print(f"✓ Pushpa Clinic Staff login successful - Clinic: {data.get('clinic')}")
        return data["token"]
    
    def test_amnion_clinic_staff_login(self, api_client):
        """Test Amnion Clinic Staff login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["staff_amnion"])
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("clinic") == "Amnion Clinic"
        print(f"✓ Amnion Clinic Staff login successful - Clinic: {data.get('clinic')}")
        return data["token"]
    
    def test_pharmacy_staff_login(self, api_client):
        """Test Pharmacy Staff login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["staff_pharmacy"])
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "pharmacy_staff"
        print(f"✓ Pharmacy Staff login successful - Role: {data.get('role')}")
        return data["token"]
    
    def test_diagnostics_staff_login(self, api_client):
        """Test Diagnostics Staff login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["staff_proton"])
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "diagnostics_staff"
        print(f"✓ Diagnostics Staff login successful - Role: {data.get('role')}")
        return data["token"]


class TestAdminPortal:
    """Admin Portal Tests"""
    
    def test_admin_login(self, api_client):
        """Test Admin login"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json=CREDENTIALS["admin"])
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Admin login successful")
        return data["token"]
    
    def test_admin_stats(self, api_client):
        """Test Admin stats endpoint"""
        # First login
        login_response = api_client.post(f"{BASE_URL}/api/admin/login", json=CREDENTIALS["admin"])
        token = login_response.json()["token"]
        
        # Get stats
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_medicines" in data
        assert "total_users" in data
        assert "total_appointments" in data
        print(f"✓ Admin stats: {data.get('total_medicines')} medicines, {data.get('total_appointments')} appointments")
        return data
    
    def test_admin_cleanup_stats(self, api_client):
        """Test Admin cleanup stats endpoint"""
        login_response = api_client.post(f"{BASE_URL}/api/admin/login", json=CREDENTIALS["admin"])
        token = login_response.json()["token"]
        
        response = api_client.get(
            f"{BASE_URL}/api/admin/cleanup/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Admin cleanup stats retrieved: {data}")
        return data


class TestDiaGynAppointments:
    """DiaGyn Appointment Booking Tests"""
    
    def test_get_booked_slots(self, api_client):
        """Test getting booked slots for a doctor"""
        response = api_client.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TODAY
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        print(f"✓ Booked slots for Dr. Neha Patel at Pushpa Clinic on {TODAY}: {data['booked_slots']}")
        return data["booked_slots"]
    
    def test_book_appointment_with_dr_neha(self, api_client):
        """Test booking appointment with Dr. Neha Patel at Pushpa Clinic"""
        # First get booked slots
        slots_response = api_client.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TODAY
            }
        )
        booked_slots = slots_response.json().get("booked_slots", [])
        
        # Find an available slot (Dr. Neha at Pushpa: Mon-Sat 11:00-14:00, Tue/Thu/Sat 18:00-22:00)
        # Today is Friday, so 11:00-14:00 should be available
        available_slots = ["11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45"]
        test_slot = None
        for slot in available_slots:
            if slot not in booked_slots:
                test_slot = slot
                break
        
        if not test_slot:
            pytest.skip("No available slots for testing")
        
        # Book appointment
        booking_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": test_slot,
            "patient_name": "TEST_Patient_Comprehensive",
            "patient_phone": "9876543210",
            "patient_email": "test@example.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/appointments", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data["doctor"] == "Dr. Neha Patel"
        assert data["clinic"] == "Pushpa Clinic"
        assert data["time"] == test_slot
        print(f"✓ Appointment booked with Dr. Neha Patel at {test_slot}")
        return data
    
    def test_slot_blocking_works(self, api_client):
        """Test that booked slot cannot be rebooked"""
        # First book a slot
        test_slot = "13:45"  # Use a specific slot for this test
        
        # Check if slot is available
        slots_response = api_client.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TODAY
            }
        )
        booked_slots = slots_response.json().get("booked_slots", [])
        
        if test_slot in booked_slots:
            # Slot already booked, try to rebook it
            booking_data = {
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TODAY,
                "time": test_slot,
                "patient_name": "TEST_Duplicate_Booking",
                "patient_phone": "9876543211"
            }
            
            response = api_client.post(f"{BASE_URL}/api/appointments", json=booking_data)
            assert response.status_code == 400
            assert "already booked" in response.json().get("detail", "").lower()
            print(f"✓ Slot blocking works - Cannot rebook slot {test_slot}")
        else:
            # Book the slot first
            booking_data = {
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TODAY,
                "time": test_slot,
                "patient_name": "TEST_Slot_Blocking",
                "patient_phone": "9876543212"
            }
            
            response = api_client.post(f"{BASE_URL}/api/appointments", json=booking_data)
            if response.status_code == 200:
                # Try to rebook the same slot
                response2 = api_client.post(f"{BASE_URL}/api/appointments", json=booking_data)
                assert response2.status_code == 400
                print(f"✓ Slot blocking works - Cannot rebook slot {test_slot}")
            else:
                print(f"✓ Slot {test_slot} was already blocked")


class TestProtonDiagnostics:
    """Proton Diagnostics Order Tests"""
    
    def test_create_diagnostic_order(self, api_client):
        """Test creating a diagnostic order"""
        order_data = {
            "tests": ["CBC (Complete Blood Count)", "Lipid Profile", "TSH"],
            "prescription_url": None,
            "preferred_date": TODAY,
            "patient_name": "TEST_Diagnostic_Patient",
            "patient_phone": "9876543213",
            "patient_email": "diagnostic@test.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert len(data["tests"]) == 3
        assert data["patient_name"] == "TEST_Diagnostic_Patient"
        print(f"✓ Diagnostic order created with {len(data['tests'])} tests")
        return data


class TestOrangePharmacy:
    """Orange Pharmacy Order Tests"""
    
    def test_get_pharmacy_inventory(self, api_client):
        """Test getting pharmacy inventory"""
        response = api_client.get(f"{BASE_URL}/api/pharmacy/all", params={"page": 1, "per_page": 10})
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        print(f"✓ Pharmacy inventory: {data['total']} medicines available")
        return data
    
    def test_create_pharmacy_order(self, api_client):
        """Test creating a pharmacy order"""
        order_data = {
            "medicines": [
                {"name": "PARACETAMOL 500MG", "quantity": 2},
                {"name": "VITAMIN D3", "quantity": 1}
            ],
            "prescription_url": None,
            "patient_name": "TEST_Pharmacy_Patient",
            "patient_phone": "9876543214",
            "patient_email": "pharmacy@test.com",
            "delivery_address": "123 Test Street, Test City"
        }
        
        response = api_client.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert len(data["medicines"]) == 2
        assert data["patient_name"] == "TEST_Pharmacy_Patient"
        print(f"✓ Pharmacy order created with {len(data['medicines'])} medicines")
        return data


class TestStaffPortalFeatures:
    """Staff Portal Feature Tests"""
    
    def test_doctor_view_appointments(self, api_client):
        """Test doctor viewing appointments"""
        # Login as Dr. Neha Patel
        login_response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["doctor_neha"])
        token = login_response.json()["token"]
        
        # Get appointments
        response = api_client.get(
            f"{BASE_URL}/api/staff/doctor/appointments",
            params={"date": TODAY},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        print(f"✓ Dr. Neha Patel can view {len(data['appointments'])} appointments for {TODAY}")
        return data
    
    def test_doctor_clinic_toggle(self, api_client):
        """Test doctor clinic toggle feature"""
        # Login as Dr. Neha Patel
        login_response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["doctor_neha"])
        token = login_response.json()["token"]
        doctor_clinics = login_response.json().get("doctor_clinics", [])
        
        assert len(doctor_clinics) >= 2, "Doctor should have access to multiple clinics"
        
        # Get appointments filtered by Pushpa Clinic
        response1 = api_client.get(
            f"{BASE_URL}/api/staff/doctor/appointments",
            params={"date": TODAY, "clinic": "Pushpa Clinic"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        
        # Get appointments filtered by Amnion Clinic
        response2 = api_client.get(
            f"{BASE_URL}/api/staff/doctor/appointments",
            params={"date": TODAY, "clinic": "Amnion Clinic"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        
        print(f"✓ Doctor clinic toggle works - Pushpa: {len(response1.json()['appointments'])}, Amnion: {len(response2.json()['appointments'])}")
    
    def test_clinic_staff_walk_in_booking(self, api_client):
        """Test clinic staff walk-in booking"""
        # Login as Pushpa Clinic Staff
        login_response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["staff_pushpa"])
        token = login_response.json()["token"]
        
        # Get available slots first
        slots_response = api_client.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TODAY
            }
        )
        booked_slots = slots_response.json().get("booked_slots", [])
        
        # Find available slot
        available_slots = ["11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30"]
        test_slot = None
        for slot in available_slots:
            if slot not in booked_slots:
                test_slot = slot
                break
        
        if not test_slot:
            pytest.skip("No available slots for walk-in booking test")
        
        # Book walk-in appointment
        walk_in_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": test_slot,
            "patient_name": "TEST_WalkIn_Patient",
            "patient_phone": "9876543215"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walk_in_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("booking_type") == "walk_in"
        print(f"✓ Walk-in appointment booked at {test_slot}")
        return data
    
    def test_pharmacy_staff_view_orders(self, api_client):
        """Test pharmacy staff viewing orders"""
        # Login as Pharmacy Staff
        login_response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["staff_pharmacy"])
        token = login_response.json()["token"]
        
        # Get pharmacy orders
        response = api_client.get(
            f"{BASE_URL}/api/staff/pharmacy/orders",
            params={"date": TODAY},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✓ Pharmacy staff can view {len(data['orders'])} orders")
        return data
    
    def test_diagnostics_staff_view_orders(self, api_client):
        """Test diagnostics staff viewing orders"""
        # Login as Diagnostics Staff
        login_response = api_client.post(f"{BASE_URL}/api/staff/login", json=CREDENTIALS["staff_proton"])
        token = login_response.json()["token"]
        
        # Get diagnostic orders
        response = api_client.get(
            f"{BASE_URL}/api/staff/diagnostic/orders",
            params={"date": TODAY},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✓ Diagnostics staff can view {len(data['orders'])} orders")
        return data


class TestPatientProfile:
    """Patient Profile Tests"""
    
    def test_save_patient_profile(self, api_client):
        """Test saving patient profile"""
        profile_data = {
            "phone": "9876543216",
            "name": "TEST_Profile_Patient",
            "email": "profile@test.com",
            "date_of_birth": "1990-01-15",
            "gender": "Female",
            "blood_group": "O+",
            "address": "456 Profile Street"
        }
        
        response = api_client.post(f"{BASE_URL}/api/patients/profile", json=profile_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("phone") == "9876543216"
        print(f"✓ Patient profile saved for {profile_data['name']}")
        return data
    
    def test_get_patient_profile(self, api_client):
        """Test retrieving patient profile"""
        response = api_client.get(f"{BASE_URL}/api/patients/profile", params={"phone": "9876543216"})
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Patient profile retrieved: {data.get('name', 'N/A')}")
        return data


class TestTrackOrder:
    """Track Order Tests"""
    
    def test_track_orders_by_phone(self, api_client):
        """Test tracking orders by phone number"""
        response = api_client.get(f"{BASE_URL}/api/guest/orders", params={"phone": "9876543214"})
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        assert "pharmacy_orders" in data
        assert "diagnostic_orders" in data
        print(f"✓ Orders tracked: {data.get('total_orders', 0)} total orders found")
        return data


class TestOTPVerification:
    """OTP Verification Tests (Mock OTP)"""
    
    def test_send_otp(self, api_client):
        """Test sending OTP"""
        response = api_client.post(f"{BASE_URL}/api/otp/send", json={
            "phone": "9876543217",
            "service": "diagyn"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "mock_otp" in data  # Mock OTP for testing
        print(f"✓ OTP sent successfully - Mock OTP: {data['mock_otp']}")
        return data["mock_otp"]
    
    def test_verify_otp(self, api_client):
        """Test verifying OTP"""
        # First send OTP
        send_response = api_client.post(f"{BASE_URL}/api/otp/send", json={
            "phone": "9876543218",
            "service": "diagyn"
        })
        mock_otp = send_response.json()["mock_otp"]
        
        # Verify OTP
        response = api_client.post(f"{BASE_URL}/api/otp/verify", json={
            "phone": "9876543218",
            "otp": mock_otp,
            "service": "diagyn"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "verification_token" in data
        print(f"✓ OTP verified successfully")
        return data


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_appointments(self, api_client):
        """Cleanup TEST_ prefixed appointments"""
        # This is informational - actual cleanup would require admin access
        print("ℹ Test data with TEST_ prefix created during testing")
        print("ℹ Use admin cleanup endpoints to remove test data if needed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
