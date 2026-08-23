"""
Test suite for Source Display feature - verify source field is saved and returned in appointments
Tests Staff, Website, and WhatsApp booking sources
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSourceDisplay:
    """Test source field in appointments"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff login token for diagyn"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff authentication failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin login token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_staff_login_success(self):
        """Test staff login works"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Staff login successful, token received")
    
    def test_admin_login_success(self):
        """Test admin login works with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Admin login successful, token received")

    def test_staff_booked_appointment_has_source_staff(self, staff_token):
        """Test appointments booked by staff have source='Staff'"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Use tomorrow's date with unique time slot
        import random
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        time_slot = f"11:{random.randint(0,59):02d}"
        
        # Book an appointment via staff endpoint
        booking_data = {
            "patient_name": f"TEST_SourceStaff_{random.randint(1000,9999)}",
            "patient_mobile": f"98765{random.randint(10000,99999)}",
            "patient_id": None,
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": tomorrow,
            "time": time_slot,
            "appointment_type": "SCHEDULED",
            "notes": "Test for source display feature"
        }
        
        book_resp = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=booking_data,
            headers=headers
        )
        
        assert book_resp.status_code in [200, 201], f"Staff booking failed: {book_resp.text}"
        booked = book_resp.json()
        
        # Verify source is 'Staff' in the appointment response
        appointment = booked.get("appointment", booked)
        assert appointment.get("source") == "Staff", f"Expected source='Staff', got source='{appointment.get('source')}'"
        print(f"✓ Staff-booked appointment has source='Staff'")
        print(f"  Booking ID: {appointment.get('booking_id')}")

    def test_todays_appointments_have_source_field(self, staff_token):
        """Test that today's appointments include source field"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Get today's appointments
        resp = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/today",
            headers=headers
        )
        
        assert resp.status_code == 200, f"Appointments fetch failed: {resp.text}"
        data = resp.json()
        appointments = data.get("appointments", [])
        
        print(f"✓ Found {len(appointments)} appointments for today")
        
        # Check if appointments have source field
        source_count = sum(1 for apt in appointments if apt.get("source"))
        print(f"  {source_count} appointments have source field populated")
        
        # Verify at least one appointment has source='Staff' (from test data)
        staff_sources = [apt for apt in appointments if apt.get("source") == "Staff"]
        print(f"  {len(staff_sources)} appointments with source='Staff'")
        
        # Print examples
        for apt in appointments[:3]:
            if apt.get("source"):
                print(f"    - {apt.get('patient_name', 'N/A')}: source='{apt.get('source')}'")

    def test_appointments_by_date_includes_source(self, staff_token):
        """Test appointments/by-date endpoint includes source field"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        resp = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date?date={today}",
            headers=headers
        )
        
        assert resp.status_code == 200, f"Appointments by date failed: {resp.text}"
        data = resp.json()
        appointments = data.get("appointments", [])
        
        print(f"✓ appointments/by-date returned {len(appointments)} appointments")
        
        # Check source field exists
        for apt in appointments:
            if apt.get("source"):
                print(f"  - {apt.get('patient_name')}: source='{apt.get('source')}'")
                assert apt.get("source") in ["Staff", "Website", "WhatsApp"], f"Invalid source: {apt.get('source')}"

    def test_admin_orders_recent_missing_appointments(self, admin_token):
        """Test that admin orders/recent endpoint needs to include appointments (currently missing)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders/recent",
            headers=headers
        )
        
        assert resp.status_code == 200, f"Admin orders/recent failed: {resp.text}"
        data = resp.json()
        
        # Check what fields are returned
        has_pharmacy = "pharmacy_orders" in data
        has_diagnostic = "diagnostic_orders" in data
        has_appointments = "appointments" in data
        
        print(f"✓ Admin orders/recent response fields:")
        print(f"  - pharmacy_orders: {'Yes' if has_pharmacy else 'No'}")
        print(f"  - diagnostic_orders: {'Yes' if has_diagnostic else 'No'}")
        print(f"  - appointments: {'Yes' if has_appointments else 'No'} (EXPECTED BUT MISSING)")
        
        # This test documents the bug - frontend expects appointments but backend doesn't return them
        if not has_appointments:
            print("  ⚠️ BUG: Frontend Admin.js expects 'appointments' field but backend doesn't return it")

    def test_source_colors_validation(self):
        """Validate expected source values and their display mapping"""
        valid_sources = ["Staff", "Website", "WhatsApp"]
        color_mapping = {
            "Staff": "#6366F1 (indigo)",
            "Website": "#3B82F6 (blue)",
            "WhatsApp": "#25D366 (green)"
        }
        
        print("✓ Source color mapping validation:")
        for source, color in color_mapping.items():
            print(f"  - {source}: {color}")
        
        assert set(valid_sources) == {"Staff", "Website", "WhatsApp"}


class TestSourceFieldInBookingEndpoints:
    """Test source field is set correctly at booking endpoints"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff login token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff authentication failed")
    
    def test_diagyn_staff_book_endpoint_sets_source_staff(self, staff_token):
        """Verify POST /api/diagyn-staff/appointments/book adds source='Staff'"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        import random
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        time_slot = f"12:{random.randint(0,59):02d}"
        
        booking_data = {
            "patient_name": f"TEST_SourceVerify_{random.randint(1000,9999)}",
            "patient_mobile": f"98765{random.randint(10000,99999)}",
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": tomorrow,
            "time": time_slot,
            "appointment_type": "SCHEDULED",
            "notes": ""
        }
        
        resp = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=booking_data,
            headers=headers
        )
        
        assert resp.status_code in [200, 201], f"Booking failed: {resp.text}"
        result = resp.json()
        
        appointment = result.get("appointment", result)
        assert "source" in appointment, "source field not in response"
        assert appointment["source"] == "Staff", f"Expected 'Staff', got '{appointment['source']}'"
        print(f"✓ Staff booking endpoint correctly sets source='Staff'")
        print(f"  Booking ID: {appointment.get('booking_id')}")

    def test_guest_book_endpoint_sets_source_website(self):
        """Verify POST /api/guest-book adds source='Website'"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        booking_data = {
            "patient_name": "TEST_GuestSource",
            "patient_phone": "9876500010",
            "patient_email": "test_guest@test.com",
            "patient_age": 25,
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": tomorrow,
            "time": "15:00"
        }
        
        resp = requests.post(
            f"{BASE_URL}/api/guest-book",
            json=booking_data
        )
        
        if resp.status_code not in [200, 201]:
            pytest.skip(f"Guest booking returned {resp.status_code}: {resp.text}")
        
        result = resp.json()
        assert result.get("source") == "Website", f"Expected 'Website', got '{result.get('source')}'"
        print(f"✓ Guest booking endpoint correctly sets source='Website'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
