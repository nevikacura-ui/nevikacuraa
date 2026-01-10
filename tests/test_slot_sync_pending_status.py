"""
Test Suite for Slot Synchronization with 'pending' status
Tests the fix for slot blocking between patient portal (DiaGyn) and staff portal (StaffPortal)

Key fix: The /api/appointments/booked-slots endpoint now includes 'pending' status
in addition to 'Booked', 'In Clinic', 'Completed' to properly block slots from patient bookings.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_DATE = "2026-01-10"  # Saturday - Dr. Neha Patel available at Pushpa Clinic
TEST_DOCTOR = "Dr. Neha Patel"
TEST_CLINIC = "Pushpa Clinic"
TEST_TIME_SLOT = "10:00 AM"
TEST_TIME_SLOT_2 = "10:15 AM"
TEST_TIME_SLOT_3 = "10:30 AM"

# Staff credentials
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"


class TestSlotSyncPendingStatus:
    """Test slot synchronization with pending status included"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_appointments = []
        yield
        # Cleanup: Cancel test appointments
        self._cleanup_test_appointments()
    
    def _cleanup_test_appointments(self):
        """Clean up test appointments"""
        for appt_id in self.created_appointments:
            try:
                # Try to cancel via staff endpoint
                staff_token = self._get_staff_token()
                if staff_token:
                    requests.put(
                        f"{BASE_URL}/api/staff/appointments/{appt_id}/status",
                        json={"status": "Cancelled"},
                        headers={"Authorization": f"Bearer {staff_token}"}
                    )
            except Exception as e:
                print(f"Cleanup failed for {appt_id}: {e}")
    
    def _get_staff_token(self):
        """Get staff authentication token"""
        response = self.session.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_booked_slots_endpoint_exists(self):
        """Test that booked-slots endpoint exists and returns proper structure"""
        response = self.session.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        assert isinstance(data["booked_slots"], list)
        print(f"✓ Booked slots endpoint working, found {len(data['booked_slots'])} booked slots")
    
    def test_patient_booking_creates_pending_status(self):
        """Test that patient booking via DiaGyn creates appointment with 'pending' status"""
        unique_time = "11:00 AM"  # Use a unique time slot
        unique_phone = f"TEST{str(uuid.uuid4())[:6]}"
        
        # Create patient booking (simulating DiaGyn)
        response = self.session.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_Patient_{unique_phone}",
                "patient_phone": f"9999{unique_phone[:6]}",
                "patient_email": f"test_{unique_phone}@test.com"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"  # Patient bookings should have 'pending' status
        self.created_appointments.append(data["id"])
        print(f"✓ Patient booking created with status: {data['status']}")
        return data
    
    def test_pending_status_appears_in_booked_slots(self):
        """Test that appointments with 'pending' status appear in booked-slots API"""
        unique_time = "11:15 AM"
        unique_phone = f"TEST{str(uuid.uuid4())[:6]}"
        
        # First, check current booked slots
        initial_response = self.session.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        initial_slots = initial_response.json()["booked_slots"]
        
        # Create a patient booking (pending status)
        booking_response = self.session.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_Patient_{unique_phone}",
                "patient_phone": f"9999{unique_phone[:6]}",
                "patient_email": f"test_{unique_phone}@test.com"
            }
        )
        
        assert booking_response.status_code == 200
        self.created_appointments.append(booking_response.json()["id"])
        
        # Check booked slots again - should now include the new slot
        updated_response = self.session.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        updated_slots = updated_response.json()["booked_slots"]
        
        assert unique_time in updated_slots, f"Pending slot {unique_time} should appear in booked slots"
        print(f"✓ Pending status slot ({unique_time}) correctly appears in booked-slots API")
    
    def test_double_booking_prevention_patient_to_patient(self):
        """Test that double booking is prevented for patient-to-patient bookings"""
        unique_time = "11:30 AM"
        unique_phone = f"TEST{str(uuid.uuid4())[:6]}"
        
        # First booking
        first_response = self.session.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_Patient1_{unique_phone}",
                "patient_phone": f"9999{unique_phone[:6]}",
                "patient_email": f"test1_{unique_phone}@test.com"
            }
        )
        assert first_response.status_code == 200
        self.created_appointments.append(first_response.json()["id"])
        
        # Second booking attempt for same slot
        second_response = self.session.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_Patient2_{unique_phone}",
                "patient_phone": f"8888{unique_phone[:6]}",
                "patient_email": f"test2_{unique_phone}@test.com"
            }
        )
        
        assert second_response.status_code == 400
        assert "already booked" in second_response.json()["detail"].lower()
        print(f"✓ Double booking prevented for patient-to-patient (slot: {unique_time})")
    
    def test_staff_login(self):
        """Test staff login functionality"""
        response = self.session.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        print(f"✓ Staff login successful for {STAFF_USERNAME}")
        return data["token"]
    
    def test_staff_walkin_booking_creates_booked_status(self):
        """Test that staff walk-in booking creates appointment with 'Booked' status"""
        staff_token = self._get_staff_token()
        assert staff_token, "Failed to get staff token"
        
        unique_time = "11:45 AM"
        unique_phone = f"TEST{str(uuid.uuid4())[:6]}"
        
        response = self.session.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_WalkIn_{unique_phone}",
                "patient_phone": f"7777{unique_phone[:6]}"
            },
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Booked"  # Staff walk-in should have 'Booked' status
        self.created_appointments.append(data["id"])
        print(f"✓ Staff walk-in booking created with status: {data['status']}")
    
    def test_cross_booking_prevention_patient_then_staff(self):
        """Test that staff cannot book a slot already booked by patient (pending status)"""
        staff_token = self._get_staff_token()
        assert staff_token, "Failed to get staff token"
        
        unique_time = "12:00 PM"
        unique_phone = f"TEST{str(uuid.uuid4())[:6]}"
        
        # Patient books first (creates pending status)
        patient_response = self.session.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_Patient_{unique_phone}",
                "patient_phone": f"9999{unique_phone[:6]}",
                "patient_email": f"test_{unique_phone}@test.com"
            }
        )
        assert patient_response.status_code == 200
        self.created_appointments.append(patient_response.json()["id"])
        
        # Staff tries to book same slot
        staff_response = self.session.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_WalkIn_{unique_phone}",
                "patient_phone": f"7777{unique_phone[:6]}"
            },
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert staff_response.status_code == 400
        assert "already booked" in staff_response.json()["detail"].lower()
        print(f"✓ Cross-booking prevented: Patient booking blocks staff walk-in (slot: {unique_time})")
    
    def test_cross_booking_prevention_staff_then_patient(self):
        """Test that patient cannot book a slot already booked by staff"""
        staff_token = self._get_staff_token()
        assert staff_token, "Failed to get staff token"
        
        unique_time = "12:15 PM"
        unique_phone = f"TEST{str(uuid.uuid4())[:6]}"
        
        # Staff books first (creates Booked status)
        staff_response = self.session.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_WalkIn_{unique_phone}",
                "patient_phone": f"7777{unique_phone[:6]}"
            },
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert staff_response.status_code == 200
        self.created_appointments.append(staff_response.json()["id"])
        
        # Patient tries to book same slot
        patient_response = self.session.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_Patient_{unique_phone}",
                "patient_phone": f"9999{unique_phone[:6]}",
                "patient_email": f"test_{unique_phone}@test.com"
            }
        )
        
        assert patient_response.status_code == 400
        assert "already booked" in patient_response.json()["detail"].lower()
        print(f"✓ Cross-booking prevented: Staff booking blocks patient booking (slot: {unique_time})")
    
    def test_booked_slots_includes_all_active_statuses(self):
        """Test that booked-slots API returns slots with all active statuses"""
        # Get current booked slots
        response = self.session.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # The endpoint should return slots - we can't verify exact statuses without DB access
        # but we can verify the structure is correct
        assert "booked_slots" in data
        assert isinstance(data["booked_slots"], list)
        
        print(f"✓ Booked slots API returns {len(data['booked_slots'])} slots for {TEST_DATE}")
        print(f"  Booked slots: {data['booked_slots'][:5]}..." if len(data['booked_slots']) > 5 else f"  Booked slots: {data['booked_slots']}")


