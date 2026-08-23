"""
Comprehensive API tests for all extracted route files.
Tests auth_routes, appointment_routes, service_routes, push_routes.
Run: cd /app/backend && python -m pytest tests/ -v
"""
import os
import sys
import pytest
import requests

BASE_URL = os.environ.get("TEST_BASE_URL", "https://premium-rx-portal.preview.emergentagent.com")

# ============ Fixtures ============

@pytest.fixture(scope="module")
def patient_token():
    """Get a patient auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "final_test@test.com", "password": "test1234"
    })
    if resp.status_code == 200:
        return resp.json()["token"]
    # Register if not exists
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "pytest_user@test.com", "password": "test1234",
        "name": "Pytest User", "phone": "7777000099"
    })
    assert resp.status_code == 200
    return resp.json()["token"]


@pytest.fixture(scope="module")
def staff_token():
    """Get a staff auth token"""
    resp = requests.post(f"{BASE_URL}/api/staff/login", json={
        "username": "staff_diagyn", "password": "test1234"
    })
    assert resp.status_code == 200
    return resp.json()["token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ============ Health Check ============

class TestHealth:
    def test_health_endpoint(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ============ Auth Routes (auth_routes.py) ============

class TestAuthRoutes:
    def test_register_duplicate_email(self):
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "final_test@test.com", "password": "test1234",
            "name": "Dup Test", "phone": "1111111111"
        })
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"].lower()

    def test_login_valid(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "final_test@test.com", "password": "test1234"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data

    def test_login_invalid_password(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "final_test@test.com", "password": "wrongpassword"
        })
        assert resp.status_code == 401

    def test_login_invalid_email(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com", "password": "test1234"
        })
        assert resp.status_code == 401

    def test_get_me(self, patient_token):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_header(patient_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "email" in data
        assert "name" in data

    def test_get_me_no_token(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code in [401, 422]

    def test_loyalty_points(self, patient_token):
        resp = requests.get(f"{BASE_URL}/api/user/loyalty-points", headers=auth_header(patient_token))
        assert resp.status_code == 200
        assert "loyalty_points" in resp.json()

    def test_loyalty_details(self, patient_token):
        resp = requests.get(f"{BASE_URL}/api/user/loyalty", headers=auth_header(patient_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "current_points" in data
        assert "tier" in data

    def test_user_preferences_get(self, patient_token):
        resp = requests.get(f"{BASE_URL}/api/user/preferences", headers=auth_header(patient_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "interests" in data

    def test_user_preferences_update(self, patient_token):
        resp = requests.put(f"{BASE_URL}/api/user/preferences",
            headers=auth_header(patient_token),
            json={"interests": ["diagyn", "pharmacy"], "onboarding_complete": True})
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_biometric_status(self, patient_token):
        resp = requests.get(f"{BASE_URL}/api/auth/biometric/status", headers=auth_header(patient_token))
        assert resp.status_code == 200
        assert "biometric_enabled" in resp.json()

    def test_trusted_devices(self, patient_token):
        resp = requests.get(f"{BASE_URL}/api/auth/trusted-devices", headers=auth_header(patient_token))
        assert resp.status_code == 200
        assert "devices" in resp.json()

    def test_remember_me_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login/remember", json={
            "email": "final_test@test.com", "password": "test1234",
            "remember_me": True, "device_id": "pytest-device"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["remember_me"] is True
        assert data["expires_in_days"] == 30

    def test_guest_send_otp(self):
        resp = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={"mobile": "9876543210"})
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_patient_check_email(self):
        resp = requests.post(f"{BASE_URL}/api/auth/patient/check-email", json={"email": "final_test@test.com"})
        assert resp.status_code == 200
        assert resp.json()["exists"] is True

    def test_guest_orders(self):
        resp = requests.get(f"{BASE_URL}/api/guest/orders?phone=9999000001")
        assert resp.status_code == 200
        data = resp.json()
        assert "appointments" in data
        assert "pharmacy_orders" in data

    def test_orders_history(self):
        resp = requests.get(f"{BASE_URL}/api/orders/history?phone=9999000001")
        assert resp.status_code == 200
        assert "orders" in resp.json()


# ============ Appointment Routes (appointment_routes.py) ============

class TestAppointmentRoutes:
    def test_booked_slots(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": "2026-03-15"
        })
        assert resp.status_code == 200
        assert "booked_slots" in resp.json()

    def test_next_available_slot(self):
        resp = requests.get(f"{BASE_URL}/api/doctors/next-available", params={"doctor": "Dr. Vikas Jha"})
        assert resp.status_code == 200
        data = resp.json()
        assert "available" in data

    def test_booking_limits(self):
        resp = requests.get(f"{BASE_URL}/api/booking-limits/status", params={"phone": "9999000001"})
        assert resp.status_code == 200
        data = resp.json()
        assert "can_book_appointment" in data
        assert "active_appointments" in data

    def test_blocked_slots(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/blocked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": "2026-03-15"
        })
        assert resp.status_code == 200
        assert "blocked_slots" in resp.json()

    def test_feedback_invalid_token(self):
        resp = requests.post(f"{BASE_URL}/api/feedback/nonexistent-token", json={"rating": 5})
        assert resp.status_code == 404
        assert "Invalid feedback link" in resp.json()["detail"]

    def test_appointments_by_phone(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/by-phone/9999000001")
        assert resp.status_code == 200
        assert "appointments" in resp.json()

    def test_appointment_history(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/history", params={"phone": "9999000001"})
        assert resp.status_code == 200
        assert "appointments" in resp.json()

    def test_get_appointments_authed(self, patient_token):
        resp = requests.get(f"{BASE_URL}/api/appointments", headers=auth_header(patient_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ============ Service Routes (service_routes.py) ============

class TestServiceRoutes:
    def test_otp_send_invalid_phone(self):
        resp = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": "123", "service": "diagyn"})
        assert resp.status_code == 400
        assert "Invalid phone" in resp.json()["detail"]

    def test_otp_send_invalid_service(self):
        resp = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": "9876543210", "service": "invalid"})
        assert resp.status_code == 400
        assert "Invalid service" in resp.json()["detail"]

    def test_otp_verify_no_otp(self):
        resp = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "phone": "9876543210", "otp": "123456", "service": "diagyn"
        })
        assert resp.status_code == 400
        assert "OTP not found" in resp.json()["detail"]

    def test_booking_code_verify(self):
        resp = requests.post(f"{BASE_URL}/api/booking-code/verify", json={
            "booking_id": "9999", "code": "0000"
        })
        assert resp.status_code == 200  # Returns result dict (may be success=false)

    def test_pharmacy_autocomplete(self):
        resp = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete", params={"q": "para"})
        assert resp.status_code == 200
        assert "suggestions" in resp.json()

    def test_pharmacy_autocomplete_short_query(self):
        resp = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete", params={"q": "a"})
        assert resp.status_code == 200
        assert resp.json()["suggestions"] == []

    def test_pharmacy_forms(self):
        resp = requests.get(f"{BASE_URL}/api/pharmacy/forms")
        assert resp.status_code == 200
        assert "forms" in resp.json()

    def test_pharmacy_inventory_legacy(self):
        resp = requests.get(f"{BASE_URL}/api/pharmacy/inventory-legacy")
        assert resp.status_code == 200
        assert "medicines" in resp.json()


# ============ Push Routes (push_routes.py) ============

class TestPushRoutes:
    def test_vapid_public_key(self):
        resp = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert resp.status_code == 200
        assert "publicKey" in resp.json()

    def test_push_subscribe(self, patient_token):
        resp = requests.post(f"{BASE_URL}/api/push/subscribe",
            headers=auth_header(patient_token),
            json={"endpoint": "https://test.example.com/push", "keys": {"p256dh": "test", "auth": "test"}})
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_push_unsubscribe(self):
        resp = requests.post(f"{BASE_URL}/api/push/unsubscribe",
            json={"endpoint": "https://test.example.com/push", "keys": {"p256dh": "test", "auth": "test"}})
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_push_test_no_auth(self):
        resp = requests.post(f"{BASE_URL}/api/push/test")
        assert resp.status_code in [401, 422]


# ============ Staff Login ============

class TestStaffAuth:
    def test_staff_login_valid(self):
        resp = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn", "password": "test1234"
        })
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_staff_login_invalid(self):
        resp = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn", "password": "wrongpass"
        })
        assert resp.status_code in [401, 403]


# ============ Utils/Constants ============

class TestConstants:
    def test_constants_importable(self):
        sys.path.insert(0, '/app/backend')
        from utils.constants import STAFF_ROLES, CLINICS, DOCTOR_CLINICS, APPOINTMENT_STATUSES
        assert len(STAFF_ROLES) > 0
        assert "Amnion Clinic" in CLINICS
        assert "Booked" in APPOINTMENT_STATUSES

    def test_auth_utils_importable(self):
        sys.path.insert(0, '/app/backend')
        from utils.auth_utils import User, JWT_SECRET, JWT_ALGORITHM
        assert JWT_ALGORITHM == "HS256"
        assert JWT_SECRET is not None
        user = User(name="Test", email="t@t.com")
        assert user.name == "Test"
