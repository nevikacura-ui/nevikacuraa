"""
Backend tests: DiaGyn Staff Schedule (block dates/sessions, audit log, conflict flow)
                + pharmacy/diagnostic order status push field.
"""
import os
import uuid
import time
import requests
import pytest
from datetime import datetime, timedelta, timezone

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    # Fallback: read from frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

DOCTOR = "Dr. Vikas Jha"
DOCTOR_ID = "d9ece1ab-1712-40e4-af1f-a1875927c2d5"
CLINIC = "Pushpa Clinic"

# use a far-future date to avoid colliding with real data
FUTURE_DATE = (datetime.now(timezone.utc) + timedelta(days=120)).strftime("%Y-%m-%d")
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")


@pytest.fixture(scope="module")
def staff_token():
    r = requests.post(f"{API}/staff/login", json={"username": "staff_diagyn", "password": "test1234"})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def hdr(staff_token):
    return {"Authorization": f"Bearer {staff_token}"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(hdr):
    yield
    # Best-effort cleanup
    try:
        from pymongo import MongoClient
        m = MongoClient("mongodb://localhost:27017")["test_database"]
        m.appointments.delete_many({"patient_phone": "9991112222"})
        m.blocked_slot_attempts.delete_many({"doctor": DOCTOR, "patient_phone": {"$regex": "^999"}})
    except Exception:
        pass
    try:
        requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{FUTURE_DATE}", headers=hdr)
        requests.delete(f"{API}/diagyn-staff/schedule/block-session/{DOCTOR}/{FUTURE_DATE}/14:00", headers=hdr)
        requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{TODAY}", headers=hdr)
    except Exception:
        pass


# ── Basic endpoints ─────────────────────────────────────────────
class TestBasics:
    def test_list_doctors(self, hdr):
        r = requests.get(f"{API}/diagyn-staff/schedule/doctors", headers=hdr)
        assert r.status_code == 200
        data = r.json()
        assert "doctors" in data
        assert DOCTOR in data["doctors"]

    def test_get_blocks_returns_structure(self, hdr):
        r = requests.get(f"{API}/diagyn-staff/schedule/blocked-dates", params={"doctor": DOCTOR}, headers=hdr)
        assert r.status_code == 200
        d = r.json()
        assert "blocked_dates" in d and "blocked_sessions" in d
        assert isinstance(d["blocked_dates"], list)
        assert isinstance(d["blocked_sessions"], list)

    def test_get_blocks_unknown_doctor_404(self, hdr):
        r = requests.get(f"{API}/diagyn-staff/schedule/blocked-dates", params={"doctor": "Dr. Nobody"}, headers=hdr)
        assert r.status_code == 404

    def test_auth_required(self):
        r = requests.get(f"{API}/diagyn-staff/schedule/doctors")
        assert r.status_code in (401, 403)


# ── Block/unblock full day (no conflict) ────────────────────────
class TestBlockDate:
    def test_block_date_success(self, hdr):
        # Ensure no residual first
        requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{FUTURE_DATE}", headers=hdr)
        r = requests.post(f"{API}/diagyn-staff/schedule/block-date", headers=hdr,
                          json={"doctor": DOCTOR, "date": FUTURE_DATE, "reason": "TEST_leave"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True

        # verify persisted
        g = requests.get(f"{API}/diagyn-staff/schedule/blocked-dates", params={"doctor": DOCTOR}, headers=hdr)
        dates = [b["date"] for b in g.json()["blocked_dates"]]
        assert FUTURE_DATE in dates

    def test_unblock_date_success(self, hdr):
        r = requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{FUTURE_DATE}", headers=hdr)
        assert r.status_code == 200
        g = requests.get(f"{API}/diagyn-staff/schedule/blocked-dates", params={"doctor": DOCTOR}, headers=hdr)
        dates = [b["date"] for b in g.json()["blocked_dates"]]
        assert FUTURE_DATE not in dates


# ── Block/unblock partial session (no conflict) ─────────────────
class TestBlockSession:
    def test_block_session_success(self, hdr):
        requests.delete(f"{API}/diagyn-staff/schedule/block-session/{DOCTOR}/{FUTURE_DATE}/14:00", headers=hdr)
        r = requests.post(f"{API}/diagyn-staff/schedule/block-session", headers=hdr,
                          json={"doctor": DOCTOR, "date": FUTURE_DATE,
                                "start_time": "14:00", "end_time": "16:00",
                                "reason": "TEST_break"})
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

        g = requests.get(f"{API}/diagyn-staff/schedule/blocked-dates", params={"doctor": DOCTOR}, headers=hdr)
        sessions = g.json()["blocked_sessions"]
        matches = [s for s in sessions if s.get("date") == FUTURE_DATE and s.get("start_time") == "14:00"]
        assert len(matches) >= 1
        assert matches[0].get("end_time") == "16:00"

    def test_unblock_session_success(self, hdr):
        r = requests.delete(f"{API}/diagyn-staff/schedule/block-session/{DOCTOR}/{FUTURE_DATE}/14:00", headers=hdr)
        assert r.status_code == 200
        g = requests.get(f"{API}/diagyn-staff/schedule/blocked-dates", params={"doctor": DOCTOR}, headers=hdr)
        matches = [s for s in g.json()["blocked_sessions"] if s.get("date") == FUTURE_DATE and s.get("start_time") == "14:00"]
        assert len(matches) == 0


# ── Conflict flow (existing appointment on date being blocked) ──
class TestConflictFlow:
    """Creates a walk-in on today, then tries to block today, expects conflict, then overrides."""

    booking_id_holder = {"id": None}

    def test_a_create_walkin(self, hdr):
        import time as _t
        # Ensure today isn't blocked first
        requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{TODAY}", headers=hdr)
        # Use a unique time to avoid unique-slot collision with residuals
        wt = f"23:{40 + (int(_t.time()) % 19):02d}"
        TestConflictFlow.walkin_time = wt
        r = requests.post(f"{API}/staff/appointments/walk-in", headers=hdr,
                          json={"doctor": DOCTOR, "clinic": CLINIC, "time": wt,
                                "patient_name": "TEST_ConflictPatient",
                                "patient_phone": "9991112222", "patient_age": 30})
        assert r.status_code == 200, r.text
        appt = r.json().get("appointment") or {}
        TestConflictFlow.booking_id_holder["id"] = appt.get("id")
        assert appt.get("date") == TODAY

    def test_b_block_returns_conflict(self, hdr):
        r = requests.post(f"{API}/diagyn-staff/schedule/block-date", headers=hdr,
                          json={"doctor": DOCTOR, "date": TODAY, "reason": "TEST_conflict"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("success") is False
        assert d.get("conflict") is True
        assert d.get("appointment_count", 0) >= 1
        assert any(p.get("phone") == "9991112222" for p in d.get("patients", []))

    def test_c_override_cancels_and_blocks(self, hdr):
        r = requests.post(f"{API}/diagyn-staff/schedule/block-date", headers=hdr,
                          json={"doctor": DOCTOR, "date": TODAY, "reason": "TEST_conflict",
                                "force_override": True})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("success") is True
        assert d.get("cancelled_count", 0) >= 1

        # verify block persisted
        g = requests.get(f"{API}/diagyn-staff/schedule/blocked-dates", params={"doctor": DOCTOR}, headers=hdr)
        assert TODAY in [b["date"] for b in g.json()["blocked_dates"]]

    def test_d_cleanup_unblock_today(self, hdr):
        r = requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{TODAY}", headers=hdr)
        assert r.status_code == 200


# ── Audit log: attempted walk-in on blocked date must be rejected + logged ─
class TestAuditLog:
    def test_audit_entry_created_on_rejection(self, hdr):
        # Block a future date... but walk-in only creates on today. Use today.
        # First ensure nothing blocking now
        requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{TODAY}", headers=hdr)

        # Block today (no conflict because we cleaned up)
        r = requests.post(f"{API}/diagyn-staff/schedule/block-date", headers=hdr,
                          json={"doctor": DOCTOR, "date": TODAY, "reason": "TEST_audit_leave",
                                "force_override": True})
        assert r.status_code == 200 and r.json().get("success") is True

        marker_phone = f"999{int(time.time()) % 10000000:07d}"
        marker_name = f"TEST_AuditReject_{uuid.uuid4().hex[:6]}"

        # Now attempt walk-in => should be rejected
        r2 = requests.post(f"{API}/staff/appointments/walk-in", headers=hdr,
                           json={"doctor": DOCTOR, "clinic": CLINIC, "time": "23:59",
                                 "patient_name": marker_name, "patient_phone": marker_phone,
                                 "patient_age": 30})
        assert r2.status_code >= 400, f"walk-in should have been rejected but got {r2.status_code}"

        # Read audit log
        time.sleep(0.5)
        a = requests.get(f"{API}/diagyn-staff/schedule/blocked-attempts",
                         params={"doctor": DOCTOR, "limit": 50}, headers=hdr)
        assert a.status_code == 200
        attempts = a.json().get("attempts", [])
        found = [x for x in attempts if x.get("patient_phone") == marker_phone or x.get("patient_name") == marker_name]
        assert len(found) >= 1, f"expected audit entry with phone {marker_phone} or name {marker_name}. First 3 attempts: {attempts[:3]}"
        entry = found[0]
        assert entry.get("doctor") == DOCTOR or DOCTOR.lower() in str(entry.get("doctor", "")).lower()
        assert entry.get("source") in ("walk_in", "walkin", "walk-in")
        assert entry.get("attempted_at") or entry.get("timestamp")

        # cleanup
        requests.delete(f"{API}/diagyn-staff/schedule/block-date/{DOCTOR}/{TODAY}", headers=hdr)


# ── Pharmacy / Diagnostic order status push field ───────────────
@pytest.fixture(scope="module")
def admin_token_and_seed():
    """Seed test admin user + pharmacy + diagnostic orders directly in mongo. Yields (token, ids)."""
    import jwt
    from pymongo import MongoClient
    JWT_SECRET = "nevika-cura-healthcare-secret-key-2025"
    m = MongoClient("mongodb://localhost:27017")["test_database"]
    admin_id = "TEST_admin_" + uuid.uuid4().hex[:6]
    m.users.insert_one({"id": admin_id, "email": "test_admin@test.com",
                        "role": "admin", "name": "TEST Admin", "username": "test_admin"})
    tok = jwt.encode({"sub": admin_id}, JWT_SECRET, algorithm="HS256")

    ph_syn = "TEST_ord_" + uuid.uuid4().hex[:8]
    ph_real = "TEST_ord_" + uuid.uuid4().hex[:8]
    lab_syn = "TEST_lab_" + uuid.uuid4().hex[:8]
    m.pharmacy_orders.insert_one({"id": ph_syn, "booking_id": ph_syn, "patient_phone": "9991112222",
        "patient_email": "9991112222@pharmacy.nevikacura.com",
        "patient_name": "TEST", "status": "confirmed", "total_amount": 100})
    m.pharmacy_orders.insert_one({"id": ph_real, "booking_id": ph_real, "patient_phone": "9991112222",
        "patient_email": "real_patient@example.com",
        "patient_name": "TEST", "status": "confirmed", "total_amount": 100})
    m.diagnostic_orders.insert_one({"id": lab_syn, "booking_id": lab_syn, "patient_phone": "9991112222",
        "patient_email": "9991112222@pharmacy.nevikacura.com",
        "patient_name": "TEST", "status": "confirmed", "total_amount": 100})
    yield tok, {"ph_syn": ph_syn, "ph_real": ph_real, "lab_syn": lab_syn}
    m.pharmacy_orders.delete_many({"id": {"$in": [ph_syn, ph_real]}})
    m.diagnostic_orders.delete_one({"id": lab_syn})
    m.users.delete_one({"id": admin_id})


class TestPushField:
    def test_pharmacy_synthetic_email_push_sent_0(self, admin_token_and_seed):
        tok, ids = admin_token_and_seed
        h = {"Authorization": f"Bearer {tok}"}
        r = requests.patch(f"{API}/pharmacy/order/{ids['ph_syn']}/status", headers=h,
                           json={"order_id": ids["ph_syn"], "status": "packing", "send_notification": False})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "push" in d, f"push field missing: {d}"
        assert d["push"].get("sent") == 0

    def test_pharmacy_real_email_push_returns_field(self, admin_token_and_seed):
        tok, ids = admin_token_and_seed
        h = {"Authorization": f"Bearer {tok}"}
        r = requests.patch(f"{API}/pharmacy/order/{ids['ph_real']}/status", headers=h,
                           json={"order_id": ids["ph_real"], "status": "packing", "send_notification": False})
        assert r.status_code == 200
        d = r.json()
        assert "push" in d
        # Real email but no registered FCM token -> sent=0 or 'no_target'
        assert isinstance(d["push"], dict)

    def test_diagnostic_synthetic_email_push_sent_0(self, admin_token_and_seed):
        tok, ids = admin_token_and_seed
        h = {"Authorization": f"Bearer {tok}"}
        r = requests.patch(f"{API}/diagnostics/order/{ids['lab_syn']}/status", headers=h,
                           json={"order_id": ids["lab_syn"], "status": "sample_collected", "send_notification": False})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "push" in d
        assert d["push"].get("sent") == 0

    def test_pharmacy_status_unknown_order_404(self, admin_token_and_seed):
        tok, _ = admin_token_and_seed
        h = {"Authorization": f"Bearer {tok}"}
        r = requests.patch(f"{API}/pharmacy/order/doesnotexist_{uuid.uuid4().hex[:6]}/status",
                           headers=h, json={"order_id": "x", "status": "packing", "send_notification": False})
        assert r.status_code == 404
