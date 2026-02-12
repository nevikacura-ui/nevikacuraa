"""
Test Suite for Unified Staff Login and New API Features
Tests: Staff login with role-based redirects, Image Search API, Send Invoice/Report APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://faith-care-whatsapp.preview.emergentagent.com')

# Staff credentials with new password (12345678)
STAFF_CREDENTIALS = {
    "pharmacy": {"username": "staff_pharmacy", "password": "12345678"},
    "mango": {"username": "staff_mango", "password": "12345678"},
    "diagyn": {"username": "staff_diagyn", "password": "12345678"},
}


class TestUnifiedStaffLogin:
    """Test unified staff login at /api/staff/login with role-based redirects"""
    
    def test_pharmacy_staff_login_success(self):
        """Test staff_pharmacy login - should return pharmacy_staff role"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "12345678"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        
        staff = data["staff"]
        assert staff["role"] == "pharmacy_staff", f"Expected pharmacy_staff role, got: {staff['role']}"
        assert staff["name"] == "Orange Pharmacy Staff", f"Unexpected name: {staff['name']}"
        print(f"✅ Pharmacy staff login success - role: {staff['role']}")
    
    def test_mango_staff_login_success(self):
        """Test staff_mango login - should return lab_staff role"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_mango",
            "password": "12345678"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        
        staff = data["staff"]
        assert staff["role"] == "lab_staff", f"Expected lab_staff role, got: {staff['role']}"
        assert staff["name"] == "Mango Labs Staff", f"Unexpected name: {staff['name']}"
        print(f"✅ Mango Labs staff login success - role: {staff['role']}")
    
    def test_diagyn_staff_login_success(self):
        """Test staff_diagyn login - should return diagyn_staff role"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "12345678"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        
        staff = data["staff"]
        assert staff["role"] == "diagyn_staff", f"Expected diagyn_staff role, got: {staff['role']}"
        assert staff["name"] == "DiaGyn Staff", f"Unexpected name: {staff['name']}"
        # Check multi-clinic support
        assert "clinics" in staff, "Missing clinics array"
        assert "Pushpa Clinic" in staff["clinics"] or staff["clinic"] == "Pushpa Clinic", "Missing clinic access"
        print(f"✅ DiaGyn staff login success - role: {staff['role']}, clinics: {staff.get('clinics', [])}")
    
    def test_invalid_credentials_login_fail(self):
        """Test login with invalid credentials - should return 401"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✅ Invalid credentials correctly rejected")
    
    def test_wrong_password_login_fail(self):
        """Test login with correct username but wrong password"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✅ Wrong password correctly rejected")


class TestImageSearchAPI:
    """Test image search API at /api/pharmacy/image-search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get pharmacy staff token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS["pharmacy"])
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_image_search_paracetamol(self):
        """Test image search for 'paracetamol'"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/image-search?query=paracetamol",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Image search failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Image search not successful"
        assert "images" in data, "No images array in response"
        assert len(data["images"]) > 0, "No images returned"
        
        # Check image structure
        first_image = data["images"][0]
        assert "preview_url" in first_image, "Missing preview_url"
        assert "full_url" in first_image, "Missing full_url"
        print(f"✅ Image search success - {len(data['images'])} images returned")
    
    def test_image_search_antibiotics(self):
        """Test image search for 'antibiotics'"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/image-search?query=antibiotics",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Image search failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Image search not successful"
        assert len(data.get("images", [])) > 0, "No images returned"
        print(f"✅ Antibiotics image search success - {len(data['images'])} images")
    
    def test_image_search_unauthorized(self):
        """Test image search without auth token - should fail"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/image-search?query=test")
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✅ Unauthorized image search correctly rejected")


