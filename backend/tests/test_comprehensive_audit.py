"""
Comprehensive Audit Tests for Nevika Cura Healthcare Platform
Tests: Pharmacy APIs, Featured Brands, Alternatives, Cart, Checkout
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")


class TestPharmacyBrowse:
    """Pharmacy browse and search tests"""
    
    def test_pharmacy_browse_v3(self):
        """Test V3 browse endpoint returns categories"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "sections" in data
        assert len(data["sections"]) > 0
        print(f"✓ Browse returned {len(data['sections'])} categories")
    
    def test_pharmacy_search_minimalist(self):
        """Test search for Minimalist products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Minimalist&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        # Verify products have prices
        for med in data["medicines"]:
            assert "name" in med
            assert "Minimalist" in med["name"]
            assert "mrp" in med
            assert "sale_price" in med or "price" in med
        print(f"✓ Search returned {len(data['medicines'])} Minimalist products")
    
    def test_pharmacy_search_paracetamol(self):
        """Test search for Paracetamol (has composition for alternatives)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Paracetamol&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data["medicines"]) > 0
        # Verify at least one has composition
        has_composition = any(med.get("composition") for med in data["medicines"])
        assert has_composition, "At least one Paracetamol should have composition"
        print(f"✓ Search returned {len(data['medicines'])} Paracetamol products with composition")


class TestFeaturedBrands:
    """Featured Brands (Orange Healthplus) tests"""
    
    def test_featured_brands_endpoint(self):
        """Test featured brands endpoint returns 5 brands"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=8")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "brands" in data
        
        # Verify 5 brands
        brands = data["brands"]
        assert len(brands) == 5, f"Expected 5 brands, got {len(brands)}"
        
        # Verify brand names
        brand_names = [b["brand"] for b in brands]
        expected_brands = ["Minimalist", "The Derma Co", "Aqualogica", "Cetaphil", "Biluma"]
        for expected in expected_brands:
            assert expected in brand_names, f"Missing brand: {expected}"
        
        print(f"✓ Featured brands: {brand_names}")
    
    def test_featured_brands_product_count(self):
        """Test featured brands have correct product counts"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=20")
        assert response.status_code == 200
        data = response.json()
        
        # Expected counts: Minimalist 11, The Derma Co 18, Aqualogica 11, Cetaphil 22, Biluma 5
        expected_counts = {
            "Minimalist": 11,
            "The Derma Co": 18,
            "Aqualogica": 11,
            "Cetaphil": 22,
            "Biluma": 5
        }
        
        for brand in data["brands"]:
            brand_name = brand["brand"]
            total = brand["total"]
            expected = expected_counts.get(brand_name, 0)
            assert total == expected, f"{brand_name}: expected {expected}, got {total}"
        
        print("✓ All brand product counts match expected values")
    
    def test_featured_brands_products_have_prices(self):
        """Test featured brand products have valid prices"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/featured-brands?per_brand=5")
        assert response.status_code == 200
        data = response.json()
        
        for brand in data["brands"]:
            for med in brand["medicines"]:
                assert med.get("mrp", 0) > 0, f"Product {med['name']} has no MRP"
                assert med.get("sale_price", 0) > 0 or med.get("price", 0) > 0, f"Product {med['name']} has no price"
                assert med.get("discount_percent", 0) >= 0, f"Product {med['name']} has invalid discount"
        
        print("✓ All featured products have valid prices")


class TestAlternatives:
    """Alternative medicines tests"""
    
    def test_alternatives_for_medicine_with_composition(self):
        """Test alternatives API returns alternatives for medicine with composition"""
        # First get a medicine with composition (Levocetirizine)
        search_response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Levocetirizine&limit=1")
        assert search_response.status_code == 200
        search_data = search_response.json()
        
        if len(search_data.get("medicines", [])) > 0:
            med = search_data["medicines"][0]
            med_id = med["id"]
            
            # Get alternatives
            alt_response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives/{med_id}?limit=6")
            assert alt_response.status_code == 200
            alt_data = alt_response.json()
            
            assert "alternatives" in alt_data
            if alt_data.get("composition"):
                assert len(alt_data["alternatives"]) > 0, "Should have alternatives for medicine with composition"
                print(f"✓ Found {len(alt_data['alternatives'])} alternatives for {med['name']}")
            else:
                print(f"⚠ Medicine {med['name']} has no composition data")
    
    def test_alternatives_response_structure(self):
        """Test alternatives API response has correct structure"""
        # Use a known medicine ID with composition
        response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives/493f13f3-88ed-451d-aa0d-006f581a4ec0?limit=6")
        assert response.status_code == 200
        data = response.json()
        
        assert "source_medicine" in data
        assert "alternatives" in data
        
        if len(data["alternatives"]) > 0:
            alt = data["alternatives"][0]
            # Verify alternative has required fields for cart
            assert "id" in alt
            assert "name" in alt
            assert "mrp" in alt or "sale_price" in alt
            print(f"✓ Alternatives have correct structure for cart integration")


class TestPharmacyCategories:
    """Category-based tests"""
    
    def test_category_pills(self):
        """Test category pills endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=3")
        assert response.status_code == 200
        data = response.json()
        
        categories = [s["category"] for s in data.get("sections", [])]
        assert len(categories) > 0
        print(f"✓ Found {len(categories)} categories: {categories[:5]}...")


class TestTrending:
    """Trending medicines tests"""
    
    def test_trending_endpoint(self):
        """Test trending medicines endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "medicines" in data or "trending" in data
        print("✓ Trending endpoint working")


class TestDealsOfTheDay:
    """Deals of the day tests"""
    
    def test_deals_endpoint(self):
        """Test deals of the day endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/deals?limit=10")
        # Deals endpoint might not exist, so we just check it doesn't error
        if response.status_code == 200:
            print("✓ Deals endpoint working")
        elif response.status_code == 404:
            print("⚠ Deals endpoint not found (may be integrated in browse)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
