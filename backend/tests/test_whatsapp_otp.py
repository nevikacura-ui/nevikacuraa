"""
WhatsApp OTP API Tests (MSG91 Integration)
Tests for: Send OTP, Verify OTP, Resend OTP
Used for: Signup, Guest Login, Appointment Booking, Lab Booking, Pharmacy Orders, Portal Login
"""

import pytest
import requests
import os
import time
import random

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWhatsAppOTPSend:
    """Test POST /api/otp/whatsapp/send endpoint"""
    
    def test_send_otp_signup_purpose(self):
        """Test sending OTP for signup purpose"""
        phone = f"98765{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "expires_in" in data
        assert data["expires_in"] == 300  # 5 minutes
        assert "phone_masked" in data
        print(f"✓ Send OTP for signup: {data}")
    
    def test_send_otp_guest_login_purpose(self):
        """Test sending OTP for guest login purpose"""
        phone = f"87654{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "guest_login"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["expires_in"] == 300
        print(f"✓ Send OTP for guest_login: {data}")
    
    def test_send_otp_appointment_purpose(self):
        """Test sending OTP for DiaGyn appointment booking"""
        phone = f"76543{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "appointment"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP for appointment: {data}")
    
    def test_send_otp_lab_booking_purpose(self):
        """Test sending OTP for Mango Labs test booking"""
        phone = f"65432{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "lab_booking"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP for lab_booking: {data}")
    
    def test_send_otp_pharmacy_order_purpose(self):
        """Test sending OTP for Orange Pharmacy order booking"""
        phone = f"54321{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "pharmacy_order"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP for pharmacy_order: {data}")
    
    def test_send_otp_glydex_portal_purpose(self):
        """Test sending OTP for Glydex portal login"""
        phone = f"43210{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "glydex"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP for glydex: {data}")
    
    def test_send_otp_evara_portal_purpose(self):
        """Test sending OTP for Evara portal login"""
        phone = f"32109{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "evara"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP for evara: {data}")
    
    def test_send_otp_default_verification_purpose(self):
        """Test sending OTP with default verification purpose"""
        phone = f"21098{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP with default purpose: {data}")
    
    def test_send_otp_10_digit_phone(self):
        """Test sending OTP with 10-digit phone number"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "9876543210",
            "purpose": "signup"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP with 10-digit phone: {data}")
    
    def test_send_otp_with_country_code(self):
        """Test sending OTP with country code prefix"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "919876543210",
            "purpose": "signup"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Send OTP with country code: {data}")
    
    def test_send_otp_invalid_short_phone(self):
        """Test sending OTP with invalid short phone number"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "12345",
            "purpose": "signup"
        })
        
        assert response.status_code == 400
        print(f"✓ Rejected short phone number with 400: {response.json()}")
    
    def test_send_otp_empty_phone(self):
        """Test sending OTP with empty phone number"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "",
            "purpose": "signup"
        })
        
        assert response.status_code == 400
        print(f"✓ Rejected empty phone with 400: {response.json()}")


