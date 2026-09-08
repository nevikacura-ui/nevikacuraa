"""
Verifies whether the patient-facing booking endpoints reject bookings on
dates the doctor has BLOCKED (leave) in the doctor portal.

Endpoints under test:
- POST /api/staff/login                (setup - doctor login)
- POST /api/doctor-schedule/block-date (setup - block a date)
- DELETE /api/doctor-schedule/block-date/{date}   (cleanup)
- GET  /api/appointments/booked-slots  (should return date_blocked=True)
- GET  /api/doctors/blocked-dates      (feeds the calendar UI)
- POST /api/appointments               (CORE: should reject blocked date)
- POST /api/appointments/{id}/reschedule (should reject blocked date)
"""
import os
from datetime import datetime, timedelta
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

DR_VIKAS_USER = "dr_vikas"
DR_VIKAS_NAME = "Dr. Vikas Jha"
DR_NEHA_USER = "dr_neha"
DR_NEHA_NAME = "Dr. Neha Patel"
PWD = "test1234"

# Use dates well in the future to avoid conflicts with dates blocked in prior tests
FUTURE_A = (datetime.now().date() + timedelta(days=17)).isoformat()  # Vikas
FUTURE_B = (datetime.now().date() + timedelta(days=18)).isoformat()  # Neha


def _login(username):
    r = requests.post(f"{BASE_URL}/api/staff/login",
                      json={"username": username, "password": PWD}, timeout=15)
    assert r.status_code == 200, f"Login failed for {username}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def vikas_token():
    return _login(DR_VIKAS_USER)


@pytest.fixture(scope="module")
def neha_token():
    return _login(DR_NEHA_USER)


@pytest.fixture(scope="module", autouse=True)
def setup_blocked_dates(vikas_token, neha_token):
    # Cleanup first
    requests.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{FUTURE_A}",
                    headers={"Authorization": f"Bearer {vikas_token}"}, timeout=15)
    requests.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{FUTURE_B}",
                    headers={"Authorization": f"Bearer {neha_token}"}, timeout=15)

    r1 = requests.post(f"{BASE_URL}/api/doctor-schedule/block-date",
                       json={"date": FUTURE_A, "reason": "Fresh Leave Test A", "force_override": True},
                       headers={"Authorization": f"Bearer {vikas_token}"}, timeout=15)
    assert r1.status_code == 200, r1.text
    assert r1.json().get("success"), r1.json()

    r2 = requests.post(f"{BASE_URL}/api/doctor-schedule/block-date",
                       json={"date": FUTURE_B, "reason": "Fresh Leave Test B", "force_override": True},
                       headers={"Authorization": f"Bearer {neha_token}"}, timeout=15)
    assert r2.status_code == 200, r2.text
    yield
    # Teardown
    requests.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{FUTURE_A}",
                    headers={"Authorization": f"Bearer {vikas_token}"}, timeout=15)
    requests.delete(f"{BASE_URL}/api/doctor-schedule/block-date/{FUTURE_B}",
                    headers={"Authorization": f"Bearer {neha_token}"}, timeout=15)


# ============ GET endpoints (already fixed per E1) ============

def test_public_blocked_dates_lists_vikas_block():
    r = requests.get(f"{BASE_URL}/api/doctors/blocked-dates",
                     params={"doctor": DR_VIKAS_NAME}, timeout=15)
    assert r.status_code == 200
    dates = [b.get("date") for b in r.json().get("blocked_dates", [])]
    assert FUTURE_A in dates, f"Expected {FUTURE_A} in blocked_dates, got {dates}"


def test_public_blocked_dates_lists_neha_block():
    r = requests.get(f"{BASE_URL}/api/doctors/blocked-dates",
                     params={"doctor": DR_NEHA_NAME}, timeout=15)
    assert r.status_code == 200
    dates = [b.get("date") for b in r.json().get("blocked_dates", [])]
    assert FUTURE_B in dates


