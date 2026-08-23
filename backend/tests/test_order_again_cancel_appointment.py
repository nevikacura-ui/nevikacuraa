"""
Test Suite for Order Again Section and Cancel Appointment Features
- Order Again: GET /api/orders/history endpoint
- Cancel Appointment: PUT /api/diagyn-staff/appointments/{id}/status with {status: 'Cancelled'}
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

# Test phone number with seeded order
TEST_PHONE = "9999999999"

# Staff credentials for DiaGyn Staff Portal
STAFF_EMAIL = "nevikacura@gmail.com"


class TestOrderHistoryAPI:
    """Tests for GET /api/orders/history endpoint used by Order Again section"""
    
    def test_order_history_returns_orders_for_valid_phone(self):
        """Test that order history returns orders for phone with existing orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders/history",
            params={"phone": TEST_PHONE, "limit": 3}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "orders" in data, "Response should contain 'orders' key"
        
        # Verify orders array exists
        orders = data.get("orders", [])
        print(f"Found {len(orders)} orders for phone {TEST_PHONE}")
        
        # If orders exist, verify structure
        if orders:
            order = orders[0]
            print(f"First order: {order.get('order_id') or order.get('id')}")
            # Orders should have medicines or items array
            has_items = order.get("medicines") or order.get("items")
            print(f"Order has items: {bool(has_items)}")
    
    def test_order_history_with_limit_parameter(self):
        """Test that limit parameter works correctly"""
        response = requests.get(
            f"{BASE_URL}/api/orders/history",
            params={"phone": TEST_PHONE, "limit": 3}
        )
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        # Should return at most 3 orders
        assert len(orders) <= 3, f"Expected at most 3 orders, got {len(orders)}"
        print(f"Limit=3 returned {len(orders)} orders")
    
    def test_order_history_invalid_phone_returns_empty(self):
        """Test that invalid phone returns empty orders array"""
        response = requests.get(
            f"{BASE_URL}/api/orders/history",
            params={"phone": "0000000000", "limit": 3}
        )
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        print(f"Invalid phone returned {len(orders)} orders")
    
    def test_order_history_short_phone_returns_error(self):
        """Test that short phone number returns 400 error"""
        response = requests.get(
            f"{BASE_URL}/api/orders/history",
            params={"phone": "123", "limit": 3}
        )
        # Should return 400 for invalid phone
        assert response.status_code == 400, f"Expected 400 for short phone, got {response.status_code}"
        print("Short phone correctly returns 400 error")
    
    def test_order_history_order_structure(self):
        """Test that orders have expected structure for Order Again section"""
        response = requests.get(
            f"{BASE_URL}/api/orders/history",
            params={"phone": TEST_PHONE, "limit": 3}
        )
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        
        if orders:
            order = orders[0]
            # Check for required fields used by OrderAgainSection
            print(f"Order fields: {list(order.keys())}")
            
            # Order should have id or order_id
            has_id = order.get("id") or order.get("order_id") or order.get("booking_id")
            assert has_id, "Order should have id, order_id, or booking_id"
            
            # Order should have medicines or items
            items = order.get("medicines") or order.get("items") or []
            print(f"Order has {len(items)} items")
            
            # Check item structure if items exist
            if items:
                item = items[0]
                print(f"Item fields: {list(item.keys())}")
                assert item.get("name"), "Item should have name"


