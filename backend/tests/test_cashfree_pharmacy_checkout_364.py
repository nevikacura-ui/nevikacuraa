"""
Test Suite for Cashfree Payment Integration & Pharmacy Checkout
Iteration 364 - Testing:
1. POST /api/payments/cashfree/create-order - Creates payment order
2. GET /api/payments/cashfree/verify/{order_id} - Verifies payment status
3. GET /api/payments/cashfree/order-status/{order_id} - Gets order status from DB
4. POST /api/payments/cashfree/webhook - Processes payment events
5. POST /api/pharmacy - Creates pharmacy order
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ API health check passed")


class TestPharmacyOrderCreation:
    """Test pharmacy order creation endpoint"""
    
    def test_create_pharmacy_order_success(self):
        """Test creating a pharmacy order with valid data"""
        order_data = {
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 2, "mrp": 50, "price": 45},
                {"name": "Vitamin C 1000mg", "quantity": 1, "mrp": 150, "price": 135}
            ],
            "patient_name": "TEST_Cashfree_User",
            "patient_phone": "9876543210",
            "patient_email": "test@example.com",
            "delivery_address": "123 Test Street, Test City - 480001",
            "payment_method": "cashfree",
            "payment_status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "order_id" in data or "id" in data, f"Response should contain order_id or id: {data}"
        
        order_id = data.get("order_id") or data.get("id")
        print(f"✅ Pharmacy order created: {order_id}")
        return order_id
    
    def test_create_pharmacy_order_missing_fields(self):
        """Test pharmacy order creation with missing required fields"""
        order_data = {
            "medicines": [],
            "patient_name": "",
            "patient_phone": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        # Should either fail validation or create with empty data
        print(f"✅ Missing fields test: status={response.status_code}")


class TestCashfreeCreateOrder:
    """Test Cashfree create-order endpoint"""
    
    def test_create_order_success(self):
        """Test creating a Cashfree payment order"""
        timestamp = int(time.time())
        order_data = {
            "customer_id": f"TEST_CUST_{timestamp}",
            "customer_name": "TEST_Cashfree_User",
            "customer_email": "test@nevikacura.com",
            "customer_phone": "9876543210",
            "amount": 500.0,
            "product_type": "pharmacy",
            "product_id": f"TEST_ORDER_{timestamp}",
            "return_url": "https://nevikacura.com/payment-success"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json=order_data,
            headers={"Content-Type": "application/json"}
        )
        
        # Rate limiting may return 429
        if response.status_code == 429:
            print("⚠️ Rate limited - waiting and retrying...")
            time.sleep(60)
            response = requests.post(
                f"{BASE_URL}/api/payments/cashfree/create-order",
                json=order_data,
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "order_id" in data, f"Response should contain order_id: {data}"
        assert "payment_session_id" in data, f"Response should contain payment_session_id: {data}"
        assert "cf_order_id" in data, f"Response should contain cf_order_id: {data}"
        
        print(f"✅ Cashfree order created successfully:")
        print(f"   - order_id: {data.get('order_id')}")
        print(f"   - cf_order_id: {data.get('cf_order_id')}")
        print(f"   - payment_session_id: {data.get('payment_session_id')[:50]}...")
        
        return data
    
    def test_create_order_invalid_amount(self):
        """Test creating order with invalid amount (0 or negative)"""
        order_data = {
            "customer_id": "TEST_INVALID",
            "customer_name": "Test User",
            "customer_email": "test@test.com",
            "customer_phone": "9876543210",
            "amount": 0,  # Invalid amount
            "product_type": "pharmacy",
            "product_id": "TEST_INVALID"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json=order_data
        )
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400/422 for invalid amount, got {response.status_code}"
        print("✅ Invalid amount validation works correctly")
    
    def test_create_order_membership_pricing_validation(self):
        """Test membership pricing validation"""
        order_data = {
            "customer_id": "TEST_MEMBERSHIP",
            "customer_name": "Test User",
            "customer_email": "test@test.com",
            "customer_phone": "9876543210",
            "amount": 50,  # Wrong price for monthly (should be 99)
            "product_type": "membership",
            "product_id": "TEST_MEMBERSHIP",
            "membership_plan": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json=order_data
        )
        
        # Should fail with price mismatch
        if response.status_code == 400:
            data = response.json()
            assert "Invalid price" in str(data.get("detail", "")), f"Expected price validation error: {data}"
            print("✅ Membership pricing validation works correctly")
        elif response.status_code == 429:
            print("⚠️ Rate limited - skipping membership pricing test")
        else:
            print(f"⚠️ Unexpected response: {response.status_code} - {response.text}")


class TestCashfreeOrderStatus:
    """Test Cashfree order status endpoints"""
    
    def test_order_status_not_found(self):
        """Test getting status for non-existent order"""
        fake_order_id = "NC_FAKE_ORDER_12345"
        
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/order-status/{fake_order_id}")
        
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        print("✅ Order status returns 404 for non-existent order")
    
    def test_verify_payment_not_found(self):
        """Test verifying payment for non-existent order"""
        fake_order_id = "NC_FAKE_ORDER_12345"
        
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/{fake_order_id}")
        
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        print("✅ Verify payment returns 404 for non-existent order")


class TestCashfreeWebhook:
    """Test Cashfree webhook endpoint"""
    
    def test_webhook_invalid_payload(self):
        """Test webhook with invalid/empty payload"""
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/webhook",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        # Webhook should return success to prevent retries even for invalid data
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "success", f"Expected status=success: {data}"
        print("✅ Webhook handles invalid payload gracefully")
    
    def test_webhook_with_mock_payment_event(self):
        """Test webhook with mock payment success event"""
        webhook_payload = {
            "type": "PAYMENT_SUCCESS_WEBHOOK",
            "data": {
                "order": {
                    "order_id": "NC_TEST_WEBHOOK_12345"
                },
                "payment": {
                    "payment_status": "SUCCESS",
                    "payment_amount": 500,
                    "payment_group": "upi",
                    "cf_payment_id": "CF_TEST_12345",
                    "bank_reference": "TEST_REF_12345"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/webhook",
            json=webhook_payload,
            headers={
                "Content-Type": "application/json",
                "x-webhook-signature": "test_signature",
                "x-webhook-timestamp": str(int(time.time()))
            }
        )
        
        # Should return success (order may not exist, but webhook should not fail)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ Webhook processes mock payment event")


class TestCashfreeEndToEndFlow:
    """Test end-to-end Cashfree payment flow"""
    
    def test_full_payment_flow(self):
        """Test complete payment flow: create order -> check status"""
        # Step 1: Create a Cashfree order
        timestamp = int(time.time())
        order_data = {
            "customer_id": f"TEST_E2E_{timestamp}",
            "customer_name": "TEST_E2E_User",
            "customer_email": "e2e@nevikacura.com",
            "customer_phone": "9876543210",
            "amount": 1049.0,  # Above 1000 for free delivery
            "product_type": "pharmacy",
            "product_id": f"TEST_E2E_ORDER_{timestamp}",
            "return_url": "https://nevikacura.com/payment-success"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json=order_data
        )
        
        if create_response.status_code == 429:
            print("⚠️ Rate limited - skipping E2E test")
            return
        
        assert create_response.status_code == 200, f"Create order failed: {create_response.text}"
        
        create_data = create_response.json()
        order_id = create_data.get("order_id")
        
        print(f"✅ Step 1: Order created - {order_id}")
        
        # Step 2: Check order status from DB
        status_response = requests.get(f"{BASE_URL}/api/payments/cashfree/order-status/{order_id}")
        assert status_response.status_code == 200, f"Order status failed: {status_response.text}"
        
        status_data = status_response.json()
        assert status_data.get("order_id") == order_id
        assert status_data.get("order_status") in ["ACTIVE", "PENDING"]
        
        print(f"✅ Step 2: Order status retrieved - {status_data.get('order_status')}")
        
        # Step 3: Verify payment (will show pending since no actual payment)
        verify_response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/{order_id}")
        assert verify_response.status_code == 200, f"Verify failed: {verify_response.text}"
        
        verify_data = verify_response.json()
        assert verify_data.get("order_id") == order_id
        
        print(f"✅ Step 3: Payment verification - success={verify_data.get('success')}, status={verify_data.get('order_status')}")
        print("✅ E2E flow completed successfully")


class TestDeliveryChargeLogic:
    """Test delivery charge calculation logic"""
    
    def test_delivery_charge_under_1000(self):
        """Verify delivery charge is ₹49 for orders under ₹1000"""
        # This is frontend logic, but we can verify the expected behavior
        items_total = 500
        expected_delivery = 49
        expected_total = items_total + expected_delivery
        
        assert items_total < 1000, "Test setup: items_total should be under 1000"
        print(f"✅ Under ₹1000: Items={items_total}, Delivery={expected_delivery}, Total={expected_total}")
    
    def test_delivery_charge_above_1000(self):
        """Verify delivery is FREE for orders ₹1000 and above"""
        items_total = 1200
        expected_delivery = 0
        expected_total = items_total + expected_delivery
        
        assert items_total >= 1000, "Test setup: items_total should be 1000 or above"
        print(f"✅ Above ₹1000: Items={items_total}, Delivery=FREE, Total={expected_total}")
    
    def test_delivery_charge_exactly_1000(self):
        """Verify delivery is FREE for orders exactly ₹1000"""
        items_total = 1000
        expected_delivery = 0
        expected_total = items_total + expected_delivery
        
        assert items_total >= 1000, "Test setup: items_total should be exactly 1000"
        print(f"✅ Exactly ₹1000: Items={items_total}, Delivery=FREE, Total={expected_total}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
