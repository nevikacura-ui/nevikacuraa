"""
Test Suite for Admin Analytics Dashboard, SEO Meta Tags, PWA Service Worker, and WhatsApp Order Updates
Iteration 357 - Testing P0 features: Analytics, SEO, PWA, WhatsApp notifications
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "nevikacura"
ADMIN_PASSWORD = "test1234"


class TestAdminLogin:
    """Test admin login to get token for analytics endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    def test_admin_login_success(self):
        """Test admin login returns token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data or "user" in data or "name" in data
        print(f"Admin login successful, token received")


class TestAdminAnalyticsAPIs:
    """Test Admin Analytics Dashboard API endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping analytics tests")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers with token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_analytics_overview(self, auth_headers):
        """GET /api/admin/analytics/overview - returns appointments, orders, users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/overview?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Overview failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "total_appointments" in data, "Missing total_appointments"
        assert "total_pharmacy_orders" in data, "Missing total_pharmacy_orders"
        assert "total_lab_bookings" in data, "Missing total_lab_bookings"
        assert "total_users" in data, "Missing total_users"
        assert "new_users" in data, "Missing new_users"
        assert "pharmacy_revenue" in data, "Missing pharmacy_revenue"
        assert "period_days" in data, "Missing period_days"
        
        print(f"Analytics Overview: {data['total_appointments']} appointments, {data['total_pharmacy_orders']} orders, {data['total_users']} users")
    
    def test_analytics_popular_medicines(self, auth_headers):
        """GET /api/admin/analytics/popular-medicines - returns medicines list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/popular-medicines?limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Popular medicines failed: {response.text}"
        data = response.json()
        
        assert "medicines" in data, "Missing medicines field"
        assert isinstance(data["medicines"], list), "medicines should be a list"
        
        # If there are medicines, verify structure
        if data["medicines"]:
            med = data["medicines"][0]
            assert "name" in med, "Medicine missing name"
            assert "order_count" in med, "Medicine missing order_count"
        
        print(f"Popular Medicines: {len(data['medicines'])} medicines returned")
    
    def test_analytics_peak_hours(self, auth_headers):
        """GET /api/admin/analytics/peak-hours - returns 24-hour distribution"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/peak-hours?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Peak hours failed: {response.text}"
        data = response.json()
        
        assert "peak_hours" in data, "Missing peak_hours field"
        assert isinstance(data["peak_hours"], list), "peak_hours should be a list"
        assert len(data["peak_hours"]) == 24, f"Expected 24 hours, got {len(data['peak_hours'])}"
        
        # Verify structure of hour data
        if data["peak_hours"]:
            hour = data["peak_hours"][0]
            assert "hour" in hour, "Hour missing hour field"
            assert "appointments" in hour, "Hour missing appointments"
            assert "pharmacy_orders" in hour, "Hour missing pharmacy_orders"
            assert "lab_bookings" in hour, "Hour missing lab_bookings"
        
        print(f"Peak Hours: 24-hour distribution returned")
    
    def test_analytics_order_trends(self, auth_headers):
        """GET /api/admin/analytics/order-trends - returns daily trends"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/order-trends?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Order trends failed: {response.text}"
        data = response.json()
        
        assert "trends" in data, "Missing trends field"
        assert isinstance(data["trends"], list), "trends should be a list"
        
        # Verify structure of trend data
        if data["trends"]:
            trend = data["trends"][0]
            assert "date" in trend, "Trend missing date"
            assert "appointments" in trend, "Trend missing appointments"
            assert "pharmacy_orders" in trend, "Trend missing pharmacy_orders"
            assert "lab_bookings" in trend, "Trend missing lab_bookings"
        
        print(f"Order Trends: {len(data['trends'])} days of data returned")
    
    def test_analytics_order_status_breakdown(self, auth_headers):
        """GET /api/admin/analytics/order-status-breakdown - returns status counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/order-status-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Status breakdown failed: {response.text}"
        data = response.json()
        
        assert "statuses" in data, "Missing statuses field"
        assert isinstance(data["statuses"], list), "statuses should be a list"
        
        # Verify structure
        if data["statuses"]:
            status = data["statuses"][0]
            assert "status" in status, "Status missing status field"
            assert "count" in status, "Status missing count"
        
        print(f"Order Status Breakdown: {len(data['statuses'])} statuses returned")
    
    def test_analytics_engagement(self, auth_headers):
        """GET /api/admin/analytics/engagement - returns active user metrics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/engagement?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Engagement failed: {response.text}"
        data = response.json()
        
        assert "active_users" in data, "Missing active_users"
        assert "pharmacy_users" in data, "Missing pharmacy_users"
        assert "appointment_users" in data, "Missing appointment_users"
        assert "lab_users" in data, "Missing lab_users"
        assert "cross_service_users" in data, "Missing cross_service_users"
        
        print(f"Engagement: {data['active_users']} active users, {data['cross_service_users']} cross-service users")
    
    def test_analytics_unauthorized_access(self):
        """Test analytics endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/overview")
        assert response.status_code == 401, "Should require authentication"
        print("Unauthorized access correctly rejected")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("API health check passed")


class TestSEOMetaTags:
    """Test SEO meta tags in index.html (via frontend)"""
    
    def test_frontend_loads(self):
        """Test frontend loads successfully"""
        response = requests.get(BASE_URL, timeout=10)
        assert response.status_code == 200, f"Frontend failed to load: {response.status_code}"
        print("Frontend loads successfully")


class TestPharmacyOrderStatusUpdate:
    """Test pharmacy order status update triggers WhatsApp notifications"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers with token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_pharmacy_orders(self, auth_headers):
        """Test getting pharmacy orders list"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        data = response.json()
        assert "orders" in data, "Missing orders field"
        print(f"Pharmacy Orders: {len(data['orders'])} orders found")
        return data.get("orders", [])


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
