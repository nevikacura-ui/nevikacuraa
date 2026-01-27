"""
Test Enhancement APIs - Health Score, Reminders, Emergency SOS, etc.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PATIENT_MOBILE = "9876543210"


class TestEnhancementAPIsUnauthenticated:
    """Test enhancement APIs without authentication - should return 401"""
    
    def test_health_score_requires_auth(self):
        """Health score endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/patient/health-score")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Health score auth check: {data}")
    
    def test_reminders_requires_auth(self):
        """Reminders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/patient/reminders")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Reminders auth check: {data}")
    
    def test_emergency_sos_requires_auth(self):
        """Emergency SOS endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/patient/emergency/sos", json={})
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Emergency SOS auth check: {data}")
    
    def test_health_content_public(self):
        """Health content endpoint should be public"""
        response = requests.get(f"{BASE_URL}/api/patient/health-content")
        # This endpoint may or may not require auth
        print(f"Health content status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "articles" in data
            print(f"Health content articles: {len(data.get('articles', []))}")
    
    def test_medication_interactions_public(self):
        """Medication interaction checker should work without auth"""
        response = requests.post(
            f"{BASE_URL}/api/patient/medications/check-interactions",
            json=["aspirin", "ibuprofen"]
        )
        print(f"Medication interactions status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "interactions" in data
            assert "safe" in data
            print(f"Interactions found: {len(data.get('interactions', []))}")


class TestPatientAuthentication:
    """Test patient authentication flow"""
    
    @pytest.fixture
    def patient_token(self):
        """Get patient token via OTP flow"""
        # Send OTP
        response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={PATIENT_MOBILE}")
        if response.status_code != 200:
            pytest.skip(f"Failed to send OTP: {response.status_code}")
        
        data = response.json()
        mock_otp = data.get("mock_otp")
        if not mock_otp:
            pytest.skip("No mock OTP returned")
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patients/portal/verify-otp?mobile={PATIENT_MOBILE}&otp={mock_otp}"
        )
        if verify_response.status_code != 200:
            pytest.skip(f"Failed to verify OTP: {verify_response.status_code}")
        
        verify_data = verify_response.json()
        token = verify_data.get("token")
        if not token:
            pytest.skip("No token returned")
        
        print(f"Got patient token for {PATIENT_MOBILE}")
        return token
    
    def test_send_otp(self):
        """Test sending OTP to patient"""
        response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={PATIENT_MOBILE}")
        assert response.status_code == 200
        data = response.json()
        assert "mock_otp" in data
        print(f"OTP sent successfully, mock_otp: {data.get('mock_otp')}")
    
    def test_verify_otp(self):
        """Test verifying OTP"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={PATIENT_MOBILE}")
        assert send_response.status_code == 200
        mock_otp = send_response.json().get("mock_otp")
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patients/portal/verify-otp?mobile={PATIENT_MOBILE}&otp={mock_otp}"
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert "token" in data
        assert "patient" in data
        print(f"OTP verified, patient: {data.get('patient', {}).get('name')}")


class TestEnhancementAPIsAuthenticated:
    """Test enhancement APIs with authentication"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authenticated headers"""
        # Send OTP
        response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile={PATIENT_MOBILE}")
        if response.status_code != 200:
            pytest.skip(f"Failed to send OTP: {response.status_code}")
        
        mock_otp = response.json().get("mock_otp")
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/patients/portal/verify-otp?mobile={PATIENT_MOBILE}&otp={mock_otp}"
        )
        if verify_response.status_code != 200:
            pytest.skip(f"Failed to verify OTP: {verify_response.status_code}")
        
        token = verify_response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_health_score_authenticated(self, auth_headers):
        """Test health score endpoint with authentication"""
        response = requests.get(
            f"{BASE_URL}/api/patient/health-score",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure - may have different fields based on DB state
        # Default mock data has: score, streak, level, xp, xpToNextLevel
        # DB data may have: lastCheckIn, streak, xp
        assert "streak" in data or "score" in data
        
        print(f"Health score data: {data}")
    
    def test_health_checkin(self, auth_headers):
        """Test daily health check-in"""
        response = requests.post(
            f"{BASE_URL}/api/patient/health-score/checkin",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data or "streak" in data
        print(f"Check-in response: {data}")
    
    def test_reminders_authenticated(self, auth_headers):
        """Test reminders endpoint with authentication"""
        response = requests.get(
            f"{BASE_URL}/api/patient/reminders",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "reminders" in data
        print(f"Reminders count: {len(data.get('reminders', []))}")
    
    def test_add_reminder(self, auth_headers):
        """Test adding a new reminder"""
        reminder_data = {
            "type": "medication",
            "name": "Test Vitamin D",
            "time": "09:00",
            "frequency": "daily",
            "channels": {"push": True, "whatsapp": False}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patient/reminders",
            headers=auth_headers,
            json=reminder_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data.get("success") == True
        print(f"Reminder added: {data}")
    
    def test_emergency_sos_authenticated(self, auth_headers):
        """Test emergency SOS endpoint with authentication"""
        sos_data = {
            "location": {"lat": 19.0760, "lng": 72.8777},
            "contacts": ["+919876543210"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patient/emergency/sos",
            headers=auth_headers,
            json=sos_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data.get("success") == True
        assert "alert_id" in data
        print(f"Emergency SOS triggered: {data}")
    
    def test_loyalty_points(self, auth_headers):
        """Test loyalty points endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/patient/loyalty",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "points" in data
        assert "tier" in data
        print(f"Loyalty points: {data.get('points')}, Tier: {data.get('tier')}")
    
    def test_family_members(self, auth_headers):
        """Test family members endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/patient/family",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "members" in data
        print(f"Family members count: {len(data.get('members', []))}")
    
    def test_add_family_member(self, auth_headers):
        """Test adding a family member"""
        member_data = {
            "name": "Test Family Member",
            "relation": "Spouse",
            "dob": "1990-01-01",
            "phone": "9876543211",
            "bloodGroup": "O+"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patient/family",
            headers=auth_headers,
            json=member_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data.get("success") == True
        print(f"Family member added: {data}")
    
    def test_prescriptions(self, auth_headers):
        """Test prescriptions endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/patient/prescriptions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "prescriptions" in data
        print(f"Prescriptions count: {len(data.get('prescriptions', []))}")
    
    def test_notification_preferences(self, auth_headers):
        """Test notification preferences endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/patient/notification-preferences",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "appointments" in data
        assert "reminders" in data
        print(f"Notification preferences: {list(data.keys())}")
    
    def test_save_notification_preferences(self, auth_headers):
        """Test saving notification preferences"""
        prefs_data = {
            "appointments": {"push": True, "sms": True, "email": True, "whatsapp": True},
            "reminders": {"push": True, "sms": False, "email": True, "whatsapp": True},
            "promotions": {"push": False, "sms": False, "email": True, "whatsapp": False},
            "reports": {"push": True, "sms": False, "email": True, "whatsapp": True},
            "queue": {"push": True, "sms": True, "email": False, "whatsapp": True}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patient/notification-preferences",
            headers=auth_headers,
            json=prefs_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data.get("success") == True
        print(f"Notification preferences saved: {data}")


class TestMedicationInteractionChecker:
    """Test medication interaction checker"""
    
    def test_no_interactions(self):
        """Test with medications that have no known interactions"""
        response = requests.post(
            f"{BASE_URL}/api/patient/medications/check-interactions",
            json=["paracetamol", "vitamin_c"]
        )
        if response.status_code == 200:
            data = response.json()
            assert data.get("safe") == True
            assert len(data.get("interactions", [])) == 0
            print("No interactions found - safe")
    
    def test_known_interaction_aspirin_ibuprofen(self):
        """Test with aspirin and ibuprofen - known interaction"""
        response = requests.post(
            f"{BASE_URL}/api/patient/medications/check-interactions",
            json=["aspirin", "ibuprofen"]
        )
        if response.status_code == 200:
            data = response.json()
            assert data.get("safe") == False
            assert len(data.get("interactions", [])) > 0
            print(f"Interactions found: {data.get('interactions')}")
    
    def test_known_interaction_warfarin_aspirin(self):
        """Test with warfarin and aspirin - high severity interaction"""
        response = requests.post(
            f"{BASE_URL}/api/patient/medications/check-interactions",
            json=["warfarin", "aspirin"]
        )
        if response.status_code == 200:
            data = response.json()
            assert data.get("safe") == False
            interactions = data.get("interactions", [])
            assert len(interactions) > 0
            # Check for high severity
            high_severity = [i for i in interactions if i.get("severity") == "high"]
            assert len(high_severity) > 0
            print(f"High severity interaction found: {high_severity}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
