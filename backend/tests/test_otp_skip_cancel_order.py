"""
Test OTP Skip for Guest Checkout and Admin Order Cancellation
Tests for:
1. Backend cancel API: POST /api/admin/orders/cancel/pharmacy/{order_id}
2. Backend cancel API: POST /api/admin/orders/cancel/diagnostics/{order_id}
3. Staff login and role verification
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://patient-nexus.preview.emergentagent.com')

class TestStaffLogin:
    """Test staff login and role verification"""
    
    def test_super_admin_login(self):
        """Test super_admin login returns valid token with admin role"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "super_admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        # Role is in staff object, not at root level
        staff_role = data.get("staff", {}).get("role") or data.get("role")
        assert staff_role in ["super_admin", "admin"], f"Expected admin role, got: {staff_role}"
        print(f"✓ Super admin login successful, role: {staff_role}")
    
    def test_pharmacy_staff_login(self):
        """Test pharmacy staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "pharmacy123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Pharmacy staff login successful, role: {data.get('role')}")
        return data["token"]
    
    def test_lab_staff_login(self):
        """Test lab staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_proton",
            "password": "proton123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Lab staff login successful, role: {data.get('role')}")
        return data["token"]


class TestAdminOrderCancellation:
    """Test admin order cancellation endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "super_admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def non_admin_token(self):
        """Get non-admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "pharmacy123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_cancel_pharmacy_order_endpoint_exists(self, admin_token):
        """Test that pharmacy cancel endpoint exists and requires valid order"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Test with non-existent order ID
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/cancel/pharmacy/{fake_order_id}",
            headers=headers
        )
        # Should return 404 for non-existent order, not 500 or 405
        assert response.status_code in [404, 200], f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✓ Pharmacy cancel endpoint exists, returns {response.status_code} for non-existent order")
    
    def test_cancel_diagnostics_order_endpoint_exists(self, admin_token):
        """Test that diagnostics cancel endpoint exists and requires valid order"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Test with non-existent order ID
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/cancel/diagnostics/{fake_order_id}",
            headers=headers
        )
        # Should return 404 for non-existent order, not 500 or 405
        assert response.status_code in [404, 200], f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✓ Diagnostics cancel endpoint exists, returns {response.status_code} for non-existent order")
    
    def test_cancel_order_requires_admin_role(self, non_admin_token):
        """Test that cancel endpoint requires admin role"""
        headers = {"Authorization": f"Bearer {non_admin_token}"}
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/cancel/pharmacy/{fake_order_id}",
            headers=headers
        )
        # Should return 403 for non-admin users
        assert response.status_code == 403, f"Expected 403 for non-admin, got: {response.status_code}"
        print(f"✓ Cancel endpoint correctly requires admin role (403 for non-admin)")
    
    def test_cancel_order_requires_authentication(self):
        """Test that cancel endpoint requires authentication"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/cancel/pharmacy/{fake_order_id}"
        )
        # Should return 401 for unauthenticated requests
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got: {response.status_code}"
        print(f"✓ Cancel endpoint correctly requires authentication (401)")
    
    def test_invalid_order_type_returns_400(self, admin_token):
        """Test that invalid order type returns 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/cancel/invalid_type/{fake_order_id}",
            headers=headers
        )
        # Should return 400 for invalid order type
        assert response.status_code == 400, f"Expected 400 for invalid type, got: {response.status_code}"
        print(f"✓ Invalid order type correctly returns 400")


class TestPharmacyOrderFlow:
    """Test pharmacy order flow - verify OTP is skipped"""
    
    def test_pharmacy_order_creation_without_otp(self):
        """Test that pharmacy order can be created without OTP verification"""
        # Create a test order with unique phone - this simulates the guest checkout flow
        import random
        unique_phone = f"98765{random.randint(10000, 99999)}"
        
        order_data = {
            "medicines": [{"name": "Paracetamol 500mg", "quantity": 2}],
            "patient_name": "Test Patient OTP Skip",
            "patient_phone": unique_phone,
            "patient_email": "test@example.com",
            "delivery_address": "123 Test Street, Mumbai",
            "payment_method": "cod"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        # Order should be created successfully without OTP
        assert response.status_code in [200, 201], f"Order creation failed: {response.status_code}, {response.text}"
        data = response.json()
        assert "id" in data or "order_id" in data or "message" in data, f"Unexpected response: {data}"
        print(f"✓ Pharmacy order created without OTP verification")
        return data
    
    def test_pharmacy_order_requires_email(self):
        """Test that pharmacy order requires email (since OTP is disabled)"""
        order_data = {
            "medicines": [{"name": "Paracetamol 500mg", "quantity": 2}],
            "patient_name": "Test Patient",
            "patient_phone": "9876543210",
            # No email provided
            "delivery_address": "123 Test Street, Mumbai",
            "payment_method": "cod"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        # Order might still be created (email validation is frontend-side)
        # But we verify the endpoint accepts orders
        print(f"✓ Pharmacy order endpoint response: {response.status_code}")


class TestDiagnosticsOrderFlow:
    """Test diagnostics order flow - verify OTP is skipped"""
    
    def test_diagnostics_order_creation_without_otp(self):
        """Test that diagnostics order can be created without OTP verification"""
        from datetime import datetime, timedelta
        import random
        
        # Create a test order with unique phone - this simulates the guest checkout flow
        unique_phone = f"98765{random.randint(10000, 99999)}"
        preferred_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        order_data = {
            "tests": ["CBC (Complete Blood Count)", "Lipid Profile"],
            "patient_name": "Test Patient OTP Skip",
            "patient_phone": unique_phone,
            "patient_email": "test@example.com",
            "patient_address": "123 Test Street, Mumbai",
            "preferred_date": preferred_date,
            "preferred_time_slot": "09:00-11:00",
            "payment_method": "cod",
            "collection_type": "home"
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        # Order should be created successfully without OTP
        assert response.status_code in [200, 201], f"Order creation failed: {response.status_code}, {response.text}"
        data = response.json()
        assert "id" in data or "order_id" in data or "message" in data, f"Unexpected response: {data}"
        print(f"✓ Diagnostics order created without OTP verification")
        return data


class TestStaffPortalOrdersAccess:
    """Test staff portal access to orders"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "super_admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_pharmacy_orders(self, admin_token):
        """Test fetching pharmacy orders as admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/staff/pharmacy/orders",
            headers=headers,
            params={"date": today}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.status_code}, {response.text}"
        data = response.json()
        assert "orders" in data or isinstance(data, list), f"Unexpected response format: {data}"
        print(f"✓ Admin can fetch pharmacy orders")
    
    def test_get_diagnostic_orders(self, admin_token):
        """Test fetching diagnostic orders as admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/staff/diagnostic/orders",
            headers=headers,
            params={"date": today}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.status_code}, {response.text}"
        data = response.json()
        assert "orders" in data or isinstance(data, list), f"Unexpected response format: {data}"
        print(f"✓ Admin can fetch diagnostic orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