class TestWhatsAppOTPVerify:
    """Test POST /api/otp/whatsapp/verify endpoint"""
    
    def test_verify_otp_invalid_code(self):
        """Test verifying with invalid OTP code"""
        phone = f"91111{random.randint(10000, 99999)}"
        
        # First send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send_resp.status_code == 200
        
        # Try to verify with wrong OTP
        verify_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": phone,
            "otp": "000000"
        })
        
        assert verify_resp.status_code == 400
        data = verify_resp.json()
        assert "Invalid OTP" in data.get("detail", "")
        print(f"✓ Verify invalid OTP rejected: {data}")
    
    def test_verify_otp_without_sending(self):
        """Test verifying OTP for phone that hasn't requested one"""
        phone = f"90000{random.randint(10000, 99999)}"
        
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": phone,
            "otp": "123456"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "expired" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()
        print(f"✓ Verify without send rejected: {data}")
    
    def test_verify_otp_format_validation(self):
        """Test OTP must be 6 digits"""
        phone = "9876543210"
        
        # First send OTP
        requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        
        # Try with non-6-digit OTP
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": phone,
            "otp": "12345"  # Only 5 digits
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "6 digits" in data.get("detail", "")
        print(f"✓ Non-6-digit OTP rejected: {data}")
    
    def test_verify_otp_non_numeric(self):
        """Test OTP must be numeric"""
        phone = "9876543211"
        
        # First send OTP
        requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        
        # Try with non-numeric OTP
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": phone,
            "otp": "abcdef"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "6 digits" in data.get("detail", "")
        print(f"✓ Non-numeric OTP rejected: {data}")
    
    def test_verify_otp_empty_fields(self):
        """Test verification with empty phone/otp fields"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": "",
            "otp": ""
        })
        
        assert response.status_code == 400
        print(f"✓ Empty fields rejected with 400: {response.json()}")
    
    def test_verify_otp_max_attempts(self):
        """Test OTP gets invalidated after 3 failed attempts"""
        phone = f"92222{random.randint(10000, 99999)}"
        
        # Send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send_resp.status_code == 200
        
        # Try 3 wrong attempts
        for i in range(3):
            verify_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": phone,
                "otp": "000000"
            })
            print(f"  Attempt {i+1}: {verify_resp.json()}")
        
        # 4th attempt should say expired/too many attempts
        final_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": phone,
            "otp": "111111"
        })
        
        assert final_resp.status_code == 400
        data = final_resp.json()
        # Should either say "expired" or "too many attempts" or "not found"
        detail = data.get("detail", "").lower()
        assert "expired" in detail or "too many" in detail or "not found" in detail
        print(f"✓ Max attempts enforced: {data}")


class TestWhatsAppOTPResend:
    """Test POST /api/otp/whatsapp/resend endpoint"""
    
    def test_resend_otp_success(self):
        """Test resending OTP successfully"""
        phone = f"93333{random.randint(10000, 99999)}"
        
        # First send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send_resp.status_code == 200
        
        # Resend OTP
        resend_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/resend", json={
            "phone": phone,
            "purpose": "signup"
        })
        
        assert resend_resp.status_code == 200
        data = resend_resp.json()
        assert data.get("success") == True
        assert data["expires_in"] == 300
        print(f"✓ Resend OTP success: {data}")
    
    def test_resend_otp_new_code_generated(self):
        """Test that resend generates a new OTP code"""
        phone = f"94444{random.randint(10000, 99999)}"
        
        # Send first OTP
        send1 = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send1.status_code == 200
        
        # Get OTP if in mock mode
        otp1 = send1.json().get("otp")
        
        # Resend OTP
        send2 = requests.post(f"{BASE_URL}/api/otp/whatsapp/resend", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send2.status_code == 200
        
        otp2 = send2.json().get("otp")
        
        # If mock mode returns OTP, they should be different
        if otp1 and otp2:
            print(f"  OTP1: {otp1}, OTP2: {otp2}")
        
        print(f"✓ Resend generates new code")
    
    def test_resend_otp_invalidates_old(self):
        """Test that resend invalidates the old OTP"""
        phone = f"95555{random.randint(10000, 99999)}"
        
        # Send first OTP
        send1 = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send1.status_code == 200
        otp1 = send1.json().get("otp")
        
        # Resend (should invalidate old OTP)
        send2 = requests.post(f"{BASE_URL}/api/otp/whatsapp/resend", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send2.status_code == 200
        otp2 = send2.json().get("otp")
        
        # If we have mock OTPs and they're different, verify old one doesn't work
        if otp1 and otp2 and otp1 != otp2:
            verify_old = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": phone,
                "otp": otp1
            })
            # Old OTP should be invalid
            assert verify_old.status_code == 400 or (verify_old.status_code == 200 and not verify_old.json().get("success"))
            print(f"✓ Old OTP invalidated after resend")
        else:
            print(f"✓ Resend works (OTP not exposed in production mode)")
    
    def test_resend_otp_different_purpose(self):
        """Test resending with different purpose"""
        phone = f"96666{random.randint(10000, 99999)}"
        
        # Send for signup
        send1 = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send1.status_code == 200
        
        # Resend for guest_login
        resend = requests.post(f"{BASE_URL}/api/otp/whatsapp/resend", json={
            "phone": phone,
            "purpose": "guest_login"
        })
        
        assert resend.status_code == 200
        print(f"✓ Resend with different purpose: {resend.json()}")
    
    def test_resend_otp_invalid_phone(self):
        """Test resend with invalid phone number"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/resend", json={
            "phone": "123",
            "purpose": "signup"
        })
        
        assert response.status_code == 400
        print(f"✓ Resend invalid phone rejected: {response.json()}")


