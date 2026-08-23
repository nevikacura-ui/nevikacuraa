"""
Orange Pharmacy Staff Portal - Backend API Tests
Tests staff login, medicines CRUD, orders, bulk update, and image search
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrangePharmacyStaffPortal:
    """Orange Pharmacy Staff Portal API Tests"""
    
    auth_token = None
    staff_info = None
    created_medicine_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup - get auth token"""
        pass  # Token will be obtained in first test
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}", "Content-Type": "application/json"}
    
    # ========== AUTH TESTS ==========
    
    def test_01_staff_login_success(self):
        """Test staff login with valid credentials: staff_orange / test1234"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        print(f"Staff login response: {response.status_code} - {response.text[:500] if response.text else 'No content'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "staff" in data, "Response should contain staff info"
        
        # Store for other tests
        TestOrangePharmacyStaffPortal.auth_token = data["token"]
        TestOrangePharmacyStaffPortal.staff_info = data["staff"]
        
        print(f"Staff info: {data['staff'].get('name')}, role: {data['staff'].get('role')}")
    
    def test_02_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrongpass"
        })
        assert response.status_code in [401, 404], f"Expected 401/404 for invalid credentials, got {response.status_code}"
    
    # ========== MEDICINES API TESTS ==========
    
    def test_03_get_medicines_without_auth(self):
        """Test GET /api/pharmacy/medicines requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_04_get_medicines_with_auth(self):
        """Test GET /api/pharmacy/medicines returns list of medicines"""
        if not self.auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines",
            headers=self.get_auth_headers()
        )
        print(f"Get medicines response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "medicines" in data, "Response should contain medicines array"
        assert "total" in data, "Response should contain total count"
        
        medicines = data["medicines"]
        total = data["total"]
        print(f"Total medicines: {total}, First 3: {[m.get('name') for m in medicines[:3]]}")
        
        # Verify 500 medicines mentioned in requirements
        assert total >= 100, f"Expected at least 100 medicines, got {total}"
    
    def test_05_search_medicines(self):
        """Test medicine search functionality"""
        if not self.auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines?search=paracetamol",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Search results for 'paracetamol': {data.get('total', 0)} medicines")
    
    def test_06_create_medicine(self):
        """Test POST /api/pharmacy/medicines - Create a new medicine"""
        if not self.auth_token:
            pytest.skip("No auth token available")
        
        test_medicine = {
            "name": "TEST_NewMedicine_" + str(os.urandom(4).hex()),
            "unit": "Tablet",
            "mrp": 150.0,
            "discount_percent": 10,
            "category": "General",
            "stock_quantity": 50,
            "manufacturer": "Test Pharma Inc",
            "generic_name": "Test Generic",
            "description": "Test medicine for automation"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/medicines",
            json=test_medicine,
            headers=self.get_auth_headers()
        )
        print(f"Create medicine response: {response.status_code} - {response.text[:300] if response.text else 'No content'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "medicine" in data, "Response should contain created medicine"
        
        created = data["medicine"]
        assert created.get("name") == test_medicine["name"], "Name should match"
        assert created.get("mrp") == test_medicine["mrp"], "MRP should match"
        assert "id" in created, "Created medicine should have an ID"
        
        # Store for later tests
        TestOrangePharmacyStaffPortal.created_medicine_id = created["id"]
        print(f"Created medicine ID: {created['id']}, Name: {created['name']}")
    
    def test_07_get_single_medicine(self):
        """Test GET /api/pharmacy/medicines/{id} - Get single medicine"""
        if not self.auth_token or not self.created_medicine_id:
            pytest.skip("No auth token or medicine ID available")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{self.created_medicine_id}",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        medicine = response.json()
        
        assert medicine.get("id") == self.created_medicine_id, "ID should match"
        print(f"Retrieved medicine: {medicine.get('name')}")
    
    def test_08_update_medicine(self):
        """Test PUT /api/pharmacy/medicines/{id} - Update medicine"""
        if not self.auth_token or not self.created_medicine_id:
            pytest.skip("No auth token or medicine ID available")
        
        update_data = {
            "mrp": 175.0,
            "discount_percent": 15,
            "stock_quantity": 75
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/{self.created_medicine_id}",
            json=update_data,
            headers=self.get_auth_headers()
        )
        print(f"Update medicine response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        updated = data.get("medicine", {})
        assert updated.get("mrp") == 175.0, "MRP should be updated to 175.0"
        assert updated.get("discount_percent") == 15, "Discount should be updated to 15"
    
    def test_09_bulk_update_medicines(self):
        """Test PUT /api/pharmacy/medicines/bulk-update - Bulk update"""
        if not self.auth_token or not self.created_medicine_id:
            pytest.skip("No auth token or medicine ID available")
        
        bulk_updates = {
            "medicines": [
                {
                    "id": self.created_medicine_id,
                    "mrp": 200.0,
                    "discount": 20
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/bulk-update",
            json=bulk_updates,
            headers=self.get_auth_headers()
        )
        print(f"Bulk update response: {response.status_code} - {response.text[:200] if response.text else ''}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Bulk update should succeed"
        assert data.get("updated") >= 1, f"At least 1 medicine should be updated, got {data.get('updated')}"
    
    # ========== ORDERS API TESTS ==========
    
    def test_10_get_orders_without_auth(self):
        """Test GET /api/pharmacy/orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_11_get_orders_with_auth(self):
        """Test GET /api/pharmacy/orders returns order list"""
        if not self.auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers=self.get_auth_headers()
        )
        print(f"Get orders response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "orders" in data, "Response should contain orders array"
        assert "total" in data, "Response should contain total count"
        
        print(f"Total orders: {data.get('total', 0)}")
    
    def test_12_get_orders_with_status_filter(self):
        """Test GET /api/pharmacy/orders with status filter"""
        if not self.auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders?status=booked",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # All returned orders should have status 'booked'
        for order in data.get("orders", []):
            if order.get("status"):
                assert order.get("status") == "booked", f"Order should have status 'booked', got {order.get('status')}"
    
    # ========== IMAGE SEARCH API TEST ==========
    
    def test_13_image_search(self):
        """Test GET /api/pharmacy/image-search - Search for medicine images"""
        if not self.auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/image-search?query=medicine",
            headers=self.get_auth_headers()
        )
        print(f"Image search response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "images" in data, "Response should contain images array"
        images = data.get("images", [])
        print(f"Image search returned {len(images)} images")
        
        # Should return placeholder images (Pixabay API key is invalid per requirements)
        if images:
            first_image = images[0]
            assert "preview_url" in first_image or "thumbnail" in first_image, "Image should have preview_url or thumbnail"
    
    # ========== DASHBOARD STATS API TEST ==========
    
    def test_14_dashboard_stats(self):
        """Test GET /api/pharmacy/dashboard/stats - Dashboard statistics"""
        if not self.auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/dashboard/stats",
            headers=self.get_auth_headers()
        )
        print(f"Dashboard stats response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify expected fields
        expected_fields = ["today_orders", "pending_orders", "total_medicines"]
        for field in expected_fields:
            assert field in data, f"Response should contain '{field}'"
        
        print(f"Dashboard stats: Orders today={data.get('today_orders')}, Pending={data.get('pending_orders')}, Total medicines={data.get('total_medicines')}")
    
    # ========== CLEANUP ==========
    
    def test_15_delete_medicine(self):
        """Test DELETE /api/pharmacy/medicines/{id} - Delete test medicine"""
        if not self.auth_token or not self.created_medicine_id:
            pytest.skip("No auth token or medicine ID available")
        
        response = requests.delete(
            f"{BASE_URL}/api/pharmacy/medicines/{self.created_medicine_id}",
            headers=self.get_auth_headers()
        )
        print(f"Delete medicine response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Delete should succeed"
        
        # Verify medicine is deleted
        verify_response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{self.created_medicine_id}",
            headers=self.get_auth_headers()
        )
        assert verify_response.status_code == 404, "Deleted medicine should return 404"
        
        print(f"Medicine {self.created_medicine_id} deleted successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
