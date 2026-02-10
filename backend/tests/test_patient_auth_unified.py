"""
Test Suite for Patient Authentication System (Unified Login/Signup)
- Email OTP signup flow
- WhatsApp OTP signup flow
- Password creation after OTP verification
- Login with password
- Full e2e authentication flow
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://innerscore-health.preview.emergentagent.com')

class TestEmailOTPFlow:
    """Test Email OTP send and verify endpoints"""
    
    def test_email_send_otp_success(self):
        """Test sending OTP to email - should return mock_otp for testing"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert data["email"] == test_email
        assert "mock_otp" in data, "mock_otp should be returned for testing"
        assert len(data["mock_otp"]) == 6, "OTP should be 6 digits"
        assert data["flow_type"] == "signup"  # New user should get signup flow
        assert data["has_password"] == False  # New user has no password
        assert data["expires_in"] == 600  # 10 minutes
        
        # Store for later tests
        self.__class__.test_email = test_email
        self.__class__.email_otp = data["mock_otp"]
    
    def test_email_send_otp_invalid_email(self):
        """Test sending OTP with invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": "invalid-email"},
            headers={"Content-Type": "application/json"}
        )
        
        # FastAPI/Pydantic should reject invalid email
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
    
    def test_email_verify_otp_success(self):
        """Test verifying email OTP - should return verification_token"""
        # First send OTP
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        assert send_response.status_code == 200
        otp = send_response.json()["mock_otp"]
        
        # Now verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}: {verify_response.text}"
        data = verify_response.json()
        
        assert data["success"] == True
        assert data["verified"] == True
        assert data["email"] == test_email
        assert "verification_token" in data
        assert len(data["verification_token"]) > 0
        assert data["needs_password"] == True  # New user needs to set password
        
        # Store for password creation test
        self.__class__.verification_token = data["verification_token"]
        self.__class__.verified_email = test_email
    
    def test_email_verify_otp_invalid(self):
        """Test verifying with wrong OTP"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send OTP first
        requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        
        # Try wrong OTP
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": "000000"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid OTP, got {response.status_code}"
        assert "Invalid OTP" in response.json().get("detail", "")
    
    def test_email_verify_otp_not_found(self):
        """Test verifying OTP that was never requested"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": "never_requested@example.com", "otp": "123456"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        assert "not found" in response.json().get("detail", "").lower()


class TestWhatsAppOTPFlow:
    """Test WhatsApp OTP send and verify endpoints"""
    
    def test_whatsapp_send_otp_success(self):
        """Test sending OTP via WhatsApp - should return mock_otp"""
        test_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert "phone" in data
        assert len(data["phone"]) == 10  # Should be normalized to 10 digits
        assert "mock_otp" in data
        assert len(data["mock_otp"]) == 6
        assert data["flow_type"] == "signup"
        assert data["has_password"] == False
        
        self.__class__.test_phone = data["phone"]
        self.__class__.whatsapp_otp = data["mock_otp"]
    
    def test_whatsapp_send_otp_invalid_phone(self):
        """Test sending OTP with invalid phone number"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": "123"},  # Too short
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
        assert "valid" in response.json().get("detail", "").lower()
    
    def test_whatsapp_send_otp_with_country_code(self):
        """Test phone number normalization with +91 prefix"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": "+919876543210"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "9876543210"  # Should strip +91
    
    def test_whatsapp_verify_otp_success(self):
        """Test verifying WhatsApp OTP"""
        test_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        
        # Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        assert send_response.status_code == 200
        data = send_response.json()
        otp = data["mock_otp"]
        phone = data["phone"]
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
            json={"phone": phone, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}: {verify_response.text}"
        verify_data = verify_response.json()
        
        assert verify_data["success"] == True
        assert verify_data["verified"] == True
        assert "verification_token" in verify_data
        assert verify_data["needs_email"] == True  # WhatsApp signups need email
        assert verify_data["needs_password"] == True
        
        self.__class__.whatsapp_verification_token = verify_data["verification_token"]
        self.__class__.verified_phone = phone


class TestPasswordCreation:
    """Test password creation after OTP verification"""
    
    def test_create_password_email_signup(self):
        """Test creating password after email OTP verification"""
        # First do full email flow
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        otp = send_response.json()["mock_otp"]
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        # Create password
        password_response = requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "TestPass123!",
                "name": "Test User"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert password_response.status_code == 200, f"Expected 200, got {password_response.status_code}: {password_response.text}"
        data = password_response.json()
        
        assert data["success"] == True
        assert "token" in data
        assert len(data["token"]) > 0
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["name"] == "Test User"
        assert "patient_id" in data["user"]
        assert data["user"]["patient_id"].startswith("NC-PAT-")
        
        # Store for login test
        self.__class__.created_email = test_email
        self.__class__.created_password = "TestPass123!"
    
    def test_create_password_whatsapp_signup(self):
        """Test creating password after WhatsApp OTP verification (requires email)"""
        test_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        test_email = f"whatsapp_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send WhatsApp OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        data = send_response.json()
        otp = data["mock_otp"]
        phone = data["phone"]
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
            json={"phone": phone, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        # Create password (with email for WhatsApp signup)
        password_response = requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "WhatsAppPass123!",
                "name": "WhatsApp User",
                "email": test_email  # Required for WhatsApp signup
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert password_response.status_code == 200, f"Expected 200, got {password_response.status_code}: {password_response.text}"
        data = password_response.json()
        
        assert data["success"] == True
        assert data["user"]["email"] == test_email
        assert data["user"]["phone"] == phone
        
        self.__class__.whatsapp_email = test_email
        self.__class__.whatsapp_phone = phone
    
    def test_create_password_whatsapp_without_email(self):
        """Test that WhatsApp signup without email fails"""
        test_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        
        # Send WhatsApp OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        data = send_response.json()
        otp = data["mock_otp"]
        phone = data["phone"]
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
            json={"phone": phone, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        # Try to create password without email
        password_response = requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "NoEmailPass123!"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert password_response.status_code == 400, f"Expected 400, got {password_response.status_code}"
        assert "email" in password_response.json().get("detail", "").lower()
    
    def test_create_password_short_password(self):
        """Test that short password is rejected"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send and verify OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        otp = send_response.json()["mock_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        # Try short password
        password_response = requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "12345"  # Only 5 chars
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert password_response.status_code == 400
        assert "6 characters" in password_response.json().get("detail", "")
    
    def test_create_password_invalid_token(self):
        """Test creating password with invalid verification token"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": "invalid-token-12345",
                "password": "ValidPass123!"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        assert "expired" in response.json().get("detail", "").lower() or "verification" in response.json().get("detail", "").lower()


class TestLoginWithPassword:
    """Test login with email/phone and password"""
    
    def test_login_email_password_success(self):
        """Test login with email and password"""
        # First create an account
        test_email = f"login_test_{uuid.uuid4().hex[:8]}@example.com"
        test_password = "LoginTest123!"
        
        # Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        otp = send_response.json()["mock_otp"]
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        # Create account
        requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": test_password,
                "name": "Login Test User"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Now login
        login_response = requests.post(
            f"{BASE_URL}/api/patient-auth/login",
            json={
                "identifier": test_email,
                "password": test_password
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert login_response.status_code == 200, f"Expected 200, got {login_response.status_code}: {login_response.text}"
        data = login_response.json()
        
        assert data["success"] == True
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert "Welcome back" in data["message"]
    
    def test_login_phone_password_success(self):
        """Test login with phone number and password"""
        # Create account via WhatsApp flow
        test_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        test_email = f"phone_login_{uuid.uuid4().hex[:8]}@example.com"
        test_password = "PhoneLogin123!"
        
        # Send WhatsApp OTP
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/send-otp",
            json={"phone": test_phone},
            headers={"Content-Type": "application/json"}
        )
        data = send_response.json()
        otp = data["mock_otp"]
        phone = data["phone"]
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/whatsapp/verify-otp",
            json={"phone": phone, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        # Create account
        requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": test_password,
                "name": "Phone Login User",
                "email": test_email
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Now login with phone
        login_response = requests.post(
            f"{BASE_URL}/api/patient-auth/login",
            json={
                "identifier": phone,
                "password": test_password
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert login_response.status_code == 200, f"Expected 200, got {login_response.status_code}: {login_response.text}"
        data = login_response.json()
        
        assert data["success"] == True
        assert data["user"]["phone"] == phone
    
    def test_login_invalid_password(self):
        """Test login with wrong password"""
        # Create account first
        test_email = f"wrong_pass_{uuid.uuid4().hex[:8]}@example.com"
        
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        otp = send_response.json()["mock_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "CorrectPass123!"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Try wrong password
        login_response = requests.post(
            f"{BASE_URL}/api/patient-auth/login",
            json={
                "identifier": test_email,
                "password": "WrongPassword!"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert login_response.status_code == 401
        assert "Invalid" in login_response.json().get("detail", "")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/login",
            json={
                "identifier": "nonexistent_user@example.com",
                "password": "AnyPassword123!"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401


class TestExistingUserFlow:
    """Test flow for existing users (login_with_password, set_password)"""
    
    def test_existing_user_with_password_gets_login_flow(self):
        """Test that existing user with password gets login_with_password flow"""
        # Create account first
        test_email = f"existing_{uuid.uuid4().hex[:8]}@example.com"
        
        # Full signup flow
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        otp = send_response.json()["mock_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "ExistingUser123!"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Now try to send OTP again (existing user)
        second_send = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        
        assert second_send.status_code == 200
        data = second_send.json()
        
        assert data["flow_type"] == "login_with_password"
        assert data["has_password"] == True


class TestTokenValidation:
    """Test token validation endpoint"""
    
    def test_validate_token_valid(self):
        """Test validating a valid token"""
        # Create account and get token
        test_email = f"token_test_{uuid.uuid4().hex[:8]}@example.com"
        
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        otp = send_response.json()["mock_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        password_response = requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "TokenTest123!"
            },
            headers={"Content-Type": "application/json"}
        )
        token = password_response.json()["token"]
        
        # Validate token
        validate_response = requests.post(
            f"{BASE_URL}/api/patient-auth/validate-token",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert validate_response.status_code == 200
        data = validate_response.json()
        
        assert data["valid"] == True
        assert data["type"] == "patient"
    
    def test_validate_token_invalid(self):
        """Test validating an invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/patient-auth/validate-token",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid-token-12345"
            }
        )
        
        assert response.status_code == 200  # Returns 200 with valid=false
        data = response.json()
        assert data["valid"] == False


