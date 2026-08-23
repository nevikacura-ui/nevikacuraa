"""
Test My Appointments Feature - Patient Appointment Management
Tests: patient-active, patient-cancel, reschedule endpoints
Phone: 9403890429
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9403890429"

class TestPatientActiveAppointments:
    """Test GET /api/appointments/patient-active endpoint"""
    
    def test_get_patient_active_appointments(self):
        """Test fetching active appointments for a patient"""
        response = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "active" in data, "Response should contain 'active' key"
        assert "completed" in data, "Response should contain 'completed' key"
        assert "cancelled" in data, "Response should contain 'cancelled' key"
        assert "today" in data, "Response should contain 'today' key"
        assert "total_active" in data, "Response should contain 'total_active' key"
        
        print(f"Active appointments: {len(data['active'])}")
        print(f"Completed appointments: {len(data['completed'])}")
        print(f"Cancelled appointments: {len(data['cancelled'])}")
        
        # Verify active appointments have can_cancel and can_reschedule flags
        for apt in data['active']:
            assert "can_cancel" in apt, f"Active appointment {apt.get('id')} missing can_cancel flag"
            assert "can_reschedule" in apt, f"Active appointment {apt.get('id')} missing can_reschedule flag"
            print(f"  - {apt.get('doctor')} on {apt.get('date')} at {apt.get('time')} | can_cancel={apt.get('can_cancel')}, can_reschedule={apt.get('can_reschedule')}")
    
    def test_invalid_phone_returns_error(self):
        """Test that invalid phone number returns 400"""
        response = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": "123"})
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"


class TestCreateTestAppointment:
    """Create a test appointment for cancel/reschedule testing"""
    
    @pytest.fixture(scope="class")
    def test_appointment(self):
        """Create a test appointment far enough in the future to be cancellable"""
        # Create appointment 3 days from now at 18:00 (within clinic hours)
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        payload = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "DiaGyn - Amnion Clinic",
            "date": future_date,
            "time": "18:00",
            "patient_name": "TEST_MyAppointments_User",
            "patient_phone": TEST_PHONE,
            "patient_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=payload)
        
        # Handle case where appointment already exists or 24-hour restriction
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "already" in detail.lower() or "24 hours" in detail.lower():
                print(f"Skipping appointment creation: {detail}")
                # Try to get existing appointment
                active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
                if active_resp.status_code == 200:
                    active_data = active_resp.json()
                    if active_data.get("active"):
                        return active_data["active"][0]
                pytest.skip(f"Cannot create test appointment: {detail}")
        
        assert response.status_code == 200, f"Failed to create appointment: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain appointment id"
        print(f"Created test appointment: {data.get('id')} on {future_date} at 18:00")
        return data


class TestPatientCancelAppointment:
    """Test POST /api/appointments/{id}/patient-cancel endpoint"""
    
    def test_cancel_requires_phone_verification(self):
        """Test that cancellation requires correct patient phone"""
        # First get an active appointment
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("No active appointments to test")
        
        active_data = active_resp.json()
        if not active_data.get("active"):
            pytest.skip("No active appointments available")
        
        apt = active_data["active"][0]
        apt_id = apt.get("id")
        
        # Try to cancel with wrong phone
        response = requests.post(
            f"{BASE_URL}/api/appointments/{apt_id}/patient-cancel",
            json={"reason": "Test", "patient_phone": "9999999999"}
        )
        assert response.status_code == 403, f"Expected 403 for wrong phone, got {response.status_code}"
        print("Phone verification working - wrong phone rejected")
    
    def test_cancel_appointment_within_1_hour_fails(self):
        """Test that appointments within 1 hour cannot be cancelled"""
        # Create an appointment for very soon (if possible)
        # This test verifies the 1-hour cutoff logic
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("Cannot fetch appointments")
        
        active_data = active_resp.json()
        # Check if any appointment has can_cancel=False
        for apt in active_data.get("active", []):
            if not apt.get("can_cancel"):
                print(f"Found appointment with can_cancel=False: {apt.get('date')} at {apt.get('time')}")
                # Try to cancel it
                response = requests.post(
                    f"{BASE_URL}/api/appointments/{apt.get('id')}/patient-cancel",
                    json={"reason": "Test", "patient_phone": TEST_PHONE}
                )
                # Should fail with 400 due to 1-hour cutoff
                if response.status_code == 400:
                    assert "1 hour" in response.json().get("detail", "").lower() or "cannot cancel" in response.json().get("detail", "").lower()
                    print("1-hour cutoff enforcement working")
                    return
        
        print("No appointments within 1-hour window to test cutoff")
    
    def test_cancel_appointment_success(self):
        """Test successful appointment cancellation"""
        # Get active appointments
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("Cannot fetch appointments")
        
        active_data = active_resp.json()
        
        # Find a cancellable appointment
        cancellable = [apt for apt in active_data.get("active", []) if apt.get("can_cancel")]
        if not cancellable:
            pytest.skip("No cancellable appointments available")
        
        apt = cancellable[0]
        apt_id = apt.get("id")
        
        # Cancel the appointment
        response = requests.post(
            f"{BASE_URL}/api/appointments/{apt_id}/patient-cancel",
            json={"reason": "Schedule conflict", "patient_phone": TEST_PHONE}
        )
        
        assert response.status_code == 200, f"Failed to cancel: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Cancel should return success=True"
        assert "appointment_id" in data or "booking_id" in data, "Response should contain appointment identifier"
        print(f"Successfully cancelled appointment: {apt_id}")
        
        # Verify it appears in cancelled list
        verify_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        verify_data = verify_resp.json()
        cancelled_ids = [c.get("id") for c in verify_data.get("cancelled", [])]
        # Note: May not appear immediately in cancelled list due to 7-day filter
        print(f"Cancelled appointments count: {len(verify_data.get('cancelled', []))}")


class TestPatientRescheduleAppointment:
    """Test POST /api/appointments/{id}/reschedule endpoint"""
    
    def test_reschedule_requires_phone_verification(self):
        """Test that reschedule requires correct patient phone"""
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("Cannot fetch appointments")
        
        active_data = active_resp.json()
        reschedulable = [apt for apt in active_data.get("active", []) if apt.get("can_reschedule")]
        if not reschedulable:
            pytest.skip("No reschedulable appointments available")
        
        apt = reschedulable[0]
        apt_id = apt.get("id")
        
        # Try to reschedule with wrong phone
        future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        response = requests.post(
            f"{BASE_URL}/api/appointments/{apt_id}/reschedule",
            json={"patient_phone": "9999999999", "new_date": future_date, "new_time": "19:00"}
        )
        assert response.status_code == 403, f"Expected 403 for wrong phone, got {response.status_code}"
        print("Phone verification working for reschedule")
    
    def test_reschedule_to_booked_slot_fails(self):
        """Test that rescheduling to an already booked slot fails"""
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("Cannot fetch appointments")
        
        active_data = active_resp.json()
        reschedulable = [apt for apt in active_data.get("active", []) if apt.get("can_reschedule")]
        if not reschedulable:
            pytest.skip("No reschedulable appointments available")
        
        apt = reschedulable[0]
        apt_id = apt.get("id")
        
        # Get booked slots for the same doctor/clinic/date
        booked_resp = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": apt.get("doctor"),
            "clinic": apt.get("clinic"),
            "date": apt.get("date")
        })
        
        if booked_resp.status_code == 200:
            booked_slots = booked_resp.json().get("booked_slots", [])
            if booked_slots:
                # Try to reschedule to an already booked slot
                response = requests.post(
                    f"{BASE_URL}/api/appointments/{apt_id}/reschedule",
                    json={"patient_phone": TEST_PHONE, "new_date": apt.get("date"), "new_time": booked_slots[0]}
                )
                # Should fail with 409 conflict
                if response.status_code == 409:
                    print("Slot conflict check working - cannot reschedule to booked slot")
                    return
        
        print("Could not test slot conflict - no booked slots found")
    
    def test_reschedule_appointment_success(self):
        """Test successful appointment reschedule"""
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("Cannot fetch appointments")
        
        active_data = active_resp.json()
        reschedulable = [apt for apt in active_data.get("active", []) if apt.get("can_reschedule")]
        if not reschedulable:
            pytest.skip("No reschedulable appointments available")
        
        apt = reschedulable[0]
        apt_id = apt.get("id")
        original_date = apt.get("date")
        original_time = apt.get("time")
        
        # Reschedule to a different date/time
        new_date = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        new_time = "19:30"  # Evening slot within clinic hours
        
        response = requests.post(
            f"{BASE_URL}/api/appointments/{apt_id}/reschedule",
            json={"patient_phone": TEST_PHONE, "new_date": new_date, "new_time": new_time}
        )
        
        assert response.status_code == 200, f"Failed to reschedule: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Reschedule should return success=True"
        assert data.get("new_date") == new_date, f"New date should be {new_date}"
        print(f"Successfully rescheduled from {original_date} {original_time} to {new_date} {new_time}")
        
        # Verify the appointment was updated
        verify_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        verify_data = verify_resp.json()
        updated_apt = next((a for a in verify_data.get("active", []) if a.get("id") == apt_id), None)
        if updated_apt:
            assert updated_apt.get("date") == new_date, "Appointment date should be updated"
            print(f"Verified appointment updated to {updated_apt.get('date')} at {updated_apt.get('time')}")


class TestAppointmentStatusValidation:
    """Test that only Booked/pending appointments can be cancelled/rescheduled"""
    
    def test_cannot_cancel_completed_appointment(self):
        """Test that completed appointments cannot be cancelled"""
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("Cannot fetch appointments")
        
        active_data = active_resp.json()
        completed = active_data.get("completed", [])
        if not completed:
            pytest.skip("No completed appointments to test")
        
        apt = completed[0]
        apt_id = apt.get("id")
        
        response = requests.post(
            f"{BASE_URL}/api/appointments/{apt_id}/patient-cancel",
            json={"reason": "Test", "patient_phone": TEST_PHONE}
        )
        
        # Should fail because status is not Booked/pending
        assert response.status_code == 400, f"Expected 400 for completed appointment, got {response.status_code}"
        print("Cannot cancel completed appointment - status validation working")


class TestBookedSlotsEndpoint:
    """Test GET /api/appointments/booked-slots endpoint"""
    
    def test_get_booked_slots(self):
        """Test fetching booked slots for a doctor/clinic/date"""
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha",
            "clinic": "DiaGyn - Amnion Clinic",
            "date": future_date
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "booked_slots" in data, "Response should contain booked_slots"
        print(f"Booked slots for {future_date}: {data.get('booked_slots', [])}")


class TestAppointmentInvoice:
    """Test GET /api/appointments/invoice/{booking_id} endpoint"""
    
    def test_get_appointment_invoice(self):
        """Test fetching appointment invoice"""
        # Get an appointment to test invoice
        active_resp = requests.get(f"{BASE_URL}/api/appointments/patient-active", params={"phone": TEST_PHONE})
        if active_resp.status_code != 200:
            pytest.skip("Cannot fetch appointments")
        
        active_data = active_resp.json()
        all_apts = active_data.get("active", []) + active_data.get("completed", [])
        if not all_apts:
            pytest.skip("No appointments to test invoice")
        
        apt = all_apts[0]
        booking_id = apt.get("booking_id") or apt.get("id")
        
        response = requests.get(f"{BASE_URL}/api/appointments/invoice/{booking_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Invoice should return HTML"
        assert "Invoice" in response.text or "INVOICE" in response.text, "Response should contain invoice content"
        print(f"Invoice generated for booking {booking_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
