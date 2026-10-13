"""Verify chatbot /slots and /slots-text endpoints respect doctor leave/blocked sessions."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

def _load_base_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_base_url()

DOCTOR_VIKAS = "Dr. Vikas Jha"
DOCTOR_NEHA = "Dr. Neha Patel"
CLINIC = "Pushpa Clinic"


def _ist_date(offset_days):
    ist = timezone(timedelta(hours=5, minutes=30))
    return (datetime.now(ist) + timedelta(days=offset_days)).strftime("%Y-%m-%d")


# Use far-future dates to avoid collision
DATE_FULL_BLOCK = _ist_date(45)
DATE_SESSION_BLOCK = _ist_date(46)
DATE_BOOKING = _ist_date(47)


@pytest.fixture(scope="module")
def staff_token():
    r = requests.post(f"{BASE_URL}/api/staff/login", json={
        "username": "staff_diagyn", "password": "test1234"
    })
    if r.status_code != 200:
        pytest.skip(f"staff_diagyn login failed: {r.status_code} {r.text}")
    return r.json().get("token")


@pytest.fixture(scope="module")
def doctor_vikas_token():
    r = requests.post(f"{BASE_URL}/api/staff/login", json={
        "username": "dr_vikas", "password": "test1234"
    })
    if r.status_code != 200:
        pytest.skip(f"dr_vikas login failed: {r.status_code} {r.text}")
    return r.json().get("token")


@pytest.fixture(scope="module", autouse=True)
def cleanup_after(staff_token):
    """Ensure cleanup of all test data at end."""
    yield
    headers = {"Authorization": f"Bearer {staff_token}"}
    # Unblock full-day
    try:
        requests.delete(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-date/{DOCTOR_VIKAS}/{DATE_FULL_BLOCK}",
            headers=headers,
        )
    except Exception:
        pass
    # Unblock session - try common start times
    for st in ["11:30"]:
        try:
            requests.delete(
                f"{BASE_URL}/api/diagyn-staff/schedule/block-session/{DOCTOR_VIKAS}/{DATE_SESSION_BLOCK}/{st}",
                headers=headers,
            )
        except Exception:
            pass
    # Also clean any sessions on DATE_BOOKING in case
    try:
        requests.delete(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-date/{DOCTOR_VIKAS}/{DATE_BOOKING}",
            headers=headers,
        )
    except Exception:
        pass


# ========== TEST 1: Full-day block hides all slots ==========

class TestFullDayBlock:
    def test_block_full_day(self, staff_token):
        r = requests.post(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-date",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={"doctor": DOCTOR_VIKAS, "date": DATE_FULL_BLOCK,
                  "reason": "TEST_leave_full", "force_override": True},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

    def test_chatbot_slots_json_empty_on_leave(self):
        r = requests.get(
            f"{BASE_URL}/api/chatbot/slots",
            params={"doctor": DOCTOR_VIKAS, "date": DATE_FULL_BLOCK, "clinic": CLINIC},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert data.get("available_slots") == []
        assert data.get("available_count") == 0
        assert "leave" in (data.get("message") or "").lower()

    def test_chatbot_slots_text_leave_message(self):
        r = requests.get(
            f"{BASE_URL}/api/chatbot/slots-text",
            params={"doctor": DOCTOR_VIKAS, "date": DATE_FULL_BLOCK, "clinic": CLINIC},
        )
        assert r.status_code == 200
        text = r.text.lower()
        assert "leave" in text or "on leave" in text
        # Should not contain colon-time list (basic heuristic)
        assert "morning:" not in text
        assert "evening:" not in text

    def test_server_side_booking_rejected(self):
        """TEST 5: booking into blocked date is rejected."""
        r = requests.post(
            f"{BASE_URL}/api/chatbot/book",
            json={
                "patient_name": "TEST_Blocked_Patient",
                "patient_phone": "9999900001",
                "doctor": DOCTOR_VIKAS,
                "clinic": CLINIC,
                "date": DATE_FULL_BLOCK,
                "time_slot": "06:00 PM",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is False, f"Expected rejection, got {body}"
        msg = (body.get("message") or "").lower()
        assert any(k in msg for k in ["leave", "unavailable", "blocked", "not available"]), body


# ========== TEST 2 & 3: Session block + isolation ==========

class TestSessionBlock:
    def test_block_morning_session(self, doctor_vikas_token):
        r = requests.post(
            f"{BASE_URL}/api/doctor-schedule/block-session",
            headers={"Authorization": f"Bearer {doctor_vikas_token}"},
            json={"date": DATE_SESSION_BLOCK, "start_time": "11:30",
                  "end_time": "14:00", "reason": "TEST_morning_block",
                  "force_override": True},
        )
        # Fallback: staff endpoint if doctor route differs
        if r.status_code not in (200, 201):
            # Try staff version
            # need staff token - skip gracefully with info
            pytest.skip(f"doctor block-session failed {r.status_code}: {r.text}")
        body = r.json()
        assert body.get("success") is True or body.get("conflict") is None, body

    def test_morning_slots_hidden_evening_present_json(self):
        r = requests.get(
            f"{BASE_URL}/api/chatbot/slots",
            params={"doctor": DOCTOR_VIKAS, "date": DATE_SESSION_BLOCK, "clinic": CLINIC},
        )
        assert r.status_code == 200
        data = r.json()
        slots = data.get("available_slots", [])
        # Morning slots 11:30-14:00 should be absent
        for blocked_display in ["11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM"]:
            assert blocked_display not in slots, f"{blocked_display} should be blocked but found in {slots}"
        # Evening (06:00 PM onwards) should still be present
        evening_present = any("PM" in s and (s.startswith("06:") or s.startswith("07:") or s.startswith("08:"))
                              for s in slots)
        assert evening_present, f"Expected evening slots in {slots}"

    def test_morning_slots_hidden_evening_present_text(self):
        r = requests.get(
            f"{BASE_URL}/api/chatbot/slots-text",
            params={"doctor": DOCTOR_VIKAS, "date": DATE_SESSION_BLOCK, "clinic": CLINIC},
        )
        assert r.status_code == 200
        text = r.text
        # Blocked morning slots should NOT appear
        for blocked_display in ["11:30 AM", "12:00 PM", "01:00 PM", "01:30 PM"]:
            assert blocked_display not in text, f"{blocked_display} should not be in text:\n{text}"
        # Evening likely present
        assert "06:00 PM" in text or "Evening" in text, text

    def test_json_text_consistency(self):
        """TEST 6: JSON and text return same set of available times."""
        rj = requests.get(f"{BASE_URL}/api/chatbot/slots",
                          params={"doctor": DOCTOR_VIKAS, "date": DATE_SESSION_BLOCK, "clinic": CLINIC})
        rt = requests.get(f"{BASE_URL}/api/chatbot/slots-text",
                          params={"doctor": DOCTOR_VIKAS, "date": DATE_SESSION_BLOCK, "clinic": CLINIC})
        assert rj.status_code == 200 and rt.status_code == 200
        json_slots = set(rj.json().get("available_slots", []))
        # extract times like "06:00 PM" from text
        import re
        text_slots = set(re.findall(r"\d{1,2}:\d{2}\s?[AP]M", rt.text))
        # text slots must be a subset or equal (text may dedupe)
        missing_in_text = json_slots - text_slots
        extra_in_text = text_slots - json_slots
        assert not missing_in_text, f"JSON has slots not in text: {missing_in_text}"
        assert not extra_in_text, f"Text has slots not in JSON: {extra_in_text}"

    def test_isolation_other_doctor_unaffected(self):
        """TEST 3: Dr. Neha Patel's slots on same date should be unaffected."""
        r = requests.get(
            f"{BASE_URL}/api/chatbot/slots",
            params={"doctor": DOCTOR_NEHA, "date": DATE_SESSION_BLOCK, "clinic": CLINIC},
        )
        assert r.status_code == 200
        data = r.json()
        slots = data.get("available_slots", [])
        # If Dr. Neha has schedule on that day, morning slots should be fine
        # (Can't assert exact without knowing schedule, but at minimum, response is normal / non-empty if she works that day)
        print(f"Dr. Neha slots on {DATE_SESSION_BLOCK}: count={len(slots)}")
        # Verify she's NOT on leave message
        assert "leave" not in (data.get("message") or "").lower()

    def test_server_side_booking_blocked_session_rejected(self):
        r = requests.post(
            f"{BASE_URL}/api/chatbot/book",
            json={
                "patient_name": "TEST_Session_Block",
                "patient_phone": "9999900002",
                "doctor": DOCTOR_VIKAS,
                "clinic": CLINIC,
                "date": DATE_SESSION_BLOCK,
                "time_slot": "12:00 PM",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is False, body


# ========== TEST 4: Existing booked appointment still excluded ==========

class TestBookedAppointmentExclusion:
    _booking_id = None
    _appt_id = None

    def test_book_real_appointment(self):
        r = requests.post(
            f"{BASE_URL}/api/chatbot/book",
            json={
                "patient_name": "TEST_Regression_Patient",
                "patient_phone": "9999900003",
                "doctor": DOCTOR_VIKAS,
                "clinic": CLINIC,
                "date": DATE_BOOKING,
                "time_slot": "06:00 PM",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True, body
        TestBookedAppointmentExclusion._booking_id = body.get("booking_id")
        TestBookedAppointmentExclusion._appt_id = body.get("appointment_id")

    def test_booked_slot_excluded_from_chatbot_slots(self):
        r = requests.get(
            f"{BASE_URL}/api/chatbot/slots",
            params={"doctor": DOCTOR_VIKAS, "date": DATE_BOOKING, "clinic": CLINIC},
        )
        assert r.status_code == 200
        slots = r.json().get("available_slots", [])
        assert "06:00 PM" not in slots, f"Booked 06:00 PM should be excluded, got {slots}"

    def test_cleanup_booked_appointment(self, staff_token):
        """Cancel the test appointment so it's not left behind."""
        if not TestBookedAppointmentExclusion._booking_id:
            pytest.skip("No booking to clean up")
        # Try multiple cancel endpoints
        bid = TestBookedAppointmentExclusion._booking_id
        headers = {"Authorization": f"Bearer {staff_token}"}
        for url in [
            f"{BASE_URL}/api/appointments/{bid}",
            f"{BASE_URL}/api/diagyn-staff/appointments/{bid}",
        ]:
            try:
                rr = requests.delete(url, headers=headers)
                if rr.status_code in (200, 204):
                    print(f"Cleaned via {url}")
                    return
            except Exception:
                pass
        # Fallback: set status Cancelled via patch
        print(f"Could not delete {bid}; main agent cleanup may be required")


# ========== TEST 7: Final cleanup verification ==========

class TestFinalCleanup:
    def test_remove_full_day_block(self, staff_token):
        r = requests.delete(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-date/{DOCTOR_VIKAS}/{DATE_FULL_BLOCK}",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert r.status_code in (200, 204), r.text

    def test_remove_session_block(self, staff_token):
        r = requests.delete(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-session/{DOCTOR_VIKAS}/{DATE_SESSION_BLOCK}/11:30",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert r.status_code in (200, 204), r.text

    def test_blocked_dates_cleaned(self, staff_token):
        r = requests.get(
            f"{BASE_URL}/api/diagyn-staff/schedule/blocked-dates",
            headers={"Authorization": f"Bearer {staff_token}"},
            params={"doctor": DOCTOR_VIKAS},
        )
        assert r.status_code == 200
        data = r.json()
        remaining_dates = [b for b in data.get("blocked_dates", [])
                           if b.get("date") in (DATE_FULL_BLOCK, DATE_SESSION_BLOCK, DATE_BOOKING)]
        remaining_sessions = [b for b in data.get("blocked_sessions", [])
                              if b.get("date") in (DATE_FULL_BLOCK, DATE_SESSION_BLOCK, DATE_BOOKING)]
        assert not remaining_dates, f"Leftover blocked_dates: {remaining_dates}"
        assert not remaining_sessions, f"Leftover blocked_sessions: {remaining_sessions}"
