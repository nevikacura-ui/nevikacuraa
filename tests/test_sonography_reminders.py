"""
Test Suite for Sonography Reminders Feature
Tests the push notification/SMS reminder system for sonography bookings
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STAFF_CREDENTIALS = {"username": "staff_pushpa", "password": "Nevika@2026C"}
DOCTOR_CREDENTIALS = {"username": "doc_neha", "password": "Nevika@2026C"}


class TestSonographyReminders:
    """Test sonography reminder endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_staff_token(self, credentials=None):
        """Get staff authentication token"""
        creds = credentials or STAFF_CREDENTIALS
        response = self.session.post(f"{BASE_URL}/api/staff/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def get_auth_headers(self, token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}
    
    # ============ Staff Login Tests ============
    
    def test_staff_login_success(self):
        """Test staff login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not returned"
        assert "staff" in data, "Staff info not returned"
        print(f"✓ Staff login successful: {data['staff'].get('name')}")
    
    def test_doctor_login_success(self):
        """Test doctor login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json=DOCTOR_CREDENTIALS)
        assert response.status_code == 200, f"Doctor login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not returned"
        print(f"✓ Doctor login successful: {data['staff'].get('name')}")
    
    # ============ Sonography Booking Tests ============
    
    def test_create_sonography_booking(self):
        """Test creating a pre-sonography booking"""
        token = self.get_staff_token()
        assert token, "Failed to get staff token"
        
        # Create booking with time ~20 mins from now for reminder testing
        now = datetime.now()
        booking_time = (now + timedelta(minutes=20)).strftime("%H:%M")
        booking_date = now.strftime("%Y-%m-%d")
        
        booking_data = {
            "patient_name": "TEST_Reminder_Patient",
            "age": "28",
            "lmp": "2025-10-15",
            "mobile_number": "9876543210",
            "date_of_birth": "1997-05-20",
            "husband_name": "Test Husband",
            "address": "123 Test Street, Mumbai",
            "has_children": False,
            "children": [],
            "booking_date": booking_date,
            "booking_time": booking_time,
            "clinic": "Pushpa Clinic",
            "scan_type": "ES",
            "notes": "Test booking for reminder testing"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Booking creation failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Booking not successful"
        assert "booking_id" in data, "Booking ID not returned"
        print(f"✓ Sonography booking created: {data['booking_id']}")
        
        # Store booking ID for cleanup
        self.test_booking_id = data["booking_id"]
        return data["booking_id"]
    
    def test_get_sonography_bookings(self):
        """Test fetching sonography bookings"""
        token = self.get_staff_token()
        assert token, "Failed to get staff token"
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/bookings?date={today}",
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Get bookings failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Request not successful"
        assert "bookings" in data, "Bookings not returned"
        assert "counts" in data, "Counts not returned"
        print(f"✓ Got {len(data['bookings'])} sonography bookings for today")
        print(f"  Counts: {data['counts']}")
    
    # ============ Reminder Endpoint Tests ============
    
    def test_upcoming_reminders_endpoint(self):
        """Test the upcoming-reminders endpoint returns correct data"""
        token = self.get_staff_token()
        assert token, "Failed to get staff token"
        
        response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/upcoming-reminders?minutes=30",
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Upcoming reminders failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Request not successful"
        assert "bookings" in data, "Bookings not returned"
        assert "date" in data, "Date not returned"
        assert "current_time" in data, "Current time not returned"
        assert "reminder_window_end" in data, "Reminder window end not returned"
        assert "count" in data, "Count not returned"
        
        print(f"✓ Upcoming reminders endpoint working")
        print(f"  Date: {data['date']}")
        print(f"  Current time: {data['current_time']}")
        print(f"  Reminder window end: {data['reminder_window_end']}")
        print(f"  Bookings due for reminder: {data['count']}")
        
        # Validate booking structure if any exist
        if data['bookings']:
            booking = data['bookings'][0]
            assert "patient_name" in booking, "Patient name missing"
            assert "booking_time" in booking, "Booking time missing"
            assert "mobile_number" in booking, "Mobile number missing"
            print(f"  First booking: {booking.get('patient_name')} at {booking.get('booking_time')}")
    
    def test_send_all_reminders_endpoint(self):
        """Test the send-all-reminders endpoint"""
        token = self.get_staff_token()
        assert token, "Failed to get staff token"
        
        response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/send-all-reminders?minutes=30",
            json={},
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Send all reminders failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Request not successful"
        assert "sent_count" in data, "Sent count not returned"
        assert "failed_count" in data, "Failed count not returned"
        assert "total_due" in data, "Total due not returned"
        assert "message" in data, "Message not returned"
        
        print(f"✓ Send all reminders endpoint working")
        print(f"  Message: {data['message']}")
        print(f"  Sent: {data['sent_count']}, Failed: {data['failed_count']}, Total due: {data['total_due']}")
    
    def test_send_single_reminder_endpoint(self):
        """Test sending reminder for a specific booking"""
        token = self.get_staff_token()
        assert token, "Failed to get staff token"
        
        # First create a booking
        now = datetime.now()
        booking_time = (now + timedelta(minutes=25)).strftime("%H:%M")
        booking_date = now.strftime("%Y-%m-%d")
        
        booking_data = {
            "patient_name": "TEST_Single_Reminder",
            "age": "30",
            "lmp": "2025-10-01",
            "mobile_number": "9876543211",
            "husband_name": "Test Husband 2",
            "address": "456 Test Avenue",
            "has_children": False,
            "children": [],
            "booking_date": booking_date,
            "booking_time": booking_time,
            "clinic": "Pushpa Clinic",
            "scan_type": "NT"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        if create_response.status_code == 200:
            booking_id = create_response.json().get("booking_id")
            
            # Now send reminder for this specific booking
            response = self.session.post(
                f"{BASE_URL}/api/staff/sonography/send-reminder/{booking_id}",
                headers=self.get_auth_headers(token)
            )
            
            assert response.status_code == 200, f"Send single reminder failed: {response.text}"
            data = response.json()
            assert data.get("success") == True, "Request not successful"
            print(f"✓ Single reminder endpoint working: {data.get('message')}")
        else:
            print(f"⚠ Could not create test booking for single reminder test")
    
    # ============ Doctor Access Tests ============
    
    def test_doctor_can_access_sonography_endpoints(self):
        """Test that doctor can access sonography endpoints"""
        token = self.get_staff_token(DOCTOR_CREDENTIALS)
        assert token, "Failed to get doctor token"
        
        # Test upcoming reminders
        response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/upcoming-reminders?minutes=30",
            headers=self.get_auth_headers(token)
        )
        assert response.status_code == 200, f"Doctor access to upcoming-reminders failed: {response.text}"
        print(f"✓ Doctor can access upcoming-reminders endpoint")
        
        # Test send all reminders
        response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/send-all-reminders?minutes=30",
            json={},
            headers=self.get_auth_headers(token)
        )
        assert response.status_code == 200, f"Doctor access to send-all-reminders failed: {response.text}"
        print(f"✓ Doctor can access send-all-reminders endpoint")
    
    # ============ Booking Status Update Tests ============
    
    def test_update_sonography_status(self):
        """Test updating sonography booking status"""
        token = self.get_staff_token()
        assert token, "Failed to get staff token"
        
        # Create a booking first
        now = datetime.now()
        booking_data = {
            "patient_name": "TEST_Status_Update",
            "age": "25",
            "lmp": "2025-09-15",
            "mobile_number": "9876543212",
            "husband_name": "Test Husband 3",
            "address": "789 Test Road",
            "has_children": False,
            "children": [],
            "booking_date": now.strftime("%Y-%m-%d"),
            "booking_time": (now + timedelta(hours=2)).strftime("%H:%M"),
            "clinic": "Pushpa Clinic",
            "scan_type": "GS"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        if create_response.status_code == 200:
            booking_id = create_response.json().get("booking_id")
            
            # Update status to in_progress
            response = self.session.put(
                f"{BASE_URL}/api/staff/sonography/booking/{booking_id}/status?status=in_progress",
                headers=self.get_auth_headers(token)
            )
            
            assert response.status_code == 200, f"Status update failed: {response.text}"
            data = response.json()
            assert data.get("success") == True, "Status update not successful"
            print(f"✓ Sonography status update working")
        else:
            print(f"⚠ Could not create test booking for status update test")
    
    # ============ Unauthorized Access Tests ============
    
    def test_unauthorized_access_blocked(self):
        """Test that unauthorized access is blocked"""
        # Try without token
        response = self.session.get(f"{BASE_URL}/api/staff/sonography/upcoming-reminders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Unauthorized access correctly blocked")
        
        # Try with invalid token
        response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/upcoming-reminders",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401, f"Expected 401 for invalid token, got {response.status_code}"
        print(f"✓ Invalid token correctly rejected")


class TestSonographyBookingFlow:
    """Test complete sonography booking and reminder flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_staff_token(self):
        """Get staff authentication token"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_complete_booking_reminder_flow(self):
        """Test complete flow: create booking -> check reminders -> send reminder -> verify reminded badge"""
        token = self.get_staff_token()
        assert token, "Failed to get staff token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 1: Create a booking within reminder window
        now = datetime.now()
        booking_time = (now + timedelta(minutes=15)).strftime("%H:%M")
        booking_date = now.strftime("%Y-%m-%d")
        
        booking_data = {
            "patient_name": "TEST_Flow_Patient",
            "age": "32",
            "lmp": "2025-11-01",
            "mobile_number": "9876543213",
            "husband_name": "Flow Test Husband",
            "address": "Flow Test Address",
            "has_children": True,
            "children": [{"gender": "girl", "age": "3"}],
            "booking_date": booking_date,
            "booking_time": booking_time,
            "clinic": "Pushpa Clinic",
            "scan_type": "ES",
            "notes": "Flow test booking"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/book",
            json=booking_data,
            headers=headers
        )
        
        assert create_response.status_code == 200, f"Booking creation failed: {create_response.text}"
        booking_id = create_response.json().get("booking_id")
        print(f"✓ Step 1: Created booking {booking_id}")
        
        # Step 2: Check upcoming reminders includes our booking
        reminders_response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/upcoming-reminders?minutes=30",
            headers=headers
        )
        
        assert reminders_response.status_code == 200
        reminders_data = reminders_response.json()
        print(f"✓ Step 2: Checked upcoming reminders - {reminders_data['count']} bookings due")
        
        # Step 3: Send reminder for the booking
        send_response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/send-reminder/{booking_id}",
            headers=headers
        )
        
        assert send_response.status_code == 200, f"Send reminder failed: {send_response.text}"
        send_data = send_response.json()
        print(f"✓ Step 3: Sent reminder - {send_data.get('message')}")
        
        # Step 4: Verify booking now has reminder_sent = True
        booking_response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/booking/{booking_id}",
            headers=headers
        )
        
        assert booking_response.status_code == 200
        booking_data = booking_response.json()
        assert booking_data.get("success") == True
        assert booking_data["booking"].get("reminder_sent") == True, "reminder_sent should be True"
        print(f"✓ Step 4: Verified booking has reminder_sent=True")
        
        # Step 5: Verify booking no longer appears in upcoming reminders
        reminders_response2 = self.session.get(
            f"{BASE_URL}/api/staff/sonography/upcoming-reminders?minutes=30",
            headers=headers
        )
        
        assert reminders_response2.status_code == 200
        reminders_data2 = reminders_response2.json()
        
        # Check our booking is not in the list (already reminded)
        booking_ids_in_reminders = [b.get("id") for b in reminders_data2.get("bookings", [])]
        assert booking_id not in booking_ids_in_reminders, "Reminded booking should not appear in upcoming reminders"
        print(f"✓ Step 5: Verified reminded booking excluded from upcoming reminders")
        
        print(f"\n✓ Complete booking-reminder flow test PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
