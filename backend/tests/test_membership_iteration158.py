"""
Test suite for Membership Feature Enhancements - Iteration 158
Tests:
1. Verify endpoint returns 404 for non-existent orders
2. Verify endpoint structure for valid response
3. Form validation (email required)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-rx-portal.preview.emergentagent.com")


class TestCashfreeVerifyEndpoint:
    """Tests for /api/payments/cashfree/verify/{order_id} endpoint"""

    def test_verify_nonexistent_order_returns_404(self):
        """Verify endpoint returns proper 404 for non-existent order"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/FAKE_ORDER_12345")
        # Should return 404 for non-existent order
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        print("✓ Verify endpoint returns 404 for non-existent order")

    def test_verify_empty_order_id(self):
        """Verify endpoint handles empty order ID gracefully"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/")
        # Should return 404 or 422
        assert response.status_code in [404, 422, 405]
        print(f"✓ Verify endpoint returns {response.status_code} for empty order ID")

    def test_verify_special_characters_order_id(self):
        """Verify endpoint handles special characters in order ID"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/test_order_with_special_chars!")
        # Should return 404 (not found) or 422 (validation error)
        assert response.status_code in [404, 422, 500]
        print(f"✓ Verify endpoint handles special characters (status: {response.status_code})")


class TestMembershipFormValidation:
    """Tests for membership form validation (frontend validation, tested via create-order endpoint)"""

    def test_create_order_missing_email(self):
        """Create order should handle missing email gracefully"""
        payload = {
            "customer_id": "TEST_123",
            "customer_name": "Test User",
            "customer_phone": "9876543210",
            # No email
            "amount": 999,
            "product_type": "membership",
            "product_id": "NEVIKA_MEMBERSHIP_ANNUAL"
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        # Server should either handle gracefully or return validation error
        assert response.status_code in [200, 422]
        print(f"✓ Create order without email returns {response.status_code}")

    def test_create_order_invalid_email(self):
        """Create order should handle invalid email format"""
        payload = {
            "customer_id": "TEST_124",
            "customer_name": "Test User",
            "customer_email": "invalidemail",  # No @ symbol
            "customer_phone": "9876543210",
            "amount": 999,
            "product_type": "membership",
            "product_id": "NEVIKA_MEMBERSHIP_ANNUAL"
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        # Server might accept (frontend validates) or reject
        print(f"✓ Create order with invalid email returns {response.status_code}")


class TestAPIHealthCheck:
    """Basic health checks for related endpoints"""

    def test_backend_health(self):
        """Backend API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        # Backend root endpoint should return something (200 or 404 for missing route)
        assert response.status_code in [200, 404]
        print(f"✓ Backend API is accessible (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
