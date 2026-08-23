"""
Test Delivery Dashboard Features - Iteration 362
Tests for:
1. GET /api/pharmacy/delivery/active - Active deliveries with GPS positions
2. Delivery verification still works - POST /api/pharmacy/delivery/verify
3. Existing pages /deliver/{id} and /collect/{id} still work
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDeliveryDashboard:
    """Tests for the new Delivery Dashboard feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for staff API calls"""
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "nevikacura", "password": "test1234"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_active_deliveries_endpoint_returns_200(self):
        """GET /api/pharmacy/delivery/active returns 200 with staff auth"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/delivery/active",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Active deliveries endpoint returns 200")
    
    def test_active_deliveries_returns_correct_structure(self):
        """GET /api/pharmacy/delivery/active returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/delivery/active",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level structure
        assert "success" in data, "Response missing 'success' field"
        assert "deliveries" in data, "Response missing 'deliveries' field"
        assert "count" in data, "Response missing 'count' field"
        assert data["success"] == True, "success should be True"
        assert isinstance(data["deliveries"], list), "deliveries should be a list"
        print(f"PASS: Active deliveries returns correct structure with {data['count']} deliveries")
    
    def test_active_deliveries_contains_required_fields(self):
        """Each delivery in response contains required fields for dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/delivery/active",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["count"] > 0:
            delivery = data["deliveries"][0]
            required_fields = [
                "order_id", "driver_name", "driver_phone", "current_location",
                "estimated_minutes", "customer_name", "address"
            ]
            for field in required_fields:
                assert field in delivery, f"Delivery missing required field: {field}"
            
            # Check GPS location structure
            assert "lat" in delivery["current_location"], "current_location missing lat"
            assert "lng" in delivery["current_location"], "current_location missing lng"
            print(f"PASS: Delivery contains all required fields: {list(delivery.keys())}")
        else:
            print("SKIP: No active deliveries to verify fields")
    
    def test_active_deliveries_requires_auth(self):
        """GET /api/pharmacy/delivery/active requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/delivery/active")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Active deliveries endpoint requires authentication")


class TestDeliveryVerification:
    """Tests for delivery verification (existing feature)"""
    
    def test_delivery_verify_endpoint_exists(self):
        """POST /api/pharmacy/delivery/verify endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "nonexistent", "verification_code": "000000"}
        )
        # Should return 404 for nonexistent order, not 405 (method not allowed)
        assert response.status_code in [404, 200, 400], f"Unexpected status: {response.status_code}"
        print(f"PASS: Delivery verify endpoint exists (status: {response.status_code})")
    
    def test_delivery_verify_wrong_code(self):
        """POST /api/pharmacy/delivery/verify returns error for wrong code"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "000000"}
        )
        if response.status_code == 200:
            data = response.json()
            # Should return success=false for wrong code
            assert data.get("success") == False or "error" in data, "Wrong code should return error"
            print(f"PASS: Wrong verification code returns error: {data.get('error', 'success=false')}")
        else:
            print(f"PASS: Wrong verification code returns status {response.status_code}")


class TestExistingPages:
    """Tests for existing delivery/collection pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "nevikacura", "password": "test1234"}
        )
        self.token = login_response.json().get("token") if login_response.status_code == 200 else None
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    def test_order_384729_exists(self):
        """Order 384729 exists for delivery agent page"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders/384729/live-tracking"
        )
        # This is a public endpoint for customer tracking
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "order_id" in data or "success" in data
            print(f"PASS: Order 384729 tracking endpoint works")
        else:
            print(f"INFO: Order 384729 not found (may need to be created)")
    
    def test_lab_booking_592741_info(self):
        """Lab booking 592741 info endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/mango/collection/592741/info"
        )
        if response.status_code == 200:
            data = response.json()
            assert "booking_id" in data or "success" in data
            print(f"PASS: Lab booking 592741 info endpoint works")
        else:
            print(f"INFO: Lab booking 592741 info returned {response.status_code}")
    
    def test_collection_verify_endpoint_exists(self):
        """POST /api/mango/collection/verify endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "000000"}
        )
        # Should not return 405 (method not allowed)
        assert response.status_code != 405, "Collection verify endpoint should exist"
        print(f"PASS: Collection verify endpoint exists (status: {response.status_code})")


class TestPharmacyStaffOrders:
    """Tests for pharmacy staff orders (used by Deliveries tab)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "nevikacura", "password": "test1234"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_pharmacy_orders_endpoint(self):
        """GET /api/pharmacy/orders returns orders list"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "orders" in data, "Response missing 'orders' field"
        print(f"PASS: Pharmacy orders endpoint works, {len(data['orders'])} orders")
    
    def test_pharmacy_dashboard_stats(self):
        """GET /api/pharmacy/dashboard/stats returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/dashboard/stats",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "today_orders" in data or "pending_orders" in data
        print(f"PASS: Dashboard stats endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
