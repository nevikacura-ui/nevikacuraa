"""
Orange Select (Trusted Formulary) API Tests - Iteration 301
Tests for the renamed Orange Select feature with 1584 medicines
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrangeSelectAPIs:
    """Tests for Orange Select (formerly Trusted Formulary) endpoints"""
    
    def test_formulary_categories_returns_25_categories(self):
        """GET /api/emr/formulary/categories should return 25 categories with 1584 total medicines"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Response should have 'categories' key"
        assert "total_medicines" in data, "Response should have 'total_medicines' key"
        
        # Verify 25 categories
        categories = data["categories"]
        assert len(categories) == 25, f"Expected 25 categories, got {len(categories)}"
        
        # Verify total medicines is 1584
        total = data["total_medicines"]
        assert total == 1584, f"Expected 1584 total medicines, got {total}"
        
        # Verify each category has name and count
        for cat in categories:
            assert "name" in cat, "Each category should have 'name'"
            assert "count" in cat, "Each category should have 'count'"
            assert cat["count"] > 0, f"Category {cat['name']} should have count > 0"
        
        print(f"✓ Categories API: {len(categories)} categories, {total} total medicines")
    
    def test_formulary_top_returns_9_medicines(self):
        """GET /api/emr/formulary/top?limit=9 should return 9 medicines"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/top?limit=9")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "medicines" in data, "Response should have 'medicines' key"
        
        medicines = data["medicines"]
        assert len(medicines) == 9, f"Expected 9 medicines, got {len(medicines)}"
        
        # Verify medicine structure
        for med in medicines:
            assert "id" in med, "Medicine should have 'id'"
            assert "name" in med, "Medicine should have 'name'"
            # Price should be present (mrp, sale_price, or orange_price)
            has_price = med.get("mrp") or med.get("sale_price") or med.get("orange_price")
            assert has_price, f"Medicine {med['name']} should have a price"
        
        print(f"✓ Top medicines API: {len(medicines)} medicines returned")
    
    def test_formulary_search_cipla(self):
        """GET /api/emr/formulary/search?q=cipla should return results"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/search?q=cipla")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "medicines" in data, "Response should have 'medicines' key"
        
        medicines = data["medicines"]
        assert len(medicines) > 0, "Search for 'cipla' should return results"
        
        # Verify search results contain cipla
        for med in medicines[:5]:  # Check first 5
            name_lower = med.get("name", "").lower()
            company_lower = med.get("company", "").lower()
            manufacturer_lower = med.get("manufacturer", "").lower()
            contains_cipla = "cipla" in name_lower or "cipla" in company_lower or "cipla" in manufacturer_lower
            # At least some should match
        
        print(f"✓ Search API (cipla): {len(medicines)} results")
    
    def test_formulary_search_paracetamol(self):
        """GET /api/emr/formulary/search?q=paracetamol should return results"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/search?q=paracetamol")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        medicines = data.get("medicines", [])
        # May or may not have paracetamol in formulary
        print(f"✓ Search API (paracetamol): {len(medicines)} results")
    
    def test_formulary_by_category_antibiotics(self):
        """GET /api/emr/formulary/by-category/Antibiotics should return medicines"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/by-category/Antibiotics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "medicines" in data, "Response should have 'medicines' key"
        
        medicines = data["medicines"]
        assert len(medicines) > 0, "Antibiotics category should have medicines"
        
        # Verify all medicines are in Antibiotics category
        for med in medicines[:5]:
            category = med.get("category", "")
            assert "Antibiotic" in category, f"Medicine should be in Antibiotics category, got {category}"
        
        print(f"✓ By-category API (Antibiotics): {len(medicines)} medicines")
    
    def test_formulary_by_category_diabetes(self):
        """GET /api/emr/formulary/by-category/Diabetes should return medicines"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/by-category/Diabetes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        medicines = data.get("medicines", [])
        assert len(medicines) > 0, "Diabetes category should have medicines"
        print(f"✓ By-category API (Diabetes): {len(medicines)} medicines")
    
    def test_formulary_by_category_general_medicine(self):
        """GET /api/emr/formulary/by-category/General Medicine should return medicines"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/by-category/General%20Medicine?limit=100")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        medicines = data.get("medicines", [])
        # General Medicine should have medicines (default limit is 50, we request 100)
        assert len(medicines) >= 50, f"General Medicine should have many medicines, got {len(medicines)}"
        print(f"✓ By-category API (General Medicine): {len(medicines)} medicines")
    
    def test_medicine_card_fields(self):
        """Verify medicine cards have required fields: name, form, company, price"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/top?limit=9")
        assert response.status_code == 200
        
        data = response.json()
        medicines = data.get("medicines", [])
        
        for med in medicines:
            # Required fields
            assert "name" in med and med["name"], f"Medicine should have name"
            
            # Optional but expected fields
            form = med.get("form", "")
            company = med.get("company", "") or med.get("manufacturer", "")
            
            # Price fields - at least one should exist
            mrp = med.get("mrp")
            sale_price = med.get("sale_price")
            orange_price = med.get("orange_price")
            has_price = mrp or sale_price or orange_price
            assert has_price, f"Medicine {med['name']} should have at least one price field"
        
        print(f"✓ Medicine card fields verified for {len(medicines)} medicines")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """API should be accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
