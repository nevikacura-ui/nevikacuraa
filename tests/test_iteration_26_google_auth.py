"""
Iteration 26 - Google OAuth and SMS OTP Fallback Tests
Tests for:
1. Google OAuth endpoint /api/auth/google
2. Password login failure handling
3. SMS OTP fallback flow
4. Auth callback route
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGoogleOAuth:
    """Tests for Google OAuth login endpoint"""
    
    def test_google_oauth_new_user(self):
        """Test Google OAuth creates new user"""
        unique_email = f"test_google_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/google", json={
            "email": unique_email,
            "name": "Test Google User",
            "picture": "https://example.com/picture.jpg",
            "google_id": f"google_{uuid.uuid4().hex[:12]}",
            "session_token": "test_session_token"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "Test Google User"
        assert data["user"].get("auth_method") == "google"
        print(f"✓ Google OAuth new user created: {unique_email}")
    
    def test_google_oauth_existing_user(self):
        """Test Google OAuth logs in existing user"""
        unique_email = f"test_google_existing_{uuid.uuid4().hex[:8]}@example.com"
        
        # First create the user
        response1 = requests.post(f"{BASE_URL}/api/auth/google", json={
            "email": unique_email,
            "name": "Existing Google User",
            "google_id": f"google_{uuid.uuid4().hex[:12]}"
        })
        assert response1.status_code == 200
        user_id_1 = response1.json()["user"]["id"]
        
        # Login again with same email
        response2 = requests.post(f"{BASE_URL}/api/auth/google", json={
            "email": unique_email,
            "name": "Existing Google User",
            "google_id": f"google_{uuid.uuid4().hex[:12]}"
        })
        
        assert response2.status_code == 200
        data = response2.json()
        assert data["user"]["id"] == user_id_1, "Should return same user ID"
        print(f"✓ Google OAuth existing user login: {unique_email}")
    
    def test_google_oauth_missing_email(self):
        """Test Google OAuth rejects missing email"""
        response = requests.post(f"{BASE_URL}/api/auth/google", json={
            "name": "Test User",
            "google_id": "test_google_id"
        })
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Google OAuth rejects missing email")
    
    def test_google_oauth_updates_picture(self):
        """Test Google OAuth updates user picture"""
        unique_email = f"test_google_pic_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create user without picture
        response1 = requests.post(f"{BASE_URL}/api/auth/google", json={
            "email": unique_email,
            "name": "Picture Test User"
        })
        assert response1.status_code == 200
        
        # Login again with picture
        response2 = requests.post(f"{BASE_URL}/api/auth/google", json={
            "email": unique_email,
            "name": "Picture Test User",
            "picture": "https://example.com/new_picture.jpg"
        })
        
        assert response2.status_code == 200
        data = response2.json()
        assert data["user"].get("picture") == "https://example.com/new_picture.jpg"
        print(f"✓ Google OAuth updates picture: {unique_email}")


class TestPasswordLoginFailure:
    """Tests for password login failure and SMS OTP fallback"""
    
    def test_password_login_wrong_password(self):
        """Test password login fails with wrong password"""
        # Use test credentials from review request
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword123"
        })
        
        # Should return 401 for invalid credentials
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data or "error" in data
        print("✓ Password login fails with wrong password")
    
    def test_password_login_nonexistent_user(self):
        """Test password login fails for non-existent user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Password login fails for non-existent user")


class TestSMSOTPFallback:
    """Tests for SMS OTP fallback flow"""
    
    def test_send_phone_otp(self):
        """Test sending OTP to phone number"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "9876543210"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "phone" in data
        assert data.get("method") in ["sms", "mock"]
        print(f"✓ Phone OTP sent successfully (method: {data.get('method')})")
    
    def test_send_phone_otp_invalid_number(self):
        """Test sending OTP to invalid phone number"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "123"  # Too short
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Phone OTP rejects invalid number")
    
    def test_verify_phone_otp_mock(self):
        """Test verifying phone OTP with mock OTP"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "9876543211"
        })
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        # If mock OTP is returned, verify it
        if send_data.get("mock_otp"):
            verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
                "phone": "9876543211",
                "otp": send_data["mock_otp"]
            })
            
            assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}: {verify_response.text}"
            verify_data = verify_response.json()
            assert verify_data.get("success") == True
            assert verify_data.get("verified") == True
            assert "verification_token" in verify_data
            print("✓ Phone OTP verified successfully with mock OTP")
        else:
            print("⚠ Skipping OTP verification - Twilio SMS active (no mock OTP)")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_auth_me_unauthenticated(self):
        """Test /auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me returns 401 without token")


class TestEmailOTPAuth:
    """Tests for Email OTP authentication (existing feature)"""
    
    def test_send_email_otp(self):
        """Test sending OTP via email"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "test_email_otp@example.com"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("method") in ["email", "mock"]
        print(f"✓ Email OTP sent successfully (method: {data.get('method')})")
    
    def test_send_email_otp_invalid(self):
        """Test sending OTP to invalid email"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "invalid-email"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Email OTP rejects invalid email")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
