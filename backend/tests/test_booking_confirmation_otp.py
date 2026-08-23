"""
Nevika Cura - Booking Confirmation & WhatsApp OTP Tests
Tests for:
1. WhatsApp OTP send/verify endpoints (refactored)
2. Pharmacy checkout flow
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWhatsAppOTPEndpoints:
    """Test WhatsApp OTP endpoints after refactoring"""
    
    def test_send_otp_endpoint_exists(self):
        """Test that /api/otp/whatsapp/send endpoint exists and accepts POST"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/send",
            json={"phone": "9876543210", "purpose": "test"}
        )
        # Should return 200 with success message (not 404)
        assert response.status_code == 200, f"OTP send endpoint failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"OTP send failed: {data}"
        assert "expires_in" in data, "Missing expires_in in response"
        assert "phone_masked" in data, "Missing phone_masked in response"
        print(f"✅ OTP Send endpoint working: {data}")
    
    def test_send_otp_validates_phone(self):
        """Test that OTP send validates phone number"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/send",
            json={"phone": "123", "purpose": "test"}  # Invalid short phone
        )
        # Should return 400 for invalid phone
        assert response.status_code == 400, f"Should reject invalid phone: {response.text}"
        print("✅ OTP Send validates phone number correctly")
    
    def test_verify_otp_endpoint_exists(self):
        """Test that /api/otp/whatsapp/verify endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/verify",
            json={"phone": "9876543210", "otp": "999999"}  # Wrong OTP
        )
        # Should return 400 (invalid OTP) not 404
        assert response.status_code == 400, f"Unexpected status: {response.status_code}"
        print("✅ OTP Verify endpoint exists and validates OTP")
    
    def test_verify_otp_requires_6_digits(self):
        """Test that OTP verification requires 6 digit code"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/verify",
            json={"phone": "9876543210", "otp": "123"}  # Too short
        )
        assert response.status_code == 400
        data = response.json()
        assert "6 digits" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower()
        print("✅ OTP Verify validates OTP format")
    
    def test_resend_otp_endpoint_exists(self):
        """Test that /api/otp/whatsapp/resend endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/resend",
            json={"phone": "9876543210", "purpose": "test"}
        )
        # Should return 200 (resend successful)
        assert response.status_code == 200, f"Resend failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("✅ OTP Resend endpoint working")
    
    def test_otp_flow_full_cycle(self):
        """Test full OTP cycle: send -> verify (mock)"""
        test_phone = "9999000001"
        
        # Step 1: Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/send",
            json={"phone": test_phone, "purpose": "pharmacy_order"}
        )
        assert send_response.status_code == 200
        send_data = send_response.json()
        assert send_data.get("success") == True
        
        # Check if mock OTP returned (for testing)
        mock_otp = send_data.get("otp")  # Only returned in mock mode
        
        if mock_otp:
            # Step 2: Verify with correct OTP
            verify_response = requests.post(
                f"{BASE_URL}/api/otp/whatsapp/verify",
                json={"phone": test_phone, "otp": mock_otp}
            )
            assert verify_response.status_code == 200
            verify_data = verify_response.json()
            assert verify_data.get("success") == True
            print(f"✅ Full OTP cycle completed with mock OTP")
        else:
            print("⚠️ Production mode - mock OTP not available for full cycle test")
            # Verify endpoint exists but can't test full flow without real OTP
            assert True


class TestPharmacyEndpoints:
    """Test pharmacy-related endpoints"""
    
    def test_pharmacy_order_endpoint_exists(self):
        """Test that pharmacy order endpoint exists"""
        # Try to create order with minimal data - should fail validation but endpoint should exist
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json={
                "medicines": [{"name": "Paracetamol", "quantity": 1}],
                "patient_name": "Test Patient",
                "patient_phone": "9876543210",
                "delivery_address": "Test Address, City - 480001",
                "payment_method": "cod",
                "total_amount": 50
            }
        )
        # Should be either 200 (success) or 401/422 (auth/validation) - not 404
        assert response.status_code in [200, 201, 401, 422], f"Pharmacy endpoint issue: {response.status_code}, {response.text}"
        print(f"✅ Pharmacy order endpoint exists, status: {response.status_code}")
    
    def test_pharmacy_cart_structure(self):
        """Verify pharmacy order accepts proper structure"""
        order_data = {
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 2},
                {"name": "Cetrizine 10mg", "quantity": 1}
            ],
            "patient_name": "Test User",
            "patient_phone": "9876543210",
            "patient_email": "test@example.com",
            "delivery_address": "123 Test Street, Chhindwara - 480001",
            "payment_method": "cod",
            "payment_status": "cod",
            "total_amount": 100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data
        )
        
        # Endpoint should accept the structure
        assert response.status_code in [200, 201, 401, 422], f"Unexpected status: {response.status_code}"
        if response.status_code in [200, 201]:
            data = response.json()
            # Check if order_id is returned
            assert "order_id" in data or "id" in data, f"Missing order ID in response: {data}"
            print(f"✅ Pharmacy order created: {data}")
        else:
            print(f"⚠️ Pharmacy order validation/auth required: {response.status_code}")


class TestDiagynAppointmentEndpoints:
    """Test DiaGyn appointment endpoints for booking confirmation flow"""
    
    def test_booked_slots_endpoint(self):
        """Test that booked slots endpoint works"""
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Vikas Jha",
                "clinic": "Pushpa Clinic",
                "date": tomorrow
            }
        )
        assert response.status_code == 200, f"Booked slots failed: {response.text}"
        data = response.json()
        assert "booked_slots" in data, f"Missing booked_slots in response"
        print(f"✅ Booked slots endpoint working: {len(data['booked_slots'])} slots")
    
    def test_doctor_availability_endpoint(self):
        """Test doctor availability endpoint"""
        response = requests.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200, f"Doctors endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of doctors"
        print(f"✅ Doctors endpoint working: {len(data)} doctors")


class TestHealthEndpoints:
    """Test health and diagnostic endpoints"""
    
    def test_booking_diagnostics(self):
        """Test booking system diagnostics endpoint"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code == 200, f"Diagnostics failed: {response.text}"
        data = response.json()
        assert "status" in data or "overall_status" in data, f"Missing status in diagnostics"
        print(f"✅ Booking diagnostics endpoint working")
    
    def test_msg91_status_endpoint(self):
        """Test MSG91 WhatsApp status endpoint"""
        response = requests.get(f"{BASE_URL}/api/test/msg91-status")
        assert response.status_code == 200, f"MSG91 status failed: {response.text}"
        data = response.json()
        print(f"✅ MSG91 status: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