def test_booked_slots_returns_date_blocked_vikas_pushpa():
    r = requests.get(f"{BASE_URL}/api/appointments/booked-slots",
                     params={"doctor": DR_VIKAS_NAME, "clinic": "Pushpa Clinic",
                             "date": FUTURE_A}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("date_blocked") is True, f"Expected date_blocked=True, got {body}"


def test_booked_slots_returns_date_blocked_vikas_online():
    """Online clinic mode should ALSO reflect the block - same doctor_schedule doc."""
    r = requests.get(f"{BASE_URL}/api/appointments/booked-slots",
                     params={"doctor": DR_VIKAS_NAME, "clinic": "online",
                             "date": FUTURE_A}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("date_blocked") is True, f"Online clinic did not honour block: {body}"


# ============ CORE bug: does POST /appointments reject blocked date? ============

def test_post_appointments_rejects_blocked_date_vikas():
    """
    A determined patient bypasses UI and POSTs directly to /api/appointments
    with the blocked date. Backend MUST reject with 4xx.
    """
    payload = {
        "doctor": DR_VIKAS_NAME,
        "clinic": "Pushpa Clinic",
        "date": FUTURE_A,
        "time": "11:30",
        "patient_name": "TEST_BlockedBypass",
        "patient_phone": "9998887771",
        "patient_email": "test_blocked@example.com",
        "patient_age": "30",
    }
    r = requests.post(f"{BASE_URL}/api/appointments", json=payload, timeout=20)
    booking_id = None
    if r.status_code < 400:
        booking_id = r.json().get("booking_id") or r.json().get("id")
    # Cleanup any leak - delete via mongo? we'll just mark for report
    if booking_id:
        # Best-effort: cancel via staff (not deleted, but marks it) - skip
        pass
    assert r.status_code >= 400, (
        f"BUG: POST /api/appointments ACCEPTED a booking on a blocked date "
        f"({FUTURE_A}) for {DR_VIKAS_NAME}. Response: {r.status_code} {r.text}"
    )


def test_post_appointments_rejects_blocked_date_neha():
    payload = {
        "doctor": DR_NEHA_NAME,
        "clinic": "Pushpa Clinic",
        "date": FUTURE_B,
        "time": "11:30",
        "patient_name": "TEST_BlockedBypass2",
        "patient_phone": "9998887772",
        "patient_email": "test_blocked2@example.com",
        "patient_age": "30",
    }
    r = requests.post(f"{BASE_URL}/api/appointments", json=payload, timeout=20)
    assert r.status_code >= 400, (
        f"BUG: POST /api/appointments ACCEPTED a booking on a blocked date "
        f"({FUTURE_B}) for {DR_NEHA_NAME}. Response: {r.status_code} {r.text}"
    )


def test_post_appointments_rejects_blocked_date_online_mode():
    """Same block, but attempted under 'online' clinic value."""
    payload = {
        "doctor": DR_VIKAS_NAME,
        "clinic": "online",
        "date": FUTURE_A,
        "time": "10:00",
        "patient_name": "TEST_BlockedOnline",
        "patient_phone": "9998887773",
        "patient_email": "t3@example.com",
        "patient_age": "30",
        "booking_type": "online_consultation",
    }
    r = requests.post(f"{BASE_URL}/api/appointments", json=payload, timeout=20)
    assert r.status_code >= 400, (
        f"BUG: online-consultation POST accepted booking on blocked date: "
        f"{r.status_code} {r.text}"
    )


# ============ Reschedule endpoint check ============

def test_reschedule_rejects_blocked_date(vikas_token):
    """
    Create an appointment on an unblocked date, then try to reschedule
    it onto the blocked date. Backend should reject.
    """
    safe_date = (datetime.now().date() + timedelta(days=5)).isoformat()
    import random
    unique_phone = f"988{random.randint(1000000, 9999999)}"
    create_payload = {
        "doctor": DR_VIKAS_NAME,
        "clinic": "Pushpa Clinic",
        "date": safe_date,
        "time": "13:30",
        "patient_name": "TEST_RescheduleGuinea",
        "patient_phone": unique_phone,
        "patient_email": "resch@example.com",
        "patient_age": "30",
    }
    c = requests.post(f"{BASE_URL}/api/appointments", json=create_payload, timeout=20)
    if c.status_code >= 400:
        pytest.skip(f"Could not create seed appt for reschedule test: {c.status_code} {c.text}")
    apt = c.json()
    apt_id = apt.get("id") or apt.get("booking_id")

    r = requests.post(f"{BASE_URL}/api/appointments/{apt_id}/reschedule",
                      json={"patient_phone": unique_phone,
                            "new_date": FUTURE_A, "new_time": "11:30"}, timeout=20)
    assert r.status_code >= 400, (
        f"BUG: Reschedule endpoint accepted move to blocked date: "
        f"{r.status_code} {r.text}"
    )
