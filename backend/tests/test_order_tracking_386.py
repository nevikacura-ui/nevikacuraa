"""
Test Order Tracking Feature - Iteration 386
Tests the unified /api/orders/my-orders endpoint and related functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestMyOrdersEndpoint:
    """Tests for GET /api/orders/my-orders endpoint"""
    
    def test_my_orders_with_phone(self):
        """Test fetching orders by phone number"""
        response = requests.get(f"{BASE_URL}/api/orders/my-orders?phone=9876543210")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "orders" in data
        assert "pharmacy_count" in data
        assert "diagnostic_count" in data
        assert "total_orders" in data
        
        # Verify order_type field exists on orders
        if data["orders"]:
            first_order = data["orders"][0]
            assert "order_type" in first_order
            assert first_order["order_type"] in ["pharmacy", "diagnostic"]
            assert "order_type_label" in first_order
    
    def test_my_orders_without_phone(self):
        """Test that endpoint returns error without phone/email"""
        response = requests.get(f"{BASE_URL}/api/orders/my-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == False
        assert "orders" in data
        assert len(data["orders"]) == 0
    
    def test_my_orders_pharmacy_type(self):
        """Test that pharmacy orders have correct order_type"""
        response = requests.get(f"{BASE_URL}/api/orders/my-orders?phone=9876543210")
        assert response.status_code == 200
        
        data = response.json()
        pharmacy_orders = [o for o in data["orders"] if o.get("order_type") == "pharmacy"]
        
        # Should have pharmacy orders
        assert len(pharmacy_orders) > 0
        
        # Verify pharmacy order structure
        for order in pharmacy_orders[:3]:  # Check first 3
            assert order["order_type_label"] == "Medicine Order"
            # Should have medicines or items
            assert "medicines" in order or "items" in order
    
    def test_my_orders_diagnostic_type(self):
        """Test that diagnostic orders have correct order_type"""
        response = requests.get(f"{BASE_URL}/api/orders/my-orders?phone=9876543210")
        assert response.status_code == 200
        
        data = response.json()
        diagnostic_orders = [o for o in data["orders"] if o.get("order_type") == "diagnostic"]
        
        # Should have diagnostic orders
        assert len(diagnostic_orders) > 0
        
        # Verify diagnostic order structure
        for order in diagnostic_orders[:3]:  # Check first 3
            assert order["order_type_label"] == "Lab Test"
            # Should have tests
            assert "tests" in order
    
    def test_my_orders_counts_match(self):
        """Test that pharmacy_count and diagnostic_count match actual orders"""
        response = requests.get(f"{BASE_URL}/api/orders/my-orders?phone=9876543210")
        assert response.status_code == 200
        
        data = response.json()
        pharmacy_orders = [o for o in data["orders"] if o.get("order_type") == "pharmacy"]
        diagnostic_orders = [o for o in data["orders"] if o.get("order_type") == "diagnostic"]
        
        # Counts should match (within limit)
        assert data["pharmacy_count"] >= len(pharmacy_orders)
        assert data["diagnostic_count"] >= len(diagnostic_orders)


class TestSPAFallback:
    """Tests for SPA fallback API guard"""
    
    def test_api_health_returns_json(self):
        """Test that /api/health returns JSON"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/json")
        
        data = response.json()
        assert data.get("status") == "ok"
    
    def test_api_nonexistent_returns_json_404(self):
        """Test that non-existent API endpoint returns JSON 404, not HTML"""
        response = requests.get(f"{BASE_URL}/api/nonexistent-endpoint-xyz")
        assert response.status_code == 404
        
        # Should be JSON, not HTML
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type or not content_type.startswith("text/html")
        
        # Should have JSON error structure
        data = response.json()
        assert "detail" in data
    
    def test_spa_route_returns_html(self):
        """Test that SPA routes return HTML"""
        response = requests.get(f"{BASE_URL}/my-orders")
        assert response.status_code == 200
        
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type


class TestPaymentVerification:
    """Tests for payment verification endpoint"""
    
    def test_verify_nonexistent_order(self):
        """Test that verifying non-existent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/NONEXISTENT_ORDER_123")
        assert response.status_code == 404
    
    def test_order_status_nonexistent(self):
        """Test that order status for non-existent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/cashfree/order-status/NONEXISTENT_ORDER_123")
        assert response.status_code == 404


class TestDoctorsEndpoint:
    """Tests for doctors endpoint (used by Home page)"""
    
    def test_featured_doctors(self):
        """Test that /api/doctors/featured returns doctors list"""
        response = requests.get(f"{BASE_URL}/api/doctors/featured")
        assert response.status_code == 200
        
        data = response.json()
        # Should return a list or object with doctors
        assert isinstance(data, (list, dict))


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
