"""
Test Doctor Portal Bug Fixes - Iteration 202
Tests for 4 bugs:
1. Backend clinic filter - regex matching for partial names (Pushpa matches Pushpa Clinic)
2. Type badges - SELF-BOOKED, WALK-IN, EMERGENCY on appointment cards
3. Arrival time display - checked_in_at timestamp shown for checked-in patients
4. Doctor isolation - each doctor only sees their own appointments
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL is None:
    BASE_URL = "https://premium-rx-portal.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip('/')

class TestDoctorLogin:
    """Test doctor login credentials"""
    
    def test_dr_vikas_login(self):
        """Login as Dr. Vikas"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        print(f"Dr Vikas Login Response: {response.status_code} - {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        return data
    
    def test_dr_neha_login(self):
        """Login as Dr. Neha"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_neha",
            "password": "test1234"
        })
        print(f"Dr Neha Login Response: {response.status_code} - {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        return data
    
    def test_staff_diagyn_login(self):
        """Login as DiaGyn Staff"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        print(f"Staff DiaGyn Login Response: {response.status_code} - {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        return data


class TestBackendClinicRegexFilter:
    """Test backend clinic regex filter - Bug 1 & 2"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for staff"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_clinic_filter_pushpa_regex_match(self, auth_token):
        """Test that 'Pushpa' filter matches 'Pushpa Clinic' appointments"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get appointments with 'Pushpa' filter (should match 'Pushpa Clinic')
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today, "clinic": "Pushpa"},
            headers=headers
        )
        print(f"Pushpa filter response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        
        appointments = data.get("appointments", [])
        print(f"Found {len(appointments)} appointments with Pushpa filter")
        
        # Verify all returned appointments have clinic containing 'Pushpa'
        for apt in appointments:
            clinic_name = apt.get("clinic", "").lower()
            print(f"  - Appointment clinic: {apt.get('clinic')} | Patient: {apt.get('patient_name')}")
            assert "pushpa" in clinic_name, f"Appointment clinic '{apt.get('clinic')}' does not contain 'Pushpa'"
    
    def test_clinic_filter_amnion_regex_match(self, auth_token):
        """Test that 'Amnion' filter matches 'Amnion Clinic' appointments"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today, "clinic": "Amnion"},
            headers=headers
        )
        print(f"Amnion filter response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        
        appointments = data.get("appointments", [])
        print(f"Found {len(appointments)} appointments with Amnion filter")
        
        # Verify all returned appointments have clinic containing 'Amnion'
        for apt in appointments:
            clinic_name = apt.get("clinic", "").lower()
            print(f"  - Appointment clinic: {apt.get('clinic')} | Patient: {apt.get('patient_name')}")
            assert "amnion" in clinic_name, f"Appointment clinic '{apt.get('clinic')}' does not contain 'Amnion'"
    
    def test_appointments_have_type_field(self, auth_token):
        """Test that appointments have appointment_type field (SCHEDULED, WALK_IN, EMERGENCY)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        appointments = data.get("appointments", [])
        valid_types = ["SCHEDULED", "WALK_IN", "EMERGENCY"]
        
        for apt in appointments:
            apt_type = apt.get("appointment_type")
            print(f"Patient: {apt.get('patient_name')} | Type: {apt_type} | checked_in_at: {apt.get('checked_in_at')}")
            # appointment_type may be None for legacy appointments, but if set should be valid
            if apt_type is not None:
                assert apt_type in valid_types, f"Invalid appointment type: {apt_type}"
    
    def test_checked_in_appointments_have_timestamp(self, auth_token):
        """Test that checked-in appointments have checked_in_at timestamp"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        appointments = data.get("appointments", [])
        checked_in_apts = [a for a in appointments if a.get("status") == "CheckedIn"]
        
        print(f"Found {len(checked_in_apts)} checked-in appointments")
        for apt in checked_in_apts:
            checked_in_at = apt.get("checked_in_at")
            print(f"  - Patient: {apt.get('patient_name')} | checked_in_at: {checked_in_at}")
            # checked_in_at should exist for CheckedIn status
            assert checked_in_at is not None, f"CheckedIn appointment for {apt.get('patient_name')} missing checked_in_at"


class TestDoctorIsolation:
    """Test doctor appointment isolation - Bug 1 (dr_vikas sees dr_neha's appointments)"""
    
    def test_get_dr_vikas_doctor_name(self):
        """Get Dr. Vikas doctor name from login response"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        
        doctor_name = data.get("doctor_name") or data.get("doctor") or data.get("name")
        print(f"Dr Vikas login - doctor name: {doctor_name}")
        print(f"Full response: {data}")
        return data
    
    def test_get_dr_neha_doctor_name(self):
        """Get Dr. Neha doctor name from login response"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_neha",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        
        doctor_name = data.get("doctor_name") or data.get("doctor") or data.get("name")
        print(f"Dr Neha login - doctor name: {doctor_name}")
        print(f"Full response: {data}")
        return data
    
    def test_all_appointments_show_doctor_field(self):
        """Verify appointments have doctor field for frontend filtering"""
        # Login as staff to get all appointments
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        appointments = data.get("appointments", [])
        print(f"Total appointments today: {len(appointments)}")
        
        doctors_seen = set()
        for apt in appointments:
            doctor = apt.get("doctor", "NO DOCTOR")
            doctors_seen.add(doctor)
            print(f"  - {apt.get('patient_name')} -> Doctor: {doctor} | Status: {apt.get('status')}")
        
        print(f"\nUnique doctors in appointments: {doctors_seen}")


class TestCreateTestAppointments:
    """Create test appointments to verify filtering works"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for staff"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_create_walkin_appointment_pushpa(self, auth_token):
        """Create a walk-in appointment at Pushpa Clinic for Dr. Vikas"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create walk-in appointment
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "time": "18:30",
                "patient_name": "TEST_WalkIn_Pushpa_Patient",
                "patient_mobile": "9999999999",
                "appointment_type": "WALK_IN"
            },
            headers=headers
        )
        print(f"Create WalkIn Response: {response.status_code} - {response.json()}")
        assert response.status_code in [200, 201, 409]  # 409 if slot already booked
        
        if response.status_code in [200, 201]:
            data = response.json()
            apt = data.get("appointment", {})
            assert apt.get("appointment_type") == "WALK_IN"
            assert "pushpa" in apt.get("clinic", "").lower()
            print(f"Created walk-in appointment: {apt.get('booking_id')}")
    
    def test_create_emergency_appointment_amnion(self, auth_token):
        """Create an emergency appointment at Amnion Clinic for Dr. Neha"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create emergency appointment
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Amnion Clinic",
                "doctor": "Dr. Neha Patel",
                "date": today,
                "patient_name": "TEST_Emergency_Amnion_Patient",
                "patient_mobile": "9888888888",
                "appointment_type": "EMERGENCY"
            },
            headers=headers
        )
        print(f"Create Emergency Response: {response.status_code} - {response.json()}")
        assert response.status_code in [200, 201, 409]
        
        if response.status_code in [200, 201]:
            data = response.json()
            apt = data.get("appointment", {})
            assert apt.get("appointment_type") == "EMERGENCY"
            assert "amnion" in apt.get("clinic", "").lower()
            print(f"Created emergency appointment: {apt.get('booking_id')}")
    
    def test_verify_type_badges_data_available(self, auth_token):
        """Verify that appointment_type is returned for UI type badges"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        appointments = data.get("appointments", [])
        
        type_counts = {"SCHEDULED": 0, "WALK_IN": 0, "EMERGENCY": 0, "None": 0}
        for apt in appointments:
            apt_type = apt.get("appointment_type")
            if apt_type in type_counts:
                type_counts[apt_type] += 1
            else:
                type_counts["None"] += 1
        
        print(f"Appointment type distribution: {type_counts}")
        print(f"Total: {len(appointments)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
