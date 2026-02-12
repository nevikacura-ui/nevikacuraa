"""
Cashfree Payment API Tests - Iteration 93
Tests for Cashfree payment order creation and validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCashfreePaymentAPI:
    """Test Cashfree payment order creation endpoint"""
    
    def test_create_order_valid_amount(self):
        """Test creating order with valid amount (>0) - should succeed"""
        payload = {
            "customer_id": "TEST_USER_001",
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "customer_phone": "9876543210",
            "amount": 999.0,  # Valid positive amount
            "product_type": "pharmacy",
            "product_id": "PHARMACY_TEST_001"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Create order response (valid amount): {response.status_code}")
        print(f"Response body: {response.json()}")
        
        # Should succeed with valid amount
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Order creation should succeed"
        assert "order_id" in data, "Response should contain order_id"
        assert "payment_session_id" in data, "Response should contain payment_session_id"
        assert data.get("order_status") == "ACTIVE", f"Order status should be ACTIVE, got {data.get('order_status')}"
        
        print(f"✅ Order created successfully: {data.get('order_id')}")
    
    def test_create_order_zero_amount_rejected(self):
        """Test that zero amount orders are rejected by the API"""
        payload = {
            "customer_id": "TEST_USER_002",
            "customer_name": "Test User Zero",
            "customer_email": "test.zero@example.com",
            "customer_phone": "9876543211",
            "amount": 0,  # Zero amount - prescription orders
            "product_type": "pharmacy",
            "product_id": "PHARMACY_TEST_002"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Create order response (zero amount): {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Should be rejected with 422 (validation error) since amount: Field(..., gt=0)
        assert response.status_code == 422, f"Expected 422 for zero amount, got {response.status_code}"
        
        data = response.json()
        # Check that it's a validation error about amount
        error_detail = str(data)
        assert "amount" in error_detail.lower() or "greater than" in error_detail.lower(), \
            f"Error should mention amount validation: {error_detail}"
        
        print(f"✅ Zero amount correctly rejected with validation error")
    
    def test_create_order_negative_amount_rejected(self):
        """Test that negative amount orders are rejected"""
        payload = {
            "customer_id": "TEST_USER_003",
            "customer_name": "Test User Negative",
            "customer_email": "test.negative@example.com",
            "customer_phone": "9876543212",
            "amount": -100,  # Negative amount - invalid
            "product_type": "pharmacy",
            "product_id": "PHARMACY_TEST_003"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Create order response (negative amount): {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Should be rejected with 422
        assert response.status_code == 422, f"Expected 422 for negative amount, got {response.status_code}"
        
        print(f"✅ Negative amount correctly rejected")
    
    def test_create_order_phone_number_cleanup(self):
        """Test that phone numbers are properly cleaned (removing +91)"""
        payload = {
            "customer_id": "TEST_USER_004",
            "customer_name": "Test User Phone",
            "customer_email": "test.phone@example.com",
            "customer_phone": "+919876543213",  # With +91 prefix
            "amount": 500.0,
            "product_type": "pharmacy",
            "product_id": "PHARMACY_TEST_004"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Create order response (phone with +91): {response.status_code}")
        print(f"Response body: {response.json()}")
        
        # Should succeed - phone should be cleaned
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Order creation should succeed with +91 phone"
        
        print(f"✅ Order created successfully with +91 phone prefix")
    
    def test_create_order_membership_invalid_price(self):
        """Test membership order with mismatched price gets rejected"""
        payload = {
            "customer_id": "TEST_USER_005",
            "customer_name": "Test Membership User",
            "customer_email": "test.membership@example.com",
            "customer_phone": "9876543214",
            "amount": 500.0,  # Wrong price for monthly plan (should be 999)
            "product_type": "membership",
            "product_id": "MEMBERSHIP_TEST_001",
            "membership_plan": "monthly"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Create order response (invalid membership price): {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Should be rejected with 400 - invalid price
        assert response.status_code == 400, f"Expected 400 for invalid membership price, got {response.status_code}"
        
        data = response.json()
        assert "Invalid price" in str(data) or "999" in str(data), \
            f"Error should mention expected price: {data}"
        
        print(f"✅ Invalid membership price correctly rejected")
    
    def test_create_order_membership_valid_price(self):
        """Test membership order with correct price succeeds"""
        payload = {
            "customer_id": "TEST_USER_006",
            "customer_name": "Test Membership Valid",
            "customer_email": "test.membership.valid@example.com",
            "customer_phone": "9876543215",
            "amount": 999.0,  # Correct price for monthly plan
            "product_type": "membership",
            "product_id": "MEMBERSHIP_TEST_002",
            "membership_plan": "monthly"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Create order response (valid membership price): {response.status_code}")
        print(f"Response body: {response.json()}")
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Membership order creation should succeed"
        
        print(f"✅ Membership order created successfully with correct price")


class TestCashfreeOrderStatus:
    """Test Cashfree order status endpoint"""
    
    def test_order_status_not_found(self):
        """Test getting status for non-existent order"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/order-status/NONEXISTENT_ORDER_123")
        print(f"Order status response (not found): {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        
        print(f"✅ Non-existent order correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
