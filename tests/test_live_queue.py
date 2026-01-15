"""
Live Queue & Wait Time Display System Tests
Tests for Nevika Cura healthcare app queue management features

Features tested:
1. Public queue status display
2. Remote check-in ("I'm on my way")
3. Queue position lookup
4. Busy hours heatmap
5. Staff queue management (call next, complete, analytics)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"


class TestPublicQueueEndpoints:
    """Public endpoints - no authentication required"""
    
    def test_queue_status_pushpa(self):
        """GET /api/live-queue/status/pushpa - Public queue status"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/pushpa")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "pushpa"
        assert "date" in data
        assert "current_time_ist" in data
        assert "currently_serving" in data
        assert "waiting_queue" in data
        assert "stats" in data
        
        # Validate stats structure
        stats = data["stats"]
        assert "total_waiting" in stats
        assert "currently_serving" in stats
        assert "avg_wait_time_minutes" in stats
        assert "estimated_queue_time" in stats
        
        print(f"✓ Queue status for Pushpa: {stats['total_waiting']} waiting, {stats['currently_serving']} serving")
    
    def test_queue_status_amnion(self):
        """GET /api/live-queue/status/amnion - Public queue status for Amnion clinic"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/amnion")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "amnion"
        print(f"✓ Queue status for Amnion: {data['stats']['total_waiting']} waiting")
    
    def test_busy_hours_heatmap_pushpa(self):
        """GET /api/live-queue/busy-hours/pushpa - Busy hours heatmap"""
        response = requests.get(f"{BASE_URL}/api/live-queue/busy-hours/pushpa?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "pushpa"
        assert data["period_days"] == 7
        assert "heatmap" in data
        assert "peak_hours" in data
        assert "recommendation" in data
        
        # Validate heatmap structure
        heatmap = data["heatmap"]
        assert len(heatmap) > 0
        
        # Check heatmap entry structure
        entry = heatmap[0]
        assert "day" in entry
        assert "hour" in entry
        assert "hour_label" in entry
        assert "patient_count" in entry
        assert "intensity" in entry
        
        print(f"✓ Busy hours heatmap: {len(heatmap)} entries, {len(data['peak_hours'])} peak hours")
    
    def test_busy_hours_heatmap_amnion(self):
        """GET /api/live-queue/busy-hours/amnion - Busy hours for Amnion"""
        response = requests.get(f"{BASE_URL}/api/live-queue/busy-hours/amnion?days=14")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "amnion"
        print(f"✓ Amnion busy hours: {len(data['heatmap'])} entries")
    
    def test_queue_position_no_params(self):
        """GET /api/live-queue/position - Should require at least one param"""
        response = requests.get(f"{BASE_URL}/api/live-queue/position")
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        print("✓ Position lookup correctly requires parameters")
    
    def test_queue_position_not_found(self):
        """GET /api/live-queue/position - Non-existent appointment"""
        response = requests.get(f"{BASE_URL}/api/live-queue/position?phone=0000000000")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        print("✓ Position lookup returns 404 for non-existent appointment")
    
    def test_queue_position_by_appointment_id(self):
        """GET /api/live-queue/position - Lookup by appointment_id"""
        response = requests.get(f"{BASE_URL}/api/live-queue/position?appointment_id=fake-id-123")
        # Should return 404 for non-existent appointment
        assert response.status_code == 404
        print("✓ Position lookup by appointment_id works (404 for non-existent)")


class TestRemoteCheckIn:
    """Remote check-in feature tests"""
    
    def test_remote_checkin_missing_fields(self):
        """POST /api/live-queue/remote-checkin - Missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/live-queue/remote-checkin",
            json={"appointment_id": "test-id"}  # Missing patient_phone
        )
        assert response.status_code == 422  # Validation error
        print("✓ Remote check-in validates required fields")
    
    def test_remote_checkin_not_found(self):
        """POST /api/live-queue/remote-checkin - Non-existent appointment"""
        response = requests.post(
            f"{BASE_URL}/api/live-queue/remote-checkin",
            json={
                "appointment_id": "non-existent-id",
                "patient_phone": "9999999999",
                "eta_minutes": 15
            }
        )
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        print("✓ Remote check-in returns 404 for non-existent appointment")


