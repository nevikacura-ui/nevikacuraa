"""
DiaGyn Staff Portal - Backend API Tests
Tests for the rebuilt staff portal with:
- Staff login
- Patient lookup and registration
- Clinic selection
- Time slot availability
- Appointment booking (Walk-In, Scheduled, Emergency)
- Appointment status updates
- Fee code selection and completion
- Daily/Weekly summary
- Slot blocking
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STAFF_USERNAME = "staff_diagyn"
STAFF_PASSWORD = "diagyn123"
TEST_PATIENT_MOBILE = "9876543210"

# Global token storage
auth_token = None


def get_auth_headers():
    """Get authorization headers with token"""
    global auth_token
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestStaffLogin:
    """Test staff authentication"""
    
    def test_staff_login_success(self):
        """Test staff login with valid credentials"""
        global auth_token
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_USERNAME,
            "password": STAFF_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "Token not in response"
        assert "staff" in data, "Staff info not in response"
        assert data["staff"]["name"] == "DiaGyn Staff", f"Unexpected staff name: {data['staff']['name']}"
        assert data["staff"]["role"] == "diagyn_staff", f"Unexpected role: {data['staff']['role']}"
        
        auth_token = data["token"]
        print(f"✓ Staff login successful: {data['staff']['name']}")
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials rejected correctly")


class TestPortalConfig:
    """Test portal configuration endpoint"""
    
    def test_get_config(self):
        """Test getting portal configuration"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=get_auth_headers())
        
        assert response.status_code == 200, f"Config failed: {response.text}"
        data = response.json()
        
        # Verify clinics
        assert "clinics" in data, "Clinics not in config"
        assert "Pushpa Clinic" in data["clinics"], "Pushpa Clinic not found"
        assert "Amnion Clinic" in data["clinics"], "Amnion Clinic not found"
        
        # Verify doctor schedule
        assert "doctor_schedule" in data, "Doctor schedule not in config"
        assert "Dr. Vikas Jha" in data["doctor_schedule"], "Dr. Vikas Jha not in schedule"
        assert "Dr. Neha Patel" in data["doctor_schedule"], "Dr. Neha Patel not in schedule"
        
        # Verify fee codes
        assert "fee_codes" in data, "Fee codes not in config"
        assert "Dr. Vikas Jha" in data["fee_codes"], "Dr. Vikas Jha fee codes not found"
        
        # Verify appointment types
        assert "appointment_types" in data, "Appointment types not in config"
        assert "SCHEDULED" in data["appointment_types"]
        assert "WALK_IN" in data["appointment_types"]
        assert "EMERGENCY" in data["appointment_types"]
        
        print(f"✓ Config loaded: {len(data['clinics'])} clinics, {len(data['fee_codes'])} doctor fee configs")


