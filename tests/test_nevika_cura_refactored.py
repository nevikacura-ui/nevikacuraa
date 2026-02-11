"""
Nevika Cura Healthcare App - Backend API Tests (Fixed)
Tests for verifying server refactoring didn't break functionality
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mango-labs-portal.preview.emergentagent.com')

# Test credentials from review request
ADMIN_PASSWORD = "nevikacura2026"
PHARMACY_STAFF = {"username": "staff_pharmacy", "password": "Nevika@2026P"}
DIAGNOSTIC_STAFF = {"username": "staff_proton", "password": "Nevika@2026L"}


class TestHealthAndBasicEndpoints:
    """Test basic API health and connectivity"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Nevika Cura" in data["message"]
        print(f"✓ API root working: {data['message']}")
    
    def test_pharmacy_count(self):
        """Test medicine inventory count - verifies refactoring preserved data"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        # Should have 4274 medicines as per refactoring
        assert data["total"] > 4000, f"Expected 4000+ medicines, got {data['total']}"
        print(f"✓ Medicine inventory count: {data['total']} items")
    
    def test_diagnostic_tests_endpoint(self):
        """Test diagnostic tests endpoint - verifies refactoring preserved data"""
        response = requests.get(f"{BASE_URL}/api/diagnostic-tests")
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert "imaging" in data["tests"]
        assert "pathology" in data["tests"]
        # Verify structure
        assert "ecg" in data["tests"]["imaging"]
        assert "blood" in data["tests"]["pathology"]
        print(f"✓ Diagnostic tests endpoint working with categories: {list(data['tests'].keys())}")


class TestAdminPortal:
    """Test admin portal authentication and endpoints"""
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Admin login successful")
    
    def test_admin_login_failure(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Admin login correctly rejects wrong password")
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get stats
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Admin stats retrieved successfully")
    
    def test_admin_staff_list(self):
        """Test admin can list staff"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get staff list
        response = requests.get(
            f"{BASE_URL}/api/admin/staff",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns object with 'staff' key containing list
        assert "staff" in data
        assert isinstance(data["staff"], list)
        print(f"✓ Admin staff list retrieved: {len(data['staff'])} staff members")


class TestStaffPortal:
    """Test staff portal authentication"""
    
    def test_pharmacy_staff_login(self):
        """Test pharmacy staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": PHARMACY_STAFF["username"],
            "password": PHARMACY_STAFF["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        # Staff info is returned directly, not nested under 'staff' key
        assert "name" in data
        print(f"✓ Pharmacy staff login successful: {data.get('name', 'N/A')}")
    
    def test_diagnostic_staff_login(self):
        """Test diagnostic staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DIAGNOSTIC_STAFF["username"],
            "password": DIAGNOSTIC_STAFF["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        # Staff info is returned directly
        assert "name" in data
        print(f"✓ Diagnostic staff login successful: {data.get('name', 'N/A')}")
    
    def test_staff_login_failure(self):
        """Test staff login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "wrong_user",
            "password": "wrong_pass"
        })
        assert response.status_code == 401
        print(f"✓ Staff login correctly rejects wrong credentials")


class TestPharmacyFlow:
    """Test pharmacy order flow"""
    
    def test_pharmacy_autocomplete(self):
        """Test medicine autocomplete search"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete?q=para&limit=10")
        assert response.status_code == 200
        data = response.json()
        # API returns object with 'suggestions' key
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        print(f"✓ Pharmacy autocomplete working: {len(data['suggestions'])} results for 'para'")
    
    def test_pharmacy_forms(self):
        """Test medicine forms endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/forms")
        assert response.status_code == 200
        data = response.json()
        # API returns object with 'forms' key
        assert "forms" in data
        assert isinstance(data["forms"], list)
        assert len(data["forms"]) > 0
        print(f"✓ Pharmacy forms endpoint working: {len(data['forms'])} forms available")
    
    def test_pharmacy_all_medicines(self):
        """Test paginated medicine list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=50")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Pharmacy all medicines: {data['total']} total, page {data['page']}")
    
    def test_create_pharmacy_order(self):
        """Test creating a pharmacy order"""
        test_phone = f"9999{str(uuid.uuid4())[:6].replace('-', '0')}"
        order_data = {
            "medicines": [
                {"name": "CROCIN 650MG TAB", "quantity": 2, "form": "Tablet"}
            ],
            "patient_name": "Test Patient",
            "patient_phone": test_phone,
            "patient_email": "test@example.com",
            "delivery_address": "Test Address, Mumbai"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["patient_name"] == "Test Patient"
        print(f"✓ Pharmacy order created: {data['id'][:8]}...")


class TestDiagnosticFlow:
    """Test diagnostic booking flow"""
    
    def test_create_diagnostic_order(self):
        """Test creating a diagnostic order"""
        test_phone = f"9999{str(uuid.uuid4())[:6].replace('-', '0')}"
        order_data = {
            "tests": ["CBC (Complete Blood Count)", "TSH"],
            "preferred_date": datetime.now().strftime("%Y-%m-%d"),
            "patient_name": "Test Patient",
            "patient_phone": test_phone,
            "patient_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["patient_name"] == "Test Patient"
        assert len(data["tests"]) == 2
        print(f"✓ Diagnostic order created: {data['id'][:8]}...")


class TestAppointmentFlow:
    """Test appointment booking flow"""
    
    def test_get_booked_slots(self):
        """Test getting booked slots for a doctor"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Vikas Jha",
                "clinic": "Pushpa Clinic",
                "date": datetime.now().strftime("%Y-%m-%d")
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        print(f"✓ Booked slots retrieved: {len(data['booked_slots'])} slots booked")
    
    def test_create_appointment(self):
        """Test creating an appointment"""
        test_phone = f"9999{str(uuid.uuid4())[:6].replace('-', '0')}"
        appointment_data = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": "2026-01-15",
            "time": "10:00 AM",
            "patient_name": "Test Patient",
            "patient_phone": test_phone,
            "patient_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        # May fail if slot is taken, which is acceptable
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            print(f"✓ Appointment created: {data['id'][:8]}...")
        elif response.status_code == 400:
            data = response.json()
            print(f"✓ Appointment slot handling working: {data.get('detail', 'Slot taken')}")
        else:
            assert False, f"Unexpected status code: {response.status_code}"


class TestStaffPharmacyOrders:
    """Test staff pharmacy order management"""
    
    def test_staff_get_pharmacy_orders(self):
        """Test staff can get pharmacy orders"""
        # Login as pharmacy staff
        login_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": PHARMACY_STAFF["username"],
            "password": PHARMACY_STAFF["password"]
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get orders
        response = requests.get(
            f"{BASE_URL}/api/staff/pharmacy/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns object with 'orders' key
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"✓ Staff pharmacy orders retrieved: {len(data['orders'])} orders")


class TestStaffDiagnosticOrders:
    """Test staff diagnostic order management"""
    
    def test_staff_get_diagnostic_orders(self):
        """Test staff can get diagnostic orders"""
        # Login as diagnostic staff
        login_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DIAGNOSTIC_STAFF["username"],
            "password": DIAGNOSTIC_STAFF["password"]
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get orders
        response = requests.get(
            f"{BASE_URL}/api/staff/diagnostic/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns object with 'orders' key
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"✓ Staff diagnostic orders retrieved: {len(data['orders'])} orders")


class TestOTPFlow:
    """Test OTP authentication flow"""
    
    def test_send_otp(self):
        """Test sending OTP"""
        test_phone = "9999999999"
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "phone": test_phone,
            "service": "pharmacy"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ OTP send working: method={data.get('method', 'unknown')}")
    
    def test_auth_otp_send(self):
        """Test auth OTP send"""
        test_phone = "9999999998"
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": test_phone
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Auth OTP send working: method={data.get('method', 'unknown')}")


class TestAdminDiagnosticTests:
    """Test admin diagnostic test management"""
    
    def test_admin_get_diagnostic_tests(self):
        """Test admin can get diagnostic tests"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get diagnostic tests
        response = requests.get(
            f"{BASE_URL}/api/admin/diagnostic-tests",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        print(f"✓ Admin diagnostic tests retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