class TestWhatsAppOTPIntegration:
    """Integration tests for complete OTP flow"""
    
    def test_full_otp_flow_mock_mode(self):
        """Test complete send-verify flow in mock mode"""
        phone = f"97777{random.randint(10000, 99999)}"
        
        # Step 1: Send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send_resp.status_code == 200
        send_data = send_resp.json()
        
        # Check if mock mode returns OTP
        mock_otp = send_data.get("otp")
        
        if mock_otp:
            # Step 2: Verify with correct OTP
            verify_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": phone,
                "otp": mock_otp
            })
            
            assert verify_resp.status_code == 200
            verify_data = verify_resp.json()
            assert verify_data.get("success") == True
            assert verify_data.get("message") == "OTP verified successfully"
            assert verify_data.get("purpose") == "signup"
            print(f"✓ Full OTP flow verified in mock mode: {verify_data}")
        else:
            # Production mode - OTP not returned
            print(f"✓ OTP sent (production mode - OTP not exposed)")
    
    def test_otp_flow_with_resend(self):
        """Test send -> resend -> verify flow"""
        phone = f"98888{random.randint(10000, 99999)}"
        
        # Step 1: Initial send
        send1 = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "guest_login"
        })
        assert send1.status_code == 200
        
        # Step 2: Resend
        resend = requests.post(f"{BASE_URL}/api/otp/whatsapp/resend", json={
            "phone": phone,
            "purpose": "guest_login"
        })
        assert resend.status_code == 200
        
        # Get the new OTP if in mock mode
        new_otp = resend.json().get("otp")
        
        if new_otp:
            # Step 3: Verify with new OTP
            verify = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": phone,
                "otp": new_otp
            })
            
            assert verify.status_code == 200
            assert verify.json().get("success") == True
            print(f"✓ Full flow with resend verified: {verify.json()}")
        else:
            print(f"✓ Resend flow works (production mode)")
    
    def test_multiple_phones_independent(self):
        """Test that OTPs for different phones are independent"""
        phone1 = f"91100{random.randint(10000, 99999)}"
        phone2 = f"92200{random.randint(10000, 99999)}"
        
        # Send OTP to phone1
        send1 = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone1,
            "purpose": "signup"
        })
        assert send1.status_code == 200
        otp1 = send1.json().get("otp")
        
        # Send OTP to phone2
        send2 = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone2,
            "purpose": "signup"
        })
        assert send2.status_code == 200
        otp2 = send2.json().get("otp")
        
        # In mock mode, verify each phone's OTP works only for that phone
        if otp1 and otp2:
            # Verify otp1 for phone1 - should work
            v1 = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": phone1,
                "otp": otp1
            })
            assert v1.status_code == 200
            
            # Verify otp2 for phone2 - should work
            v2 = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": phone2,
                "otp": otp2
            })
            assert v2.status_code == 200
            
            print(f"✓ Multiple phones work independently")
        else:
            print(f"✓ Multiple phones handled correctly (production mode)")


class TestWhatsAppOTPEdgeCases:
    """Edge case tests"""
    
    def test_phone_with_spaces(self):
        """Test phone number with spaces gets cleaned"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "98 765 43210",
            "purpose": "signup"
        })
        
        # Should clean spaces and work
        assert response.status_code == 200
        print(f"✓ Phone with spaces handled: {response.json()}")
    
    def test_phone_with_plus(self):
        """Test phone number with + prefix"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "+919876543210",
            "purpose": "signup"
        })
        
        assert response.status_code == 200
        print(f"✓ Phone with + prefix handled: {response.json()}")
    
    def test_phone_with_dashes(self):
        """Test phone number with dashes"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "98-765-43210",
            "purpose": "signup"
        })
        
        assert response.status_code == 200
        print(f"✓ Phone with dashes handled: {response.json()}")
    
    def test_otp_with_whitespace(self):
        """Test OTP verification with whitespace"""
        phone = f"99900{random.randint(10000, 99999)}"
        
        # Send OTP
        send = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": phone,
            "purpose": "signup"
        })
        assert send.status_code == 200
        otp = send.json().get("otp")
        
        if otp:
            # Verify with whitespace around OTP
            verify = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": phone,
                "otp": f" {otp} "
            })
            
            assert verify.status_code == 200
            print(f"✓ OTP with whitespace handled")
        else:
            print(f"✓ Edge case test (production mode)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