class TestStaffAuthentication:
    """Staff authentication tests"""
    
    def test_staff_login(self):
        """POST /api/staff/login - Staff authentication"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "staff" in data
        assert data["staff"]["name"] == "Staff Pushpa"
        assert data["staff"]["clinic"] == "Pushpa Clinic"
        
        print(f"✓ Staff login successful: {data['staff']['name']}")
        return data["token"]
    
    def test_staff_endpoints_require_auth(self):
        """Staff endpoints should require authentication"""
        # Test analytics without auth
        response = requests.get(f"{BASE_URL}/api/live-queue/staff/analytics/pushpa")
        assert response.status_code == 401
        
        data = response.json()
        assert "detail" in data
        assert "authentication" in data["detail"].lower()
        print("✓ Staff endpoints correctly require authentication")


class TestStaffQueueManagement:
    """Staff queue management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get staff token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Staff login failed")
    
    def test_staff_analytics(self):
        """GET /api/live-queue/staff/analytics/pushpa - Staff analytics"""
        response = requests.get(
            f"{BASE_URL}/api/live-queue/staff/analytics/pushpa",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "pushpa"
        assert "date" in data
        assert "today_stats" in data
        assert "current_queue_length" in data
        assert "efficiency_score" in data
        
        # Validate today_stats structure
        stats = data["today_stats"]
        assert "total_patients" in stats
        assert "completed" in stats
        assert "waiting" in stats
        assert "no_shows" in stats
        assert "walk_ins" in stats
        assert "avg_wait_time_minutes" in stats
        
        print(f"✓ Staff analytics: {stats['total_patients']} total, {stats['completed']} completed, efficiency: {data['efficiency_score']}%")
    
    def test_staff_analytics_amnion(self):
        """GET /api/live-queue/staff/analytics/amnion - Analytics for Amnion"""
        response = requests.get(
            f"{BASE_URL}/api/live-queue/staff/analytics/amnion",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "amnion"
        print(f"✓ Amnion analytics: {data['today_stats']['total_patients']} patients")
    
    def test_staff_call_next_empty_queue(self):
        """POST /api/live-queue/staff/call-next/pushpa - Call next when queue empty"""
        response = requests.post(
            f"{BASE_URL}/api/live-queue/staff/call-next/pushpa",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # When queue is empty, success should be False with message
        if data.get("success") == False:
            assert "message" in data
            assert "no patients" in data["message"].lower()
            print("✓ Call next correctly handles empty queue")
        else:
            # If there are patients, verify called_patient structure
            assert "called_patient" in data
            print(f"✓ Called patient: {data['called_patient'].get('name')}")
    
    def test_staff_complete_not_found(self):
        """POST /api/live-queue/staff/complete/{id} - Non-existent appointment"""
        response = requests.post(
            f"{BASE_URL}/api/live-queue/staff/complete/non-existent-id",
            headers=self.headers
        )
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        print("✓ Complete endpoint returns 404 for non-existent appointment")


class TestNotifyPatient:
    """Patient notification endpoint tests"""
    
    def test_notify_patient_not_found(self):
        """POST /api/live-queue/notify-patient/{id} - Non-existent appointment"""
        response = requests.post(
            f"{BASE_URL}/api/live-queue/notify-patient/non-existent-id?positions_ahead=2"
        )
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        print("✓ Notify patient returns 404 for non-existent appointment")


class TestQueueStatusResponseStructure:
    """Detailed response structure validation"""
    
    def test_queue_status_full_structure(self):
        """Validate complete queue status response structure"""
        response = requests.get(f"{BASE_URL}/api/live-queue/status/pushpa")
        assert response.status_code == 200
        
        data = response.json()
        
        # Top-level fields
        required_fields = ["success", "clinic", "date", "current_time_ist", 
                          "currently_serving", "waiting_queue", "stats", "last_updated"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Stats fields
        stats_fields = ["total_waiting", "currently_serving", "avg_wait_time_minutes", "estimated_queue_time"]
        for field in stats_fields:
            assert field in data["stats"], f"Missing stats field: {field}"
        
        # Validate types
        assert isinstance(data["currently_serving"], list)
        assert isinstance(data["waiting_queue"], list)
        assert isinstance(data["stats"]["total_waiting"], int)
        assert isinstance(data["stats"]["avg_wait_time_minutes"], (int, float))
        
        print("✓ Queue status response structure validated")
    
    def test_busy_hours_full_structure(self):
        """Validate complete busy hours response structure"""
        response = requests.get(f"{BASE_URL}/api/live-queue/busy-hours/pushpa")
        assert response.status_code == 200
        
        data = response.json()
        
        # Top-level fields
        required_fields = ["success", "clinic", "period_days", "heatmap", "peak_hours", "recommendation"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Heatmap entry structure
        if len(data["heatmap"]) > 0:
            entry = data["heatmap"][0]
            entry_fields = ["day", "hour", "hour_label", "patient_count", "intensity"]
            for field in entry_fields:
                assert field in entry, f"Missing heatmap field: {field}"
        
        # Peak hours structure
        if len(data["peak_hours"]) > 0:
            peak = data["peak_hours"][0]
            assert "day" in peak
            assert "hour" in peak
            assert "patient_count" in peak
        
        print("✓ Busy hours response structure validated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
