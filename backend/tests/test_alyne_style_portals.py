"""
Test for Alyne-style colorful gradient card design on Evara, Glydex, and Reneu portals.
Tests: trial endpoints, membership check, and feature gating.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestTrialAndMembershipEndpoints:
    """Test 7-day trial system and membership check APIs"""
    
    def test_health_check(self):
        """Health check endpoint should return ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Health check returns ok")

    def test_membership_plans_endpoint(self):
        """GET /api/membership-tiers/plans should return 3 plans"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("plans", [])) == 3
        plan_ids = [p["id"] for p in data["plans"]]
        assert "gold" in plan_ids
        assert "silver" in plan_ids
        assert "bronze" in plan_ids
        print("PASS: Membership plans endpoint returns 3 tiers (gold, silver, bronze)")

    def test_check_active_unknown_user(self):
        """Check-active for unknown user returns active=false, trial=null"""
        unique_email = f"unknown_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.get(f"{BASE_URL}/api/membership-tiers/check-active?email={unique_email}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("active") == False
        assert data.get("trial") is None
        print(f"PASS: Unknown user ({unique_email}) returns active=false, trial=null")

    def test_start_trial_new_user(self):
        """POST /api/membership-tiers/start-trial creates 7-day trial"""
        unique_email = f"trial_new_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/membership-tiers/start-trial",
            json={"email": unique_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "trial" in data
        assert data["trial"].get("days_remaining") == 7
        # Check allowed_features structure
        allowed = data["trial"].get("allowed_features", {})
        assert "evara" in allowed
        assert "glydex" in allowed
        # Evara trial features
        assert "period_tracker" in allowed["evara"]
        assert "pcos_guide" in allowed["evara"]
        assert "pregnancy_guide" in allowed["evara"]
        assert "pms_education" in allowed["evara"]
        # Glydex trial features
        assert "sugar_log" in allowed["glydex"]
        assert "warnings" in allowed["glydex"]
        print(f"PASS: Trial created for {unique_email} with 7 days and correct features")

    def test_start_trial_duplicate(self):
        """POST /api/membership-tiers/start-trial - duplicate trial returns error"""
        unique_email = f"trial_dup_{uuid.uuid4().hex[:8]}@example.com"
        # First trial - should succeed
        resp1 = requests.post(
            f"{BASE_URL}/api/membership-tiers/start-trial",
            json={"email": unique_email}
        )
        assert resp1.status_code == 200
        assert resp1.json().get("success") == True
        
        # Second trial - should fail
        resp2 = requests.post(
            f"{BASE_URL}/api/membership-tiers/start-trial",
            json={"email": unique_email}
        )
        assert resp2.status_code == 200
        data = resp2.json()
        assert data.get("success") == False
        assert "already used" in data.get("detail", "").lower()
        print(f"PASS: Duplicate trial attempt returns 'already used' error")

    def test_check_active_with_trial(self):
        """Check-active for trial user returns trial info with allowed_features"""
        unique_email = f"trial_check_{uuid.uuid4().hex[:8]}@example.com"
        # Start trial first
        requests.post(f"{BASE_URL}/api/membership-tiers/start-trial", json={"email": unique_email})
        
        # Check active
        response = requests.get(f"{BASE_URL}/api/membership-tiers/check-active?email={unique_email}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("active") == False  # Trial is not full subscription
        assert data.get("trial") is not None
        trial = data["trial"]
        assert trial.get("active") == True
        assert trial.get("days_remaining") >= 6  # Should be 6-7 days
        assert "allowed_features" in trial
        print(f"PASS: Check-active for trial user returns trial info correctly")

    def test_trial_features_evara(self):
        """Verify Evara trial features list"""
        unique_email = f"trial_evara_{uuid.uuid4().hex[:8]}@example.com"
        requests.post(f"{BASE_URL}/api/membership-tiers/start-trial", json={"email": unique_email})
        
        response = requests.get(f"{BASE_URL}/api/membership-tiers/check-active?email={unique_email}")
        data = response.json()
        evara_features = data["trial"]["allowed_features"]["evara"]
        
        # Trial includes these
        assert "period_tracker" in evara_features
        assert "pcos_guide" in evara_features
        assert "pregnancy_guide" in evara_features
        assert "pms_education" in evara_features
        
        # Trial excludes these (premium only)
        assert "diet_nutrition" not in evara_features
        assert "menopause_care" not in evara_features
        print("PASS: Evara trial features correct (4 trial, 2 premium-only)")

    def test_trial_features_glydex(self):
        """Verify Glydex trial features list"""
        unique_email = f"trial_glydex_{uuid.uuid4().hex[:8]}@example.com"
        requests.post(f"{BASE_URL}/api/membership-tiers/start-trial", json={"email": unique_email})
        
        response = requests.get(f"{BASE_URL}/api/membership-tiers/check-active?email={unique_email}")
        data = response.json()
        glydex_features = data["trial"]["allowed_features"]["glydex"]
        
        # Trial includes these
        assert "sugar_log" in glydex_features
        assert "warnings" in glydex_features
        
        # Trial excludes these (premium only)
        assert "diet_plans" not in glydex_features
        assert "essential_tests" not in glydex_features
        print("PASS: Glydex trial features correct (2 trial, 2 premium-only)")

    def test_check_active_no_params(self):
        """Check-active with no params returns active=false"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/check-active")
        assert response.status_code == 200
        data = response.json()
        assert data.get("active") == False
        assert data.get("trial") is None
        print("PASS: Check-active with no params returns active=false, trial=null")

    def test_start_trial_missing_email(self):
        """Start trial without email/phone returns error"""
        response = requests.post(
            f"{BASE_URL}/api/membership-tiers/start-trial",
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        assert "email or phone required" in data.get("detail", "").lower()
        print("PASS: Start trial without email returns validation error")


class TestPlanDetails:
    """Test individual plan details"""
    
    def test_gold_plan_details(self):
        """GET /api/membership-tiers/plans/gold"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/gold")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        plan = data.get("plan", {})
        assert plan.get("id") == "gold"
        assert plan.get("price") == 999
        assert plan["benefits"]["medicine_discount"] == 25
        print("PASS: Gold plan details correct")

    def test_silver_plan_details(self):
        """GET /api/membership-tiers/plans/silver"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/silver")
        assert response.status_code == 200
        data = response.json()
        plan = data.get("plan", {})
        assert plan.get("id") == "silver"
        assert plan.get("price") == 799
        print("PASS: Silver plan details correct")

    def test_bronze_plan_details(self):
        """GET /api/membership-tiers/plans/bronze"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/bronze")
        assert response.status_code == 200
        data = response.json()
        plan = data.get("plan", {})
        assert plan.get("id") == "bronze"
        assert plan.get("price") == 499
        print("PASS: Bronze plan details correct")

    def test_invalid_plan(self):
        """GET /api/membership-tiers/plans/invalid returns 404"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/invalid")
        assert response.status_code == 404
        print("PASS: Invalid plan returns 404")
