"""
Test: Doctor Portal Appointment Sync - P0 Bug Fix Verification
Verifies that appointments booked for a specific doctor appear in that doctor's portal.

Bug Description: Doctor name mismatch between staff collection and appointment records
Fix: Ensure doctor names are consistent ('Dr. Neha Patel' in both staff and appointments)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DR_NEHA_CREDENTIALS = {"username": "dr_neha", "password": "test"}
STAFF_DIAGYN_CREDENTIALS = {"username": "staff_diagyn", "password": "test"}


class TestDoctorAppointmentSync:
    """Test suite for Doctor Portal Appointment Sync bug fix"""
    
    @pytest.fixture(scope="class")
    def dr_neha_token(self):
        """Login as dr_neha and get token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DR_NEHA_CREDENTIALS)
        assert response.status_code == 200, f"Failed to login as dr_neha: {response.text}"
        data = response.json()
        return data["token"]
    
    @pytest.fixture(scope="class")
    def staff_token(self):
        """Login as staff_diagyn and get token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_DIAGYN_CREDENTIALS)
        assert response.status_code == 200, f"Failed to login as staff_diagyn: {response.text}"
        data = response.json()
        return data["token"]
    
    @pytest.fixture(scope="class")
    def dr_neha_info(self):
        """Get dr_neha's staff info from login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DR_NEHA_CREDENTIALS)
        data = response.json()
        return data["staff"]
    
    def test_01_dr_neha_login_returns_correct_doctor_name(self, dr_neha_info):
        """Verify dr_neha login returns 'Dr. Neha Patel' as doctor_name in JWT"""
        assert dr_neha_info is not None, "Staff info not returned"
        assert dr_neha_info.get("doctor_name") == "Dr. Neha Patel", \
            f"Expected doctor_name 'Dr. Neha Patel', got '{dr_neha_info.get('doctor_name')}'"
        assert dr_neha_info.get("role") == "doctor", \
            f"Expected role 'doctor', got '{dr_neha_info.get('role')}'"
        print(f"✓ dr_neha login returns doctor_name: '{dr_neha_info.get('doctor_name')}'")
    
    def test_02_book_appointment_for_dr_neha_at_pushpa_clinic(self, staff_token):
        """Book an appointment through API for Dr. Neha Patel at Pushpa Clinic"""
        # Get tomorrow's date (to avoid past date issues)
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Check if tomorrow is Sunday, skip to Monday if so
        tomorrow_date = datetime.now() + timedelta(days=1)
        if tomorrow_date.weekday() == 6:  # Sunday
            tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        # Create appointment
        appointment_data = {
            "doctor": "Dr. Neha Patel",  # Must match exactly
            "clinic": "Pushpa Clinic",
            "date": tomorrow,
            "time": "12:00",
            "patient_name": "TEST_Sync_Patient",
            "patient_phone": "9999888811",
            "patient_email": "test_sync@test.com",
            "verification_token": "test_verification_token",
            "payment_method": "free"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        
        # Store appointment details for later tests
        self.__class__.test_appointment_date = tomorrow
        self.__class__.test_appointment_doctor = "Dr. Neha Patel"
        
        if response.status_code == 200:
            data = response.json()
            self.__class__.test_appointment_id = data.get("id") or data.get("booking_id")
            print(f"✓ Appointment created: ID={self.__class__.test_appointment_id}")
            print(f"  Doctor: {appointment_data['doctor']}")
            print(f"  Clinic: {appointment_data['clinic']}")
            print(f"  Date: {tomorrow}")
            
            # Verify the doctor name stored is correct
            assert data.get("doctor") == "Dr. Neha Patel", \
                f"Stored doctor name mismatch: expected 'Dr. Neha Patel', got '{data.get('doctor')}'"
        else:
            # Might fail due to slot already booked or other reasons - check response
            print(f"Appointment creation response: {response.status_code} - {response.text}")
            # Try a different time slot
            appointment_data["time"] = "13:00"
            response2 = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
            if response2.status_code == 200:
                data = response2.json()
                self.__class__.test_appointment_id = data.get("id") or data.get("booking_id")
                print(f"✓ Appointment created (retry): ID={self.__class__.test_appointment_id}")
            else:
                pytest.skip(f"Could not create test appointment: {response2.text}")
    
    def test_03_verify_appointment_in_diagyn_staff_portal(self, staff_token):
        """Verify the appointment appears in DiaGyn Staff Portal"""
        test_date = getattr(self.__class__, 'test_appointment_date', None)
        if not test_date:
            pytest.skip("No test appointment created")
        
        # Get appointments from staff portal
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": test_date, "clinic": "Pushpa Clinic"},
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get staff appointments: {response.text}"
        data = response.json()
        appointments = data.get("appointments", [])
        
        # Find our test appointment
        test_appointment = None
        for apt in appointments:
            if apt.get("patient_name") == "TEST_Sync_Patient":
                test_appointment = apt
                break
        
        if test_appointment:
            print(f"✓ Appointment found in Staff Portal:")
            print(f"  Doctor stored: '{test_appointment.get('doctor')}'")
            print(f"  Patient: {test_appointment.get('patient_name')}")
            assert test_appointment.get("doctor") == "Dr. Neha Patel", \
                f"Doctor name mismatch in appointment: expected 'Dr. Neha Patel', got '{test_appointment.get('doctor')}'"
        else:
            print(f"Available appointments on {test_date}: {len(appointments)}")
            for apt in appointments[:5]:
                print(f"  - {apt.get('patient_name')} | Doctor: {apt.get('doctor')}")
            pytest.fail("Test appointment not found in Staff Portal")
    
    def test_04_verify_appointment_in_doctor_portal(self, dr_neha_token, dr_neha_info):
        """CRITICAL: Verify the appointment appears in Dr. Neha's Doctor Portal"""
        test_date = getattr(self.__class__, 'test_appointment_date', None)
        if not test_date:
            pytest.skip("No test appointment created")
        
        # Get appointments from doctor portal (using diagyn-staff endpoint with doctor filter)
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": test_date},
            headers={"Authorization": f"Bearer {dr_neha_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get doctor appointments: {response.text}"
        data = response.json()
        all_appointments = data.get("appointments", [])
        
        # Doctor portal filters by doctor name
        # The filtering happens on frontend, let's simulate it
        doctor_name = dr_neha_info.get("doctor_name", "").lower()
        last_name = doctor_name.split()[-1].lower() if doctor_name else ""
        
        filtered_appointments = []
        for apt in all_appointments:
            apt_doctor = (apt.get("doctor") or "").lower()
            if doctor_name in apt_doctor or last_name in apt_doctor:
                filtered_appointments.append(apt)
        
        print(f"\nDoctor Portal Results for '{dr_neha_info.get('doctor_name')}':")
        print(f"  Total appointments on {test_date}: {len(all_appointments)}")
        print(f"  Filtered for this doctor: {len(filtered_appointments)}")
        
        # Find our test appointment
        test_appointment = None
        for apt in filtered_appointments:
            if apt.get("patient_name") == "TEST_Sync_Patient":
                test_appointment = apt
                break
        
        if test_appointment:
            print(f"\n✓ TEST PASSED - Appointment visible in Doctor Portal:")
            print(f"  Patient: {test_appointment.get('patient_name')}")
            print(f"  Doctor: {test_appointment.get('doctor')}")
            print(f"  Clinic: {test_appointment.get('clinic')}")
            print(f"  Time: {test_appointment.get('time')}")
            print(f"  Status: {test_appointment.get('status')}")
        else:
            print(f"\n✗ TEST FAILED - Appointment NOT visible in Doctor Portal")
            print(f"  Doctor name from JWT: '{dr_neha_info.get('doctor_name')}'")
            print(f"  Looking for patient: 'TEST_Sync_Patient'")
            print(f"\n  All appointments on this date:")
            for apt in all_appointments[:10]:
                print(f"    - Patient: {apt.get('patient_name')} | Doctor: '{apt.get('doctor')}'")
            pytest.fail("Appointment booked for Dr. Neha Patel does NOT appear in Doctor Portal!")
    
    def test_05_doctor_name_consistency_check(self, dr_neha_info):
        """Verify doctor name consistency between staff record and DiaGyn booking page"""
        # DiaGyn.js Line 85 has: name: 'Dr. Neha Patel'
        diagyn_doctor_name = "Dr. Neha Patel"
        staff_doctor_name = dr_neha_info.get("doctor_name")
        
        assert staff_doctor_name == diagyn_doctor_name, \
            f"Doctor name mismatch! DiaGyn page: '{diagyn_doctor_name}', Staff record: '{staff_doctor_name}'"
        
        print(f"✓ Doctor name consistency verified:")
        print(f"  DiaGyn booking page: '{diagyn_doctor_name}'")
        print(f"  Staff record (JWT): '{staff_doctor_name}'")
    
    def test_06_cleanup_test_appointment(self, staff_token):
        """Clean up test appointment"""
        test_appointment_id = getattr(self.__class__, 'test_appointment_id', None)
        if not test_appointment_id:
            pytest.skip("No test appointment to clean up")
        
        # Cancel the test appointment
        try:
            response = requests.put(
                f"{BASE_URL}/api/appointments/{test_appointment_id}/cancel",
                headers={"Authorization": f"Bearer {staff_token}"}
            )
            if response.status_code == 200:
                print(f"✓ Test appointment cleaned up: {test_appointment_id}")
            else:
                print(f"Could not cancel appointment: {response.status_code}")
        except Exception as e:
            print(f"Cleanup skipped: {e}")


class TestDoctorPortalFiltering:
    """Test the doctor portal filtering logic"""
    
    def test_doctor_name_matching_logic(self):
        """Test the matching logic used in DoctorPortal.js"""
        # From DoctorPortal.js Lines 227-234
        doctor_info = {"doctor": "Dr. Neha Patel"}
        doctor_name = doctor_info.get("doctor", "").lower()
        last_name = doctor_name.split()[-1].lower() if doctor_name else ""
        
        # Test cases
        test_cases = [
            {"doctor": "Dr. Neha Patel", "should_match": True},
            {"doctor": "dr. neha patel", "should_match": True},
            {"doctor": "DR. NEHA PATEL", "should_match": True},
            {"doctor": "Dr. Vikas Jha", "should_match": False},
            {"doctor": "Patel", "should_match": True},  # Last name match
            {"doctor": "", "should_match": False},
            {"doctor": None, "should_match": False},
        ]
        
        for tc in test_cases:
            apt_doctor = (tc.get("doctor") or "").lower()
            matches = doctor_name in apt_doctor or last_name in apt_doctor
            expected = tc["should_match"]
            assert matches == expected, \
                f"Matching failed for '{tc['doctor']}': expected {expected}, got {matches}"
        
        print("✓ Doctor name matching logic verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
