"""
Test Post-Audit Improvements for Nevika Cura
- Coupon system removed (no ORANGE15, MANGO10)
- 15% discount baked into sale_price in DB
- Request Price for MRP=0 products
- Three tabs: All Drugs, Healthplus, Select
- Featured Brands with colored placeholders
- Quick Add in search results
- Lazy loading categories
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestPharmacyBrowseAPI:
    """Test pharmacy browse V3 API with section parameter"""
    
    def test_browse_orange_pharmacy_section(self):
        """All Drugs tab should return orange_pharmacy products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=3&section=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        assert 'sections' in data
        assert len(data['sections']) > 0
        # Verify products have store=orange_pharmacy
        for section in data['sections'][:2]:
            for med in section.get('medicines', [])[:2]:
                assert med.get('store') == 'orange_pharmacy', f"Expected orange_pharmacy, got {med.get('store')}"
        print(f"PASS: Browse orange_pharmacy returns {len(data['sections'])} categories")
    
    def test_browse_orange_healthplus_section(self):
        """Healthplus tab should return orange_healthplus products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=3&section=orange_healthplus")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        assert 'sections' in data
        print(f"PASS: Browse orange_healthplus returns {len(data['sections'])} categories")


class TestDiscountPricing:
    """Test that 15% discount is baked into sale_price"""
    
    def test_products_have_15_percent_discount(self):
        """Products with MRP should have sale_price = MRP * 0.85"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=paracetamol&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        products_with_discount = 0
        for med in data.get('medicines', []):
            mrp = med.get('mrp', 0)
            sale_price = med.get('sale_price') or med.get('price', 0)
            if mrp > 0 and sale_price > 0:
                expected_sale = round(mrp * 0.85, 2)
                # Allow small rounding difference
                assert abs(sale_price - expected_sale) < 1, f"Expected ~{expected_sale}, got {sale_price}"
                products_with_discount += 1
        
        assert products_with_discount > 0, "No products with discount found"
        print(f"PASS: {products_with_discount} products have correct 15% discount")
    
    def test_discount_percent_field(self):
        """Products should have discount_percent=15"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=5&section=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        
        products_with_15_percent = 0
        for section in data.get('sections', []):
            for med in section.get('medicines', []):
                if med.get('mrp', 0) > 0:
                    assert med.get('discount_percent') == 15, f"Expected 15%, got {med.get('discount_percent')}"
                    products_with_15_percent += 1
        
        print(f"PASS: {products_with_15_percent} products have discount_percent=15")


class TestRequestPriceProducts:
    """Test products with MRP=0 (Request Price)"""
    
    def test_mrp_zero_products_exist(self):
        """Some products should have MRP=0 for Request Price feature"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=10&section=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        
        mrp_zero_count = 0
        for section in data.get('sections', []):
            for med in section.get('medicines', []):
                if med.get('mrp', 0) == 0:
                    mrp_zero_count += 1
        
        print(f"INFO: Found {mrp_zero_count} products with MRP=0 (Request Price)")
        # This is informational - some products may have MRP=0


class TestFeaturedBrands:
    """Test Featured Brands endpoint for Healthplus tab"""
    
    def test_featured_brands_endpoint(self):
        """Featured brands should return 5 brands with products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=8")
        assert response.status_code == 200
        data = response.json()
        
        assert 'brands' in data
        brands = data['brands']
        assert len(brands) >= 3, f"Expected at least 3 brands, got {len(brands)}"
        
        brand_names = [b['brand'] for b in brands]
        print(f"PASS: Featured brands: {brand_names}")
        
        # Check each brand has products
        for brand in brands:
            assert 'medicines' in brand
            assert len(brand['medicines']) > 0, f"Brand {brand['brand']} has no products"
    
    def test_featured_brands_have_prices(self):
        """Featured brand products should have valid prices"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=5")
        assert response.status_code == 200
        data = response.json()
        
        products_with_price = 0
        for brand in data.get('brands', []):
            for med in brand.get('medicines', []):
                if med.get('mrp', 0) > 0 and med.get('sale_price', 0) > 0:
                    products_with_price += 1
        
        assert products_with_price > 0, "No featured products with prices"
        print(f"PASS: {products_with_price} featured products have valid prices")


class TestSearchWithQuickAdd:
    """Test search API returns products for Quick Add"""
    
    def test_search_returns_products(self):
        """Search should return products with prices for Quick Add"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=vitamin&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert 'medicines' in data
        assert len(data['medicines']) > 0, "No search results"
        
        # Check products have required fields for Quick Add
        for med in data['medicines'][:5]:
            assert 'name' in med
            assert 'id' in med
            # Price fields for display
            assert 'mrp' in med or 'price' in med or 'sale_price' in med
        
        print(f"PASS: Search returns {len(data['medicines'])} products for Quick Add")


class TestLazyLoadingCategories:
    """Test category lazy loading (first 5, then more)"""
    
    def test_browse_returns_multiple_categories(self):
        """Browse should return multiple categories for lazy loading"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=3&section=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        
        sections = data.get('sections', [])
        assert len(sections) >= 5, f"Expected at least 5 categories, got {len(sections)}"
        
        # Check each section has category name and medicines
        for section in sections[:5]:
            assert 'category' in section
            assert 'medicines' in section
            assert 'total' in section
            assert 'has_more' in section
        
        print(f"PASS: Browse returns {len(sections)} categories for lazy loading")
    
    def test_category_endpoint_for_view_more(self):
        """Category endpoint should work for View More functionality"""
        # First get a category name
        browse_response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=1&section=orange_pharmacy")
        assert browse_response.status_code == 200
        browse_data = browse_response.json()
        
        if browse_data.get('sections'):
            category_name = browse_data['sections'][0]['category']
            
            # Now fetch that category
            cat_response = requests.get(f"{BASE_URL}/api/pharmacy/v3/category/{category_name}?page=1&limit=10&section=orange_pharmacy")
            assert cat_response.status_code == 200
            cat_data = cat_response.json()
            
            assert 'medicines' in cat_data
            assert 'total' in cat_data
            print(f"PASS: Category '{category_name}' returns {len(cat_data['medicines'])} products")


class TestNoCoupons:
    """Verify coupon system is removed"""
    
    def test_discount_utils_no_coupons(self):
        """Discount calculation should not include coupons"""
        # This is a code review check - the discountUtils.js should not have coupon logic
        # We verify by checking the API doesn't return coupon-related fields
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=1&section=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        
        # Check no coupon fields in response
        for section in data.get('sections', []):
            for med in section.get('medicines', []):
                assert 'coupon' not in med, "Coupon field found in product"
                assert 'coupon_code' not in med, "Coupon code field found in product"
        
        print("PASS: No coupon fields in API response")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """API should be healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'ok'
        print("PASS: API health check")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
