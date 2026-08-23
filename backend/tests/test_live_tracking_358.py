"""
Live Order Tracking API Tests - Iteration 358
Tests for real-time order tracking with live map for 'Out for Delivery' status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestLiveTrackingAPIs:
    """Test Live Tracking API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_staff_token(self):
        """Get staff authentication token"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json={
            "username": "nevikacura",
            "password": "test1234"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token")
        return None
    
    # ===== Live Tracking API Tests =====
    
    def test_live_tracking_shipped_order(self):
        """Test GET /api/pharmacy/orders/PH-LIVETEST01/live-tracking returns is_live_tracking=true"""
        response = self.session.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=true"
        assert data.get("order_id") == "PH-LIVETEST01", f"Expected order_id=PH-LIVETEST01, got {data.get('order_id')}"
        assert data.get("is_live_tracking") == True, f"Expected is_live_tracking=true for shipped order, got {data.get('is_live_tracking')}"
        assert data.get("status") in ["shipped", "out_for_delivery"], f"Expected status shipped/out_for_delivery, got {data.get('status')}"
        
        # Verify driver info is present for live tracking
        assert "driver" in data, "Expected driver info for live tracking"
        assert "current_location" in data, "Expected current_location for live tracking"
        assert "pharmacy_location" in data, "Expected pharmacy_location for live tracking"
        assert "delivery_location" in data, "Expected delivery_location for live tracking"
        
        # Verify location structure
        if data.get("current_location"):
            assert "lat" in data["current_location"], "current_location should have lat"
            assert "lng" in data["current_location"], "current_location should have lng"
        
        print(f"✓ Live tracking for PH-LIVETEST01: is_live_tracking={data.get('is_live_tracking')}, status={data.get('status')}")
        print(f"  Driver: {data.get('driver', {}).get('name')}, ETA: {data.get('driver', {}).get('estimated_minutes')} mins")
    
    def test_live_tracking_confirmed_order(self):
        """Test GET /api/pharmacy/orders/PH-0DCF37B4/live-tracking returns is_live_tracking=false"""
        response = self.session.get(f"{BASE_URL}/api/pharmacy/orders/PH-0DCF37B4/live-tracking")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=true"
        assert data.get("is_live_tracking") == False, f"Expected is_live_tracking=false for confirmed order, got {data.get('is_live_tracking')}"
        
        # Confirmed order should NOT have live tracking data
        assert data.get("driver") is None or "driver" not in data, "Confirmed order should not have driver info"
        
        print(f"✓ Non-live tracking for PH-0DCF37B4: is_live_tracking={data.get('is_live_tracking')}, status={data.get('status')}")
    
    def test_live_tracking_nonexistent_order(self):
        """Test GET /api/pharmacy/orders/NONEXISTENT/live-tracking returns 404"""
        response = self.session.get(f"{BASE_URL}/api/pharmacy/orders/NONEXISTENT/live-tracking")
        
        assert response.status_code == 404, f"Expected 404 for nonexistent order, got {response.status_code}"
        print("✓ Nonexistent order returns 404 as expected")
    
    def test_location_update_api(self):
        """Test PUT /api/pharmacy/delivery/location updates driver position"""
        # Update location for the test order
        response = self.session.put(f"{BASE_URL}/api/pharmacy/delivery/location", json={
            "order_id": "PH-LIVETEST01",
            "latitude": 19.3760,
            "longitude": 72.8490,
            "heading": 45.0,
            "speed": 25.0
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=true"
        
        # Verify the location was updated by fetching tracking data
        tracking_response = self.session.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        tracking_data = tracking_response.json()
        
        if tracking_data.get("current_location"):
            # Allow some tolerance for floating point
            assert abs(tracking_data["current_location"]["lat"] - 19.3760) < 0.001, "Latitude not updated correctly"
            assert abs(tracking_data["current_location"]["lng"] - 72.8490) < 0.001, "Longitude not updated correctly"
        
        print("✓ Location update API working correctly")
    
    def test_location_update_nonexistent_order(self):
        """Test PUT /api/pharmacy/delivery/location for nonexistent order returns 404"""
        response = self.session.put(f"{BASE_URL}/api/pharmacy/delivery/location", json={
            "order_id": "NONEXISTENT-ORDER",
            "latitude": 19.3760,
            "longitude": 72.8490
        })
        
        assert response.status_code == 404, f"Expected 404 for nonexistent order, got {response.status_code}"
        print("✓ Location update for nonexistent order returns 404")
    
    def test_delivery_assign_api_requires_auth(self):
        """Test POST /api/pharmacy/delivery/assign requires staff auth"""
        # Without auth
        response = self.session.post(f"{BASE_URL}/api/pharmacy/delivery/assign", json={
            "order_id": "PH-LIVETEST01",
            "driver_name": "Test Driver",
            "driver_phone": "9876543210"
        })
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Delivery assign requires authentication (401 without token)")
    
    def test_delivery_assign_api_with_auth(self):
        """Test POST /api/pharmacy/delivery/assign with staff auth"""
        token = self.get_staff_token()
        if not token:
            pytest.skip("Could not get staff token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/pharmacy/delivery/assign", json={
            "order_id": "PH-LIVETEST01",
            "driver_name": "Test Driver Updated",
            "driver_phone": "9876543210",
            "estimated_minutes": 25,
            "pharmacy_lat": 19.3725,
            "pharmacy_lng": 72.8467,
            "delivery_lat": 19.3800,
            "delivery_lng": 72.8500
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=true"
        
        print(f"✓ Delivery assign API working: {data.get('message')}")


class TestAdminAnalyticsDashboard:
    """Verify Analytics Dashboard still working after live tracking changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_staff_token(self):
        """Get staff authentication token"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json={
            "username": "nevikacura",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_analytics_overview_api(self):
        """Test GET /api/admin/analytics/overview still works"""
        token = self.get_staff_token()
        if not token:
            pytest.skip("Could not get staff token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/analytics/overview")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "appointments" in data or "total_appointments" in data, "Expected appointments data"
        
        print("✓ Analytics overview API still working")
    
    def test_analytics_popular_medicines(self):
        """Test GET /api/admin/analytics/popular-medicines still works"""
        token = self.get_staff_token()
        if not token:
            pytest.skip("Could not get staff token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/analytics/popular-medicines")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Analytics popular medicines API still working")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health check passed")
    
    def test_pharmacy_browse_api(self):
        """Test pharmacy browse API still works"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse")
        assert response.status_code == 200, f"Pharmacy browse failed: {response.status_code}"
        print("✓ Pharmacy browse API working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
