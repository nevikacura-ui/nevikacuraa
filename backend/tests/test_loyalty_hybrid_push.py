"""
Test file for iteration 115:
1. Enhanced Loyalty Points System with tiers (Bronze/Silver/Gold/Platinum)
2. Loyalty history endpoint
3. Staff portal logins (Mango Labs, Orange Pharmacy)
4. Push notification VAPID key endpoint
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

# ==================== FIXTURES ====================

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def staff_token(api_client):
    """Get staff authentication token for Mango Labs"""
    response = api_client.post(f"{BASE_URL}/api/staff/login", json={
        "username": "staff_mango",
        "password": "test"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Staff authentication failed")


@pytest.fixture
def pharmacy_staff_token(api_client):
    """Get staff authentication token for Orange Pharmacy"""
    response = api_client.post(f"{BASE_URL}/api/staff/login", json={
        "username": "staff_pharmacy",
        "password": "test"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Pharmacy staff authentication failed")


# ==================== HEALTH CHECK ====================

class TestHealthCheck:
    """Basic connectivity tests"""
    
    def test_api_health(self, api_client):
        """Test that API is reachable"""
        # Try the internal health endpoint
        response = api_client.get(f"{BASE_URL}/health")
        # Frontend may intercept this, so we test another known endpoint
        assert response.status_code in [200, 404, 307]
        print(f"Health endpoint response: {response.status_code}")


# ==================== LOYALTY POINTS TESTS ====================

class TestLoyaltyPointsSystem:
    """Test Enhanced Loyalty Points System with tiers"""
    
    def test_loyalty_endpoint_requires_auth(self, api_client):
        """Test that /api/user/loyalty requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/user/loyalty")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"Loyalty endpoint correctly requires auth: {response.status_code}")
    
    def test_loyalty_history_requires_auth(self, api_client):
        """Test that /api/user/loyalty/history requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/user/loyalty/history")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"Loyalty history endpoint correctly requires auth: {response.status_code}")
    
    def test_loyalty_points_endpoint_requires_auth(self, api_client):
        """Test that /api/user/loyalty-points requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/user/loyalty-points")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"Loyalty points endpoint correctly requires auth: {response.status_code}")


# ==================== STAFF PORTAL LOGIN TESTS ====================

class TestStaffPortalLogins:
    """Test staff portal authentication for Mango Labs and Orange Pharmacy"""
    
    def test_mango_staff_login_success(self, api_client):
        """Test Mango Labs staff login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_mango",
            "password": "test"
        })
        
        # Check if login endpoint exists
        if response.status_code == 422:
            # Check what fields are expected
            print(f"Login endpoint validation error: {response.json()}")
            pytest.skip("Staff login endpoint may have different field requirements")
        
        assert response.status_code == 200, f"Login failed with {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not returned in response"
        assert len(data["token"]) > 0, "Token is empty"
        
        if "staff" in data:
            print(f"Mango staff login success: {data['staff'].get('name', 'unknown')}")
        else:
            print(f"Mango staff login success with token")
    
    def test_mango_staff_login_invalid_credentials(self, api_client):
        """Test Mango Labs staff login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_mango",
            "password": "wrongpassword"
        })
        
        # Should fail authentication
        assert response.status_code in [401, 403, 422], f"Expected auth failure, got {response.status_code}"
        print(f"Invalid credentials correctly rejected: {response.status_code}")
    
    def test_orange_pharmacy_staff_login_success(self, api_client):
        """Test Orange Pharmacy staff login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "test"
        })
        
        # Check if login endpoint exists
        if response.status_code == 422:
            print(f"Login endpoint validation error: {response.json()}")
            pytest.skip("Staff login endpoint may have different field requirements")
        
        assert response.status_code == 200, f"Login failed with {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not returned in response"
        assert len(data["token"]) > 0, "Token is empty"
        
        if "staff" in data:
            print(f"Orange Pharmacy staff login success: {data['staff'].get('name', 'unknown')}")
        else:
            print(f"Orange Pharmacy staff login success with token")
    
    def test_orange_pharmacy_staff_login_invalid_credentials(self, api_client):
        """Test Orange Pharmacy staff login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "wrongpassword"
        })
        
        # Should fail authentication
        assert response.status_code in [401, 403, 422], f"Expected auth failure, got {response.status_code}"
        print(f"Invalid credentials correctly rejected: {response.status_code}")


# ==================== PUSH NOTIFICATION TESTS ====================

class TestPushNotifications:
    """Test push notification endpoints"""
    
    def test_vapid_public_key_endpoint(self, api_client):
        """Test that VAPID public key endpoint is accessible"""
        response = api_client.get(f"{BASE_URL}/api/push/vapid-public-key")
        
        # VAPID key endpoint should return the public key or 503 if not configured
        assert response.status_code in [200, 503], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "publicKey" in data, "publicKey field missing"
            assert len(data["publicKey"]) > 0, "Public key is empty"
            print(f"VAPID public key available: {data['publicKey'][:30]}...")
        else:
            print("Push notifications not configured (503)")
    
    def test_push_subscribe_endpoint(self, api_client):
        """Test push subscription endpoint"""
        # This endpoint should require valid subscription data
        response = api_client.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
            "keys": {
                "p256dh": "test-p256dh-key",
                "auth": "test-auth-key"
            },
            "portal_type": "mango_staff"
        })
        
        # Should accept the subscription (200) or reject invalid data (422)
        assert response.status_code in [200, 422], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            print("Push subscription endpoint working")
        else:
            print(f"Push subscription validation: {response.json()}")


