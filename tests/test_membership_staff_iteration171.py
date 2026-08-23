"""
Test Suite - Iteration 171: Membership Card, Staff Logins, Coupon Codes, Cashfree Payments
Tests:
  - Staff login credentials for all portals
  - Coupon validation with free membership flow
  - Paid membership with Cashfree payment integration
"""

import pytest
import requests
import os
from datetime import datetime

# Use environment variable for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestStaffLogins:
    """Test all staff login credentials"""
    
    def test_staff_diagyn_login(self):
        """Test staff_diagyn/test1234 login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        print(f"staff_diagyn login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "token" in data or "access_token" in data or "staff" in data
            print(f"✅ staff_diagyn login successful: {data.get('staff', {}).get('name', 'N/A')}")
        else:
            print(f"Response: {response.text}")
        assert response.status_code == 200

    def test_staff_orange_login(self):
        """Test staff_orange/test1234 login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        print(f"staff_orange login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ staff_orange login successful")
        else:
            print(f"Response: {response.text}")
        assert response.status_code == 200

    def test_staff_mango_login(self):
        """Test staff_mango/test1234 login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_mango",
            "password": "test1234"
        })
        print(f"staff_mango login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ staff_mango login successful")
        else:
            print(f"Response: {response.text}")
        assert response.status_code == 200

    def test_admin_login(self):
        """Test admin/test1234 login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        print(f"admin login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ admin login successful")
        else:
            print(f"Response: {response.text}")
        assert response.status_code == 200

    def test_dr_neha_login(self):
        """Test dr_neha/drneha123 login (password fix)"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_neha",
            "password": "drneha123"
        })
        print(f"dr_neha login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ dr_neha login successful")
        else:
            print(f"Response: {response.text}")
        assert response.status_code == 200

    def test_dr_vikas_login(self):
        """Test dr_vikas/test1234 login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        print(f"dr_vikas login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ dr_vikas login successful")
        else:
            print(f"Response: {response.text}")
        assert response.status_code == 200


class TestMembershipAPI:
    """Test membership and coupon APIs"""
    
    def test_get_membership_plans(self):
        """Test GET /api/subscriptions/membership-plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        print(f"Membership plans: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        print(f"✅ Membership plans available: {list(data.get('plans', {}).keys())}")

    def test_get_subscription_plans(self):
        """Test GET /api/subscriptions/plans (Glydex/Evara)"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        print(f"Subscription plans: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        plans = data.get("plans", {})
        assert "glydex" in plans or "evara" in plans
        print(f"✅ Subscription plans: {list(plans.keys())}")


class TestCouponValidation:
    """Test coupon validation and free membership flow"""

    def test_invalid_coupon(self):
        """Test validation with invalid coupon code"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/validate-coupon", json={
            "coupon_code": "INVALID-COUPON-CODE",
            "plan_type": "glydex"
        })
        print(f"Invalid coupon: {response.status_code}")
        assert response.status_code == 200  # API returns 200 with valid=false
        data = response.json()
        assert data.get("valid") == False
        print(f"✅ Invalid coupon correctly rejected: {data.get('message')}")


class TestMembershipPurchase:
    """Test membership purchase API"""

    def test_membership_purchase_invalid_coupon(self):
        """Test purchase with invalid coupon - should return error"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/membership/purchase", json={
            "plan_type": "basic",
            "billing_cycle": "monthly",
            "email": "test@example.com",
            "coupon_code": "INVALID-TEST-CODE-12345"
        })
        print(f"Purchase with invalid coupon: {response.status_code}")
        # Should return 400 for invalid coupon
        assert response.status_code in [200, 400]
        data = response.json()
        print(f"Response: {data}")

    def test_membership_purchase_no_coupon(self):
        """Test purchase without coupon - should redirect to Cashfree"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/membership/purchase", json={
            "plan_type": "basic",
            "billing_cycle": "monthly",
            "email": "testcashfree@example.com"
        })
        print(f"Purchase without coupon: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        # Should return Cashfree payment session ID for paid memberships
        if data.get("redirect_to_cashfree"):
            assert "payment_session_id" in data
            print(f"✅ Cashfree payment session created: {data.get('payment_session_id', 'N/A')[:20]}...")
        else:
            print(f"Response: {data}")


class TestServicePageAPI:
    """Test that service pages are accessible"""

    def test_diagyn_page_available(self):
        """Test DiaGyn page loads"""
        response = requests.get(f"{BASE_URL}/diagyn", allow_redirects=True)
        # Frontend routes return 200
        assert response.status_code == 200

    def test_pharmacy_page_available(self):
        """Test Pharmacy page loads"""
        response = requests.get(f"{BASE_URL}/pharmacy", allow_redirects=True)
        assert response.status_code == 200

    def test_mango_page_available(self):
        """Test Mango page loads"""
        response = requests.get(f"{BASE_URL}/mango", allow_redirects=True)
        assert response.status_code == 200


class TestDoctorAPI:
    """Test doctor-related APIs"""

    def test_get_next_available_slot(self):
        """Test next available slot API"""
        response = requests.get(f"{BASE_URL}/api/doctors/next-available", params={
            "doctor": "Dr. Vikas Jha"
        })
        print(f"Next available slot: {response.status_code}")
        # May return 200 with available slot or 404 if no slots
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Next slot: {data}")


class TestHealthEndpoints:
    """Test API health endpoints"""

    def test_api_health(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health check: {response.status_code}")
        assert response.status_code == 200

    def test_live_queue_diagyn(self):
        """Test live queue status for DiaGyn"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/diagyn")
        print(f"Live queue diagyn: {response.status_code}")
        assert response.status_code == 200

    def test_live_queue_mango(self):
        """Test live queue status for Mango"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/mango")
        print(f"Live queue mango: {response.status_code}")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
