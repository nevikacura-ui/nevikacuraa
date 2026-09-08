"""
Backend regression tests for the doctor-leave-block booking validation fix (iteration_398).

Verifies that assert_slot_not_blocked() correctly rejects bookings/reschedules for
blocked dates/sessions across ALL patient-facing and staff-facing write endpoints:
  1. POST /api/appointments             (patient authenticated / anonymous booking)
  2. POST /api/appointments/guest       (guest OTP booking)
  3. POST /api/appointments/{id}/reschedule
  4. POST /api/diagyn-staff/appointments/book (SCHEDULED / WALK_IN rejected, EMERGENCY bypass allowed)
  5. Session-level blocks (partial-day) also enforced
"""

import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

DR_VIKAS_USER = "dr_vikas"
DR_VIKAS_PASS = "test1234"
STAFF_USER = "staff_diagyn"
STAFF_PASS = "test1234"

DOCTOR = "Dr. Vikas Jha"
CLINIC = "Pushpa Clinic"

# Distinct future dates to avoid collision with earlier iterations' test data
FULL_BLOCK_DATE = "2026-09-20"
OPEN_DATE = "2026-09-22"
SESSION_BLOCK_DATE = "2026-09-24"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def dr_vikas_token(session):
    r = session.post(f"{BASE_URL}/api/staff/login",
                     json={"username": DR_VIKAS_USER, "password": DR_VIKAS_PASS})
    assert r.status_code == 200, f"dr_vikas login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def staff_token(session):
    r = session.post(f"{BASE_URL}/api/staff/login",
                     json={"username": STAFF_USER, "password": STAFF_PASS})
    assert r.status_code == 200, f"staff_diagyn login failed: {r.status_code} {r.text}"
    return r.json().get("token")


# --------------- SETUP: block dates via doctor portal ---------------

@pytest.fixture(scope="module", autouse=True)
def setup_and_cleanup_blocks(session, dr_vikas_token):
    hdrs = {"Authorization": f"Bearer {dr_vikas_token}"}

    # Ensure clean state - try delete first (idempotent)
    session.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{FULL_BLOCK_DATE}", headers=hdrs)
    session.delete(f"{BASE_URL}/api/doctor-schedule/block-session/{SESSION_BLOCK_DATE}/18:00", headers=hdrs)

    # Full day block
    r1 = session.post(f"{BASE_URL}/api/doctor-schedule/block-date",
                      headers=hdrs,
                      json={"date": FULL_BLOCK_DATE, "reason": "Final Verification Leave", "force_override": True})
    assert r1.status_code == 200, f"block-date failed: {r1.status_code} {r1.text}"

    # Session block 18:00-22:00
    r2 = session.post(f"{BASE_URL}/api/doctor-schedule/block-session",
                      headers=hdrs,
                      json={"date": SESSION_BLOCK_DATE, "start_time": "18:00", "end_time": "22:00",
                            "reason": "Evening off", "force_override": True})
    assert r2.status_code == 200, f"block-session failed: {r2.status_code} {r2.text}"

    yield

    # Teardown
    session.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{FULL_BLOCK_DATE}", headers=hdrs)
    session.delete(f"{BASE_URL}/api/doctor-schedule/block-session/{SESSION_BLOCK_DATE}/18:00", headers=hdrs)


# --------------- Helper for cleanup ---------------

CREATED_APPT_IDS = []


def _cleanup_appt(session, appt_id):
    try:
        session.delete(f"{BASE_URL}/api/appointments/{appt_id}")
    except Exception:
        pass


# --------------- Test 1: Patient booking rejected on full block date ---------------

class TestPatientBookingLeaveBlock:

    def _payload(self, date, time_str="18:00", phone=None):
        return {
            "doctor": DOCTOR,
            "clinic": CLINIC,
            "date": date,
            "time": time_str,
            "patient_name": "TEST_LeaveBlock Patient",
            "patient_phone": phone or "9990001111",
            "patient_age": "30",
            "patient_gender": "Male",
        }

    def test_booking_rejected_on_blocked_date(self, session):
        r = session.post(f"{BASE_URL}/api/appointments", json=self._payload(FULL_BLOCK_DATE, "18:00"))
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "leave" in detail or "unavailable" in detail or "on leave" in detail, f"Unexpected reject msg: {r.text}"
        assert FULL_BLOCK_DATE in r.json().get("detail", "")

    def test_booking_succeeds_on_open_date(self, session):
        payload = self._payload(OPEN_DATE, "18:00", phone="9990002222")
        r = session.post(f"{BASE_URL}/api/appointments", json=payload)
        assert r.status_code == 200, f"Open date booking should succeed, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("doctor") == DOCTOR
        assert data.get("date") == OPEN_DATE
        appt_id = data.get("id")
        if appt_id:
            CREATED_APPT_IDS.append(appt_id)
            _cleanup_appt(session, appt_id)


# --------------- Test 2: Guest booking rejected on blocked date ---------------

class TestGuestBookingLeaveBlock:

    def _get_otp(self, session, mobile):
        r = session.post(f"{BASE_URL}/api/auth/guest/send-otp", json={"mobile": mobile})
        assert r.status_code == 200, f"send-otp failed: {r.text}"
        return r.json().get("otp")

    def test_guest_booking_rejected_on_blocked_date(self, session):
        mobile = "9990003333"
        otp = self._get_otp(session, mobile)
        payload = {
            "doctor": DOCTOR, "clinic": CLINIC,
            "date": FULL_BLOCK_DATE, "time": "18:00",
            "patient_name": "TEST_Guest LeaveBlock",
            "patient_phone": mobile,
            "patient_age": "28",
            "otp": otp,
        }
        r = session.post(f"{BASE_URL}/api/appointments/guest", json=payload)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "leave" in detail or "unavailable" in detail


