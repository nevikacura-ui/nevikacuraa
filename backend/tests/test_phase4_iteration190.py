"""
Test Phase 4 Features - Iteration 190
Tests for:
1. GET /api/health-stats/{phone} - returns 6 metrics
2. POST /api/addresses - creates address with lat/lng fields
3. GET /api/addresses/{phone} - returns saved addresses
4. DELETE /api/addresses/{id} - deletes an address
5. GET /api/recent-orders/{phone} - returns pharmacy_orders and lab_tests
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestHealthStats:
    """Test health-stats endpoint returns 6 metrics"""
    
    def test_health_stats_returns_6_metrics(self):
        """GET /api/health-stats/9876543210 should return 6 metrics"""
        response = requests.get(f"{BASE_URL}/api/health-stats/9876543210")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "metrics" in data, "Response should contain 'metrics' field"
        
        metrics = data["metrics"]
        assert len(metrics) == 6, f"Expected 6 metrics, got {len(metrics)}"
        
        # Verify all expected metrics are present
        expected_keys = ["sleep", "steps", "heart_rate", "bmi", "water", "calories"]
        actual_keys = [m["key"] for m in metrics]
        for key in expected_keys:
            assert key in actual_keys, f"Missing metric: {key}"
        
        # Verify each metric has required fields
        for metric in metrics:
            assert "key" in metric, f"Metric missing 'key' field"
            assert "label" in metric, f"Metric missing 'label' field"
            assert "value" in metric, f"Metric missing 'value' field"
            assert "target" in metric, f"Metric missing 'target' field"
            assert "color" in metric, f"Metric missing 'color' field"
        
        print(f"PASS: Health stats returns {len(metrics)} metrics with keys: {actual_keys}")


class TestAddressCRUD:
    """Test addresses CRUD operations with lat/lng support"""
    
    @pytest.fixture
    def unique_address(self):
        """Generate unique test address data"""
        return {
            "label": "home",
            "full_address": f"TEST_{uuid.uuid4().hex[:8]} Test Street, Mumbai",
            "pincode": "400001",
            "city": "Mumbai",
            "state": "Maharashtra",
            "lat": 19.0760,
            "lng": 72.8777,
            "is_default": False
        }
    
    def test_create_address_with_lat_lng(self, unique_address):
        """POST /api/addresses should create address with lat/lng fields"""
        response = requests.post(
            f"{BASE_URL}/api/addresses?phone=9876543210",
            json=unique_address
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Body: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "address" in data, "Response should contain 'address' field"
        
        address = data["address"]
        assert address["label"] == unique_address["label"], "Label mismatch"
        assert address["full_address"] == unique_address["full_address"], "Address mismatch"
        assert address["lat"] == unique_address["lat"], "Lat not saved"
        assert address["lng"] == unique_address["lng"], "Lng not saved"
        assert "id" in address, "Address should have 'id' field"
        
        print(f"PASS: Created address with id={address['id']}, lat={address['lat']}, lng={address['lng']}")
        
        # Cleanup - delete the test address
        delete_response = requests.delete(f"{BASE_URL}/api/addresses/{address['id']}")
        assert delete_response.status_code == 200, f"Failed to cleanup: {delete_response.text}"
    
    def test_get_saved_addresses(self):
        """GET /api/addresses/{phone} should return saved addresses"""
        response = requests.get(f"{BASE_URL}/api/addresses/9876543210")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "addresses" in data, "Response should contain 'addresses' field"
        assert isinstance(data["addresses"], list), "Addresses should be a list"
        
        print(f"PASS: GET addresses returned {len(data['addresses'])} addresses")
    
    def test_delete_address(self, unique_address):
        """DELETE /api/addresses/{id} should delete an address"""
        # First create an address
        create_response = requests.post(
            f"{BASE_URL}/api/addresses?phone=9876543210",
            json=unique_address
        )
        assert create_response.status_code == 200, f"Failed to create address: {create_response.text}"
        
        address_id = create_response.json()["address"]["id"]
        
        # Now delete it
        delete_response = requests.delete(f"{BASE_URL}/api/addresses/{address_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        data = delete_response.json()
        assert data.get("success") == True, "Delete should return success=True"
        
        # Verify it's deleted by trying to get it
        get_response = requests.get(f"{BASE_URL}/api/addresses/9876543210")
        addresses = get_response.json()["addresses"]
        address_ids = [a["id"] for a in addresses]
        assert address_id not in address_ids, "Address should be deleted from list"
        
        print(f"PASS: Deleted address with id={address_id}")
    
    def test_delete_nonexistent_address_returns_404(self):
        """DELETE /api/addresses/{id} should return 404 for non-existent address"""
        response = requests.delete(f"{BASE_URL}/api/addresses/nonexistent123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: DELETE non-existent address returns 404")


class TestRecentOrders:
    """Test recent-orders endpoint returns pharmacy_orders and lab_tests"""
    
    def test_recent_orders_structure(self):
        """GET /api/recent-orders/{phone} should return pharmacy_orders and lab_tests"""
        response = requests.get(f"{BASE_URL}/api/recent-orders/9876543210")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pharmacy_orders" in data, "Response should contain 'pharmacy_orders' field"
        assert "lab_tests" in data, "Response should contain 'lab_tests' field"
        
        assert isinstance(data["pharmacy_orders"], list), "pharmacy_orders should be a list"
        assert isinstance(data["lab_tests"], list), "lab_tests should be a list"
        
        print(f"PASS: Recent orders has {len(data['pharmacy_orders'])} pharmacy orders, {len(data['lab_tests'])} lab tests")


class TestIntegrationFlow:
    """Test complete address creation and retrieval flow"""
    
    def test_create_verify_delete_address_flow(self):
        """Full CRUD flow: Create -> GET to verify -> DELETE -> GET to confirm deletion"""
        # Create address with all fields including lat/lng
        address_data = {
            "label": "work",
            "full_address": f"TEST_INTEGRATION_{uuid.uuid4().hex[:6]} Integration Building",
            "landmark": "Near Test Plaza",
            "pincode": "400051",
            "city": "Mumbai",
            "state": "Maharashtra",
            "lat": 19.1136,
            "lng": 72.8697,
            "is_default": True
        }
        
        # Step 1: Create
        create_response = requests.post(
            f"{BASE_URL}/api/addresses?phone=9876543210",
            json=address_data
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created_address = create_response.json()["address"]
        address_id = created_address["id"]
        print(f"Step 1 PASS: Created address with id={address_id}")
        
        # Step 2: GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/addresses/9876543210")
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        addresses = get_response.json()["addresses"]
        found = next((a for a in addresses if a["id"] == address_id), None)
        assert found is not None, f"Address {address_id} not found in GET response"
        assert found["lat"] == address_data["lat"], "Lat not persisted correctly"
        assert found["lng"] == address_data["lng"], "Lng not persisted correctly"
        print(f"Step 2 PASS: Address found with lat={found['lat']}, lng={found['lng']}")
        
        # Step 3: DELETE
        delete_response = requests.delete(f"{BASE_URL}/api/addresses/{address_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"Step 3 PASS: Deleted address {address_id}")
        
        # Step 4: GET to confirm deletion
        verify_response = requests.get(f"{BASE_URL}/api/addresses/9876543210")
        addresses_after = verify_response.json()["addresses"]
        address_ids = [a["id"] for a in addresses_after]
        assert address_id not in address_ids, "Address still exists after deletion"
        print(f"Step 4 PASS: Address {address_id} confirmed deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
