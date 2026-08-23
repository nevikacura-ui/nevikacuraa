"""
Test SMS OTP Endpoints - Iteration 382
Tests MSG91 SMS OTP API endpoints for Nevika Cura Healthcare Platform
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSMSOTPEndpoints:
    """Test SMS OTP send, verify, and resend endpoints"""
    
    def test_sms_otp_send_success(self):
        """Test POST /api/otp/sms/send with valid phone number"""
        response = requests.post(
            f"{BASE_URL}/api/otp/sms/send",
            json={"phone": "9876543210", "purpose": "verification"}
        )
        print(f"SMS OTP Send Response: {response.status_code} - {response.text}")
        
        # Should return 200 with success=true
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=true, got {data}"
        assert "phone_masked" in data or "message" in data, f"Expected phone_masked or message in response: {data}"
    
    def test_sms_otp_send_invalid_phone(self):
        """Test POST /api/otp/sms/send with invalid phone number"""
        response = requests.post(
            f"{BASE_URL}/api/otp/sms/send",
            json={"phone": "123", "purpose": "verification"}
        )
        print(f"SMS OTP Send Invalid Phone Response: {response.status_code} - {response.text}")
        
        # Should return 400 for invalid phone
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
    
    def test_sms_otp_verify_wrong_otp(self):
        """Test POST /api/otp/sms/verify with wrong OTP - should return 400 not 500"""
        response = requests.post(
            f"{BASE_URL}/api/otp/sms/verify",
            json={"phone": "9876543210", "otp": "123456"}
        )
        print(f"SMS OTP Verify Wrong OTP Response: {response.status_code} - {response.text}")
        
        # Should return 400 for wrong OTP, not 500
        assert response.status_code in [400, 401], f"Expected 400/401 for wrong OTP, got {response.status_code}: {response.text}"
    
    def test_sms_otp_verify_invalid_format(self):
        """Test POST /api/otp/sms/verify with invalid OTP format"""
        response = requests.post(
            f"{BASE_URL}/api/otp/sms/verify",
            json={"phone": "9876543210", "otp": "12345"}  # 5 digits instead of 6
        )
        print(f"SMS OTP Verify Invalid Format Response: {response.status_code} - {response.text}")
        
        # Should return 400 for invalid OTP format
        assert response.status_code == 400, f"Expected 400 for invalid OTP format, got {response.status_code}"
    
    def test_sms_otp_resend(self):
        """Test POST /api/otp/sms/resend endpoint"""
        # First send an OTP
        send_response = requests.post(
            f"{BASE_URL}/api/otp/sms/send",
            json={"phone": "9876543210", "purpose": "verification"}
        )
        print(f"Initial SMS OTP Send: {send_response.status_code}")
        
        # Then try to resend
        response = requests.post(
            f"{BASE_URL}/api/otp/sms/resend",
            json={"phone": "9876543210"}
        )
        print(f"SMS OTP Resend Response: {response.status_code} - {response.text}")
        
        # Should return 200 or appropriate error (not 500)
        assert response.status_code in [200, 400, 429], f"Expected 200/400/429, got {response.status_code}: {response.text}"


class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_health_check(self):
        """Test GET /api/health"""
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health Check Response: {response.status_code}")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
