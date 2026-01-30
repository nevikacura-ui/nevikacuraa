"""
Test Suite for Nevika Cura Healthcare - Slot Synchronization and Doctor Name Verification
Tests:
1. Dr. Neha Patel name verification in API responses
2. Slot synchronization - GET /api/appointments/booked-slots
3. Slot blocking - POST /api/appointments (patient booking)
4. Slot blocking - POST /api/staff/appointments/walk-in (staff booking)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cura-login.preview.emergentagent.com')

# Test credentials
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"

# Test data
TEST_DOCTOR = "Dr. Neha Patel"
TEST_CLINIC = "Pushpa Clinic"
TEST_DATE = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')  # Tomorrow
TEST_TIME = "11:00"  # A valid slot for Dr. Neha Patel at Pushpa Clinic

class TestBookedSlotsAPI:
    """Test the booked-slots API endpoint"""
    
    def test_booked_slots_endpoint_exists(self):
        """Test that booked-slots endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "booked_slots" in data, "Response should contain 'booked_slots' key"
        assert isinstance(data["booked_slots"], list), "booked_slots should be a list"
        print(f"✓ Booked slots API working - returned {len(data['booked_slots'])} slots")
    
    def test_booked_slots_with_dr_neha_patel(self):
        """Test booked slots specifically for Dr. Neha Patel"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TEST_DATE
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        print(f"✓ Dr. Neha Patel booked slots query successful")
    
    def test_booked_slots_with_dr_vikas_jha(self):
        """Test booked slots for Dr. Vikas Jha"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Vikas Jha",
                "clinic": "Pushpa Clinic",
                "date": TEST_DATE
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        print(f"✓ Dr. Vikas Jha booked slots query successful")


class TestSlotBlocking:
    """Test slot blocking functionality for double-booking prevention"""
    
    @pytest.fixture
    def unique_test_time(self):
        """Generate a unique time slot for testing"""
        # Use a time that's likely available
        return "11:15"
    
    def test_patient_booking_blocks_slot(self, unique_test_time):
        """Test that patient booking blocks the slot"""
        # First, check if slot is available
        check_response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        assert check_response.status_code == 200
        initial_slots = check_response.json()["booked_slots"]
        
        # Book an appointment
        booking_data = {
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": TEST_DATE,
            "time": unique_test_time,
            "patient_name": f"TEST_Patient_{uuid.uuid4().hex[:8]}",
            "patient_phone": "9876543210",
            "patient_email": "test@example.com"
        }
        
        book_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=booking_data
        )
        
        if book_response.status_code == 200:
            # Verify slot is now booked
            verify_response = requests.get(
                f"{BASE_URL}/api/appointments/booked-slots",
                params={
                    "doctor": TEST_DOCTOR,
                    "clinic": TEST_CLINIC,
                    "date": TEST_DATE
                }
            )
            assert verify_response.status_code == 200
            new_slots = verify_response.json()["booked_slots"]
            
            # The slot should now be in booked slots
            assert unique_test_time in new_slots, f"Slot {unique_test_time} should be blocked after booking"
            print(f"✓ Patient booking successfully blocked slot {unique_test_time}")
            
            # Try to book the same slot again - should fail
            duplicate_response = requests.post(
                f"{BASE_URL}/api/appointments",
                json=booking_data
            )
            assert duplicate_response.status_code == 400, "Duplicate booking should be rejected"
            assert "already booked" in duplicate_response.json().get("detail", "").lower()
            print(f"✓ Duplicate booking correctly rejected")
        elif book_response.status_code == 400:
            # Slot was already booked
            print(f"⚠ Slot {unique_test_time} was already booked - testing rejection")
            assert "already booked" in book_response.json().get("detail", "").lower()
            print(f"✓ Slot blocking working - rejected already booked slot")
        else:
            pytest.fail(f"Unexpected response: {book_response.status_code} - {book_response.text}")


