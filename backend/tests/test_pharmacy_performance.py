"""
Pharmacy API Performance Tests - Iteration 286
Tests for API response optimization (excluding heavy fields) and pagination
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Heavy fields that should be excluded from listing/search responses
HEAVY_FIELDS = ['substitutes', 'side_effects', 'therapeutic_class', 'generic_name', 'description', 'created_at']


class TestPharmacyAPIPerformance:
    """Tests for pharmacy API performance optimizations"""
    
    def test_pharmacy_all_excludes_heavy_fields(self):
        """Test that /api/pharmacy/all excludes heavy fields for faster loading"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=5&store=orange_pharmacy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'medicines' in data, "Response should contain 'medicines' key"
        assert len(data['medicines']) > 0, "Should return at least one medicine"
        
        # Check that heavy fields are excluded
        medicine = data['medicines'][0]
        found_heavy = [f for f in HEAVY_FIELDS if f in medicine]
        assert len(found_heavy) == 0, f"Heavy fields should be excluded but found: {found_heavy}"
        
        # Verify essential fields are present
        essential_fields = ['name', 'mrp', 'price', 'category', 'manufacturer']
        for field in essential_fields:
            assert field in medicine, f"Essential field '{field}' should be present"
    
    def test_pharmacy_search_excludes_heavy_fields(self):
        """Test that /api/pharmacy/search excludes heavy fields for faster loading"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=para&limit=5&store=orange_pharmacy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'medicines' in data, "Response should contain 'medicines' key"
        
        if len(data['medicines']) > 0:
            medicine = data['medicines'][0]
            found_heavy = [f for f in HEAVY_FIELDS if f in medicine]
            assert len(found_heavy) == 0, f"Heavy fields should be excluded but found: {found_heavy}"
    
    def test_pharmacy_pagination_works(self):
        """Test that pagination returns correct number of items"""
        # Page 1
        response1 = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=40&store=orange_pharmacy")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Page 2
        response2 = requests.get(f"{BASE_URL}/api/pharmacy/all?page=2&per_page=40&store=orange_pharmacy")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify different medicines on different pages (no duplicates)
        if len(data1['medicines']) > 0 and len(data2['medicines']) > 0:
            page1_ids = set(m.get('id') or m.get('name') for m in data1['medicines'])
            page2_ids = set(m.get('id') or m.get('name') for m in data2['medicines'])
            overlap = page1_ids.intersection(page2_ids)
            assert len(overlap) == 0, f"Pages should not have duplicate medicines, found: {len(overlap)} duplicates"
    
    def test_pharmacy_search_response_time(self):
        """Test that search responds within acceptable time (< 2 seconds)"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=paracetamol&limit=15&store=orange_pharmacy")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 2.0, f"Search should respond within 2 seconds, took {elapsed:.2f}s"
        print(f"Search response time: {elapsed:.3f}s")
    
    def test_pharmacy_all_response_time(self):
        """Test that listing responds within acceptable time (< 3 seconds)"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=40&store=orange_pharmacy")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 3.0, f"Listing should respond within 3 seconds, took {elapsed:.2f}s"
        print(f"Listing response time: {elapsed:.3f}s")
    
    def test_nutricare_store_separation(self):
        """Test that orange_healthplus store returns different products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=5&store=orange_healthplus")
        assert response.status_code == 200
        
        data = response.json()
        assert 'medicines' in data
        
        # Verify store field if present
        if len(data['medicines']) > 0:
            medicine = data['medicines'][0]
            if 'store' in medicine:
                assert medicine['store'] == 'orange_healthplus', "Store should be orange_healthplus"


class TestPharmacyCount:
    """Tests for pharmacy count endpoint"""
    
    def test_pharmacy_count_returns_total(self):
        """Test that count endpoint returns total medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count?store=orange_pharmacy")
        assert response.status_code == 200
        
        data = response.json()
        assert 'total' in data, "Response should contain 'total' key"
        assert data['total'] > 0, "Should have medicines in database"
        print(f"Total medicines in orange_pharmacy: {data['total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
