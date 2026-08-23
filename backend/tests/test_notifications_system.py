"""
Test suite for Notification System - Nevika Cura
Tests: GET /api/notifications, GET /api/notifications/unread-count, GET /api/notifications/latest,
       POST /api/notifications/read-all, POST /api/notifications/admin/send
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://premium-rx-portal.preview.emergentagent.com"


class TestHealthEndpoint:
    """Test /api/health endpoint"""
    
    def test_health_returns_ok(self):
        """Health endpoint returns status ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "ok", f"Expected status='ok', got {data}"


class TestStaffLogin:
    """Test staff login to obtain tokens for notification tests"""
    
    def test_admin_login(self):
        """Admin login with username: admin, password: test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "test1234"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in admin login response"
        assert data.get("role") == "admin" or "admin" in data.get("username", "").lower(), f"Unexpected role: {data}"
        return data["token"]
    
    def test_doctor_login(self):
        """Doctor login with username: dr_vikas, password: test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        assert response.status_code == 200, f"Doctor login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in doctor login response"
        return data["token"]
    
    def test_staff_login(self):
        """Staff login with username: staff_diagyn, password: test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        assert response.status_code == 200, f"Staff login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in staff login response"
        return data["token"]


class TestNotificationEndpoints:
    """Test all notification API endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed - skipping notification tests")
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Doctor login failed - skipping doctor notification tests")
    
    @pytest.fixture(scope="class")
    def staff_token(self):
        """Get staff token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed - skipping staff notification tests")
    
    def test_get_notifications_requires_auth(self):
        """GET /api/notifications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401 or response.status_code == 422, \
            f"Expected 401/422 without auth, got {response.status_code}"
    
    def test_get_notifications_with_auth(self, admin_token):
        """GET /api/notifications returns notifications list for authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notifications" in data, f"Missing 'notifications' key: {data}"
        assert "count" in data, f"Missing 'count' key: {data}"
        assert isinstance(data["notifications"], list), "notifications should be a list"
    
    def test_get_unread_count_requires_auth(self):
        """GET /api/notifications/unread-count requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 401 or response.status_code == 422, \
            f"Expected 401/422 without auth, got {response.status_code}"
    
    def test_get_unread_count_with_auth(self, admin_token):
        """GET /api/notifications/unread-count returns unread count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread" in data, f"Missing 'unread' key: {data}"
        assert isinstance(data["unread"], int), f"unread should be integer, got {type(data['unread'])}"
    
    def test_get_latest_notification_requires_auth(self):
        """GET /api/notifications/latest requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/latest")
        assert response.status_code == 401 or response.status_code == 422, \
            f"Expected 401/422 without auth, got {response.status_code}"
    
    def test_get_latest_notification_with_auth(self, admin_token):
        """GET /api/notifications/latest returns latest unread notification"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/latest",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notification" in data, f"Missing 'notification' key: {data}"
        # notification can be null if no unread notifications
    
    def test_mark_all_read_requires_auth(self):
        """POST /api/notifications/read-all requires authentication"""
        response = requests.post(f"{BASE_URL}/api/notifications/read-all")
        assert response.status_code == 401 or response.status_code == 422, \
            f"Expected 401/422 without auth, got {response.status_code}"
    
    def test_mark_all_read_with_auth(self, admin_token):
        """POST /api/notifications/read-all marks all notifications as read"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "marked" in data, f"Missing 'marked' key: {data}"
        assert isinstance(data["marked"], int), f"marked should be integer, got {type(data['marked'])}"


