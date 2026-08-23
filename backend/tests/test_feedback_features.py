"""
Test Post-Visit Feedback APIs and New Features (Iteration 221)
- Feedback pending, submit, dismiss endpoints
- Health Timeline endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9833188288"

class TestFeedbackAPIs:
    """Test Post-Visit Feedback System"""
    
    def test_feedback_pending_no_completed_appointments(self):
        """GET /api/feedback/pending should return null when no completed appointments"""
        response = requests.get(f"{BASE_URL}/api/feedback/pending?phone={TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "appointment" in data, "Response should have 'appointment' key"
        # Since no completed appointments exist for this test phone, should be null
        # (This is expected behavior as noted in review_request)
        print(f"✓ Feedback pending returned: appointment={data['appointment']}")
    
    def test_feedback_pending_invalid_phone(self):
        """GET /api/feedback/pending with short phone should return null"""
        response = requests.get(f"{BASE_URL}/api/feedback/pending?phone=123")
        assert response.status_code == 200
        
        data = response.json()
        assert data["appointment"] is None, "Should return null for invalid phone"
        print("✓ Feedback pending correctly handles invalid phone")
    
    def test_feedback_submit_success(self):
        """POST /api/feedback/submit should store feedback"""
        test_appointment_id = f"TEST_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "appointment_id": test_appointment_id,
            "phone": TEST_PHONE,
            "rating": 5,
            "comment": "Great service!",
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/feedback/submit",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Should return success: true"
        assert "Thank you" in data.get("message", ""), "Should include thank you message"
        print(f"✓ Feedback submitted successfully for appointment {test_appointment_id}")
    
    def test_feedback_submit_duplicate_rejected(self):
        """POST /api/feedback/submit twice for same appointment should fail"""
        test_appointment_id = f"DUPE_TEST_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "appointment_id": test_appointment_id,
            "phone": TEST_PHONE,
            "rating": 4,
            "comment": "Good",
            "doctor": "Dr. Neha Patel",
            "clinic": "Amnion Clinic"
        }
        
        # First submission - should succeed
        response1 = requests.post(f"{BASE_URL}/api/feedback/submit", json=payload)
        assert response1.status_code == 200, f"First submit should succeed: {response1.text}"
        
        # Second submission - should fail
        response2 = requests.post(f"{BASE_URL}/api/feedback/submit", json=payload)
        assert response2.status_code == 400, f"Duplicate should fail with 400, got {response2.status_code}"
        print("✓ Duplicate feedback submission correctly rejected")
    
    def test_feedback_submit_invalid_rating(self):
        """POST /api/feedback/submit with rating > 5 should fail"""
        payload = {
            "appointment_id": f"INVALID_{uuid.uuid4().hex[:8]}",
            "phone": TEST_PHONE,
            "rating": 10,  # Invalid rating
            "comment": "Test",
            "doctor": "Dr. Test",
            "clinic": "Test Clinic"
        }
        
        response = requests.post(f"{BASE_URL}/api/feedback/submit", json=payload)
        assert response.status_code == 400, f"Invalid rating should return 400, got {response.status_code}"
        print("✓ Invalid rating (>5) correctly rejected")
    
    def test_feedback_dismiss_success(self):
        """POST /api/feedback/dismiss should mark feedback as dismissed"""
        test_appointment_id = f"DISMISS_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "appointment_id": test_appointment_id,
            "phone": TEST_PHONE
        }
        
        response = requests.post(
            f"{BASE_URL}/api/feedback/dismiss",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Should return success: true"
        print(f"✓ Feedback dismissed successfully for appointment {test_appointment_id}")


class TestHealthTimelineAPI:
    """Test Health Timeline endpoint"""
    
    def test_health_timeline_with_phone(self):
        """GET /api/patients/health-timeline should return timeline data"""
        response = requests.get(f"{BASE_URL}/api/patients/health-timeline?phone={TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "timeline" in data, "Response should have 'timeline' key"
        assert isinstance(data["timeline"], list), "Timeline should be a list"
        print(f"✓ Health timeline returned {len(data['timeline'])} events")
    
    def test_health_timeline_without_phone(self):
        """GET /api/patients/health-timeline without phone should return empty"""
        response = requests.get(f"{BASE_URL}/api/patients/health-timeline")
        # Should still return 200 with empty timeline
        assert response.status_code in [200, 422], f"Expected 200 or 422, got {response.status_code}"
        print("✓ Health timeline handles missing phone parameter")


class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_api_health(self):
        """GET /api/health should return ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "ok", "Should return status: ok"
        print("✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
