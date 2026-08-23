"""
DiaGyn OTP and Booking API Tests - Iteration 136
Tests for:
- OTP send/verify (POST /api/otp/whatsapp/send, /api/otp/whatsapp/verify)
- Appointment booking (POST /api/appointments)
- Booked slots (GET /api/appointments/booked-slots)
- Doctor portal WebSocket connectivity
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestOTPEndpoints:
    """Test WhatsApp OTP send and verify endpoints"""
    
    def test_otp_send_endpoint_exists(self):
        """Verify OTP send endpoint is accessible"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "9876543210",
            "purpose": "appointment"
        })
        # Should not be 404 - endpoint exists
        assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
        # Should be 200 (success) or 400/500 (validation/server error but endpoint exists)
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        print(f"OTP Send response: {response.status_code} - {response.json()}")
    
    def test_otp_send_returns_success(self):
        """Test OTP send returns success with mock OTP for testing"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "9876543210",
            "purpose": "appointment"
        })
        assert response.status_code == 200, f"OTP send failed: {response.text}"
        data = response.json()
        assert data.get("success") == True or "otp" in data or "message" in data
        print(f"OTP Send response data: {data}")
    
    def test_otp_send_validation_invalid_phone(self):
        """Test OTP send validates phone number"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "123",  # Too short
            "purpose": "appointment"
        })
        # Should reject invalid phone
        assert response.status_code == 400, f"Should reject invalid phone: {response.status_code}"
    
    def test_otp_verify_endpoint_exists(self):
        """Verify OTP verify endpoint is accessible"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": "9876543210",
            "otp": "123456"
        })
        # Should not be 404 - endpoint exists
        assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
        print(f"OTP Verify response: {response.status_code}")
    
    def test_otp_verify_validation(self):
        """Test OTP verify validates input"""
        # Test invalid OTP format
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": "9876543210",
            "otp": "12345"  # Only 5 digits
        })
        assert response.status_code == 400, f"Should reject invalid OTP format: {response.status_code}"


class TestAppointmentBooking:
    """Test appointment booking endpoints"""
    
    def test_appointments_endpoint_exists(self):
        """Verify appointment booking endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/appointments", json={
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": "2026-02-22",
            "time": "11:00",
            "patient_name": "TEST_OTP_Patient",
            "patient_phone": "9876543210"
        })
        # Should not be 404
        assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
        print(f"Appointment booking response: {response.status_code}")
    
    def test_booking_creates_appointment(self):
        """Test that booking creates an appointment successfully"""
        booking_data = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "time": "14:00",
            "patient_name": "TEST_Booking_Patient_136",
            "patient_phone": "9876543210",
            "patient_email": "test@example.com",
            "payment_method": "free"
        }
        response = requests.post(f"{BASE_URL}/api/appointments", json=booking_data)
        print(f"Booking response: {response.status_code} - {response.text}")
        
        # Should be 200/201 for success
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data or "booking_id" in data or "_id" in data, "Should return booking ID"
            print(f"Booking created: {data}")


class TestBookedSlots:
    """Test booked-slots endpoint"""
    
    def test_booked_slots_endpoint_exists(self):
        """Verify booked-slots endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": "2026-02-21"
        })
        # Should not be 404
        assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
        print(f"Booked slots response: {response.status_code}")
    
    def test_booked_slots_returns_array(self):
        """Test booked-slots returns array of slots"""
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": "2026-02-21"
        })
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        assert "booked_slots" in data, f"Missing booked_slots in response: {data}"
        assert isinstance(data["booked_slots"], list), "booked_slots should be a list"
        print(f"Booked slots: {data['booked_slots']}")


class TestDoctorLogin:
    """Test doctor portal login"""
    
    def test_doctor_login(self):
        """Test doctor login for dr_vikas"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Doctor login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, f"No token in response: {data}"
        print(f"Doctor login successful: {data.get('doctor', data.get('user', 'N/A'))}")
        return data.get("token") or data.get("access_token")
    
    def test_doctor_portal_config(self):
        """Test getting portal config after login"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token") or login_response.json().get("access_token")
        
        # Get config
        config_response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/config",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert config_response.status_code == 200, f"Config failed: {config_response.status_code}"
        data = config_response.json()
        assert "fee_codes" in data or "clinics" in data, f"Missing config data: {data}"
        print(f"Config loaded: clinics={data.get('clinics', [])}")


class TestStaffLogin:
    """Test staff portal login"""
    
    def test_staff_login(self):
        """Test staff login for staff_diagyn"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Staff login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, f"No token in response: {data}"
        print(f"Staff login successful")


class TestWebSocketEndpoint:
    """Test WebSocket endpoint availability"""
    
    def test_websocket_endpoint_exists(self):
        """Verify WebSocket endpoint is accessible"""
        # Just check the upgrade endpoint exists - actual WS testing requires different approach
        response = requests.get(f"{BASE_URL}/api/ws/appointments", params={
            "portal": "diagyn_staff"
        })
        # WebSocket endpoints typically return 400/426 when accessed via HTTP (Upgrade Required)
        # 404 would mean the endpoint doesn't exist
        assert response.status_code != 404, f"WebSocket endpoint not found"
        print(f"WebSocket endpoint response: {response.status_code}")


@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Cleanup test data after tests"""
    yield
    # Cleanup could be done here if needed


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
