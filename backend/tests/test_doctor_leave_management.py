"""
Test: Doctor Portal Leave Management Feature
Tests block-session, block-date, and booked-slots sync APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')

class TestDoctorLeaveManagement:
    """Test Leave Management APIs for Doctor Portal"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as dr_vikas and get token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test"
        })
        assert response.status_code == 200, "Doctor login failed"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.doctor_name = "Dr. Vikas Jha"
        self.clinic = "Pushpa Clinic"
        yield
        # Cleanup test data after tests
        self._cleanup_test_blocks()
    
    def _cleanup_test_blocks(self):
        """Clean up test blocks created during tests"""
        test_dates = ["2026-03-01", "2026-03-02", "2026-03-03"]
        for date in test_dates:
            # Try to delete session blocks
            requests.delete(f"{BASE_URL}/api/doctor-schedule/block-session/{date}/11:00", headers=self.headers)
            requests.delete(f"{BASE_URL}/api/doctor-schedule/block-session/{date}/18:00", headers=self.headers)
            # Try to delete full day blocks
            requests.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{date}", headers=self.headers)
    
    def test_doctor_login_success(self):
        """Test dr_vikas/test credentials work"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["staff"]["name"] == "Dr. Vikas Jha"
        assert data["staff"]["role"] == "doctor"
        print("✅ Doctor login successful: dr_vikas/test")
    
    def test_get_my_schedule(self):
        """Test GET /api/doctor-schedule/my-schedule returns schedule"""
        response = requests.get(f"{BASE_URL}/api/doctor-schedule/my-schedule", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "doctor_id" in data
        print(f"✅ My schedule retrieved. Doctor ID: {data['doctor_id']}")
        print(f"   Blocked sessions: {len(data.get('blocked_sessions', []))}")
    
    def test_block_morning_session(self):
        """Test POST /api/doctor-schedule/block-session for morning (11:00-14:00)"""
        payload = {
            "date": "2026-03-01",
            "start_time": "11:00",
            "end_time": "14:00",
            "reason": "Test Morning Block"
        }
        response = requests.post(f"{BASE_URL}/api/doctor-schedule/block-session", 
                                 json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Morning session blocked: {payload['date']} 11:00-14:00")
    
    def test_block_evening_session(self):
        """Test POST /api/doctor-schedule/block-session for evening (18:00-22:00)"""
        payload = {
            "date": "2026-03-01",
            "start_time": "18:00",
            "end_time": "22:00",
            "reason": "Test Evening Block"
        }
        response = requests.post(f"{BASE_URL}/api/doctor-schedule/block-session", 
                                 json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Evening session blocked: {payload['date']} 18:00-22:00")
    
    def test_block_full_day(self):
        """Test POST /api/doctor-schedule/block-date for full day leave"""
        payload = {
            "date": "2026-03-02",
            "reason": "Test Full Day Leave"
        }
        response = requests.post(f"{BASE_URL}/api/doctor-schedule/block-date", 
                                 json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Full day blocked: {payload['date']}")
    
    def test_blocked_session_appears_in_booked_slots(self):
        """Test blocked session syncs to GET /api/appointments/booked-slots"""
        # First block a morning session
        payload = {
            "date": "2026-03-03",
            "start_time": "11:00",
            "end_time": "14:00",
            "reason": "Sync Test Block"
        }
        requests.post(f"{BASE_URL}/api/doctor-schedule/block-session", 
                     json=payload, headers=self.headers)
        
        # Check booked-slots API
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": self.doctor_name,
            "clinic": self.clinic,
            "date": "2026-03-03"
        })
        assert response.status_code == 200
        data = response.json()
        booked_slots = data.get("booked_slots", [])
        
        # Verify morning slots (11:00-14:00) are blocked
        expected_blocked = ["11:00", "11:15", "11:30", "11:45", "12:00", "12:15", 
                          "12:30", "12:45", "13:00", "13:15", "13:30", "13:45"]
        for slot in expected_blocked:
            assert slot in booked_slots, f"Expected {slot} to be blocked"
        print(f"✅ Blocked session syncs to booked-slots API. Found {len(booked_slots)} blocked slots")
    
    def test_full_day_block_returns_all_slots(self):
        """Test full day block returns date_blocked=True and all slots"""
        # First block full day
        payload = {
            "date": "2026-03-02",
            "reason": "Full Day Test"
        }
        requests.post(f"{BASE_URL}/api/doctor-schedule/block-date", 
                     json=payload, headers=self.headers)
        
        # Check booked-slots API
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": self.doctor_name,
            "clinic": self.clinic,
            "date": "2026-03-02"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("date_blocked") == True, "Expected date_blocked=True for full day block"
        assert len(data.get("booked_slots", [])) > 50, "Expected many blocked slots for full day"
        print(f"✅ Full day block: date_blocked=True, {len(data['booked_slots'])} slots blocked")
    
    def test_delete_blocked_session(self):
        """Test DELETE /api/doctor-schedule/block-session removes block"""
        # First create a block
        payload = {
            "date": "2026-03-01",
            "start_time": "11:00",
            "end_time": "14:00",
            "reason": "Delete Test"
        }
        requests.post(f"{BASE_URL}/api/doctor-schedule/block-session", 
                     json=payload, headers=self.headers)
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/doctor-schedule/block-session/2026-03-01/11:00",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Blocked session deleted successfully")
    
    def test_delete_blocked_date(self):
        """Test DELETE /api/doctor-schedule/block-date removes full day block"""
        # First create a full day block
        payload = {
            "date": "2026-03-02",
            "reason": "Delete Full Day Test"
        }
        requests.post(f"{BASE_URL}/api/doctor-schedule/block-date", 
                     json=payload, headers=self.headers)
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/doctor-schedule/block-date/2026-03-02",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Full day block deleted successfully")
    
    def test_unauthorized_access_rejected(self):
        """Test API rejects requests without valid token"""
        response = requests.get(f"{BASE_URL}/api/doctor-schedule/my-schedule")
        assert response.status_code == 401
        print("✅ Unauthorized access correctly rejected")
    
    def test_existing_blocked_sessions_for_feb17(self):
        """Test booked-slots for Feb 17 (known blocked morning)"""
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": self.doctor_name,
            "clinic": self.clinic,
            "date": "2026-02-17"
        })
        assert response.status_code == 200
        data = response.json()
        booked_slots = data.get("booked_slots", [])
        
        # Verify morning slots are blocked
        assert "11:00" in booked_slots, "Expected 11:00 to be blocked"
        assert "12:00" in booked_slots, "Expected 12:00 to be blocked"
        assert "13:00" in booked_slots, "Expected 13:00 to be blocked"
        print(f"✅ Feb 17 morning block verified: {len(booked_slots)} slots blocked (11:00-13:45)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
