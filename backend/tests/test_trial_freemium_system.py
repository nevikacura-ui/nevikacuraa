"""
Test suite for Trial System and Freemium Feature Gating
Tests: start-trial endpoint, check-active with trial support, duplicate trial blocking
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestTrialSystem:
    """Tests for 7-day free trial system"""
    
    def test_start_trial_success(self):
        """Test starting a new trial with unique email"""
        unique_email = f"trial_pytest_{int(time.time())}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/membership-tiers/start-trial",
            json={"email": unique_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "trial" in data
        assert data["trial"]["days_remaining"] == 7
        assert "allowed_features" in data["trial"]
        # Verify trial features for Evara
        assert "evara" in data["trial"]["allowed_features"]
        assert "period_tracker" in data["trial"]["allowed_features"]["evara"]
        assert "pcos_guide" in data["trial"]["allowed_features"]["evara"]
        assert "pregnancy_guide" in data["trial"]["allowed_features"]["evara"]
        assert "pms_education" in data["trial"]["allowed_features"]["evara"]
        # Verify trial features for Glydex
        assert "glydex" in data["trial"]["allowed_features"]
        assert "sugar_log" in data["trial"]["allowed_features"]["glydex"]
        assert "warnings" in data["trial"]["allowed_features"]["glydex"]
        print(f"✅ Trial created for {unique_email}")
    
    def test_start_trial_duplicate_blocked(self):
        """Test that duplicate trial for same email is blocked"""
        # trial_test@example.com already has a trial from previous tests
        response = requests.post(
            f"{BASE_URL}/api/membership-tiers/start-trial",
            json={"email": "trial_test@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "already used" in data["detail"].lower()
        print("✅ Duplicate trial correctly blocked")
    
    def test_start_trial_requires_email_or_phone(self):
        """Test that trial requires email or phone"""
        response = requests.post(
            f"{BASE_URL}/api/membership-tiers/start-trial",
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "required" in data["detail"].lower()
        print("✅ Trial correctly requires email or phone")


class TestCheckActiveWithTrial:
    """Tests for check-active endpoint with trial support"""
    
    def test_check_active_returns_trial_info(self):
        """Test check-active returns trial info for trial users"""
        response = requests.get(
            f"{BASE_URL}/api/membership-tiers/check-active",
            params={"email": "trial_test@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["active"] is False  # Not a full member
        assert data["trial"] is not None
        assert data["trial"]["active"] is True
        assert "days_remaining" in data["trial"]
        assert "allowed_features" in data["trial"]
        print(f"✅ Trial info returned: {data['trial']['days_remaining']} days remaining")
    
    def test_check_active_unknown_user(self):
        """Test check-active returns null trial for unknown users"""
        response = requests.get(
            f"{BASE_URL}/api/membership-tiers/check-active",
            params={"email": "unknown_user_xyz_123@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["active"] is False
        assert data["trial"] is None
        print("✅ Unknown user correctly returns active:false, trial:null")
    
    def test_check_active_no_params(self):
        """Test check-active with no params returns false"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/check-active")
        assert response.status_code == 200
        data = response.json()
        assert data["active"] is False
        assert data["trial"] is None
        print("✅ No params correctly returns active:false, trial:null")


class TestTrialFeatureGating:
    """Tests for feature-level gating in trials"""
    
    def test_evara_trial_features(self):
        """Verify Evara trial includes correct features"""
        response = requests.get(
            f"{BASE_URL}/api/membership-tiers/check-active",
            params={"email": "trial_test@example.com"}
        )
        data = response.json()
        evara_features = data["trial"]["allowed_features"]["evara"]
        
        # These should be in trial
        assert "period_tracker" in evara_features
        assert "pcos_guide" in evara_features
        assert "pregnancy_guide" in evara_features
        assert "pms_education" in evara_features
        
        # These should NOT be in trial (premium only)
        assert "diet_nutrition" not in evara_features
        assert "menopause_care" not in evara_features
        print("✅ Evara trial features correctly configured")
    
    def test_glydex_trial_features(self):
        """Verify Glydex trial includes correct features"""
        response = requests.get(
            f"{BASE_URL}/api/membership-tiers/check-active",
            params={"email": "trial_test@example.com"}
        )
        data = response.json()
        glydex_features = data["trial"]["allowed_features"]["glydex"]
        
        # These should be in trial
        assert "sugar_log" in glydex_features
        assert "warnings" in glydex_features
        
        # These should NOT be in trial (premium only)
        assert "diet_plans" not in glydex_features
        assert "essential_tests" not in glydex_features
        print("✅ Glydex trial features correctly configured")


class TestMembershipPlans:
    """Tests for membership tier plans"""
    
    def test_get_all_plans(self):
        """Test GET /api/membership-tiers/plans returns all 3 tiers"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["plans"]) == 3
        
        plan_ids = [p["id"] for p in data["plans"]]
        assert "gold" in plan_ids
        assert "silver" in plan_ids
        assert "bronze" in plan_ids
        print("✅ All 3 membership plans returned")
    
    def test_gold_plan_details(self):
        """Test Gold plan has correct pricing and benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/gold")
        assert response.status_code == 200
        data = response.json()
        plan = data["plan"]
        
        assert plan["id"] == "gold"
        assert plan["price"] == 999
        assert plan["benefits"]["medicine_discount"] == 25
        assert plan["benefits"]["portal_access"] == "all"
        print("✅ Gold plan: ₹999, 25% discount, all portals")
    
    def test_silver_plan_details(self):
        """Test Silver plan has correct pricing and benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/silver")
        assert response.status_code == 200
        data = response.json()
        plan = data["plan"]
        
        assert plan["id"] == "silver"
        assert plan["price"] == 799
        assert plan["benefits"]["medicine_discount"] == 20
        assert plan["benefits"]["portal_access"] == "any_2"
        print("✅ Silver plan: ₹799, 20% discount, 2 portals")
    
    def test_bronze_plan_details(self):
        """Test Bronze plan has correct pricing and benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/bronze")
        assert response.status_code == 200
        data = response.json()
        plan = data["plan"]
        
        assert plan["id"] == "bronze"
        assert plan["price"] == 499
        assert plan["benefits"]["medicine_discount"] == 15
        assert plan["benefits"]["portal_access"] == "any_1"
        print("✅ Bronze plan: ₹499, 15% discount, 1 portal")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✅ Health endpoint: OK")
