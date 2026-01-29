"""
Test Membership Plans and How to Install Features
- Tests /api/subscriptions/membership-plans endpoint
- Tests /api/subscriptions/membership/purchase endpoint
- Tests /api/subscriptions/family-plans endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMembershipPlansAPI:
    """Test Membership Plans API endpoints"""
    
    def test_get_membership_plans(self):
        """Test GET /api/subscriptions/membership-plans returns all plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "plans" in data
        assert "family_plans" in data
        
        # Check individual plans exist
        plans = data["plans"]
        assert "basic" in plans
        assert "standard" in plans
        assert "premium" in plans
        
        # Verify Basic plan structure
        basic = plans["basic"]
        assert basic["name"] == "Basic Membership"
        assert "monthly" in basic
        assert "quarterly" in basic
        assert "yearly" in basic
        assert basic["quarterly"]["price"] == 2499
        
        # Verify Standard plan has 'popular' badge
        standard = plans["standard"]
        assert standard["name"] == "Standard Membership"
        assert standard["quarterly"].get("popular") == True
        
        # Verify Premium plan has 'best_value' badge
        premium = plans["premium"]
        assert premium["name"] == "Premium Membership"
        assert premium["yearly"].get("best_value") == True
        
        print("✅ GET /api/subscriptions/membership-plans - All 3 individual plans returned correctly")
    
    def test_get_family_plans(self):
        """Test GET /api/subscriptions/membership-plans returns family plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        
        assert response.status_code == 200
        data = response.json()
        
        family_plans = data["family_plans"]
        
        # Check 4 family plans exist
        assert "diagnostic_only" in family_plans
        assert "diagnostic_pharmacy" in family_plans
        assert "complete_family" in family_plans
        assert "portal_family" in family_plans
        
        # Verify Family Diagnostic Plan
        diagnostic_only = family_plans["diagnostic_only"]
        assert diagnostic_only["name"] == "Family Diagnostic Plan"
        assert diagnostic_only["members"] == 4
        
        # Verify Complete Family Care has best_value
        complete_family = family_plans["complete_family"]
        assert complete_family["name"] == "Complete Family Care"
        assert complete_family["yearly"].get("best_value") == True
        
        print("✅ GET /api/subscriptions/membership-plans - All 4 family plans returned correctly")
    
    def test_get_specific_membership_plan(self):
        """Test GET /api/subscriptions/membership-plans/{plan_id}"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans/basic")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "plan" in data
        plan = data["plan"]
        assert plan["name"] == "Basic Membership"
        assert "features" in plan
        assert len(plan["features"]) > 0
        
        print("✅ GET /api/subscriptions/membership-plans/basic - Plan details returned")
    
    def test_get_nonexistent_plan(self):
        """Test GET /api/subscriptions/membership-plans/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans/nonexistent")
        
        assert response.status_code == 404
        
        print("✅ GET /api/subscriptions/membership-plans/nonexistent - Returns 404 as expected")
    
    def test_membership_purchase_endpoint_exists(self):
        """Test POST /api/subscriptions/membership/purchase endpoint exists"""
        # Test with minimal payload - should fail validation but endpoint should exist
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/membership/purchase",
            json={
                "plan_type": "basic",
                "billing_cycle": "quarterly",
                "email": "test@example.com"
            }
        )
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404
        
        # Note: Will fail with Stripe error since test key is invalid
        # But this confirms the endpoint exists and accepts the request
        print(f"✅ POST /api/subscriptions/membership/purchase - Endpoint exists (status: {response.status_code})")
    
    def test_membership_purchase_invalid_plan(self):
        """Test POST /api/subscriptions/membership/purchase with invalid plan"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/membership/purchase",
            json={
                "plan_type": "invalid_plan",
                "billing_cycle": "quarterly",
                "email": "test@example.com"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid plan type" in data.get("detail", "")
        
        print("✅ POST /api/subscriptions/membership/purchase - Invalid plan returns 400")
    
    def test_membership_purchase_invalid_billing_cycle(self):
        """Test POST /api/subscriptions/membership/purchase with invalid billing cycle"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/membership/purchase",
            json={
                "plan_type": "basic",
                "billing_cycle": "invalid_cycle",
                "email": "test@example.com"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid billing cycle" in data.get("detail", "")
        
        print("✅ POST /api/subscriptions/membership/purchase - Invalid billing cycle returns 400")


class TestFamilyPlansAPI:
    """Test Family Plans API endpoints"""
    
    def test_get_family_plans_endpoint(self):
        """Test GET /api/subscriptions/family-plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/family-plans")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "plans" in data
        plans = data["plans"]
        
        # Verify all 4 family plans
        assert len(plans) == 4
        
        print("✅ GET /api/subscriptions/family-plans - Returns 4 family plans")


class TestSubscriptionPlansAPI:
    """Test existing subscription plans API (Glydex/Evara)"""
    
    def test_get_subscription_plans(self):
        """Test GET /api/subscriptions/plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "plans" in data
        
        plans = data["plans"]
        assert "glydex" in plans
        assert "evara" in plans
        
        print("✅ GET /api/subscriptions/plans - Returns Glydex and Evara plans")


class TestMembershipPlanPricing:
    """Test membership plan pricing is correct"""
    
    def test_basic_plan_pricing(self):
        """Verify Basic plan pricing"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        data = response.json()
        
        basic = data["plans"]["basic"]
        
        assert basic["monthly"]["price"] == 999
        assert basic["quarterly"]["price"] == 2499
        assert basic["quarterly"]["savings"] == 498
        assert basic["yearly"]["price"] == 7999
        assert basic["yearly"]["savings"] == 3989
        
        print("✅ Basic plan pricing verified: ₹999/month, ₹2499/quarter, ₹7999/year")
    
    def test_standard_plan_pricing(self):
        """Verify Standard plan pricing"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        data = response.json()
        
        standard = data["plans"]["standard"]
        
        assert standard["monthly"]["price"] == 1999
        assert standard["quarterly"]["price"] == 4999
        assert standard["yearly"]["price"] == 14999
        
        print("✅ Standard plan pricing verified: ₹1999/month, ₹4999/quarter, ₹14999/year")
    
    def test_premium_plan_pricing(self):
        """Verify Premium plan pricing"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        data = response.json()
        
        premium = data["plans"]["premium"]
        
        assert premium["monthly"]["price"] == 3499
        assert premium["quarterly"]["price"] == 8999
        assert premium["yearly"]["price"] == 29999
        
        print("✅ Premium plan pricing verified: ₹3499/month, ₹8999/quarter, ₹29999/year")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