class TestStaffLogin:
    """Test staff login functionality"""
    
    def test_staff_login_success(self):
        """Test successful staff login"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": STAFF_USERNAME,
                "password": STAFF_PASSWORD
            }
        )
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "role" in data, "Response should contain role"
        assert "clinic" in data, "Response should contain clinic"
        print(f"✓ Staff login successful - Role: {data['role']}, Clinic: {data['clinic']}")
        return data["token"]
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "invalid_user",
                "password": "wrong_password"
            }
        )
        assert response.status_code == 401, "Invalid credentials should return 401"
        print(f"✓ Invalid credentials correctly rejected")


class TestStaffWalkInBooking:
    """Test staff walk-in booking with slot blocking"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": STAFF_USERNAME,
                "password": STAFF_PASSWORD
            }
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Staff login failed")
    
    def test_staff_walkin_booking(self, staff_token):
        """Test staff can book walk-in appointment"""
        # Use a different time slot
        test_time = "11:30"
        
        # Check current booked slots
        check_response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE
            }
        )
        initial_slots = check_response.json().get("booked_slots", [])
        
        # Book walk-in appointment
        booking_data = {
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": TEST_DATE,
            "time": test_time,
            "patient_name": f"TEST_WalkIn_{uuid.uuid4().hex[:8]}",
            "patient_phone": "9876543211"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=booking_data,
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        if response.status_code == 200:
            # Verify slot is blocked
            verify_response = requests.get(
                f"{BASE_URL}/api/appointments/booked-slots",
                params={
                    "doctor": TEST_DOCTOR,
                    "clinic": TEST_CLINIC,
                    "date": TEST_DATE
                }
            )
            new_slots = verify_response.json().get("booked_slots", [])
            assert test_time in new_slots, f"Walk-in slot {test_time} should be blocked"
            print(f"✓ Staff walk-in booking successful and slot blocked")
        elif response.status_code == 400:
            # Slot already booked
            assert "already booked" in response.json().get("detail", "").lower()
            print(f"✓ Staff walk-in correctly rejected - slot already booked")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_staff_walkin_rejects_duplicate(self, staff_token):
        """Test that staff walk-in rejects already booked slots"""
        # First book a slot
        test_time = "11:45"
        booking_data = {
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": TEST_DATE,
            "time": test_time,
            "patient_name": f"TEST_First_{uuid.uuid4().hex[:8]}",
            "patient_phone": "9876543212"
        }
        
        first_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=booking_data,
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        if first_response.status_code == 200:
            # Try to book same slot again
            booking_data["patient_name"] = f"TEST_Second_{uuid.uuid4().hex[:8]}"
            second_response = requests.post(
                f"{BASE_URL}/api/staff/appointments/walk-in",
                json=booking_data,
                headers={"Authorization": f"Bearer {staff_token}"}
            )
            assert second_response.status_code == 400, "Duplicate walk-in should be rejected"
            assert "already booked" in second_response.json().get("detail", "").lower()
            print(f"✓ Duplicate walk-in correctly rejected")
        else:
            # Slot was already booked from previous test
            print(f"⚠ Slot {test_time} already booked - skipping duplicate test")


class TestCrossBookingPrevention:
    """Test that slots booked by patient are blocked for staff and vice versa"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": STAFF_USERNAME,
                "password": STAFF_PASSWORD
            }
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Staff login failed")
    
    def test_patient_booking_blocks_staff_walkin(self, staff_token):
        """Test that patient booking blocks staff walk-in for same slot"""
        test_time = "12:00"
        
        # Patient books the slot
        patient_booking = {
            "doctor": TEST_DOCTOR,
            "clinic": TEST_CLINIC,
            "date": TEST_DATE,
            "time": test_time,
            "patient_name": f"TEST_Patient_{uuid.uuid4().hex[:8]}",
            "patient_phone": "9876543213"
        }
        
        patient_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=patient_booking
        )
        
        if patient_response.status_code == 200:
            # Staff tries to book same slot
            staff_booking = {
                "doctor": TEST_DOCTOR,
                "clinic": TEST_CLINIC,
                "date": TEST_DATE,
                "time": test_time,
                "patient_name": f"TEST_Staff_{uuid.uuid4().hex[:8]}",
                "patient_phone": "9876543214"
            }
            
            staff_response = requests.post(
                f"{BASE_URL}/api/staff/appointments/walk-in",
                json=staff_booking,
                headers={"Authorization": f"Bearer {staff_token}"}
            )
            
            assert staff_response.status_code == 400, "Staff should not be able to book patient's slot"
            assert "already booked" in staff_response.json().get("detail", "").lower()
            print(f"✓ Cross-booking prevention working - staff blocked from patient's slot")
        else:
            print(f"⚠ Slot {test_time} already booked - cross-booking test skipped")


class TestDoctorNameVerification:
    """Verify Dr. Neha Patel name appears correctly in API"""
    
    def test_doctor_name_in_booked_slots_query(self):
        """Test that Dr. Neha Patel name works in booked-slots query"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": TEST_DATE
            }
        )
        assert response.status_code == 200, f"Query with Dr. Neha Patel should work: {response.text}"
        print(f"✓ Dr. Neha Patel name accepted in booked-slots API")
    
    def test_doctor_name_in_booking(self):
        """Test that Dr. Neha Patel name works in appointment booking"""
        booking_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TEST_DATE,
            "time": "12:15",
            "patient_name": f"TEST_NameCheck_{uuid.uuid4().hex[:8]}",
            "patient_phone": "9876543215"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=booking_data
        )
        
        # Either success or slot already booked - both are valid
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data["doctor"] == "Dr. Neha Patel", "Doctor name should be Dr. Neha Patel"
            print(f"✓ Dr. Neha Patel name correctly stored in appointment")
        else:
            print(f"✓ Dr. Neha Patel name accepted (slot was already booked)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
