"""
Staff Portal slot-availability + Doctor Leave block integration tests (iteration 396).

Verifies fix in /app/backend/routes/diagyn_staff/slots.py:
GET /api/diagyn-staff/slots/available now honors doctor_schedules.blocked_dates
and doctor_schedules.blocked_sessions written by the Doctor Portal leave
management endpoints (POST /api/doctor-schedule/block-date and block-session).
"""
import os
import pytest
import httpx
from datetime import date, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-rx-portal.preview.emergentagent.com").rstrip("/")
STAFF_CREDS = {"username": "staff_diagyn", "password": "test1234"}
DOCTOR_CREDS = {"username": "dr_vikas", "password": "test1234"}
DOCTOR_NAME = "Dr. Vikas Jha"
CLINIC = "Pushpa Clinic"  # will fallback to Amnion if unavailable


# ────────── fixtures ──────────
@pytest.fixture(scope="module")
def staff_token():
    r = httpx.post(f"{BASE}/api/staff/login", json=STAFF_CREDS, timeout=30)
    assert r.status_code == 200, f"staff login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def doctor_token():
    r = httpx.post(f"{BASE}/api/staff/login", json=DOCTOR_CREDS, timeout=30)
    assert r.status_code == 200, f"doctor login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _hdr(t): return {"Authorization": f"Bearer {t}"}


def _future(days): return (date.today() + timedelta(days=days)).isoformat()


def _pick_clinic_with_slots(staff_token, target_date):
    """Try Pushpa then Amnion, return one that returns some slots (i.e. doctor works there)."""
    for clinic in ("Pushpa Clinic", "Amnion Clinic"):
        r = httpx.get(
            f"{BASE}/api/diagyn-staff/slots/available",
            params={"clinic": clinic, "doctor": DOCTOR_NAME, "date": target_date, "mode": "book"},
            headers=_hdr(staff_token), timeout=30,
        )
        if r.status_code == 200 and (r.json().get("morning_slots") or r.json().get("evening_slots") or r.json().get("available_slots")):
            return clinic, r.json()
    return None, None


def _find_working_date(staff_token, start_offset=3, max_lookahead=14):
    """Scan forward until we find a date on which Vikas Jha has slots at some clinic."""
    for i in range(start_offset, start_offset + max_lookahead):
        d = _future(i)
        clinic, data = _pick_clinic_with_slots(staff_token, d)
        if clinic:
            return d, clinic, data
    return None, None, None


# ────────── smoke ──────────
def test_staff_login_ok(staff_token):
    assert staff_token


def test_doctor_login_ok(doctor_token):
    assert doctor_token


# ────────── OPEN DAY (regression) ──────────
def test_open_day_returns_slots(staff_token):
    d, clinic, data = _find_working_date(staff_token)
    assert clinic, f"No working date found for {DOCTOR_NAME} in the next 14 days."
    assert len(data.get("morning_slots", [])) > 0 or len(data.get("evening_slots", [])) > 0, \
        f"Expected slots on open day {d} but got empty. Response: {data}"


def _login_doctor():
    r = httpx.post(f"{BASE}/api/staff/login", json=DOCTOR_CREDS, timeout=30)
    return r.json()["token"]


# ────────── PRIMARY FIX 1: full-day block ──────────
def test_full_day_block_hides_all_slots(staff_token, doctor_token):
    d, clinic, pre = _find_working_date(staff_token, start_offset=5)
    if not clinic:
        pytest.skip("No working date found to test full-day block.")

    # Ensure clean state
    httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-date/{d}",
                  headers=_hdr(doctor_token), timeout=30)

    # Block the date
    r = httpx.post(
        f"{BASE}/api/doctor-schedule/block-date",
        json={"date": d, "reason": "Test Leave", "force_override": False},
        headers=_hdr(doctor_token), timeout=30,
    )
    assert r.status_code == 200, f"block-date failed: {r.status_code} {r.text}"

    try:
        # After block, staff endpoint should return empty slots + message
        r2 = httpx.get(
            f"{BASE}/api/diagyn-staff/slots/available",
            params={"clinic": clinic, "doctor": DOCTOR_NAME, "date": d, "mode": "book"},
            headers=_hdr(staff_token), timeout=30,
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data.get("available_slots") == [], f"available_slots not empty: {data}"
        assert data.get("morning_slots") == [], f"morning_slots not empty: {data}"
        assert data.get("evening_slots") == [], f"evening_slots not empty: {data}"
        msg = (data.get("message") or "").lower()
        assert "leave" in msg or "on leave" in msg or "not available" in msg, \
            f"Expected leave message, got: {data.get('message')}"
    finally:
        httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-date/{d}",
                      headers=_hdr(doctor_token), timeout=30)


