"""
Backend regression test — DiaGyn Staff Portal: Amnion Clinic merge into Pushpa Clinic.

Verifies:
1. Staff login works
2. /api/diagyn-staff/config returns ONLY Pushpa Clinic (no Amnion)
3. /api/diagyn-staff/slots/available returns 26 morning + 16 evening slots for both doctors on Mon-Sat
4. Sunday returns empty slots with "not available" message
5. E2E booking succeeds at a formerly-Amnion time slot (e.g. 14:00 / 16:00 weekday)
"""
import os
import uuid
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

STAFF_USER = "staff_diagyn"
STAFF_PASS = "test1234"


@pytest.fixture(scope="module")
def staff_token():
    r = requests.post(f"{API}/staff/login", json={"username": STAFF_USER, "password": STAFF_PASS}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def auth_headers(staff_token):
    return {"Authorization": f"Bearer {staff_token}"}


def _next_weekday(target_weekday: int):
    """Return YYYY-MM-DD for the next date matching target weekday (0=Mon .. 6=Sun)."""
    today = datetime.utcnow().date() + timedelta(days=1)  # start tomorrow
    while today.weekday() != target_weekday:
        today += timedelta(days=1)
    return today.strftime("%Y-%m-%d")


# ── Config endpoint ──────────────────────────────────────────────
class TestConfig:
    def test_config_only_pushpa(self, auth_headers):
        r = requests.get(f"{API}/diagyn-staff/config", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()

        clinics = data.get("clinics", {})
        assert "Pushpa Clinic" in clinics
        assert "Amnion Clinic" not in clinics, f"Amnion Clinic still present: {list(clinics.keys())}"
        assert set(clinics["Pushpa Clinic"]["doctors"]) == {"Dr. Vikas Jha", "Dr. Neha Patel"}

        sched = data.get("doctor_schedule", {})
        for doc in ("Dr. Vikas Jha", "Dr. Neha Patel"):
            assert doc in sched
            assert list(sched[doc].keys()) == ["Pushpa Clinic"], f"{doc}: unexpected clinics {list(sched[doc].keys())}"
            pc = sched[doc]["Pushpa Clinic"]
            assert pc["days"] == [0, 1, 2, 3, 4, 5]
            assert pc["morning"] == {"start": "11:30", "end": "18:00"}
            assert pc["evening"] == {"start": "18:00", "end": "22:00"}


# ── Slot availability ────────────────────────────────────────────
class TestSlots:
    @pytest.mark.parametrize("doctor", ["Dr. Vikas Jha", "Dr. Neha Patel"])
    def test_weekday_slots_count(self, auth_headers, doctor):
        date = _next_weekday(0)  # Monday
        r = requests.get(
            f"{API}/diagyn-staff/slots/available",
            params={"clinic": "Pushpa Clinic", "doctor": doctor, "date": date, "mode": "book"},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        morning = d.get("morning_slots", [])
        evening = d.get("evening_slots", [])
        # 11:30->18:00 @15min = 26 slots; but reserved {11:00, 11:15} excluded from full list, neither is inside morning range so no reduction
        assert len(morning) == 26, f"{doctor}: expected 26 morning, got {len(morning)}. First={morning[0] if morning else None} Last={morning[-1] if morning else None}"
        assert len(evening) == 16, f"{doctor}: expected 16 evening, got {len(evening)}"
        # Verify range
        assert morning[0]["value"] == "11:30"
        assert morning[-1]["value"] == "17:45"
        assert evening[0]["value"] == "18:00"
        assert evening[-1]["value"] == "21:45"

    @pytest.mark.parametrize("doctor", ["Dr. Vikas Jha", "Dr. Neha Patel"])
    def test_sunday_no_slots(self, auth_headers, doctor):
        date = _next_weekday(6)  # Sunday
        r = requests.get(
            f"{API}/diagyn-staff/slots/available",
            params={"clinic": "Pushpa Clinic", "doctor": doctor, "date": date, "mode": "book"},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("available_slots") == []
        assert d.get("morning_slots") == []
        assert d.get("evening_slots") == []
        assert "not available" in (d.get("message") or "").lower()

    def test_amnion_clinic_rejected(self, auth_headers):
        """Amnion Clinic no longer configured - slots should be empty."""
        date = _next_weekday(0)
        r = requests.get(
            f"{API}/diagyn-staff/slots/available",
            params={"clinic": "Amnion Clinic", "doctor": "Dr. Vikas Jha", "date": date, "mode": "book"},
            headers=auth_headers, timeout=30,
        )
        # Endpoint returns 200 with empty slots since schedule lookup fails silently
        assert r.status_code == 200
        d = r.json()
        assert d.get("morning_slots") == []
        assert d.get("evening_slots") == []


# ── E2E booking at newly-available slot ─────────────────────────
class TestBookingInNewWindow:
    def test_book_14_00_vikas_weekday(self, auth_headers):
        """Book Dr. Vikas at 14:00 (was previously Amnion-only). Should succeed with Pushpa Clinic."""
        date = _next_weekday(1)  # Tuesday to reduce collision odds
        unique_phone = "9" + str(uuid.uuid4().int)[:9]
        unique_name = f"TEST_Pushpa_{uuid.uuid4().hex[:6]}"

        payload = {
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Vikas Jha",
            "date": date,
            "time": "14:00",
            "patient_name": unique_name,
            "patient_mobile": unique_phone,
            "appointment_type": "SCHEDULED",
            "notes": "TEST_pushpa_merge_regression",
        }
        r = requests.post(f"{API}/diagyn-staff/appointments/book", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code in (200, 201), f"Book failed: {r.status_code} {r.text}"
        body = r.json()
        # Body may be wrapped; capture booking_id
        appt = body.get("appointment") or body
        assert appt.get("clinic") == "Pushpa Clinic"
        assert appt.get("doctor") == "Dr. Vikas Jha"
        assert appt.get("time") == "14:00"
        booking_id = appt.get("booking_id") or body.get("booking_id")
        assert booking_id, f"No booking_id in response: {body}"

        # Cleanup: cancel
        try:
            requests.put(
                f"{API}/diagyn-staff/appointments/{appt.get('id')}/status",
                json={"status": "Cancelled"}, headers=auth_headers, timeout=15,
            )
        except Exception:
            pass

    def test_book_16_00_neha_weekday(self, auth_headers):
        date = _next_weekday(2)  # Wednesday
        unique_phone = "9" + str(uuid.uuid4().int)[:9]
        payload = {
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Neha Patel",
            "date": date,
            "time": "16:00",
            "patient_name": f"TEST_Pushpa_{uuid.uuid4().hex[:6]}",
            "patient_mobile": unique_phone,
            "appointment_type": "SCHEDULED",
        }
        r = requests.post(f"{API}/diagyn-staff/appointments/book", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code in (200, 201), f"Book failed: {r.status_code} {r.text}"
        appt = r.json().get("appointment") or r.json()
        assert appt.get("clinic") == "Pushpa Clinic"
        assert appt.get("time") == "16:00"
        # Cleanup
        try:
            requests.put(
                f"{API}/diagyn-staff/appointments/{appt.get('id')}/status",
                json={"status": "Cancelled"}, headers=auth_headers, timeout=15,
            )
        except Exception:
            pass
