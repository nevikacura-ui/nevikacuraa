"""
Test Phase 4 Features - Iteration 340
Testing:
1. Cashfree production API - POST /api/payments/cashfree/create-order
2. Health Plans API - GET /api/health-plans
3. Health Plans Subscribe - POST /api/health-plans/subscribe
4. Home Care Callback - POST /api/home-care/callback
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCashfreeProductionAPI:
    """Test Cashfree payment order creation - PRODUCTION mode"""
    
    def test_cashfree_create_order_success(self):
        """Test creating a Cashfree order with valid data"""
        payload = {
            "customer_id": "test_customer_340",
            "customer_name": "Test Patient",
            "customer_email": "test340@nevikacura.com",
            "customer_phone": "9876543210",
            "amount": 499,
            "product_type": "health_plan",
            "product_id": "diabetes-care",
            "membership_plan": "monthly"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Cashfree create-order response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        # Should return 200 with order_id and payment_session_id
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "order_id" in data, f"Missing order_id in response: {data}"
        assert "payment_session_id" in data, f"Missing payment_session_id in response: {data}"
        assert data.get("order_status") == "ACTIVE", f"Expected order_status=ACTIVE, got {data.get('order_status')}"
        
        print(f"✅ Cashfree order created: {data.get('order_id')}")
        print(f"   Payment session ID: {data.get('payment_session_id')[:30]}...")
        
    def test_cashfree_create_order_health_plan_subscription(self):
        """Test creating order for health plan subscription"""
        payload = {
            "customer_id": "health_plan_test_340",
            "customer_name": "Health Plan Subscriber",
            "customer_email": "healthplan340@nevikacura.com",
            "customer_phone": "9988776655",
            "amount": 999,
            "product_type": "health_plan",
            "product_id": "diabetes_care",
            "membership_plan": "monthly"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Health plan order response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "order_id" in data
        print(f"✅ Health plan order created: {data.get('order_id')}")


class TestHealthPlansAPI:
    """Test Health Plans endpoints"""
    
    def test_get_health_plans(self):
        """Test GET /api/health-plans returns plans list"""
        response = requests.get(f"{BASE_URL}/api/health-plans")
        print(f"Health plans response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "plans" in data, f"Missing 'plans' key in response: {data}"
        
        plans = data["plans"]
        assert len(plans) >= 3, f"Expected at least 3 plans, got {len(plans)}"
        
        # Verify plan structure
        plan_ids = [p.get("id") for p in plans]
        print(f"Plan IDs: {plan_ids}")
        
        # Check for expected plans
        expected_ids = ["diabetes-care", "womens-health", "family-wellness"]
        for expected_id in expected_ids:
            assert expected_id in plan_ids, f"Missing plan: {expected_id}"
        
        # Verify pricing
        for plan in plans:
            assert "price" in plan, f"Missing price in plan: {plan.get('id')}"
            assert "name" in plan, f"Missing name in plan: {plan.get('id')}"
            print(f"  - {plan.get('name')}: ₹{plan.get('price')}/{plan.get('billing', 'monthly')}")
        
        print(f"✅ Health plans API returns {len(plans)} plans")
        
    def test_health_plans_subscribe(self):
        """Test POST /api/health-plans/subscribe"""
        payload = {
            "plan_id": "diabetes-care",
            "phone": "9876543210",
            "patient_name": "Test Subscriber 340"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=payload)
        print(f"Subscribe response: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "subscription" in data, f"Missing subscription in response: {data}"
        
        sub = data["subscription"]
        assert sub.get("plan_id") == "diabetes-care"
        assert sub.get("status") == "active"
        
        print(f"✅ Subscription created: {sub.get('id')}")


class TestHomeCareAPI:
    """Test Home Care callback endpoint"""
    
    def test_home_care_callback_success(self):
        """Test POST /api/home-care/callback"""
        payload = {
            "name": "Test Patient 340",
            "phone": "9876543210",
            "service": "nursing_care",
            "address": "123 Test Street, Mumbai",
            "preferred_time": "morning",
            "notes": "Test callback request"
        }
        
        response = requests.post(f"{BASE_URL}/api/home-care/callback", json=payload)
        print(f"Home care callback response: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "message" in data, f"Missing message in response: {data}"
        
        print(f"✅ Home care callback created successfully")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health check: {response.status_code}")
        assert response.status_code == 200
        print("✅ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
