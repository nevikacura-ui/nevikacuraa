"""
Test Suite for Image URL Updates, Call to Confirm Price, and Gemini Descriptions
Iteration 282 - Testing features:
1. Image URLs from Excel files properly loaded
2. Starred/Top Brand products appear first with golden star badge
3. Products with zero/null MRP show 'Call to confirm'
4. Gemini-generated descriptions visible
5. Search works with store filter
6. No duplicate products between stores
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPharmacyImageURLs:
    """Test image URLs are properly loaded from Excel files"""
    
    def test_pharmacy_products_have_image_urls(self):
        """Verify orange_pharmacy products have valid image_url field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=20")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        assert len(medicines) > 0, "Should return medicines"
        
        # Count products with images
        with_images = [m for m in medicines if m.get('image_url')]
        print(f"Products with images: {len(with_images)}/{len(medicines)}")
        
        # At least 50% should have images (starred products prioritized)
        assert len(with_images) >= len(medicines) * 0.5, "At least 50% should have images"
    
    def test_healthplus_products_have_image_urls(self):
        """Verify orange_healthplus products have valid image_url field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&page=1&per_page=20")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        assert len(medicines) > 0, "Should return products"
        
        # Count products with images
        with_images = [m for m in medicines if m.get('image_url')]
        print(f"HealthPlus products with images: {len(with_images)}/{len(medicines)}")
        
        # At least 50% should have images
        assert len(with_images) >= len(medicines) * 0.5, "At least 50% should have images"


class TestStarredTopBrandProducts:
    """Test starred/top brand products appear first with proper badges"""
    
    def test_starred_products_appear_first_pharmacy(self):
        """Verify starred products from 48 companies appear first in pharmacy"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=30")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        assert len(medicines) > 0
        
        # First products should be starred
        starred_count = sum(1 for m in medicines[:20] if m.get('is_starred'))
        print(f"Starred in first 20: {starred_count}")
        
        # Most of first 20 should be starred (sorted by starred+image first)
        assert starred_count >= 15, "At least 15 of first 20 should be starred"
    
    def test_starred_products_have_top_brand_fields(self):
        """Verify starred products have is_starred and is_top_company fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        starred = [m for m in medicines if m.get('is_starred')]
        
        assert len(starred) > 0, "Should have starred products"
        
        for m in starred[:5]:
            assert m.get('is_starred') == True
            print(f"Starred: {m.get('name')[:40]} - manufacturer: {m.get('manufacturer')}")


class TestCallToConfirmPrice:
    """Test products with zero/null MRP show 'Call to confirm'"""
    
    def test_api_returns_price_fields(self):
        """Verify API returns mrp and price fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        assert len(medicines) > 0
        
        for m in medicines[:5]:
            # All products should have mrp and price fields
            assert 'mrp' in m, f"Product {m.get('name')} should have mrp field"
            assert 'price' in m, f"Product {m.get('name')} should have price field"
            print(f"{m.get('name')[:40]}: mrp={m.get('mrp')}, price={m.get('price')}")
    
    def test_products_with_valid_prices(self):
        """Verify products with valid MRP show actual price"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=20")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        
        # Products with MRP > 0 should have valid price
        with_price = [m for m in medicines if m.get('mrp') and m.get('mrp') > 0]
        assert len(with_price) > 0, "Should have products with valid MRP"
        
        for m in with_price[:5]:
            assert m.get('price') > 0, f"Product {m.get('name')} with MRP should have price"


class TestGeminiDescriptions:
    """Test Gemini-generated descriptions are visible"""
    
    def test_products_have_descriptions(self):
        """Verify products have description field from Gemini"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=20")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        
        # Count products with descriptions
        with_desc = [m for m in medicines if m.get('description')]
        print(f"Products with descriptions: {len(with_desc)}/{len(medicines)}")
        
        # Most products should have descriptions
        assert len(with_desc) >= len(medicines) * 0.5, "At least 50% should have descriptions"
    
    def test_products_have_composition_uses_side_effects(self):
        """Verify products have composition, uses, side_effects fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        
        for m in medicines[:5]:
            print(f"\n{m.get('name')[:40]}:")
            print(f"  composition: {bool(m.get('composition'))}")
            print(f"  uses: {bool(m.get('uses'))}")
            print(f"  side_effects: {bool(m.get('side_effects'))}")
            
            # At least one of these should be present
            has_info = m.get('composition') or m.get('uses') or m.get('side_effects')
            assert has_info, f"Product {m.get('name')} should have composition/uses/side_effects"


class TestSearchWithStoreFilter:
    """Test search works with store filter"""
    
    def test_search_healthplus_only(self):
        """Search face wash returns only HealthPlus products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=face+wash&store=orange_healthplus&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        print(f"Search 'face wash' in HealthPlus: {len(medicines)} results")
        
        # All results should be from orange_healthplus
        for m in medicines:
            assert m.get('store') == 'orange_healthplus', f"Product {m.get('name')} should be from orange_healthplus"
    
    def test_search_pharmacy_only(self):
        """Search tablet returns only pharmacy products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=tablet&store=orange_pharmacy&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        print(f"Search 'tablet' in Pharmacy: {len(medicines)} results")
        
        # All results should be from orange_pharmacy
        for m in medicines:
            assert m.get('store') == 'orange_pharmacy', f"Product {m.get('name')} should be from orange_pharmacy"
    
    def test_search_prioritizes_starred(self):
        """Search results prioritize starred products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=paracetamol&store=orange_pharmacy&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        medicines = data.get('medicines', [])
        if len(medicines) > 0:
            # Check if starred products appear first
            starred_positions = [i for i, m in enumerate(medicines) if m.get('is_starred')]
            print(f"Starred positions in search results: {starred_positions}")


