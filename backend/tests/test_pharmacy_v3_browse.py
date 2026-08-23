"""
Test Pharmacy V3 Browse API - Iteration 310
Tests for the new V3 pharmacy browse endpoints:
- GET /api/pharmacy/v3/categories - Category counts
- GET /api/pharmacy/v3/browse - Category-wise medicine sections
- GET /api/pharmacy/v3/search - Text-indexed search
- GET /api/pharmacy/v3/category/{name} - Paginated category medicines
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPharmacyV3Categories:
    """Test /api/pharmacy/v3/categories endpoint"""
    
    def test_categories_returns_success(self):
        """Categories endpoint returns success with category list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/categories?store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "categories" in data
        assert "total" in data
        print(f"✓ Categories endpoint returned {len(data['categories'])} categories")
    
    def test_categories_total_count_300k_plus(self):
        """Total medicine count should be 300K+ (337,902 expected)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/categories?store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        total = data["total"]
        assert total >= 300000, f"Expected 300K+ medicines, got {total}"
        print(f"✓ Total medicines: {total:,} (300K+ verified)")
    
    def test_categories_structure(self):
        """Each category has name and count fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/categories?store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        for cat in data["categories"][:5]:
            assert "name" in cat
            assert "count" in cat
            assert isinstance(cat["count"], int)
            assert cat["count"] > 0
        print(f"✓ Category structure verified (name, count)")


class TestPharmacyV3Browse:
    """Test /api/pharmacy/v3/browse endpoint"""
    
    def test_browse_returns_sections(self):
        """Browse endpoint returns sections array with medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "sections" in data
        assert len(data["sections"]) > 0
        print(f"✓ Browse returned {len(data['sections'])} category sections")
    
    def test_browse_section_structure(self):
        """Each section has category, total, medicines, has_more"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        section = data["sections"][0]
        assert "category" in section
        assert "total" in section
        assert "medicines" in section
        assert "has_more" in section
        assert isinstance(section["medicines"], list)
        print(f"✓ Section structure verified: {section['category']} ({section['total']} items)")
    
    def test_browse_medicines_have_ids(self):
        """Each medicine in browse has an id field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        for section in data["sections"][:3]:
            for med in section["medicines"]:
                assert "id" in med, f"Medicine {med.get('name')} missing id"
                assert "name" in med
        print(f"✓ All medicines have id field")
    
    def test_browse_has_more_flag(self):
        """has_more flag is True for categories with more than per_category items"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        # Find a section with has_more=True
        has_more_sections = [s for s in data["sections"] if s["has_more"]]
        assert len(has_more_sections) > 0, "Expected at least one section with has_more=True"
        for section in has_more_sections[:3]:
            assert section["total"] > 8, f"Section {section['category']} has_more=True but total={section['total']}"
        print(f"✓ has_more flag working correctly ({len(has_more_sections)} sections with more items)")
    
    def test_browse_total_medicines(self):
        """Browse returns total_medicines count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert "total_medicines" in data
        assert data["total_medicines"] >= 300000
        print(f"✓ Total medicines in browse: {data['total_medicines']:,}")


class TestPharmacyV3Search:
    """Test /api/pharmacy/v3/search endpoint"""
    
    def test_search_para_returns_results(self):
        """Search for 'para' returns medicine results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=para&limit=5&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        print(f"✓ Search 'para' returned {len(data['medicines'])} results")
    
    def test_search_amoxicillin_returns_antibiotics(self):
        """Search for 'amoxicillin' returns antibiotic medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=amoxicillin&limit=10&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["medicines"]) > 0
        # Check at least one result contains amoxicillin
        found_amox = any("amox" in m.get("name", "").lower() or "amox" in m.get("generic_name", "").lower() 
                         for m in data["medicines"])
        assert found_amox, "Expected amoxicillin-related results"
        print(f"✓ Search 'amoxicillin' returned {len(data['medicines'])} results")
    
    def test_search_returns_search_method(self):
        """Search response includes search_method field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=paracetamol&limit=5&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert "search_method" in data
        assert data["search_method"] in ["text_index", "prefix_index", "fuzzy_regex"]
        print(f"✓ Search method: {data['search_method']}")
    
    def test_search_pagination(self):
        """Search supports pagination with page and total"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=tablet&limit=10&page=1&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert "page" in data
        assert "pages" in data
        assert "total" in data
        assert data["page"] == 1
        print(f"✓ Search pagination: page {data['page']} of {data['pages']} (total: {data['total']})")
    
    def test_search_empty_query(self):
        """Empty search query returns empty results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=&store=orange_pharmacy")
        # Should return 422 for validation error or empty results
        assert response.status_code in [200, 422]
        if response.status_code == 200:
            data = response.json()
            assert data["medicines"] == []
        print(f"✓ Empty query handled correctly (status: {response.status_code})")


class TestPharmacyV3Category:
    """Test /api/pharmacy/v3/category/{name} endpoint"""
    
    def test_category_antibiotics_paginated(self):
        """Get paginated antibiotics category"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/category/Antibiotics%20%26%20Anti-Infectives?page=1&limit=10&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "medicines" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert "has_more" in data
        print(f"✓ Antibiotics category: {data['total']} total, page {data['page']}/{data['pages']}")
    
    def test_category_medicines_structure(self):
        """Category medicines have required fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/category/General?page=1&limit=5&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        for med in data["medicines"]:
            assert "id" in med
            assert "name" in med
            # _id should be excluded
            assert "_id" not in med
        print(f"✓ Category medicines structure verified")
    
    def test_category_pagination_page2(self):
        """Category pagination works for page 2"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/category/General?page=2&limit=10&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert len(data["medicines"]) <= 10
        print(f"✓ Category page 2 returned {len(data['medicines'])} medicines")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