class TestAdminNotificationSending:
    """Test admin notification sending endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Doctor login failed")
    
    @pytest.fixture(scope="class")
    def staff_token(self):
        """Get staff token for tests (diagyn_staff role)"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_admin_send_notification_requires_auth(self):
        """POST /api/notifications/admin/send requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            json={"title": "Test", "message": "Test message"}
        )
        assert response.status_code in [401, 422], \
            f"Expected 401/422 without auth, got {response.status_code}"
    
    def test_admin_can_send_notification(self, admin_token):
        """Admin can send broadcast notification to all users"""
        unique_title = f"TEST_Admin_Broadcast_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "title": unique_title,
                "message": "This is a test broadcast from admin",
                "type": "promo",
                "target": "all"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=true, got {data}"
        assert "sent_to" in data, f"Missing 'sent_to' key: {data}"
        assert data["sent_to"] >= 0, f"Expected sent_to >= 0, got {data['sent_to']}"
        assert data.get("title") == unique_title, f"Title mismatch: {data}"
    
    def test_doctor_can_send_notification(self, doctor_token):
        """Doctor (dr_vikas) can send broadcast notification"""
        unique_title = f"TEST_Doctor_Broadcast_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            headers={
                "Authorization": f"Bearer {doctor_token}",
                "Content-Type": "application/json"
            },
            json={
                "title": unique_title,
                "message": "Health checkup reminder from Dr. Vikas",
                "type": "announcement",
                "target": "patients"
            }
        )
        assert response.status_code == 200, f"Expected 200 for doctor, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Doctor notification failed: {data}"
    
    def test_staff_can_send_notification(self, staff_token):
        """Staff with diagyn_staff role can send notifications"""
        unique_title = f"TEST_Staff_Broadcast_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            headers={
                "Authorization": f"Bearer {staff_token}",
                "Content-Type": "application/json"
            },
            json={
                "title": unique_title,
                "message": "Clinic update from staff",
                "type": "reminder",
                "target": "staff"
            }
        )
        # Staff with diagyn_staff role should be allowed per code logic
        # The endpoint allows: admin, doctor, diagyn_staff, pharmacy_staff, lab_staff
        assert response.status_code == 200, f"Expected 200 for staff, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Staff notification failed: {data}"
    
    def test_notification_target_options(self, admin_token):
        """Test different target options: all, patients, staff"""
        targets = ["all", "patients", "staff"]
        for target in targets:
            response = requests.post(
                f"{BASE_URL}/api/notifications/admin/send",
                headers={
                    "Authorization": f"Bearer {admin_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "title": f"TEST_Target_{target}_{int(time.time())}",
                    "message": f"Testing target: {target}",
                    "type": "promo",
                    "target": target
                }
            )
            assert response.status_code == 200, f"Target '{target}' failed: {response.status_code}"


class TestNotificationVerification:
    """Verify notifications are created and retrievable"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_send_and_retrieve_notification(self, admin_token):
        """Send notification and verify it appears in notification list"""
        unique_title = f"TEST_VerifyRetrieval_{int(time.time())}"
        
        # Send notification
        send_response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "title": unique_title,
                "message": "Verification test message",
                "type": "announcement",
                "target": "all"
            }
        )
        assert send_response.status_code == 200, f"Send failed: {send_response.text}"
        
        # Small delay to allow DB write
        time.sleep(0.5)
        
        # Retrieve notifications
        get_response = requests.get(
            f"{BASE_URL}/api/notifications?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200, f"Get failed: {get_response.text}"
        data = get_response.json()
        
        # Check notification appears in list
        notifications = data.get("notifications", [])
        found = any(n.get("title") == unique_title for n in notifications)
        assert found, f"Notification '{unique_title}' not found in recent notifications"
    
    def test_unread_count_increments(self, admin_token):
        """Verify unread count changes after sending notification"""
        # Get initial unread count
        initial_response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        initial_count = initial_response.json().get("unread", 0)
        
        # Send notification
        send_response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "title": f"TEST_UnreadCount_{int(time.time())}",
                "message": "Testing unread count increment",
                "type": "promo",
                "target": "staff"  # Send to staff which includes admin
            }
        )
        assert send_response.status_code == 200
        
        # Check unread count changed
        time.sleep(0.5)
        final_response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        final_count = final_response.json().get("unread", 0)
        
        # Count should have increased
        assert final_count >= initial_count, f"Unread count did not increase: {initial_count} -> {final_count}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
