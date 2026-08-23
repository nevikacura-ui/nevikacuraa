"""
Backend API Tests - Iteration 177
Tests for Nevika Cura health portal final testing
- Health API
- Pharmacy search
- Staff login
- Notifications endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestHealthAPI:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"PASS: Health endpoint returns {data}")


class TestPharmacySearch:
    """Pharmacy search API tests"""
    
    def test_search_medicines_with_tab(self):
        """Test /api/pharmacy/search?q=tab returns results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=tab&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        print(f"PASS: Found {len(data['medicines'])} medicines for 'tab' search")
        
        # Verify medicine structure
        med = data["medicines"][0]
        assert "name" in med
        assert "price" in med or "mrp" in med
        print(f"PASS: First medicine: {med['name']}")
    
    def test_search_medicines_empty_query(self):
        """Test search with empty query"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=")
        # Should return 200 with empty results or popular items
        assert response.status_code in [200, 422]


class TestStaffLogin:
    """Staff authentication tests"""
    
    def test_admin_login(self):
        """Test POST /api/staff/login with admin/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "test1234"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "admin"
        print(f"PASS: Admin login successful - role: {data['staff']['role']}")
        return data["token"]
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "invalid", "password": "wrong"}
        )
        assert response.status_code in [401, 404]
        print("PASS: Invalid credentials rejected")


class TestNotifications:
    """Notification system tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "test1234"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_unread_count_no_auth(self):
        """Test unread-count without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 401
        print("PASS: Unread count requires authentication")
    
    def test_unread_count_with_auth(self, admin_token):
        """Test unread-count with auth returns count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread" in data
        assert isinstance(data["unread"], int)
        print(f"PASS: Unread count: {data['unread']}")
    
    def test_get_notifications(self, admin_token):
        """Test GET /api/notifications returns list"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        print(f"PASS: Got {len(data['notifications'])} notifications")
    
    def test_notifications_latest(self, admin_token):
        """Test GET /api/notifications/latest"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/latest",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "notification" in data
        print(f"PASS: Latest notification endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
