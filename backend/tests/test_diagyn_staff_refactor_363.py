"""
DiaGyn Staff Portal Refactoring Tests - Iteration 363
Tests all API endpoints from the refactored diagyn_staff package.
Verifies that the monolithic file split into 14 modules works correctly.
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

# Test credentials
STAFF_USERNAME = "staff_diagyn"
STAFF_PASSWORD = "test1234"
ADMIN_USERNAME = "nevikacura"
ADMIN_PASSWORD = "test1234"


class TestDiaGynStaffAuth:
    """Test authentication for DiaGyn Staff Portal"""
    
    @pytest.fixture(scope="class")
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_staff_login_success(self):
        """Test staff login returns valid token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["role"] == "diagyn_staff"
    
    def test_unauthorized_access_without_token(self):
        """Test endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config")
        assert response.status_code == 401


class TestDiaGynStaffConfig:
    """Test /api/diagyn-staff/config endpoint from summary.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_config_returns_clinics(self, auth_headers):
        """GET /api/diagyn-staff/config returns clinics"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "clinics" in data
        assert "Pushpa Clinic" in data["clinics"]
        assert "Amnion Clinic" in data["clinics"]
    
    def test_config_returns_fee_codes(self, auth_headers):
        """GET /api/diagyn-staff/config returns fee_codes"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "fee_codes" in data
        assert "Dr. Vikas Jha" in data["fee_codes"]
        assert "Dr. Neha Patel" in data["fee_codes"]
        # Verify fee code structure
        vikas_fees = data["fee_codes"]["Dr. Vikas Jha"]
        assert "G1" in vikas_fees
        assert vikas_fees["G1"]["label"] == "General - New"
        assert vikas_fees["G1"]["amount"] == 150
    
    def test_config_returns_scan_fees(self, auth_headers):
        """GET /api/diagyn-staff/config returns scan_fees"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "scan_fees" in data
        assert "ES" in data["scan_fees"]
        assert data["scan_fees"]["ES"]["label"] == "Early Scan"
        assert data["scan_fees"]["ES"]["amount"] == 1000
    
    def test_config_returns_doctor_schedule(self, auth_headers):
        """GET /api/diagyn-staff/config returns doctor_schedule"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "doctor_schedule" in data
        assert "Dr. Vikas Jha" in data["doctor_schedule"]
        assert "Pushpa Clinic" in data["doctor_schedule"]["Dr. Vikas Jha"]


class TestDiaGynStaffAppointments:
    """Test appointment endpoints from appointments.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_todays_appointments(self, auth_headers):
        """GET /api/diagyn-staff/appointments/today returns today's appointments"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/appointments/today", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "appointments" in data
        assert "summary" in data
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary
        assert "booked" in summary
        assert "checked_in" in summary
        assert "completed" in summary
    
    def test_get_appointments_by_date(self, auth_headers):
        """GET /api/diagyn-staff/appointments/by-date returns appointments for specific date"""
        test_date = "2026-04-01"
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": test_date},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert data["date"] == test_date
        assert "appointments" in data
        assert "summary" in data
    
    def test_book_appointment(self, auth_headers):
        """POST /api/diagyn-staff/appointments/book creates new appointment"""
        today = datetime.now().strftime("%Y-%m-%d")
        appointment_data = {
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Vikas Jha",
            "date": today,
            "time": "19:00",
            "patient_name": "TEST_Refactor_Patient",
            "patient_mobile": "9999888877",
            "appointment_type": "SCHEDULED",
            "notes": "Test appointment for refactoring verification"
        }
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=appointment_data,
            headers=auth_headers
        )
        # May return 200 or 409 if slot already booked
        assert response.status_code in [200, 409], f"Unexpected status: {response.status_code}, {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert "booking_id" in data
            assert "appointment" in data


