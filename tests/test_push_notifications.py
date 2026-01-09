"""
Push Notification API Tests for Nevika Cura Healthcare
Tests VAPID key retrieval, subscription management, and notification sending
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PASSWORD = "nevikacura2026"

class TestPushNotificationAPIs:
    """Test Push Notification API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_user_email = f"TEST_push_{uuid.uuid4().hex[:8]}@example.com"
        self.test_user_phone = f"9{uuid.uuid4().hex[:9]}"
        self.test_endpoint = f"https://fcm.googleapis.com/fcm/send/{uuid.uuid4().hex}"
        
    def get_auth_token(self):
        """Register a test user and get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_user_email,
            "password": "testpass123",
            "phone": self.test_user_phone,
            "name": "Test Push User"
        })
        if response.status_code == 200:
            return response.json().get("token")
        # If user exists, try login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": "testpass123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    # ============ VAPID Public Key Tests ============
    
    def test_get_vapid_public_key_success(self):
        """Test GET /api/push/vapid-public-key returns VAPID public key"""
        response = self.session.get(f"{BASE_URL}/api/push/vapid-public-key")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "publicKey" in data, "Response should contain publicKey"
        assert isinstance(data["publicKey"], str), "publicKey should be a string"
        assert len(data["publicKey"]) > 50, "publicKey should be a valid VAPID key (>50 chars)"
        
        # Verify it matches expected VAPID key
        expected_key = "BCUWn2wWXEVDbMD12x8vCtnJMxfJb6dEOry0QihN9kgz3OgBvjzltnQJJdpkCvkP-euf1dBwX7YYW6d4PuPpJcw"
        assert data["publicKey"] == expected_key, f"VAPID key mismatch. Got: {data['publicKey']}"
        
        print(f"✓ VAPID public key retrieved successfully: {data['publicKey'][:30]}...")

    # ============ Push Subscription Tests ============
    
    def test_subscribe_push_without_auth(self):
        """Test POST /api/push/subscribe works without authentication (anonymous subscription)"""
        subscription_data = {
            "endpoint": self.test_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Subscription should succeed"
        assert "message" in data, "Response should contain message"
        
        print(f"✓ Anonymous push subscription created successfully")
        
        # Cleanup - unsubscribe
        self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)
    
    def test_subscribe_push_with_auth(self):
        """Test POST /api/push/subscribe with authenticated user"""
        token = self.get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        subscription_data = {
            "endpoint": self.test_endpoint + "_auth",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Subscription should succeed"
        
        print(f"✓ Authenticated push subscription created successfully")
        
        # Cleanup - unsubscribe
        self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)
    
    def test_subscribe_push_duplicate_endpoint(self):
        """Test that duplicate subscriptions are handled (upsert behavior)"""
        subscription_data = {
            "endpoint": self.test_endpoint + "_dup",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        # Subscribe twice
        response1 = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        response2 = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        
        assert response1.status_code == 200, f"First subscription failed: {response1.text}"
        assert response2.status_code == 200, f"Second subscription failed: {response2.text}"
        
        print(f"✓ Duplicate subscription handled correctly (upsert)")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)

    # ============ Push Unsubscribe Tests ============
    
    def test_unsubscribe_push_success(self):
        """Test POST /api/push/unsubscribe removes subscription"""
        subscription_data = {
            "endpoint": self.test_endpoint + "_unsub",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        # First subscribe
        self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        
        # Then unsubscribe
        response = self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Unsubscribe should succeed"
        
        print(f"✓ Push unsubscription successful")
    
    def test_unsubscribe_nonexistent_endpoint(self):
        """Test unsubscribing from non-existent endpoint"""
        subscription_data = {
            "endpoint": f"https://nonexistent.endpoint/{uuid.uuid4().hex}",
            "keys": {}
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == False, "Should return success=False for non-existent subscription"
        
        print(f"✓ Non-existent subscription handled correctly")

    # ============ Test Push Notification Tests ============
    
    def test_push_test_requires_auth(self):
        """Test POST /api/push/test requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/push/test")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print(f"✓ Test notification correctly requires authentication")
    
    def test_push_test_with_auth_no_subscription(self):
        """Test POST /api/push/test with auth but no subscription"""
        token = self.get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.post(f"{BASE_URL}/api/push/test", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return success=False since no subscription exists for this user
        assert "success" in data, "Response should contain success field"
        
        print(f"✓ Test notification with no subscription handled: {data}")
    
    def test_push_test_with_subscription(self):
        """Test POST /api/push/test with valid subscription"""
        token = self.get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        # First create a subscription
        subscription_data = {
            "endpoint": self.test_endpoint + "_test",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data, headers=headers)
        
        # Now test notification
        response = self.session.post(f"{BASE_URL}/api/push/test", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain success field"
        assert "details" in data, "Response should contain details"
        
        print(f"✓ Test notification sent: {data}")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)

    # ============ Admin Push Notification Tests ============
    
    def test_admin_get_subscribers_requires_auth(self):
        """Test GET /api/admin/push/subscribers requires admin auth"""
        response = self.session.get(f"{BASE_URL}/api/admin/push/subscribers")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        
        print(f"✓ Admin subscribers endpoint correctly requires authentication")
    
    def test_admin_get_subscribers_success(self):
        """Test GET /api/admin/push/subscribers returns subscriber count"""
        admin_token = self.get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/push/subscribers", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_subscribers" in data, "Response should contain total_subscribers"
        assert "authenticated_users" in data, "Response should contain authenticated_users"
        assert "anonymous" in data, "Response should contain anonymous count"
        
        assert isinstance(data["total_subscribers"], int), "total_subscribers should be int"
        assert isinstance(data["authenticated_users"], int), "authenticated_users should be int"
        assert isinstance(data["anonymous"], int), "anonymous should be int"
        
        print(f"✓ Admin subscribers count: total={data['total_subscribers']}, auth={data['authenticated_users']}, anon={data['anonymous']}")
    
    def test_admin_broadcast_requires_auth(self):
        """Test POST /api/admin/push/broadcast requires admin auth"""
        payload = {
            "title": "Test Broadcast",
            "body": "This is a test broadcast"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/push/broadcast", json=payload)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        
        print(f"✓ Admin broadcast endpoint correctly requires authentication")
    
    def test_admin_broadcast_success(self):
        """Test POST /api/admin/push/broadcast sends broadcast notification"""
        admin_token = self.get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        
        payload = {
            "title": "Test Broadcast 📢",
            "body": "This is a test broadcast notification from Nevika Cura",
            "url": "/",
            "tag": "test-broadcast"
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = self.session.post(f"{BASE_URL}/api/admin/push/broadcast", json=payload, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Broadcast should succeed"
        assert "details" in data, "Response should contain details"
        
        print(f"✓ Admin broadcast sent successfully: {data}")

    # ============ Integration Tests ============
    
    def test_full_subscription_flow(self):
        """Test complete subscription flow: subscribe -> test -> unsubscribe"""
        token = self.get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        subscription_data = {
            "endpoint": self.test_endpoint + "_flow",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 1: Get VAPID key
        vapid_response = self.session.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert vapid_response.status_code == 200, "Failed to get VAPID key"
        print(f"  Step 1: Got VAPID key")
        
        # Step 2: Subscribe
        sub_response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data, headers=headers)
        assert sub_response.status_code == 200, f"Failed to subscribe: {sub_response.text}"
        print(f"  Step 2: Subscribed successfully")
        
        # Step 3: Send test notification
        test_response = self.session.post(f"{BASE_URL}/api/push/test", headers=headers)
        assert test_response.status_code == 200, f"Failed to send test: {test_response.text}"
        print(f"  Step 3: Test notification sent")
        
        # Step 4: Unsubscribe
        unsub_response = self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)
        assert unsub_response.status_code == 200, f"Failed to unsubscribe: {unsub_response.text}"
        print(f"  Step 4: Unsubscribed successfully")
        
        print(f"✓ Full subscription flow completed successfully")


class TestPushNotificationValidation:
    """Test input validation for push notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_subscribe_missing_endpoint(self):
        """Test subscription with missing endpoint"""
        subscription_data = {
            "keys": {
                "p256dh": "test",
                "auth": "test"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        
        assert response.status_code == 422, f"Expected 422 for missing endpoint, got {response.status_code}"
        
        print(f"✓ Missing endpoint validation works")
    
    def test_subscribe_missing_keys(self):
        """Test subscription with missing keys"""
        subscription_data = {
            "endpoint": "https://test.endpoint/test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        
        assert response.status_code == 422, f"Expected 422 for missing keys, got {response.status_code}"
        
        print(f"✓ Missing keys validation works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
