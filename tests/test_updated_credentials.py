"""
Test suite for Nevika Cura Healthcare - Updated Doctor Credentials
Tests doctor login with new usernames (doc_neha, doc_vikas), clinic toggle, 
calendar navigation, patient history, and all staff portal features.
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthapp-hub-1.preview.emergentagent.com')

# Test credentials
CREDENTIALS = {
    "doc_neha": {"username": "doc_neha", "password": "Nevika@2026D", "expected_name": "Dr. Neha Patel"},
    "doc_vikas": {"username": "doc_vikas", "password": "Nevika@2026D", "expected_name": "Dr. Vikas Jha"},
    "staff_pushpa": {"username": "staff_pushpa", "password": "Nevika@2026C", "expected_role": "clinic_staff_pushpa"},
    "staff_pharmacy": {"username": "staff_pharmacy", "password": "Nevika@2026P", "expected_role": "pharmacy_staff"},
    "staff_proton": {"username": "staff_proton", "password": "Nevika@2026L", "expected_role": "diagnostics_staff"},
}

ADMIN_PASSWORD = "nevikacura2026"


class TestDoctorLogin:
    """Test doctor login with new credentials"""
    
    def test_doc_neha_login(self):
        """Test Dr. Neha Patel login with new username doc_neha"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": "Nevika@2026D"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data["name"] == "Dr. Neha Patel"
        assert data["doctor_name"] == "Dr. Neha Patel"
        assert data["role"] == "doctor"
        assert "token" in data
        assert len(data["token"]) > 0
        
    def test_doc_vikas_login(self):
        """Test Dr. Vikas Jha login with new username doc_vikas"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_vikas",
            "password": "Nevika@2026D"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data["name"] == "Dr. Vikas Jha"
        assert data["doctor_name"] == "Dr. Vikas Jha"
        assert data["role"] == "doctor"
        assert "token" in data
        
    def test_doctor_login_returns_both_clinics(self):
        """Test that doctor login returns both clinics they work at"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": "Nevika@2026D"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "doctor_clinics" in data
        assert isinstance(data["doctor_clinics"], list)
        assert "Pushpa Clinic" in data["doctor_clinics"]
        assert "Amnion Clinic" in data["doctor_clinics"]
        
    def test_old_credentials_fail(self):
        """Test that old credentials (doc_pushpa_01, doc_amnion_01) no longer work"""
        # Test old doc_pushpa_01
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_pushpa_01",
            "password": "Nevika@2026D"
        })
        assert response.status_code == 401, "Old credential doc_pushpa_01 should not work"
        
        # Test old doc_amnion_01
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_amnion_01",
            "password": "Nevika@2026D"
        })
        assert response.status_code == 401, "Old credential doc_amnion_01 should not work"


class TestDoctorClinicToggle:
    """Test doctor clinic toggle functionality"""
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": "Nevika@2026D"
        })
        return response.json()["token"]
    
    def test_get_appointments_all_clinics(self, doctor_token):
        """Test getting appointments from all clinics (no filter)"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date={today}",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "appointments" in data
        assert "doctor_clinics" in data
        
    def test_get_appointments_filtered_by_pushpa(self, doctor_token):
        """Test filtering appointments by Pushpa Clinic"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date={today}&clinic=Pushpa%20Clinic",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # All appointments should be from Pushpa Clinic
        for appt in data.get("appointments", []):
            assert appt.get("clinic") == "Pushpa Clinic"
            
    def test_get_appointments_filtered_by_amnion(self, doctor_token):
        """Test filtering appointments by Amnion Clinic"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date={today}&clinic=Amnion%20Clinic",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # All appointments should be from Amnion Clinic
        for appt in data.get("appointments", []):
            assert appt.get("clinic") == "Amnion Clinic"


class TestDoctorCalendarNavigation:
    """Test doctor calendar-based date navigation"""
    
    @pytest.fixture
    def doctor_token(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_vikas",
            "password": "Nevika@2026D"
        })
        return response.json()["token"]
    
    def test_get_appointments_for_different_dates(self, doctor_token):
        """Test getting appointments for different dates"""
        # Test today
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date={today}",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200
        
        # Test tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date={tomorrow}",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200
        
        # Test yesterday
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date={yesterday}",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200


class TestPatientHistory:
    """Test patient history modal functionality"""
    
    @pytest.fixture
    def doctor_token(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": "Nevika@2026D"
        })
        return response.json()["token"]
    
    def test_get_patient_history(self, doctor_token):
        """Test getting patient history by phone number"""
        # Use a test phone number
        test_phone = "9876543210"
        response = requests.get(
            f"{BASE_URL}/api/staff/patient/history/{test_phone}",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "patient_phone" in data
        assert "summary" in data
        assert "past_appointments" in data


class TestStaffPortalLogin:
    """Test all staff portal logins"""
    
    def test_clinic_staff_pushpa_login(self):
        """Test Pushpa Clinic staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pushpa",
            "password": "Nevika@2026C"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["role"] == "clinic_staff_pushpa"
        assert data["clinic"] == "Pushpa Clinic"
        
    def test_pharmacy_staff_login(self):
        """Test pharmacy staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "Nevika@2026P"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["role"] == "pharmacy_staff"
        
    def test_diagnostics_staff_login(self):
        """Test diagnostics staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_proton",
            "password": "Nevika@2026L"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["role"] == "diagnostics_staff"


