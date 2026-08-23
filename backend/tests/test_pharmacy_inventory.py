"""
Pharmacy Inventory Tests - Tests for medicine catalog imported from Torgen PDF
Tests: GET /api/pharmacy/all, GET /api/pharmacy/search, GET /api/pharmacy/count
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')


class TestPharmacyInventory:
    """Tests for pharmacy medicine inventory API endpoints"""
    
    def test_pharmacy_all_returns_177_medicines(self):
        """Test that /api/pharmacy/all returns the 177 imported medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all", params={"page": 1, "per_page": 200})
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify total count
        assert data["total"] == 177, f"Expected 177 medicines, got {data['total']}"
        
        # Verify source is database (not static)
        assert data["source"] == "database", "Medicines should come from database"
        
        # Verify pagination info
        assert data["page"] == 1
        assert "medicines" in data
        assert len(data["medicines"]) == 177
        
        print(f"✅ Total medicines: {data['total']}, Source: {data['source']}")
    
    def test_medicine_has_name_mrp_composition(self):
        """Test that each medicine has Name, MRP, and Composition fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all", params={"page": 1, "per_page": 5})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check first medicine has required fields
        medicine = data["medicines"][0]
        
        assert "name" in medicine, "Medicine should have 'name' field"
        assert "mrp" in medicine, "Medicine should have 'mrp' field"
        assert "composition" in medicine, "Medicine should have 'composition' field"
        
        # Verify fields are not empty
        assert medicine["name"], "Name should not be empty"
        assert medicine["mrp"] is not None, "MRP should not be None"
        assert medicine["composition"], "Composition should not be empty"
        
        print(f"✅ Sample medicine: {medicine['name']}, MRP: ₹{medicine['mrp']}")
        print(f"   Composition: {medicine['composition']}")
    
    def test_search_medicines_returns_results(self):
        """Test that search functionality works for medicines"""
        # Search for ACYCLOSURE - should be in Torgen catalog
        response = requests.get(f"{BASE_URL}/api/pharmacy/search", params={"q": "acyclosure", "limit": 10})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "medicines" in data
        assert len(data["medicines"]) > 0, "Search for 'acyclosure' should return results"
        
        # Verify source is database
        assert data.get("source") == "database", "Search should query database"
        
        # Check that results contain the search term
        for med in data["medicines"]:
            assert "ACYCLOSURE" in med["name"].upper(), f"Result {med['name']} should contain ACYCLOSURE"
        
        print(f"✅ Search 'acyclosure' returned {len(data['medicines'])} results")
    
    def test_search_medicines_with_different_terms(self):
        """Test search with various medicine names from Torgen catalog"""
        test_terms = ["allugel", "torzol", "pantacare"]
        
        for term in test_terms:
            response = requests.get(f"{BASE_URL}/api/pharmacy/search", params={"q": term, "limit": 5})
            
            assert response.status_code == 200
            data = response.json()
            
            if len(data["medicines"]) > 0:
                print(f"✅ Search '{term}' returned {len(data['medicines'])} results")
            else:
                print(f"⚠️ Search '{term}' returned 0 results")
    
    def test_medicine_contains_all_expected_fields(self):
        """Test that medicine objects contain all expected fields from PDF import"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all", params={"page": 1, "per_page": 1})
        
        assert response.status_code == 200
        data = response.json()
        medicine = data["medicines"][0]
        
        expected_fields = ["id", "name", "form", "category", "composition", "pack", "mrp", "sale_price", "stock", "unit"]
        
        for field in expected_fields:
            assert field in medicine, f"Medicine should have '{field}' field"
        
        print(f"✅ Medicine has all expected fields: {list(medicine.keys())}")
    
    def test_pagination_works(self):
        """Test that pagination returns correct subset of medicines"""
        # Get page 1 with 10 items
        response1 = requests.get(f"{BASE_URL}/api/pharmacy/all", params={"page": 1, "per_page": 10})
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get page 2 with 10 items
        response2 = requests.get(f"{BASE_URL}/api/pharmacy/all", params={"page": 2, "per_page": 10})
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify different medicines on different pages
        page1_names = [m["name"] for m in data1["medicines"]]
        page2_names = [m["name"] for m in data2["medicines"]]
        
        assert page1_names != page2_names, "Page 1 and Page 2 should have different medicines"
        assert data1["page"] == 1
        assert data2["page"] == 2
        
        print(f"✅ Pagination works: Page 1 has {len(page1_names)} items, Page 2 has {len(page2_names)} items")
    
    def test_filter_by_form(self):
        """Test filtering medicines by form (Tablet, Syrup, etc.)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all", params={"form": "Tablet", "per_page": 50})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned medicines should be tablets
        for med in data["medicines"]:
            assert med.get("form", "").lower() == "tablet", f"Medicine {med['name']} should be Tablet form"
        
        print(f"✅ Filter by form 'Tablet' returned {len(data['medicines'])} results")


class TestPharmacyAPIHealth:
    """Basic health check tests for pharmacy endpoints"""
    
    def test_pharmacy_all_endpoint_responds(self):
        """Test /api/pharmacy/all endpoint is responsive"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all")
        assert response.status_code == 200
        print("✅ /api/pharmacy/all endpoint is responsive")
    
    def test_pharmacy_search_endpoint_responds(self):
        """Test /api/pharmacy/search endpoint is responsive"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search", params={"q": "test"})
        assert response.status_code == 200
        print("✅ /api/pharmacy/search endpoint is responsive")
    
    def test_pharmacy_count_endpoint_responds(self):
        """Test /api/pharmacy/count endpoint is responsive"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        print("✅ /api/pharmacy/count endpoint is responsive")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