class TestDiaGynStaffSlots:
    """Test slot endpoints from slots.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_available_slots(self, auth_headers):
        """GET /api/diagyn-staff/slots/available returns available slots"""
        # Use a future date to ensure slots are available
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={
                "clinic": "Amnion Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": future_date
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "clinic" in data
        assert "doctor" in data
        assert "date" in data
        assert "available_slots" in data
        assert "morning_slots" in data
        assert "evening_slots" in data
    
    def test_get_booked_slots(self, auth_headers):
        """GET /api/diagyn-staff/slots/booked returns booked slots"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/slots/booked",
            params={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        assert isinstance(data["booked_slots"], list)


class TestDiaGynStaffPatients:
    """Test patient endpoints from patients.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_patient_lookup(self, auth_headers):
        """POST /api/diagyn-staff/patient/lookup searches for patient"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/patient/lookup",
            json={"mobile": "9999888877"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Either found or not found is valid
        assert "found" in data or "mobile" in data
    
    def test_patient_register(self, auth_headers):
        """POST /api/diagyn-staff/patient/register creates new patient"""
        import random
        test_mobile = f"99{random.randint(10000000, 99999999)}"
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/patient/register",
            json={
                "name": "TEST_Refactor_NewPatient",
                "mobile": test_mobile,
                "age": 30,
                "gender": "Female"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "patient_id" in data


class TestDiaGynStaffSummary:
    """Test summary endpoints from summary.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_daily_summary(self, auth_headers):
        """GET /api/diagyn-staff/summary/daily returns daily collection summary"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/summary/daily", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "total_patients" in data
        assert "total_collection" in data
        assert "by_clinic" in data
    
    def test_weekly_summary(self, auth_headers):
        """GET /api/diagyn-staff/summary/weekly returns weekly summary"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/summary/weekly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert data["period"] == "weekly"
        assert "dates" in data
        assert "total_patients" in data
        assert "total_collection" in data
        assert "by_date" in data
    
    def test_monthly_summary(self, auth_headers):
        """GET /api/diagyn-staff/summary/monthly returns monthly summary"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/summary/monthly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert data["period"] == "monthly"
        assert "month" in data
        assert "year" in data
        assert "total_patients" in data
        assert "total_collection" in data


class TestDiaGynStaffBilling:
    """Test billing endpoints from billing.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_billing_pending(self, auth_headers):
        """GET /api/diagyn-staff/billing/pending returns pending billings"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/billing/pending", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "pending_count" in data
        assert "appointments" in data
    
    def test_billing_analytics(self, auth_headers):
        """GET /api/diagyn-staff/billing/analytics returns billing analytics"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/billing/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "date" in data
        assert "total_bills" in data
        assert "avg_billing_seconds" in data
        assert "total_collected" in data


class TestDiaGynStaffQueue:
    """Test queue endpoints from queue.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_queue_insights(self, auth_headers):
        """GET /api/diagyn-staff/queue/insights returns queue insights"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/queue/insights", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "date" in data
        assert "waiting_count" in data
        assert "with_doctor_count" in data
        assert "billing_count" in data
        assert "completed_count" in data
        assert "avg_wait_minutes" in data


class TestDiaGynStaffPayments:
    """Test payment endpoints from payments.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_appointment_lookup_by_code(self, auth_headers):
        """GET /api/diagyn-staff/appointments/lookup/{code} looks up appointment"""
        # Use a non-existent code to test endpoint exists
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/lookup/NONEXISTENT123",
            headers=auth_headers
        )
        # Should return 404 for non-existent code
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestDiaGynStaffCheckin:
    """Test check-in endpoints from checkin.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_checkin_by_code_nonexistent(self, auth_headers):
        """POST /api/diagyn-staff/check-in/by-code returns 404 for invalid code"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/check-in/by-code",
            json={"booking_code": "INVALID123", "clinic": "Pushpa Clinic"},
            headers=auth_headers
        )
        # Should return 404 for non-existent booking code
        assert response.status_code == 404


class TestDiaGynStaffReviews:
    """Test review endpoints from reviews.py"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_review_stats(self, auth_headers):
        """GET /api/diagyn-staff/review-stats returns review statistics"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/review-stats",
            params={"clinic": "Pushpa Clinic"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "today" in data
        assert "weekly" in data
        assert "review_rate" in data


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
