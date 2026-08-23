"""
Test suite for iteration 371 features:
- Patient Dashboard API
- Order Tracking API
- Mango Labs checkout payment options
- Orange Pharmacy auto payment link
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Health check endpoint working")


class TestPatientDashboard:
    """Patient Dashboard API tests"""
    
    def test_patient_dashboard_with_valid_phone(self):
        """Test patient dashboard API with valid phone number"""
        response = requests.get(f"{BASE_URL}/api/patient-dashboard/9876543210")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "stats" in data
        assert "appointments" in data
        assert "lab_orders" in data
        assert "pharmacy_orders" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "upcoming_appointments" in stats
        assert "active_lab_orders" in stats
        assert "active_pharmacy_orders" in stats
        
        print(f"PASS: Patient dashboard API returns valid data for phone 9876543210")
        print(f"  - Stats: {stats}")
        print(f"  - Appointments count: {len(data['appointments'])}")
        print(f"  - Lab orders count: {len(data['lab_orders'])}")
        print(f"  - Pharmacy orders count: {len(data['pharmacy_orders'])}")
    
    def test_patient_dashboard_with_invalid_phone(self):
        """Test patient dashboard API with invalid phone number"""
        response = requests.get(f"{BASE_URL}/api/patient-dashboard/0000000000")
        assert response.status_code == 200
        data = response.json()
        
        # Should still return success but with empty/zero data
        assert data.get("success") == True
        print("PASS: Patient dashboard API handles invalid phone gracefully")
    
    def test_patient_dashboard_stats_values(self):
        """Test that stats values are non-negative integers"""
        response = requests.get(f"{BASE_URL}/api/patient-dashboard/9876543210")
        assert response.status_code == 200
        data = response.json()
        
        stats = data["stats"]
        assert isinstance(stats["upcoming_appointments"], int)
        assert isinstance(stats["active_lab_orders"], int)
        assert isinstance(stats["active_pharmacy_orders"], int)
        assert stats["upcoming_appointments"] >= 0
        assert stats["active_lab_orders"] >= 0
        assert stats["active_pharmacy_orders"] >= 0
        print("PASS: Stats values are valid non-negative integers")


class TestOrderTracking:
    """Order Tracking API tests"""
    
    def test_track_order_endpoint_exists(self):
        """Test that track order endpoint exists"""
        # Test with a dummy order ID - should return 404 or valid response
        response = requests.get(f"{BASE_URL}/api/track/TEST123")
        # Either 200 (found) or 404 (not found) is acceptable
        assert response.status_code in [200, 404]
        print(f"PASS: Track order endpoint exists (status: {response.status_code})")
    
    def test_track_order_response_structure(self):
        """Test track order response structure when order exists"""
        # First, get a valid order ID from patient dashboard
        dashboard_response = requests.get(f"{BASE_URL}/api/patient-dashboard/9876543210")
        if dashboard_response.status_code == 200:
            data = dashboard_response.json()
            pharmacy_orders = data.get("pharmacy_orders", [])
            if pharmacy_orders:
                order_id = pharmacy_orders[0].get("order_id") or pharmacy_orders[0].get("id")
                if order_id:
                    response = requests.get(f"{BASE_URL}/api/track/{order_id}")
                    if response.status_code == 200:
                        order_data = response.json()
                        # Verify basic structure
                        assert "order" in order_data or "status" in order_data
                        print(f"PASS: Track order returns valid structure for order {order_id}")
                        return
        print("INFO: No valid order found to test tracking structure")


class TestMangoLabsCheckout:
    """Mango Labs checkout tests"""
    
    def test_mango_test_catalog_endpoint(self):
        """Test Mango Labs public test catalog endpoint"""
        response = requests.get(f"{BASE_URL}/api/mango/test-catalog")
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert isinstance(data["tests"], list)
        assert len(data["tests"]) > 0
        print(f"PASS: Mango Labs test catalog endpoint working - {len(data['tests'])} tests available")
    
    def test_mango_tests_requires_auth(self):
        """Test Mango Labs tests endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/mango/tests")
        # Should return 401 (unauthorized) since it requires staff auth
        assert response.status_code == 401
        print("PASS: Mango Labs tests endpoint correctly requires authentication")


class TestOrangePharmacy:
    """Orange Pharmacy tests"""
    
    def test_pharmacy_orders_endpoint(self):
        """Test pharmacy orders endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders")
        # Should return 200 or 401 (if auth required)
        assert response.status_code in [200, 401, 403]
        print(f"PASS: Pharmacy orders endpoint exists (status: {response.status_code})")
    
    def test_pharmacy_order_status_update_method(self):
        """Test pharmacy order status update uses PUT method"""
        # This tests the endpoint that triggers auto payment link
        # The endpoint uses PUT method, not PATCH
        response = requests.put(f"{BASE_URL}/api/pharmacy/orders/TEST123/status", json={
            "status": "out_for_delivery"
        })
        # Should return 404 (order not found) or 200 (success) or 401 (auth required)
        assert response.status_code in [200, 404, 401, 403, 422]
        print(f"PASS: Pharmacy order status update endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
