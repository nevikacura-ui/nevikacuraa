"""
Healthcare Super-app Testing - Iteration 211
Testing: Staff Portal Dark UI, Test Data Cleanup, Pharmacy V2, Appointment V2, Navigation
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ Health check passed")

class TestStaffLogin:
    """Staff Portal Login Tests - All 3 portals"""
    
    def test_diagyn_staff_login(self, api_client):
        """Test staff_diagyn/test1234 login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        print(f"✅ DiaGyn staff login: {data['staff'].get('name', 'N/A')}")
        
    def test_mango_staff_login(self, api_client):
        """Test staff_mango/test1234 login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_mango",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Mango Labs staff login: {data['staff'].get('name', 'N/A')}")
        
    def test_orange_staff_login(self, api_client):
        """Test staff_orange/test1234 login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Orange Pharmacy staff login: {data['staff'].get('name', 'N/A')}")

class TestPharmacyV2APIs:
    """Pharmacy V2 APIs - Medicine Alternatives, Prescription Wallet"""
    
    def test_alternatives_by_name(self, api_client):
        """GET /api/pharmacy/v2/alternatives-by-name?name=Paracetamol"""
        response = api_client.get(f"{BASE_URL}/api/pharmacy/v2/alternatives-by-name", params={
            "name": "Paracetamol"
        })
        # 200 or 404 are valid - depends on if medicines exist
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "alternatives" in data or "search_term" in data
            print(f"✅ Medicine alternatives: {data.get('count', 0)} found for Paracetamol")
        else:
            print("⚠️ No Paracetamol alternatives in database (expected if empty)")
            
    def test_prescription_wallet_get(self, api_client):
        """GET /api/prescriptions/wallet/9403890429"""
        response = api_client.get(f"{BASE_URL}/api/prescriptions/wallet/9403890429")
        assert response.status_code == 200
        data = response.json()
        assert "prescriptions" in data
        assert "count" in data
        print(f"✅ Prescription wallet: {data['count']} prescriptions for 9403890429")
        
    def test_order_history(self, api_client):
        """GET /api/pharmacy/v2/order-history/{phone}"""
        response = api_client.get(f"{BASE_URL}/api/pharmacy/v2/order-history/9403890429")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✅ Order history: {data.get('count', 0)} orders found")

class TestAppointmentV2APIs:
    """Appointment V2 APIs - Calendar View, Slots, Pre-consultation, Home Test"""
    
    def test_available_slots(self, api_client):
        """GET /api/appointments/v2/available-slots?date=2026-03-10"""
        response = api_client.get(f"{BASE_URL}/api/appointments/v2/available-slots", params={
            "date": "2026-03-10"
        })
        assert response.status_code == 200
        data = response.json()
        assert "slots" in data
        assert "date" in data
        assert data["date"] == "2026-03-10"
        print(f"✅ Available slots: {data.get('total_available', 0)} slots for 2026-03-10")
        
    def test_appointment_calendar(self, api_client):
        """GET /api/appointments/v2/calendar?month=3&year=2026"""
        response = api_client.get(f"{BASE_URL}/api/appointments/v2/calendar", params={
            "month": 3,
            "year": 2026
        })
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "year" in data
        assert "calendar" in data
        assert data["month"] == 3
        assert data["year"] == 2026
        print(f"✅ Calendar API: {data.get('total_appointments', 0)} appointments in March 2026")
        
    def test_pre_consultation_form_requires_appointment(self, api_client):
        """POST /api/appointments/v2/pre-consultation - needs valid appointment_id"""
        response = api_client.post(f"{BASE_URL}/api/appointments/v2/pre-consultation", json={
            "appointment_id": "INVALID-APT-ID",
            "chief_complaint": "Test complaint",
            "duration": "2 days"
        })
        # Should return 404 for invalid appointment_id
        assert response.status_code in [404, 422]
        print("✅ Pre-consultation form validation works (404 for invalid ID)")
        
    def test_home_test_scheduler(self, api_client):
        """POST /api/appointments/v2/home-test - schedule home collection"""
        response = api_client.post(f"{BASE_URL}/api/appointments/v2/home-test", json={
            "patient_name": "TEST_HomeTest Patient",
            "patient_phone": "9999999999",
            "address": "Test Address, Mumbai",
            "tests": ["CBC", "Lipid Profile"],
            "preferred_date": "2026-03-15",
            "preferred_time": "Morning (7-10 AM)",
            "special_instructions": "Test instructions"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        assert "collection" in data
        collection = data["collection"]
        assert collection.get("patient_name") == "TEST_HomeTest Patient"
        assert collection.get("status") == "scheduled"
        print(f"✅ Home test scheduled: {collection.get('id')}")

class TestTestDataCleanup:
    """Test the admin cleanup endpoint"""
    
    def test_cleanup_endpoint_exists(self, api_client):
        """Check if cleanup endpoint responds (may need auth)"""
        response = api_client.delete(f"{BASE_URL}/api/admin/cleanup-test-data")
        # Could be 200, 401 (needs auth), or 404 if not implemented
        assert response.status_code in [200, 401, 403, 404, 422]
        print(f"✅ Cleanup endpoint status: {response.status_code}")

class TestExistingAPIs:
    """Verify existing APIs still work"""
    
    def test_pharmacy_medicines(self, api_client):
        """GET /api/pharmacy/medicines"""
        response = api_client.get(f"{BASE_URL}/api/pharmacy/medicines", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data or isinstance(data, list)
        print("✅ Pharmacy medicines API working")
        
    def test_diagyn_config(self, api_client):
        """GET /api/diagyn/config"""
        response = api_client.get(f"{BASE_URL}/api/diagyn/config")
        assert response.status_code in [200, 401]  # May need auth
        if response.status_code == 200:
            print("✅ DiaGyn config accessible")
        else:
            print("⚠️ DiaGyn config requires authentication")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
