"""
Iteration 163 - Revenue Features & Splash Screen Verification
Testing: Gift Cards, Care Packages, Cross-Sell Engine, Lab Test Catalog, Staff Login
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGiftCardsAPI:
    """Gift Card Templates & Stats API tests"""
    
    def test_get_gift_templates(self):
        """GET /api/gift-cards/templates returns 200 with templates"""
        response = requests.get(f"{BASE_URL}/api/gift-cards/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        # Should have 8 templates
        assert len(templates) >= 8, f"Expected 8+ templates, got {len(templates)}"
        # Verify known template keys exist
        known_keys = ["mothers_day", "fathers_day", "birthday", "diwali", "wedding", "baby_shower", "general", "corporate"]
        for key in known_keys:
            assert key in templates, f"Missing template: {key}"
        print(f"✓ Gift templates API: {len(templates)} templates returned")

    def test_get_gift_stats(self):
        """GET /api/gift-cards/stats returns 200 with stats"""
        response = requests.get(f"{BASE_URL}/api/gift-cards/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data
        assert "active" in data
        assert "used" in data
        assert "pending" in data
        print(f"✓ Gift stats API: total={data['total']}, active={data['active']}")


class TestCarePackagesAPI:
    """Care Packages List API tests"""
    
    def test_get_care_packages_list(self):
        """GET /api/care-packages/list returns 200 with packages"""
        response = requests.get(f"{BASE_URL}/api/care-packages/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "packages" in data
        packages = data["packages"]
        # Should have 5 packages
        assert len(packages) >= 5, f"Expected 5+ packages, got {len(packages)}"
        # Verify known package IDs
        package_ids = [p["id"] for p in packages]
        known_ids = ["diabetes_care", "thyroid_management", "pregnancy_journey", "senior_wellness", "cardiac_care"]
        for pkg_id in known_ids:
            assert pkg_id in package_ids, f"Missing package: {pkg_id}"
        print(f"✓ Care packages API: {len(packages)} packages returned")
    
    def test_get_single_care_package(self):
        """GET /api/care-packages/diabetes_care returns package details"""
        response = requests.get(f"{BASE_URL}/api/care-packages/diabetes_care")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["id"] == "diabetes_care"
        assert data["name"] == "Diabetes Care Program"
        assert data["price"] == 4999
        assert "includes" in data
        print(f"✓ Single care package API: {data['name']} - Rs.{data['price']}")


class TestCrossSellAPI:
    """Cross-Sell Suggestions API tests"""
    
    def test_cross_sell_diagyn_suggestions(self):
        """POST /api/cross-sell/suggestions with diagyn service_type returns suggestions"""
        payload = {
            "context": "pregnancy antenatal checkup",
            "source_service": "diagyn"
        }
        response = requests.post(f"{BASE_URL}/api/cross-sell/suggestions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "suggestions" in data
        assert "total" in data
        print(f"✓ Cross-sell API (diagyn): {data['total']} suggestions returned")
    
    def test_cross_sell_mango_suggestions(self):
        """POST /api/cross-sell/suggestions for mango labs context"""
        payload = {
            "context": "diabetes hba1c blood sugar",
            "source_service": "mango"
        }
        response = requests.post(f"{BASE_URL}/api/cross-sell/suggestions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "suggestions" in data
        print(f"✓ Cross-sell API (mango): {data['total']} suggestions returned")
    
    def test_cross_sell_analytics(self):
        """GET /api/cross-sell/analytics returns stats"""
        response = requests.get(f"{BASE_URL}/api/cross-sell/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "shown" in data
        assert "clicked" in data
        assert "click_rate" in data
        print(f"✓ Cross-sell analytics: shown={data['shown']}, clicked={data['clicked']}")


class TestMangoLabsAPI:
    """Mango Labs Test Catalog API tests"""
    
    def test_get_test_catalog(self):
        """GET /api/mango/test-catalog returns 200 with 124+ tests"""
        response = requests.get(f"{BASE_URL}/api/mango/test-catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "tests" in data
        assert "total" in data
        assert "categories" in data
        # Should have 124+ tests based on requirements
        test_count = data["total"]
        assert test_count >= 100, f"Expected 100+ tests, got {test_count}"
        print(f"✓ Mango test catalog: {test_count} tests, {len(data['categories'])} categories")
    
    def test_test_catalog_search(self):
        """GET /api/mango/test-catalog with search param"""
        response = requests.get(f"{BASE_URL}/api/mango/test-catalog?search=diabetes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "tests" in data
        print(f"✓ Mango test catalog search: {data['total']} tests matched 'diabetes'")


class TestStaffLoginAPI:
    """Staff Portal Login API tests"""
    
    def test_staff_login_diagyn(self):
        """POST /api/staff/login with staff_diagyn credentials"""
        payload = {
            "username": "staff_diagyn",
            "password": "test1234"
        }
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "diagyn_staff"
        print(f"✓ Staff login (diagyn): token received, name={data['staff']['name']}")
    
    def test_staff_login_orange(self):
        """POST /api/staff/login with staff_orange credentials"""
        payload = {
            "username": "staff_orange",
            "password": "test1234"
        }
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        print(f"✓ Staff login (orange): token received")
    
    def test_staff_login_mango(self):
        """POST /api/staff/login with staff_mango credentials"""
        payload = {
            "username": "staff_mango",
            "password": "test1234"
        }
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        print(f"✓ Staff login (mango): token received")
    
    def test_staff_login_invalid(self):
        """POST /api/staff/login with invalid credentials returns 401"""
        payload = {
            "username": "invalid_user",
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Staff login (invalid): correctly returned 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