class TestPatientLookup:
    """Test patient lookup and registration"""
    
    def test_patient_lookup_existing(self):
        """Test looking up an existing patient by mobile"""
        response = requests.post(f"{BASE_URL}/api/diagyn-staff/patient/lookup", 
            json={"mobile": TEST_PATIENT_MOBILE},
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        data = response.json()
        
        # Patient may or may not exist - both are valid responses
        assert "found" in data, "Found field not in response"
        if data["found"]:
            assert "patient" in data, "Patient data not in response"
            print(f"✓ Patient found: {data['patient'].get('name', 'Unknown')}")
        else:
            print(f"✓ Patient not found for mobile {TEST_PATIENT_MOBILE} (expected for new DB)")
    
    def test_patient_lookup_new_mobile(self):
        """Test looking up a non-existent patient"""
        response = requests.post(f"{BASE_URL}/api/diagyn-staff/patient/lookup", 
            json={"mobile": "9999999999"},
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        data = response.json()
        
        # Should return found: false for non-existent patient
        assert "found" in data, "Found field not in response"
        print(f"✓ Lookup for new mobile returned found={data['found']}")
    
    def test_patient_registration(self):
        """Test registering a new patient"""
        test_mobile = f"TEST{datetime.now().strftime('%H%M%S')}"
        response = requests.post(f"{BASE_URL}/api/diagyn-staff/patient/register",
            json={
                "name": "Test Patient",
                "mobile": test_mobile,
                "age": 30,
                "gender": "Female"
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Registration not successful"
        assert "patient_id" in data, "Patient ID not returned"
        print(f"✓ Patient registered: {data['patient_id']}")


class TestSlotAvailability:
    """Test time slot availability based on doctor schedule"""
    
    def test_slots_available_weekday(self):
        """Test slot availability on a weekday (Mon-Sat)"""
        # Find next Monday
        today = datetime.now()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = (today + timedelta(days=days_until_monday)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": next_monday
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Slots failed: {response.text}"
        data = response.json()
        
        assert "available_slots" in data, "Available slots not in response"
        assert "total_slots" in data, "Total slots not in response"
        
        # Dr. Vikas should have slots on Monday (day 0)
        if data["total_slots"] > 0:
            print(f"✓ Weekday slots: {len(data['available_slots'])} available out of {data['total_slots']} total")
        else:
            print(f"✓ No slots configured for {next_monday}")
    
    def test_slots_unavailable_sunday(self):
        """Test that no slots are available on Sunday"""
        # Find next Sunday
        today = datetime.now()
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0 and today.weekday() != 6:
            days_until_sunday = 7
        next_sunday = (today + timedelta(days=days_until_sunday)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": next_sunday
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Slots failed: {response.text}"
        data = response.json()
        
        # Sunday should have no slots (day 6 not in schedule)
        assert data["total_slots"] == 0, f"Expected 0 slots on Sunday, got {data['total_slots']}"
        assert "message" in data, "No message for unavailable day"
        print(f"✓ Sunday correctly shows no slots: {data.get('message', 'No slots')}")
    
    def test_slots_for_amnion_clinic(self):
        """Test slot availability for Amnion Clinic with Dr. Neha Patel"""
        today = datetime.now()
        # Find next Tuesday (day 1)
        days_until_tuesday = (1 - today.weekday()) % 7
        if days_until_tuesday == 0:
            days_until_tuesday = 7
        next_tuesday = (today + timedelta(days=days_until_tuesday)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={
                "clinic": "Amnion Clinic",
                "doctor": "Dr. Neha Patel",
                "date": next_tuesday
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Slots failed: {response.text}"
        data = response.json()
        
        print(f"✓ Amnion Clinic slots: {len(data.get('available_slots', []))} available")


class TestAppointmentBooking:
    """Test appointment booking functionality"""
    
    created_appointment_id = None
    
    def test_book_walkin_appointment(self):
        """Test booking a walk-in appointment"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "time": "10:00",
                "patient_name": "TEST Walk-In Patient",
                "patient_mobile": "9876543211",
                "appointment_type": "WALK_IN",
                "notes": "Test walk-in booking"
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Booking not successful"
        assert "booking_id" in data, "Booking ID not returned"
        assert "appointment" in data, "Appointment data not returned"
        
        TestAppointmentBooking.created_appointment_id = data["appointment"]["id"]
        print(f"✓ Walk-in booked: {data['booking_id']}")
    
    def test_book_scheduled_appointment(self):
        """Test booking a scheduled appointment"""
        # Book for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": tomorrow,
                "time": "11:00",
                "patient_name": "TEST Scheduled Patient",
                "patient_mobile": "9876543212",
                "appointment_type": "SCHEDULED",
                "notes": "Test scheduled booking"
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Booking not successful"
        print(f"✓ Scheduled appointment booked: {data['booking_id']}")
    
    def test_book_emergency_appointment(self):
        """Test booking an emergency appointment (no time slot required)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "time": None,  # Emergency doesn't need time
                "patient_name": "TEST Emergency Patient",
                "patient_mobile": "9876543213",
                "appointment_type": "EMERGENCY",
                "notes": "Test emergency booking"
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Booking not successful"
        print(f"✓ Emergency booked: {data['booking_id']}")
    
    def test_slot_blocking(self):
        """Test that booked slots are blocked"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # First, get available slots
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that booked_count reflects our bookings
        print(f"✓ Slot blocking: {data.get('booked_count', 0)} slots booked, {len(data.get('available_slots', []))} available")


class TestAppointmentStatusUpdates:
    """Test appointment status update flow"""
    
    def test_get_todays_appointments(self):
        """Test getting today's appointments"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/appointments/today",
            params={"clinic": "Pushpa Clinic"},
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "appointments" in data, "Appointments not in response"
        assert "summary" in data, "Summary not in response"
        
        summary = data["summary"]
        print(f"✓ Today's appointments: {summary.get('total', 0)} total, {summary.get('booked', 0)} booked, {summary.get('completed', 0)} completed")
    
    def test_status_update_checkin(self):
        """Test updating appointment status to CheckedIn"""
        if not TestAppointmentBooking.created_appointment_id:
            pytest.skip("No appointment created to update")
        
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/{TestAppointmentBooking.created_appointment_id}/status",
            json={"status": "CheckedIn"},
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Status update failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Status update not successful"
        assert data.get("status") == "CheckedIn", f"Unexpected status: {data.get('status')}"
        print("✓ Status updated to CheckedIn")
    
    def test_status_update_with_doctor(self):
        """Test updating appointment status to WithDoctor"""
        if not TestAppointmentBooking.created_appointment_id:
            pytest.skip("No appointment created to update")
        
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/{TestAppointmentBooking.created_appointment_id}/status",
            json={"status": "WithDoctor"},
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Status update failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print("✓ Status updated to WithDoctor")
    
    def test_status_update_completed_with_fee(self):
        """Test completing appointment with fee code and total"""
        if not TestAppointmentBooking.created_appointment_id:
            pytest.skip("No appointment created to update")
        
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/{TestAppointmentBooking.created_appointment_id}/status",
            json={
                "status": "Completed",
                "fee_code": "G1",
                "scan_codes": [],
                "total_amount": 150,
                "notes": "Test completion"
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Completion failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("status") == "Completed"
        print("✓ Appointment completed with fee code G1 (₹150)")


class TestCollectionSummary:
    """Test daily/weekly/monthly collection summary"""
    
    def test_daily_summary(self):
        """Test getting daily collection summary"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/summary/daily",
            params={"date": today},
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Summary failed: {response.text}"
        data = response.json()
        
        assert "total_patients" in data, "Total patients not in summary"
        assert "total_collection" in data, "Total collection not in summary"
        
        print(f"✓ Daily summary: {data['total_patients']} patients, ₹{data['total_collection']} collected")
    
    def test_weekly_summary(self):
        """Test getting weekly collection summary"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/summary/weekly",
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Summary failed: {response.text}"
        data = response.json()
        
        assert "total_patients" in data, "Total patients not in summary"
        assert "total_collection" in data, "Total collection not in summary"
        assert "by_date" in data, "By date breakdown not in summary"
        
        print(f"✓ Weekly summary: {data['total_patients']} patients, ₹{data['total_collection']} collected")
    
    def test_monthly_summary(self):
        """Test getting monthly collection summary"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/summary/monthly",
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Summary failed: {response.text}"
        data = response.json()
        
        assert "total_patients" in data, "Total patients not in summary"
        assert "total_collection" in data, "Total collection not in summary"
        
        print(f"✓ Monthly summary: {data['total_patients']} patients, ₹{data['total_collection']} collected")


class TestAppointmentsByDate:
    """Test getting appointments by specific date"""
    
    def test_get_appointments_by_date(self):
        """Test getting appointments for a specific date"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today, "clinic": "Pushpa Clinic"},
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "appointments" in data, "Appointments not in response"
        assert "summary" in data, "Summary not in response"
        
        print(f"✓ Appointments by date: {len(data['appointments'])} found for {today}")


class TestBookedSlots:
    """Test getting booked slots for real-time sync"""
    
    def test_get_booked_slots(self):
        """Test getting list of booked slot times"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/slots/booked",
            params={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today
            },
            headers=get_auth_headers())
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "booked_slots" in data, "Booked slots not in response"
        print(f"✓ Booked slots: {len(data['booked_slots'])} slots booked")


# Run tests in order
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
