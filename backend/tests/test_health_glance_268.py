"""
Test suite for Health At-a-Glance and Smart Reminders Check Notifications features
Iteration 268 - Home Page Personalization

Tests:
- GET /api/health-glance/{phone} - Aggregated health data
- POST /api/smart-reminders/check-notifications - Push notification trigger
- GET /api/smart-reminders/today/{phone} - Today's reminders (regression)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')
TEST_PHONE = "9833188288"


class TestHealthGlanceAPI:
    """Tests for /api/health-glance/{phone} endpoint"""
    
    def test_health_glance_returns_200(self):
        """Test that health-glance endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/health-glance/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"SUCCESS: GET /api/health-glance/{TEST_PHONE} returns 200")
    
    def test_health_glance_response_structure(self):
        """Test that health-glance returns correct data structure"""
        response = requests.get(f"{BASE_URL}/api/health-glance/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        # Check required fields exist
        required_fields = [
            "active_reminders",
            "medical_records",
            "health_streak",
            "cura_coins",
            "completed_today",
            "next_appointment"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"SUCCESS: health-glance response has all required fields")
    
    def test_health_glance_data_types(self):
        """Test that health-glance returns correct data types"""
        response = requests.get(f"{BASE_URL}/api/health-glance/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify data types
        assert isinstance(data.get("active_reminders"), int), "active_reminders should be int"
        assert isinstance(data.get("medical_records"), int), "medical_records should be int"
        assert isinstance(data.get("health_streak"), int), "health_streak should be int"
        assert isinstance(data.get("cura_coins"), int), "cura_coins should be int"
        assert isinstance(data.get("completed_today"), int), "completed_today should be int"
        # next_appointment can be None or dict
        assert data.get("next_appointment") is None or isinstance(data.get("next_appointment"), dict), \
            "next_appointment should be None or dict"
        
        print(f"SUCCESS: health-glance data types are correct")
    
    def test_health_glance_values_match_test_data(self):
        """Test that health-glance returns expected values for test user"""
        response = requests.get(f"{BASE_URL}/api/health-glance/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Test user should have 2 active reminders and 1 medical record
        assert data.get("active_reminders") == 2, f"Expected 2 active reminders, got {data.get('active_reminders')}"
        assert data.get("medical_records") == 1, f"Expected 1 medical record, got {data.get('medical_records')}"
        
        print(f"SUCCESS: health-glance values match test data (2 reminders, 1 record)")
    
    def test_health_glance_nonexistent_phone(self):
        """Test health-glance with non-existent phone returns zeros"""
        response = requests.get(f"{BASE_URL}/api/health-glance/0000000000")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("active_reminders") == 0
        assert data.get("medical_records") == 0
        
        print(f"SUCCESS: health-glance returns zeros for non-existent phone")


class TestCheckNotificationsAPI:
    """Tests for /api/smart-reminders/check-notifications endpoint"""
    
    def test_check_notifications_returns_200(self):
        """Test that check-notifications endpoint returns 200 OK"""
        response = requests.post(f"{BASE_URL}/api/smart-reminders/check-notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"SUCCESS: POST /api/smart-reminders/check-notifications returns 200")
    
    def test_check_notifications_response_structure(self):
        """Test that check-notifications returns correct data structure"""
        response = requests.post(f"{BASE_URL}/api/smart-reminders/check-notifications")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "checked" in data, "Response should have 'checked' field"
        assert "sent" in data, "Response should have 'sent' field"
        
        print(f"SUCCESS: check-notifications response has correct structure")
    
    def test_check_notifications_data_types(self):
        """Test that check-notifications returns correct data types"""
        response = requests.post(f"{BASE_URL}/api/smart-reminders/check-notifications")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data.get("success"), bool), "success should be bool"
        assert isinstance(data.get("checked"), int), "checked should be int"
        assert isinstance(data.get("sent"), int), "sent should be int"
        
        print(f"SUCCESS: check-notifications data types are correct")


class TestTodayRemindersAPI:
    """Regression tests for /api/smart-reminders/today/{phone} endpoint"""
    
    def test_today_reminders_returns_200(self):
        """Test that today reminders endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/today/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"SUCCESS: GET /api/smart-reminders/today/{TEST_PHONE} returns 200")
    
    def test_today_reminders_response_structure(self):
        """Test that today reminders returns correct data structure"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/today/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "date" in data
        assert "upcoming" in data
        assert "past" in data
        assert "total_today" in data
        
        print(f"SUCCESS: today reminders response has correct structure")
    
    def test_today_reminders_has_test_data(self):
        """Test that today reminders returns expected test data"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/today/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        upcoming = data.get("upcoming", [])
        
        # Should have Morning Vitamins and Evening Walk
        titles = [r.get("title") for r in upcoming]
        assert "Morning Vitamins" in titles or "Evening Walk" in titles, \
            f"Expected test reminders, got {titles}"
        
        print(f"SUCCESS: today reminders contains test data")


class TestMedicalRecordsRegression:
    """Regression tests for Medical Records API"""
    
    def test_medical_records_stats(self):
        """Test medical records stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/medical-records/stats/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "total_records" in data or "total_files" in data
        
        print(f"SUCCESS: Medical records stats API working")
    
    def test_medical_records_list(self):
        """Test medical records list endpoint"""
        response = requests.get(f"{BASE_URL}/api/medical-records/list/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "records" in data
        
        print(f"SUCCESS: Medical records list API working")


class TestSmartRemindersRegression:
    """Regression tests for Smart Reminders API"""
    
    def test_smart_reminders_stats(self):
        """Test smart reminders stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/stats/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"SUCCESS: Smart reminders stats API working")
    
    def test_smart_reminders_list(self):
        """Test smart reminders list endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/list/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "reminders" in data
        
        print(f"SUCCESS: Smart reminders list API working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
