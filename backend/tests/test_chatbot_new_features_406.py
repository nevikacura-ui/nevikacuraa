"""
Tests for 3 new chatbot/admin features added after iteration_405:
  1) GET /api/chatbot/admin/slot-sync-check (staff auth)
  2) Leave-reason display in /api/chatbot/slots and /slots-text (session blocks only)
  3) DELETE /api/chatbot/appointments/{id} (staff auth, WhatsApp-only safety guard)

Doctor: Dr. Vikas Jha, Clinic: Pushpa Clinic.
Future dates well beyond any date used in iteration_405 tests to avoid collision.
Cleans up ALL created data (blocks + appointments) at the end.
"""
import os
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-rx-portal.preview.emergentagent.com").rstrip("/")

DOCTOR = "Dr. Vikas Jha"
CLINIC = "Pushpa Clinic"

# Pick dates far in the future to avoid collision with prior iterations' residue
IST = timezone(timedelta(hours=5, minutes=30))
_BASE = datetime.now(IST) + timedelta(days=45)
# Shift to a Monday to be safe (avoid Sunday leave)
while _BASE.weekday() == 6:
    _BASE += timedelta(days=1)
DATE_NO_BLOCK = _BASE.strftime("%Y-%m-%d")
DATE_SESSION_BLOCK = (_BASE + timedelta(days=1)).strftime("%Y-%m-%d")
DATE_FULL_LEAVE = (_BASE + timedelta(days=2)).strftime("%Y-%m-%d")
DATE_STD_BOOK = (_BASE + timedelta(days=60)).strftime("%Y-%m-%d")  # dedicated date for standard-source booking test
SESSION_REASON = "TEST_Conference_406"
FULLDAY_REASON = "TEST_FullLeave_406"


