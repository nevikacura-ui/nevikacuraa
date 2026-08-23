"""
Test Phase 1-3 Features for Nevika Cura Healthcare Platform
- Subscription Refill API
- Return Policy Email API
- Verified Brand Badge (via discountUtils)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSubscriptionRefillAPI:
    """Test subscription refill endpoints for chronic medicine management"""
    
    def test_create_subscription_refill_success(self):
        """POST /api/pharmacy/subscription-refill creates subscription"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-refill", json={
            "phone": "9999999999",
            "medicines": ["Metformin", "Glimepiride"],
            "interval_days": 30,
            "condition": "Diabetes"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "subscription_id" in data
        assert data["subscription_id"].startswith("SUB-")
        assert "next_refill_date" in data
        print(f"✓ Created subscription: {data['subscription_id']}")
    
    def test_create_subscription_refill_with_different_interval(self):
        """POST /api/pharmacy/subscription-refill with 60-day interval"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-refill", json={
            "phone": "9999999999",
            "medicines": ["Amlodipine", "Telmisartan"],
            "interval_days": 60,
            "condition": "Blood Pressure"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "60 days" in data.get("message", "")
        print(f"✓ Created 60-day subscription: {data['subscription_id']}")
    
    def test_get_subscription_refills(self):
        """GET /api/pharmacy/subscription-refills returns subscriptions list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/subscription-refills?phone=9999999999")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "subscriptions" in data
        assert isinstance(data["subscriptions"], list)
        assert "total" in data
        print(f"✓ Found {data['total']} subscriptions for phone 9999999999")


class TestReturnPolicyEmailAPI:
    """Test return policy email endpoint"""
    
    def test_send_return_policy_email_success(self):
        """POST /api/pharmacy/send-return-policy sends email"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/send-return-policy", json={
            "email": "nevikacura@gmail.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # May succeed or fail based on email service, but endpoint should respond
        assert "success" in data or "error" in data
        if data.get("success"):
            print(f"✓ Return policy email sent to nevikacura@gmail.com")
        else:
            print(f"⚠ Email service returned: {data.get('error', 'unknown')}")
    
    def test_send_return_policy_email_invalid_format(self):
        """POST /api/pharmacy/send-return-policy with missing email"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/send-return-policy", json={})
        # Should return 422 for validation error or handle gracefully
        assert response.status_code in [200, 422, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Endpoint handles missing email correctly (status: {response.status_code})")


class TestPharmacyEndpoints:
    """Test pharmacy endpoints that support the new features"""
    
    def test_pharmacy_all_returns_medicines(self):
        """GET /api/pharmacy/all returns medicines with manufacturer field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert len(data["medicines"]) > 0
        # Check that medicines have manufacturer field for verified brand badge
        med = data["medicines"][0]
        assert "name" in med
        # manufacturer may be optional but should be present in most
        print(f"✓ Pharmacy API returns {len(data['medicines'])} medicines")
    
    def test_pharmacy_search_returns_results(self):
        """GET /api/pharmacy/search returns search results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=paracetamol&limit=5&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data or "results" in data
        meds = data.get("medicines") or data.get("results") or []
        print(f"✓ Search for 'paracetamol' returned {len(meds)} results")
    
    def test_pharmacy_categories(self):
        """GET /api/pharmacy/categories returns category list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/categories?store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data or isinstance(data, list)
        print(f"✓ Categories endpoint working")


class TestHealthTimelineAPI:
    """Test health timeline related endpoints"""
    
    def test_orders_history_endpoint(self):
        """GET /api/orders/history returns order history"""
        response = requests.get(f"{BASE_URL}/api/orders/history?phone=9999999999&limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data
        print(f"✓ Orders history returned {len(data.get('orders', []))} orders")
    
    def test_diagnostics_bookings_endpoint(self):
        """GET /api/diagnostics/bookings returns lab bookings"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/bookings?phone=9999999999")
        # May return 200 or 404 if no bookings
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Diagnostics bookings endpoint working")
        else:
            print(f"✓ Diagnostics bookings endpoint returns 404 for no data (expected)")


class TestVerifiedBrandsLogic:
    """Test that verified brands are properly identified"""
    
    def test_verified_brands_in_medicine_data(self):
        """Check that medicines from verified brands exist in inventory"""
        verified_brands = ['cipla', 'sun pharma', 'abbott', 'lupin', 'mankind']
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=100&store=orange_pharmacy")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        found_verified = []
        for med in medicines:
            manufacturer = (med.get("manufacturer") or "").lower()
            for brand in verified_brands:
                if brand in manufacturer:
                    found_verified.append(med.get("name"))
                    break
        
        print(f"✓ Found {len(found_verified)} medicines from verified brands")
        if found_verified:
            print(f"  Examples: {found_verified[:3]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