# --------------- Test 3: Reschedule rejected onto blocked date ---------------

class TestRescheduleLeaveBlock:

    def test_reschedule_rejected_and_original_untouched(self, session):
        phone = "9990004444"
        # Create open-date appointment first
        create_payload = {
            "doctor": DOCTOR, "clinic": CLINIC,
            "date": OPEN_DATE, "time": "19:00",
            "patient_name": "TEST_Reschedule Patient",
            "patient_phone": phone,
            "patient_age": "35",
            "patient_gender": "Female",
        }
        r = session.post(f"{BASE_URL}/api/appointments", json=create_payload)
        assert r.status_code == 200, f"Setup booking failed: {r.text}"
        appt = r.json()
        appt_id = appt.get("id")
        original_date = appt.get("date")
        original_time = appt.get("time")
        assert appt_id
        CREATED_APPT_IDS.append(appt_id)

        try:
            # Attempt reschedule onto blocked date
            r2 = session.post(f"{BASE_URL}/api/appointments/{appt_id}/reschedule",
                              json={"patient_phone": phone,
                                    "new_date": FULL_BLOCK_DATE, "new_time": "18:00"})
            assert r2.status_code == 400, f"Reschedule to blocked date should 400, got {r2.status_code}: {r2.text}"
            detail = r2.json().get("detail", "").lower()
            assert "leave" in detail or "unavailable" in detail

            # Verify original unchanged - fetch via a listing/get if available
            get_r = session.get(f"{BASE_URL}/api/appointments/{appt_id}")
            if get_r.status_code == 200:
                fetched = get_r.json()
                assert fetched.get("date") == original_date, "Original date must be unchanged"
                assert fetched.get("time") == original_time, "Original time must be unchanged"
        finally:
            _cleanup_appt(session, appt_id)


# --------------- Test 4: Staff portal booking (SCHEDULED reject, EMERGENCY bypass) ---------------

class TestStaffPortalLeaveBlock:

    def _payload(self, appt_type, date=FULL_BLOCK_DATE, time_str="18:00", mobile=None):
        return {
            "clinic": CLINIC, "doctor": DOCTOR,
            "date": date, "time": time_str,
            "patient_name": f"TEST_Staff {appt_type}",
            "patient_mobile": mobile or "9990005555",
            "appointment_type": appt_type,
        }

    def test_staff_scheduled_rejected(self, session, staff_token):
        hdrs = {"Authorization": f"Bearer {staff_token}"}
        r = session.post(f"{BASE_URL}/api/diagyn-staff/appointments/book",
                         headers=hdrs, json=self._payload("SCHEDULED", mobile="9990005555"))
        assert r.status_code == 400, f"Staff SCHEDULED on blocked date should 400, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "leave" in detail or "unavailable" in detail

    def test_staff_walkin_rejected(self, session, staff_token):
        hdrs = {"Authorization": f"Bearer {staff_token}"}
        r = session.post(f"{BASE_URL}/api/diagyn-staff/appointments/book",
                         headers=hdrs, json=self._payload("WALK_IN", mobile="9990006666"))
        assert r.status_code == 400, f"Staff WALK_IN on blocked date should 400, got {r.status_code}: {r.text}"

    def test_staff_emergency_bypasses_block(self, session, staff_token):
        hdrs = {"Authorization": f"Bearer {staff_token}"}
        r = session.post(f"{BASE_URL}/api/diagyn-staff/appointments/book",
                         headers=hdrs, json=self._payload("EMERGENCY", mobile="9990007777"))
        # EMERGENCY intentionally bypasses the leave block
        assert r.status_code == 200, f"EMERGENCY should bypass leave block, got {r.status_code}: {r.text}"
        data = r.json()
        appt = data.get("appointment") or data
        appt_id = appt.get("id") if isinstance(appt, dict) else None
        if appt_id:
            CREATED_APPT_IDS.append(appt_id)
            _cleanup_appt(session, appt_id)


# --------------- Test 5: Session-level block ---------------

class TestSessionLevelBlock:

    def test_booking_inside_blocked_session_rejected(self, session):
        payload = {
            "doctor": DOCTOR, "clinic": CLINIC,
            "date": SESSION_BLOCK_DATE, "time": "18:00",
            "patient_name": "TEST_SessionBlock In",
            "patient_phone": "9990008888",
            "patient_age": "30",
            "patient_gender": "Male",
        }
        r = session.post(f"{BASE_URL}/api/appointments", json=payload)
        assert r.status_code == 400, f"Session-block should reject 18:00, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "unavailable" in detail or "leave" in detail

    def test_booking_outside_blocked_session_succeeds(self, session):
        payload = {
            "doctor": DOCTOR, "clinic": CLINIC,
            "date": SESSION_BLOCK_DATE, "time": "11:30",
            "patient_name": "TEST_SessionBlock Out",
            "patient_phone": "9990009999",
            "patient_age": "30",
            "patient_gender": "Male",
        }
        r = session.post(f"{BASE_URL}/api/appointments", json=payload)
        assert r.status_code == 200, f"11:30 (outside evening block) should succeed, got {r.status_code}: {r.text}"
        appt_id = r.json().get("id")
        if appt_id:
            CREATED_APPT_IDS.append(appt_id)
            _cleanup_appt(session, appt_id)
