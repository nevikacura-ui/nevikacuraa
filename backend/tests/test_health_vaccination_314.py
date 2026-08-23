"""
Test Suite for Iteration 314 - Health Insights, Adult Vaccination, Cart Suggestions, Stripe
Tests the new features: Health Insights page, Adult Vaccination page, Cart product suggestions, Stripe international payment
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestHealthEndpoint:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        """Test /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ Health endpoint working")


class TestPharmacyTrending:
    """Test pharmacy trending endpoint used by CartProductSuggestions"""
    
    def test_pharmacy_trending_returns_products(self):
        """Test /api/pharmacy/trending returns trending products for cart suggestions"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending?store=orange_pharmacy&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "trending" in data
        assert isinstance(data["trending"], list)
        print(f"✅ Pharmacy trending returns {len(data['trending'])} products")
        
        # Verify product structure
        if len(data["trending"]) > 0:
            product = data["trending"][0]
            assert "id" in product or "_id" in product
            assert "name" in product
            print(f"  - First product: {product.get('name', 'Unknown')}")
    
    def test_pharmacy_trending_with_limit(self):
        """Test trending endpoint respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending?store=orange_pharmacy&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("trending", [])) <= 5
        print(f"✅ Trending respects limit: {len(data.get('trending', []))} products")


class TestStripePharmacyCheckout:
    """Test Stripe pharmacy checkout for international payments"""
    
    def test_stripe_pharmacy_checkout_success(self):
        """Test creating Stripe checkout session for pharmacy order"""
        payload = {
            "origin_url": "https://premium-rx-portal.preview.emergentagent.com",
            "items": [
                {"name": "Influenza Vaccine (Flu shot)", "quantity": 1, "price": 1500, "mrp": 1800}
            ],
            "patient_phone": "9876543210",
            "patient_name": "Test Patient"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/stripe/pharmacy-checkout",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "url" in data
        assert "session_id" in data
        assert "amount_usd" in data
        assert "amount_inr" in data
        
        # Verify URL is Stripe checkout
        assert "stripe.com" in data["url"] or "checkout.stripe.com" in data["url"]
        
        # Verify INR to USD conversion (approximately ₹85 = $1)
        expected_usd = round(1500 / 85.0, 2)
        assert abs(data["amount_usd"] - expected_usd) < 0.5  # Allow small rounding difference
        assert data["amount_inr"] == 1500
        
        print(f"✅ Stripe checkout session created: ${data['amount_usd']} (₹{data['amount_inr']})")
        print(f"  - Session ID: {data['session_id'][:20]}...")
    
    def test_stripe_pharmacy_checkout_empty_cart(self):
        """Test Stripe checkout rejects empty cart"""
        payload = {
            "origin_url": "https://premium-rx-portal.preview.emergentagent.com",
            "items": [],
            "patient_phone": "9876543210"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/stripe/pharmacy-checkout",
            json=payload
        )
        
        assert response.status_code == 400
        print("✅ Empty cart correctly rejected")
    
    def test_stripe_pharmacy_checkout_multiple_items(self):
        """Test Stripe checkout with multiple items (vaccines)"""
        payload = {
            "origin_url": "https://premium-rx-portal.preview.emergentagent.com",
            "items": [
                {"name": "Influenza Vaccine", "quantity": 1, "price": 1500, "mrp": 1800},
                {"name": "HPV Vaccine", "quantity": 1, "price": 4200, "mrp": 5000},
                {"name": "Tdap Vaccine", "quantity": 2, "price": 800, "mrp": 1000}
            ],
            "patient_phone": "9876543210",
            "patient_name": "Test Patient"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/stripe/pharmacy-checkout",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Total: 1500 + 4200 + (800*2) = 8100 INR
        expected_inr = 1500 + 4200 + (800 * 2)
        assert data["amount_inr"] == expected_inr
        
        expected_usd = round(expected_inr / 85.0, 2)
        assert abs(data["amount_usd"] - expected_usd) < 0.5
        
        print(f"✅ Multiple items checkout: ${data['amount_usd']} (₹{data['amount_inr']})")


class TestPharmacyBrowse:
    """Test pharmacy browse endpoint"""
    
    def test_pharmacy_v3_browse(self):
        """Test /api/pharmacy/v3/browse returns sections"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        print(f"✅ Pharmacy browse returns {len(data.get('sections', []))} sections")
    
    def test_pharmacy_search(self):
        """Test pharmacy search endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=paracetamol")
        assert response.status_code == 200
        data = response.json()
        # Should return results or empty list
        assert "results" in data or "medicines" in data or isinstance(data, list)
        print("✅ Pharmacy search working")


class TestVaccinationData:
    """Test that vaccination data is properly structured (frontend-only, but verify API doesn't break)"""
    
    def test_health_endpoint_for_vaccination_page(self):
        """Verify API is healthy for vaccination page to load"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ API healthy for vaccination page")
    
    def test_pharmacy_trending_for_cart_suggestions(self):
        """Verify trending products available for cart suggestions on vaccination page"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "trending" in data
        print(f"✅ Trending products available: {len(data.get('trending', []))} items")


class TestCartIntegration:
    """Test cart-related API endpoints"""
    
    def test_pharmacy_orders_endpoint(self):
        """Test pharmacy orders endpoint exists (may require auth)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders?phone=9876543210")
        # Should return 200 with orders, 401 if auth required, or 404
        assert response.status_code in [200, 401, 404]
        if response.status_code == 401:
            print("✅ Pharmacy orders endpoint requires authentication (expected)")
        else:
            print("✅ Pharmacy orders endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
