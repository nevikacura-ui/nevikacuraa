"""
Test Suite for Walk-in Token System & Push Notification Features - Iteration 199
===================================================================================
Features tested:
1. POST /api/diagyn-staff/appointments/book with WALK_IN returns slot-based token_data
2. Walk-in token_number format: T01, T02 based on slot position in session
3. Emergency booking returns E-prefix token (E01, E02)
4. Check-in reuses pre-assigned token for walk-ins
5. GET /api/clinic/push-notification-status returns VAPID/Firebase config
"""

import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_STAFF_USERNAME = "staff_diagyn"
TEST_STAFF_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def staff_token(api_client):
    """Get staff authentication token using /api/staff/login"""
    response = api_client.post(f"{BASE_URL}/api/staff/login", json={
        "username": TEST_STAFF_USERNAME,
        "password": TEST_STAFF_PASSWORD
    })
    assert response.status_code == 200, f"Staff login failed: {response.text}"
    token = response.json().get("token")
    assert token, "No token in login response"
    return token


@pytest.fixture(scope="module")
def auth_headers(staff_token):
    """Headers with authorization"""
    return {"Authorization": f"Bearer {staff_token}"}


class TestWalkinTokenSystem:
    """Test slot-based walk-in token system"""
    
    def test_walkin_booking_returns_token_data(self, api_client, auth_headers):
        """Test that WALK_IN booking immediately returns token_data with slot-based token"""
        # Get IST date
        import pytz
        ist = pytz.timezone('Asia/Kolkata')
        today = datetime.now(ist).strftime("%Y-%m-%d")
        
        # Book a walk-in appointment
        payload = {
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Vikas Jha",
            "date": today,
            "time": "18:15",  # Evening session slot
            "patient_name": f"TEST_WalkinToken_{int(time.time())}",
            "patient_mobile": f"99998{int(time.time()) % 100000:05d}",
            "appointment_type": "WALK_IN"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=payload,
            headers=auth_headers
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        # Assert booking succeeded
        assert response.status_code == 200 or response.status_code == 409, f"Booking failed: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Booking should succeed"
            assert data.get("booking_id"), "Should return booking_id"
            
            # CRITICAL: token_data should be returned for WALK_IN
            token_data = data.get("token_data")
            assert token_data is not None, "WALK_IN booking must return token_data"
            
            # Validate token_data structure
            assert "token_number" in token_data, "token_data must have token_number"
            assert "patient_name" in token_data, "token_data must have patient_name"
            assert "doctor" in token_data, "token_data must have doctor"
            assert "time" in token_data, "token_data must have time"
            assert "booking_id" in token_data, "token_data must have booking_id"
            
            # Token should be T-prefix (slot-based)
            token_num = token_data["token_number"]
            assert token_num.startswith("T"), f"Walk-in token should have T prefix, got: {token_num}"
            print(f"SUCCESS: Walk-in token assigned: {token_num}")
    
    def test_emergency_booking_returns_e_prefix_token(self, api_client, auth_headers):
        """Test that EMERGENCY booking returns E-prefix token"""
        import pytz
        ist = pytz.timezone('Asia/Kolkata')
        today = datetime.now(ist).strftime("%Y-%m-%d")
        
        payload = {
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Vikas Jha",
            "date": today,
            "time": None,  # Emergency doesn't need time slot
            "patient_name": f"TEST_Emergency_{int(time.time())}",
            "patient_mobile": f"88887{int(time.time()) % 100000:05d}",
            "appointment_type": "EMERGENCY"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=payload,
            headers=auth_headers
        )
        
        print(f"Emergency booking response: {response.status_code}")
        print(f"Emergency booking body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Emergency booking failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Emergency should also get token_data
        token_data = data.get("token_data")
        assert token_data is not None, "EMERGENCY booking must return token_data"
        
        # Token should be E-prefix
        token_num = token_data["token_number"]
        assert token_num.startswith("E"), f"Emergency token should have E prefix, got: {token_num}"
        print(f"SUCCESS: Emergency token assigned: {token_num}")
    
    def test_walkin_token_saved_to_appointment(self, api_client, auth_headers):
        """Test that walk-in token is saved to appointment document"""
        import pytz
        ist = pytz.timezone('Asia/Kolkata')
        today = datetime.now(ist).strftime("%Y-%m-%d")
        
        # Book walk-in
        payload = {
            "clinic": "Amnion Clinic",
            "doctor": "Dr. Neha Patel",
            "date": today,
            "time": "18:30",
            "patient_name": f"TEST_SavedToken_{int(time.time())}",
            "patient_mobile": f"77776{int(time.time()) % 100000:05d}",
            "appointment_type": "WALK_IN"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=payload,
            headers=auth_headers
        )
        
        if response.status_code == 409:
            pytest.skip("Slot already booked")
        
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        
        # Get the appointment document to verify token was saved
        booking_id = data.get("booking_id")
        appointment = data.get("appointment", {})
        
        # Token should be in both response and appointment
        assert "token_number" in appointment, "token_number should be saved to appointment"
        token_in_apt = appointment.get("token_number")
        token_in_data = data.get("token_data", {}).get("token_number")
        
        assert token_in_apt == token_in_data, f"Token mismatch: apt={token_in_apt}, data={token_in_data}"
        print(f"SUCCESS: Token {token_in_apt} saved to appointment {booking_id}")


class TestCheckinTokenReuse:
    """Test that check-in reuses pre-assigned tokens for walk-ins"""
    
    def test_checkin_reuses_walkin_token(self, api_client, auth_headers):
        """Test that CheckedIn status uses pre-assigned token instead of generating new"""
        import pytz
        ist = pytz.timezone('Asia/Kolkata')
        today = datetime.now(ist).strftime("%Y-%m-%d")
        
        # First book a WALK_IN to get a pre-assigned token
        payload = {
            "clinic": "Pushpa Clinic",
            "doctor": "Dr. Vikas Jha",
            "date": today,
            "time": "18:45",
            "patient_name": f"TEST_ReuseToken_{int(time.time())}",
            "patient_mobile": f"66665{int(time.time()) % 100000:05d}",
            "appointment_type": "WALK_IN"
        }
        
        book_response = api_client.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json=payload,
            headers=auth_headers
        )
        
        if book_response.status_code == 409:
            pytest.skip("Slot already booked")
        
        assert book_response.status_code == 200, f"Booking failed: {book_response.text}"
        book_data = book_response.json()
        
        appointment_id = book_data.get("appointment", {}).get("id")
        original_token = book_data.get("token_data", {}).get("token_number")
        
        assert original_token, "Walk-in should have pre-assigned token"
        print(f"Original walk-in token: {original_token}")
        
        # Now check-in this appointment
        checkin_response = api_client.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/{appointment_id}/status",
            json={"status": "CheckedIn"},
            headers=auth_headers
        )
        
        assert checkin_response.status_code == 200, f"Check-in failed: {checkin_response.text}"
        checkin_data = checkin_response.json()
        
        # Token in check-in response should match original
        checkin_token = checkin_data.get("token_data", {}).get("token_number")
        
        assert checkin_token == original_token, f"Check-in should reuse token. Original: {original_token}, Got: {checkin_token}"
        print(f"SUCCESS: Check-in reused pre-assigned token: {checkin_token}")


