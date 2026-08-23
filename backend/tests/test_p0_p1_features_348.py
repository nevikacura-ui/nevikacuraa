"""
Test P0 and P1 features for iteration 348:
- P1: Health Plans API (GET /api/health-plans, POST /api/health-plans/subscribe, GET /api/health-plans/my-subscriptions/{phone})
- P1: Medicine Reminders Cron endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthPlansAPI:
    """Test Health Plans subscription endpoints"""
    
    def test_get_health_plans_returns_3_plans(self):
        """GET /api/health-plans should return 3 health plans"""
        response = requests.get(f"{BASE_URL}/api/health-plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plans" in data, "Response should have 'plans' key"
        assert len(data["plans"]) == 3, f"Expected 3 plans, got {len(data['plans'])}"
        
        # Verify plan IDs
        plan_ids = [p["id"] for p in data["plans"]]
        assert "diabetes-care" in plan_ids, "Should have diabetes-care plan"
        assert "womens-health" in plan_ids, "Should have womens-health plan"
        assert "family-wellness" in plan_ids, "Should have family-wellness plan"
        
        # Verify plan structure
        for plan in data["plans"]:
            assert "id" in plan
            assert "name" in plan
            assert "price" in plan
            assert "billing" in plan
            assert "includes" in plan
            assert isinstance(plan["includes"], list)
        
        print(f"✓ GET /api/health-plans returned {len(data['plans'])} plans")
    
    def test_subscribe_with_cashfree_order_id_returns_pending(self):
        """POST /api/health-plans/subscribe with cashfree_order_id should return status pending"""
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "plan_id": "diabetes-care",
            "phone": test_phone,
            "patient_name": "Test Patient Pending",
            "family_members": [],
            "cashfree_order_id": f"order_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "subscription" in data, "Response should have subscription"
        
        subscription = data["subscription"]
        assert subscription["status"] == "pending", f"Expected status 'pending', got '{subscription['status']}'"
        assert subscription["cashfree_order_id"] == payload["cashfree_order_id"]
        assert subscription["plan_id"] == "diabetes-care"
        
        print(f"✓ POST /api/health-plans/subscribe with cashfree_order_id returns status=pending")
    
    def test_subscribe_without_cashfree_order_id_returns_active(self):
        """POST /api/health-plans/subscribe without cashfree_order_id should return status active"""
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "plan_id": "womens-health",
            "phone": test_phone,
            "patient_name": "Test Patient Active",
            "family_members": []
            # No cashfree_order_id
        }
        
        response = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "subscription" in data, "Response should have subscription"
        
        subscription = data["subscription"]
        assert subscription["status"] == "active", f"Expected status 'active', got '{subscription['status']}'"
        assert subscription["cashfree_order_id"] is None
        assert subscription["plan_id"] == "womens-health"
        
        print(f"✓ POST /api/health-plans/subscribe without cashfree_order_id returns status=active")
    
    def test_get_my_subscriptions_returns_active_and_pending(self):
        """GET /api/health-plans/my-subscriptions/{phone} should return both active and pending subscriptions"""
        # Create a unique phone for this test
        test_phone = f"9999{uuid.uuid4().hex[:6]}"
        
        # Create an active subscription
        active_payload = {
            "plan_id": "diabetes-care",
            "phone": test_phone,
            "patient_name": "Test Active Sub",
            "family_members": []
        }
        resp1 = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=active_payload)
        assert resp1.status_code == 200, f"Failed to create active subscription: {resp1.text}"
        
        # Create a pending subscription
        pending_payload = {
            "plan_id": "family-wellness",
            "phone": test_phone,
            "patient_name": "Test Pending Sub",
            "family_members": [],
            "cashfree_order_id": f"order_{uuid.uuid4().hex[:8]}"
        }
        resp2 = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=pending_payload)
        assert resp2.status_code == 200, f"Failed to create pending subscription: {resp2.text}"
        
        # Get subscriptions
        response = requests.get(f"{BASE_URL}/api/health-plans/my-subscriptions/{test_phone}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscriptions" in data, "Response should have 'subscriptions' key"
        
        subs = data["subscriptions"]
        assert len(subs) >= 2, f"Expected at least 2 subscriptions, got {len(subs)}"
        
        statuses = [s["status"] for s in subs]
        assert "active" in statuses, "Should have at least one active subscription"
        assert "pending" in statuses, "Should have at least one pending subscription"
        
        print(f"✓ GET /api/health-plans/my-subscriptions returns both active and pending subscriptions")
    
    def test_subscribe_invalid_plan_returns_404(self):
        """POST /api/health-plans/subscribe with invalid plan_id should return 404"""
        payload = {
            "plan_id": "invalid-plan-id",
            "phone": "9999999999",
            "patient_name": "Test Invalid",
            "family_members": []
        }
        
        response = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        print(f"✓ POST /api/health-plans/subscribe with invalid plan returns 404")


class TestMedicineRemindersCron:
    """Test Medicine Reminders cron endpoint"""
    
    def test_cron_send_reminders_with_correct_secret(self):
        """POST /api/medicine-reminders/cron/send-reminders with correct secret should work"""
        cron_secret = "nevika_cron_2026"
        
        response = requests.post(
            f"{BASE_URL}/api/medicine-reminders/cron/send-reminders",
            params={"secret": cron_secret}
        )
        
        # Should return 200 (success) - even if no reminders to send
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # The endpoint should return some indication of success
        assert "success" in data or "sent" in data or "processed" in data or "message" in data, \
            f"Response should indicate success: {data}"
        
        print(f"✓ POST /api/medicine-reminders/cron/send-reminders with correct secret works")
    
    def test_cron_send_reminders_with_wrong_secret(self):
        """POST /api/medicine-reminders/cron/send-reminders with wrong secret should fail"""
        wrong_secret = "wrong_secret"
        
        response = requests.post(
            f"{BASE_URL}/api/medicine-reminders/cron/send-reminders",
            params={"secret": wrong_secret}
        )
        
        # Should return 401 or 403 for unauthorized
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        
        print(f"✓ POST /api/medicine-reminders/cron/send-reminders with wrong secret returns 401/403")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_is_accessible(self):
        """API should be accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print(f"✓ API is accessible at {BASE_URL}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
