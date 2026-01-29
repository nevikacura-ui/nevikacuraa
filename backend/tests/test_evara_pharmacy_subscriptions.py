"""
Backend API Tests for Nevika Cura - Evara Email OTP, Pharmacy, and Subscriptions
Tests: Email OTP flow, Subscription coupon validation, Pharmacy inventory
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmailOTPFlow:
    """Test Email OTP authentication flow for Evara signup"""
    
    def test_send_email_otp_success(self):
        """Test sending OTP to a valid email"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "test_evara_signup@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "email" in data
        assert data["email"] == "test_evara_signup@example.com"
        assert "expires_in" in data
        # Store mock_otp if returned for verification test
        if "mock_otp" in data:
            pytest.mock_otp = data["mock_otp"]
            print(f"Mock OTP received: {data['mock_otp']}")
        else:
            pytest.mock_otp = None
            print("Email OTP sent via Resend (no mock_otp)")
    
    def test_send_email_otp_invalid_email(self):
        """Test sending OTP to invalid email format"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "invalid-email"
        })
        assert response.status_code == 400
        print("Invalid email correctly rejected")
    
    def test_verify_email_otp_with_mock(self):
        """Test verifying OTP (using mock OTP if available)"""
        # First send OTP to get mock_otp
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "test_verify_otp@example.com"
        })
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        if "mock_otp" in send_data:
            # Verify with mock OTP
            verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
                "email": "test_verify_otp@example.com",
                "otp": send_data["mock_otp"]
            })
            assert verify_response.status_code == 200
            verify_data = verify_response.json()
            assert verify_data["success"] == True
            assert verify_data["verified"] == True
            assert "verification_token" in verify_data
            print(f"OTP verified successfully, user_exists: {verify_data.get('user_exists', False)}")
        else:
            print("Skipping OTP verification - no mock OTP available (real email sent)")
            pytest.skip("No mock OTP available for verification")
    
    def test_verify_email_otp_invalid(self):
        """Test verifying with invalid OTP"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "test_invalid_otp@example.com"
        })
        
        # Try to verify with wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": "test_invalid_otp@example.com",
            "otp": "000000"
        })
        assert response.status_code == 400
        print("Invalid OTP correctly rejected")


class TestSubscriptionCouponValidation:
    """Test subscription coupon validation API"""
    
    def test_validate_glydex_coupon_success(self):
        """Test validating a valid Glydex coupon"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/validate-coupon", json={
            "coupon_code": "GLY-SOSIYCLH",
            "plan_type": "glydex"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["discount_percent"] == 100
        print(f"Coupon validation: {data['message']}")
    
    def test_validate_invalid_coupon(self):
        """Test validating an invalid coupon code"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/validate-coupon", json={
            "coupon_code": "INVALID-CODE-123",
            "plan_type": "glydex"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print(f"Invalid coupon correctly rejected: {data['message']}")
    
    def test_validate_coupon_wrong_plan_type(self):
        """Test validating coupon with wrong plan type"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/validate-coupon", json={
            "coupon_code": "GLY-SOSIYCLH",
            "plan_type": "evara"  # Glydex coupon used for Evara
        })
        assert response.status_code == 200
        data = response.json()
        # Should be invalid since it's a Glydex coupon
        assert data["valid"] == False
        print(f"Wrong plan type correctly rejected: {data['message']}")
    
    def test_get_subscription_plans(self):
        """Test getting available subscription plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "plans" in data
        assert "glydex" in data["plans"]
        assert "evara" in data["plans"]
        
        # Verify plan structure
        glydex_plan = data["plans"]["glydex"]
        assert glydex_plan["name"] == "Glydex Premium"
        assert glydex_plan["price"] == 3600
        assert "features" in glydex_plan
        print(f"Plans retrieved: Glydex (₹{glydex_plan['price']}), Evara (₹{data['plans']['evara']['price']})")
    
    def test_get_specific_plan_details(self):
        """Test getting specific plan details"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans/glydex")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["plan"]["name"] == "Glydex Premium"
        print(f"Glydex plan features: {len(data['plan']['features'])} features")
    
    def test_get_invalid_plan(self):
        """Test getting non-existent plan"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans/invalid_plan")
        assert response.status_code == 404
        print("Invalid plan correctly returns 404")


class TestPharmacyInventory:
    """Test Pharmacy inventory and medicine search APIs"""
    
    def test_get_pharmacy_inventory(self):
        """Test getting pharmacy inventory"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        print(f"Pharmacy inventory: {data['total']} medicines available")
    
    def test_search_medicines_by_category(self):
        """Test searching medicines by category (diabetes)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory", params={
            "category": "diabetes"
        })
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"Diabetes medicines found: {len(data['medicines'])} items")
    
    def test_search_medicines_by_term(self):
        """Test searching medicines by search term"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory", params={
            "search": "paracetamol"
        })
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"Search 'paracetamol': {len(data['medicines'])} results")
    
    def test_get_medicine_forms(self):
        """Test getting available medicine forms"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/forms")
        assert response.status_code == 200
        data = response.json()
        assert "forms" in data
        assert len(data["forms"]) > 0
        print(f"Medicine forms available: {data['forms'][:5]}...")


class TestHealthEndpoints:
    """Test basic health and status endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        # May return 404 or 200 depending on implementation
        print(f"API root status: {response.status_code}")
    
    def test_auth_endpoints_exist(self):
        """Verify auth endpoints are accessible"""
        # Test that endpoints exist (even if they return errors for missing data)
        endpoints = [
            "/api/auth/email-otp/send",
            "/api/subscriptions/plans",
            "/api/pharmacy/inventory"
        ]
        for endpoint in endpoints:
            response = requests.options(f"{BASE_URL}{endpoint}")
            # Should not return 404
            assert response.status_code != 404, f"Endpoint {endpoint} not found"
            print(f"Endpoint {endpoint}: accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
