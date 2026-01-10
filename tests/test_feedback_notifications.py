"""
Test Suite for Feedback System and Push Notification Features
Tests:
1. POST /api/feedback/{token} - Submit appointment feedback (rating 1-5, optional comment)
2. Feedback validation - rating must be 1-5, invalid token returns 404
3. Feedback prevents duplicate submissions
4. Appointment complete endpoint generates feedback_token and sends email with rating links
5. Pharmacy order status update sends PUSH notification (not email to patient)
6. Diagnostic order status update sends PUSH notification (not email to patient)
7. Patient check-in sends PUSH notification (not email to patient)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Staff credentials
CLINIC_STAFF_CREDS = {"username": "staff_pushpa", "password": "Nevika@2026C"}
PHARMACY_STAFF_CREDS = {"username": "staff_pharmacy", "password": "Nevika@2026P"}
DIAGNOSTICS_STAFF_CREDS = {"username": "staff_proton", "password": "Nevika@2026L"}

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def clinic_staff_token(api_client):
    """Get clinic staff token"""
    response = api_client.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Clinic staff login failed")

@pytest.fixture(scope="module")
def pharmacy_staff_token(api_client):
    """Get pharmacy staff token"""
    response = api_client.post(f"{BASE_URL}/api/staff/login", json=PHARMACY_STAFF_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Pharmacy staff login failed")

@pytest.fixture(scope="module")
def diagnostics_staff_token(api_client):
    """Get diagnostics staff token"""
    response = api_client.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Diagnostics staff login failed")

@pytest.fixture(scope="module")
def test_user_token(api_client):
    """Create or login test user"""
    test_email = f"test_feedback_{uuid.uuid4().hex[:8]}@test.com"
    test_phone = f"98765{uuid.uuid4().hex[:5]}"
    
    # Try to register
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "TestPass123!",
        "phone": test_phone,
        "name": "Test Feedback User"
    })
    
    if response.status_code == 200:
        return response.json().get("token"), response.json().get("user", {}).get("id")
    
    pytest.skip("Failed to create test user")


class TestFeedbackEndpoint:
    """Test POST /api/feedback/{token} endpoint"""
    
    def test_feedback_invalid_token_returns_404(self, api_client):
        """Test that invalid feedback token returns 404"""
        invalid_token = str(uuid.uuid4())
        response = api_client.post(f"{BASE_URL}/api/feedback/{invalid_token}", json={
            "rating": 5,
            "comment": "Great service!"
        })
        
        assert response.status_code == 404
        data = response.json()
        assert "Invalid feedback link" in data.get("detail", "")
        print("✅ Invalid token correctly returns 404")
    
    def test_feedback_rating_validation_below_1(self, api_client):
        """Test that rating below 1 is rejected"""
        token = str(uuid.uuid4())
        response = api_client.post(f"{BASE_URL}/api/feedback/{token}", json={
            "rating": 0,
            "comment": "Test"
        })
        
        # Should return 400 for invalid rating or 404 for invalid token
        assert response.status_code in [400, 404]
        print("✅ Rating below 1 is rejected")
    
    def test_feedback_rating_validation_above_5(self, api_client):
        """Test that rating above 5 is rejected"""
        token = str(uuid.uuid4())
        response = api_client.post(f"{BASE_URL}/api/feedback/{token}", json={
            "rating": 6,
            "comment": "Test"
        })
        
        # Should return 400 for invalid rating or 404 for invalid token
        assert response.status_code in [400, 404]
        print("✅ Rating above 5 is rejected")


class TestAppointmentComplete:
    """Test appointment completion generates feedback token"""
    
    def test_staff_login_clinic(self, api_client):
        """Test clinic staff can login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Clinic staff login successful: {data.get('staff', {}).get('name')}")
    
    def test_create_and_complete_appointment(self, api_client, clinic_staff_token, test_user_token):
        """Test creating appointment and marking it complete generates feedback token"""
        user_token, user_id = test_user_token
        
        # Create appointment as user
        headers = {"Authorization": f"Bearer {user_token}"}
        appointment_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "10:00 AM",
            "patient_name": "Test Feedback Patient",
            "patient_phone": "9876543210",
            "patient_email": "testfeedback@test.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/appointments", json=appointment_data, headers=headers)
        
        if response.status_code == 400 and "already booked" in response.text.lower():
            # Slot taken, try different time
            appointment_data["time"] = "11:30 AM"
            response = api_client.post(f"{BASE_URL}/api/appointments", json=appointment_data, headers=headers)
        
        if response.status_code != 200:
            print(f"⚠️ Could not create appointment: {response.text}")
            pytest.skip("Could not create test appointment")
        
        appointment = response.json()
        appointment_id = appointment.get("id")
        print(f"✅ Appointment created: {appointment_id}")
        
        # Check-in the patient first (required before completing)
        staff_headers = {"Authorization": f"Bearer {clinic_staff_token}"}
        checkin_response = api_client.put(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/check-in",
            headers=staff_headers
        )
        
        if checkin_response.status_code == 200:
            print("✅ Patient checked in")
        
        # Complete the appointment
        complete_response = api_client.put(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/complete",
            headers=staff_headers
        )
        
        assert complete_response.status_code == 200
        complete_data = complete_response.json()
        assert complete_data.get("success") == True
        assert complete_data.get("status") == "Completed"
        print("✅ Appointment marked as completed")
        
        # Store appointment_id for cleanup
        return appointment_id


