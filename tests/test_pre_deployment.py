"""
Pre-deployment comprehensive tests for Nevika Cura Healthcare App
Tests: Auth flow, DiaGyn appointments, Proton diagnostics, Pharmacy, Evara, Omnia, Admin, Staff
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicEndpoints:
    """Test basic API health and endpoints"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
        print(f"✓ API healthy with services: {data['services']}")
    
    def test_diagnostic_tests_list(self):
        """Test diagnostic tests list endpoint"""
        response = requests.get(f"{BASE_URL}/api/diagnostic-tests")
        assert response.status_code == 200
        data = response.json()
        # API returns {"tests": {...}} structure
        assert "tests" in data
        assert "pathology" in data["tests"]
        print(f"✓ Diagnostic tests retrieved with categories: {list(data['tests'].keys())}")


class TestAuthFlow:
    """Test OTP-based authentication flow"""
    
    def test_send_auth_otp(self):
        """Test sending OTP for authentication"""
        test_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": test_phone
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "expires_in" in data
        print(f"✓ OTP sent successfully, method: {data.get('method', 'unknown')}")
    
    def test_verify_auth_otp_mock(self):
        """Test OTP verification with mock OTP"""
        test_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        
        # Send OTP first
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": test_phone
        })
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        # If mock OTP is provided, verify it
        if "mock_otp" in send_data:
            verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
                "phone": test_phone,
                "otp": send_data["mock_otp"]
            })
            assert verify_response.status_code == 200
            verify_data = verify_response.json()
            assert verify_data["verified"] == True
            assert "verification_token" in verify_data
            print(f"✓ OTP verified successfully, user_exists: {verify_data.get('user_exists', False)}")
        else:
            print("✓ SMS OTP sent (cannot verify without real phone)")
    
    def test_register_with_email_password(self):
        """Test traditional email/password registration"""
        unique_id = str(uuid.uuid4().int)[:8]
        test_email = f"test_predeployment_{unique_id}@example.com"
        test_phone = f"98765{unique_id[:5]}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "phone": test_phone,
            "password": "TestPass123!",
            "name": "Test PreDeployment User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        print(f"✓ User registered: {test_email}")
    
    def test_login_with_email_password(self):
        """Test email/password login"""
        # First register a user
        unique_id = str(uuid.uuid4().int)[:8]
        test_email = f"test_login_{unique_id}@example.com"
        test_phone = f"98765{unique_id[:5]}"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "phone": test_phone,
            "password": "TestPass123!",
            "name": "Test Login User"
        })
        assert reg_response.status_code == 200
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "TestPass123!"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ User logged in: {test_email}")


