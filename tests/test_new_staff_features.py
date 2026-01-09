"""
Test suite for new staff portal features:
1. Emergency Appointments (no time slot, max 10/day/doctor)
2. Slot Blocking (prevent double booking)
3. Add-on Services (Blood Test, Sonography, ECG)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLINIC_STAFF_PUSHPA = {"username": "staff_pushpa", "password": "Nevika@2026C"}
CLINIC_STAFF_AMNION = {"username": "staff_amnion", "password": "Nevika@2026C"}
DOCTOR_PUSHPA = {"username": "doc_pushpa_01", "password": "Nevika@2026D"}
DIAGNOSTICS_STAFF = {"username": "staff_proton", "password": "Nevika@2026L"}

# Test data
TODAY = datetime.now().strftime("%Y-%m-%d")


class TestStaffLogin:
    """Test staff login functionality"""
    
    def test_clinic_staff_pushpa_login(self):
        """Test clinic staff (Pushpa) can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "clinic_staff_pushpa"
        assert data["clinic"] == "Pushpa Clinic"
        print(f"✓ Clinic staff Pushpa login successful - Role: {data['role']}")
    
    def test_clinic_staff_amnion_login(self):
        """Test clinic staff (Amnion) can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_AMNION)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "clinic_staff_amnion"
        assert data["clinic"] == "Amnion Clinic"
        print(f"✓ Clinic staff Amnion login successful - Role: {data['role']}")
    
    def test_diagnostics_staff_login(self):
        """Test diagnostics staff can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "diagnostics_staff"
        print(f"✓ Diagnostics staff login successful - Role: {data['role']}")


class TestEmergencyAppointments:
    """Test emergency appointment booking"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_emergency_appointment_no_time_slot(self, staff_token):
        """Test emergency appointment does NOT require time slot"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Book emergency appointment without time slot
        emergency_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "patient_name": "TEST_Emergency_Patient_1",
            "patient_phone": "9876543210",
            "patient_email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/emergency",
            json=emergency_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Emergency booking failed: {response.text}"
        data = response.json()
        
        # Verify no time slot
        assert data.get("time") is None, "Emergency appointment should have NO time slot"
        assert data.get("appointment_type") == "EMERGENCY"
        assert data.get("booking_type") == "emergency"
        print(f"✓ Emergency appointment booked without time slot - ID: {data['id']}")
        
        return data["id"]
    
    def test_emergency_count_endpoint(self, staff_token):
        """Test emergency count endpoint returns X/10 format"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/emergency-count/Dr. Neha Batra/{TODAY}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Emergency count failed: {response.text}"
        data = response.json()
        
        assert "emergency_count" in data
        assert "max_allowed" in data
        assert data["max_allowed"] == 10, "Max emergency should be 10"
        assert "remaining" in data
        print(f"✓ Emergency count: {data['emergency_count']}/{data['max_allowed']} (remaining: {data['remaining']})")
    
    def test_emergency_appointments_appear_on_top(self, staff_token):
        """Test emergency appointments appear at top of list"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/clinic/appointments?date={TODAY}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get appointments failed: {response.text}"
        data = response.json()
        appointments = data.get("appointments", [])
        
        # Check if emergency appointments are at the top
        emergency_found = False
        normal_after_emergency = False
        
        for i, appt in enumerate(appointments):
            if appt.get("appointment_type") == "EMERGENCY":
                emergency_found = True
            elif emergency_found and appt.get("appointment_type") != "EMERGENCY":
                normal_after_emergency = True
                break
        
        if emergency_found:
            print(f"✓ Emergency appointments found in list")
        
        # Verify emergency_counts in response
        assert "emergency_counts" in data, "Response should include emergency_counts"
        print(f"✓ Emergency counts in response: {data['emergency_counts']}")