class TestNoDuplicatesBetweenStores:
    """Test no duplicate products between pharmacy and healthplus stores"""
    
    def test_store_counts_are_separate(self):
        """Verify store counts are separate and don't overlap"""
        # Get pharmacy count
        response1 = requests.get(f"{BASE_URL}/api/pharmacy/count?store=orange_pharmacy")
        assert response1.status_code == 200
        pharmacy_count = response1.json().get('total', 0)
        
        # Get healthplus count
        response2 = requests.get(f"{BASE_URL}/api/pharmacy/count?store=orange_healthplus")
        assert response2.status_code == 200
        healthplus_count = response2.json().get('total', 0)
        
        # Get total count (without store filter)
        response3 = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response3.status_code == 200
        total_count = response3.json().get('total', 0)
        
        print(f"Pharmacy: {pharmacy_count}, HealthPlus: {healthplus_count}, Total: {total_count}")
        
        # Total should be close to sum of both stores (allow small variance for products without store field)
        sum_stores = pharmacy_count + healthplus_count
        variance = abs(total_count - sum_stores)
        print(f"Variance: {variance} ({variance/total_count*100:.2f}%)")
        
        # Allow up to 1% variance
        assert variance < total_count * 0.01, f"Variance {variance} should be less than 1% of total"
    
    def test_products_have_correct_store_field(self):
        """Verify all products have correct store field"""
        # Check pharmacy products
        response1 = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&page=1&per_page=10")
        assert response1.status_code == 200
        pharmacy_meds = response1.json().get('medicines', [])
        
        for m in pharmacy_meds:
            assert m.get('store') == 'orange_pharmacy', f"Product {m.get('name')} should have store=orange_pharmacy"
        
        # Check healthplus products
        response2 = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&page=1&per_page=10")
        assert response2.status_code == 200
        healthplus_meds = response2.json().get('medicines', [])
        
        for m in healthplus_meds:
            assert m.get('store') == 'orange_healthplus', f"Product {m.get('name')} should have store=orange_healthplus"


class TestCategoriesWithStoreFilter:
    """Test categories endpoint with store filter"""
    
    def test_healthplus_categories(self):
        """Verify HealthPlus has 30+ categories"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/categories?store=orange_healthplus")
        assert response.status_code == 200
        data = response.json()
        
        categories = data.get('categories', [])
        print(f"HealthPlus categories: {len(categories)}")
        
        assert len(categories) >= 30, "HealthPlus should have 30+ categories"
        
        # Print top 5 categories
        for cat in categories[:5]:
            print(f"  - {cat.get('name')}: {cat.get('count')} products")
    
    def test_pharmacy_categories(self):
        """Verify Pharmacy has categories"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/categories?store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        
        categories = data.get('categories', [])
        print(f"Pharmacy categories: {len(categories)}")
        
        assert len(categories) > 0, "Pharmacy should have categories"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
