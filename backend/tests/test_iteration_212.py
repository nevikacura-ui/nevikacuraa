"""
Iteration 212 Test Suite
Tests for:
- Homepage 'For You' section (frontend only)
- Bottom nav labels (frontend only)
- QuickActions (frontend only)
- Appointment Calendar APIs
- Pre-consultation form API
- Home Test Scheduler API
- Prescription Wallet API
- Backend debug routes
- Pharmacy APIs
- Staff portal logins (dark theme)
"""
import pytest
import requests
import os
from dotenv import load_dotenv

# Load environment variables from frontend .env file
load_dotenv('/app/frontend/.env')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDebugRoutes:
    """Test extracted debug routes still work after modularization"""
    
    def test_diagnostics_booking_system(self):
        """GET /api/diagnostics/booking-system should return diagnostics info"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        print(f"Diagnostics: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        # Should return either diagnostics data or unavailable status
        assert "overall_status" in data or "status" in data or "error" in data
        print(f"Diagnostics response: overall_status={data.get('overall_status', 'N/A')}")
    
    def test_health_report_config(self):
        """GET /api/health-report/config should return config or 'Not configured'"""
        response = requests.get(f"{BASE_URL}/api/health-report/config")
        print(f"Health Report Config: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        # Should have admin_phones or message
        assert "admin_phones" in data or "message" in data or "error" in data
        print(f"Health config: {data}")
    
    def test_msg91_status(self):
        """GET /api/test/msg91-status should return connection status"""
        response = requests.get(f"{BASE_URL}/api/test/msg91-status")
        print(f"MSG91 Status: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        # API returns 'success' key instead of 'status'
        assert "success" in data or "status" in data
        print(f"MSG91 status: success={data.get('success', 'N/A')}, auth_key_configured={data.get('auth_key_configured', 'N/A')}")


class TestPharmacyV2APIs:
    """Test pharmacy v2 APIs - alternatives and prescription wallet"""
    
    def test_alternatives_by_name(self):
        """GET /api/pharmacy/v2/alternatives-by-name returns alternatives for generic name"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives-by-name?name=Paracetamol")
        print(f"Alternatives by name: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "search_term" in data
        assert "alternatives" in data
        print(f"Found {data.get('count', 0)} alternatives for Paracetamol")
    
    def test_prescription_wallet_fetch(self):
        """GET /api/prescriptions/wallet/{phone} returns prescriptions"""
        phone = "9403890429"
        response = requests.get(f"{BASE_URL}/api/prescriptions/wallet/{phone}")
        print(f"Prescription wallet: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "prescriptions" in data
        assert "count" in data or isinstance(data.get("prescriptions"), list)
        print(f"Found {len(data.get('prescriptions', []))} prescriptions for {phone}")
    
    def test_order_history(self):
        """GET /api/pharmacy/v2/order-history/{phone} returns past orders"""
        phone = "9403890429"
        response = requests.get(f"{BASE_URL}/api/pharmacy/v2/order-history/{phone}")
        print(f"Order history: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"Found {len(data.get('orders', []))} past orders")


class TestAppointmentV2APIs:
    """Test appointment v2 APIs - calendar, slots, home test"""
    
    def test_calendar_endpoint(self):
        """GET /api/appointments/v2/calendar returns calendar data"""
        response = requests.get(f"{BASE_URL}/api/appointments/v2/calendar?month=3&year=2026")
        print(f"Calendar API: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "year" in data
        assert "calendar" in data
        print(f"Calendar: {data.get('total_appointments', 0)} appointments in March 2026")
    
    def test_available_slots(self):
        """GET /api/appointments/v2/available-slots returns time slots"""
        response = requests.get(f"{BASE_URL}/api/appointments/v2/available-slots?date=2026-03-10")
        print(f"Available slots: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "slots" in data
        assert isinstance(data.get("slots"), list)
        print(f"Slots: {data.get('total_available', 0)} available on 2026-03-10")
    
    def test_pre_consultation_invalid_appointment(self):
        """POST /api/appointments/v2/pre-consultation returns 404 for invalid appointment"""
        response = requests.post(
            f"{BASE_URL}/api/appointments/v2/pre-consultation",
            json={
                "appointment_id": "test123",  # Invalid ID
                "chief_complaint": "Test complaint for testing purposes"
            }
        )
        print(f"Pre-consultation (invalid ID): Status={response.status_code}")
        # Should return 404 for non-existent appointment
        assert response.status_code == 404
        print("Pre-consultation correctly returns 404 for invalid appointment_id")
    
    def test_home_test_scheduler(self):
        """POST /api/appointments/v2/home-test schedules home collection"""
        response = requests.post(
            f"{BASE_URL}/api/appointments/v2/home-test",
            json={
                "patient_name": "TEST_Iteration212",
                "patient_phone": "9999999212",
                "address": "Test Address for Iteration 212",
                "tests": ["CBC", "Lipid Profile"],
                "preferred_date": "2026-03-15",
                "preferred_time": "Morning (7-10 AM)",
                "special_instructions": "Test iteration 212"
            }
        )
        print(f"Home test scheduler: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        assert "collection" in data
        collection = data.get("collection", {})
        assert collection.get("id", "").startswith("HC-")
        print(f"Home test scheduled: {collection.get('id')}")


class TestStaffLogin:
    """Test staff portal logins - all should work and redirect properly"""
    
    def test_staff_diagyn_login(self):
        """Staff login for DiaGyn portal"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        print(f"DiaGyn staff login: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"DiaGyn staff login successful, role: {data.get('staff', {}).get('role')}")
    
    def test_staff_mango_login(self):
        """Staff login for MangoLabs portal"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_mango", "password": "test1234"}
        )
        print(f"Mango staff login: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"Mango staff login successful, role: {data.get('staff', {}).get('role')}")
    
    def test_staff_orange_login(self):
        """Staff login for Orange Pharmacy portal"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_orange", "password": "test1234"}
        )
        print(f"Orange staff login: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"Orange staff login successful, role: {data.get('staff', {}).get('role')}")


class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_health_check(self):
        """GET /api/health returns OK status"""
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health check: Status={response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok" or "ok" in str(data).lower()
        print(f"Health: {data}")


# Run tests with pytest
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
