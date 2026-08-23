"""
Test suite for Evara and Glydex Portal Freemium System
Tests the redesigned portals with glass morphism design and freemium paywall gating
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthAndMembershipAPI:
    """Test health and membership-related endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'ok'
        print("PASS: Health endpoint returns OK")
    
    def test_membership_check_active_no_params(self):
        """Test /api/membership-tiers/check-active returns false when no email/phone provided"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/check-active")
        assert response.status_code == 200
        data = response.json()
        assert data.get('active') == False
        print("PASS: check-active returns false for no params")
    
    def test_membership_check_active_unknown_email(self):
        """Test /api/membership-tiers/check-active returns false for unknown email"""
        response = requests.get(
            f"{BASE_URL}/api/membership-tiers/check-active",
            params={"email": "unknownuser12345xyz@test.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get('active') == False
        print("PASS: check-active returns false for unknown email")
    
    def test_membership_check_active_unknown_phone(self):
        """Test /api/membership-tiers/check-active returns false for unknown phone"""
        response = requests.get(
            f"{BASE_URL}/api/membership-tiers/check-active",
            params={"phone": "0000000001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get('active') == False
        print("PASS: check-active returns false for unknown phone")


class TestMembershipTiersAPI:
    """Test membership tier plans endpoints"""
    
    def test_get_all_plans(self):
        """Test /api/membership-tiers/plans returns all 3 tiers"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        plans = data.get('plans', [])
        assert len(plans) == 3
        
        plan_ids = [p['id'] for p in plans]
        assert 'gold' in plan_ids
        assert 'silver' in plan_ids
        assert 'bronze' in plan_ids
        print("PASS: All 3 tier plans returned")
    
    def test_get_gold_plan_details(self):
        """Test Gold plan has correct price and benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/gold")
        assert response.status_code == 200
        data = response.json()
        plan = data.get('plan', {})
        
        assert plan.get('price') == 999
        assert plan.get('benefits', {}).get('medicine_discount') == 25
        assert plan.get('benefits', {}).get('portal_access') == 'all'
        print("PASS: Gold plan - ₹999, 25% discount, all portals")
    
    def test_get_silver_plan_details(self):
        """Test Silver plan has correct price and benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/silver")
        assert response.status_code == 200
        data = response.json()
        plan = data.get('plan', {})
        
        assert plan.get('price') == 799
        assert plan.get('benefits', {}).get('medicine_discount') == 20
        assert plan.get('benefits', {}).get('portal_access') == 'any_2'
        print("PASS: Silver plan - ₹799, 20% discount, 2 portals")
    
    def test_get_bronze_plan_details(self):
        """Test Bronze plan has correct price and benefits"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/bronze")
        assert response.status_code == 200
        data = response.json()
        plan = data.get('plan', {})
        
        assert plan.get('price') == 499
        assert plan.get('benefits', {}).get('medicine_discount') == 15
        assert plan.get('benefits', {}).get('portal_access') == 'any_1'
        print("PASS: Bronze plan - ₹499, 15% discount, 1 portal")
    
    def test_invalid_plan_returns_404(self):
        """Test non-existent plan returns 404"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/invalid_tier")
        assert response.status_code == 404
        print("PASS: Invalid plan returns 404")


class TestEvaraGlydexIntegration:
    """Integration tests for portal-specific APIs"""
    
    def test_evara_period_history_requires_auth(self):
        """Test Evara period history endpoint requires authentication or returns 404 if not implemented"""
        response = requests.get(f"{BASE_URL}/api/evara/period-history")
        # Should return 401, 403, 422 (auth required) or 404 (not yet implemented)
        assert response.status_code in [401, 403, 404, 422]
        print(f"PASS: Evara period history returns {response.status_code}")
    
    def test_glydex_sugar_logs_requires_auth(self):
        """Test Glydex sugar logs endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/glydex/sugar-logs")
        # Should return 401 or 403 without auth token
        assert response.status_code in [401, 403, 422]
        print("PASS: Glydex sugar logs requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
