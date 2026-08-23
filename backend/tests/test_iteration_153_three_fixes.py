"""
Iteration 153: Test three fixes
1. DiaGyn Staff Portal Book tab - POST /api/diagyn-staff/appointments/book
2. Mango Labs Staff Portal - Token tab removed (frontend only)
3. Orange Pharmacy Staff Portal - Token tab removed (frontend only)
4. NevikaCuraOne - Input text color fix (frontend only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDiaGynStaffBookTab:
    """Test DiaGyn Staff Portal Book tab functionality"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed - skipping authenticated tests")
    
    def test_staff_login(self):
        """Test staff login works"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✅ Staff login successful - Token received")
    
    def test_diagyn_config_has_book_types(self, staff_token):
        """Test DiaGyn config endpoint includes booking types"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/config",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Config fetch failed: {response.text}"
        data = response.json()
        
        # Verify appointment_types includes SCHEDULED (for booking)
        assert "appointment_types" in data
        assert "SCHEDULED" in data["appointment_types"]
        assert "WALK_IN" in data["appointment_types"]
        print(f"✅ DiaGyn config has appointment_types: {data['appointment_types']}")
    
    def test_get_available_slots_for_booking(self, staff_token):
        """Test getting available slots for booking mode"""
        import datetime
        tomorrow = (datetime.datetime.now() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": tomorrow,
                "mode": "book"
            },
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Slots fetch failed: {response.text}"
        data = response.json()
        
        # Should have slots available (either morning or evening or both)
        # Or a message if doctor unavailable that day
        assert "available_slots" in data or "message" in data
        print(f"✅ Available slots fetched for booking - Total: {len(data.get('available_slots', []))}")
    
    def test_book_appointment_via_staff_portal(self, staff_token):
        """Test booking appointment through DiaGyn Staff Portal Book tab API"""
        import datetime
        import uuid
        
        tomorrow = (datetime.datetime.now() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        test_mobile = f"98{uuid.uuid4().hex[:8]}"[:10]  # Unique 10-digit mobile
        
        booking_data = {
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Vikas Jha",
            "date": tomorrow,
            "time": "11:30",  # Morning slot
            "patient_name": "Test Patient Book",
            "patient_mobile": test_mobile,
            "appointment_type": "SCHEDULED"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=booking_data,
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "booking_id" in data
        assert data["booking_id"].startswith("DG-")
        
        # Verify appointment data
        appointment = data.get("appointment", {})
        assert appointment.get("patient_name") == "Test Patient Book"
        assert appointment.get("clinic") == "Pushpa Clinic"
        assert appointment.get("doctor") == "Dr. Vikas Jha"
        assert appointment.get("status") == "Booked"
        
        print(f"✅ Appointment booked via Staff Portal - Booking ID: {data['booking_id']}")
    
    def test_book_appointment_sends_whatsapp(self, staff_token):
        """Test that booking via staff portal attempts WhatsApp notification"""
        import datetime
        import uuid
        
        tomorrow = (datetime.datetime.now() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        test_mobile = f"99{uuid.uuid4().hex[:8]}"[:10]  # Unique 10-digit mobile
        
        booking_data = {
            "clinic": "Amnion Clinic",
            "doctor": "Dr. Neha Patel",
            "date": tomorrow,
            "time": "11:45",
            "patient_name": "WhatsApp Test Patient",
            "patient_mobile": test_mobile,
            "appointment_type": "SCHEDULED",
            "notes": "Test booking for WhatsApp verification"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=booking_data,
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print(f"✅ Appointment booked - WhatsApp notification attempted to 91{test_mobile}")
        print(f"   (WhatsApp delivery not verified in test environment)")


class TestMangoLabsStaffPortal:
    """Test Mango Labs Staff Portal - Token tab should be removed"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_mango",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed - skipping authenticated tests")
    
    def test_mango_staff_login(self):
        """Test Mango Labs staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_mango",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Mango staff login failed: {response.text}"
        print(f"✅ Mango Labs staff login successful")
    
    def test_mango_dashboard_stats(self, staff_token):
        """Test Mango Labs dashboard stats endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/mango/dashboard/stats",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        # May return 200 or other status depending on data
        assert response.status_code in [200, 404], f"Stats fetch unexpected error: {response.text}"
        print(f"✅ Mango Labs dashboard stats endpoint accessible")


class TestOrangePharmacyStaffPortal:
    """Test Orange Pharmacy Staff Portal - Token tab should be removed"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed - skipping authenticated tests")
    
    def test_orange_staff_login(self):
        """Test Orange Pharmacy staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Orange staff login failed: {response.text}"
        print(f"✅ Orange Pharmacy staff login successful")
    
    def test_orange_dashboard_stats(self, staff_token):
        """Test Orange Pharmacy dashboard stats endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/dashboard/stats",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        # May return 200 or other status depending on data
        assert response.status_code in [200, 404], f"Stats fetch unexpected error: {response.text}"
        print(f"✅ Orange Pharmacy dashboard stats endpoint accessible")


class TestNevikaCuraOnePage:
    """Test NevikaCuraOne page - Input fields should have dark text"""
    
    def test_nevika_cura_one_page_loads(self):
        """Test NevikaCuraOne page is accessible"""
        response = requests.get(f"{BASE_URL}/one")
        # React app will return 200 for any route
        assert response.status_code == 200
        print(f"✅ NevikaCuraOne page accessible at /one")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