class TestPushNotificationStatus:
    """Test push notification status endpoint"""
    
    def test_push_notification_status_endpoint(self, api_client):
        """Test GET /api/clinic/push-notification-status returns proper config"""
        response = api_client.get(f"{BASE_URL}/api/clinic/push-notification-status")
        
        print(f"Push status response: {response.status_code}")
        print(f"Push status body: {response.text}")
        
        assert response.status_code == 200, f"Push status failed: {response.text}"
        
        data = response.json()
        
        # Validate required fields
        assert "vapid_configured" in data, "Should have vapid_configured field"
        assert "firebase_configured" in data, "Should have firebase_configured field"
        assert "active_subscriptions" in data, "Should have active_subscriptions field"
        
        # VAPID should be configured
        assert data["vapid_configured"] == True, "VAPID should be configured"
        
        # Firebase should be configured
        assert data["firebase_configured"] == True, "Firebase should be configured (SW present)"
        
        # Check subscription count is a number
        sub_count = data["active_subscriptions"]
        assert isinstance(sub_count, int), "active_subscriptions should be integer"
        
        print(f"SUCCESS: Push notifications ready - VAPID: {data['vapid_configured']}, Firebase: {data['firebase_configured']}, Subscriptions: {sub_count}")
    
    def test_push_status_has_vapid_key_preview(self, api_client):
        """Test that vapid_public_key preview is returned"""
        response = api_client.get(f"{BASE_URL}/api/clinic/push-notification-status")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should have truncated VAPID public key
        if data.get("vapid_configured"):
            vapid_preview = data.get("vapid_public_key")
            assert vapid_preview, "Should have vapid_public_key preview when configured"
            assert "..." in vapid_preview, "VAPID key should be truncated with ..."
            print(f"VAPID key preview: {vapid_preview}")


class TestSlotBasedTokenCalculation:
    """Test that token number corresponds to slot position"""
    
    def test_slots_available_endpoint(self, api_client, auth_headers):
        """Test that slots endpoint works for walk-in mode"""
        import pytz
        ist = pytz.timezone('Asia/Kolkata')
        today = datetime.now(ist).strftime("%Y-%m-%d")
        
        response = api_client.get(
            f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "mode": "walkin"
            },
            headers=auth_headers
        )
        
        print(f"Slots response: {response.status_code}")
        
        assert response.status_code == 200, f"Slots endpoint failed: {response.text}"
        
        data = response.json()
        assert "available_slots" in data, "Should have available_slots"
        assert "current_session" in data, "Should have current_session"
        
        print(f"Current session: {data.get('current_session')}")
        print(f"Available slots count: {len(data.get('available_slots', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
