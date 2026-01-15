"""
Test Suite for Pre-Sonography Booking Feature - Iteration 36
Tests the sonography booking APIs for staff portal

Features tested:
- POST /api/staff/sonography/book - Create sonography booking with patient details
- GET /api/staff/sonography/bookings - List sonography bookings with filters
- GET /api/staff/sonography/booking/{id} - Get specific booking details
- PUT /api/staff/sonography/booking/{id}/status - Update booking status
- GET /api/staff/sonography/today - Get today's sonography bookings
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STAFF_CREDENTIALS = {
    "clinic_staff": {"username": "staff_pushpa", "password": "Nevika@2026C"},
    "doctor": {"username": "doc_neha", "password": "Nevika@2026C"}
}


class TestSonographyBookingAPIs:
    """Test suite for Pre-Sonography Booking feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.staff_token = None
        self.doctor_token = None
        self.created_booking_id = None
        
    def get_staff_token(self, role="clinic_staff"):
        """Get authentication token for staff"""
        creds = STAFF_CREDENTIALS.get(role, STAFF_CREDENTIALS["clinic_staff"])
        response = requests.post(
            f"{self.base_url}/api/staff/login",
            json=creds
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def get_auth_headers(self, token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}
    
    # ============ Staff Login Tests ============
    
    def test_01_staff_login_clinic_staff(self):
        """Test clinic staff login (staff_pushpa)"""
        response = requests.post(
            f"{self.base_url}/api/staff/login",
            json=STAFF_CREDENTIALS["clinic_staff"]
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "staff" in data, "Staff info not in response"
        self.staff_token = data["token"]
        print(f"✓ Clinic staff login successful: {data['staff'].get('name')}")
    
    def test_02_staff_login_doctor(self):
        """Test doctor login (doc_neha)"""
        response = requests.post(
            f"{self.base_url}/api/staff/login",
            json=STAFF_CREDENTIALS["doctor"]
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        self.doctor_token = data["token"]
        print(f"✓ Doctor login successful: {data['staff'].get('name')}")
    
    # ============ Sonography Booking Creation Tests ============
    
    def test_03_create_sonography_booking_basic(self):
        """Test creating a basic sonography booking"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        today = datetime.now().strftime("%Y-%m-%d")
        booking_data = {
            "patient_name": "TEST_Priya Sharma",
            "age": "28",
            "lmp": "2025-12-01",
            "mobile_number": "9876543210",
            "date_of_birth": "1997-05-15",
            "husband_name": "Rahul Sharma",
            "address": "123 Test Street, Mumbai",
            "has_children": False,
            "children": [],
            "booking_date": today,
            "booking_time": "10:00",
            "clinic": "Pushpa Clinic",
            "scan_type": "NT",
            "notes": "First pregnancy scan"
        }
        
        response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Booking creation failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        assert "booking_id" in data, "Booking ID not returned"
        
        self.created_booking_id = data["booking_id"]
        print(f"✓ Sonography booking created: {data['booking_id']}")
    
    def test_04_create_sonography_booking_with_children(self):
        """Test creating sonography booking with children info"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        today = datetime.now().strftime("%Y-%m-%d")
        booking_data = {
            "patient_name": "TEST_Meera Patel",
            "age": "32",
            "lmp": "2025-11-15",
            "mobile_number": "9876543211",
            "date_of_birth": "1993-08-20",
            "husband_name": "Amit Patel",
            "address": "456 Test Avenue, Pune",
            "has_children": True,
            "children": [
                {"gender": "boy", "age": "5"},
                {"gender": "girl", "age": "3"}
            ],
            "booking_date": today,
            "booking_time": "11:30",
            "clinic": "Pushpa Clinic",
            "scan_type": "GS",
            "notes": "Second pregnancy, growth scan"
        }
        
        response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Booking creation failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        assert "booking_id" in data, "Booking ID not returned"
        print(f"✓ Sonography booking with children created: {data['booking_id']}")
    
    def test_05_create_sonography_booking_missing_required_fields(self):
        """Test booking creation fails with missing required fields"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        # Missing patient_name and husband_name
        booking_data = {
            "age": "28",
            "lmp": "2025-12-01",
            "mobile_number": "9876543212",
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "booking_time": "14:00",
            "clinic": "Pushpa Clinic"
        }
        
        response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        # Should fail with 422 validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Validation correctly rejects missing required fields")
    
    # ============ Sonography Booking List Tests ============
    
    def test_06_get_sonography_bookings_list(self):
        """Test getting list of sonography bookings"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/bookings",
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to get bookings: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        assert "bookings" in data, "Bookings list not in response"
        assert "counts" in data, "Counts not in response"
        
        # Verify counts structure
        counts = data["counts"]
        assert "total" in counts, "Total count missing"
        assert "booked" in counts, "Booked count missing"
        assert "in_progress" in counts, "In progress count missing"
        assert "completed" in counts, "Completed count missing"
        
        print(f"✓ Got {len(data['bookings'])} sonography bookings")
        print(f"  Counts: total={counts['total']}, booked={counts['booked']}, in_progress={counts['in_progress']}, completed={counts['completed']}")
    
    def test_07_get_sonography_bookings_with_date_filter(self):
        """Test getting bookings filtered by date"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/bookings",
            params={"date": today},
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to get bookings: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        
        # Verify all bookings are for the specified date
        for booking in data.get("bookings", []):
            assert booking.get("booking_date") == today, f"Booking date mismatch: {booking.get('booking_date')}"
        
        print(f"✓ Got {len(data['bookings'])} bookings for date {today}")
    
    def test_08_get_sonography_bookings_with_status_filter(self):
        """Test getting bookings filtered by status"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/bookings",
            params={"status": "booked"},
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to get bookings: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        
        # Verify all bookings have the specified status
        for booking in data.get("bookings", []):
            assert booking.get("status") == "booked", f"Status mismatch: {booking.get('status')}"
        
        print(f"✓ Got {len(data['bookings'])} bookings with status 'booked'")
    
    # ============ Sonography Booking Details Tests ============
    
    def test_09_get_sonography_booking_details(self):
        """Test getting specific booking details"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        # First create a booking to get its ID
        today = datetime.now().strftime("%Y-%m-%d")
        booking_data = {
            "patient_name": "TEST_Anita Verma",
            "age": "30",
            "lmp": "2025-11-20",
            "mobile_number": "9876543213",
            "husband_name": "Suresh Verma",
            "address": "789 Test Road, Delhi",
            "has_children": False,
            "children": [],
            "booking_date": today,
            "booking_time": "15:00",
            "clinic": "Pushpa Clinic",
            "scan_type": "ES"
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        assert create_response.status_code == 200, "Failed to create booking"
        booking_id = create_response.json().get("booking_id")
        
        # Now get the booking details
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/booking/{booking_id}",
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to get booking details: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        assert "booking" in data, "Booking details not in response"
        
        booking = data["booking"]
        assert booking.get("patient_name") == "TEST_Anita Verma", "Patient name mismatch"
        assert booking.get("husband_name") == "Suresh Verma", "Husband name mismatch"
        assert booking.get("mobile_number") == "9876543213", "Mobile number mismatch"
        assert booking.get("status") == "booked", "Initial status should be 'booked'"
        
        print(f"✓ Got booking details for {booking['patient_name']}")
    
    def test_10_get_nonexistent_booking(self):
        """Test getting details of non-existent booking"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/booking/nonexistent-id-12345",
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        data = response.json()
        assert "error" in data, "Should return error for non-existent booking"
        print("✓ Correctly handles non-existent booking request")
    
    # ============ Sonography Status Update Tests ============
    
    def test_11_update_sonography_status_to_in_progress(self):
        """Test updating booking status to in_progress"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        # Create a booking first
        today = datetime.now().strftime("%Y-%m-%d")
        booking_data = {
            "patient_name": "TEST_Kavita Singh",
            "age": "27",
            "lmp": "2025-12-05",
            "mobile_number": "9876543214",
            "husband_name": "Raj Singh",
            "address": "101 Test Lane, Bangalore",
            "has_children": False,
            "children": [],
            "booking_date": today,
            "booking_time": "16:00",
            "clinic": "Pushpa Clinic"
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        assert create_response.status_code == 200, "Failed to create booking"
        booking_id = create_response.json().get("booking_id")
        
        # Update status to in_progress
        response = requests.put(
            f"{self.base_url}/api/staff/sonography/booking/{booking_id}/status",
            params={"status": "in_progress"},
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        
        # Verify the status was updated
        verify_response = requests.get(
            f"{self.base_url}/api/staff/sonography/booking/{booking_id}",
            headers=self.get_auth_headers(token)
        )
        verify_data = verify_response.json()
        assert verify_data["booking"]["status"] == "in_progress", "Status not updated"
        
        print("✓ Status updated to 'in_progress'")
    
    def test_12_update_sonography_status_to_completed(self):
        """Test updating booking status to completed"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        # Create a booking first
        today = datetime.now().strftime("%Y-%m-%d")
        booking_data = {
            "patient_name": "TEST_Sunita Rao",
            "age": "29",
            "lmp": "2025-11-25",
            "mobile_number": "9876543215",
            "husband_name": "Venkat Rao",
            "address": "202 Test Circle, Chennai",
            "has_children": True,
            "children": [{"gender": "girl", "age": "2"}],
            "booking_date": today,
            "booking_time": "17:00",
            "clinic": "Pushpa Clinic"
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        assert create_response.status_code == 200, "Failed to create booking"
        booking_id = create_response.json().get("booking_id")
        
        # Update status to completed
        response = requests.put(
            f"{self.base_url}/api/staff/sonography/booking/{booking_id}/status",
            params={"status": "completed"},
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        
        print("✓ Status updated to 'completed'")
    
    def test_13_update_sonography_status_invalid(self):
        """Test updating booking with invalid status"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        # Create a booking first
        today = datetime.now().strftime("%Y-%m-%d")
        booking_data = {
            "patient_name": "TEST_Invalid Status Test",
            "age": "25",
            "lmp": "2025-12-10",
            "mobile_number": "9876543216",
            "husband_name": "Test Husband",
            "address": "Test Address",
            "has_children": False,
            "children": [],
            "booking_date": today,
            "booking_time": "18:00",
            "clinic": "Pushpa Clinic"
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(token)
        )
        
        assert create_response.status_code == 200, "Failed to create booking"
        booking_id = create_response.json().get("booking_id")
        
        # Try to update with invalid status
        response = requests.put(
            f"{self.base_url}/api/staff/sonography/booking/{booking_id}/status",
            params={"status": "invalid_status"},
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
        data = response.json()
        assert "error" in data, "Should return error for invalid status"
        
        print("✓ Correctly rejects invalid status")
    
    # ============ Today's Sonography Tests ============
    
    def test_14_get_todays_sonography_bookings(self):
        """Test getting today's sonography bookings"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/today",
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to get today's bookings: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        assert "bookings" in data, "Bookings not in response"
        assert "date" in data, "Date not in response"
        assert "count" in data, "Count not in response"
        
        today = datetime.now().strftime("%Y-%m-%d")
        assert data["date"] == today, f"Date mismatch: expected {today}, got {data['date']}"
        
        print(f"✓ Got {data['count']} bookings for today ({today})")
    
    def test_15_get_todays_sonography_with_clinic_filter(self):
        """Test getting today's sonography bookings with clinic filter"""
        token = self.get_staff_token("clinic_staff")
        assert token, "Failed to get staff token"
        
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/today",
            params={"clinic": "Pushpa"},
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Failed to get today's bookings: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        
        # Verify clinic filter works
        for booking in data.get("bookings", []):
            assert "pushpa" in booking.get("clinic", "").lower(), f"Clinic filter not working: {booking.get('clinic')}"
        
        print(f"✓ Got {data['count']} bookings for Pushpa Clinic today")
    
    # ============ Doctor Access Tests ============
    
    def test_16_doctor_can_view_sonography_bookings(self):
        """Test that doctor (Dr. Neha) can view sonography bookings"""
        token = self.get_staff_token("doctor")
        assert token, "Failed to get doctor token"
        
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/bookings",
            headers=self.get_auth_headers(token)
        )
        
        assert response.status_code == 200, f"Doctor cannot view bookings: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        
        print(f"✓ Doctor can view {len(data.get('bookings', []))} sonography bookings")
    
    def test_17_doctor_can_update_booking_status(self):
        """Test that doctor can update booking status"""
        # First create a booking as staff
        staff_token = self.get_staff_token("clinic_staff")
        assert staff_token, "Failed to get staff token"
        
        today = datetime.now().strftime("%Y-%m-%d")
        booking_data = {
            "patient_name": "TEST_Doctor Update Test",
            "age": "26",
            "lmp": "2025-12-08",
            "mobile_number": "9876543217",
            "husband_name": "Test Husband",
            "address": "Test Address",
            "has_children": False,
            "children": [],
            "booking_date": today,
            "booking_time": "09:00",
            "clinic": "Pushpa Clinic"
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/staff/sonography/book",
            json=booking_data,
            headers=self.get_auth_headers(staff_token)
        )
        
        assert create_response.status_code == 200, "Failed to create booking"
        booking_id = create_response.json().get("booking_id")
        
        # Now update as doctor
        doctor_token = self.get_staff_token("doctor")
        assert doctor_token, "Failed to get doctor token"
        
        response = requests.put(
            f"{self.base_url}/api/staff/sonography/booking/{booking_id}/status",
            params={"status": "in_progress"},
            headers=self.get_auth_headers(doctor_token)
        )
        
        assert response.status_code == 200, f"Doctor cannot update status: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success flag not true"
        
        print("✓ Doctor can update booking status")
    
    # ============ Authentication Tests ============
    
    def test_18_unauthorized_access_rejected(self):
        """Test that unauthorized access is rejected"""
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/bookings"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")
    
    def test_19_invalid_token_rejected(self):
        """Test that invalid token is rejected"""
        response = requests.get(
            f"{self.base_url}/api/staff/sonography/bookings",
            headers={"Authorization": "Bearer invalid-token-12345"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid token correctly rejected")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
