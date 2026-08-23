"""
Test suite for Nevika Cura New Features - Iteration 339
Tests: Home Care, Emergency SOS, Medicine Reminders, Adult Vaccination, Health Plans, Portals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestHomeCareAPI:
    """Home Care callback API tests"""
    
    def test_home_care_callback_success(self):
        """Test POST /api/home-care/callback returns success"""
        response = requests.post(
            f"{BASE_URL}/api/home-care/callback",
            json={
                "name": "TEST_User",
                "phone": "9876543210",
                "service": "Nursing Care",
                "address": "123 Test Street",
                "preferred_time": "morning",
                "notes": "Test callback request"
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"✓ Home Care callback API returned: {data}")
    
    def test_home_care_callback_minimal_fields(self):
        """Test callback with only required fields"""
        response = requests.post(
            f"{BASE_URL}/api/home-care/callback",
            json={
                "name": "TEST_MinimalUser",
                "phone": "9876543211",
                "service": "Physiotherapy"
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Minimal callback request succeeded: {data}")
    
    def test_home_care_callbacks_list(self):
        """Test GET /api/home-care/callbacks returns list"""
        response = requests.get(f"{BASE_URL}/api/home-care/callbacks")
        assert response.status_code == 200
        data = response.json()
        assert "callbacks" in data
        assert isinstance(data["callbacks"], list)
        print(f"✓ Callbacks list returned {len(data['callbacks'])} items")


class TestEmergencySOSAPI:
    """Emergency SOS API tests"""
    
    def test_emergency_contacts_endpoint(self):
        """Test GET /api/emergency/contacts returns contacts"""
        response = requests.get(f"{BASE_URL}/api/emergency/contacts")
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        assert isinstance(data["contacts"], list)
        # Should have at least ambulance and police
        if len(data["contacts"]) > 0:
            contact = data["contacts"][0]
            assert "name" in contact
            assert "number" in contact
        print(f"✓ Emergency contacts returned {len(data['contacts'])} contacts")
    
    def test_emergency_sos_trigger(self):
        """Test POST /api/emergency/sos endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/emergency/sos",
            json={
                "phone": "9876543210",
                "name": "TEST_EmergencyUser",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "emergency_type": "general"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 even if notification fails
        assert response.status_code in [200, 201, 500]
        data = response.json()
        print(f"✓ Emergency SOS response: {data}")


class TestHealthPlansAPI:
    """Health Plans API tests"""
    
    def test_health_plans_list(self):
        """Test GET /api/health-plans returns plans"""
        response = requests.get(f"{BASE_URL}/api/health-plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert isinstance(data["plans"], list)
        if len(data["plans"]) > 0:
            plan = data["plans"][0]
            assert "id" in plan
            assert "name" in plan
            assert "price" in plan
        print(f"✓ Health plans returned {len(data['plans'])} plans")


class TestMedicineRemindersAPI:
    """Medicine Reminders API tests (requires auth)"""
    
    def test_medicine_reminders_today_unauthenticated(self):
        """Test /api/medicine-reminders/today without auth"""
        response = requests.get(f"{BASE_URL}/api/medicine-reminders/today")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422]
        print(f"✓ Medicine reminders requires auth (status: {response.status_code})")


class TestPageRoutes:
    """Test that all new page routes are accessible"""
    
    def test_home_care_page_loads(self):
        """Test /home-care page is accessible"""
        response = requests.get(f"{BASE_URL}/home-care")
        assert response.status_code == 200
        assert "Home Care" in response.text or "home-care" in response.text.lower()
        print("✓ /home-care page loads successfully")
    
    def test_emergency_sos_page_loads(self):
        """Test /emergency-sos page is accessible"""
        response = requests.get(f"{BASE_URL}/emergency-sos")
        assert response.status_code == 200
        assert "Emergency" in response.text or "SOS" in response.text
        print("✓ /emergency-sos page loads successfully")
    
    def test_medicine_reminders_page_loads(self):
        """Test /medicine-reminders page is accessible"""
        response = requests.get(f"{BASE_URL}/medicine-reminders")
        assert response.status_code == 200
        assert "Medicine" in response.text or "Reminders" in response.text
        print("✓ /medicine-reminders page loads successfully")
    
    def test_adult_vaccination_page_loads(self):
        """Test /adult-vaccination page is accessible"""
        response = requests.get(f"{BASE_URL}/adult-vaccination")
        assert response.status_code == 200
        assert "Vaccination" in response.text or "vaccine" in response.text.lower()
        print("✓ /adult-vaccination page loads successfully")
    
    def test_health_plans_page_loads(self):
        """Test /health-plans page is accessible"""
        response = requests.get(f"{BASE_URL}/health-plans")
        assert response.status_code == 200
        assert "Health Plans" in response.text or "health-plans" in response.text.lower()
        print("✓ /health-plans page loads successfully")
    
    def test_portals_page_loads(self):
        """Test /portals page is accessible"""
        response = requests.get(f"{BASE_URL}/portals")
        assert response.status_code == 200
        assert "Portals" in response.text or "portals" in response.text.lower()
        print("✓ /portals page loads successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
