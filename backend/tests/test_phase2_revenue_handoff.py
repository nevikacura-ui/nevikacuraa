"""
Phase 2 Testing: Revenue Dashboard + Handoff Notes APIs
Tests for iteration 309 - new features added in Phase 2
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DOCTOR_CREDS = {"username": "dr_vikas", "password": "test1234"}
STAFF_CREDS = {"username": "staff_diagyn", "password": "test1234"}


class TestAuthentication:
    """Test authentication for API access"""
    
    def test_staff_login_success(self):
        """Test staff login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DOCTOR_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert len(data["token"]) > 0, "Empty token"
        print(f"✓ Staff login successful, token length: {len(data['token'])}")
        return data["token"]


class TestRevenueDashboard:
    """Revenue Dashboard API tests - 3 endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DOCTOR_CREDS)
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_revenue_summary_default(self):
        """GET /api/revenue/summary - default 30 days"""
        response = requests.get(f"{BASE_URL}/api/revenue/summary", headers=self.headers)
        assert response.status_code == 200, f"Revenue summary failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "success field missing or false"
        assert "period" in data, "period field missing"
        assert "today" in data, "today field missing"
        assert "current_period" in data, "current_period field missing"
        assert "growth" in data, "growth field missing"
        
        # Verify today section
        today = data["today"]
        assert "consultations" in today, "today.consultations missing"
        assert "pharmacy" in today, "today.pharmacy missing"
        assert "diagnostics" in today, "today.diagnostics missing"
        assert "total" in today, "today.total missing"
        
        # Verify current_period section
        current = data["current_period"]
        assert "total" in current, "current_period.total missing"
        assert "avg_daily" in current, "current_period.avg_daily missing"
        
        # Verify growth section
        growth = data["growth"]
        assert "total" in growth, "growth.total missing"
        
        print(f"✓ Revenue summary: today={today['total']}, period={current['total']}, growth={growth['total']}%")
    
    def test_revenue_summary_custom_days(self):
        """GET /api/revenue/summary?days=7 - custom period"""
        response = requests.get(f"{BASE_URL}/api/revenue/summary?days=7", headers=self.headers)
        assert response.status_code == 200, f"Revenue summary (7d) failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data["period"]["days"] == 7, "Period days mismatch"
        print(f"✓ Revenue summary (7 days): total={data['current_period']['total']}")
    
    def test_revenue_summary_unauthorized(self):
        """GET /api/revenue/summary - without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/revenue/summary")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Revenue summary correctly rejects unauthorized requests")
    
    def test_revenue_daily_trend(self):
        """GET /api/revenue/daily-trend - returns trend array"""
        response = requests.get(f"{BASE_URL}/api/revenue/daily-trend?days=7", headers=self.headers)
        assert response.status_code == 200, f"Daily trend failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "success field missing"
        assert "trend" in data, "trend field missing"
        assert isinstance(data["trend"], list), "trend should be a list"
        
        # Verify trend item structure
        if len(data["trend"]) > 0:
            item = data["trend"][0]
            assert "date" in item, "trend item missing date"
            assert "total" in item, "trend item missing total"
            assert "consultations" in item, "trend item missing consultations"
            assert "pharmacy" in item, "trend item missing pharmacy"
            assert "diagnostics" in item, "trend item missing diagnostics"
        
        print(f"✓ Daily trend: {len(data['trend'])} days of data")
    
    def test_revenue_top_services(self):
        """GET /api/revenue/top-services - returns top doctors, products, tests"""
        response = requests.get(f"{BASE_URL}/api/revenue/top-services?days=30", headers=self.headers)
        assert response.status_code == 200, f"Top services failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "success field missing"
        assert "top_doctors" in data, "top_doctors field missing"
        assert "top_products" in data, "top_products field missing"
        assert "top_tests" in data, "top_tests field missing"
        
        assert isinstance(data["top_doctors"], list), "top_doctors should be a list"
        assert isinstance(data["top_products"], list), "top_products should be a list"
        assert isinstance(data["top_tests"], list), "top_tests should be a list"
        
        print(f"✓ Top services: {len(data['top_doctors'])} doctors, {len(data['top_products'])} products, {len(data['top_tests'])} tests")


