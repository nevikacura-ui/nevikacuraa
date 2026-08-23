"""
Test Delivery Agent Tracker Feature - Iteration 359
Tests the new delivery agent tracking PWA page and related APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDeliveryAgentTrackerAPIs:
    """Tests for Delivery Agent Tracker related APIs"""
    
    def test_get_live_tracking_order_info(self):
        """Test GET /api/pharmacy/orders/{orderId}/live-tracking returns order info for delivery agent"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["order_id"] == "PH-LIVETEST01"
        assert data["status"] == "shipped"
        assert "delivery_address" in data
        assert "items" in data
        assert len(data["items"]) > 0
        print(f"PASS: Live tracking API returns order info with {len(data['items'])} items")
    
    def test_live_tracking_has_delivery_address(self):
        """Test that live tracking response includes delivery address"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert "delivery_address" in data
        address = data["delivery_address"]
        # Address can be string or object
        if isinstance(address, dict):
            assert "line1" in address or "city" in address
        else:
            assert len(address) > 0
        print(f"PASS: Delivery address present: {address}")
    
    def test_live_tracking_has_items_list(self):
        """Test that live tracking response includes items list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        items = data["items"]
        assert len(items) > 0
        
        # Verify item structure
        for item in items:
            assert "name" in item
            assert "qty" in item
        print(f"PASS: Items list has {len(items)} items")
    
    def test_live_tracking_has_driver_info(self):
        """Test that live tracking response includes driver info for shipped orders"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_live_tracking"] == True
        assert "driver" in data
        driver = data["driver"]
        assert "name" in driver
        assert "phone" in driver
        print(f"PASS: Driver info present: {driver['name']}")
    
    def test_put_delivery_location_update(self):
        """Test PUT /api/pharmacy/delivery/location updates driver GPS position"""
        payload = {
            "order_id": "PH-LIVETEST01",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "heading": 45,
            "speed": 10
        }
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/delivery/location",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print("PASS: Location update API works correctly")
    
    def test_live_tracking_nonexistent_order(self):
        """Test that nonexistent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/NONEXISTENT-ORDER/live-tracking")
        assert response.status_code == 404
        print("PASS: Nonexistent order returns 404")
    
    def test_live_tracking_has_current_location(self):
        """Test that shipped order has current location data"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert "current_location" in data
        location = data["current_location"]
        assert "lat" in location
        assert "lng" in location
        print(f"PASS: Current location: {location['lat']}, {location['lng']}")


class TestLiveTrackingPageStillWorks:
    """Verify existing live tracking page still works"""
    
    def test_live_tracking_api_returns_map_data(self):
        """Test that live tracking API returns data needed for map"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        assert response.status_code == 200
        
        data = response.json()
        # Map needs these locations
        assert "pharmacy_location" in data
        assert "delivery_location" in data
        assert "current_location" in data
        print("PASS: All map location data present")
    
    def test_live_tracking_status_label(self):
        """Test that status label is correct for shipped order"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/PH-LIVETEST01/live-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert "status_label" in data
        assert "Shipped" in data["status_label"] or "Delivery" in data["status_label"]
        print(f"PASS: Status label: {data['status_label']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