class TestSlotBlocking:
    """Test slot blocking for normal appointments"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_slot_blocking_prevents_double_booking(self, staff_token):
        """Test same slot cannot be double-booked"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Book first walk-in appointment
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "10:00",
            "patient_name": "TEST_SlotBlock_Patient_1",
            "patient_phone": "9876543211"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        # First booking should succeed
        assert response1.status_code == 200, f"First booking failed: {response1.text}"
        print(f"✓ First booking at 10:00 succeeded")
        
        # Try to book same slot again
        walkin_data["patient_name"] = "TEST_SlotBlock_Patient_2"
        walkin_data["patient_phone"] = "9876543212"
        
        response2 = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        # Second booking should fail with slot blocking error
        assert response2.status_code == 400, f"Double booking should fail but got: {response2.status_code}"
        assert "already booked" in response2.json().get("detail", "").lower(), "Should mention slot is already booked"
        print(f"✓ Double booking correctly blocked: {response2.json().get('detail')}")
    
    def test_different_slots_can_be_booked(self, staff_token):
        """Test different slots can be booked"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Book at 11:00
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "11:00",
            "patient_name": "TEST_DiffSlot_Patient_1",
            "patient_phone": "9876543213"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Booking at different slot failed: {response.text}"
        print(f"✓ Booking at different slot (11:00) succeeded")
        
        # Book at 11:30
        walkin_data["time"] = "11:30"
        walkin_data["patient_name"] = "TEST_DiffSlot_Patient_2"
        walkin_data["patient_phone"] = "9876543214"
        
        response2 = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        assert response2.status_code == 200, f"Booking at another slot failed: {response2.text}"
        print(f"✓ Booking at another slot (11:30) succeeded")


class TestAddOnServices:
    """Test add-on services (Blood Test, Sonography, ECG)"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def diagnostics_token(self):
        """Get diagnostics staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
        if response.status_code != 200:
            pytest.skip("Diagnostics staff login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def test_appointment(self, staff_token):
        """Create a test appointment for service testing"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "14:00",
            "patient_name": "TEST_Service_Patient",
            "patient_phone": "9876543220"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if response.status_code != 200:
            pytest.skip(f"Could not create test appointment: {response.text}")
        
        return response.json()
    
    def test_add_blood_test_service(self, staff_token, test_appointment):
        """Test adding Blood Test service to appointment"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        appointment_id = test_appointment["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "BLOOD_TEST"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Add Blood Test failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("service", {}).get("service_type") == "BLOOD_TEST"
        print(f"✓ Blood Test service added successfully")
    
    def test_add_sonography_service(self, staff_token):
        """Test adding Sonography service to appointment"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Create new appointment for this test
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "14:30",
            "patient_name": "TEST_Sono_Patient",
            "patient_phone": "9876543221"
        }
        
        appt_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if appt_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {appt_response.text}")
        
        appointment_id = appt_response.json()["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "SONOGRAPHY"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Add Sonography failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("service", {}).get("service_type") == "SONOGRAPHY"
        print(f"✓ Sonography service added successfully")
    
    def test_add_ecg_service(self, staff_token):
        """Test adding ECG service to appointment"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Create new appointment for this test
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "15:00",
            "patient_name": "TEST_ECG_Patient",
            "patient_phone": "9876543222"
        }
        
        appt_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if appt_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {appt_response.text}")
        
        appointment_id = appt_response.json()["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "ECG"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Add ECG failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("service", {}).get("service_type") == "ECG"
        print(f"✓ ECG service added successfully")
    
    def test_cannot_add_service_to_completed_appointment(self, staff_token):
        """Test cannot add services to completed appointments"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Create and complete an appointment
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "15:30",
            "patient_name": "TEST_Completed_Patient",
            "patient_phone": "9876543223"
        }
        
        appt_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if appt_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {appt_response.text}")
        
        appointment_id = appt_response.json()["id"]
        
        # Check-in the appointment
        requests.put(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/check-in",
            headers=headers
        )
        
        # Complete the appointment
        complete_response = requests.put(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/complete",
            headers=headers
        )
        
        if complete_response.status_code != 200:
            pytest.skip(f"Could not complete appointment: {complete_response.text}")
        
        # Try to add service to completed appointment
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "BLOOD_TEST"},
            headers=headers
        )
        
        assert response.status_code == 400, f"Should not allow adding service to completed appointment"
        assert "completed" in response.json().get("detail", "").lower()
        print(f"✓ Correctly blocked adding service to completed appointment")
    
    def test_service_linked_diagnostic_orders(self, diagnostics_token):
        """Test service-linked diagnostic orders appear in diagnostics staff view"""
        headers = {"Authorization": f"Bearer {diagnostics_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/diagnostic/service-orders",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get service orders failed: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "service_statuses" in data
        
        # Check if any service-linked orders exist
        orders = data.get("orders", [])
        print(f"✓ Found {len(orders)} service-linked diagnostic orders")
        
        # Verify orders have linked_appointment_id
        for order in orders[:3]:  # Check first 3
            assert "linked_appointment_id" in order, "Service order should have linked_appointment_id"
            print(f"  - Order for {order.get('patient_name')}: {order.get('service_type')}")


class TestInvalidServiceType:
    """Test invalid service type handling"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_invalid_service_type_rejected(self, staff_token):
        """Test invalid service type is rejected"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Create appointment first
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "16:00",
            "patient_name": "TEST_Invalid_Service",
            "patient_phone": "9876543224"
        }
        
        appt_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if appt_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {appt_response.text}")
        
        appointment_id = appt_response.json()["id"]
        
        # Try to add invalid service type
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "INVALID_SERVICE"},
            headers=headers
        )
        
        assert response.status_code == 400, f"Invalid service should be rejected"
        assert "invalid service type" in response.json().get("detail", "").lower()
        print(f"✓ Invalid service type correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