class TestHandoffNotes:
    """Handoff Notes API tests - 5 endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DOCTOR_CREDS)
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_handoff_note(self):
        """POST /api/handoff-notes - create a new handoff note"""
        payload = {
            "shift": "afternoon",
            "summary": "Test handoff note created by automated testing. All patients stable.",
            "critical_patients": [
                {
                    "name": "Test Patient",
                    "condition": "Diabetes monitoring",
                    "notes": "Blood sugar levels need monitoring",
                    "priority": "high"
                }
            ],
            "pending_items": [
                {
                    "description": "Follow up with lab results",
                    "priority": "normal",
                    "due_by": "18:00"
                }
            ],
            "medications_changed": "None",
            "equipment_issues": "None",
            "staffing_notes": "Full staff available",
            "clinic": "diagyn"
        }
        
        response = requests.post(f"{BASE_URL}/api/handoff-notes", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create handoff note failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "success field missing"
        assert "note" in data, "note field missing"
        
        note = data["note"]
        assert note["shift"] == "afternoon", "shift mismatch"
        assert "Test handoff note" in note["summary"], "summary mismatch"
        assert len(note["critical_patients"]) == 1, "critical_patients count mismatch"
        assert len(note["pending_items"]) == 1, "pending_items count mismatch"
        
        print(f"✓ Handoff note created: shift={note['shift']}, date={note['date']}")
    
    def test_get_handoff_notes_list(self):
        """GET /api/handoff-notes - get list of handoff notes"""
        response = requests.get(f"{BASE_URL}/api/handoff-notes?days=7", headers=self.headers)
        assert response.status_code == 200, f"Get handoff notes failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "success field missing"
        assert "notes" in data, "notes field missing"
        assert isinstance(data["notes"], list), "notes should be a list"
        assert "count" in data, "count field missing"
        
        print(f"✓ Handoff notes list: {data['count']} notes found")
        return data["notes"]
    
    def test_get_latest_handoff(self):
        """GET /api/handoff-notes/latest - get most recent active note"""
        response = requests.get(f"{BASE_URL}/api/handoff-notes/latest", headers=self.headers)
        assert response.status_code == 200, f"Get latest handoff failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "success field missing"
        # note can be None if no active notes
        if data.get("note"):
            note = data["note"]
            assert "shift" in note, "note missing shift"
            assert "summary" in note, "note missing summary"
            assert "date" in note, "note missing date"
            print(f"✓ Latest handoff: {note['shift']} shift on {note['date']}")
        else:
            print("✓ Latest handoff: No active notes (expected if none created)")
    
    def test_acknowledge_handoff(self):
        """POST /api/handoff-notes/{date}/{shift}/acknowledge - acknowledge a note"""
        # First get the latest note to acknowledge
        response = requests.get(f"{BASE_URL}/api/handoff-notes/latest", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        if data.get("note"):
            note = data["note"]
            date = note["date"]
            shift = note["shift"]
            
            # Acknowledge the note
            ack_response = requests.post(
                f"{BASE_URL}/api/handoff-notes/{date}/{shift}/acknowledge",
                json={},
                headers=self.headers
            )
            assert ack_response.status_code == 200, f"Acknowledge failed: {ack_response.text}"
            ack_data = ack_response.json()
            assert ack_data.get("success") == True, "acknowledge success field missing"
            print(f"✓ Handoff acknowledged: {date} {shift}")
        else:
            # Create a note first, then acknowledge
            payload = {
                "shift": "evening",
                "summary": "Test note for acknowledgement testing",
                "clinic": "diagyn"
            }
            create_resp = requests.post(f"{BASE_URL}/api/handoff-notes", json=payload, headers=self.headers)
            assert create_resp.status_code == 200
            note = create_resp.json()["note"]
            
            ack_response = requests.post(
                f"{BASE_URL}/api/handoff-notes/{note['date']}/{note['shift']}/acknowledge",
                json={},
                headers=self.headers
            )
            assert ack_response.status_code == 200, f"Acknowledge failed: {ack_response.text}"
            print(f"✓ Handoff acknowledged: {note['date']} {note['shift']}")
    
    def test_handoff_stats(self):
        """GET /api/handoff-notes/stats - get handoff statistics"""
        response = requests.get(f"{BASE_URL}/api/handoff-notes/stats?days=30", headers=self.headers)
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "success field missing"
        assert "total_notes" in data, "total_notes field missing"
        assert "acknowledged" in data, "acknowledged field missing"
        assert "acknowledgement_rate" in data, "acknowledgement_rate field missing"
        assert "with_critical_patients" in data, "with_critical_patients field missing"
        assert "with_pending_items" in data, "with_pending_items field missing"
        assert "by_shift" in data, "by_shift field missing"
        
        print(f"✓ Handoff stats: {data['total_notes']} notes, {data['acknowledgement_rate']}% acknowledged")
    
    def test_handoff_unauthorized(self):
        """GET /api/handoff-notes - without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/handoff-notes")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Handoff notes correctly rejects unauthorized requests")


class TestPhase1Refactoring:
    """Verify Phase 1 refactored pages still work - basic API checks"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDS)
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_diagyn_staff_config(self):
        """GET /api/diagyn-staff/config - used by DoctorPortal"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=self.headers)
        assert response.status_code == 200, f"Config failed: {response.text}"
        data = response.json()
        assert "fee_codes" in data or "clinics" in data, "Config missing expected fields"
        print("✓ DiaGyn staff config endpoint working")
    
    def test_mango_tests_list(self):
        """GET /api/mango/tests - used by MangoLabsStaffPortal"""
        response = requests.get(f"{BASE_URL}/api/mango/tests", headers=self.headers)
        # May return 403 if not mango staff, but endpoint should exist
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ Mango tests endpoint exists (status: {response.status_code})")
    
    def test_pharmacy_medicines(self):
        """GET /api/pharmacy/medicines - used by OrangePharmacyStaffPortal"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines?page=1&limit=10", headers=self.headers)
        # May return 403 if not pharmacy staff, but endpoint should exist
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ Pharmacy medicines endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
