"""
Backend API Tests for Nevika Cura Healthcare Application
Tests: Pharmacy inventory, forms, diagnostics, and appointments endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://faith-care-whatsapp.preview.emergentagent.com')


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Nevika Cura Healthcare API"
        print("✓ API root endpoint working")


class TestPharmacyInventory:
    """Tests for /api/pharmacy/inventory endpoint"""
    
    def test_get_inventory_all(self):
        """Test getting full inventory"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        assert isinstance(data["medicines"], list)
        assert data["total"] > 0
        print(f"✓ Inventory returned {data['total']} medicines")
    
    def test_inventory_structure(self):
        """Test inventory item structure"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory")
        assert response.status_code == 200
        data = response.json()
        
        # Check first medicine has required fields
        if data["medicines"]:
            medicine = data["medicines"][0]
            assert "name" in medicine
            assert "form" in medicine
            assert "company" in medicine
            print(f"✓ Medicine structure valid: {medicine['name']}")
    
    def test_inventory_search(self):
        """Test inventory search functionality"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory?search=crocin")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        
        # All results should contain 'crocin' in name or company
        for medicine in data["medicines"]:
            assert "crocin" in medicine["name"].lower() or "crocin" in medicine["company"].lower()
        print(f"✓ Search returned {len(data['medicines'])} results for 'crocin'")
    
    def test_inventory_filter_by_form(self):
        """Test inventory filter by form"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory?form=Tablet")
        assert response.status_code == 200
        data = response.json()
        
        # All results should be tablets
        for medicine in data["medicines"]:
            assert "tablet" in medicine["form"].lower()
        print(f"✓ Filter returned {len(data['medicines'])} tablets")
    
    def test_inventory_search_and_filter(self):
        """Test combined search and filter"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory?search=cipla&form=Syrup")
        assert response.status_code == 200
        data = response.json()
        
        for medicine in data["medicines"]:
            assert "cipla" in medicine["name"].lower() or "cipla" in medicine["company"].lower()
            assert "syrup" in medicine["form"].lower()
        print(f"✓ Combined search+filter returned {len(data['medicines'])} results")
    
    def test_inventory_empty_search(self):
        """Test search with no results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory?search=xyznonexistent123")
        assert response.status_code == 200
        data = response.json()
        assert data["medicines"] == []
        assert data["total"] == 0
        print("✓ Empty search returns empty list")


class TestPharmacyForms:
    """Tests for /api/pharmacy/forms endpoint"""
    
    def test_get_forms(self):
        """Test getting all medicine forms"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/forms")
        assert response.status_code == 200
        data = response.json()
        assert "forms" in data
        assert isinstance(data["forms"], list)
        assert len(data["forms"]) > 0
        print(f"✓ Forms endpoint returned {len(data['forms'])} forms")
    
    def test_forms_contains_expected(self):
        """Test forms contains expected types"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/forms")
        assert response.status_code == 200
        data = response.json()
        
        expected_forms = ["Tablet", "Syrup", "Cream", "Drops", "Capsule"]
        for form in expected_forms:
            assert form in data["forms"], f"Expected form '{form}' not found"
        print("✓ All expected forms present")


class TestDiagnosticsEndpoint:
    """Tests for /api/diagnostics endpoint"""
    
    def test_create_diagnostic_order_guest(self):
        """Test creating diagnostic order as guest"""
        order_data = {
            "tests": ["Complete Blood Count (CBC)", "Thyroid Profile (T3, T4, TSH)"],
            "preferred_date": "2025-12-20",
            "patient_name": "TEST_Guest Patient",
            "patient_phone": "9876543210",
            "patient_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["tests"] == order_data["tests"]
        assert data["patient_name"] == order_data["patient_name"]
        assert data["status"] == "pending"
        print(f"✓ Diagnostic order created: {data['id']}")
    
    def test_diagnostics_requires_auth_for_list(self):
        """Test that listing diagnostics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code == 401
        print("✓ Diagnostics list requires authentication")


class TestPharmacyOrderEndpoint:
    """Tests for /api/pharmacy POST endpoint"""
    
    def test_create_pharmacy_order_guest(self):
        """Test creating pharmacy order as guest"""
        order_data = {
            "medicines": [
                {"name": "Crocin 650 Tab", "quantity": 2},
                {"name": "Combiflam Tab", "quantity": 1}
            ],
            "patient_name": "TEST_Pharmacy Guest",
            "patient_phone": "9876543210",
            "delivery_address": "123 Test Street"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert len(data["medicines"]) == 2
        assert data["patient_name"] == order_data["patient_name"]
        assert data["status"] == "pending"
        print(f"✓ Pharmacy order created: {data['id']}")
    
    def test_pharmacy_requires_auth_for_list(self):
        """Test that listing pharmacy orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pharmacy")
        assert response.status_code == 401
        print("✓ Pharmacy list requires authentication")


class TestAppointmentsEndpoint:
    """Tests for /api/appointments endpoint"""
    
    def test_create_appointment_guest(self):
        """Test creating appointment as guest"""
        appointment_data = {
            "doctor": "Dr. Test Doctor",
            "clinic": "DiaGyn Healthcare",
            "date": "2025-12-20",
            "time": "10:00 AM",
            "patient_name": "TEST_Appointment Guest",
            "patient_phone": "9876543210"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["doctor"] == appointment_data["doctor"]
        assert data["status"] == "pending"
        print(f"✓ Appointment created: {data['id']}")
    
    def test_appointments_requires_auth_for_list(self):
        """Test that listing appointments requires authentication"""
        response = requests.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 401
        print("✓ Appointments list requires authentication")


class TestAuthEndpoints:
    """Tests for authentication endpoints"""
    
    def test_register_new_user(self):
        """Test user registration"""
        import uuid
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        user_data = {
            "email": unique_email,
            "password": "testpass123",
            "phone": "9876543210",
            "name": "TEST_New User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        print(f"✓ User registered: {unique_email}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 401
        print("✓ Invalid login rejected")
    
    def test_me_requires_auth(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
