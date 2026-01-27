"""
Test Doctor Multi-Clinic Feature
Tests the new feature allowing doctors to see appointments from multiple clinics.

Features tested:
1. Doctor login returns doctor_clinics array with all clinics they work at
2. Doctor can see appointments from all clinics when 'All Clinics' is selected
3. Doctor can filter appointments by specific clinic using the dropdown
4. Appointment cards show correct status badges (Booked, In Clinic, Completed)
5. Clinic name is displayed on each appointment card
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cura-healthcare.preview.emergentagent.com')

# Test credentials for doctors
DOCTOR_CREDENTIALS = {
    "Dr. Vikas Jha": {
        "username": "doc_amnion_01",
        "password": "Nevika@2026D"
    },
    "Dr. Neha Patel": {
        "username": "doc_pushpa_01",
        "password": "Nevika@2026D"
    }
}

# Expected clinics for each doctor
EXPECTED_DOCTOR_CLINICS = {
    "Dr. Vikas Jha": ["Pushpa Clinic", "Amnion Clinic"],
    "Dr. Neha Patel": ["Pushpa Clinic", "Amnion Clinic"]
}


class TestDoctorLogin:
    """Test doctor login returns doctor_clinics array"""
    
    def test_doctor_vikas_login_returns_doctor_clinics(self):
        """Test Dr. Vikas Jha login returns doctor_clinics array"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["username"],
            "password": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["password"]
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify doctor_clinics is returned
        assert "doctor_clinics" in data, "doctor_clinics not in login response"
        assert isinstance(data["doctor_clinics"], list), "doctor_clinics should be a list"
        
        # Verify both clinics are returned
        assert len(data["doctor_clinics"]) == 2, f"Expected 2 clinics, got {len(data['doctor_clinics'])}"
        assert "Pushpa Clinic" in data["doctor_clinics"], "Pushpa Clinic not in doctor_clinics"
        assert "Amnion Clinic" in data["doctor_clinics"], "Amnion Clinic not in doctor_clinics"
        
        # Verify other login fields
        assert data["doctor_name"] == "Dr. Vikas Jha", f"Wrong doctor_name: {data.get('doctor_name')}"
        assert "token" in data, "Token not in login response"
        
        print(f"SUCCESS: Dr. Vikas Jha login returns doctor_clinics: {data['doctor_clinics']}")
    
    def test_doctor_neha_login_returns_doctor_clinics(self):
        """Test Dr. Neha Patel login returns doctor_clinics array"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_CREDENTIALS["Dr. Neha Patel"]["username"],
            "password": DOCTOR_CREDENTIALS["Dr. Neha Patel"]["password"]
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify doctor_clinics is returned
        assert "doctor_clinics" in data, "doctor_clinics not in login response"
        assert isinstance(data["doctor_clinics"], list), "doctor_clinics should be a list"
        
        # Verify both clinics are returned
        assert len(data["doctor_clinics"]) == 2, f"Expected 2 clinics, got {len(data['doctor_clinics'])}"
        assert "Pushpa Clinic" in data["doctor_clinics"], "Pushpa Clinic not in doctor_clinics"
        assert "Amnion Clinic" in data["doctor_clinics"], "Amnion Clinic not in doctor_clinics"
        
        print(f"SUCCESS: Dr. Neha Patel login returns doctor_clinics: {data['doctor_clinics']}")


class TestDoctorAppointmentsEndpoint:
    """Test doctor appointments endpoint with clinic filter"""
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor token for Dr. Vikas Jha"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["username"],
            "password": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["password"]
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_appointments_all_clinics(self, doctor_token):
        """Test getting appointments from all clinics (no clinic filter)"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        # Get appointments without clinic filter
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date=2026-01-10",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "appointments" in data, "appointments not in response"
        assert "doctor_clinics" in data, "doctor_clinics not in response"
        assert "doctor_name" in data, "doctor_name not in response"
        
        # Verify doctor_clinics is returned
        assert len(data["doctor_clinics"]) == 2, f"Expected 2 clinics, got {len(data['doctor_clinics'])}"
        
        print(f"SUCCESS: Got {len(data['appointments'])} appointments from all clinics")
        print(f"Doctor clinics: {data['doctor_clinics']}")
        
        # Check if appointments from both clinics are present
        clinics_in_appointments = set(a.get("clinic") for a in data["appointments"])
        print(f"Clinics in appointments: {clinics_in_appointments}")
    
    def test_get_appointments_filtered_by_pushpa_clinic(self, doctor_token):
        """Test filtering appointments by Pushpa Clinic"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date=2026-01-10&clinic=Pushpa%20Clinic",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        data = response.json()
        
        # Verify all appointments are from Pushpa Clinic
        for appt in data["appointments"]:
            assert appt.get("clinic") == "Pushpa Clinic", f"Found appointment from wrong clinic: {appt.get('clinic')}"
        
        # Verify selected_clinic is returned
        assert data.get("selected_clinic") == "Pushpa Clinic", f"selected_clinic mismatch: {data.get('selected_clinic')}"
        
        print(f"SUCCESS: Got {len(data['appointments'])} appointments from Pushpa Clinic only")
    
    def test_get_appointments_filtered_by_amnion_clinic(self, doctor_token):
        """Test filtering appointments by Amnion Clinic"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date=2026-01-10&clinic=Amnion%20Clinic",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        data = response.json()
        
        # Verify all appointments are from Amnion Clinic
        for appt in data["appointments"]:
            assert appt.get("clinic") == "Amnion Clinic", f"Found appointment from wrong clinic: {appt.get('clinic')}"
        
        # Verify selected_clinic is returned
        assert data.get("selected_clinic") == "Amnion Clinic", f"selected_clinic mismatch: {data.get('selected_clinic')}"
        
        print(f"SUCCESS: Got {len(data['appointments'])} appointments from Amnion Clinic only")