class TestStaffPortalSlotSync:
    """Test StaffPortal slot synchronization"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.staff_token = self._get_staff_token()
        self.created_appointments = []
        yield
        self._cleanup_test_appointments()
    
    def _get_staff_token(self):
        """Get staff authentication token"""
        response = self.session.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def _cleanup_test_appointments(self):
        """Clean up test appointments"""
        for appt_id in self.created_appointments:
            try:
                if self.staff_token:
                    requests.put(
                        f"{BASE_URL}/api/staff/appointments/{appt_id}/status",
                        json={"status": "Cancelled"},
                        headers={"Authorization": f"Bearer {self.staff_token}"}
                    )
            except Exception as e:
                print(f"Cleanup failed for {appt_id}: {e}")
    
    def test_staff_can_see_patient_booked_slots(self):
        """Test that staff portal can see slots booked by patients"""
        unique_time = "12:30 PM"
        unique_phone = f"TEST{str(uuid.uuid4())[:6]}"
        
        # Patient books a slot
        patient_response = self.session.post(
            f"{BASE_URL}/api/appointments",
            json={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": unique_time,
                "patient_name": f"TEST_Patient_{unique_phone}",
                "patient_phone": f"9999{unique_phone[:6]}",
                "patient_email": f"test_{unique_phone}@test.com"
            }
        )
        assert patient_response.status_code == 200
        self.created_appointments.append(patient_response.json()["id"])
        
        # Staff checks booked slots (same API used by StaffPortal)
        slots_response = self.session.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        
        assert slots_response.status_code == 200
        booked_slots = slots_response.json()["booked_slots"]
        assert unique_time in booked_slots, f"Patient-booked slot {unique_time} should be visible to staff"
        print(f"✓ Staff portal can see patient-booked slot: {unique_time}")
    
    def test_staff_appointments_list(self):
        """Test staff can list appointments for their clinic"""
        assert self.staff_token, "Staff token required"
        
        response = self.session.get(
            f"{BASE_URL}/api/staff/appointments",
            params={"date": TEST_DATE},
            headers={"Authorization": f"Bearer {self.staff_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Staff can list appointments, found {len(data)} for {TEST_DATE}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