class TestGetCurrentPatient:
    """Test get current patient profile endpoint"""
    
    def test_get_me_authenticated(self):
        """Test getting current patient profile with valid token"""
        # Create account and get token
        test_email = f"me_test_{uuid.uuid4().hex[:8]}@example.com"
        
        send_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/send-otp",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        otp = send_response.json()["mock_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/patient-auth/email/verify-otp",
            json={"email": test_email, "otp": otp},
            headers={"Content-Type": "application/json"}
        )
        verification_token = verify_response.json()["verification_token"]
        
        password_response = requests.post(
            f"{BASE_URL}/api/patient-auth/create-password",
            json={
                "verification_token": verification_token,
                "password": "MeTest123!",
                "name": "Me Test User"
            },
            headers={"Content-Type": "application/json"}
        )
        token = password_response.json()["token"]
        
        # Get current patient
        me_response = requests.get(
            f"{BASE_URL}/api/patient-auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Expected 200, got {me_response.status_code}: {me_response.text}"
        data = me_response.json()
        
        assert data["authenticated"] == True
        assert data["user"]["email"] == test_email
        assert data["user"]["name"] == "Me Test User"
        assert "password_hash" not in data["user"]  # Should not expose password
    
    def test_get_me_unauthenticated(self):
        """Test getting current patient without token"""
        response = requests.get(f"{BASE_URL}/api/patient-auth/me")
        
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
