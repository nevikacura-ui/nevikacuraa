"""
Rating API Tests - Testing In-App Rating Prompt Feature
Tests for: pending ratings, rating submission, and rating check endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test phone for ratings
TEST_PHONE = "9876543210"
TEST_APPOINTMENT_ID = "APT-TEST-RATING-001"


class TestRatingsPendingEndpoint:
    """Tests for GET /api/ratings/pending/{phone}"""

    def test_pending_ratings_returns_unrated_appointments(self):
        """GET /api/ratings/pending/{phone} should return pending unrated appointments"""
        response = requests.get(f"{BASE_URL}/api/ratings/pending/{TEST_PHONE}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "pending" in data, "Response should have 'pending' key"
        assert isinstance(data["pending"], list), "'pending' should be a list"
        
        # Check if test appointment is in pending list
        pending_ids = [p.get("appointment_id") for p in data["pending"]]
        print(f"Pending appointments for {TEST_PHONE}: {pending_ids}")
        
        if len(data["pending"]) > 0:
            # Validate structure of pending appointment
            first_pending = data["pending"][0]
            assert "appointment_id" in first_pending, "Should have appointment_id"
            assert "doctor" in first_pending, "Should have doctor"
            assert "clinic" in first_pending, "Should have clinic"

    def test_pending_ratings_nonexistent_phone(self):
        """GET /api/ratings/pending/{phone} should return empty for unknown phone"""
        fake_phone = "0000000000"
        response = requests.get(f"{BASE_URL}/api/ratings/pending/{fake_phone}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "pending" in data
        assert isinstance(data["pending"], list)
        assert len(data["pending"]) == 0, "Should have no pending appointments for unknown phone"


class TestRatingsSubmitEndpoint:
    """Tests for POST /api/ratings/submit"""

    def test_submit_rating_success(self):
        """POST /api/ratings/submit should successfully submit a rating"""
        # Use unique appointment ID to avoid conflicts with other tests
        unique_appointment_id = f"APT-TEST-{uuid.uuid4().hex[:8].upper()}"
        
        rating_payload = {
            "appointment_id": unique_appointment_id,
            "phone": TEST_PHONE,
            "billing_experience": 5,
            "staff_behaviour": 4,
            "clinic_experience": "good",
            "feedback_text": "Excellent service, very professional staff.",
            "doctor_name": "Dr. Test Doctor",
            "clinic_name": "Test Clinic"
        }
        
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json=rating_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert "rating_id" in data, "Should return rating_id"
        assert data["rating_id"].startswith("RAT-"), "Rating ID should start with RAT-"
        assert "message" in data, "Should return message"
        print(f"Rating submitted successfully: {data['rating_id']}")
        
        return data["rating_id"]

    def test_submit_rating_minimal_fields(self):
        """POST /api/ratings/submit should work with minimal required fields"""
        unique_appointment_id = f"APT-MINIMAL-{uuid.uuid4().hex[:8].upper()}"
        
        rating_payload = {
            "appointment_id": unique_appointment_id,
            "phone": TEST_PHONE,
            "billing_experience": 3,
            "staff_behaviour": 3,
            "clinic_experience": "bad"
            # Optional fields omitted: feedback_text, doctor_name, clinic_name
        }
        
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json=rating_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "rating_id" in data, "Should return rating_id"
        print(f"Minimal rating submitted: {data['rating_id']}")

    def test_submit_rating_invalid_data(self):
        """POST /api/ratings/submit should reject invalid data"""
        # Missing required fields
        invalid_payload = {
            "appointment_id": "APT-INVALID-001",
            # Missing phone, billing_experience, etc.
        }
        
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json=invalid_payload)
        
        # Should return 422 (validation error) or similar
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"


class TestRatingsCheckEndpoint:
    """Tests for GET /api/ratings/check/{appointment_id}"""

    def test_check_rating_after_submit(self):
        """GET /api/ratings/check/{appointment_id} should confirm rating exists after submission"""
        # First submit a rating
        unique_appointment_id = f"APT-CHECK-{uuid.uuid4().hex[:8].upper()}"
        
        rating_payload = {
            "appointment_id": unique_appointment_id,
            "phone": TEST_PHONE,
            "billing_experience": 4,
            "staff_behaviour": 5,
            "clinic_experience": "good",
            "feedback_text": "Testing check endpoint"
        }
        
        submit_response = requests.post(f"{BASE_URL}/api/ratings/submit", json=rating_payload)
        assert submit_response.status_code == 200, f"Submit failed: {submit_response.text}"
        
        # Now check if rating exists
        check_response = requests.get(f"{BASE_URL}/api/ratings/check/{unique_appointment_id}")
        
        assert check_response.status_code == 200, f"Expected 200, got {check_response.status_code}"
        data = check_response.json()
        
        assert "rated" in data, "Response should have 'rated' key"
        assert data["rated"] == True, "Should be marked as rated"
        assert "rating_id" in data, "Should return rating_id"
        print(f"Rating confirmed: {data['rating_id']}")

    def test_check_rating_nonexistent(self):
        """GET /api/ratings/check/{appointment_id} should return rated=False for unrated appointment"""
        fake_appointment_id = f"APT-FAKE-{uuid.uuid4().hex[:8].upper()}"
        
        response = requests.get(f"{BASE_URL}/api/ratings/check/{fake_appointment_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "rated" in data, "Response should have 'rated' key"
        assert data["rated"] == False, "Should be marked as not rated"


class TestRatingsIntegration:
    """Integration tests for the complete rating flow"""

    def test_full_rating_flow(self):
        """Test complete flow: check pending → submit → verify no longer pending"""
        unique_appointment_id = f"APT-FLOW-{uuid.uuid4().hex[:8].upper()}"
        
        # Step 1: Check if unrated (should not exist in pending yet - this is for new appointments)
        check_response = requests.get(f"{BASE_URL}/api/ratings/check/{unique_appointment_id}")
        assert check_response.status_code == 200
        assert check_response.json()["rated"] == False, "New appointment should not be rated"
        
        # Step 2: Submit rating
        rating_payload = {
            "appointment_id": unique_appointment_id,
            "phone": TEST_PHONE,
            "billing_experience": 5,
            "staff_behaviour": 5,
            "clinic_experience": "good",
            "feedback_text": "Full flow test - excellent experience!"
        }
        
        submit_response = requests.post(f"{BASE_URL}/api/ratings/submit", json=rating_payload)
        assert submit_response.status_code == 200, f"Submit failed: {submit_response.text}"
        
        # Step 3: Verify rating exists
        verify_response = requests.get(f"{BASE_URL}/api/ratings/check/{unique_appointment_id}")
        assert verify_response.status_code == 200
        assert verify_response.json()["rated"] == True, "Should now be marked as rated"
        
        print("Full rating flow completed successfully!")


class TestRatingsClinicEndpoint:
    """Tests for GET /api/ratings/clinic/{clinic_name} (aggregate ratings)"""

    def test_get_clinic_ratings(self):
        """GET /api/ratings/clinic/{clinic_name} should return aggregated ratings"""
        response = requests.get(f"{BASE_URL}/api/ratings/clinic/Pushpa%20Clinic")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "avg_billing" in data, "Should have avg_billing"
        assert "avg_behaviour" in data, "Should have avg_behaviour"
        assert "good_pct" in data, "Should have good_pct"
        assert "total" in data, "Should have total count"
        
        print(f"Clinic ratings: avg_billing={data['avg_billing']}, avg_behaviour={data['avg_behaviour']}, good_pct={data['good_pct']}%, total={data['total']}")
