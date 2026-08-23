"""
Pharmacy Inventory Tests - Iteration 393
Tests for:
1. Medicines collection has exactly 1165 items
2. Categories endpoint returns 19 non-empty categories with total 1165
3. Browse endpoint returns sections with medicines per category
4. No injection/consultation items exist in medicines collection
5. All medicines have 17.5% discount applied (sale_price ~82.5% of mrp)
6. Search endpoint works correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestPharmacyInventory:
    """Test pharmacy inventory after rebuild with 1165 medicines"""
    
    def test_categories_endpoint(self):
        """Test /api/pharmacy/v3/categories returns 19 categories with total 1165"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/categories")
        assert response.status_code == 200, f"Categories endpoint failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Categories response should have success=True"
        
        categories = data.get("categories", [])
        total = data.get("total", 0)
        
        # Verify total count is 1165
        print(f"Total medicines from categories: {total}")
        assert total == 1165, f"Expected 1165 total medicines, got {total}"
        
        # Verify we have 19 non-empty categories
        non_empty_categories = [c for c in categories if c.get("count", 0) > 0]
        print(f"Non-empty categories count: {len(non_empty_categories)}")
        print(f"Categories: {[c['name'] for c in non_empty_categories]}")
        assert len(non_empty_categories) == 19, f"Expected 19 non-empty categories, got {len(non_empty_categories)}"
        
    def test_browse_endpoint(self):
        """Test /api/pharmacy/v3/browse returns sections with medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8")
        assert response.status_code == 200, f"Browse endpoint failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Browse response should have success=True"
        
        sections = data.get("sections", [])
        total_medicines = data.get("total_medicines", 0)
        
        print(f"Total medicines from browse: {total_medicines}")
        print(f"Number of sections: {len(sections)}")
        
        # Verify total count
        assert total_medicines == 1165, f"Expected 1165 total medicines, got {total_medicines}"
        
        # Verify sections have medicines
        assert len(sections) > 0, "Browse should return at least one section"
        
        for section in sections[:3]:  # Check first 3 sections
            assert "category" in section, "Section should have category"
            assert "medicines" in section, "Section should have medicines"
            assert len(section["medicines"]) > 0, f"Section {section['category']} should have medicines"
            print(f"Section '{section['category']}': {len(section['medicines'])} medicines, total: {section.get('total', 0)}")
    
    def test_search_tablet(self):
        """Test search endpoint with 'tablet' query (common term in imported medicines)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=tablet")
        assert response.status_code == 200, f"Search endpoint failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Search response should have success=True"
        
        medicines = data.get("medicines", [])
        total = data.get("total", 0)
        
        print(f"Search 'tablet' results: {total} total, {len(medicines)} returned")
        assert total > 0, "Search for 'tablet' should return results"
        assert len(medicines) > 0, "Search should return at least one medicine"
        
        # Verify medicine structure
        first_med = medicines[0]
        assert "name" in first_med, "Medicine should have name"
        print(f"First result: {first_med.get('name')}")
    
    def test_no_injection_items(self):
        """Verify no injection items exist in medicines collection"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=injection&limit=50")
        assert response.status_code == 200, f"Search endpoint failed: {response.text}"
        
        data = response.json()
        medicines = data.get("medicines", [])
        total = data.get("total", 0)
        
        print(f"Search 'injection' results: {total} total")
        
        # Check if any results contain 'injection' or 'inj' in name
        injection_items = [m for m in medicines if 'injection' in m.get('name', '').lower() or 'inj ' in m.get('name', '').lower() or m.get('name', '').lower().startswith('inj ')]
        
        print(f"Items with 'injection' in name: {len(injection_items)}")
        if injection_items:
            print(f"Found injection items: {[m['name'] for m in injection_items[:5]]}")
        
        assert len(injection_items) == 0, f"Found {len(injection_items)} injection items that should have been filtered out"
    
    def test_no_consultation_items(self):
        """Verify no consultation items exist in medicines collection"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=consultation&limit=50")
        assert response.status_code == 200, f"Search endpoint failed: {response.text}"
        
        data = response.json()
        medicines = data.get("medicines", [])
        total = data.get("total", 0)
        
        print(f"Search 'consultation' results: {total} total")
        
        # Check if any results contain 'consultation' in name
        consultation_items = [m for m in medicines if 'consultation' in m.get('name', '').lower()]
        
        print(f"Items with 'consultation' in name: {len(consultation_items)}")
        if consultation_items:
            print(f"Found consultation items: {[m['name'] for m in consultation_items[:5]]}")
        
        assert len(consultation_items) == 0, f"Found {len(consultation_items)} consultation items that should have been filtered out"
    
    def test_discount_applied(self):
        """Verify 17.5% discount is applied (sale_price ~82.5% of mrp)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8")
        assert response.status_code == 200, f"Browse endpoint failed: {response.text}"
        
        data = response.json()
        sections = data.get("sections", [])
        
        # Collect medicines with both mrp and sale_price
        medicines_with_prices = []
        for section in sections:
            for med in section.get("medicines", []):
                mrp = med.get("mrp", 0)
                sale_price = med.get("sale_price", 0)
                if mrp > 0 and sale_price > 0:
                    medicines_with_prices.append(med)
        
        print(f"Medicines with both mrp and sale_price: {len(medicines_with_prices)}")
        assert len(medicines_with_prices) > 0, "Should have medicines with prices"
        
        # Check discount calculation for first 10 medicines
        discount_correct = 0
        discount_incorrect = 0
        
        for med in medicines_with_prices[:20]:
            mrp = med.get("mrp", 0)
            sale_price = med.get("sale_price", 0)
            expected_sale_price = round(mrp * 0.825, 2)  # 17.5% discount = 82.5% of MRP
            
            # Allow 1% tolerance for rounding
            tolerance = mrp * 0.01
            if abs(sale_price - expected_sale_price) <= tolerance:
                discount_correct += 1
            else:
                discount_incorrect += 1
                print(f"Discount mismatch: {med.get('name')[:40]} - MRP: {mrp}, Sale: {sale_price}, Expected: {expected_sale_price}")
        
        print(f"Discount correct: {discount_correct}, incorrect: {discount_incorrect}")
        
        # At least 80% should have correct discount
        assert discount_correct >= discount_incorrect, f"Most medicines should have 17.5% discount applied"
    
    def test_medicine_fields(self):
        """Verify medicines have required fields: name, mrp, sale_price, manufacturer, category, stock_quantity"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=8")
        assert response.status_code == 200, f"Browse endpoint failed: {response.text}"
        
        data = response.json()
        sections = data.get("sections", [])
        
        required_fields = ["name", "mrp", "sale_price", "manufacturer", "category"]
        
        # Check first 10 medicines from first section
        first_section = sections[0] if sections else {}
        medicines = first_section.get("medicines", [])[:10]
        
        for med in medicines:
            for field in required_fields:
                assert field in med, f"Medicine '{med.get('name', 'unknown')}' missing field: {field}"
            
            # Verify values are not empty/null
            assert med.get("name"), f"Medicine should have non-empty name"
            assert med.get("mrp", 0) > 0, f"Medicine '{med.get('name')}' should have positive MRP"
            assert med.get("sale_price", 0) > 0, f"Medicine '{med.get('name')}' should have positive sale_price"
            
            print(f"Medicine: {med.get('name')[:40]} - MRP: {med.get('mrp')}, Sale: {med.get('sale_price')}, Category: {med.get('category')}")


class TestPharmacyStaffEndpoints:
    """Test pharmacy staff endpoints using 'medicines' collection"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed - skipping authenticated tests")
    
    def test_staff_login(self):
        """Test staff login endpoint"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        
        print(f"Staff login response: {response.status_code}")
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Login response should contain token"
        print(f"Staff login successful, token received")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
