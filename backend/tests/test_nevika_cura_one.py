"""
Test Suite for Nevika Cura ONE Features
- /one page membership purchase endpoint
- Portal membership form endpoint
- Subscription plans endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthrefresh.preview.emergentagent.com')


class TestSubscriptionPlans:
    """Test subscription plans endpoints"""
    
    def test_get_subscription_plans(self):
        """Test GET /api/subscriptions/plans returns all plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "plans" in data
        
        # Verify Glydex plan exists
        assert "glydex" in data["plans"]
        glydex = data["plans"]["glydex"]
        assert glydex["name"] == "Glydex Premium"
        assert "tiers" in glydex
        
        # Verify Evara plan exists
        assert "evara" in data["plans"]
        evara = data["plans"]["evara"]
        assert evara["name"] == "Evara Premium"
        assert "tiers" in evara
    
    def test_get_membership_plans(self):
        """Test GET /api/subscriptions/membership-plans returns membership plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        
        # Verify basic, standard, premium plans exist
        plans = data["plans"]
        assert "basic" in plans
        assert "standard" in plans
        assert "premium" in plans
        
        # Verify premium plan has correct structure
        premium = plans["premium"]
        assert premium["name"] == "Premium Membership"
        assert "monthly" in premium
        assert "quarterly" in premium
        assert "yearly" in premium


class TestMembershipPurchase:
    """Test membership purchase endpoint (Stripe checkout)"""
    
    def test_membership_purchase_creates_checkout(self):
        """Test POST /api/subscriptions/membership/purchase creates Stripe checkout"""
        payload = {
            "plan_type": "premium",
            "billing_cycle": "quarterly",
            "email": "test_purchase@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/membership/purchase",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return checkout URL
        assert "checkout_url" in data
        assert "session_id" in data
        assert "amount" in data
        assert "plan_name" in data
        
        # Verify checkout URL is valid Stripe URL
        assert "stripe.com" in data["checkout_url"]
    
    def test_membership_purchase_invalid_plan(self):
        """Test membership purchase with invalid plan type"""
        payload = {
            "plan_type": "invalid_plan",
            "billing_cycle": "monthly",
            "email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/membership/purchase",
            json=payload
        )
        # Should return 400 for invalid plan
        assert response.status_code == 400


class TestPortalMembershipForm:
    """Test portal-specific membership form endpoint"""
    
    def test_submit_evara_membership_form(self):
        """Test POST /api/memberships/portal-form for Evara"""
        payload = {
            "name": "Test User Evara",
            "phone": "9876543210",
            "email": "test_evara@example.com",
            "age": "30",
            "gender": "female",
            "plan_type": "evara",
            "existing_conditions": "None",
            "current_medications": "None",
            "allergies": "None",
            "portal_specific": {
                "pregnancy_status": "Not Pregnant",
                "pcos_diagnosed": False
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/memberships/portal-form",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "profile_id" in data
        assert data.get("plan_type") == "evara"
    
    def test_submit_glydex_membership_form(self):
        """Test POST /api/memberships/portal-form for Glydex"""
        payload = {
            "name": "Test User Glydex",
            "phone": "9876543211",
            "email": "test_glydex@example.com",
            "age": "45",
            "gender": "male",
            "plan_type": "glydex",
            "existing_conditions": "Type 2 Diabetes",
            "current_medications": "Metformin",
            "allergies": "None",
            "portal_specific": {
                "diabetes_type": "Type 2",
                "insulin_user": False
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/memberships/portal-form",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "profile_id" in data
        assert data.get("plan_type") == "glydex"
    
    def test_get_membership_form_by_phone(self):
        """Test GET /api/memberships/portal-form/{phone}"""
        # First submit a form
        payload = {
            "name": "Test Retrieve User",
            "phone": "9876543299",
            "email": "test_retrieve@example.com",
            "age": "35",
            "gender": "female",
            "plan_type": "evara"
        }
        
        submit_response = requests.post(
            f"{BASE_URL}/api/memberships/portal-form",
            json=payload
        )
        assert submit_response.status_code == 200
        
        # Now retrieve by phone
        response = requests.get(f"{BASE_URL}/api/memberships/portal-form/9876543299")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        # Response contains 'profiles' array instead of single 'profile'
        assert "profiles" in data or "profile" in data


class TestSubscriptionStatus:
    """Test subscription status check endpoints"""
    
    def test_check_subscription_status_no_subscription(self):
        """Test checking subscription status for user without subscription"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/check/glydex/nonexistent_patient_123"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("has_subscription") == False
    
    def test_get_patient_subscriptions_empty(self):
        """Test getting subscriptions for patient with none"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/my-subscriptions/nonexistent_patient_456"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "subscriptions" in data
        assert len(data["subscriptions"]) == 0


class TestFamilyPlans:
    """Test family plan endpoints"""
    
    def test_get_family_plans(self):
        """Test GET /api/subscriptions/family-plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/family-plans")
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        
        # Verify family plan types exist
        plans = data["plans"]
        assert "diagnostic_only" in plans or "complete_family" in plans


class TestReferralProgram:
    """Test referral program endpoints"""
    
    def test_generate_referral_code(self):
        """Test POST /api/subscriptions/referral/generate"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/referral/generate",
            params={
                "patient_id": "test_patient_ref_123",
                "patient_name": "Test Referrer"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "referral_code" in data
        assert "referral_link" in data
    
    def test_get_referral_stats(self):
        """Test GET /api/subscriptions/referral/stats/{patient_id}"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/referral/stats/test_patient_ref_123"
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should have referral code from previous test or indicate no code
        assert "has_referral_code" in data


class TestPointsSystem:
    """Test gamification points system"""
    
    def test_get_patient_points(self):
        """Test GET /api/subscriptions/points/{patient_id}"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/points/test_patient_points_123"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_points" in data
        assert "level" in data


class TestStreaks:
    """Test streak tracking endpoints"""
    
    def test_get_streaks(self):
        """Test GET /api/subscriptions/streaks/{patient_id}"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/streaks/test_patient_streak_123"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "streaks" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
