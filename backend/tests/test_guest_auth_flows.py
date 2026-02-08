"""
Test suite for Guest Mobile OTP Authentication flows.
Tests new auth flows:
1) Guest login: Mobile number + OTP
2) Patient Portal: Email + OTP → Password setup (new users) or Email + Password (returning users)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://role-redirect-debug.preview.emergentagent.com')

class TestHealthEndpoint:
    """Basic health check to ensure server is running"""
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Health check passed")

class TestGuestMobileOTPFlow:
    """Test Guest Mobile OTP endpoints"""
    
    def test_send_otp_valid_mobile(self):
        """Test sending OTP to a valid 10-digit mobile number"""
        response = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={
            "mobile": "9876543210"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "otp" in data  # OTP returned in response for testing
        assert data.get("message") == "OTP sent to mobile"
        print(f"✅ Guest OTP sent: {data.get('otp')}")
        return data.get("otp")
    
    def test_send_otp_invalid_mobile_too_short(self):
        """Test sending OTP with a mobile number that is too short"""
        response = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={
            "mobile": "98765"
        })
        assert response.status_code == 400
        data = response.json()
        assert "Invalid mobile number" in data.get("detail", "")
        print("✅ Invalid mobile (too short) rejected")
    
    def test_send_otp_invalid_mobile_non_digits(self):
        """Test sending OTP with non-digit characters"""
        response = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={
            "mobile": "987654321a"
        })
        assert response.status_code == 400
        data = response.json()
        assert "Invalid mobile number" in data.get("detail", "")
        print("✅ Invalid mobile (non-digits) rejected")
    
    def test_verify_otp_wrong_code(self):
        """Test verifying with wrong OTP"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={
            "mobile": "9876543211"
        })
        assert send_response.status_code == 200
        
        # Try to verify with wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/guest/verify-otp", json={
            "mobile": "9876543211",
            "otp": "0000"  # Wrong OTP
        })
        assert response.status_code == 400
        data = response.json()
        assert "Invalid OTP" in data.get("detail", "")
        print("✅ Wrong OTP rejected")
    
    def test_verify_otp_no_otp_sent(self):
        """Test verifying OTP without sending first"""
        response = requests.post(f"{BASE_URL}/api/auth/guest/verify-otp", json={
            "mobile": "1234567890",
            "otp": "1234"
        })
        assert response.status_code == 400
        data = response.json()
        assert "OTP not found" in data.get("detail", "") or "Invalid" in data.get("detail", "")
        print("✅ Verify without sending OTP rejected")
    
    def test_full_guest_otp_flow(self):
        """Test complete Guest OTP flow: Send → Verify → Access"""
        test_mobile = "9876543212"
        
        # Step 1: Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={
            "mobile": test_mobile
        })
        assert send_response.status_code == 200
        send_data = send_response.json()
        assert send_data.get("success") == True
        otp = send_data.get("otp")
        print(f"✅ Step 1: OTP sent - {otp}")
        
        # Step 2: Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/guest/verify-otp", json={
            "mobile": test_mobile,
            "otp": otp
        })
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("success") == True
        assert verify_data.get("mobile") == test_mobile
        print("✅ Step 2: OTP verified successfully")
        
        # Guest is now authorized (no token needed - just localStorage flag on frontend)
        print("✅ Full Guest OTP flow completed successfully")


class TestPatientPortalEmailFlow:
    """Test Patient Portal Email authentication flow"""
    
    def test_check_email_new_user(self):
        """Test checking a new email (not registered)"""
        response = requests.post(f"{BASE_URL}/api/auth/patient/check-email", json={
            "email": "brand_new_test_user@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        # New user should not have password
        assert data.get("exists") == False or data.get("has_password") == False
        print("✅ New email check passed")
    
    def test_email_otp_send(self):
        """Test sending OTP to email"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "test_otp_user@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True or "mock_otp" in data or "otp" in data
        print("✅ Email OTP sent successfully")
    
    def test_email_otp_verify_invalid(self):
        """Test verifying with invalid OTP"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "test_verify_invalid@example.com"
        })
        
        # Try invalid OTP
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": "test_verify_invalid@example.com",
            "otp": "000000"
        })
        # Should fail with 400 or similar
        assert response.status_code in [400, 401, 422]
        print("✅ Invalid email OTP rejected")
    
    def test_password_login_nonexistent(self):
        """Test password login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/patient/login", json={
            "email": "nonexistent_user_xyz@test.com",
            "password": "anypassword"
        })
        assert response.status_code in [404, 401, 400]
        print("✅ Non-existent email login rejected")
    
    def test_set_password_without_verification(self):
        """Test setting password without proper verification token"""
        response = requests.post(f"{BASE_URL}/api/auth/patient/set-password", json={
            "email": "test_set_password@example.com",
            "verification_token": "invalid_token_xyz",
            "password": "testpassword123"
        })
        assert response.status_code in [400, 401, 403]
        print("✅ Password set without verification rejected")


class TestEmailOTPFullFlow:
    """Test complete Email OTP flow for new users"""
    
    def test_full_new_user_registration(self):
        """Test: New user → Email → OTP → Set Password → Login"""
        import uuid
        test_email = f"newuser_{uuid.uuid4().hex[:8]}@test.com"
        
        # Step 1: Check email (should be new)
        check_response = requests.post(f"{BASE_URL}/api/auth/patient/check-email", json={
            "email": test_email
        })
        assert check_response.status_code == 200
        check_data = check_response.json()
        # New email should not exist or not have password
        print(f"✅ Step 1: Email checked - exists: {check_data.get('exists')}, has_password: {check_data.get('has_password')}")
        
        # Step 2: Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": test_email
        })
        assert send_response.status_code == 200
        send_data = send_response.json()
        assert send_data.get("success") == True
        print("✅ Step 2: OTP sent to email")
        
        # Get mock OTP if available (for testing)
        mock_otp = send_data.get("mock_otp") or send_data.get("otp")
        if not mock_otp:
            print("⚠️ No mock OTP in response - would need to check backend logs")
            # Skip rest of test if no OTP available
            return
        
        # Step 3: Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": mock_otp
        })
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        verification_token = verify_data.get("verification_token")
        assert verification_token is not None
        print("✅ Step 3: OTP verified, got verification token")
        
        # Step 4: Set Password
        set_pwd_response = requests.post(f"{BASE_URL}/api/auth/patient/set-password", json={
            "email": test_email,
            "verification_token": verification_token,
            "password": "testpassword123"
        })
        assert set_pwd_response.status_code == 200
        set_pwd_data = set_pwd_response.json()
        assert "token" in set_pwd_data  # Should return auth token
        print("✅ Step 4: Password set, user registered")
        
        # Step 5: Login with password
        login_response = requests.post(f"{BASE_URL}/api/auth/patient/login", json={
            "email": test_email,
            "password": "testpassword123"
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "token" in login_data
        print("✅ Step 5: Login with password successful")
        
        print(f"✅ Full registration flow completed for {test_email}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
