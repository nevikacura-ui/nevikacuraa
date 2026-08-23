"""
Orange Pharmacy Staff Portal - P0-P2 Testing
Tests for:
- P0: Debounced search, memoized rendering, inline editing
- P1: Push notification verification
- P2: Duplicate management UI
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStaffAuthentication:
    """Staff login for pharmacy portal"""
    
    def test_staff_login_success(self):
        """Login with valid staff credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        # Staff object should have name or role
        assert "name" in data["staff"] or "role" in data["staff"]
        return data["token"]
    
    def test_staff_login_invalid(self):
        """Login with invalid credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code in [401, 404]


class TestPushNotifications:
    """P1: Push notification verification"""
    
    def test_fcm_status(self):
        """GET /api/fcm/status - Verify Firebase initialized"""
        response = requests.get(f"{BASE_URL}/api/fcm/status")
        assert response.status_code == 200
        data = response.json()
        assert data.get("firebase_initialized") == True
        assert "active_tokens" in data
        assert "total_tokens" in data
        assert "status" in data
        print(f"FCM Status: firebase_initialized={data['firebase_initialized']}, active_tokens={data['active_tokens']}")
    
    def test_fcm_test_send(self):
        """POST /api/fcm/test-send - Verify test notification sends"""
        response = requests.post(f"{BASE_URL}/api/fcm/test-send")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "fcm_response" in data
        print(f"FCM Test Send: success={data['success']}, response={data.get('fcm_response', '')[:50]}")


class TestMedicinesAPI:
    """P0: Pharmacy medicines CRUD and search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for all tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_medicines_list_pagination(self):
        """GET /api/pharmacy/medicines - List with pagination"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines", 
            params={"page": 1, "limit": 50},
            headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        assert "pages" in data
        assert data["total"] > 200000  # 255K+ products
        print(f"Medicines: total={data['total']}, pages={data['pages']}, fetched={len(data['medicines'])}")
    
    def test_medicines_search(self):
        """GET /api/pharmacy/medicines - Search functionality for debounced search"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines",
            params={"search": "paracetamol", "page": 1, "limit": 10},
            headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        # Check that search results contain the search term
        for med in data["medicines"][:5]:
            assert "paracetamol" in med.get("name", "").lower() or \
                   "paracetamol" in med.get("generic_name", "").lower()
        print(f"Search 'paracetamol': found {data['total']} results")
    
    def test_medicines_category_filter(self):
        """GET /api/pharmacy/medicines - Category filter (Antibiotics, Pain Relief)"""
        for category in ["Antibiotics", "Pain Relief"]:
            response = requests.get(f"{BASE_URL}/api/pharmacy/medicines",
                params={"category": category, "page": 1, "limit": 10},
                headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert "medicines" in data
            print(f"Category '{category}': found {data['total']} products")
    
    def test_medicine_inline_edit(self):
        """PUT /api/pharmacy/medicines/{id} - Test inline editing (MRP, discount, stock)"""
        # First, get a medicine
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines",
            params={"page": 1, "limit": 1},
            headers=self.headers)
        assert response.status_code == 200
        medicines = response.json().get("medicines", [])
        if not medicines:
            pytest.skip("No medicines to test inline edit")
        
        med_id = medicines[0]["id"]
        original_mrp = medicines[0].get("mrp", 100)
        
        # Update MRP, discount, stock (inline edit fields)
        test_mrp = original_mrp + 10
        response = requests.put(f"{BASE_URL}/api/pharmacy/medicines/{med_id}",
            json={
                "mrp": test_mrp,
                "discount_percent": 10,
                "stock_quantity": 50
            },
            headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/pharmacy/medicines/{med_id}",
            headers=self.headers)
        assert verify_response.status_code == 200
        updated_med = verify_response.json()
        assert updated_med.get("mrp") == test_mrp
        assert updated_med.get("discount_percent") == 10
        assert updated_med.get("stock_quantity") == 50
        
        # Restore original MRP
        requests.put(f"{BASE_URL}/api/pharmacy/medicines/{med_id}",
            json={"mrp": original_mrp},
            headers=self.headers)
        print(f"Inline edit verified for medicine {med_id[:8]}...")


class TestDuplicateManagement:
    """P2: Duplicate management UI API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for all tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_duplicates_list(self):
        """GET /api/pharmacy/duplicates - Get duplicate groups"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/duplicates",
            params={"page": 1, "limit": 20},
            headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "duplicates" in data
        assert "total" in data
        assert "pages" in data
        
        # Verify structure of duplicate groups
        if data["duplicates"]:
            group = data["duplicates"][0]
            assert "name" in group
            assert "count" in group
            assert "items" in group
            assert group["count"] >= 2
            
            # Check items have required fields
            for item in group["items"]:
                assert "id" in item
                assert "name" in item
        
        print(f"Duplicates: total={data['total']} groups, fetched={len(data['duplicates'])}")
    
    def test_duplicates_pagination(self):
        """GET /api/pharmacy/duplicates - Pagination works"""
        # Page 1
        response1 = requests.get(f"{BASE_URL}/api/pharmacy/duplicates",
            params={"page": 1, "limit": 5},
            headers=self.headers)
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1["pages"] > 1:
            # Page 2
            response2 = requests.get(f"{BASE_URL}/api/pharmacy/duplicates",
                params={"page": 2, "limit": 5},
                headers=self.headers)
            assert response2.status_code == 200
            data2 = response2.json()
            
            # Verify different results
            if data1["duplicates"] and data2["duplicates"]:
                assert data1["duplicates"][0]["name"] != data2["duplicates"][0]["name"]
                print("Duplicates pagination verified")


class TestAddProductModal:
    """P0: Add Product functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for all tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_create_delete_product(self):
        """POST/DELETE /api/pharmacy/medicines - Create and delete product"""
        # Create test product
        test_product = {
            "name": "TEST_AutoSuggestMedicine_205",
            "unit": "Tablet",
            "mrp": 150.0,
            "discount_percent": 15,
            "category": "Pain Relief",
            "stock_quantity": 100,
            "manufacturer": "Test Manufacturer"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy/medicines",
            json=test_product,
            headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "medicine" in data
        
        created_id = data["medicine"]["id"]
        
        # Verify created
        verify_response = requests.get(f"{BASE_URL}/api/pharmacy/medicines/{created_id}",
            headers=self.headers)
        assert verify_response.status_code == 200
        
        # Clean up - delete
        delete_response = requests.delete(f"{BASE_URL}/api/pharmacy/medicines/{created_id}",
            headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deleted
        verify_deleted = requests.get(f"{BASE_URL}/api/pharmacy/medicines/{created_id}",
            headers=self.headers)
        assert verify_deleted.status_code == 404
        
        print(f"Create/Delete product cycle verified")
    
    def test_auto_suggest(self):
        """GET /api/pharmacy/medicines/suggest - Auto-suggest functionality"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines/suggest",
            params={"q": "para"},
            headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0
        
        # Verify suggestion structure
        suggestion = data["suggestions"][0]
        assert "name" in suggestion
        print(f"Auto-suggest 'para': found {len(data['suggestions'])} suggestions")


class TestImageSearch:
    """P0: Image search and camera functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for all tests"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_image_search(self):
        """GET /api/pharmacy/image-search - Image search"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/image-search",
            params={"query": "medicine tablet"},
            headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "images" in data
        # Should return images (from Pexels/Pixabay or placeholders)
        assert len(data["images"]) > 0
        print(f"Image search: found {len(data['images'])} images")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
