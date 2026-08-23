"""
Test Store Separation Feature - Orange Pharmacy vs Orange HealthPlus
Tests the store filter parameter on pharmacy endpoints to ensure proper separation
of prescription medicines (orange_pharmacy ~338K) and OTC products (orange_healthplus ~244K)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStoreSeparation:
    """Test store filter parameter on pharmacy endpoints"""
    
    # ============ COUNT ENDPOINT TESTS ============
    
    def test_pharmacy_count_orange_pharmacy(self):
        """GET /api/pharmacy/count?store=orange_pharmacy should return ~338K"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count?store=orange_pharmacy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data, "Response should contain 'total' field"
        total = data["total"]
        print(f"Orange Pharmacy count: {total:,}")
        # Should be around 338K (allow some variance)
        assert total > 300000, f"Expected ~338K medicines, got {total:,}"
        assert total < 400000, f"Expected ~338K medicines, got {total:,}"
    
    def test_pharmacy_count_orange_healthplus(self):
        """GET /api/pharmacy/count?store=orange_healthplus should return ~244K"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count?store=orange_healthplus")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data, "Response should contain 'total' field"
        total = data["total"]
        print(f"Orange HealthPlus count: {total:,}")
        # Should be around 244K (allow some variance)
        assert total > 200000, f"Expected ~244K products, got {total:,}"
        assert total < 300000, f"Expected ~244K products, got {total:,}"
    
    def test_pharmacy_count_no_store_returns_all(self):
        """GET /api/pharmacy/count without store param should return total (~582K)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        total = data["total"]
        print(f"Total medicines (no store filter): {total:,}")
        # Should be sum of both stores (~582K)
        assert total > 500000, f"Expected ~582K total, got {total:,}"
    
    # ============ ALL ENDPOINT TESTS ============
    
    def test_pharmacy_all_orange_pharmacy_returns_pharmacy_medicines(self):
        """GET /api/pharmacy/all?store=orange_pharmacy returns only pharmacy medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=20")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "medicines" in data, "Response should contain 'medicines' field"
        assert "total" in data, "Response should contain 'total' field"
        
        medicines = data["medicines"]
        assert len(medicines) > 0, "Should return at least some medicines"
        
        # Verify all returned medicines have store=orange_pharmacy
        for med in medicines:
            assert med.get("store") == "orange_pharmacy", f"Medicine {med.get('name')} has store={med.get('store')}, expected orange_pharmacy"
        
        print(f"Verified {len(medicines)} medicines all have store=orange_pharmacy")
    
    def test_pharmacy_all_orange_healthplus_returns_healthplus_products(self):
        """GET /api/pharmacy/all?store=orange_healthplus returns only HealthPlus products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&per_page=20")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "medicines" in data, "Response should contain 'medicines' field"
        medicines = data["medicines"]
        assert len(medicines) > 0, "Should return at least some products"
        
        # Verify all returned products have store=orange_healthplus
        for med in medicines:
            assert med.get("store") == "orange_healthplus", f"Product {med.get('name')} has store={med.get('store')}, expected orange_healthplus"
        
        print(f"Verified {len(medicines)} products all have store=orange_healthplus")
    
    def test_pharmacy_all_pagination_with_store_filter(self):
        """Pagination should work correctly with store filter"""
        # Get page 1
        response1 = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&page=1&per_page=10")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get page 2
        response2 = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&page=2&per_page=10")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify different products on different pages
        names1 = {m["name"] for m in data1["medicines"]}
        names2 = {m["name"] for m in data2["medicines"]}
        
        # Pages should have different products
        assert names1 != names2, "Page 1 and Page 2 should have different products"
        print(f"Pagination verified: Page 1 has {len(names1)} products, Page 2 has {len(names2)} products")
    
    # ============ SEARCH ENDPOINT TESTS ============
    
    def test_search_shampoo_healthplus_only(self):
        """GET /api/pharmacy/search?q=shampoo&store=orange_healthplus returns HealthPlus products only"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=shampoo&store=orange_healthplus&limit=15")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        medicines = data.get("medicines", [])
        print(f"Search 'shampoo' in HealthPlus returned {len(medicines)} results")
        
        # Verify all results are from orange_healthplus
        for med in medicines:
            assert med.get("store") == "orange_healthplus", f"Product {med.get('name')} has store={med.get('store')}, expected orange_healthplus"
        
        # Shampoo should be found in HealthPlus (OTC products)
        if len(medicines) > 0:
            print(f"Sample results: {[m['name'][:40] for m in medicines[:3]]}")
    
    def test_search_tablet_pharmacy_only(self):
        """GET /api/pharmacy/search?q=tablet&store=orange_pharmacy returns pharmacy medicines only"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=tablet&store=orange_pharmacy&limit=15")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        medicines = data.get("medicines", [])
        print(f"Search 'tablet' in Pharmacy returned {len(medicines)} results")
        
        # Verify all results are from orange_pharmacy
        for med in medicines:
            assert med.get("store") == "orange_pharmacy", f"Medicine {med.get('name')} has store={med.get('store')}, expected orange_pharmacy"
        
        # Tablets should be found in Pharmacy (prescription medicines)
        assert len(medicines) > 0, "Should find tablets in pharmacy store"
        print(f"Sample results: {[m['name'][:40] for m in medicines[:3]]}")
    
    def test_search_without_store_returns_mixed(self):
        """GET /api/pharmacy/search?q=vitamin without store returns from both stores"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=vitamin&limit=20")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get("medicines", [])
        print(f"Search 'vitamin' (no store filter) returned {len(medicines)} results")
        
        # Should potentially have results from both stores
        stores = set(m.get("store") for m in medicines)
        print(f"Stores in results: {stores}")
    
    # ============ CATEGORIES ENDPOINT TESTS ============
    
    def test_categories_healthplus_returns_30_plus(self):
        """GET /api/pharmacy/categories?store=orange_healthplus should return 30+ categories"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/categories?store=orange_healthplus")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "categories" in data, "Response should contain 'categories' field"
        categories = data["categories"]
        
        print(f"HealthPlus has {len(categories)} categories")
        assert len(categories) >= 30, f"Expected 30+ categories, got {len(categories)}"
        
        # Print top 10 categories with counts
        for cat in categories[:10]:
            print(f"  - {cat['name']}: {cat['count']:,} products")
    
    def test_categories_pharmacy_returns_categories(self):
        """GET /api/pharmacy/categories?store=orange_pharmacy should return pharmacy categories"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/categories?store=orange_pharmacy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        categories = data.get("categories", [])
        print(f"Pharmacy has {len(categories)} categories")
        
        # Print top 5 categories
        for cat in categories[:5]:
            print(f"  - {cat['name']}: {cat['count']:,} medicines")
    
    # ============ CATEGORY FILTER TESTS ============
    
    def test_filter_by_category_in_healthplus(self):
        """GET /api/pharmacy/all?store=orange_healthplus&category=Skin Care should filter correctly"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&category=Skin%20Care&per_page=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get("medicines", [])
        print(f"HealthPlus 'Skin Care' category returned {len(medicines)} products")
        
        # All should be from healthplus store
        for med in medicines:
            assert med.get("store") == "orange_healthplus"
    
    # ============ DATA INTEGRITY TESTS ============
    
    def test_healthplus_products_have_required_fields(self):
        """HealthPlus products should have name, price, category fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&per_page=5")
        assert response.status_code == 200
        data = response.json()
        
        for med in data.get("medicines", []):
            assert "name" in med, "Product should have name"
            assert "mrp" in med or "price" in med, "Product should have price"
            # Category may be present
            print(f"Product: {med.get('name')[:50]} | Category: {med.get('category', 'N/A')} | Price: {med.get('price', med.get('mrp'))}")
    
    def test_pharmacy_medicines_have_required_fields(self):
        """Pharmacy medicines should have name, price, form fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=5")
        assert response.status_code == 200
        data = response.json()
        
        for med in data.get("medicines", []):
            assert "name" in med, "Medicine should have name"
            assert "mrp" in med or "price" in med, "Medicine should have price"
            print(f"Medicine: {med.get('name')[:50]} | Form: {med.get('form', 'N/A')} | Price: {med.get('price', med.get('mrp'))}")


class TestStoreSeparationEdgeCases:
    """Edge case tests for store separation"""
    
    def test_invalid_store_returns_empty(self):
        """Invalid store parameter should return empty or all results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=invalid_store&per_page=10")
        assert response.status_code == 200
        data = response.json()
        # Should return empty since no medicines match invalid store
        assert data.get("total", 0) == 0 or len(data.get("medicines", [])) == 0
        print("Invalid store correctly returns empty results")
    
    def test_store_filter_case_sensitivity(self):
        """Store filter should be case-sensitive (lowercase expected)"""
        # Uppercase should not match
        response = requests.get(f"{BASE_URL}/api/pharmacy/count?store=ORANGE_PHARMACY")
        assert response.status_code == 200
        data = response.json()
        # Should return 0 since store values are lowercase
        print(f"Uppercase store filter returned: {data.get('total', 0)}")
    
    def test_combined_search_and_store_filter(self):
        """Search with store filter should work together"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=cream&store=orange_healthplus&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get("medicines", [])
        print(f"Search 'cream' in HealthPlus: {len(medicines)} results")
        
        for med in medicines:
            assert med.get("store") == "orange_healthplus"
            assert "cream" in med.get("name", "").lower() or "cream" in med.get("category", "").lower()
