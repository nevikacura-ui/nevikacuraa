"""
Test suite for iteration 283 improvements:
1. Alternative medicine cards with gradient 'Add to Cart' button
2. How to Book/Order buttons across DiaGyn/Mango/Orange pages
3. Faster pharmacy scroll and search (40 products per page, 200ms debounce, 15 search results)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPharmacyPerformanceImprovements:
    """Tests for faster pharmacy browsing - 40 products per page, 15 search results"""
    
    def test_pharmacy_returns_40_products_per_page(self):
        """Verify pharmacy API returns 40 products per page for faster browsing"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=40")
        assert response.status_code == 200
        data = response.json()
        assert 'medicines' in data
        assert len(data['medicines']) == 40, f"Expected 40 medicines, got {len(data['medicines'])}"
    
    def test_pharmacy_search_returns_15_results(self):
        """Verify pharmacy search returns max 15 results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=paracetamol&limit=15&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert 'medicines' in data
        assert len(data['medicines']) <= 15, f"Expected max 15 results, got {len(data['medicines'])}"
    
    def test_pharmacy_search_with_different_queries(self):
        """Test search with various queries returns results"""
        queries = ['tablet', 'capsule', 'syrup']
        for query in queries:
            response = requests.get(f"{BASE_URL}/api/pharmacy/search?q={query}&limit=15&store=orange_pharmacy")
            assert response.status_code == 200
            data = response.json()
            assert 'medicines' in data
            assert len(data['medicines']) > 0, f"No results for query '{query}'"


class TestAlternativeMedicinesAPI:
    """Tests for alternative medicines API used by product detail view"""
    
    def test_alternatives_api_returns_data(self):
        """Verify alternatives API returns alternative medicines"""
        # First get a medicine ID
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=1")
        assert response.status_code == 200
        medicines = response.json().get('medicines', [])
        assert len(medicines) > 0, "No medicines found"
        
        medicine_id = medicines[0]['id']
        
        # Get alternatives
        alt_response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives/{medicine_id}?limit=15")
        assert alt_response.status_code == 200
        alt_data = alt_response.json()
        assert 'alternatives' in alt_data
    
    def test_alternatives_include_savings_data(self):
        """Verify alternatives include savings information for 'Save ₹X' badge"""
        # Get a starred medicine (more likely to have alternatives)
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=5")
        assert response.status_code == 200
        medicines = response.json().get('medicines', [])
        
        # Find a starred medicine
        starred = [m for m in medicines if m.get('is_starred')]
        if not starred:
            starred = medicines  # Use any medicine if no starred found
        
        medicine_id = starred[0]['id']
        
        # Get alternatives
        alt_response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives/{medicine_id}?limit=15")
        assert alt_response.status_code == 200
        alt_data = alt_response.json()
        
        alternatives = alt_data.get('alternatives', [])
        if len(alternatives) > 0:
            # Check that alternatives have savings fields
            first_alt = alternatives[0]
            assert 'savings' in first_alt or 'savings_pct' in first_alt or 'mrp' in first_alt, \
                "Alternative should have savings or price data"
    
    def test_alternatives_limit_parameter(self):
        """Verify alternatives API respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=1")
        medicines = response.json().get('medicines', [])
        medicine_id = medicines[0]['id']
        
        # Request with limit=5
        alt_response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives/{medicine_id}?limit=5")
        assert alt_response.status_code == 200
        alternatives = alt_response.json().get('alternatives', [])
        assert len(alternatives) <= 5, f"Expected max 5 alternatives, got {len(alternatives)}"


class TestZeroPriceProducts:
    """Tests for 'Call to confirm' display on zero-price products"""
    
    def test_pharmacy_products_have_price_fields(self):
        """Verify products have price fields for 'Call to confirm' logic"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=20")
        assert response.status_code == 200
        medicines = response.json().get('medicines', [])
        
        for med in medicines:
            # Products should have price-related fields
            assert 'mrp' in med or 'price' in med or 'sale_price' in med, \
                f"Product {med.get('name')} missing price fields"
    
    def test_nutricare_products_have_price_fields(self):
        """Verify nutricare products have price fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_healthplus&per_page=20")
        assert response.status_code == 200
        products = response.json().get('medicines', [])
        
        for prod in products:
            assert 'mrp' in prod or 'price' in prod or 'sale_price' in prod, \
                f"Product {prod.get('name')} missing price fields"


class TestStarredMedicines:
    """Tests for starred/Top Brand medicines appearing first"""
    
    def test_starred_medicines_appear_first(self):
        """Verify starred medicines appear at the top of results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=20")
        assert response.status_code == 200
        medicines = response.json().get('medicines', [])
        
        # Check that first few medicines are starred
        starred_count = sum(1 for m in medicines[:10] if m.get('is_starred'))
        assert starred_count > 0, "Expected starred medicines at the top"
    
    def test_starred_medicines_have_required_fields(self):
        """Verify starred medicines have all required display fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=10")
        assert response.status_code == 200
        medicines = response.json().get('medicines', [])
        
        starred = [m for m in medicines if m.get('is_starred')]
        for med in starred:
            assert 'name' in med
            assert 'manufacturer' in med or 'company' in med
            # Starred medicines should have images
            assert med.get('image_url') or med.get('images'), \
                f"Starred medicine {med.get('name')} should have image"


class TestAPIEndpointsHealth:
    """Basic health checks for all relevant API endpoints"""
    
    def test_pharmacy_all_endpoint(self):
        """Test /api/pharmacy/all endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?store=orange_pharmacy&per_page=10")
        assert response.status_code == 200
    
    def test_pharmacy_search_endpoint(self):
        """Test /api/pharmacy/search endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=test&limit=5")
        assert response.status_code == 200
    
    def test_pharmacy_count_endpoint(self):
        """Test /api/pharmacy/count endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count?store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert 'total' in data
        assert data['total'] > 0
    
    def test_pharmacy_categories_endpoint(self):
        """Test /api/pharmacy/categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/categories?store=orange_healthplus")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