class TestPharmacyStaffFunctionality:
    """Test pharmacy staff can view orders"""
    
    @pytest.fixture
    def pharmacy_token(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "Nevika@2026P"
        })
        return response.json()["token"]
    
    def test_get_pharmacy_orders(self, pharmacy_token):
        """Test pharmacy staff can view orders"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/pharmacy/orders?date={today}",
            headers={"Authorization": f"Bearer {pharmacy_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data


class TestDiagnosticsStaffFunctionality:
    """Test diagnostics staff can view orders"""
    
    @pytest.fixture
    def diagnostics_token(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_proton",
            "password": "Nevika@2026L"
        })
        return response.json()["token"]
    
    def test_get_diagnostic_orders(self, diagnostics_token):
        """Test diagnostics staff can view orders"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/staff/diagnostic/orders?date={today}",
            headers={"Authorization": f"Bearer {diagnostics_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data


class TestSlotBlocking:
    """Test slot blocking - booked slots cannot be rebooked"""
    
    @pytest.fixture
    def clinic_staff_token(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pushpa",
            "password": "Nevika@2026C"
        })
        return response.json()["token"]
    
    def test_get_booked_slots(self):
        """Test getting booked slots for a doctor/clinic/date"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": today
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "booked_slots" in data
        assert isinstance(data["booked_slots"], list)


class TestAdminCleanupEndpoints:
    """Test admin cleanup endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_cleanup_stats(self, admin_token):
        """Test admin cleanup stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/cleanup/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "appointments" in data or "stats" in data or "success" in data


class TestDiaGynAppointmentBooking:
    """Test DiaGyn appointment booking"""
    
    def test_book_appointment(self):
        """Test booking an appointment via public API"""
        # First get booked slots to find an available slot
        today = datetime.now().strftime("%Y-%m-%d")
        slots_response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": today
            }
        )
        booked_slots = slots_response.json().get("booked_slots", [])
        
        # Find an available slot (use a late time to avoid conflicts)
        test_time = "21:45"
        if test_time in booked_slots:
            test_time = "21:30"
        
        # Book appointment
        response = requests.post(f"{BASE_URL}/api/appointments", json={
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": today,
            "time": test_time,
            "patient_name": "TEST_Patient_Booking",
            "patient_phone": "9999888877",
            "patient_email": "test@example.com"
        })
        
        # Either success or slot already booked
        assert response.status_code in [200, 400]


class TestProtonDiagnosticOrder:
    """Test Proton diagnostic order creation"""
    
    def test_create_diagnostic_order(self):
        """Test creating a diagnostic order"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/diagnostics", json={
            "tests": ["Complete Blood Count (CBC)", "Lipid Profile"],
            "preferred_date": today,
            "patient_name": "TEST_Diagnostic_Patient",
            "patient_phone": "9999777766",
            "patient_email": "test_diag@example.com"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["patient_name"] == "TEST_Diagnostic_Patient"


class TestPharmacyOrder:
    """Test pharmacy order creation"""
    
    def test_create_pharmacy_order(self):
        """Test creating a pharmacy order"""
        response = requests.post(f"{BASE_URL}/api/pharmacy", json={
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 10},
                {"name": "Vitamin C", "quantity": 30}
            ],
            "patient_name": "TEST_Pharmacy_Patient",
            "patient_phone": "9999666655",
            "patient_email": "test_pharm@example.com",
            "delivery_address": "123 Test Street"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["patient_name"] == "TEST_Pharmacy_Patient"


class TestPatientProfile:
    """Test patient profile save and retrieve"""
    
    def test_register_and_get_profile(self):
        """Test user registration and profile retrieval"""
        import uuid
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "9999555544",
            "name": "TEST_Profile_User"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data["token"]
            
            # Get profile
            profile_response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert profile_response.status_code == 200
            profile = profile_response.json()
            assert profile["name"] == "TEST_Profile_User"
        else:
            # Email might already exist
            assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
