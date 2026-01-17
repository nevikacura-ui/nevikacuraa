"""
Push Notification & Medicine Reminder Cron API Tests - Iteration 44
Tests for:
1. VAPID public key endpoint GET /api/push/vapid-public-key
2. Push subscribe endpoint POST /api/push/subscribe
3. Push unsubscribe endpoint POST /api/push/unsubscribe
4. Push test endpoint POST /api/push/test (requires auth)
5. Medicine reminder cron endpoint POST /api/medicine-reminders/cron/send-reminders
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "testmed@test.com"
TEST_USER_PASSWORD = "test123"
CRON_SECRET = "nevika_cron_2026"
MOCK_OTP = "721358"


class TestPushNotificationEndpoints:
    """Test Push Notification API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_endpoint = f"https://fcm.googleapis.com/fcm/send/{uuid.uuid4().hex}"
        
    def get_test_user_token(self):
        """Login with test user and get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    # ============ VAPID Public Key Tests ============
    
    def test_01_get_vapid_public_key_success(self):
        """Test GET /api/push/vapid-public-key returns VAPID public key"""
        response = self.session.get(f"{BASE_URL}/api/push/vapid-public-key")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "publicKey" in data, "Response should contain publicKey"
        assert isinstance(data["publicKey"], str), "publicKey should be a string"
        assert len(data["publicKey"]) > 50, "publicKey should be a valid VAPID key (>50 chars)"
        
        # Verify it matches expected VAPID key from .env
        expected_key = "BCUWn2wWXEVDbMD12x8vCtnJMxfJb6dEOry0QihN9kgz3OgBvjzltnQJJdpkCvkP-euf1dBwX7YYW6d4PuPpJcw"
        assert data["publicKey"] == expected_key, f"VAPID key mismatch. Got: {data['publicKey']}"
        
        print(f"✓ VAPID public key retrieved successfully: {data['publicKey'][:30]}...")

    # ============ Push Subscribe Tests ============
    
    def test_02_subscribe_push_without_auth(self):
        """Test POST /api/push/subscribe works without authentication (anonymous subscription)"""
        subscription_data = {
            "endpoint": self.test_endpoint + "_anon",
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
    
    def test_03_subscribe_push_with_auth(self):
        """Test POST /api/push/subscribe with authenticated user"""
        token = self.get_test_user_token()
        assert token is not None, "Failed to get auth token for test user"
        
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
    
    def test_04_subscribe_push_duplicate_endpoint(self):
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
    
    def test_05_unsubscribe_push_success(self):
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

    # ============ Test Push Notification Tests ============
    
    def test_06_push_test_requires_auth(self):
        """Test POST /api/push/test requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/push/test")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print(f"✓ Test notification correctly requires authentication")
    
    def test_07_push_test_with_auth(self):
        """Test POST /api/push/test with authenticated user"""
        token = self.get_test_user_token()
        assert token is not None, "Failed to get auth token for test user"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.post(f"{BASE_URL}/api/push/test", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain success field"
        assert "message" in data, "Response should contain message field"
        
        print(f"✓ Test notification endpoint works: {data}")


class TestMedicineReminderCron:
    """Test Medicine Reminder Cron endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_08_cron_send_reminders_requires_secret(self):
        """Test POST /api/medicine-reminders/cron/send-reminders requires secret"""
        response = self.session.post(f"{BASE_URL}/api/medicine-reminders/cron/send-reminders")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        print(f"✓ Cron endpoint correctly requires secret")
    
    def test_09_cron_send_reminders_invalid_secret(self):
        """Test POST /api/medicine-reminders/cron/send-reminders with invalid secret"""
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/cron/send-reminders",
            params={"secret": "wrong_secret"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        print(f"✓ Cron endpoint rejects invalid secret")
    
    def test_10_cron_send_reminders_valid_secret(self):
        """Test POST /api/medicine-reminders/cron/send-reminders with valid secret"""
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/cron/send-reminders",
            params={"secret": CRON_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Cron should succeed"
        assert "timestamp" in data, "Response should contain timestamp"
        assert "notifications_sent" in data, "Response should contain notifications_sent count"
        
        print(f"✓ Cron endpoint works: sent {data.get('notifications_sent', 0)} notifications")


class TestMedicineRemindersAPI:
    """Test Medicine Reminders CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_reminder_id = None
        
    def get_test_user_token(self):
        """Login with test user and get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_11_get_my_reminders(self):
        """Test GET /api/medicine-reminders/my-reminders"""
        token = self.get_test_user_token()
        assert token is not None, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/medicine-reminders/my-reminders", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success"
        assert "reminders" in data, "Should contain reminders list"
        assert "stats" in data, "Should contain stats"
        
        print(f"✓ Get my reminders works: {len(data.get('reminders', []))} reminders found")
    
    def test_12_get_today_schedule(self):
        """Test GET /api/medicine-reminders/today"""
        token = self.get_test_user_token()
        assert token is not None, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/medicine-reminders/today", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success"
        assert "schedule" in data, "Should contain schedule"
        assert "stats" in data, "Should contain stats"
        assert "date" in data, "Should contain date"
        
        print(f"✓ Get today schedule works: {len(data.get('schedule', []))} items")
    
    def test_13_get_adherence_history(self):
        """Test GET /api/medicine-reminders/adherence-history"""
        token = self.get_test_user_token()
        assert token is not None, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/medicine-reminders/adherence-history", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success"
        assert "history" in data, "Should contain history"
        assert "overall_stats" in data, "Should contain overall_stats"
        
        print(f"✓ Get adherence history works: {len(data.get('history', []))} days")
    
    def test_14_create_reminder(self):
        """Test POST /api/medicine-reminders/create"""
        token = self.get_test_user_token()
        assert token is not None, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        reminder_data = {
            "medicine_name": "TEST_Vitamin_D3",
            "dosage": "1000 IU",
            "frequency": "once_daily",
            "time_slots": ["09:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test reminder for iteration 44"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/create",
            json=reminder_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success"
        assert "reminder_id" in data, "Should contain reminder_id"
        
        self.__class__.created_reminder_id = data.get("reminder_id")
        
        print(f"✓ Create reminder works: {data.get('reminder_id')}")
    
    def test_15_delete_reminder(self):
        """Test DELETE /api/medicine-reminders/{id}"""
        token = self.get_test_user_token()
        assert token is not None, "Failed to get auth token"
        
        # First create a reminder to delete
        headers = {"Authorization": f"Bearer {token}"}
        reminder_data = {
            "medicine_name": "TEST_ToDelete",
            "dosage": "100mg",
            "frequency": "once_daily",
            "time_slots": ["10:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/create",
            json=reminder_data,
            headers=headers
        )
        
        assert create_response.status_code == 200, f"Failed to create reminder: {create_response.text}"
        reminder_id = create_response.json().get("reminder_id")
        
        # Now delete it
        delete_response = self.session.delete(
            f"{BASE_URL}/api/medicine-reminders/{reminder_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("success") == True, "Should return success"
        
        print(f"✓ Delete reminder works")


class TestInputValidation:
    """Test input validation for push notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_16_subscribe_missing_endpoint(self):
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
    
    def test_17_subscribe_missing_keys(self):
        """Test subscription with missing keys"""
        subscription_data = {
            "endpoint": "https://test.endpoint/test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        
        assert response.status_code == 422, f"Expected 422 for missing keys, got {response.status_code}"
        
        print(f"✓ Missing keys validation works")


class TestFullIntegrationFlow:
    """Test complete push notification flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_endpoint = f"https://fcm.googleapis.com/fcm/send/{uuid.uuid4().hex}"
        
    def get_test_user_token(self):
        """Login with test user and get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_18_full_subscription_flow(self):
        """Test complete subscription flow: get key -> subscribe -> test -> unsubscribe"""
        token = self.get_test_user_token()
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


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
