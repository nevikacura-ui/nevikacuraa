"""
Test Suite for Smart Medicine Reminders API
Tests all CRUD operations and medicine tracking functionality
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://patientcare-42.preview.emergentagent.com')

# Test user credentials
TEST_EMAIL = "testmed@test.com"
TEST_PASSWORD = "test123"


class TestMedicineRemindersAPI:
    """Test suite for Medicine Reminders API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.user = login_response.json().get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    # ============ Authentication Tests ============
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are rejected"""
        # Create new session without auth
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        
        assert response.status_code == 401
        assert "Authentication required" in response.json().get("detail", "")
        print("✅ Unauthenticated access correctly denied")
    
    # ============ Get Reminders Tests ============
    
    def test_get_my_reminders(self):
        """Test getting user's medicine reminders"""
        response = self.session.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "reminders" in data
        assert "stats" in data
        assert "low_stock_alerts" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_active" in stats
        assert "adherence_rate_7d" in stats
        assert "low_stock_count" in stats
        assert "doses_taken_7d" in stats
        
        print(f"✅ Get my reminders: {len(data['reminders'])} reminders found")
        print(f"   Stats: Active={stats['total_active']}, Adherence={stats['adherence_rate_7d']}%")
    
    def test_get_today_schedule(self):
        """Test getting today's medicine schedule"""
        response = self.session.get(f"{BASE_URL}/api/medicine-reminders/today")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "date" in data
        assert "current_time" in data
        assert "schedule" in data
        assert "stats" in data
        
        # Verify schedule items have required fields
        for item in data["schedule"]:
            assert "reminder_id" in item
            assert "medicine_name" in item
            assert "dosage" in item
            assert "time_slot" in item
            assert "status" in item
            assert item["status"] in ["pending", "taken", "skipped", "missed"]
        
        print(f"✅ Get today's schedule: {len(data['schedule'])} items")
        print(f"   Date: {data['date']}, Time: {data['current_time']}")
    
    def test_get_adherence_history(self):
        """Test getting adherence history"""
        response = self.session.get(f"{BASE_URL}/api/medicine-reminders/adherence-history?days=14")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "period_days" in data
        assert data["period_days"] == 14
        assert "history" in data
        assert "overall_stats" in data
        
        # Verify overall stats structure
        overall = data["overall_stats"]
        assert "total_doses" in overall
        assert "doses_taken" in overall
        assert "doses_missed" in overall
        assert "adherence_rate" in overall
        
        print(f"✅ Get adherence history: {len(data['history'])} days of data")
        print(f"   Overall: {overall['doses_taken']}/{overall['total_doses']} doses taken")
    
    # ============ Create Reminder Tests ============
    
    def test_create_reminder_success(self):
        """Test creating a new medicine reminder"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        reminder_data = {
            "medicine_name": f"TEST_Medicine_{uuid.uuid4().hex[:6]}",
            "dosage": "1 tablet",
            "frequency": "once_daily",
            "time_slots": ["10:00"],
            "start_date": today,
            "end_date": None,
            "notes": "Test reminder - can be deleted",
            "total_quantity": 30
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/create",
            json=reminder_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "reminder_id" in data
        assert "message" in data
        
        # Store reminder_id for cleanup
        self.created_reminder_id = data["reminder_id"]
        
        print(f"✅ Create reminder: {data['reminder_id']}")
        print(f"   Medicine: {reminder_data['medicine_name']}")
        
        # Verify reminder was created by fetching it
        verify_response = self.session.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        assert verify_response.status_code == 200
        reminders = verify_response.json()["reminders"]
        
        created_reminder = next((r for r in reminders if r["id"] == data["reminder_id"]), None)
        assert created_reminder is not None
        assert created_reminder["medicine_name"] == reminder_data["medicine_name"]
        assert created_reminder["dosage"] == reminder_data["dosage"]
        
        print(f"✅ Verified reminder persisted in database")
        
        # Cleanup - delete the test reminder
        self.session.delete(f"{BASE_URL}/api/medicine-reminders/{data['reminder_id']}")
    
    def test_create_reminder_validation(self):
        """Test that required fields are validated"""
        # Missing medicine_name
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/create",
            json={
                "dosage": "1 tablet",
                "frequency": "once_daily",
                "time_slots": ["10:00"],
                "start_date": datetime.now().strftime("%Y-%m-%d")
            }
        )
        
        # Should fail validation
        assert response.status_code in [400, 422]
        print("✅ Validation correctly rejects missing medicine_name")
    
    # ============ Log Medicine Tests ============
    
    def test_log_medicine_taken(self):
        """Test logging medicine as taken"""
        # First get a reminder to log
        reminders_response = self.session.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        reminders = reminders_response.json().get("reminders", [])
        
        if not reminders:
            pytest.skip("No reminders available to test logging")
        
        reminder_id = reminders[0]["id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/log",
            json={
                "reminder_id": reminder_id,
                "skipped": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "message" in data
        
        print(f"✅ Log medicine taken: {data['message']}")
    
    def test_log_medicine_skipped(self):
        """Test logging medicine as skipped"""
        # First get a reminder to log
        reminders_response = self.session.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        reminders = reminders_response.json().get("reminders", [])
        
        if not reminders:
            pytest.skip("No reminders available to test logging")
        
        reminder_id = reminders[0]["id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/log",
            json={
                "reminder_id": reminder_id,
                "skipped": True,
                "skip_reason": "Test skip"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        
        print(f"✅ Log medicine skipped: {data['message']}")
    
    def test_log_invalid_reminder(self):
        """Test logging with invalid reminder ID"""
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/log",
            json={
                "reminder_id": "invalid-id-12345",
                "skipped": False
            }
        )
        
        assert response.status_code == 404
        print("✅ Invalid reminder ID correctly returns 404")
    
    # ============ Update Reminder Tests ============
    
    def test_update_reminder(self):
        """Test updating a medicine reminder"""
        # First create a reminder to update
        today = datetime.now().strftime("%Y-%m-%d")
        
        create_response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/create",
            json={
                "medicine_name": f"TEST_Update_{uuid.uuid4().hex[:6]}",
                "dosage": "1 tablet",
                "frequency": "once_daily",
                "time_slots": ["10:00"],
                "start_date": today,
                "total_quantity": 30
            }
        )
        
        reminder_id = create_response.json()["reminder_id"]
        
        # Update the reminder
        update_response = self.session.put(
            f"{BASE_URL}/api/medicine-reminders/{reminder_id}",
            json={
                "notes": "Updated notes",
                "remaining_quantity": 25
            }
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        
        assert "success" in data
        assert data["success"] == True
        
        print(f"✅ Update reminder: {data['message']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/medicine-reminders/{reminder_id}")
    
    # ============ Delete Reminder Tests ============
    
    def test_delete_reminder(self):
        """Test deleting (deactivating) a medicine reminder"""
        # First create a reminder to delete
        today = datetime.now().strftime("%Y-%m-%d")
        
        create_response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/create",
            json={
                "medicine_name": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
                "dosage": "1 tablet",
                "frequency": "once_daily",
                "time_slots": ["10:00"],
                "start_date": today,
                "total_quantity": 30
            }
        )
        
        reminder_id = create_response.json()["reminder_id"]
        
        # Delete the reminder
        delete_response = self.session.delete(
            f"{BASE_URL}/api/medicine-reminders/{reminder_id}"
        )
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        
        assert "success" in data
        assert data["success"] == True
        
        print(f"✅ Delete reminder: {data['message']}")
        
        # Verify reminder is no longer in active list
        verify_response = self.session.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        reminders = verify_response.json()["reminders"]
        
        deleted_reminder = next((r for r in reminders if r["id"] == reminder_id), None)
        assert deleted_reminder is None
        
        print("✅ Verified reminder removed from active list")
    
    def test_delete_nonexistent_reminder(self):
        """Test deleting a non-existent reminder"""
        response = self.session.delete(
            f"{BASE_URL}/api/medicine-reminders/nonexistent-id-12345"
        )
        
        assert response.status_code == 404
        print("✅ Delete non-existent reminder correctly returns 404")
    
    # ============ Import from Prescription Tests ============
    
    def test_import_from_invalid_prescription(self):
        """Test importing from non-existent prescription"""
        response = self.session.post(
            f"{BASE_URL}/api/medicine-reminders/from-prescription/invalid-prescription-id"
        )
        
        assert response.status_code == 404
        print("✅ Import from invalid prescription correctly returns 404")


class TestMedicineRemindersEdgeCases:
    """Edge case tests for Medicine Reminders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_create_reminder_with_all_frequencies(self):
        """Test creating reminders with different frequencies"""
        frequencies = ["once_daily", "twice_daily", "thrice_daily", "four_times"]
        today = datetime.now().strftime("%Y-%m-%d")
        
        for freq in frequencies:
            response = self.session.post(
                f"{BASE_URL}/api/medicine-reminders/create",
                json={
                    "medicine_name": f"TEST_Freq_{freq}_{uuid.uuid4().hex[:4]}",
                    "dosage": "1 tablet",
                    "frequency": freq,
                    "time_slots": ["09:00"] if freq == "once_daily" else ["09:00", "21:00"],
                    "start_date": today,
                    "total_quantity": 30
                }
            )
            
            assert response.status_code == 200
            reminder_id = response.json()["reminder_id"]
            
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/medicine-reminders/{reminder_id}")
            
            print(f"✅ Created reminder with frequency: {freq}")
    
    def test_adherence_history_different_periods(self):
        """Test adherence history with different day periods"""
        periods = [7, 14, 30]
        
        for days in periods:
            response = self.session.get(
                f"{BASE_URL}/api/medicine-reminders/adherence-history?days={days}"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["period_days"] == days
            
            print(f"✅ Adherence history for {days} days: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
