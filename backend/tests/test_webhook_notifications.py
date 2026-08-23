"""
Test Cashfree webhook and notification dispatch
Tests for iteration 287
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCashfreeWebhook:
    """Test Cashfree webhook endpoint and notification dispatch"""
    
    def test_webhook_endpoint_exists(self):
        """Test that webhook endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/webhook",
            json={"type": "test", "data": {}},
            headers={"Content-Type": "application/json"}
        )
        # Should not return 404
        assert response.status_code != 404, "Webhook endpoint not found"
        print(f"✓ Webhook endpoint accessible, status: {response.status_code}")
    
    def test_webhook_handles_payment_success(self):
        """Test webhook handles SUCCESS payment status"""
        payload = {
            "type": "PAYMENT_SUCCESS_WEBHOOK",
            "data": {
                "order": {"order_id": "TEST_WEBHOOK_ORDER_287"},
                "payment": {
                    "payment_status": "SUCCESS",
                    "payment_amount": 500,
                    "payment_group": "upi",
                    "cf_payment_id": "CF_TEST_287"
                }
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/webhook",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Webhook failed: {response.text}"
        data = response.json()
        assert data.get("status") == "success", f"Unexpected response: {data}"
        print(f"✓ Webhook processed SUCCESS payment: {data}")
    
    def test_webhook_handles_failed_payment(self):
        """Test webhook handles FAILED payment status"""
        payload = {
            "type": "PAYMENT_FAILED_WEBHOOK",
            "data": {
                "order": {"order_id": "TEST_FAILED_ORDER_287"},
                "payment": {
                    "payment_status": "FAILED",
                    "payment_amount": 300,
                    "payment_group": "card",
                    "cf_payment_id": "CF_FAILED_287"
                }
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/webhook",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Webhook failed: {response.text}"
        print(f"✓ Webhook processed FAILED payment")
    
    def test_webhook_ignores_missing_order_id(self):
        """Test webhook gracefully handles missing order_id"""
        payload = {
            "type": "PAYMENT_WEBHOOK",
            "data": {
                "order": {},
                "payment": {"payment_status": "SUCCESS"}
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/webhook",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ignored" or data.get("status") == "success"
        print(f"✓ Webhook handled missing order_id gracefully")


class TestPaymentNotifications:
    """Test payment notification endpoints"""
    
    def test_get_notifications_endpoint(self):
        """Test notifications endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/payment-webhooks/notifications/test_user_287"
        )
        # Should return 200 with empty list or notifications
        assert response.status_code == 200, f"Notifications endpoint failed: {response.status_code}"
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"✓ Notifications endpoint working: {data.get('unread_count', 0)} unread")
    
    def test_mark_notifications_read(self):
        """Test marking notifications as read"""
        response = requests.post(
            f"{BASE_URL}/api/payment-webhooks/notifications/test_user_287/mark-read"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Mark notifications read working")


class TestDisputeEndpoints:
    """Test payment dispute endpoints"""
    
    def test_list_disputes(self):
        """Test listing disputes"""
        response = requests.get(f"{BASE_URL}/api/payment-webhooks/disputes")
        assert response.status_code == 200
        data = response.json()
        assert "disputes" in data
        assert "summary" in data
        print(f"✓ Disputes list endpoint working: {data['summary']}")
    
    def test_create_dispute(self):
        """Test creating a dispute"""
        dispute_data = {
            "order_id": "TEST_DISPUTE_ORDER_287",
            "order_type": "pharmacy",
            "customer_name": "Test Customer",
            "customer_phone": "9876543210",
            "dispute_reason": "not_received",
            "description": "Test dispute for iteration 287",
            "amount": 500.0
        }
        response = requests.post(
            f"{BASE_URL}/api/payment-webhooks/disputes",
            json=dispute_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "dispute_id" in data
        print(f"✓ Dispute created: {data.get('dispute_id')}")
        return data.get("dispute_id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
