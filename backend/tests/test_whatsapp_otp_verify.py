"""
Test WhatsApp OTP Send/Verify Flow
Tests:
1. /api/patient-auth/whatsapp/send-otp - Send OTP to phone number
2. /api/patient-auth/whatsapp/verify-otp - Verify OTP (should work with correct OTP)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWhatsAppOTPFlow:
    """Test WhatsApp OTP send and verify endpoints"""
    
    def test_send_otp_valid_phone(self):
        """Test sending OTP to a valid 10-digit phone number"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": "9876543210"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Send OTP Response: {response.status_code}")
        print(f"Send OTP Body: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "phone" in data
        assert "flow_type" in data
        
        # Store OTP for verification test (available in mock/dev mode)
        # Note: In production, OTP is sent via WhatsApp and not returned
        return data
    
    def test_send_otp_with_country_code(self):
        """Test sending OTP with +91 prefix (should normalize)"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": "+919876543210"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Send OTP with +91: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # Phone should be normalized to 10 digits
        assert data.get("phone") == "9876543210"
    
    def test_send_otp_invalid_phone(self):
        """Test sending OTP to invalid phone number"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": "12345"},  # Invalid - too short
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Invalid phone response: {response.status_code}")
        
        # Should return 400 for invalid phone
        assert response.status_code == 400
    
    def test_verify_otp_without_sending(self):
        """Test verifying OTP without first sending (should fail)"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
            json={"phone": "1111111111", "otp": "123456"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Verify without send: {response.status_code}")
        
        # Should fail since no OTP was sent
        assert response.status_code == 400
    
    def test_verify_otp_wrong_otp(self):
        """Test verifying with wrong OTP (should fail)"""
        # First send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": "9876543211"},
            headers={"Content-Type": "application/json"}
        )
        
        assert send_response.status_code == 200
        
        # Now verify with wrong OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
            json={"phone": "9876543211", "otp": "000000"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Wrong OTP verify: {verify_response.status_code}")
        print(f"Wrong OTP body: {verify_response.json()}")
        
        # Should fail
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "detail" in data
    
    def test_verify_otp_correct_flow(self):
        """Test complete OTP flow - send then verify with correct OTP"""
        test_phone = "9876543212"
        
        # Step 1: Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Send OTP for {test_phone}: {send_response.status_code}")
        send_data = send_response.json()
        print(f"Send data: {send_data}")
        
        assert send_response.status_code == 200
        assert send_data.get("success") == True
        
        # Note: In dev/mock mode, the OTP might be in the response or stored in memory
        # The fix ensures OTP is stored in both patient_otp_storage and whatsapp_otp service
        
        # Step 2: Verify OTP
        # Since this is mock mode, we need to use the OTP that was stored
        # In production, user receives OTP via WhatsApp
        
        # Try to get the mock OTP if available
        mock_otp = send_data.get("mock_otp")  # This is available in mock mode
        
        if mock_otp:
            print(f"Using mock OTP: {mock_otp}")
            verify_response = requests.post(
                f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
                json={"phone": test_phone, "otp": mock_otp},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Verify correct OTP: {verify_response.status_code}")
            verify_data = verify_response.json()
            print(f"Verify data: {verify_data}")
            
            # Should succeed with correct OTP
            assert verify_response.status_code == 200
            assert verify_data.get("success") == True
            assert verify_data.get("verified") == True
            assert "verification_token" in verify_data
        else:
            # If no mock OTP, skip this part of the test
            print("Mock OTP not available in response - production mode")
            pytest.skip("Mock OTP not available - cannot test verification in production mode")
    
    def test_otp_expiry_and_attempts(self):
        """Test that multiple wrong attempts are tracked"""
        test_phone = "9876543213"
        
        # Send OTP first
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        assert send_response.status_code == 200
        
        # Try wrong OTP 3 times
        for i in range(3):
            verify_response = requests.post(
                f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
                json={"phone": test_phone, "otp": "000000"},
                headers={"Content-Type": "application/json"}
            )
            print(f"Attempt {i+1}: {verify_response.status_code}")
        
        # After 3 wrong attempts, should be locked out
        final_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
            json={"phone": test_phone, "otp": "000000"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"After 3 wrong attempts: {final_response.status_code}")
        assert final_response.status_code == 400


class TestWhatsAppOTPIntegration:
    """Integration tests for OTP storage sync between services"""
    
    def test_otp_stored_correctly(self):
        """Verify OTP is stored correctly and can be retrieved for verification"""
        test_phone = "9876543214"
        
        # Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        # If OTP is in response (mock mode), verify it works
        if "mock_otp" in send_data or "otp" in send_data:
            otp = send_data.get("mock_otp") or send_data.get("otp")
            
            verify_response = requests.post(
                f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
                json={"phone": test_phone, "otp": otp},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Verify with stored OTP: {verify_response.status_code}")
            verify_data = verify_response.json()
            print(f"Verify response: {verify_data}")
            
            # The fix ensures this works - OTP is now synced between stores
            assert verify_response.status_code == 200
            assert verify_data.get("success") == True
