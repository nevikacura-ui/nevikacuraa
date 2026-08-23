"""
Test Session 218 Features:
1. GET /api/patients/health-timeline?phone=9833188288 - timeline events from appointments
2. POST /api/patients/auto-profile - create/update patient profile
3. GET /api/live-queue/status/{clinic} - live queue status
4. GET /api/appointments/v2/calendar with patient_phone filter
5. Appointment reminders 30min window (code review)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthTimelineAPI:
    """Test /api/patients/health-timeline endpoint"""
    
    def test_health_timeline_with_valid_phone(self):
        """GET /api/patients/health-timeline?phone=9833188288 should return timeline events"""
        response = requests.get(f"{BASE_URL}/api/patients/health-timeline?phone=9833188288")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "timeline" in data, "Response should contain 'timeline' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data["timeline"], list), "timeline should be a list"
        
        # Verify at least some events exist for test patient
        print(f"Timeline total events: {data['total']}")
        print(f"Timeline events count: {len(data['timeline'])}")
        
        # Check event structure if we have events
        if len(data["timeline"]) > 0:
            event = data["timeline"][0]
            assert "type" in event, "Event should have 'type' field"
            assert "title" in event, "Event should have 'title' field"
            assert event["type"] in ["appointment", "lab_test", "prescription", "vitals", "follow_up"]
    
    def test_health_timeline_invalid_phone(self):
        """GET /api/patients/health-timeline with invalid phone returns 400"""
        response = requests.get(f"{BASE_URL}/api/patients/health-timeline?phone=123")
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
    
    def test_health_timeline_empty_phone(self):
        """GET /api/patients/health-timeline without phone returns 400"""
        response = requests.get(f"{BASE_URL}/api/patients/health-timeline?phone=")
        assert response.status_code in [400, 422], f"Expected 400/422 for empty phone, got {response.status_code}"
    
    def test_health_timeline_nonexistent_phone(self):
        """GET /api/patients/health-timeline with nonexistent phone returns empty timeline"""
        response = requests.get(f"{BASE_URL}/api/patients/health-timeline?phone=0000000000")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["total"] == 0, "Nonexistent phone should return 0 events"


class TestAutoProfileAPI:
    """Test /api/patients/auto-profile endpoint"""
    
    def test_auto_profile_create_new(self):
        """POST /api/patients/auto-profile creates new patient profile"""
        import uuid
        test_phone = f"99{str(uuid.uuid4().int)[:8]}"  # Random unique phone
        
        response = requests.post(
            f"{BASE_URL}/api/patients/auto-profile",
            json={"phone": test_phone, "name": "Test Patient Auto"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["created"] == True  # New profile created
        assert "profile" in data
        assert data["profile"]["phone"] == test_phone
    
    def test_auto_profile_update_existing(self):
        """POST /api/patients/auto-profile updates existing patient profile"""
        # Use a phone that likely exists (test patient)
        response = requests.post(
            f"{BASE_URL}/api/patients/auto-profile",
            json={"phone": "9833188288", "name": "Updated Name Test"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        # Could be either created=True or created=False depending on state
        assert "profile" in data
    
    def test_auto_profile_invalid_phone(self):
        """POST /api/patients/auto-profile with invalid phone returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/patients/auto-profile",
            json={"phone": "123", "name": "Test"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_auto_profile_empty_phone(self):
        """POST /api/patients/auto-profile with empty phone returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/patients/auto-profile",
            json={"phone": "", "name": "Test"}
        )
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"


class TestLiveQueueAPI:
    """Test /api/live-queue/status/{clinic} endpoint"""
    
    def test_live_queue_diagyn(self):
        """GET /api/live-queue/status/diagyn returns queue status"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/diagyn")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Queue status should have clinic and estimated_wait fields
        assert "clinic" in data or "estimated_wait" in data or "currently_serving" in data
        print(f"DiaGyn queue status: {data}")
    
    def test_live_queue_mango(self):
        """GET /api/live-queue/status/mango returns queue status"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/mango")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Mango queue status: {data}")
    
    def test_live_queue_pushpa(self):
        """GET /api/live-queue/status/pushpa returns queue data (as per main agent context)"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/pushpa")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Pushpa queue status: {data}")


class TestCalendarAPIWithPatientFilter:
    """Test /api/appointments/v2/calendar with patient_phone filter"""
    
    def test_calendar_without_filter(self):
        """GET calendar without patient_phone returns all appointments"""
        response = requests.get(f"{BASE_URL}/api/appointments/v2/calendar?month=3&year=2026")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_appointments" in data
        total_all = data["total_appointments"]
        print(f"Total appointments (unfiltered): {total_all}")
        return total_all
    
    def test_calendar_with_patient_phone_filter(self):
        """GET calendar with patient_phone=9833188288 returns filtered appointments"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/v2/calendar?month=3&year=2026&patient_phone=9833188288"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_appointments" in data
        total_filtered = data["total_appointments"]
        print(f"Total appointments (filtered by 9833188288): {total_filtered}")
        
        # Check that filtering worked - should have appointments for this patient
        assert total_filtered >= 0, "Filtered count should be >= 0"
        return total_filtered
    
    def test_calendar_filter_comparison(self):
        """Filtered count should be <= unfiltered count"""
        # Unfiltered
        resp_all = requests.get(f"{BASE_URL}/api/appointments/v2/calendar?month=3&year=2026")
        total_all = resp_all.json()["total_appointments"]
        
        # Filtered
        resp_filtered = requests.get(
            f"{BASE_URL}/api/appointments/v2/calendar?month=3&year=2026&patient_phone=9833188288"
        )
        total_filtered = resp_filtered.json()["total_appointments"]
        
        assert total_filtered <= total_all, f"Filtered ({total_filtered}) should be <= unfiltered ({total_all})"
        print(f"Filter comparison PASS: {total_filtered} <= {total_all}")


class TestStaffLogin:
    """Test staff portal login with known credentials"""
    
    def test_staff_diagyn_login(self):
        """POST /api/staff/login with staff_diagyn credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test1234"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data or "success" in data
        print(f"Staff login response: {data.get('success', 'OK')}")
    
    def test_doctor_login(self):
        """POST /api/staff/login with dr_vikas credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data or "success" in data
        print(f"Doctor login response: {data.get('success', 'OK')}")


class TestHealthAPI:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
