"""
Nevika Cura - Authentication V2 API Tests
Tests for two-tiered authentication system:
- Guest Mode: SMS OTP via Twilio for one-time orders
- Sign-up Mode: Email OTP via Resend for persistent accounts
- Login Mode: Email OTP for existing users
"""

import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGuestModeOTP:
    """Guest Mode - SMS OTP via Twilio for one-time orders"""
    
    def test_guest_send_otp_valid_phone(self):
        """Test sending OTP to valid 10-digit phone number"""
        phone = f"98765{random.randint(10000, 99999)}"
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/guest/send-otp",
            json={"phone": phone}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["mode"] == "guest"
        assert data["phone"] == phone
        assert "expires_in" in data
        # Note: If Twilio is working, no mock_otp is returned
        # If Twilio fails, mock_otp is returned for development
        print(f"Guest OTP sent to {phone}: mock_otp={data.get('mock_otp', 'N/A (Twilio working)')}")
    
    def test_guest_send_otp_invalid_phone_short(self):
        """Test sending OTP to invalid short phone number"""
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/guest/send-otp",
            json={"phone": "12345"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid phone number" in data["detail"]
    
    def test_guest_send_otp_with_country_code(self):
        """Test sending OTP with +91 prefix - should normalize to 10 digits"""
        # Use a fixed valid phone number with +91 prefix
        phone = "+919876543210"
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/guest/send-otp",
            json={"phone": phone}
        )
        # API normalizes phone to last 10 digits
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # Phone should be normalized to 10 digits (last 10 chars)
        assert len(data["phone"]) == 10
        assert data["phone"] == "9876543210"
    
    def test_guest_verify_otp_invalid_format(self):
        """Test verifying OTP with invalid format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/guest/verify-otp",
            json={"phone": "9876543210", "otp": "123"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid OTP format" in data["detail"]
    
    def test_guest_verify_otp_not_found(self):
        """Test verifying OTP that was never sent"""
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/guest/verify-otp",
            json={"phone": "1111111111", "otp": "123456"}
        )
        # Should return 400 (OTP not found) or Twilio error
        assert response.status_code in [400, 500]


class TestSignUpModeOTP:
    """Sign-up Mode - Email OTP via Resend for persistent accounts"""
    
    def test_signup_send_otp_valid_email(self):
        """Test sending OTP to valid email"""
        email = f"test_{random.randint(1000, 9999)}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={
                "email": email,
                "name": "Test User",
                "phone": "9876543210"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["mode"] == "signup"
        assert data["email"] == email.lower()
        assert "expires_in" in data
        # Mock OTP is returned when Resend is unavailable
        if "mock_otp" in data:
            print(f"Signup OTP for {email}: {data['mock_otp']} (MOCKED - Resend unavailable)")
        else:
            print(f"Signup OTP sent to {email} via Resend")
    
    def test_signup_send_otp_without_phone(self):
        """Test sending OTP without optional phone"""
        email = f"test_{random.randint(1000, 9999)}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={
                "email": email,
                "name": "Test User"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_signup_send_otp_invalid_email(self):
        """Test sending OTP to invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={
                "email": "invalid-email",
                "name": "Test User"
            }
        )
        assert response.status_code == 422  # Pydantic validation error
    
    def test_signup_send_otp_missing_name(self):
        """Test sending OTP without required name"""
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={
                "email": "test@example.com"
            }
        )
        assert response.status_code == 422  # Pydantic validation error
    
    def test_signup_verify_otp_and_create_account(self):
        """Test full signup flow: send OTP, verify, create account"""
        email = f"test_signup_{random.randint(10000, 99999)}@example.com"
        name = "Test Signup User"
        
        # Step 1: Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={"email": email, "name": name, "phone": "9876543210"}
        )
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        # Get mock OTP (only available when Resend is unavailable)
        mock_otp = send_data.get("mock_otp")
        if not mock_otp:
            pytest.skip("Resend is working - cannot test with mock OTP")
        
        # Step 2: Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/verify-otp",
            json={"email": email, "otp": mock_otp}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data["success"] == True
        assert "token" in verify_data
        assert "user" in verify_data
        assert verify_data["user"]["email"] == email.lower()
        assert verify_data["user"]["name"] == name
        assert "registration_id" in verify_data["user"]
        
        # Verify registration_id format: NC-REG-YYYY-XXXXX
        reg_id = verify_data["user"]["registration_id"]
        assert reg_id.startswith("NC-REG-")
        print(f"Account created: {email} -> {reg_id}")
        
        return verify_data["token"], verify_data["user"]
    
    def test_signup_duplicate_email(self):
        """Test signup with already registered email"""
        email = f"test_dup_{random.randint(10000, 99999)}@example.com"
        
        # First signup
        send1 = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={"email": email, "name": "First User"}
        )
        assert send1.status_code == 200
        mock_otp = send1.json().get("mock_otp")
        
        if mock_otp:
            # Complete first signup
            verify1 = requests.post(
                f"{BASE_URL}/api/auth/v2/signup/verify-otp",
                json={"email": email, "otp": mock_otp}
            )
            assert verify1.status_code == 200
            
            # Try to signup again with same email
            send2 = requests.post(
                f"{BASE_URL}/api/auth/v2/signup/send-otp",
                json={"email": email, "name": "Second User"}
            )
            assert send2.status_code == 400
            assert "already registered" in send2.json()["detail"]


