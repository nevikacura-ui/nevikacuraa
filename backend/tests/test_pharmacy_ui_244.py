"""
Test Suite for Pharmacy UI Iteration 244
- Orange Pharmacy light theme
- Medicine cards with composition, uses, side_effects
- Mango Labs colorful pills and test cards
- IntroScreen 2x2 grid layout
- DiaGyn Staff Portal light pastel theme
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestPharmacyAPI:
    """Test pharmacy API returns AI-enriched fields"""
    
    def test_pharmacy_all_returns_medicines_with_enriched_fields(self):
        """GET /api/pharmacy/all should return medicines with composition, uses, side_effects"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        
        # Check first medicine has enriched fields
        medicine = data["medicines"][0]
        assert "id" in medicine
        assert "name" in medicine
        assert "price" in medicine
        
        # AI-enriched fields should be present
        assert "composition" in medicine, "composition field missing"
        assert "uses" in medicine, "uses field missing"
        assert "side_effects" in medicine, "side_effects field missing"
        
    def test_pharmacy_search_returns_results(self):
        """GET /api/pharmacy/search?q=para should return search results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=para&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "medicines" in data
        # Search for "para" should return at least one result (paracetamol variants)
        assert len(data["medicines"]) >= 1
        
        # Check enriched fields on search results
        if len(data["medicines"]) > 0:
            med = data["medicines"][0]
            assert "composition" in med
            assert "uses" in med
            assert "side_effects" in med
    
    def test_pharmacy_count(self):
        """GET /api/pharmacy/count should return total medicine count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        # Should have 1038+ medicines based on previous tests
        assert data["total"] >= 1000
    
    def test_medicines_have_non_empty_enriched_fields(self):
        """Verify AI-enriched fields are not empty strings"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        
        enriched_count = 0
        for med in data["medicines"]:
            # Check if at least composition is populated
            if med.get("composition") and len(med["composition"]) > 0:
                enriched_count += 1
        
        # At least 50% should have composition populated
        assert enriched_count >= len(data["medicines"]) // 2, f"Only {enriched_count}/{len(data['medicines'])} have composition"
    
    def test_no_out_of_stock_medicines(self):
        """Verify all medicines show as available (no out of stock)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20")
        assert response.status_code == 200
        data = response.json()
        
        for med in data["medicines"]:
            # Check is_active is true
            assert med.get("is_active", True) == True, f"{med['name']} should be active"


class TestMangoLabsAPI:
    """Test Mango Labs test catalog API"""
    
    def test_mango_test_catalog(self):
        """GET /api/mango/test-catalog should return test catalog"""
        response = requests.get(f"{BASE_URL}/api/mango/test-catalog")
        assert response.status_code == 200
        data = response.json()
        
        assert "tests" in data
        # Should have tests in catalog
        if len(data["tests"]) > 0:
            test = data["tests"][0]
            assert "name" in test
            assert "price" in test or test.get("price") == 0


class TestStaffLogin:
    """Test staff portal login endpoints"""
    
    def test_diagyn_staff_login(self):
        """POST /api/staff/login with diagyn_staff credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "diagyn_staff",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "staff" in data or "name" in data
        
    def test_orange_staff_login(self):
        """POST /api/staff/login with orange_staff credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "orange_staff",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
    
    def test_invalid_credentials_rejected(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401


@pytest.fixture(autouse=True)
def setup_base_url():
    """Ensure BASE_URL is set"""
    global BASE_URL
    if not BASE_URL:
        BASE_URL = 'https://premium-rx-portal.preview.emergentagent.com'
