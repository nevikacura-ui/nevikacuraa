"""
Iteration 394 - Tests for:
1. Orange Pharmacy PDF import (1246 items, 28 categories)
2. Doctor leave bug fix: /api/doctors/next-available skipping blocked dates
3. New endpoint: /api/doctors/blocked-dates
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

def _load_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env()).rstrip("/")
API = f"{BASE_URL}/api"

DOCTOR_NAME = "Dr. Vikas Jha"


@pytest.fixture(scope="module")
def dr_vikas_token():
    r = requests.post(f"{API}/staff/login",
                      json={"username": "dr_vikas", "password": "test1234"}, timeout=15)
    assert r.status_code == 200, f"Staff login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"No token in staff login response: {data}"
    return tok


# ---------- Pharmacy Import Verification ----------

class TestPharmacyImport:
    def test_categories_endpoint(self):
        r = requests.get(f"{API}/pharmacy/v3/categories", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        cats = data["categories"]
        # Expect approx 28-29 categories
        assert 25 <= len(cats) <= 32, f"Expected ~28 categories, got {len(cats)}: {[c['name'] for c in cats]}"
        total = data["total"]
        # Should be ~1246
        assert 1200 <= total <= 1300, f"Expected ~1246 total, got {total}"
        print(f"Categories={len(cats)} Total={total}")
        for c in cats[:10]:
            print(f"  {c['name']}: {c['count']}")

    def test_browse_endpoint_all_section(self):
        r = requests.get(f"{API}/pharmacy/v3/browse", params={"per_category": 8, "section": "all"}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert len(data["sections"]) > 0
        assert data["total_medicines"] >= 1200

    def test_excluded_items_absent(self):
        for term in ["INJ HCG", "INJ INDIRAB", "CONSULTATION", "DELIVERY CHARGES"]:
            r = requests.get(f"{API}/pharmacy/v3/search", params={"q": term, "limit": 20}, timeout=15)
            assert r.status_code == 200, f"search failed for {term}"
            data = r.json()
            results = data.get("medicines") or data.get("results") or data.get("data") or []
            # Filter out false positives that don't actually contain the term
            hits = [m for m in results if term.upper() in (m.get("name", "").upper())]
            assert len(hits) == 0, f"Excluded term '{term}' still returned: {[m.get('name') for m in hits]}"

    def test_droziver_collapsed(self):
        r = requests.get(f"{API}/pharmacy/v3/search", params={"q": "DROZIVER", "limit": 20}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        results = data.get("medicines") or data.get("results") or data.get("data") or []
        hits = [m for m in results if "DROZIVER" in m.get("name", "").upper()]
        # Should be exactly 1 collapsed entry
        assert len(hits) == 1, f"Expected 1 DROZIVER entry (collapsed), got {len(hits)}: {[m.get('name') for m in hits]}"

    def test_orthal_forte_collapsed(self):
        r = requests.get(f"{API}/pharmacy/v3/search", params={"q": "ORTHAL FORTE", "limit": 20}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        results = data.get("medicines") or data.get("results") or data.get("data") or []
        hits = [m for m in results if "ORTHAL FORTE" in m.get("name", "").upper()]
        assert len(hits) == 1, f"Expected 1 ORTHAL FORTE entry, got {len(hits)}: {[m.get('name') for m in hits]}"

    def test_veet_typo_merged(self):
        r = requests.get(f"{API}/pharmacy/v3/search", params={"q": "VEET", "limit": 20}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        results = data.get("medicines") or data.get("results") or data.get("data") or []
        names = [m.get("name", "").upper() for m in results]
        # No REMOVEL (typo) - only REMOVAL
        removels = [n for n in names if "REMOVEL" in n]
        assert len(removels) == 0, f"Typo 'REMOVEL' still present: {removels}"

    def test_teltan_typo_merged(self):
        r = requests.get(f"{API}/pharmacy/v3/search", params={"q": "TETAN", "limit": 20}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        results = data.get("medicines") or data.get("results") or data.get("data") or []
        names = [m.get("name", "").upper() for m in results]
        # Task said: TETAN 20 / TETAN 40 should be gone (typos of TELTAN 20/40)
        bad = [n for n in names if n in ("TETAN 20", "TETAN 40")]
        assert len(bad) == 0, f"Typos 'TETAN 20/40' still present: {bad}"

    def test_search_drotin(self):
        r = requests.get(f"{API}/pharmacy/v3/search", params={"q": "DROTIN", "limit": 10}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        results = data.get("medicines") or data.get("results") or data.get("data") or []
        hits = [m for m in results if "DROTIN" in m.get("name", "").upper()]
        assert len(hits) > 0, "No DROTIN results found"
        # Verify price present and discount_percent = 0
        for m in hits[:3]:
            price = m.get("price") or m.get("mrp") or m.get("sale_price")
            assert price is not None
            print(f"DROTIN: {m.get('name')} price={price} disc={m.get('discount_percent')}")


# ---------- Doctor Leave Bug Fix ----------

class TestDoctorLeave:
    BLOCKED_DATE = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    CLEANUP_DATE = None

    def test_block_future_date(self, dr_vikas_token):
        headers = {"Authorization": f"Bearer {dr_vikas_token}"}
        # First unblock in case a leftover
        requests.delete(f"{API}/doctor-schedule/block-date/{self.BLOCKED_DATE}", headers=headers, timeout=10)
        r = requests.post(f"{API}/doctor-schedule/block-date",
                          headers=headers,
                          json={"date": self.BLOCKED_DATE, "reason": "Leave test", "force_override": True},
                          timeout=15)
        assert r.status_code == 200, f"Block failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True, f"Block did not succeed: {data}"
        TestDoctorLeave.CLEANUP_DATE = self.BLOCKED_DATE

    def test_blocked_dates_public_endpoint(self):
        r = requests.get(f"{API}/doctors/blocked-dates", params={"doctor": DOCTOR_NAME}, timeout=10)
        assert r.status_code == 200, f"blocked-dates failed: {r.status_code} {r.text}"
        data = r.json()
        dates = [b.get("date") for b in data.get("blocked_dates", [])]
        assert self.BLOCKED_DATE in dates, f"Blocked date {self.BLOCKED_DATE} not in response: {dates}"

    def test_booked_slots_marks_date_blocked(self):
        # Need clinic - try a common one
        r = requests.get(f"{API}/appointments/booked-slots",
                        params={"doctor": DOCTOR_NAME, "clinic": "Nevika Cura Clinic", "date": self.BLOCKED_DATE},
                        timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("date_blocked") is True, f"date_blocked flag missing: {data}"
        assert len(data.get("booked_slots", [])) > 20, "Should have full day slots blocked"

    def test_next_available_skips_blocked(self):
        r = requests.get(f"{API}/doctors/next-available", params={"doctor": DOCTOR_NAME}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # If available, it should NOT be the blocked date
        if data.get("available"):
            assert data.get("date") != self.BLOCKED_DATE, \
                f"next-available returned blocked date {self.BLOCKED_DATE}: {data}"
            print(f"Next available: {data.get('date')} {data.get('time')}")

    def test_zzz_cleanup_unblock(self, dr_vikas_token):
        if TestDoctorLeave.CLEANUP_DATE:
            headers = {"Authorization": f"Bearer {dr_vikas_token}"}
            r = requests.delete(f"{API}/doctor-schedule/block-date/{TestDoctorLeave.CLEANUP_DATE}",
                               headers=headers, timeout=10)
            assert r.status_code in (200, 204, 404)