class TestLoginModeOTP:
    """Login Mode - Email OTP for existing users"""
    
    def test_login_send_otp_unregistered_email(self):
        """Test login with unregistered email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/login/send-otp",
            json={"email": f"unregistered_{random.randint(10000, 99999)}@example.com"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "not registered" in data["detail"]
    
    def test_login_full_flow(self):
        """Test full login flow for existing user"""
        # First create a user
        email = f"test_login_{random.randint(10000, 99999)}@example.com"
        name = "Test Login User"
        
        # Signup
        signup_send = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={"email": email, "name": name}
        )
        assert signup_send.status_code == 200
        signup_otp = signup_send.json().get("mock_otp")
        
        if not signup_otp:
            pytest.skip("Resend is working - cannot test with mock OTP")
        
        signup_verify = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/verify-otp",
            json={"email": email, "otp": signup_otp}
        )
        assert signup_verify.status_code == 200
        
        # Now login
        login_send = requests.post(
            f"{BASE_URL}/api/auth/v2/login/send-otp",
            json={"email": email}
        )
        assert login_send.status_code == 200
        login_data = login_send.json()
        assert login_data["success"] == True
        assert login_data["mode"] == "login"
        assert login_data["name"] == name  # Should return user's name
        
        login_otp = login_data.get("mock_otp")
        if not login_otp:
            pytest.skip("Resend is working - cannot test with mock OTP")
        
        # Verify login OTP
        login_verify = requests.post(
            f"{BASE_URL}/api/auth/v2/login/verify-otp",
            json={"email": email, "otp": login_otp}
        )
        assert login_verify.status_code == 200
        verify_data = login_verify.json()
        
        assert verify_data["success"] == True
        assert "token" in verify_data
        assert verify_data["user"]["email"] == email.lower()
        assert "Welcome back" in verify_data["message"]
        print(f"Login successful for {email}")


class TestUserProfile:
    """User Profile - GET /api/auth/v2/me"""
    
    def test_get_profile_no_token(self):
        """Test getting profile without token"""
        response = requests.get(f"{BASE_URL}/api/auth/v2/me")
        assert response.status_code == 401
    
    def test_get_profile_invalid_token(self):
        """Test getting profile with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/v2/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401
    
    def test_get_profile_registered_user(self):
        """Test getting profile for registered user"""
        # Create user first
        email = f"test_profile_{random.randint(10000, 99999)}@example.com"
        
        signup_send = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={"email": email, "name": "Profile Test User"}
        )
        assert signup_send.status_code == 200
        mock_otp = signup_send.json().get("mock_otp")
        
        if not mock_otp:
            pytest.skip("Resend is working - cannot test with mock OTP")
        
        signup_verify = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/verify-otp",
            json={"email": email, "otp": mock_otp}
        )
        assert signup_verify.status_code == 200
        token = signup_verify.json()["token"]
        
        # Get profile
        profile_response = requests.get(
            f"{BASE_URL}/api/auth/v2/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        
        assert profile_data["authenticated"] == True
        assert profile_data["type"] == "registered"
        assert profile_data["user"]["email"] == email.lower()
        assert "registration_id" in profile_data["user"]
        print(f"Profile retrieved for {email}: {profile_data['user']['registration_id']}")


class TestTokenValidation:
    """Token Validation - POST /api/auth/v2/validate-token"""
    
    def test_validate_token_no_token(self):
        """Test validating without token"""
        response = requests.post(f"{BASE_URL}/api/auth/v2/validate-token")
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
    
    def test_validate_token_invalid(self):
        """Test validating invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/v2/validate-token",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False


class TestLogout:
    """Logout - POST /api/auth/v2/logout"""
    
    def test_logout(self):
        """Test logout endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/v2/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "Logged out" in data["message"]


class TestOTPAttemptLimits:
    """OTP Attempt Limits - Test rate limiting"""
    
    def test_signup_otp_wrong_attempts(self):
        """Test signup OTP with wrong attempts - should lock after 3 attempts"""
        email = f"test_attempts_{random.randint(10000, 99999)}@example.com"
        
        # Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/send-otp",
            json={"email": email, "name": "Test User"}
        )
        assert send_response.status_code == 200
        
        # Try wrong OTP 3 times
        for i in range(3):
            verify_response = requests.post(
                f"{BASE_URL}/api/auth/v2/signup/verify-otp",
                json={"email": email, "otp": "000000"}
            )
            assert verify_response.status_code == 400
            detail = verify_response.json()["detail"]
            # Each attempt should show remaining attempts or lock message
            if "Too many attempts" in detail:
                print(f"Locked after {i+1} attempts")
                break
            else:
                assert "attempts remaining" in detail or "Invalid OTP" in detail
        
        # After 3 attempts, next attempt should be locked
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/v2/signup/verify-otp",
            json={"email": email, "otp": "000000"}
        )
        assert verify_response.status_code == 400
        # Should either be locked or OTP not found (expired)
        detail = verify_response.json()["detail"]
        assert "Too many attempts" in detail or "OTP not found" in detail


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