class TestSendInvoiceAPI:
    """Test send invoice API at /api/pharmacy/orders/{order_id}/send-invoice"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get pharmacy staff token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS["pharmacy"])
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_send_invoice_no_invoice_uploaded(self):
        """Test send invoice when no invoice is uploaded - should return 400"""
        # First get an order ID
        orders_response = requests.get(f"{BASE_URL}/api/pharmacy/orders", headers=self.headers)
        assert orders_response.status_code == 200, "Failed to get orders"
        
        orders = orders_response.json().get("orders", [])
        if not orders:
            pytest.skip("No orders found for testing")
        
        # Find an order without invoice
        order_id = orders[0].get("order_id")
        
        # Try to send invoice
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/orders/{order_id}/send-invoice",
            headers=self.headers
        )
        
        # Should fail because no invoice uploaded OR succeed if invoice exists
        if response.status_code == 400:
            assert "No invoice uploaded" in response.json().get("detail", ""), "Unexpected error message"
            print(f"✅ Send invoice correctly requires uploaded invoice for order {order_id}")
        elif response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Send invoice not successful"
            print(f"✅ Invoice sent successfully for order {order_id}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_send_invoice_order_not_found(self):
        """Test send invoice for non-existent order - should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/orders/INVALID_ORDER_123/send-invoice",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("✅ Send invoice correctly returns 404 for invalid order")
    
    def test_send_invoice_unauthorized(self):
        """Test send invoice without auth - should fail"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/orders/ORD12345/send-invoice")
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✅ Unauthorized send invoice correctly rejected")


class TestSendReportAPI:
    """Test send report API at /api/mango/bookings/{booking_id}/send-report"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get mango lab staff token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS["mango"])
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_send_report_no_report_uploaded(self):
        """Test send report when no report is uploaded - should return 400"""
        # First get a booking ID
        bookings_response = requests.get(f"{BASE_URL}/api/mango/bookings", headers=self.headers)
        assert bookings_response.status_code == 200, "Failed to get bookings"
        
        bookings = bookings_response.json().get("bookings", [])
        if not bookings:
            pytest.skip("No bookings found for testing")
        
        booking_id = bookings[0].get("booking_id")
        
        # Try to send report
        response = requests.post(
            f"{BASE_URL}/api/mango/bookings/{booking_id}/send-report",
            headers=self.headers
        )
        
        # Should fail because no report uploaded OR succeed if report exists
        if response.status_code == 400:
            assert "No report uploaded" in response.json().get("detail", ""), "Unexpected error message"
            print(f"✅ Send report correctly requires uploaded report for booking {booking_id}")
        elif response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Send report not successful"
            print(f"✅ Report sent successfully for booking {booking_id}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_send_report_booking_not_found(self):
        """Test send report for non-existent booking - should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/mango/bookings/INVALID_BOOKING_123/send-report",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("✅ Send report correctly returns 404 for invalid booking")
    
    def test_send_report_unauthorized(self):
        """Test send report without auth - should fail"""
        response = requests.post(f"{BASE_URL}/api/mango/bookings/LAB67890/send-report")
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✅ Unauthorized send report correctly rejected")


class TestPharmacyPortalAPIs:
    """Test other pharmacy portal APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get pharmacy staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS["pharmacy"])
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_orders(self):
        """Test getting pharmacy orders"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        data = response.json()
        assert "orders" in data, "No orders key in response"
        assert "total" in data, "No total key in response"
        assert "status_counts" in data, "No status_counts key"
        print(f"✅ Got pharmacy orders - total: {data['total']}")
    
    def test_get_medicines(self):
        """Test getting medicines inventory"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get medicines: {response.text}"
        
        data = response.json()
        assert "medicines" in data, "No medicines key in response"
        print(f"✅ Got medicines - total: {data.get('total', len(data['medicines']))}")
    
    def test_get_dashboard_stats(self):
        """Test getting dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/dashboard/stats", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        assert "today_orders" in data or "pending_orders" in data, "Missing stats fields"
        print(f"✅ Got dashboard stats: {data}")


class TestMangoLabsAPIs:
    """Test other Mango Labs APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get mango staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS["mango"])
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_bookings(self):
        """Test getting lab bookings"""
        response = requests.get(f"{BASE_URL}/api/mango/bookings", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get bookings: {response.text}"
        
        data = response.json()
        assert "bookings" in data, "No bookings key in response"
        assert "total" in data, "No total key in response"
        assert "status_counts" in data, "No status_counts key"
        print(f"✅ Got lab bookings - total: {data['total']}")
    
    def test_get_tests_catalog(self):
        """Test getting test catalog"""
        response = requests.get(f"{BASE_URL}/api/mango/tests", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get tests: {response.text}"
        
        data = response.json()
        assert "tests" in data, "No tests key in response"
        print(f"✅ Got test catalog - total: {data.get('total', len(data['tests']))}")
    
    def test_get_dashboard_stats(self):
        """Test getting dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/mango/dashboard/stats", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        assert "today_bookings" in data or "pending_collection" in data, "Missing stats fields"
        print(f"✅ Got dashboard stats: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
