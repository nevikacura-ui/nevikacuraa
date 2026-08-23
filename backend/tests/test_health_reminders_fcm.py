"""
Test Health Reminders FCM API - Iteration 186
Tests the new Firebase FCM Health Reminders system:
- GET /api/health-reminders/defaults/{portal} - Portal-specific default reminders (no auth)
- POST /api/health-reminders/configure - Enable/disable reminders (requires auth)
- POST /api/health-reminders/test-notification - Send test notification (requires auth)
- GET /api/health-reminders/my-reminders - User's configured reminders (requires auth)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthRemindersDefaults:
    """Test portal-specific default reminders (no auth required)"""

    def test_evara_defaults_returns_3_reminders(self):
        """Evara should return 3 reminders: period_log, pms_check, hydration"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/evara")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reminders" in data, "Response should contain 'reminders' key"
        assert len(data["reminders"]) == 3, f"Evara should have 3 reminders, got {len(data['reminders'])}"
        
        reminder_ids = [r["id"] for r in data["reminders"]]
        assert "period_log" in reminder_ids, "Evara should have 'period_log' reminder"
        assert "pms_check" in reminder_ids, "Evara should have 'pms_check' reminder"
        assert "hydration" in reminder_ids, "Evara should have 'hydration' reminder"
        
        # Verify reminder structure
        for r in data["reminders"]:
            assert "id" in r, "Reminder should have 'id'"
            assert "title" in r, "Reminder should have 'title'"
            assert "body" in r, "Reminder should have 'body'"
            assert "time" in r, "Reminder should have 'time'"
            assert "portal" in r, "Reminder should have 'portal'"
            assert r["portal"] == "evara", f"Portal should be 'evara', got {r['portal']}"

    def test_glydex_defaults_returns_4_reminders(self):
        """Glydex should return 4 reminders: fbs_morning, ppbs_lunch, ppbs_dinner, medicine"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/glydex")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reminders" in data, "Response should contain 'reminders' key"
        assert len(data["reminders"]) == 4, f"Glydex should have 4 reminders, got {len(data['reminders'])}"
        
        reminder_ids = [r["id"] for r in data["reminders"]]
        assert "fbs_morning" in reminder_ids, "Glydex should have 'fbs_morning' reminder"
        assert "ppbs_lunch" in reminder_ids, "Glydex should have 'ppbs_lunch' reminder"
        assert "ppbs_dinner" in reminder_ids, "Glydex should have 'ppbs_dinner' reminder"
        assert "medicine" in reminder_ids, "Glydex should have 'medicine' reminder"

    def test_reneu_defaults_returns_4_reminders(self):
        """Reneu should return 4 reminders: morning_workout, meditation, sleep_log, skin_routine"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/reneu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reminders" in data, "Response should contain 'reminders' key"
        assert len(data["reminders"]) == 4, f"Reneu should have 4 reminders, got {len(data['reminders'])}"
        
        reminder_ids = [r["id"] for r in data["reminders"]]
        assert "morning_workout" in reminder_ids, "Reneu should have 'morning_workout' reminder"
        assert "meditation" in reminder_ids, "Reneu should have 'meditation' reminder"
        assert "sleep_log" in reminder_ids, "Reneu should have 'sleep_log' reminder"
        assert "skin_routine" in reminder_ids, "Reneu should have 'skin_routine' reminder"

    def test_alyne_defaults_returns_3_reminders(self):
        """Alyne should return 3 reminders: feeding, vaccination, growth_track"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/alyne")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reminders" in data, "Response should contain 'reminders' key"
        assert len(data["reminders"]) == 3, f"Alyne should have 3 reminders, got {len(data['reminders'])}"
        
        reminder_ids = [r["id"] for r in data["reminders"]]
        assert "feeding" in reminder_ids, "Alyne should have 'feeding' reminder"
        assert "vaccination" in reminder_ids, "Alyne should have 'vaccination' reminder"
        assert "growth_track" in reminder_ids, "Alyne should have 'growth_track' reminder"

    def test_invalid_portal_returns_404(self):
        """Invalid portal should return 404"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/invalid_portal")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestHealthRemindersAuthenticated:
    """Test authenticated health reminders endpoints"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token by logging in"""
        response = requests.post(f"{BASE_URL}/api/auth/patient/login", json={
            "email": "apitest@nevika.com",
            "password": "test1234"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Auth failed: {response.status_code} - {response.text}")

    def test_configure_reminder_toggle_on(self, auth_token):
        """Configure endpoint should enable a reminder"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "reminder_id": "period_log",
                "portal": "evara",
                "enabled": True,
                "time": "09:00"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "reminder" in data, "Response should contain 'reminder' key"
        assert data["reminder"]["enabled"] == True, "Reminder should be enabled"
        assert data["reminder"]["reminder_id"] == "period_log", "reminder_id should match"

    def test_configure_reminder_toggle_off(self, auth_token):
        """Configure endpoint should disable a reminder"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "reminder_id": "pms_check",
                "portal": "evara",
                "enabled": False
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data["reminder"]["enabled"] == False, "Reminder should be disabled"

    def test_configure_invalid_reminder_returns_404(self, auth_token):
        """Configure with invalid reminder_id should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "reminder_id": "invalid_reminder",
                "portal": "evara",
                "enabled": True
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_configure_without_auth_returns_401(self):
        """Configure without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Content-Type": "application/json"},
            json={
                "reminder_id": "period_log",
                "portal": "evara",
                "enabled": True
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_get_my_reminders(self, auth_token):
        """Get user's configured reminders"""
        response = requests.get(
            f"{BASE_URL}/api/health-reminders/my-reminders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reminders" in data, "Response should contain 'reminders' key"
        assert isinstance(data["reminders"], list), "Reminders should be a list"

    def test_test_notification_endpoint(self, auth_token):
        """Test notification endpoint should work (may return no devices message)"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/test-notification",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "title": "Test Notification",
                "body": "This is a test notification from API test"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # success can be True (sent) or False (no devices)
        assert "success" in data, "Response should have 'success' field"
        if not data["success"]:
            assert "message" in data, "Failed response should have 'message'"

    def test_test_notification_without_auth_returns_401(self):
        """Test notification without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/test-notification",
            headers={"Content-Type": "application/json"},
            json={
                "title": "Test",
                "body": "Test body"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestGlydexRemindersIntegration:
    """Test Glydex-specific reminder configurations"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/patient/login", json={
            "email": "apitest@nevika.com",
            "password": "test1234"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Auth failed")

    def test_configure_morning_sugar_reminder(self, auth_token):
        """Configure Glydex morning sugar check reminder"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "reminder_id": "fbs_morning",
                "portal": "glydex",
                "enabled": True,
                "time": "07:00"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["reminder"]["title"] == "Morning Sugar Check"

    def test_configure_medicine_reminder(self, auth_token):
        """Configure Glydex medicine reminder"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "reminder_id": "medicine",
                "portal": "glydex",
                "enabled": True,
                "time": "08:00"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["reminder"]["title"] == "Medicine Reminder"


class TestReneuRemindersIntegration:
    """Test Reneu-specific reminder configurations"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/patient/login", json={
            "email": "apitest@nevika.com",
            "password": "test1234"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Auth failed")

    def test_configure_workout_reminder(self, auth_token):
        """Configure Reneu morning workout reminder"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "reminder_id": "morning_workout",
                "portal": "reneu",
                "enabled": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["reminder"]["title"] == "Morning Workout"

    def test_configure_skincare_reminder(self, auth_token):
        """Configure Reneu evening skincare reminder"""
        response = requests.post(
            f"{BASE_URL}/api/health-reminders/configure",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "reminder_id": "skin_routine",
                "portal": "reneu",
                "enabled": True,
                "time": "21:00"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["reminder"]["title"] == "Evening Skincare"