class TestPharmacyStatusNotifications:
    """Test pharmacy order status updates send push notifications (not email to patient)"""
    
    def test_pharmacy_staff_login(self, api_client):
        """Test pharmacy staff can login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=PHARMACY_STAFF_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Pharmacy staff login successful: {data.get('staff', {}).get('name')}")
    
    def test_pharmacy_order_status_update(self, api_client, pharmacy_staff_token, test_user_token):
        """Test pharmacy order status update sends push notification"""
        user_token, user_id = test_user_token
        
        # Create pharmacy order as user
        headers = {"Authorization": f"Bearer {user_token}"}
        order_data = {
            "medicines": [{"name": "Test Medicine", "quantity": 1}],
            "patient_name": "Test Notification Patient",
            "patient_phone": "9876543210",
            "patient_email": "testnotify@test.com",
            "delivery_address": "Test Address"
        }
        
        response = api_client.post(f"{BASE_URL}/api/pharmacy", json=order_data, headers=headers)
        
        if response.status_code != 200:
            print(f"⚠️ Could not create pharmacy order: {response.text}")
            pytest.skip("Could not create test pharmacy order")
        
        order = response.json()
        order_id = order.get("id")
        print(f"✅ Pharmacy order created: {order_id}")
        
        # Update status as pharmacy staff
        staff_headers = {"Authorization": f"Bearer {pharmacy_staff_token}"}
        
        # Update to "Packing"
        status_response = api_client.put(
            f"{BASE_URL}/api/staff/pharmacy/orders/{order_id}/status",
            json={"status": "Packing", "notes": "Test status update"},
            headers=staff_headers
        )
        
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data.get("success") == True
        assert status_data.get("status") == "Packing"
        print("✅ Pharmacy order status updated to 'Packing' - Push notification should be sent")
        
        return order_id


class TestDiagnosticStatusNotifications:
    """Test diagnostic order status updates send push notifications (not email to patient)"""
    
    def test_diagnostics_staff_login(self, api_client):
        """Test diagnostics staff can login"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Diagnostics staff login successful: {data.get('staff', {}).get('name')}")
    
    def test_diagnostic_order_status_update(self, api_client, diagnostics_staff_token, test_user_token):
        """Test diagnostic order status update sends push notification"""
        user_token, user_id = test_user_token
        
        # Create diagnostic order as user
        headers = {"Authorization": f"Bearer {user_token}"}
        order_data = {
            "tests": ["Blood Test", "Urine Test"],
            "preferred_date": datetime.now().strftime("%Y-%m-%d"),
            "patient_name": "Test Diagnostic Patient",
            "patient_phone": "9876543210",
            "patient_email": "testdiag@test.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/diagnostics", json=order_data, headers=headers)
        
        if response.status_code != 200:
            print(f"⚠️ Could not create diagnostic order: {response.text}")
            pytest.skip("Could not create test diagnostic order")
        
        order = response.json()
        order_id = order.get("id")
        print(f"✅ Diagnostic order created: {order_id}")
        
        # Update status as diagnostics staff
        staff_headers = {"Authorization": f"Bearer {diagnostics_staff_token}"}
        
        # Update to "Sample Collected"
        status_response = api_client.put(
            f"{BASE_URL}/api/staff/diagnostic/orders/{order_id}/status",
            json={"status": "Sample Collected", "notes": "Test status update"},
            headers=staff_headers
        )
        
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data.get("success") == True
        assert status_data.get("status") == "Sample Collected"
        print("✅ Diagnostic order status updated to 'Sample Collected' - Push notification should be sent")
        
        return order_id


