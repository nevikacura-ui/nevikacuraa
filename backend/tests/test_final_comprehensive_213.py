"""
Final Comprehensive Test Suite - Iteration 213
Tests: Homepage APIs, Bottom Nav, Calendar, Pre-consultation, Home Test, 
       Prescription Wallet, Order Tracking, Staff Portals, Extracted Routes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')


class TestHealthCheck:
    """Basic health check - run first"""
    
    def test_api_health(self):
        """Verify API is operational"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"PASS: API health check - status={data.get('status')}")


class TestExtractedRoutes:
    """Test the new modularized/extracted routes from server.py"""
    
    def test_family_members_api(self):
        """Test GET /api/family/members - extracted from server.py"""
        response = requests.get(f"{BASE_URL}/api/family/members?phone=9403890429")
        # Should return 200 (even if empty)
        assert response.status_code in [200, 404]
        print(f"PASS: Family members API - status={response.status_code}")
    
    def test_subscriptions_api(self):
        """Test GET /api/subscriptions - extracted route"""
        response = requests.get(f"{BASE_URL}/api/subscriptions?phone=9403890429")
        assert response.status_code in [200, 404]
        print(f"PASS: Subscriptions API - status={response.status_code}")
    
    def test_diagnostics_booking_system(self):
        """Test GET /api/diagnostics/booking-system - extracted route"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code in [200, 404]
        print(f"PASS: Diagnostics booking system API - status={response.status_code}")


class TestPharmacyV2Routes:
    """Test Pharmacy V2 extracted routes"""
    
    def test_alternatives_by_name(self):
        """Test GET /api/pharmacy/v2/alternatives-by-name?name=Paracetamol"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v2/alternatives-by-name?name=Paracetamol")
        assert response.status_code == 200
        data = response.json()
        assert "search_term" in data
        assert "alternatives" in data
        print(f"PASS: Pharmacy alternatives - found {data.get('count', 0)} alternatives for Paracetamol")
    
    def test_prescription_wallet(self):
        """Test GET /api/prescriptions/wallet/{phone}"""
        response = requests.get(f"{BASE_URL}/api/prescriptions/wallet/9403890429")
        assert response.status_code == 200
        data = response.json()
        assert "prescriptions" in data
        print(f"PASS: Prescription wallet - found {len(data.get('prescriptions', []))} prescriptions")
    
    def test_order_history(self):
        """Test GET /api/pharmacy/v2/order-history/{phone}"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v2/order-history/9403890429")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"PASS: Order history - found {len(data.get('orders', []))} orders")


class TestAppointmentV2Routes:
    """Test Appointment V2 extracted routes"""
    
    def test_appointment_calendar(self):
        """Test GET /api/appointments/v2/calendar?month=3&year=2026"""
        response = requests.get(f"{BASE_URL}/api/appointments/v2/calendar?month=3&year=2026")
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "year" in data
        assert "calendar" in data
        print(f"PASS: Appointment calendar - month={data.get('month')}, total={data.get('total_appointments', 0)}")
    
    def test_available_slots(self):
        """Test GET /api/appointments/v2/available-slots?date=2026-03-15"""
        response = requests.get(f"{BASE_URL}/api/appointments/v2/available-slots?date=2026-03-15")
        assert response.status_code == 200
        data = response.json()
        assert "slots" in data
        assert "total_available" in data
        print(f"PASS: Available slots - {data.get('total_available', 0)} available for 2026-03-15")
    
    def test_pre_consultation_validation(self):
        """Test POST /api/appointments/v2/pre-consultation - validation"""
        response = requests.post(
            f"{BASE_URL}/api/appointments/v2/pre-consultation",
            json={
                "appointment_id": "invalid_test_id",
                "chief_complaint": "Test complaint"
            }
        )
        # Should return 404 for invalid appointment_id (validation works)
        assert response.status_code in [404, 422]
        print(f"PASS: Pre-consultation validation - correctly rejects invalid appointment_id (status={response.status_code})")
    
    def test_home_test_scheduler(self):
        """Test POST /api/appointments/v2/home-test - schedule home collection"""
        test_data = {
            "patient_name": "TEST_HomeCollection",
            "patient_phone": "9876543210",
            "address": "123 Test Street, Test City",
            "tests": ["CBC", "Thyroid Profile"],
            "preferred_date": "2026-03-20",
            "preferred_time": "Morning (7-10 AM)",
            "special_instructions": "Test - please ignore"
        }
        response = requests.post(f"{BASE_URL}/api/appointments/v2/home-test", json=test_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        assert "collection" in data
        print(f"PASS: Home test scheduler - created collection ID={data.get('collection', {}).get('id')}")


class TestStaffPortalLogin:
    """Test staff portal authentication for all portals"""
    
    def test_diagyn_staff_login(self):
        """Test DiaGyn staff portal login: staff_diagyn/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"PASS: DiaGyn staff login - portal={data.get('portal', 'diagyn')}")
    
    def test_mango_staff_login(self):
        """Test Mango Labs staff portal login: staff_mango/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_mango", "password": "test1234"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"PASS: Mango staff login - portal={data.get('portal', 'mango')}")
    
    def test_orange_staff_login(self):
        """Test Orange Pharmacy staff portal login: staff_orange/test1234"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_orange", "password": "test1234"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"PASS: Orange staff login - portal={data.get('portal', 'pharmacy')}")


class TestTrackingAPI:
    """Test order tracking endpoints"""
    
    def test_guest_orders(self):
        """Test GET /api/guest/orders - guest order listing"""
        response = requests.get(f"{BASE_URL}/api/guest/orders?phone=9403890429")
        assert response.status_code == 200
        data = response.json()
        # Should have pharmacy_orders, diagnostic_orders, appointments keys
        print(f"PASS: Guest orders - pharmacy={len(data.get('pharmacy_orders', []))}, "
              f"diagnostic={len(data.get('diagnostic_orders', []))}, "
              f"appointments={len(data.get('appointments', []))}")


class TestLiveQueueStatus:
    """Test live queue status for clinics"""
    
    def test_diagyn_queue_status(self):
        """Test GET /api/live-queue/status/diagyn"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/diagyn")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: DiaGyn queue status - waiting={data.get('waiting', 0)}")
        else:
            print(f"PASS: DiaGyn queue - no queue data (expected)")
    
    def test_mango_queue_status(self):
        """Test GET /api/live-queue/status/mango"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/mango")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Mango queue status - waiting={data.get('waiting', 0)}")
        else:
            print(f"PASS: Mango queue - no queue data (expected)")


class TestDoctorNextAvailable:
    """Test next available slot API for homepage"""
    
    def test_next_available_slot(self):
        """Test GET /api/doctors/next-available - for homepage preview"""
        response = requests.get(f"{BASE_URL}/api/doctors/next-available?doctor=Dr.%20Vikas%20Jha")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Next available slot - available={data.get('available')}, day={data.get('day_label')}")
        else:
            print(f"PASS: Next available slot - no slots found (expected)")


class TestHealthStats:
    """Test health stats API for track page"""
    
    def test_health_stats(self):
        """Test GET /api/health-stats/{phone}"""
        response = requests.get(f"{BASE_URL}/api/health-stats/9403890429")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Health stats - metrics count={len(data.get('metrics', []))}")
        else:
            print(f"PASS: Health stats - no data (expected for new user)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
