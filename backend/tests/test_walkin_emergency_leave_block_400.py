"""
Iteration 400: Verify /api/staff/appointments/walk-in now honors doctor leave block,
and /api/staff/appointments/emergency still bypasses (intentional).
Also light regression on /api/appointments and /api/diagyn-staff/appointments/book.
"""
import os
import random
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"

DR = "Dr. Vikas Jha"
CLINIC = "Pushpa Clinic"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
OPEN_DATE = "2026-11-20"  # far-future open date for regression check

# Unique per-run identifiers for cleanup
RUN = random.randint(10000, 99999)
TEST_PHONE_WALKIN = f"7775{RUN:05d}"[:10]
TEST_PHONE_EMERG = f"7776{RUN:05d}"[:10]
TEST_PHONE_APPT = f"7777{RUN:05d}"[:10]
TEST_PHONE_DIAGYN = f"7778{RUN:05d}"[:10]
TEST_PHONE_OPEN = f"7779{RUN:05d}"[:10]


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def dr_token(s):
    r = s.post(f"{BASE_URL}/api/staff/login",
               json={"username": "dr_vikas", "password": "test1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def staff_token(s):
    r = s.post(f"{BASE_URL}/api/staff/login",
               json={"username": "staff_diagyn", "password": "test1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module", autouse=True)
def block_today(s, dr_token):
    hdrs = {"Authorization": f"Bearer {dr_token}"}
    # clean pre-existing block
    s.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{TODAY}", headers=hdrs)
    r = s.post(f"{BASE_URL}/api/doctor-schedule/block-date", headers=hdrs,
               json={"date": TODAY, "reason": "Final Walkin Test",
                     "force_override": True})
    assert r.status_code == 200, f"Failed to block TODAY: {r.status_code} {r.text}"
    print(f"\n[SETUP] Blocked date TODAY={TODAY}")
    yield
    # teardown - unblock
    dr = s.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{TODAY}", headers=hdrs)
    print(f"\n[TEARDOWN] Unblock TODAY={TODAY}: {dr.status_code}")
    # cleanup any test appointments by phone
    for phone in [TEST_PHONE_WALKIN, TEST_PHONE_EMERG, TEST_PHONE_APPT,
                  TEST_PHONE_DIAGYN, TEST_PHONE_OPEN]:
        try:
            r = s.get(f"{BASE_URL}/api/appointments", params={"phone": phone})
            if r.status_code == 200:
                data = r.json()
                appts = data if isinstance(data, list) else data.get("appointments", [])
                for a in appts:
                    aid = a.get("id")
                    if aid:
                        s.delete(f"{BASE_URL}/api/appointments/{aid}")
        except Exception:
            pass


class TestWalkinEmergency:
    """NEW: walk-in must be blocked, emergency must bypass"""

    def test_walkin_rejected_on_blocked_today(self, s, staff_token):
        """/api/staff/appointments/walk-in must return 400 mentioning 'leave'"""
        hdrs = {"Authorization": f"Bearer {staff_token}"}
        payload = {
            "doctor": DR,
            "clinic": CLINIC,
            "time": "18:00",
            "patient_name": "TEST_WalkinBlocked",
            "patient_phone": TEST_PHONE_WALKIN,
        }
        r = s.post(f"{BASE_URL}/api/staff/appointments/walk-in",
                   headers=hdrs, json=payload)
        print(f"\n[WALKIN BLOCKED] status={r.status_code} body={r.text[:400]}")
        assert r.status_code == 400, \
            f"Expected 400 rejection, got {r.status_code}: {r.text}"
        detail = str(r.json().get("detail", "")).lower()
        assert "leave" in detail or "unavailable" in detail or "blocked" in detail, \
            f"Expected 'leave' in rejection detail, got: {detail}"

    def test_emergency_bypasses_leave_block(self, s, staff_token):
        """/api/staff/appointments/emergency must SUCCEED even on blocked date"""
        hdrs = {"Authorization": f"Bearer {staff_token}"}
        payload = {
            "doctor": DR,
            "clinic": CLINIC,
            "patient_name": "TEST_EmergBypass",
            "patient_phone": TEST_PHONE_EMERG,
            "emergency_type": "General Emergency",
        }
        r = s.post(f"{BASE_URL}/api/staff/appointments/emergency",
                   headers=hdrs, json=payload)
        print(f"\n[EMERG BYPASS] status={r.status_code} body={r.text[:400]}")
        assert r.status_code == 200, \
            f"Emergency should bypass leave block. Got {r.status_code}: {r.text}"
        body = r.json()
        appt = body.get("appointment") or {}
        assert appt.get("appointment_type") == "EMERGENCY", \
            f"Expected EMERGENCY type, got: {appt}"
        # cleanup
        aid = appt.get("id")
        if aid:
            s.delete(f"{BASE_URL}/api/appointments/{aid}")


class TestRegressionSanity:
    """Quick regression: /api/appointments + /api/diagyn-staff/appointments/book
    still reject blocked and accept open."""

    def test_appointments_rejects_blocked(self, s):
        r = s.post(f"{BASE_URL}/api/appointments", json={
            "doctor": DR, "clinic": CLINIC, "date": TODAY, "time": "17:30",
            "patient_name": "TEST_Regress400",
            "patient_phone": TEST_PHONE_APPT,
            "patient_age": "30", "patient_gender": "Male",
        })
        print(f"\n[APPTS BLOCKED] status={r.status_code} body={r.text[:300]}")
        assert r.status_code == 400, r.text

    def test_appointments_accepts_open(self, s):
        t = f"20:{random.randint(0, 59):02d}"
        r = s.post(f"{BASE_URL}/api/appointments", json={
            "doctor": DR, "clinic": CLINIC, "date": OPEN_DATE, "time": t,
            "patient_name": "TEST_RegressOpen400",
            "patient_phone": TEST_PHONE_OPEN,
            "patient_age": "30", "patient_gender": "Male",
        })
        print(f"\n[APPTS OPEN] status={r.status_code} body={r.text[:300]}")
        assert r.status_code == 200, r.text
        body = r.json()
        aid = body.get("id") or (body.get("appointment") or {}).get("id")
        if aid:
            s.delete(f"{BASE_URL}/api/appointments/{aid}")

    def test_diagyn_staff_scheduled_rejects_blocked(self, s, staff_token):
        r = s.post(f"{BASE_URL}/api/diagyn-staff/appointments/book",
                   headers={"Authorization": f"Bearer {staff_token}"},
                   json={"clinic": CLINIC, "doctor": DR, "date": TODAY,
                         "time": "17:45",
                         "patient_name": "TEST_DiagynRegress",
                         "patient_mobile": TEST_PHONE_DIAGYN,
                         "appointment_type": "SCHEDULED"})
        print(f"\n[DIAGYN BLOCKED] status={r.status_code} body={r.text[:300]}")
        assert r.status_code == 400, r.text
