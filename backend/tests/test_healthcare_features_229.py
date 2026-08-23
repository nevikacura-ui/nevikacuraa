"""
Healthcare Super-App Feature Tests - Iteration 229
Tests: Medicine Reminders API, Family Health API, Prescription Scanner API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")


class TestPrescriptionScannerAPI:
    """Tests for /api/prescription/extract endpoint"""
    
    def test_prescription_common_medicines(self):
        """GET /api/prescription/common-medicines - should return common medicines list"""
        response = requests.get(f"{BASE_URL}/api/prescription/common-medicines")
        assert response.status_code == 200
        data = response.json()
        assert "common_medicines" in data
        assert len(data["common_medicines"]) > 0
        # Verify structure
        med = data["common_medicines"][0]
        assert "name" in med
        assert "category" in med
        print(f"✓ Common medicines API returned {len(data['common_medicines'])} items")
    
    def test_prescription_extract_no_file(self):
        """POST /api/prescription/extract without file should fail"""
        response = requests.post(f"{BASE_URL}/api/prescription/extract")
        assert response.status_code == 422  # Unprocessable Entity - missing file
        print("✓ Prescription extract correctly rejects missing file")


class TestFamilyHealthAPI:
    """Tests for /api/family/* endpoints"""
    
    def test_get_family_members(self):
        """GET /api/family/members/{phone} - should return member list"""
        test_phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/family/members/{test_phone}")
        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert isinstance(data["members"], list)
        print(f"✓ Family members API returned {len(data['members'])} members for {test_phone}")
    
    def test_add_family_member(self):
        """POST /api/family/members - should add a family member"""
        test_phone = "9876543210"
        member_data = {
            "name": "TEST_Family_Member_229",
            "relation": "spouse",
            "age": 35,
            "blood_group": "O+"
        }
        response = requests.post(
            f"{BASE_URL}/api/family/members?phone={test_phone}",
            json=member_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "member" in data
        assert data["member"]["name"] == member_data["name"]
        assert data["member"]["relation"] == member_data["relation"]
        print(f"✓ Successfully added family member: {member_data['name']}")
        
        # Verify persistence with GET
        response2 = requests.get(f"{BASE_URL}/api/family/members/{test_phone}")
        data2 = response2.json()
        member_names = [m["name"] for m in data2.get("members", [])]
        assert member_data["name"] in member_names
        print(f"✓ Family member persisted in database")
        return data["member"].get("id")
    
    def test_family_member_missing_phone(self):
        """POST /api/family/members without phone should fail"""
        member_data = {"name": "Test", "relation": "child"}
        response = requests.post(
            f"{BASE_URL}/api/family/members",
            json=member_data
        )
        assert response.status_code == 400
        print("✓ Family API correctly rejects missing phone")


class TestMedicineRemindersAPI:
    """Tests for /api/medicine-reminders/* endpoints - requires auth"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token via staff login"""
        login_data = {"username": "admin", "password": "test1234"}
        response = requests.post(f"{BASE_URL}/api/staff/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_my_reminders_no_auth(self):
        """GET /api/medicine-reminders/my-reminders without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        assert response.status_code == 401
        print("✓ Medicine reminders API correctly requires auth")
    
    def test_today_schedule_no_auth(self):
        """GET /api/medicine-reminders/today without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/medicine-reminders/today")
        assert response.status_code == 401
        print("✓ Today schedule API correctly requires auth")
    
    def test_create_reminder_no_auth(self):
        """POST /api/medicine-reminders/create without auth should fail"""
        reminder_data = {
            "medicine_name": "Test Medicine",
            "dosage": "1 tablet",
            "frequency": "once_daily",
            "time_slots": ["09:00"],
            "start_date": "2026-01-20"
        }
        response = requests.post(
            f"{BASE_URL}/api/medicine-reminders/create",
            json=reminder_data
        )
        assert response.status_code == 401
        print("✓ Create reminder API correctly requires auth")
    
    def test_my_reminders_with_auth(self, auth_token):
        """GET /api/medicine-reminders/my-reminders with auth should succeed"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/medicine-reminders/my-reminders",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "reminders" in data
        assert "stats" in data
        print(f"✓ My reminders returned: {len(data.get('reminders', []))} reminders")
    
    def test_today_schedule_with_auth(self, auth_token):
        """GET /api/medicine-reminders/today with auth should succeed"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/medicine-reminders/today",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "schedule" in data
        assert "stats" in data
        print(f"✓ Today schedule returned: {len(data.get('schedule', []))} items")


class TestHealthPlansAPI:
    """Tests for /api/health-plans endpoints"""
    
    def test_get_health_plans(self):
        """GET /api/health-plans should return available plans"""
        response = requests.get(f"{BASE_URL}/api/health-plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) > 0
        # Verify plan structure
        plan = data["plans"][0]
        assert "id" in plan
        assert "name" in plan
        assert "price" in plan
        print(f"✓ Health plans API returned {len(data['plans'])} plans")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_family_member(self):
        """Clean up test family member"""
        test_phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/family/members/{test_phone}")
        if response.status_code == 200:
            members = response.json().get("members", [])
            for member in members:
                if member.get("name", "").startswith("TEST_"):
                    member_id = member.get("id")
                    if member_id:
                        del_response = requests.delete(f"{BASE_URL}/api/family/members/{member_id}")
                        if del_response.status_code == 200:
                            print(f"✓ Cleaned up test member: {member.get('name')}")
        print("✓ Cleanup complete")
