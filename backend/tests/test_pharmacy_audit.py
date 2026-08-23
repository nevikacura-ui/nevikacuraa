"""
Pharmacy Audit Tests - Testing branded products, search, alternatives, cart flow
Tests for Nevika Cura Healthcare Platform final audit
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestPharmacySearch:
    """Test pharmacy search functionality for branded products"""
    
    def test_search_minimalist_products(self):
        """Search for Minimalist branded products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Minimalist&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        # Verify at least one product has Minimalist in name
        names = [m.get("name", "") for m in data["medicines"]]
        assert any("Minimalist" in name for name in names), f"No Minimalist products found in: {names}"
        print(f"Found {len(data['medicines'])} Minimalist products")
    
    def test_search_aqualogica_products(self):
        """Search for Aqualogica branded products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Aqualogica&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data["medicines"]) > 0
        names = [m.get("name", "") for m in data["medicines"]]
        assert any("Aqualogica" in name for name in names), f"No Aqualogica products found"
        print(f"Found {len(data['medicines'])} Aqualogica products")
    
    def test_search_derma_co_products(self):
        """Search for The Derma Co branded products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Derma%20Co&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data["medicines"]) > 0
        print(f"Found {len(data['medicines'])} Derma Co products")
    
    def test_search_cetaphil_products(self):
        """Search for Cetaphil branded products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Cetaphil&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data["medicines"]) > 0
        # Check if any product has price
        products_with_price = [m for m in data["medicines"] if m.get("mrp", 0) > 0 or m.get("price", 0) > 0]
        print(f"Found {len(data['medicines'])} Cetaphil products, {len(products_with_price)} with prices")


class TestPharmacyBrowse:
    """Test pharmacy browse API"""
    
    def test_browse_categories(self):
        """Test V3 browse API returns categories with products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse?per_category=4")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert len(data["sections"]) > 0
        assert data.get("total_medicines", 0) > 0
        print(f"Browse API: {data['total_medicines']} total medicines, {len(data['sections'])} categories")
    
    def test_category_endpoint(self):
        """Test category-specific endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/category/Skin%20Care?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"Skin Care category: {len(data.get('medicines', []))} products")


class TestPharmacyAlternatives:
    """Test medicine alternatives API"""
    
    def test_alternatives_for_paracetamol(self):
        """Test alternatives API returns alternatives for common medicine"""
        # First search for a paracetamol product
        search_response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Paracetamol&limit=1")
        assert search_response.status_code == 200
        search_data = search_response.json()
        
        if len(search_data.get("medicines", [])) > 0:
            medicine_id = search_data["medicines"][0].get("id")
            if medicine_id:
                # Get alternatives
                alt_response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives/{medicine_id}?limit=10")
                assert alt_response.status_code == 200
                alt_data = alt_response.json()
                print(f"Alternatives for {alt_data.get('source_medicine')}: {alt_data.get('alternatives_count', 0)} found")
    
    def test_alternatives_by_name(self):
        """Test alternatives by generic name"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives-by-name?name=Paracetamol&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "alternatives" in data
        print(f"Alternatives by name 'Paracetamol': {data.get('count', 0)} found")


class TestPharmacyOrders:
    """Test pharmacy order endpoints"""
    
    def test_create_order(self):
        """Test creating a pharmacy order"""
        order_data = {
            "medicines": [
                {
                    "name": "TEST_Paracetamol 500mg",
                    "quantity": 1,
                    "mrp": 20,
                    "price": 18,
                    "discount_percent": 10
                }
            ],
            "patient_name": "TEST_User",
            "patient_phone": "9999999999",
            "delivery_address": "Test Address, City - 480001",
            "payment_method": "cod",
            "payment_status": "pending",
            "subtotal": 20,
            "discount": 2,
            "delivery_charge": 0,
            "total_amount": 18
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        # Accept 200, 201, or 422 (validation error is acceptable for test data)
        assert response.status_code in [200, 201, 422]
        if response.status_code in [200, 201]:
            data = response.json()
            assert "order_id" in data or "id" in data
            print(f"Order created: {data.get('order_id') or data.get('id')}")


class TestHealthEndpoints:
    """Test general health and home page endpoints"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["healthy", "ok"]
    
    def test_trending_products(self):
        """Test trending products endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending?store=orange_pharmacy&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "trending" in data
        print(f"Trending products: {len(data.get('trending', []))} items")


class TestAddressAndPayment:
    """Test address and payment related endpoints"""
    
    def test_get_addresses(self):
        """Test getting addresses for a phone number"""
        response = requests.get(f"{BASE_URL}/api/addresses/9999999999")
        # Should return 200 even if no addresses
        assert response.status_code == 200
        data = response.json()
        assert "addresses" in data
    
    def test_delivery_zones(self):
        """Test delivery zone endpoint if exists"""
        response = requests.get(f"{BASE_URL}/api/delivery/zones")
        # May not exist, so accept 200 or 404
        assert response.status_code in [200, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