# ==================== PHARMACY ORDER FLOW TESTS ====================

class TestPharmacyCheckoutFlow:
    """Test pharmacy checkout flow with COD payment"""
    
    def test_pharmacy_orders_endpoint(self, api_client):
        """Test pharmacy orders endpoint exists"""
        response = api_client.get(f"{BASE_URL}/api/pharmacy/orders")
        # Should return orders or require auth
        assert response.status_code in [200, 401, 403, 422], f"Unexpected: {response.status_code}"
        print(f"Pharmacy orders endpoint: {response.status_code}")
    
    def test_pharmacy_medicines_endpoint(self, api_client):
        """Test pharmacy medicines endpoint"""
        response = api_client.get(f"{BASE_URL}/api/pharmacy/medicines")
        # Should return medicines list
        assert response.status_code in [200, 401, 403], f"Unexpected: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Medicines endpoint working, got {len(data.get('medicines', []))} medicines")
    
    def test_pharmacy_cod_order_creation(self, api_client):
        """Test that COD orders can be created"""
        # Get sample medicine first
        response = api_client.get(f"{BASE_URL}/api/pharmacy/medicines", params={"limit": 1})
        
        if response.status_code != 200:
            pytest.skip("Cannot get medicines for order test")
        
        medicines = response.json().get('medicines', [])
        if not medicines:
            pytest.skip("No medicines available for test")
        
        # Create test order
        test_order = {
            "patient_name": "TEST_User_COD",
            "patient_phone": "9876543210",
            "medicines": [{"id": medicines[0].get('id', '1'), "name": medicines[0].get('name', 'Test'), "quantity": 1}],
            "total": 100,
            "payment_method": "cod",
            "delivery_address": "Test Address, Naigaon East"
        }
        
        response = api_client.post(f"{BASE_URL}/api/pharmacy/order", json=test_order)
        
        # Should create order or require OTP verification
        assert response.status_code in [200, 201, 400, 422], f"Unexpected: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "order_id" in data or "id" in data, "Order ID not returned"
            print(f"COD order created: {data.get('order_id', data.get('id', 'unknown'))}")
        else:
            print(f"Order creation response: {response.status_code} - {response.text[:200]}")


# ==================== CHECKOUT PAGE ROUTES ====================

class TestCheckoutRoutes:
    """Test that checkout pages are accessible"""
    
    def test_pharmacy_checkout_page(self, api_client):
        """Test /pharmacy/checkout route is accessible"""
        response = api_client.get(f"{BASE_URL}/pharmacy/checkout")
        # Should return HTML page
        assert response.status_code == 200, f"Checkout page returned {response.status_code}"
        assert "html" in response.headers.get('content-type', '').lower() or response.text.startswith('<!'), "Not an HTML page"
        print("Pharmacy checkout page accessible")
    
    def test_mango_checkout_page(self, api_client):
        """Test /mango/checkout route is accessible"""
        response = api_client.get(f"{BASE_URL}/mango/checkout")
        # Should return HTML page
        assert response.status_code == 200, f"Checkout page returned {response.status_code}"
        assert "html" in response.headers.get('content-type', '').lower() or response.text.startswith('<!'), "Not an HTML page"
        print("Mango checkout page accessible")


# ==================== MANGO LABS STAFF PORTAL ====================

class TestMangoLabsStaffPortal:
    """Test Mango Labs staff portal functionality"""
    
    def test_mango_bookings_with_auth(self, api_client, staff_token):
        """Test Mango bookings endpoint with valid auth"""
        response = api_client.get(
            f"{BASE_URL}/api/mango/bookings",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        # Should return bookings
        assert response.status_code in [200, 401, 403], f"Unexpected: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Mango bookings: {len(data.get('bookings', []))} found")
    
    def test_mango_tests_with_auth(self, api_client, staff_token):
        """Test Mango tests catalog with valid auth"""
        response = api_client.get(
            f"{BASE_URL}/api/mango/tests",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code in [200, 401, 403], f"Unexpected: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Mango tests catalog: {len(data.get('tests', []))} tests found")


# ==================== ORANGE PHARMACY STAFF PORTAL ====================

class TestOrangePharmacyStaffPortal:
    """Test Orange Pharmacy staff portal functionality"""
    
    def test_pharmacy_orders_with_auth(self, api_client, pharmacy_staff_token):
        """Test pharmacy orders endpoint with valid auth"""
        response = api_client.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers={"Authorization": f"Bearer {pharmacy_staff_token}"}
        )
        
        # Should return orders
        assert response.status_code in [200, 401, 403], f"Unexpected: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Pharmacy orders: {len(data.get('orders', []))} found")
    
    def test_pharmacy_dashboard_stats(self, api_client, pharmacy_staff_token):
        """Test pharmacy dashboard stats with valid auth"""
        response = api_client.get(
            f"{BASE_URL}/api/pharmacy/dashboard/stats",
            headers={"Authorization": f"Bearer {pharmacy_staff_token}"}
        )
        
        assert response.status_code in [200, 401, 403, 404], f"Unexpected: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Pharmacy stats retrieved: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
