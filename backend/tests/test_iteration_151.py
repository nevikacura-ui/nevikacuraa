"""
Iteration 151: Pre-launch Testing
Tests navigation, APIs, and page rendering for pharmacy app

Test categories:
1. API Health: POST /api/proton/book, POST /api/staff/login, GET /api/billing/invoices, GET /api/pharmacy/orders
2. Navigation: OrangeMedcare cards, Mango toggle page, Header tabs
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestAPIHealth:
    """Test critical backend APIs"""
    
    def test_proton_book_endpoint(self):
        """POST /api/proton/book - Create ultrasound/ECG booking"""
        payload = {
            "patient_name": "TEST_Iteration151_Patient",
            "age": "30",
            "husband_name": "TEST_Husband",
            "address": "123 Test Street, Mumbai",
            "mobile_number": "9876543210",
            "scan_type": "Early Pregnancy Scan",
            "lmp": "2026-01-01",
            "date_of_birth": "1995-05-15",
            "has_children": False,
            "children": [],
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "booking_time": "10:00 AM",
            "clinic": "Proton Diagnostic",
            "notes": "Price: ₹1000"
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=payload)
        print(f"POST /api/proton/book - Status: {response.status_code}")
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "booking_id" in data or "id" in data, f"Expected booking_id in response: {data}"
        print(f"Booking created successfully: {data}")
    
    def test_proton_book_ecg(self):
        """POST /api/proton/book - Create ECG booking"""
        payload = {
            "patient_name": "TEST_Iteration151_ECG",
            "mobile_number": "9876543211",
            "scan_type": "ECG",
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "booking_time": "11:00 AM",
            "clinic": "Proton Diagnostic",
            "notes": "Price: ₹300"
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=payload)
        print(f"POST /api/proton/book ECG - Status: {response.status_code}")
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
    
    def test_proton_book_validation(self):
        """POST /api/proton/book - Should return 422 for missing required fields"""
        payload = {
            "scan_type": "Growth Scan"
            # Missing patient_name and mobile_number
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=payload)
        print(f"POST /api/proton/book validation - Status: {response.status_code}")
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400/422 for validation error, got {response.status_code}"
    
    def test_staff_login_valid(self):
        """POST /api/staff/login - Staff login with valid credentials"""
        payload = {
            "username": "admin",
            "password": "test1234"
        }
        
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        print(f"POST /api/staff/login - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200 for valid login, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, f"Expected token in response: {data}"
        print(f"Staff login successful - Role: {data.get('role', 'N/A')}, Portal: {data.get('portal', 'N/A')}")
    
    def test_staff_login_invalid(self):
        """POST /api/staff/login - Should fail with invalid credentials"""
        payload = {
            "username": "wrong_user",
            "password": "wrong_password"
        }
        
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        print(f"POST /api/staff/login invalid - Status: {response.status_code}")
        
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404 for invalid login, got {response.status_code}"
    
    def test_billing_invoices(self):
        """GET /api/billing/invoices - Fetch invoice list"""
        response = requests.get(f"{BASE_URL}/api/billing/invoices")
        print(f"GET /api/billing/invoices - Status: {response.status_code}")
        
        # Should return 200 even if empty
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "invoices" in data or isinstance(data, list), f"Expected invoices in response: {data}"
        print(f"Invoices count: {len(data.get('invoices', data))}")
    
    def test_pharmacy_orders_with_auth(self):
        """GET /api/pharmacy/orders - Fetch pharmacy orders with staff auth"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not get staff auth token")
        
        token = login_response.json().get("token") or login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders", headers=headers)
        print(f"GET /api/pharmacy/orders (authenticated) - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data or isinstance(data, list), f"Expected orders in response: {data}"
        print(f"Orders count: {len(data.get('orders', data))}")


class TestPharmacyEndpoints:
    """Test pharmacy medicine-related endpoints"""
    
    def test_pharmacy_all(self):
        """GET /api/pharmacy/all - Fetch all medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10")
        print(f"GET /api/pharmacy/all - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "medicines" in data, f"Expected medicines in response"
        print(f"Medicines fetched: {len(data.get('medicines', []))}")
    
    def test_pharmacy_search(self):
        """GET /api/pharmacy/search - Search medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=paracetamol&limit=5")
        print(f"GET /api/pharmacy/search - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_pharmacy_count(self):
        """GET /api/pharmacy/count - Get total medicine count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        print(f"GET /api/pharmacy/count - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestMangoEndpoints:
    """Test Mango Health Labs endpoints"""
    
    def test_diagnostics_list(self):
        """GET /api/diagnostics - Should exist or return 401/404 if protected/no route"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        print(f"GET /api/diagnostics - Status: {response.status_code}")
        # 401 expected if it requires authentication
        assert response.status_code in [200, 401, 404, 405], f"Unexpected status: {response.status_code}"


class TestCriticalRoutes:
    """Test that critical frontend routes exist in backend routing"""
    
    def test_frontend_health(self):
        """Check frontend is accessible"""
        response = requests.get(BASE_URL, timeout=10)
        print(f"GET / (frontend) - Status: {response.status_code}")
        assert response.status_code == 200, f"Frontend not accessible: {response.status_code}"
    
    def test_orange_medcare_page(self):
        """Check /orange-medcare route"""
        response = requests.get(f"{BASE_URL}/orange-medcare", timeout=10)
        print(f"GET /orange-medcare - Status: {response.status_code}")
        assert response.status_code == 200, f"OrangeMedcare page not accessible: {response.status_code}"
    
    def test_pharmacy_page(self):
        """Check /pharmacy route"""
        response = requests.get(f"{BASE_URL}/pharmacy", timeout=10)
        print(f"GET /pharmacy - Status: {response.status_code}")
        assert response.status_code == 200, f"Pharmacy page not accessible: {response.status_code}"
    
    def test_nutricare_page(self):
        """Check /nutricare route"""
        response = requests.get(f"{BASE_URL}/nutricare", timeout=10)
        print(f"GET /nutricare - Status: {response.status_code}")
        assert response.status_code == 200, f"Nutricare page not accessible: {response.status_code}"
    
    def test_mango_page(self):
        """Check /mango route"""
        response = requests.get(f"{BASE_URL}/mango", timeout=10)
        print(f"GET /mango - Status: {response.status_code}")
        assert response.status_code == 200, f"Mango page not accessible: {response.status_code}"
    
    def test_mango_ultrasound_page(self):
        """Check /mango/ultrasound route"""
        response = requests.get(f"{BASE_URL}/mango/ultrasound", timeout=10)
        print(f"GET /mango/ultrasound - Status: {response.status_code}")
        assert response.status_code == 200, f"Mango Ultrasound page not accessible: {response.status_code}"


@pytest.fixture(scope="module", autouse=True)
def setup_teardown():
    """Setup and teardown for test module"""
    print(f"\n{'='*60}")
    print(f"Iteration 151: Pre-Launch Testing")
    print(f"Base URL: {BASE_URL}")
    print(f"{'='*60}\n")
    yield
    print(f"\n{'='*60}")
    print("Test suite completed")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
