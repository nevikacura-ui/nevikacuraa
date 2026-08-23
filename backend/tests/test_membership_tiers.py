"""
Membership Tiers API Tests - 3-Tier System (Gold, Silver, Bronze)
Tests the /api/membership-tiers endpoints for plan data and tier retrieval
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestMembershipTiersPlans:
    """Tests for GET /api/membership-tiers/plans endpoint"""

    def test_get_all_plans_success(self):
        """Verify GET /api/membership-tiers/plans returns all 3 tiers"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") is True
        assert "plans" in data
        assert len(data["plans"]) == 3, f"Expected 3 plans, got {len(data['plans'])}"
        
        # Verify tier IDs
        tier_ids = [p["id"] for p in data["plans"]]
        assert "gold" in tier_ids
        assert "silver" in tier_ids
        assert "bronze" in tier_ids
        print("✅ GET /api/membership-tiers/plans returns 3 plans (gold, silver, bronze)")

    def test_gold_plan_correct_price(self):
        """Verify Gold plan has price ₹999"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200
        
        data = response.json()
        gold_plan = next((p for p in data["plans"] if p["id"] == "gold"), None)
        assert gold_plan is not None, "Gold plan not found"
        assert gold_plan["price"] == 999, f"Expected Gold price 999, got {gold_plan['price']}"
        assert gold_plan["name"] == "Gold"
        print("✅ Gold plan has correct price: ₹999")

    def test_silver_plan_correct_price(self):
        """Verify Silver plan has price ₹799"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200
        
        data = response.json()
        silver_plan = next((p for p in data["plans"] if p["id"] == "silver"), None)
        assert silver_plan is not None, "Silver plan not found"
        assert silver_plan["price"] == 799, f"Expected Silver price 799, got {silver_plan['price']}"
        assert silver_plan["name"] == "Silver"
        print("✅ Silver plan has correct price: ₹799")

    def test_bronze_plan_correct_price(self):
        """Verify Bronze plan has price ₹499"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200
        
        data = response.json()
        bronze_plan = next((p for p in data["plans"] if p["id"] == "bronze"), None)
        assert bronze_plan is not None, "Bronze plan not found"
        assert bronze_plan["price"] == 499, f"Expected Bronze price 499, got {bronze_plan['price']}"
        assert bronze_plan["name"] == "Bronze"
        print("✅ Bronze plan has correct price: ₹499")

    def test_plans_have_benefits(self):
        """Verify all plans have benefits data"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200
        
        data = response.json()
        for plan in data["plans"]:
            assert "benefits" in plan, f"Plan {plan['id']} missing benefits"
            assert "medicine_discount" in plan["benefits"]
            assert "free_services" in plan["benefits"]
            assert "features" in plan, f"Plan {plan['id']} missing features"
            assert len(plan["features"]) > 0
        print("✅ All plans have benefits and features")


class TestMembershipTiersByTierId:
    """Tests for GET /api/membership-tiers/plans/{tier_id} endpoint"""

    def test_get_gold_plan_by_id(self):
        """Verify GET /api/membership-tiers/plans/gold returns gold plan details"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/gold")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "plan" in data
        assert data["plan"]["id"] == "gold"
        assert data["plan"]["name"] == "Gold"
        assert data["plan"]["price"] == 999
        assert data["plan"]["benefits"]["medicine_discount"] == 25
        print("✅ GET /api/membership-tiers/plans/gold returns gold plan details")

    def test_get_silver_plan_by_id(self):
        """Verify GET /api/membership-tiers/plans/silver returns silver plan details"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/silver")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["plan"]["id"] == "silver"
        assert data["plan"]["name"] == "Silver"
        assert data["plan"]["price"] == 799
        assert data["plan"]["benefits"]["medicine_discount"] == 20
        print("✅ GET /api/membership-tiers/plans/silver returns silver plan details")

    def test_get_bronze_plan_by_id(self):
        """Verify GET /api/membership-tiers/plans/bronze returns bronze plan details"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/bronze")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["plan"]["id"] == "bronze"
        assert data["plan"]["name"] == "Bronze"
        assert data["plan"]["price"] == 499
        assert data["plan"]["benefits"]["medicine_discount"] == 15
        print("✅ GET /api/membership-tiers/plans/bronze returns bronze plan details")

    def test_get_invalid_tier_returns_404(self):
        """Verify GET /api/membership-tiers/plans/invalid returns 404"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/platinum")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Invalid tier ID returns 404")


class TestMembershipTiersBenefitsDetail:
    """Tests for tier-specific benefits verification"""

    def test_gold_tier_benefits(self):
        """Verify Gold tier has best benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/gold")
        data = response.json()
        benefits = data["plan"]["benefits"]
        
        assert benefits["medicine_discount"] == 25, "Gold should have 25% medicine discount"
        assert benefits["free_services"] == 12, "Gold should have 12 free services"
        assert benefits["portal_access"] == "all", "Gold should have access to all portals"
        assert benefits["portal_duration_months"] == 12
        assert benefits["mangone_basic"] is True, "Gold should include MangOne Basic"
        print("✅ Gold tier has best benefits (25% discount, 12 services, all portals, MangOne)")

    def test_silver_tier_benefits(self):
        """Verify Silver tier has mid-level benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/silver")
        data = response.json()
        benefits = data["plan"]["benefits"]
        
        assert benefits["medicine_discount"] == 20
        assert benefits["free_services"] == 9
        assert benefits["portal_access"] == "any_2"
        assert benefits["portal_duration_months"] == 9
        assert benefits["mangone_basic"] is False
        print("✅ Silver tier has mid-level benefits (20% discount, 9 services, 2 portals)")

    def test_bronze_tier_benefits(self):
        """Verify Bronze tier has basic benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/bronze")
        data = response.json()
        benefits = data["plan"]["benefits"]
        
        assert benefits["medicine_discount"] == 15
        assert benefits["free_services"] == 6
        assert benefits["portal_access"] == "any_1"
        assert benefits["portal_duration_months"] == 6
        assert benefits["mangone_basic"] is False
        print("✅ Bronze tier has basic benefits (15% discount, 6 services, 1 portal)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
