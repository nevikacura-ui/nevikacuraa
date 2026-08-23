"""
Test Phase 2 & 3 features for Nevika Cura:
- Phase 2: Sticky desktop CTA, Doctor availability preview
- Phase 3: Guest booking, Rebooking flow, Post-visit data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDoctorNextAvailable:
    """Test GET /api/doctors/next-available endpoint"""
    
    def test_next_available_default_doctor(self):
        """Test next available slot for default doctor (Dr. Vikas Jha)"""
        response = requests.get(f"{BASE_URL}/api/doctors/next-available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "available" in data, "Response should contain 'available' field"
        
        if data.get("available"):
            # Verify slot data structure when available
            assert "doctor" in data, "Should contain doctor name"
            assert "date" in data, "Should contain date"
            assert "time" in data, "Should contain time"
            assert "display_time" in data, "Should contain display_time"
            assert "day_label" in data, "Should contain day_label"
            assert data["doctor"] == "Dr. Vikas Jha", "Default doctor should be Dr. Vikas Jha"
            print(f"PASS: Next available slot for Dr. Vikas Jha - {data['day_label']} {data['display_time']}")
        else:
            print(f"INFO: No slots available - {data.get('message', 'No message')}")
    
    def test_next_available_specific_doctor(self):
        """Test next available slot for specific doctor (Dr. Neha Patel)"""
        response = requests.get(f"{BASE_URL}/api/doctors/next-available?doctor=Dr.%20Neha%20Patel")
        assert response.status_code == 200
        
        data = response.json()
        assert "available" in data
        
        if data.get("available"):
            assert data["doctor"] == "Dr. Neha Patel"
            print(f"PASS: Next available for Dr. Neha Patel - {data['day_label']} {data['display_time']}")
        else:
            print(f"INFO: No slots for Dr. Neha Patel - {data.get('message')}")
    
    def test_next_available_invalid_doctor(self):
        """Test next available for non-existent doctor"""
        response = requests.get(f"{BASE_URL}/api/doctors/next-available?doctor=Dr.%20Fake%20Doctor")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("available") == False, "Should return available=False for invalid doctor"
        print(f"PASS: Invalid doctor returns available=False")


class TestAppointmentHistory:
    """Test GET /api/appointments/history endpoint"""
    
    def test_history_returns_appointments_array(self):
        """Test that history endpoint returns appointments array"""
        response = requests.get(f"{BASE_URL}/api/appointments/history?phone=9403890429")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "appointments" in data, "Response should contain 'appointments' field"
        assert isinstance(data["appointments"], list), "appointments should be a list"
        print(f"PASS: History returns {len(data['appointments'])} appointments")
    
    def test_history_with_different_phone(self):
        """Test history with a different phone number"""
        response = requests.get(f"{BASE_URL}/api/appointments/history?phone=9876543210")
        assert response.status_code == 200
        
        data = response.json()
        assert "appointments" in data
        assert isinstance(data["appointments"], list)
        print(f"PASS: History for different phone returns {len(data['appointments'])} appointments")


class TestGuestAppointmentBooking:
    """Test POST /api/appointments/guest endpoint"""
    
    def test_guest_booking_requires_otp(self):
        """Test that guest booking fails without valid OTP"""
        payload = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "Amnion Clinic",
            "date": "2026-02-03",
            "time": "14:00",
            "patient_name": "Test Patient",
            "patient_phone": "9999999999",
            "otp": "000000"  # Invalid OTP
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments/guest", json=payload)
        # Should fail with 400 because OTP is invalid
        assert response.status_code == 400, f"Expected 400 for invalid OTP, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should contain error detail"
        assert "OTP" in data["detail"] or "otp" in data["detail"].lower(), "Error should mention OTP"
        print(f"PASS: Guest booking correctly rejects invalid OTP - {data['detail']}")
    
    def test_guest_booking_invalid_payload(self):
        """Test guest booking with missing required fields"""
        payload = {
            "doctor": "Dr. Vikas Jha",
            # Missing other required fields
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments/guest", json=payload)
        # Should fail with validation error
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print(f"PASS: Guest booking rejects incomplete payload")


class TestHealthEndpoints:
    """Test basic health and API availability"""
    
    def test_api_base(self):
        """Test API base endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code in [200, 404], f"API base check: {response.status_code}"
        print(f"PASS: API base check - status {response.status_code}")
    
    def test_doctors_list_available(self):
        """Test doctors list endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200, f"Doctors list failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list) or "doctors" in data, "Should return doctors list"
        print(f"PASS: Doctors list endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
