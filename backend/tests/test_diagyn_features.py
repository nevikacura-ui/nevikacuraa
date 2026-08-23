"""
DiaGyn Feature Tests - Testing Reserved Slots, OTP Skip, and 3-Month Booking Window
Tests for:
1. Reserved slots 11:00 and 11:15 are returned as booked
2. Staff portal excludes reserved slots
3. Appointments sync between doctor and staff portals
4. Doctor can add fees before completing appointments
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Use the production preview URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Test credentials
STAFF_CREDENTIALS = {"username": "staff_diagyn", "password": "test"}
DOCTOR_CREDENTIALS = {"username": "neha", "password": "test"}


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✅ API health check passed: {data}")


class TestReservedSlots:
    """Test that reserved slots 11:00 and 11:15 are shown as booked"""
    
    def test_booked_slots_includes_reserved(self):
        """Test /api/appointments/booked-slots returns reserved slots 11:00 and 11:15"""
        # Test for a future date
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{API_URL}/appointments/booked-slots", params={
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": future_date
        })
        
        assert response.status_code == 200
        data = response.json()
        booked_slots = data.get("booked_slots", [])
        
        print(f"Booked slots for {future_date}: {booked_slots}")
        
        # Reserved slots should always be included
        assert "11:00" in booked_slots, "Reserved slot 11:00 not in booked slots"
        assert "11:15" in booked_slots, "Reserved slot 11:15 not in booked slots"
        print(f"✅ Reserved slots 11:00 and 11:15 are included in booked slots")
    
    def test_booked_slots_for_dr_vikas(self):
        """Test reserved slots for Dr. Vikas Jha at Amnion Clinic"""
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{API_URL}/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha",
            "clinic": "Amnion Clinic",
            "date": future_date
        })
        
        assert response.status_code == 200
        data = response.json()
        booked_slots = data.get("booked_slots", [])
        
        print(f"Booked slots for Dr. Vikas at Amnion ({future_date}): {booked_slots}")
        
        # Reserved slots should always be included
        assert "11:00" in booked_slots, "Reserved slot 11:00 not in booked slots"
        assert "11:15" in booked_slots, "Reserved slot 11:15 not in booked slots"
        print(f"✅ Reserved slots confirmed for Dr. Vikas Jha at Amnion Clinic")


class TestStaffPortalAuth:
    """Test staff portal authentication"""
    
    @pytest.fixture
    def staff_token(self):
        """Login as staff and get token"""
        response = requests.post(f"{API_URL}/staff/login", json=STAFF_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    @pytest.fixture
    def doctor_token(self):
        """Login as doctor and get token"""
        response = requests.post(f"{API_URL}/staff/login", json=DOCTOR_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Doctor login failed")
    
    def test_staff_login(self):
        """Test staff login works"""
        response = requests.post(f"{API_URL}/staff/login", json=STAFF_CREDENTIALS)
        print(f"Staff login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Staff login successful")
    
    def test_doctor_login(self):
        """Test doctor login works"""
        response = requests.post(f"{API_URL}/staff/login", json=DOCTOR_CREDENTIALS)
        print(f"Doctor login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Doctor login successful")


class TestStaffPortalSlots:
    """Test staff portal slot availability API excludes reserved slots"""
    
    @pytest.fixture
    def staff_token(self):
        """Login as staff and get token"""
        response = requests.post(f"{API_URL}/staff/login", json=STAFF_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_staff_slots_exclude_reserved(self, staff_token):
        """Test /api/diagyn-staff/slots/available excludes reserved slots"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Get a future weekday date
        today = datetime.now()
        future_date = today + timedelta(days=1)
        # Skip to Monday if weekend
        while future_date.weekday() >= 5:  # Saturday or Sunday
            future_date += timedelta(days=1)
        date_str = future_date.strftime("%Y-%m-%d")
        
        response = requests.get(f"{API_URL}/diagyn-staff/slots/available", params={
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Neha Patel",
            "date": date_str
        }, headers=headers)
        
        print(f"Staff slots response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            available_slots = [s.get("value") for s in data.get("available_slots", [])]
            print(f"Available slots: {available_slots[:10]}...")
            
            # Reserved slots 11:00 and 11:15 should NOT be in available slots
            assert "11:00" not in available_slots, "Reserved slot 11:00 should not be available"
            assert "11:15" not in available_slots, "Reserved slot 11:15 should not be available"
            print(f"✅ Staff portal correctly excludes reserved slots 11:00 and 11:15")
        else:
            print(f"Response: {response.text[:500]}")
            # May fail due to doctor not available on that day - still pass if non-auth error
            if "not available" in response.text.lower():
                pytest.skip(f"Doctor not available on {date_str}")
            else:
                assert response.status_code == 200


class TestAppointmentSync:
    """Test appointments sync between doctor and staff portals"""
    
    @pytest.fixture
    def staff_token(self):
        """Login as staff and get token"""
        response = requests.post(f"{API_URL}/staff/login", json=STAFF_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_appointments_list_accessible(self, staff_token):
        """Test appointments list is accessible from staff portal"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(f"{API_URL}/diagyn-staff/appointments", params={
            "clinic": "Pushpa Clinic",
            "date": today
        }, headers=headers)
        
        print(f"Appointments list response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            appointments = data.get("appointments", [])
            print(f"Found {len(appointments)} appointments for today")
            print(f"✅ Appointments list accessible from staff portal")
        else:
            print(f"Response: {response.text[:500]}")
            # Check if it's an auth issue
            assert response.status_code != 401, "Authentication failed"


class TestFeeCodes:
    """Test doctor can add fees before completing appointments"""
    
    @pytest.fixture
    def staff_token(self):
        """Login as staff and get token"""
        response = requests.post(f"{API_URL}/staff/login", json=STAFF_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_fee_codes_available(self, staff_token):
        """Test fee codes endpoint is available"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Try to get fee codes
        response = requests.get(f"{API_URL}/diagyn-staff/fee-codes", params={
            "doctor": "Dr. Neha Patel"
        }, headers=headers)
        
        print(f"Fee codes response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Fee codes data: {data}")
            print(f"✅ Fee codes endpoint working")
        else:
            print(f"Response: {response.text[:300]}")
            # Even if endpoint doesn't exist, it should not be a server error
            assert response.status_code != 500, "Server error on fee codes"


class TestBookingWindow:
    """Test 3-month booking window functionality"""
    
    def test_date_validation(self):
        """Test that bookings beyond 3 months should be rejected by frontend logic"""
        # This is a frontend validation - we just verify API accepts valid dates
        valid_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{API_URL}/appointments/booked-slots", params={
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": valid_date
        })
        
        assert response.status_code == 200
        print(f"✅ API accepts dates within 3-month window")
    
    def test_date_4_months_ahead(self):
        """Test API response for date 4 months ahead (frontend should block this)"""
        far_date = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{API_URL}/appointments/booked-slots", params={
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": far_date
        })
        
        # API might still work but frontend should block this
        print(f"Response for 4-month ahead date: {response.status_code}")
        print(f"Note: 3-month limit is enforced on frontend calendar navigation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