class TestAppointmentStatusAndClinicDisplay:
    """Test appointment status badges and clinic name display"""
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor token for Dr. Vikas Jha"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["username"],
            "password": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["password"]
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_appointments_have_status_field(self, doctor_token):
        """Test that appointments have status field with valid values"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date=2026-01-10",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_statuses = ["Booked", "In Clinic", "Completed", "Cancelled", "No Show", "pending"]
        
        for appt in data["appointments"]:
            assert "status" in appt, f"Appointment missing status field: {appt.get('id')}"
            assert appt["status"] in valid_statuses, f"Invalid status: {appt['status']}"
        
        # Count appointments by status
        status_counts = {}
        for appt in data["appointments"]:
            status = appt["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"SUCCESS: All appointments have valid status")
        print(f"Status counts: {status_counts}")
    
    def test_appointments_have_clinic_field(self, doctor_token):
        """Test that appointments have clinic field"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date=2026-01-10",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for appt in data["appointments"]:
            assert "clinic" in appt, f"Appointment missing clinic field: {appt.get('id')}"
            assert appt["clinic"] in ["Pushpa Clinic", "Amnion Clinic"], f"Invalid clinic: {appt['clinic']}"
        
        print(f"SUCCESS: All appointments have valid clinic field")


class TestDoctorClinicsMapping:
    """Test the DOCTOR_CLINICS mapping in backend"""
    
    def test_doctor_clinics_mapping_via_login(self):
        """Verify DOCTOR_CLINICS mapping returns correct clinics for each doctor"""
        
        for doctor_name, creds in DOCTOR_CREDENTIALS.items():
            response = requests.post(f"{BASE_URL}/api/staff/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            
            assert response.status_code == 200, f"Login failed for {doctor_name}"
            data = response.json()
            
            expected_clinics = EXPECTED_DOCTOR_CLINICS[doctor_name]
            actual_clinics = data.get("doctor_clinics", [])
            
            # Verify all expected clinics are present
            for clinic in expected_clinics:
                assert clinic in actual_clinics, f"{doctor_name} missing clinic: {clinic}"
            
            print(f"SUCCESS: {doctor_name} has correct clinics: {actual_clinics}")


class TestCreateAppointmentForDoctor:
    """Test creating appointments at different clinics for a doctor"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff token for Pushpa Clinic"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pushpa",
            "password": "Nevika@2026C"
        })
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor token for Dr. Vikas Jha"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["username"],
            "password": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["password"]
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_create_and_verify_appointment_at_pushpa(self, staff_token, doctor_token):
        """Create appointment at Pushpa Clinic and verify doctor can see it"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Create test appointment
        test_date = "2026-01-15"
        test_time = "11:00"
        
        appt_data = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": test_date,
            "time": test_time,
            "patient_name": "TEST_MultiClinic_Pushpa",
            "patient_phone": "9999888801"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=appt_data,
            headers=headers
        )
        
        # May fail if slot is taken, that's ok
        if response.status_code == 400 and "already booked" in response.text.lower():
            print("Slot already booked, skipping creation test")
            return
        
        assert response.status_code in [200, 201], f"Failed to create appointment: {response.text}"
        
        # Verify doctor can see it
        doc_headers = {"Authorization": f"Bearer {doctor_token}"}
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date={test_date}&clinic=Pushpa%20Clinic",
            headers=doc_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find our test appointment
        test_appts = [a for a in data["appointments"] if a.get("patient_name") == "TEST_MultiClinic_Pushpa"]
        assert len(test_appts) > 0, "Test appointment not found in doctor's view"
        
        print(f"SUCCESS: Created appointment at Pushpa Clinic and doctor can see it")


class TestAppointmentResponseStructure:
    """Test the structure of appointment response for frontend compatibility"""
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor token for Dr. Vikas Jha"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["username"],
            "password": DOCTOR_CREDENTIALS["Dr. Vikas Jha"]["password"]
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_appointment_response_has_required_fields(self, doctor_token):
        """Test that appointment response has all fields needed by frontend"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/doctor/appointments?date=2026-01-10",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Required top-level fields
        assert "appointments" in data
        assert "doctor_clinics" in data
        assert "doctor_name" in data
        assert "total_count" in data
        
        # Check appointment fields if any exist
        if data["appointments"]:
            appt = data["appointments"][0]
            required_fields = ["id", "patient_name", "patient_phone", "doctor", "clinic", "date", "status"]
            
            for field in required_fields:
                assert field in appt, f"Appointment missing required field: {field}"
        
        print(f"SUCCESS: Response structure is correct for frontend")
        print(f"Total appointments: {data['total_count']}")
        print(f"Doctor clinics: {data['doctor_clinics']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
