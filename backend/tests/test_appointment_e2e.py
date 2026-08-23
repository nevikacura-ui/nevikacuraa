"""
Integration tests for the appointment creation end-to-end flow.
Covers: auth → check availability → book → verify → check-in → feedback.
Run: cd /app/backend && python -m pytest tests/test_appointment_e2e.py -v
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("TEST_BASE_URL", "https://premium-rx-portal.preview.emergentagent.com")

# Module-level shared state
_state = {}

def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def test_user():
    uid = str(uuid.uuid4())[:6]
    email = f"e2e_{uid}@test.com"
    phone = f"70{uid[:5].replace('-','0')}00099"[:10]
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "test1234", "name": f"E2E {uid}", "phone": phone
    })
    if resp.status_code == 400:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "test1234"})
    assert resp.status_code == 200
    data = resp.json()
    return {"token": data["token"], "user": data["user"], "email": email, "phone": phone}


@pytest.fixture(scope="module")
def staff_token():
    resp = requests.post(f"{BASE_URL}/api/staff/login", json={"username": "staff_diagyn", "password": "test1234"})
    assert resp.status_code == 200
    return resp.json()["token"]


# ============ E2E: Full Appointment Lifecycle ============

class TestAppointmentE2E:

    def test_01_find_available_slot(self):
        resp = requests.get(f"{BASE_URL}/api/doctors/next-available", params={"doctor": "Dr. Vikas Jha"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["available"] is True
        _state["date"] = data["date"]

        # Pick a free slot from booked list
        resp2 = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": data["date"]
        })
        booked = set(resp2.json().get("booked_slots", []))
        slots = [f"{h:02d}:{m:02d}" for h in range(18, 22) for m in [0, 15, 30, 45]]
        free = [s for s in slots if s not in booked]
        assert len(free) > 0, f"No free evening slots on {data['date']}"
        _state["time"] = free[0]

    def test_02_booking_limits_ok(self, test_user):
        resp = requests.get(f"{BASE_URL}/api/booking-limits/status", params={"phone": test_user["phone"]})
        assert resp.status_code == 200
        assert resp.json()["can_book_appointment"] is True

    def test_03_create_appointment(self, test_user):
        resp = requests.post(f"{BASE_URL}/api/appointments",
            headers=auth(test_user["token"]),
            json={
                "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic",
                "date": _state["date"], "time": _state["time"],
                "patient_name": test_user["user"]["name"],
                "patient_phone": test_user["phone"],
                "patient_email": test_user["email"],
                "send_email_reminder": False
            })
        assert resp.status_code == 200, f"Booking failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "Booked"
        assert data["booking_id"] is not None
        _state["apt_id"] = data["id"]
        _state["booking_id"] = data["booking_id"]

    def test_04_slot_now_booked(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": _state["date"]
        })
        assert resp.status_code == 200
        assert _state["time"] in resp.json()["booked_slots"]

    def test_05_duplicate_rejected(self, test_user):
        resp = requests.post(f"{BASE_URL}/api/appointments",
            headers=auth(test_user["token"]),
            json={
                "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic",
                "date": _state["date"], "time": _state["time"],
                "patient_name": "Dup", "patient_phone": "9999999999",
            })
        assert resp.status_code == 400
        assert "already booked" in resp.json()["detail"].lower()

    def test_06_in_user_list(self, test_user):
        resp = requests.get(f"{BASE_URL}/api/appointments", headers=auth(test_user["token"]))
        assert resp.status_code == 200
        assert _state["apt_id"] in [a["id"] for a in resp.json()]

    def test_07_by_phone(self, test_user):
        resp = requests.get(f"{BASE_URL}/api/appointments/by-phone/{test_user['phone']}")
        assert resp.status_code == 200
        assert _state["apt_id"] in [a["id"] for a in resp.json()["appointments"]]

    def test_08_staff_sees_it(self, staff_token):
        resp = requests.get(f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            headers=auth(staff_token),
            params={"date": _state["date"], "clinic": "Amnion Clinic"})
        assert resp.status_code == 200
        assert _state["apt_id"] in [a["id"] for a in resp.json().get("appointments", [])]

    def test_09_staff_checkin(self, staff_token):
        resp = requests.put(f"{BASE_URL}/api/diagyn-staff/appointments/{_state['apt_id']}/status",
            headers=auth(staff_token), json={"status": "In Clinic"})
        assert resp.status_code == 200
        data = resp.json()
        status = data.get("appointment", {}).get("status") or data.get("status")
        assert status == "In Clinic"

    def test_10_staff_complete(self, staff_token):
        resp = requests.put(f"{BASE_URL}/api/diagyn-staff/appointments/{_state['apt_id']}/status",
            headers=auth(staff_token), json={"status": "Completed"})
        assert resp.status_code == 200
        data = resp.json()
        status = data.get("appointment", {}).get("status") or data.get("status")
        assert status == "Completed"

    def test_11_in_history(self, test_user):
        resp = requests.get(f"{BASE_URL}/api/appointments/history", params={"phone": test_user["phone"]})
        assert resp.status_code == 200
        assert _state["apt_id"] in [a["id"] for a in resp.json()["appointments"]]


# ============ E2E: Slot Blocking ============

class TestSlotBlockingE2E:
    _date = "2026-04-02"

    def test_01_block(self):
        resp = requests.post(f"{BASE_URL}/api/appointments/block-slots", json={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic",
            "date": self._date, "slots": ["14:00", "14:15"], "reason": "pytest"
        })
        assert resp.status_code == 200
        assert resp.json()["blocked_count"] == 2

    def test_02_visible(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/blocked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": self._date
        })
        assert resp.status_code == 200
        assert "14:00" in [s["time"] for s in resp.json()["blocked_slots"]]

    def test_03_in_booked(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": self._date
        })
        assert "14:00" in resp.json()["booked_slots"]

    def test_04_unblock(self):
        resp = requests.post(f"{BASE_URL}/api/appointments/unblock-slots", json={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic",
            "date": self._date, "slots": ["14:00", "14:15"], "reason": ""
        })
        assert resp.status_code == 200
        assert resp.json()["unblocked_count"] == 2

    def test_05_freed(self):
        resp = requests.get(f"{BASE_URL}/api/appointments/blocked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": self._date
        })
        assert len(resp.json()["blocked_slots"]) == 0


# ============ E2E: Guest Appointment ============

class TestGuestAppointmentE2E:
    _phone = "9988776655"

    def test_01_send_otp(self):
        resp = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={"mobile": self._phone})
        assert resp.status_code == 200
        _state["guest_otp"] = resp.json().get("otp")

    def test_02_verify_otp(self):
        resp = requests.post(f"{BASE_URL}/api/auth/guest/verify-otp", json={
            "mobile": self._phone, "otp": _state["guest_otp"]
        })
        assert resp.status_code == 200

    def test_03_book(self):
        # Find a free evening slot on a future date
        date = "2026-04-06"
        resp = requests.get(f"{BASE_URL}/api/appointments/booked-slots", params={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic", "date": date
        })
        booked = set(resp.json().get("booked_slots", []))
        free = [f"{h:02d}:{m:02d}" for h in range(18, 22) for m in [0, 15, 30, 45] if f"{h:02d}:{m:02d}" not in booked]
        assert len(free) > 0

        # Fresh OTP (previous consumed by verify)
        otp_resp = requests.post(f"{BASE_URL}/api/auth/guest/send-otp", json={"mobile": self._phone})
        otp = otp_resp.json().get("otp")

        resp = requests.post(f"{BASE_URL}/api/appointments/guest", json={
            "doctor": "Dr. Vikas Jha", "clinic": "Amnion Clinic",
            "date": date, "time": free[0],
            "patient_name": "Guest E2E", "patient_phone": self._phone, "otp": otp
        })
        assert resp.status_code == 200, f"Guest booking failed: {resp.text}"
        assert resp.json()["success"] is True
        assert resp.json()["status"] == "Booked"
