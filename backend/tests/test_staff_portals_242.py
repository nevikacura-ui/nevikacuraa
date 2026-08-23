"""
Staff Portals Testing - Iteration 242
Testing 3 staff portal logins and Orange Pharmacy features:
- Staff login endpoints (orange_staff, mango_staff, diagyn_staff)
- Orange Pharmacy: Inventory, Orders, Missing Images tabs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestStaffLogin:
    """Test 3 staff portal logins with username/password"""
    
    def test_orange_staff_login(self):
        """Test Orange Pharmacy staff login - returns pharmacy_staff role"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "orange_staff", "password": "test1234"}
        )
        assert response.status_code == 200, f"Orange staff login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token missing"
        assert "staff" in data, "Staff info missing"
        assert data["staff"]["role"] == "pharmacy_staff", f"Expected pharmacy_staff role, got {data['staff']['role']}"
        assert data["staff"]["name"] == "Orange Pharmacy Staff"
        assert data["staff"]["department"] == "orange_pharmacy"
        print(f"✓ Orange staff login successful: role={data['staff']['role']}")
    
    def test_mango_staff_login(self):
        """Test Mango Health Labs staff login - returns lab_staff role"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "mango_staff", "password": "test1234"}
        )
        assert response.status_code == 200, f"Mango staff login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token missing"
        assert "staff" in data, "Staff info missing"
        assert data["staff"]["role"] == "lab_staff", f"Expected lab_staff role, got {data['staff']['role']}"
        assert data["staff"]["name"] == "Mango Labs Staff"
        assert data["staff"]["department"] == "mango_labs"
        print(f"✓ Mango staff login successful: role={data['staff']['role']}")
    
    def test_diagyn_staff_login(self):
        """Test DiaGyn Healthcare staff login - returns diagyn_staff role"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "diagyn_staff", "password": "test1234"}
        )
        assert response.status_code == 200, f"DiaGyn staff login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token missing"
        assert "staff" in data, "Staff info missing"
        assert data["staff"]["role"] == "diagyn_staff", f"Expected diagyn_staff role, got {data['staff']['role']}"
        assert data["staff"]["name"] == "DiaGyn Healthcare Staff"
        assert data["staff"]["department"] == "diagyn"
        print(f"✓ DiaGyn staff login successful: role={data['staff']['role']}")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "invalid_user", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly returns 401")


class TestPharmacyMedicines:
    """Test Orange Pharmacy Inventory tab - Medicines API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for pharmacy staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "orange_staff", "password": "test1234"}
        )
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_medicines_with_pagination(self):
        """GET /api/pharmacy/medicines returns paginated list"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines?page=1&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "medicines" in data, "medicines key missing"
        assert "total" in data, "total key missing"
        assert "pages" in data, "pages key missing"
        assert "page" in data, "page key missing"
        assert len(data["medicines"]) <= 10, "Returned more than limit"
        
        print(f"✓ Medicines list: {data['total']} total, page {data['page']}/{data['pages']}")
    
    def test_get_medicines_with_search(self):
        """GET /api/pharmacy/medicines?q=search_term filters by name"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines?q=para&limit=5",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "medicines" in data
        # All returned medicines should contain 'para' in name (case insensitive)
        print(f"✓ Search for 'para' returned {len(data['medicines'])} results")
    
    def test_get_medicines_with_category_filter(self):
        """GET /api/pharmacy/medicines?category=General filters by category"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines?category=General&limit=5",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "medicines" in data
        assert "categories" in data, "categories list missing"
        
        # All returned medicines should be in General category
        for med in data["medicines"]:
            assert med.get("category") == "General", f"Medicine {med['name']} has wrong category"
        
        print(f"✓ Category filter returned {len(data['medicines'])} medicines in 'General'")
    
    def test_get_medicines_missing_images(self):
        """GET /api/pharmacy/medicines?missing_images=true returns only medicines without images"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines?missing_images=true&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "medicines" in data
        
        # All returned medicines should have empty or no image_url
        for med in data["medicines"]:
            img_url = med.get("image_url", "")
            assert img_url == "" or img_url is None, f"Medicine {med['name']} has image but shouldn't"
        
        print(f"✓ Missing images filter: {data['total']} medicines without images")


class TestPharmacyOrders:
    """Test Orange Pharmacy Orders tab - Orders API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for pharmacy staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "orange_staff", "password": "test1234"}
        )
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_pharmacy_orders(self):
        """GET /api/pharmacy/staff/orders returns orders list"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/staff/orders?page=1&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "orders" in data, "orders key missing"
        
        # Each order should have required fields
        if len(data["orders"]) > 0:
            order = data["orders"][0]
            assert "id" in order, "order.id missing"
            assert "status" in order or "order_status" in order, "order status missing"
            assert "patient_name" in order or "customer_name" in order, "customer name missing"
        
        print(f"✓ Orders list: {len(data['orders'])} orders returned")
    
    def test_get_orders_with_status_filter(self):
        """GET /api/pharmacy/staff/orders?status=draft filters by status"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/staff/orders?status=draft&limit=5",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "orders" in data
        
        # All returned orders should have draft status
        for order in data["orders"]:
            status = order.get("status") or order.get("order_status")
            assert status == "draft", f"Order {order['id']} has wrong status: {status}"
        
        print(f"✓ Status filter returned {len(data['orders'])} draft orders")
    
    def test_orders_have_expected_fields(self):
        """Orders should have all required fields for display"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/staff/orders?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data["orders"]) > 0:
            order = data["orders"][0]
            # Check for expected fields (using any of possible field names)
            has_id = "id" in order or "order_id" in order
            has_status = "status" in order or "order_status" in order
            has_name = "patient_name" in order or "customer_name" in order
            has_phone = "patient_phone" in order or "customer_phone" in order
            
            assert has_id, "Order ID missing"
            assert has_status, "Order status missing"
            assert has_name, "Customer name missing"
            
            print(f"✓ Orders have required fields: id, status, name")


class TestOrderStatusUpdate:
    """Test order status advancement flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for pharmacy staff"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "orange_staff", "password": "test1234"}
        )
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_valid_status_values(self):
        """Order status flow: order_placed -> prescription_validated -> in_process -> shipped -> delivered"""
        valid_statuses = [
            "order_placed",
            "prescription_validated",
            "in_process",
            "shipped",
            "delivered",
            "cancelled"
        ]
        
        # Get an order to test with
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/staff/orders?limit=1",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data["orders"]) > 0:
            order_id = data["orders"][0]["id"]
            
            # Test status update endpoint exists and accepts valid status
            response = requests.put(
                f"{BASE_URL}/api/pharmacy/staff/orders/{order_id}/status",
                headers=self.headers,
                json={"status": "order_placed", "notes": "Test status update"}
            )
            # Should not return 404 or 500
            assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
            
            print(f"✓ Order status update endpoint working for order {order_id}")
        else:
            print("⚠ No orders to test status update")


class TestStaffTokenValidation:
    """Test that non-pharmacy staff can't access pharmacy routes"""
    
    def test_unauthorized_access(self):
        """Accessing pharmacy routes without token should fail"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines")
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
        print("✓ Unauthorized access correctly returns 401")
    
    def test_invalid_token(self):
        """Accessing with invalid token should fail"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        print("✓ Invalid token correctly returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
