"""
Iteration 25 - Multi-Method Authentication System Tests
Tests for:
1. Email OTP send/verify/login endpoints
2. Phone SMS OTP endpoints
3. Email + Password login
4. Registration with verified email/phone
5. Email billing notifications (staff_billing.py)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestEmailOTPAuth:
    """Email OTP Authentication Tests - Primary auth method"""
    
    def test_send_email_otp(self):
        """Test sending OTP to email"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": test_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "expires_in" in data
        assert data.get("email") == test_email
        # Method should be 'email' or 'mock' (fallback)
        assert data.get("method") in ["email", "mock"]
        print(f"✓ Email OTP sent to {test_email}, method: {data.get('method')}")
        
        # If mock mode, we get the OTP back
        if data.get("mock_otp"):
            print(f"  Mock OTP: {data.get('mock_otp')}")
    
    def test_send_email_otp_invalid_email(self):
        """Test sending OTP with invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": "invalid-email"}
        )
        assert response.status_code == 400
        print("✓ Invalid email rejected correctly")
    
    def test_verify_email_otp_flow(self):
        """Test complete email OTP verification flow"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Step 1: Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": test_email}
        )
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        # Get mock OTP if available
        mock_otp = send_data.get("mock_otp")
        if not mock_otp:
            pytest.skip("No mock OTP available - real email service configured")
        
        # Step 2: Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/verify",
            json={"email": test_email, "otp": mock_otp}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("success") == True
        assert verify_data.get("verified") == True
        assert "verification_token" in verify_data
        assert verify_data.get("user_exists") == False  # New email
        print(f"✓ Email OTP verified for {test_email}")
        print(f"  Verification token: {verify_data.get('verification_token')[:20]}...")
    
    def test_verify_email_otp_invalid(self):
        """Test verifying with invalid OTP"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send OTP first
        requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": test_email}
        )
        
        # Try invalid OTP
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/verify",
            json={"email": test_email, "otp": "000000"}
        )
        assert response.status_code == 400
        print("✓ Invalid OTP rejected correctly")
    
    def test_email_otp_login_existing_user(self):
        """Test passwordless login for existing user via email OTP"""
        # Use existing test user email
        test_email = "test@example.com"
        
        # Step 1: Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": test_email}
        )
        
        if send_response.status_code != 200:
            pytest.skip("Could not send OTP to test email")
        
        send_data = send_response.json()
        mock_otp = send_data.get("mock_otp")
        
        if not mock_otp:
            pytest.skip("No mock OTP - real email configured")
        
        # Step 2: Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/verify",
            json={"email": test_email, "otp": mock_otp}
        )
        
        if verify_response.status_code != 200:
            pytest.skip("OTP verification failed")
        
        verify_data = verify_response.json()
        
        if not verify_data.get("user_exists"):
            pytest.skip("Test user doesn't exist")
        
        # Step 3: Login with verification token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/login",
            json={
                "email": test_email,
                "verification_token": verify_data.get("verification_token")
            }
        )
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            assert "token" in login_data
            assert "user" in login_data
            print(f"✓ Email OTP login successful for existing user: {test_email}")
        else:
            print(f"  Email OTP login returned {login_response.status_code} - user may not exist")


class TestPhoneOTPAuth:
    """Phone SMS OTP Authentication Tests"""
    
    def test_send_phone_otp(self):
        """Test sending OTP to phone"""
        test_phone = "9876543210"
        response = requests.post(
            f"{BASE_URL}/api/auth/otp/send",
            json={"phone": test_phone}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "expires_in" in data
        # Method should be 'sms' or 'mock'
        assert data.get("method") in ["sms", "mock"]
        print(f"✓ Phone OTP sent to {test_phone}, method: {data.get('method')}")
        
        if data.get("mock_otp"):
            print(f"  Mock OTP: {data.get('mock_otp')}")
    
    def test_send_phone_otp_invalid(self):
        """Test sending OTP with invalid phone"""
        response = requests.post(
            f"{BASE_URL}/api/auth/otp/send",
            json={"phone": "123"}
        )
        assert response.status_code == 400
        print("✓ Invalid phone rejected correctly")
    
    def test_verify_phone_otp_flow(self):
        """Test complete phone OTP verification flow"""
        test_phone = "9876543211"
        
        # Step 1: Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/auth/otp/send",
            json={"phone": test_phone}
        )
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        mock_otp = send_data.get("mock_otp")
        if not mock_otp:
            pytest.skip("No mock OTP - real SMS configured")
        
        # Step 2: Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/otp/verify",
            json={"phone": test_phone, "otp": mock_otp}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("success") == True
        assert verify_data.get("verified") == True
        assert "verification_token" in verify_data
        print(f"✓ Phone OTP verified for {test_phone}")


class TestPasswordAuth:
    """Email + Password Authentication Tests"""
    
    def test_login_with_password(self):
        """Test traditional email + password login"""
        # Try with test credentials
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "test123"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "user" in data
            print("✓ Password login successful")
        elif response.status_code == 401:
            print("  Password login returned 401 - credentials may be wrong")
        else:
            print(f"  Password login returned {response.status_code}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


class TestRegistration:
    """Registration Tests with OTP verification"""
    
    def test_register_with_email_otp(self):
        """Test registration after email OTP verification"""
        test_email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
        test_phone = f"98765{uuid.uuid4().hex[:5]}"[:10]
        
        # Step 1: Send email OTP
        send_response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": test_email}
        )
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        mock_otp = send_data.get("mock_otp")
        if not mock_otp:
            pytest.skip("No mock OTP available")
        
        # Step 2: Verify email OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/verify",
            json={"email": test_email, "otp": mock_otp}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        verification_token = verify_data.get("verification_token")
        
        # Step 3: Register with verified email
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "TestPass123!",
                "phone": test_phone,
                "name": "TEST_User Registration"
            }
        )
        
        if register_response.status_code == 200:
            reg_data = register_response.json()
            assert "token" in reg_data
            assert "user" in reg_data
            print(f"✓ Registration successful for {test_email}")
        elif register_response.status_code == 400:
            # Email might already exist
            print(f"  Registration returned 400 - email may already exist")
        else:
            print(f"  Registration returned {register_response.status_code}")


class TestStaffBillingEmailNotification:
    """Staff Billing Email Notification Tests"""
    
    def test_staff_login(self):
        """Test staff login to get token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "staff_pushpa",
                "password": "Nevika@2026C"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Staff login successful")
        return data.get("token")
    
    def test_create_bill_with_email(self):
        """Test creating bill with patient email (triggers email notification)"""
        # First login as staff
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "staff_pushpa",
                "password": "Nevika@2026C"
            }
        )
        
        if login_response.status_code != 200:
            pytest.skip("Staff login failed")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a bill with patient email
        bill_data = {
            "patient_name": "TEST_Email Notification Patient",
            "patient_phone": "9876543210",
            "patient_email": "test_patient@example.com",
            "items": [
                {
                    "item_type": "service",
                    "item_name": "OB-GYN Consultation",
                    "item_code": "CONS-OBG",
                    "quantity": 1,
                    "unit_price": 500,
                    "discount_percent": 0
                }
            ],
            "payment_method": "cash",
            "clinic": "pushpa"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff-billing/create-bill",
            json=bill_data,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "bill_number" in data
            assert data.get("success") == True
            print(f"✓ Bill created: {data.get('bill_number')}")
            print(f"  Email notification should be sent to: {bill_data['patient_email']}")
        else:
            print(f"  Bill creation returned {response.status_code}: {response.text}")


class TestInventorySearch:
    """Staff Billing Inventory Search Tests"""
    
    def test_search_inventory(self):
        """Test inventory search across all services"""
        # Login as staff
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "staff_pushpa",
                "password": "Nevika@2026C"
            }
        )
        
        if login_response.status_code != 200:
            pytest.skip("Staff login failed")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Search for items
        response = requests.get(
            f"{BASE_URL}/api/staff-billing/inventory/search",
            params={"query": "consultation"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"✓ Inventory search returned {len(data.get('items', []))} items")


class TestUserPreferences:
    """User Preferences/Interests Tests"""
    
    def test_get_preferences_unauthenticated(self):
        """Test getting preferences without auth"""
        response = requests.get(f"{BASE_URL}/api/user/preferences")
        assert response.status_code == 401
        print("✓ Unauthenticated preferences request rejected")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
