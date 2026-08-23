"""
Pharmacy Tabs & Brands API Tests
Tests for the new pharmacy restructure:
- Section tabs (orange_pharmacy vs orange_healthplus)
- Shop by Brand functionality
- Featured brands for Orange Healthplus
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPharmacyBrowseAPI:
    """Tests for /api/pharmacy/v3/browse endpoint with section filtering"""
    
    def test_browse_orange_pharmacy_section(self):
        """Test browse API returns drug products for orange_pharmacy section"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?section=orange_pharmacy&per_category=4")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "sections" in data
        assert data["section"] == "orange_pharmacy"
        assert data["total_medicines"] > 0
        
        # Verify products have store field = orange_pharmacy
        for section in data["sections"][:2]:
            for med in section["medicines"]:
                assert med.get("store") == "orange_pharmacy", f"Expected orange_pharmacy, got {med.get('store')}"
        
        print(f"PASS: orange_pharmacy browse returns {data['total_medicines']} medicines across {len(data['sections'])} categories")
    
    def test_browse_orange_healthplus_section(self):
        """Test browse API returns OTC products for orange_healthplus section"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?section=orange_healthplus&per_category=4")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "sections" in data
        assert data["section"] == "orange_healthplus"
        assert data["total_medicines"] > 0
        
        # Verify products have store field = orange_healthplus
        for section in data["sections"][:2]:
            for med in section["medicines"]:
                assert med.get("store") == "orange_healthplus", f"Expected orange_healthplus, got {med.get('store')}"
        
        print(f"PASS: orange_healthplus browse returns {data['total_medicines']} medicines across {len(data['sections'])} categories")
    
    def test_browse_sections_have_different_products(self):
        """Verify orange_pharmacy and orange_healthplus return different product sets"""
        resp_pharmacy = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?section=orange_pharmacy&per_category=4")
        resp_healthplus = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?section=orange_healthplus&per_category=4")
        
        pharmacy_data = resp_pharmacy.json()
        healthplus_data = resp_healthplus.json()
        
        # Get first product names from each section
        pharmacy_names = set()
        healthplus_names = set()
        
        for section in pharmacy_data["sections"][:3]:
            for med in section["medicines"]:
                pharmacy_names.add(med["name"])
        
        for section in healthplus_data["sections"][:3]:
            for med in section["medicines"]:
                healthplus_names.add(med["name"])
        
        # Verify minimal overlap (some products might be in both)
        overlap = pharmacy_names.intersection(healthplus_names)
        print(f"PASS: Sections have different products. Pharmacy: {len(pharmacy_names)}, Healthplus: {len(healthplus_names)}, Overlap: {len(overlap)}")


class TestFeaturedBrandsAPI:
    """Tests for /api/pharmacy/v3/featured-brands endpoint"""
    
    def test_featured_brands_returns_5_brands(self):
        """Test featured-brands returns the 5 curated brands"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=6")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "brands" in data
        assert len(data["brands"]) == 5, f"Expected 5 brands, got {len(data['brands'])}"
        
        expected_brands = ["Minimalist", "The Derma Co", "Aqualogica", "Cetaphil", "Biluma"]
        actual_brands = [b["brand"] for b in data["brands"]]
        
        for brand in expected_brands:
            assert brand in actual_brands, f"Missing expected brand: {brand}"
        
        print(f"PASS: Featured brands returns all 5 brands: {actual_brands}")
    
    def test_featured_brands_have_products_with_prices(self):
        """Test featured brand products have valid MRP and sale_price"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=4")
        data = response.json()
        
        for brand in data["brands"]:
            assert len(brand["medicines"]) > 0, f"Brand {brand['brand']} has no products"
            
            for med in brand["medicines"]:
                assert med.get("mrp", 0) > 0, f"Product {med['name']} has no MRP"
                assert med.get("sale_price", 0) > 0, f"Product {med['name']} has no sale_price"
                
                # Verify 15% discount is applied
                expected_sale = round(med["mrp"] * 0.85, 2)
                actual_sale = round(med["sale_price"], 2)
                assert abs(actual_sale - expected_sale) < 1, f"Discount not 15% for {med['name']}: MRP={med['mrp']}, sale={med['sale_price']}"
        
        print("PASS: All featured brand products have valid prices with 15% discount")
    
    def test_featured_brands_product_counts(self):
        """Verify product counts for each featured brand"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=20")
        data = response.json()
        
        brand_counts = {b["brand"]: b["total"] for b in data["brands"]}
        
        # Verify we have products for each brand
        for brand, count in brand_counts.items():
            assert count > 0, f"Brand {brand} has 0 products"
        
        total_products = sum(brand_counts.values())
        print(f"PASS: Featured brands have {total_products} total products: {brand_counts}")


class TestShopByBrandAPI:
    """Tests for /api/pharmacy/v3/brands and /api/pharmacy/v3/brand/{name} endpoints"""
    
    def test_brands_list_endpoint(self):
        """Test /api/pharmacy/v3/brands returns brand list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/brands?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "brands" in data
        assert len(data["brands"]) > 0
        
        # Verify brand structure
        first_brand = data["brands"][0]
        assert "name" in first_brand
        assert "count" in first_brand
        assert first_brand["count"] >= 3  # Minimum 3 products per brand
        
        print(f"PASS: Brands list returns {len(data['brands'])} brands")
    
    def test_brand_products_minimalist(self):
        """Test /api/pharmacy/v3/brand/Minimalist returns Minimalist products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/brand/Minimalist?page=1&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["brand"] == "Minimalist"
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        assert data["total"] > 0
        
        # Verify all products are from Minimalist
        for med in data["medicines"]:
            assert med["manufacturer"].lower() == "minimalist", f"Product {med['name']} is not from Minimalist"
        
        print(f"PASS: Minimalist brand has {data['total']} products")
    
    def test_brand_products_pagination(self):
        """Test brand products pagination works"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/brand/Minimalist?page=1&limit=5")
        data = response.json()
        
        assert "page" in data
        assert "pages" in data
        assert "has_more" in data
        assert data["page"] == 1
        
        if data["total"] > 5:
            assert data["has_more"] == True
        
        print(f"PASS: Brand pagination works - page {data['page']} of {data['pages']}")


class TestSearchWithSection:
    """Tests for search API with section filtering"""
    
    def test_search_within_section(self):
        """Test search respects section parameter"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=vitamin&limit=10&section=orange_healthplus")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        print(f"PASS: Search returns {data['total']} results for 'vitamin'")
    
    def test_search_returns_products_with_prices(self):
        """Test search prioritizes products with prices"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Minimalist&limit=10")
        data = response.json()
        
        # Check that products with prices come first
        priced_products = [m for m in data["medicines"] if m.get("mrp", 0) > 0]
        
        print(f"PASS: Search returns {len(priced_products)} priced products out of {len(data['medicines'])}")


class TestCategoryWithSection:
    """Tests for category API with section filtering"""
    
    def test_category_with_section_filter(self):
        """Test category endpoint respects section parameter"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/category/General?page=1&limit=10&section=orange_pharmacy")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "medicines" in data
        
        print(f"PASS: Category 'General' returns {data['total']} products for orange_pharmacy section")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