class TestDiaGynAppointments:
    """Test DiaGyn appointment booking flow"""
    
    def test_get_booked_slots(self):
        """Test getting booked slots for a doctor"""
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Neha Sharma",
            "clinic": "DiaGyn Clinic - Nagpur",
            "date": "2026-01-15"
        })
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        print(f"✓ Booked slots retrieved: {len(data['booked_slots'])} slots")
    
    def test_create_appointment(self):
        """Test creating an appointment"""
        unique_id = str(uuid.uuid4().int)[:8]
        
        response = requests.post(f"{BASE_URL}/api/appointments", json={
            "doctor": "Dr. Neha Sharma",
            "clinic": "DiaGyn Clinic - Nagpur",
            "date": f"2026-02-{15 + int(unique_id[:2]) % 10}",
            "time": f"{10 + int(unique_id[2:4]) % 8}:00",
            "patient_name": f"Test Patient {unique_id}",
            "patient_phone": f"98765{unique_id[:5]}",
            "patient_email": f"test_{unique_id}@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["patient_name"] == f"Test Patient {unique_id}"
        print(f"✓ Appointment created: {data['id'][:8]}")


class TestProtonDiagnostics:
    """Test Proton diagnostic test booking"""
    
    def test_create_diagnostic_order(self):
        """Test creating a diagnostic order"""
        unique_id = str(uuid.uuid4().int)[:8]
        
        # Correct endpoint is /api/diagnostics with tests as List[str]
        response = requests.post(f"{BASE_URL}/api/diagnostics", json={
            "patient_name": f"Test Patient {unique_id}",
            "patient_phone": f"98765{unique_id[:5]}",
            "patient_email": f"test_{unique_id}@example.com",
            "tests": ["CBC (Complete Blood Count)", "FBS (Fasting Blood Sugar)"],
            "preferred_date": "2026-01-20"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Diagnostic order created: {data['id'][:8]}")


class TestPharmacy:
    """Test Orange Pharmacy order flow"""
    
    def test_create_pharmacy_order(self):
        """Test creating a pharmacy order"""
        unique_id = str(uuid.uuid4().int)[:8]
        
        # Correct endpoint is /api/pharmacy with medicines field
        response = requests.post(f"{BASE_URL}/api/pharmacy", json={
            "patient_name": f"Test Patient {unique_id}",
            "patient_phone": f"98765{unique_id[:5]}",
            "patient_email": f"test_{unique_id}@example.com",
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 2, "price": 25}
            ],
            "delivery_address": "123 Test Street, Nagpur"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Pharmacy order created: {data['id'][:8]}")


class TestEvara:
    """Test Evara women's wellness endpoints"""
    
    def test_get_evara_programs(self):
        """Test getting Evara programs"""
        response = requests.get(f"{BASE_URL}/api/evara/programs")
        assert response.status_code == 200
        data = response.json()
        # API returns {"programs": [...]} structure
        assert "programs" in data
        assert isinstance(data["programs"], list)
        assert len(data["programs"]) > 0
        print(f"✓ Found {len(data['programs'])} Evara programs")
    
    def test_evara_profile_requires_auth(self):
        """Test that Evara profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/evara/profile")
        assert response.status_code == 401
        print("✓ Evara profile correctly requires authentication")


class TestOmnia:
    """Test Omnia diabetes care endpoints"""
    
    def test_omnia_profile_requires_auth(self):
        """Test that Omnia profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/omnia/profile")
        assert response.status_code == 401
        print("✓ Omnia profile correctly requires authentication")
    
    def test_omnia_sugar_logs_requires_auth(self):
        """Test that Omnia sugar logs requires authentication"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-logs")
        assert response.status_code == 401
        print("✓ Omnia sugar logs correctly requires authentication")
    
    def test_omnia_hba1c_trend_public(self):
        """Test HbA1c trend endpoint (may be public or require auth)"""
        response = requests.get(f"{BASE_URL}/api/omnia/hba1c-trend")
        # This endpoint might return 200 with empty data or 401
        assert response.status_code in [200, 401]
        print(f"✓ HbA1c trend endpoint status: {response.status_code}")


class TestOmniaAuthenticated:
    """Test Omnia endpoints with authenticated user"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authenticated user for Omnia tests"""
        unique_id = str(uuid.uuid4().int)[:8]
        self.test_email = f"test_omnia_{unique_id}@example.com"
        self.test_phone = f"98765{unique_id[:5]}"
        
        # Register user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "phone": self.test_phone,
            "password": "TestPass123!",
            "name": "Test Omnia User"
        })
        if reg_response.status_code == 200:
            self.token = reg_response.json()["token"]
        else:
            # Try login if already exists
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_email,
                "password": "TestPass123!"
            })
            self.token = login_response.json()["token"]
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_omnia_profile(self):
        """Test getting Omnia profile for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/omnia/profile", headers=self.headers)
        assert response.status_code == 200
        print("✓ Omnia profile retrieved for authenticated user")
    
    def test_add_sugar_log(self):
        """Test adding a sugar log"""
        response = requests.post(f"{BASE_URL}/api/omnia/sugar-logs", 
            headers=self.headers,
            json={
                "type": "fbs",
                "value": "95",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "time": "08:00"
            }
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {"log": {...}, "status": "...", "success": true}
        assert "log" in data or "id" in data
        print(f"✓ Sugar log added successfully")
    
    def test_get_sugar_logs(self):
        """Test getting sugar logs"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-logs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns {"logs": [...]} structure
        assert "logs" in data
        assert isinstance(data["logs"], list)
        print(f"✓ Retrieved {len(data['logs'])} sugar logs")
    
    def test_get_sugar_stats(self):
        """Test getting sugar statistics"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print("✓ Sugar stats retrieved")
    
    def test_add_hba1c_log(self):
        """Test adding HbA1c log"""
        response = requests.post(f"{BASE_URL}/api/omnia/hba1c-logs",
            headers=self.headers,
            json={
                "value": 6.5,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "lab_name": "Test Lab"
            }
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {"log": {...}, "status": "...", "success": true}
        assert "log" in data or "id" in data
        print(f"✓ HbA1c log added successfully")
    
    def test_get_hba1c_logs(self):
        """Test getting HbA1c logs"""
        response = requests.get(f"{BASE_URL}/api/omnia/hba1c-logs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns {"logs": [...]} structure
        assert "logs" in data
        assert isinstance(data["logs"], list)
        print(f"✓ Retrieved {len(data['logs'])} HbA1c logs")


class TestAdminPortal:
    """Test Admin portal endpoints"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Admin login successful")
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Admin login correctly rejects wrong password")
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        token = login_response.json()["token"]
        
        # Get stats (correct endpoint is /api/admin/stats)
        response = requests.get(f"{BASE_URL}/api/admin/stats", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print("✓ Admin stats retrieved")
    
    def test_admin_appointments(self):
        """Test admin appointments endpoint"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        token = login_response.json()["token"]
        
        # Get appointments
        response = requests.get(f"{BASE_URL}/api/admin/appointments", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {"appointments": [...], "total": N}
        assert "appointments" in data
        assert isinstance(data["appointments"], list)
        print(f"✓ Admin appointments retrieved: {len(data['appointments'])} appointments")


class TestStaffPortal:
    """Test Staff portal endpoints"""
    
    def test_staff_login(self):
        """Test staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": "Nevika@2026D"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Staff login successful")
    
    def test_staff_login_wrong_credentials(self):
        """Test staff login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Staff login correctly rejects wrong credentials")
    
    def test_staff_doctor_appointments(self):
        """Test staff doctor appointments endpoint"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": "Nevika@2026D"
        })
        token = login_response.json()["token"]
        
        # Get doctor appointments (correct endpoint)
        response = requests.get(f"{BASE_URL}/api/staff/doctor/appointments",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Staff doctor appointments retrieved: {len(data)} appointments")


class TestTrackOrder:
    """Test order tracking functionality"""
    
    def test_track_by_phone(self):
        """Test tracking orders by phone number"""
        response = requests.get(f"{BASE_URL}/api/guest/orders", params={
            "phone": "9876543210"
        })
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        assert "pharmacy_orders" in data
        assert "diagnostic_orders" in data
        print("✓ Order tracking by phone works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