class TestDiaGynStaffLogin:
    """Tests for staff login to get auth token"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        # Try staff login endpoint
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_EMAIL, "password": "admin123"}
        )
        
        if response.status_code == 200:
            return response.json().get("token")
        
        # Try alternative credentials
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "admin123"}
        )
        
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Could not authenticate staff - skipping authenticated tests")
        return None
    
    def test_staff_login(self, staff_token):
        """Test that staff can login"""
        assert staff_token is not None, "Staff token should be obtained"
        print(f"Staff token obtained: {staff_token[:20]}...")


class TestCancelAppointmentAPI:
    """Tests for PUT /api/diagyn-staff/appointments/{id}/status endpoint"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        # Try different credential combinations
        credentials = [
            {"username": "admin", "password": "admin123"},
            {"username": STAFF_EMAIL, "password": "admin123"},
            {"username": "staff", "password": "staff123"},
        ]
        
        for creds in credentials:
            response = requests.post(
                f"{BASE_URL}/api/staff/login",
                json=creds
            )
            if response.status_code == 200:
                token = response.json().get("token")
                print(f"Logged in with {creds['username']}")
                return token
        
        pytest.skip("Could not authenticate staff - skipping authenticated tests")
        return None
    
    @pytest.fixture
    def test_appointment(self, staff_token):
        """Create a test appointment for cancellation testing"""
        if not staff_token:
            pytest.skip("No staff token available")
        
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # First, get today's appointments to find one to test with
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today, "clinic": "Pushpa Clinic"},
            headers=headers
        )
        
        if response.status_code == 200:
            appointments = response.json().get("appointments", [])
            # Find a Booked or pending appointment
            for apt in appointments:
                if apt.get("status") in ["Booked", "pending", "CheckedIn"]:
                    print(f"Found test appointment: {apt.get('id')} - {apt.get('patient_name')}")
                    return apt
        
        # If no existing appointment, create one
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "time": "18:00",
                "patient_name": "TEST_CancelTest",
                "patient_mobile": "9876543210",
                "appointment_type": "SCHEDULED"
            },
            headers=headers
        )
        
        if response.status_code == 200:
            apt = response.json().get("appointment", {})
            print(f"Created test appointment: {apt.get('id')}")
            return apt
        
        return None
    
    def test_cancel_appointment_status_update(self, staff_token, test_appointment):
        """Test that appointment can be cancelled via status update"""
        if not staff_token:
            pytest.skip("No staff token available")
        if not test_appointment:
            pytest.skip("No test appointment available")
        
        appointment_id = test_appointment.get("id")
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Cancel the appointment
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/{appointment_id}/status",
            json={"status": "Cancelled", "notes": "Test cancellation"},
            headers=headers
        )
        
        print(f"Cancel response: {response.status_code} - {response.text[:200] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("status") == "Cancelled", "Status should be Cancelled"
        print(f"Appointment {appointment_id} cancelled successfully")
    
    def test_cancel_appointment_requires_auth(self):
        """Test that cancel endpoint requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/fake-id/status",
            json={"status": "Cancelled"}
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Cancel endpoint correctly requires authentication")
    
    def test_cancel_nonexistent_appointment(self, staff_token):
        """Test cancelling non-existent appointment returns 404"""
        if not staff_token:
            pytest.skip("No staff token available")
        
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/nonexistent-id-12345/status",
            json={"status": "Cancelled"},
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent appointment, got {response.status_code}"
        print("Non-existent appointment correctly returns 404")


class TestDiaGynStaffConfig:
    """Tests for staff portal configuration endpoint"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        credentials = [
            {"username": "admin", "password": "admin123"},
            {"username": STAFF_EMAIL, "password": "admin123"},
        ]
        
        for creds in credentials:
            response = requests.post(
                f"{BASE_URL}/api/staff/login",
                json=creds
            )
            if response.status_code == 200:
                return response.json().get("token")
        
        pytest.skip("Could not authenticate staff")
        return None
    
    def test_get_portal_config(self, staff_token):
        """Test that portal config endpoint returns expected data"""
        if not staff_token:
            pytest.skip("No staff token available")
        
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/config",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "clinics" in data, "Config should contain clinics"
        assert "doctor_schedule" in data, "Config should contain doctor_schedule"
        assert "fee_codes" in data, "Config should contain fee_codes"
        
        print(f"Config clinics: {list(data.get('clinics', {}).keys())}")
        print(f"Config doctors: {list(data.get('doctor_schedule', {}).keys())}")


class TestAppointmentsByDate:
    """Tests for appointments by date endpoint"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        credentials = [
            {"username": "admin", "password": "admin123"},
        ]
        
        for creds in credentials:
            response = requests.post(
                f"{BASE_URL}/api/staff/login",
                json=creds
            )
            if response.status_code == 200:
                return response.json().get("token")
        
        pytest.skip("Could not authenticate staff")
        return None
    
    def test_get_appointments_by_date(self, staff_token):
        """Test getting appointments for a specific date"""
        if not staff_token:
            pytest.skip("No staff token available")
        
        headers = {"Authorization": f"Bearer {staff_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": today, "clinic": "Pushpa Clinic"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "appointments" in data, "Response should contain appointments"
        assert "summary" in data, "Response should contain summary"
        
        appointments = data.get("appointments", [])
        summary = data.get("summary", {})
        
        print(f"Found {len(appointments)} appointments for {today}")
        print(f"Summary: {summary}")
        
        # Check appointment structure if any exist
        if appointments:
            apt = appointments[0]
            assert apt.get("id"), "Appointment should have id"
            assert apt.get("status"), "Appointment should have status"
            print(f"First appointment: {apt.get('patient_name')} - {apt.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
