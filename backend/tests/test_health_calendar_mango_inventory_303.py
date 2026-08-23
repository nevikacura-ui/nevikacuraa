"""
Test Suite for Iteration 303 - Health Calendar API, Mango Refactoring, Coupons, Inventory
Tests: Health Calendar events, Coupons available, Inventory stock summary, Batch expiry
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ API health check passed")


class TestHealthCalendarAPI:
    """Health Calendar API - GET /api/health-calendar/events"""
    
    def test_health_calendar_events_with_phone(self):
        """Test health calendar returns events for a phone number"""
        response = requests.get(f"{BASE_URL}/api/health-calendar/events", params={"phone": "9876543210"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "events" in data
        assert "count" in data
        assert isinstance(data["events"], list)
        print(f"✅ Health Calendar API returned {data['count']} events")
    
    def test_health_calendar_events_with_year_month(self):
        """Test health calendar with specific year and month"""
        response = requests.get(f"{BASE_URL}/api/health-calendar/events", params={
            "phone": "9833188288",
            "year": 2026,
            "month": 1
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "events" in data
        print(f"✅ Health Calendar API with year/month returned {data['count']} events")


class TestCouponsAPI:
    """Coupon API - GET /api/coupons/available"""
    
    def test_coupons_available_pharmacy(self):
        """Test available coupons for pharmacy orders"""
        response = requests.get(f"{BASE_URL}/api/coupons/available", params={
            "order_type": "pharmacy",
            "subtotal": 1000
        })
        assert response.status_code == 200
        data = response.json()
        assert "coupons" in data
        assert isinstance(data["coupons"], list)
        # Should have at least some default coupons
        if len(data["coupons"]) > 0:
            coupon = data["coupons"][0]
            assert "code" in coupon
            assert "discount_type" in coupon
            assert "estimated_savings" in coupon
        print(f"✅ Coupons API returned {len(data['coupons'])} available coupons for pharmacy")
    
    def test_coupons_available_lab(self):
        """Test available coupons for lab orders"""
        response = requests.get(f"{BASE_URL}/api/coupons/available", params={
            "order_type": "lab",
            "subtotal": 500
        })
        assert response.status_code == 200
        data = response.json()
        assert "coupons" in data
        print(f"✅ Coupons API returned {len(data['coupons'])} available coupons for lab")
    
    def test_coupon_validate(self):
        """Test coupon validation endpoint"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "WELCOME10",
            "amount": 1000,
            "type": "pharmacy"
        })
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        if data["valid"]:
            assert "discount" in data
            assert data["discount"] > 0
        print(f"✅ Coupon validation: valid={data.get('valid')}, discount={data.get('discount', 0)}")


class TestInventoryAPI:
    """Inventory API - Requires authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from doctor login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate for inventory tests")
    
    def test_inventory_stock_summary(self, auth_token):
        """Test inventory stock summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/inventory/stock-summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "pharmacy" in data
        pharmacy = data["pharmacy"]
        assert "total" in pharmacy
        assert "in_stock" in pharmacy
        assert "low_stock" in pharmacy
        assert "out_of_stock" in pharmacy
        print(f"✅ Inventory stock summary: total={pharmacy['total']}, in_stock={pharmacy['in_stock']}, low_stock={pharmacy['low_stock']}")
    
    def test_inventory_batch_expiry(self, auth_token):
        """Test batch expiry tracking endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/inventory/batch-expiry",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"days_ahead": 90}
        )
        assert response.status_code == 200
        data = response.json()
        assert "batches" in data
        assert "expired_count" in data
        assert "expiring_soon" in data
        print(f"✅ Batch expiry: expired={data['expired_count']}, expiring_soon={data['expiring_soon']}")
    
    def test_inventory_unauthorized(self):
        """Test inventory endpoints require auth"""
        response = requests.get(f"{BASE_URL}/api/inventory/stock-summary")
        assert response.status_code == 401
        print("✅ Inventory endpoints correctly require authentication")


class TestMangoTestCatalog:
    """Mango Labs Test Catalog API"""
    
    def test_mango_test_catalog(self):
        """Test Mango test catalog endpoint"""
        response = requests.get(f"{BASE_URL}/api/mango/test-catalog")
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        if len(data["tests"]) > 0:
            test = data["tests"][0]
            assert "name" in test
        print(f"✅ Mango test catalog returned {len(data.get('tests', []))} tests")


class TestPharmacyMedicines:
    """Pharmacy medicines catalog API"""
    
    def test_pharmacy_medicines_catalog(self):
        """Test pharmacy medicines catalog"""
        response = requests.get(f"{BASE_URL}/api/medicines/catalog", params={
            "page": 1,
            "limit": 20
        })
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        print(f"✅ Pharmacy catalog returned {len(data.get('medicines', []))} medicines, total={data.get('total', 0)}")
    
    def test_pharmacy_all_medicines(self):
        """Test pharmacy all medicines endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all", params={
            "page": 1,
            "per_page": 20,
            "store": "orange_pharmacy"
        })
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"✅ Pharmacy all medicines returned {len(data.get('medicines', []))} items")


class TestDoctorAuth:
    """Doctor authentication tests"""
    
    def test_doctor_login_success(self):
        """Test doctor login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        print(f"✅ Doctor login successful: {data['staff'].get('name', 'Unknown')}")
    
    def test_doctor_login_invalid(self):
        """Test doctor login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401
        print("✅ Invalid doctor login correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