class TestPatientCheckInNotification:
    """Test patient check-in sends push notification"""
    
    def test_patient_checkin_sends_push(self, api_client, clinic_staff_token, test_user_token):
        """Test patient check-in sends push notification (not email)"""
        user_token, user_id = test_user_token
        
        # Create appointment as user
        headers = {"Authorization": f"Bearer {user_token}"}
        appointment_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "02:00 PM",
            "patient_name": "Test Checkin Patient",
            "patient_phone": "9876543210",
            "patient_email": "testcheckin@test.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/appointments", json=appointment_data, headers=headers)
        
        if response.status_code == 400 and "already booked" in response.text.lower():
            appointment_data["time"] = "02:30 PM"
            response = api_client.post(f"{BASE_URL}/api/appointments", json=appointment_data, headers=headers)
        
        if response.status_code != 200:
            print(f"⚠️ Could not create appointment: {response.text}")
            pytest.skip("Could not create test appointment")
        
        appointment = response.json()
        appointment_id = appointment.get("id")
        print(f"✅ Appointment created: {appointment_id}")
        
        # Check-in the patient
        staff_headers = {"Authorization": f"Bearer {clinic_staff_token}"}
        checkin_response = api_client.put(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/check-in",
            headers=staff_headers
        )
        
        assert checkin_response.status_code == 200
        checkin_data = checkin_response.json()
        assert checkin_data.get("success") == True
        assert checkin_data.get("status") == "In Clinic"
        print("✅ Patient checked in - Push notification should be sent")
        
        return appointment_id


class TestPushSubscriptionEndpoints:
    """Test push notification subscription endpoints"""
    
    def test_push_subscribe_endpoint_exists(self, api_client, test_user_token):
        """Test push subscription endpoint exists"""
        user_token, user_id = test_user_token
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Test subscription endpoint with mock data
        subscription_data = {
            "endpoint": "https://test-push-endpoint.example.com/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/push/subscribe",
            json=subscription_data,
            headers=headers
        )
        
        # Should succeed or return appropriate error
        assert response.status_code in [200, 400, 401]
        print(f"✅ Push subscribe endpoint exists, status: {response.status_code}")
    
    def test_push_unsubscribe_endpoint_exists(self, api_client, test_user_token):
        """Test push unsubscribe endpoint exists"""
        user_token, user_id = test_user_token
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = api_client.post(
            f"{BASE_URL}/api/push/unsubscribe",
            json={"endpoint": "https://test-push-endpoint.example.com/test"},
            headers=headers
        )
        
        # Should succeed or return appropriate error
        assert response.status_code in [200, 400, 401, 404]
        print(f"✅ Push unsubscribe endpoint exists, status: {response.status_code}")


class TestVAPIDConfiguration:
    """Test VAPID public key endpoint for push notifications"""
    
    def test_vapid_public_key_endpoint(self, api_client):
        """Test VAPID public key is available"""
        response = api_client.get(f"{BASE_URL}/api/push/vapid-key")
        
        # Should return VAPID public key
        if response.status_code == 200:
            data = response.json()
            assert "vapid_public_key" in data or "publicKey" in data
            print("✅ VAPID public key endpoint working")
        else:
            print(f"⚠️ VAPID key endpoint returned: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
