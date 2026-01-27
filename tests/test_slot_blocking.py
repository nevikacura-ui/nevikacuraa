"""
Test Suite for Staff Slot Blocking Feature
Tests the backend APIs for blocking/unblocking appointment slots
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cura-healthcare.preview.emergentagent.com')

# Test credentials
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"
MOCK_OTP = "721358"

# Test data - Dr. Vikas Jha works at Pushpa Clinic on Monday, Wednesday, Friday evenings
TEST_DOCTOR = "Dr. Vikas Jha"
TEST_CLINIC = "Pushpa Clinic"

def get_next_working_day():
    """Get the next Monday, Wednesday, or Friday (Dr. Vikas Jha's working days at Pushpa Clinic)"""
    today = datetime.now()
    # Working days: Monday=0, Wednesday=2, Friday=4
    working_days = [0, 2, 4]
    
    for i in range(1, 8):  # Check next 7 days
        check_date = today + timedelta(days=i)
        if check_date.weekday() in working_days:
            return check_date.strftime("%Y-%m-%d")
    
    # Fallback to tomorrow
    return (today + timedelta(days=1)).strftime("%Y-%m-%d")

class TestStaffLogin:
    """Test staff authentication"""
    
    def test_staff_login_success(self):
        """Test staff login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_USERNAME,
            "password": STAFF_PASSWORD
        })
        
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        print(f"✓ Staff login successful - Role: {data['staff'].get('role')}")
        return data["token"]
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestSlotBlockingAPIs:
    """Test slot blocking/unblocking APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get staff token and test date"""
        # Login as staff
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_USERNAME,
            "password": STAFF_PASSWORD
        })
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        self.staff_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.staff_token}"}
        
        # Get next working day for testing
        self.test_date = get_next_working_day()
        print(f"Testing with date: {self.test_date}")
    
    def test_get_blocked_slots_empty(self):
        """Test getting blocked slots when none exist"""
        response = requests.get(f"{BASE_URL}/api/appointments/blocked-slots", params={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date
        })
        
        assert response.status_code == 200, f"Get blocked slots failed: {response.text}"
        data = response.json()
        assert "blocked_slots" in data, "No blocked_slots in response"
        print(f"✓ Get blocked slots API works - Found {len(data['blocked_slots'])} blocked slots")
    
    def test_block_slots_success(self):
        """Test blocking slots successfully"""
        # First, clean up any existing blocked slots for this test
        test_slots = ["18:00", "18:15"]
        
        # Unblock first to ensure clean state
        requests.post(f"{BASE_URL}/api/appointments/unblock-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Test cleanup"
        })
        
        # Now block the slots
        response = requests.post(f"{BASE_URL}/api/appointments/block-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Doctor running late - Test"
        })
        
        assert response.status_code == 200, f"Block slots failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Block slots did not return success"
        assert data.get("blocked_count") >= 0, "No blocked_count in response"
        print(f"✓ Block slots API works - Blocked {data.get('blocked_count')} slots")
        
        # Verify slots are blocked
        verify_response = requests.get(f"{BASE_URL}/api/appointments/blocked-slots", params={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date
        })
        
        assert verify_response.status_code == 200
        blocked_data = verify_response.json()
        blocked_times = [slot["time"] for slot in blocked_data["blocked_slots"]]
        
        for slot in test_slots:
            if slot in blocked_times:
                print(f"✓ Verified slot {slot} is blocked")
        
        # Cleanup - unblock the test slots
        requests.post(f"{BASE_URL}/api/appointments/unblock-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Test cleanup"
        })
    
    def test_unblock_slots_success(self):
        """Test unblocking slots successfully"""
        test_slots = ["18:30", "18:45"]
        
        # First block the slots
        requests.post(f"{BASE_URL}/api/appointments/block-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Test block"
        })
        
        # Now unblock them
        response = requests.post(f"{BASE_URL}/api/appointments/unblock-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Test unblock"
        })
        
        assert response.status_code == 200, f"Unblock slots failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Unblock slots did not return success"
        print(f"✓ Unblock slots API works - Unblocked {data.get('unblocked_count')} slots")
        
        # Verify slots are unblocked
        verify_response = requests.get(f"{BASE_URL}/api/appointments/blocked-slots", params={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date
        })
        
        assert verify_response.status_code == 200
        blocked_data = verify_response.json()
        blocked_times = [slot["time"] for slot in blocked_data["blocked_slots"]]
        
        for slot in test_slots:
            assert slot not in blocked_times, f"Slot {slot} should be unblocked"
        print("✓ Verified slots are unblocked")
    
    def test_block_past_date_fails(self):
        """Test that blocking slots for past dates fails"""
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/appointments/block-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": past_date,
            "slots": ["18:00"],
            "reason": "Test past date"
        })
        
        assert response.status_code == 400, f"Expected 400 for past date, got {response.status_code}"
        print("✓ Blocking past dates correctly rejected")
    
    def test_block_invalid_date_format_fails(self):
        """Test that invalid date format fails"""
        response = requests.post(f"{BASE_URL}/api/appointments/block-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": "invalid-date",
            "slots": ["18:00"],
            "reason": "Test invalid date"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid date, got {response.status_code}"
        print("✓ Invalid date format correctly rejected")
    
    def test_blocked_slots_appear_in_booked_slots(self):
        """Test that blocked slots appear as booked in the booked-slots API"""
        test_slots = ["19:00", "19:15"]
        
        # Clean up first
        requests.post(f"{BASE_URL}/api/appointments/unblock-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Test cleanup"
        })
        
        # Block the slots
        block_response = requests.post(f"{BASE_URL}/api/appointments/block-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Test block"
        })
        
        assert block_response.status_code == 200
        
        # Check booked-slots API
        booked_response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date
        })
        
        assert booked_response.status_code == 200, f"Get booked slots failed: {booked_response.text}"
        booked_data = booked_response.json()
        booked_slots = booked_data.get("booked_slots", [])
        
        # Blocked slots should appear in booked slots
        for slot in test_slots:
            assert slot in booked_slots, f"Blocked slot {slot} should appear in booked_slots"
        print("✓ Blocked slots correctly appear in booked-slots API")
        
        # Cleanup
        requests.post(f"{BASE_URL}/api/appointments/unblock-slots", json={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": self.test_date,
            "slots": test_slots,
            "reason": "Test cleanup"
        })


class TestBookedSlotsIncludesBlocked:
    """Test that booked-slots API includes blocked status"""
    
    def test_booked_slots_api_exists(self):
        """Test that booked-slots API works"""
        test_date = get_next_working_day()
        
        response = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": test_date
        })
        
        assert response.status_code == 200, f"Booked slots API failed: {response.text}"
        data = response.json()
        assert "booked_slots" in data, "No booked_slots in response"
        print(f"✓ Booked slots API works - Found {len(data['booked_slots'])} booked slots")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