# ────────── PRIMARY FIX 2: session block (evening) ──────────
def test_evening_session_block_hides_only_evening(staff_token, doctor_token):
    d, clinic, pre = _find_working_date(staff_token, start_offset=7)
    if not clinic:
        pytest.skip("No working date found to test session block.")

    # cleanup
    httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-session/{d}/18:00",
                  headers=_hdr(doctor_token), timeout=30)

    pre_morning = len(pre.get("morning_slots", []))
    pre_evening = len(pre.get("evening_slots", []))

    r = httpx.post(
        f"{BASE}/api/doctor-schedule/block-session",
        json={
            "date": d,
            "start_time": "18:00",
            "end_time": "22:00",
            "reason": "Evening leave test",
            "force_override": False,
        },
        headers=_hdr(doctor_token), timeout=30,
    )
    assert r.status_code == 200, f"block-session failed: {r.status_code} {r.text}"

    try:
        r2 = httpx.get(
            f"{BASE}/api/diagyn-staff/slots/available",
            params={"clinic": clinic, "doctor": DOCTOR_NAME, "date": d, "mode": "book"},
            headers=_hdr(staff_token), timeout=30,
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()

        post_morning = len(data.get("morning_slots", []))
        post_evening = len(data.get("evening_slots", []))

        # Morning slots should remain roughly the same (may differ by booked count only)
        assert post_morning >= pre_morning - 2, \
            f"Morning slots dropped unexpectedly. pre={pre_morning} post={post_morning}"
        # Evening slots should be zero or very few (only those before 18:00 if any)
        assert post_evening == 0, \
            f"Evening slots not blocked. pre={pre_evening} post={post_evening} slots={data.get('evening_slots')}"
    finally:
        httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-session/{d}/18:00",
                      headers=_hdr(doctor_token), timeout=30)


# ────────── PRIMARY FIX 3: walk-in mode with session block ──────────
def test_walkin_mode_respects_block(staff_token, doctor_token):
    """
    Walk-in queries for 'current' session on today's date. We block *today* fully
    to verify walk-in returns empty as well.
    """
    d = date.today().isoformat()
    httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-date/{d}",
                  headers=_hdr(doctor_token), timeout=30)

    # Determine a clinic even if no current session
    clinic = "Pushpa Clinic"

    r = httpx.post(
        f"{BASE}/api/doctor-schedule/block-date",
        json={"date": d, "reason": "Walkin test", "force_override": True},
        headers=_hdr(doctor_token), timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Cannot block today for walk-in test: {r.status_code} {r.text}")

    try:
        r2 = httpx.get(
            f"{BASE}/api/diagyn-staff/slots/available",
            params={"clinic": clinic, "doctor": DOCTOR_NAME, "date": d, "mode": "walkin"},
            headers=_hdr(staff_token), timeout=30,
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        # Either doc not in session (message present) OR all slots empty due to leave
        assert data.get("available_slots") in ([], None) or len(data.get("available_slots", [])) == 0
        assert data.get("morning_slots", []) == [] and data.get("evening_slots", []) == []
    finally:
        httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-date/{d}",
                      headers=_hdr(doctor_token), timeout=30)


# ────────── REGRESSION: patient-facing booked-slots endpoint ──────────
def test_appointments_booked_slots_reports_date_blocked(doctor_token):
    d = _future(8)
    httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-date/{d}",
                  headers=_hdr(doctor_token), timeout=30)
    r = httpx.post(
        f"{BASE}/api/doctor-schedule/block-date",
        json={"date": d, "reason": "Regression check", "force_override": False},
        headers=_hdr(doctor_token), timeout=30,
    )
    assert r.status_code == 200, r.text
    try:
        r2 = httpx.get(
            f"{BASE}/api/appointments/booked-slots",
            params={"doctor": DOCTOR_NAME, "clinic": "Pushpa Clinic", "date": d},
            timeout=30,
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data.get("date_blocked") is True, f"Expected date_blocked=true, got {data}"
    finally:
        httpx.request("DELETE", f"{BASE}/api/doctor-schedule/block-date/{d}",
                      headers=_hdr(doctor_token), timeout=30)