@pytest.fixture(scope="module")
def staff_token():
    r = requests.post(f"{BASE_URL}/api/staff/login",
                      json={"username": "staff_diagyn", "password": "test1234"}, timeout=20)
    assert r.status_code == 200, f"Staff login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(staff_token):
    return {"Authorization": f"Bearer {staff_token}"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(auth_headers):
    """Teardown: remove all blocks and TEST appointments we created."""
    created_appointments = []
    yield created_appointments
    # Remove session block
    try:
        requests.delete(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-session/{DOCTOR}/{DATE_SESSION_BLOCK}/18:00",
            headers=auth_headers, timeout=20)
    except Exception:
        pass
    # Remove full-day block
    try:
        requests.delete(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-date/{DOCTOR}/{DATE_FULL_LEAVE}",
            headers=auth_headers, timeout=20)
    except Exception:
        pass
    # Hard-delete any appointments we tracked
    for apt_id in created_appointments:
        try:
            requests.delete(
                f"{BASE_URL}/api/chatbot/appointments/{apt_id}?hard_delete=true&reason=cleanup",
                headers=auth_headers, timeout=20)
        except Exception:
            pass
    # Verify blocks are clean
    r = requests.get(f"{BASE_URL}/api/doctors/blocked-dates", params={"doctor": DOCTOR}, timeout=20)
    print("Post-cleanup blocked-dates:", r.status_code, r.text[:400])


# ============ FEATURE 1: slot-sync-check ============

class TestSlotSyncCheck:
    def test_requires_auth(self):
        r = requests.get(
            f"{BASE_URL}/api/chatbot/admin/slot-sync-check",
            params={"doctor": DOCTOR, "date": DATE_NO_BLOCK, "clinic": CLINIC},
            timeout=20,
        )
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}: {r.text}"

    def test_in_sync_no_blocks(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/chatbot/admin/slot-sync-check",
            params={"doctor": DOCTOR, "date": DATE_NO_BLOCK, "clinic": CLINIC},
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        for key in ["in_sync", "date_on_leave", "leave_reason",
                    "chatbot_slot_count", "ground_truth_slot_count",
                    "missing_in_chatbot", "extra_in_chatbot"]:
            assert key in data, f"Missing key {key} in response: {data}"
        assert data["in_sync"] is True, f"Expected in_sync=true, got {data}"
        assert data["missing_in_chatbot"] == []
        assert data["extra_in_chatbot"] == []
        assert data["date_on_leave"] is False
        assert data["chatbot_slot_count"] == data["ground_truth_slot_count"]
        # record baseline for next test
        TestSlotSyncCheck.baseline_count = data["chatbot_slot_count"]

    def test_in_sync_with_session_block(self, auth_headers):
        # Create session block on DATE_SESSION_BLOCK 18:00-20:00
        rb = requests.post(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-session",
            headers=auth_headers,
            json={"doctor": DOCTOR, "date": DATE_SESSION_BLOCK,
                  "start_time": "18:00", "end_time": "20:00", "reason": SESSION_REASON},
            timeout=20,
        )
        assert rb.status_code in (200, 201), f"block-session failed: {rb.status_code} {rb.text}"

        # First get baseline WITHOUT any block via a fresh date (DATE_NO_BLOCK already tested)
        baseline = requests.get(
            f"{BASE_URL}/api/chatbot/admin/slot-sync-check",
            params={"doctor": DOCTOR, "date": DATE_NO_BLOCK, "clinic": CLINIC},
            headers=auth_headers, timeout=20,
        ).json()

        r = requests.get(
            f"{BASE_URL}/api/chatbot/admin/slot-sync-check",
            params={"doctor": DOCTOR, "date": DATE_SESSION_BLOCK, "clinic": CLINIC},
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data["in_sync"] is True, f"Expected in_sync=true after block: {data}"
        assert data["missing_in_chatbot"] == []
        assert data["extra_in_chatbot"] == []
        assert data["chatbot_slot_count"] == data["ground_truth_slot_count"]
        # With evening session blocked, slot count should be <= baseline (unless same day already short)
        assert data["chatbot_slot_count"] <= baseline["chatbot_slot_count"], (
            f"Expected lower slot count after session block. "
            f"baseline={baseline['chatbot_slot_count']}, with_block={data['chatbot_slot_count']}"
        )


# ============ FEATURE 2: Leave reason display ============

class TestLeaveReasonDisplay:
    def test_slots_no_leave_note_when_no_block(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/chatbot/slots",
                         params={"doctor": DOCTOR, "date": DATE_NO_BLOCK, "clinic": CLINIC},
                         timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "leave_note" not in data, f"leave_note should be absent, got: {data}"

    def test_slots_has_leave_note_on_session_block(self, auth_headers):
        # Ensure session block exists (idempotent)
        requests.post(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-session",
            headers=auth_headers,
            json={"doctor": DOCTOR, "date": DATE_SESSION_BLOCK,
                  "start_time": "18:00", "end_time": "20:00", "reason": SESSION_REASON},
            timeout=20,
        )
        r = requests.get(f"{BASE_URL}/api/chatbot/slots",
                         params={"doctor": DOCTOR, "date": DATE_SESSION_BLOCK, "clinic": CLINIC},
                         timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "leave_note" in data, f"leave_note missing: {data}"
        assert SESSION_REASON in data["leave_note"], f"Reason '{SESSION_REASON}' not in leave_note: {data['leave_note']}"
        assert "partially unavailable" in data["leave_note"].lower()

    def test_slots_text_appends_note_on_session_block(self):
        r = requests.get(f"{BASE_URL}/api/chatbot/slots-text",
                         params={"doctor": DOCTOR, "date": DATE_SESSION_BLOCK, "clinic": CLINIC},
                         timeout=20)
        assert r.status_code == 200, r.text
        text = r.text
        assert SESSION_REASON in text, f"Reason not in slots-text output: {text}"
        assert "partially unavailable" in text.lower()

    def test_slots_text_no_note_on_free_date(self):
        r = requests.get(f"{BASE_URL}/api/chatbot/slots-text",
                         params={"doctor": DOCTOR, "date": DATE_NO_BLOCK, "clinic": CLINIC},
                         timeout=20)
        assert r.status_code == 200, r.text
        assert "partially unavailable" not in r.text.lower()

    def test_fullday_leave_behavior_unchanged(self, auth_headers):
        rb = requests.post(
            f"{BASE_URL}/api/diagyn-staff/schedule/block-date",
            headers=auth_headers,
            json={"doctor": DOCTOR, "date": DATE_FULL_LEAVE, "reason": FULLDAY_REASON},
            timeout=20,
        )
        assert rb.status_code in (200, 201), f"block-date failed: {rb.status_code} {rb.text}"

        r = requests.get(f"{BASE_URL}/api/chatbot/slots",
                         params={"doctor": DOCTOR, "date": DATE_FULL_LEAVE, "clinic": CLINIC},
                         timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["available_slots"] == []
        assert FULLDAY_REASON in data.get("message", ""), f"Full-day reason missing in message: {data}"


# ============ FEATURE 3: Secure cancel/delete ============

def _book_chatbot_appointment(date: str, time_slot_12h: str, phone: str, name: str):
    payload = {
        "patient_name": name,
        "patient_phone": phone,
        "doctor": DOCTOR,
        "clinic": CLINIC,
        "date": date,
        "time_slot": time_slot_12h,
        "visit_type": "SCHEDULED",
    }
    r = requests.post(f"{BASE_URL}/api/chatbot/book", json=payload, timeout=30)
    return r


class TestChatbotAppointmentDelete:
    def test_delete_requires_auth(self):
        r = requests.delete(f"{BASE_URL}/api/chatbot/appointments/nonexistent-id", timeout=20)
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}: {r.text}"

    def test_soft_cancel_chatbot_appointment(self, auth_headers, cleanup):
        # Book an appointment
        br = _book_chatbot_appointment(DATE_NO_BLOCK, "09:30 AM", "9998800101", "TEST_SoftCancel_406")
        assert br.status_code == 200 and br.json().get("success"), f"booking failed: {br.status_code} {br.text}"
        apt_id = br.json().get("appointment_id") or br.json().get("id") or br.json().get("booking_id")
        assert apt_id, f"no appointment_id in response: {br.json()}"
        cleanup.append(apt_id)

        # Soft-cancel
        r = requests.delete(
            f"{BASE_URL}/api/chatbot/appointments/{apt_id}",
            params={"reason": "TEST_soft_cancel_reason_406"},
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 200, f"soft-cancel failed: {r.status_code} {r.text}"
        assert r.json().get("success") is True

        # Verify appointment STILL EXISTS post soft-cancel: a subsequent hard-delete
        # of the same id must succeed (would 404 if soft-cancel had removed the doc).
        r2 = requests.delete(
            f"{BASE_URL}/api/chatbot/appointments/{apt_id}",
            params={"hard_delete": "true", "reason": "cleanup_after_soft"},
            headers=auth_headers, timeout=20,
        )
        assert r2.status_code == 200, (
            f"After soft-cancel, hard-delete should succeed (doc should still exist). "
            f"Got {r2.status_code}: {r2.text}"
        )
        # Also verify same route returns 'cancelled' message prior to hard-delete:
        # (we can't fetch doc without staff list route; this chain proves persistence)

    def test_hard_delete_chatbot_appointment(self, auth_headers, cleanup):
        br = _book_chatbot_appointment(DATE_NO_BLOCK, "10:00 AM", "9998800102", "TEST_HardDelete_406")
        assert br.status_code == 200 and br.json().get("success"), f"booking failed: {br.text}"
        apt_id = br.json().get("appointment_id") or br.json().get("id") or br.json().get("booking_id")
        assert apt_id

        r = requests.delete(
            f"{BASE_URL}/api/chatbot/appointments/{apt_id}",
            params={"hard_delete": "true", "reason": "TEST_hard_delete_406"},
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 200, f"hard-delete failed: {r.status_code} {r.text}"

        # Verify it's gone
        g = requests.get(f"{BASE_URL}/api/appointments/{apt_id}", timeout=20)
        assert g.status_code in (404, 400), f"Appointment should be gone, got {g.status_code}: {g.text[:200]}"

    def test_safety_guard_non_whatsapp_source(self, auth_headers, cleanup):
        import time as _time
        # Unique phone per run to dodge 24h-per-phone and existing-appointment guards
        unique_phone = f"9{int(_time.time())%10000000:07d}99"[:10]

        # Query available slots to pick a free one dynamically
        slots_r = requests.get(f"{BASE_URL}/api/chatbot/slots",
                               params={"doctor": DOCTOR, "clinic": CLINIC, "date": DATE_STD_BOOK},
                               timeout=20)
        assert slots_r.status_code == 200, slots_r.text
        avail = slots_r.json().get("available_slots", [])
        assert avail, f"No available slots on {DATE_STD_BOOK}"
        last = avail[-1]
        from datetime import datetime as _dt
        t24 = _dt.strptime(last, "%I:%M %p").strftime("%H:%M")

        payload = {
            "doctor": DOCTOR,
            "clinic": CLINIC,
            "date": DATE_STD_BOOK,
            "time": t24,
            "patient_name": "TEST_StdBook_406",
            "patient_phone": unique_phone,
            "patient_email": "test406@example.com",
            "patient_age": "30",
        }
        br = requests.post(f"{BASE_URL}/api/appointments", json=payload, timeout=30)
        assert br.status_code < 400, f"std booking failed: {br.status_code} {br.text}"
        body = br.json()
        apt_id = body.get("id") or body.get("booking_id") or body.get("appointment", {}).get("id")
        assert apt_id, f"no id in std booking response: {body}"

        # Try to delete via chatbot delete endpoint — must 400
        r = requests.delete(
            f"{BASE_URL}/api/chatbot/appointments/{apt_id}",
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 400, f"Expected 400 for non-WhatsApp source, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "whatsapp" in detail or "chatbot" in detail, f"error msg not informative: {detail}"

        # Verify it still exists: a second DELETE must again return 400 (safety guard),
        # proving the appointment was not touched. (A public GET /api/appointments/{id}
        # may not exist unauthenticated, so a second DELETE is the cleanest proof.)
        r2 = requests.delete(
            f"{BASE_URL}/api/chatbot/appointments/{apt_id}",
            headers=auth_headers, timeout=20,
        )
        assert r2.status_code == 400, (
            f"After rejected delete, 2nd DELETE should still be 400 (doc intact). "
            f"Got {r2.status_code}: {r2.text}"
        )

        # Cleanup: cancel std appointment via staff status-update endpoint
        try:
            requests.put(
                f"{BASE_URL}/api/diagyn-staff/appointments/{apt_id}/status",
                headers=auth_headers,
                json={"status": "Cancelled"},
                timeout=20,
            )
        except Exception:
            pass
