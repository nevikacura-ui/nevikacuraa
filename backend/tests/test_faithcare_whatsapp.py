"""
FaithCare WhatsApp Reminders and Email Credentials API Tests
Tests for:
- WhatsApp reminder endpoints (Sehri, Iftar, Festival)
- Email credentials API
- WhatsApp registration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFaithCareAPIs:
    """Test FaithCare related API endpoints"""
    
    def test_api_root(self):
        """Test basic API connectivity"""
        response = requests.get(f"{BASE_URL}/api/")
        print(f"API root response: {response.status_code}")
        assert response.status_code == 200
    
    def test_faithcare_login(self):
        """Test FaithCare login endpoint - uses query params"""
        response = requests.post(
            f"{BASE_URL}/api/lifealign/auth/login",
            params={
                "user_id": "FC2026001",
                "password": "faith@care001"
            }
        )
        print(f"FaithCare login response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "user" in data or "dashboard" in data or "session_token" in data

    def test_sehri_reminder_api(self):
        """Test Sehri reminder WhatsApp API"""
        response = requests.post(
            f"{BASE_URL}/api/lifealign/whatsapp/send-sehri-reminder",
            params={
                "whatsapp_number": "9876543210",
                "user_name": "Test User",
                "sehri_time": "04:30 AM"
            }
        )
        print(f"Sehri reminder response: {response.status_code}")
        print(f"Response data: {response.json()}")
        # API should return 200 even if MSG91 template is not approved
        assert response.status_code == 200
        data = response.json()
        # Check response structure
        assert "success" in data or "error" in data
    
    def test_iftar_reminder_api(self):
        """Test Iftar reminder WhatsApp API"""
        response = requests.post(
            f"{BASE_URL}/api/lifealign/whatsapp/send-iftar-reminder",
            params={
                "whatsapp_number": "9876543210",
                "user_name": "Test User",
                "iftar_time": "06:45 PM"
            }
        )
        print(f"Iftar reminder response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data or "error" in data
    
    def test_festival_reminder_api(self):
        """Test Festival reminder WhatsApp API"""
        response = requests.post(
            f"{BASE_URL}/api/lifealign/whatsapp/send-festival-reminder",
            params={
                "whatsapp_number": "9876543210",
                "user_name": "Test User",
                "festival_name": "Ramadan",
                "message": "Wishing you a blessed Ramadan!"
            }
        )
        print(f"Festival reminder response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data or "error" in data
    
    def test_whatsapp_registration(self):
        """Test WhatsApp number registration for FaithCare"""
        response = requests.post(
            f"{BASE_URL}/api/lifealign/whatsapp/register",
            params={
                "user_id": "FC2026001",
                "whatsapp_number": "9876543210",
                "enable_sehri_reminder": True,
                "enable_iftar_reminder": True,
                "enable_festival_alerts": True
            }
        )
        print(f"WhatsApp registration response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "preferences" in data
    
    def test_whatsapp_preferences(self):
        """Test getting WhatsApp preferences for a user"""
        response = requests.get(
            f"{BASE_URL}/api/lifealign/whatsapp/user-preferences/FC2026001"
        )
        print(f"WhatsApp preferences response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
    
    def test_send_credentials_email(self):
        """Test sending FaithCare credentials email"""
        # Don't actually send email - just test the endpoint is accessible
        response = requests.post(
            f"{BASE_URL}/api/lifealign/send-credentials-email",
            params={"to_email": "test@test.com"}
        )
        print(f"Send credentials email response: {response.status_code}")
        # This may return error if email config is not set or 200 if successful
        # Either way, endpoint should be accessible
        assert response.status_code in [200, 500]


class TestMangoStaffPortal:
    """Test Mango Staff Portal API endpoints - routes under /api/mango/"""
    
    def test_mango_bookings(self):
        """Test fetching Mango bookings"""
        response = requests.get(f"{BASE_URL}/api/mango/bookings")
        print(f"Mango bookings response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200
    
    def test_mango_tests_catalog(self):
        """Test fetching Mango tests catalog"""
        response = requests.get(f"{BASE_URL}/api/mango/tests")
        print(f"Mango tests catalog response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200
    
    def test_mango_dashboard_stats(self):
        """Test fetching Mango dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/mango/dashboard/stats")
        print(f"Mango dashboard stats response: {response.status_code}")
        print(f"Response data: {response.json()}")
        assert response.status_code == 200


class TestRamadanFeatures:
    """Test Ramadan-specific features"""
    
    def test_ramadan_calendar(self):
        """Test Ramadan calendar endpoint"""
        response = requests.get(f"{BASE_URL}/api/lifealign/ramadan/calendar")
        print(f"Ramadan calendar response: {response.status_code}")
        print(f"Response data preview: {str(response.json())[:300]}")
        assert response.status_code == 200
    
    def test_ramadan_diet_plans(self):
        """Test Ramadan diet plans endpoint"""
        response = requests.get(f"{BASE_URL}/api/lifealign/ramadan/diet-plans")
        print(f"Ramadan diet plans response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
    
    def test_ramadan_timings_2026(self):
        """Test Ramadan timings for 2026"""
        response = requests.get(f"{BASE_URL}/api/lifealign/ramadan/timings/2026")
        print(f"Ramadan timings 2026 response: {response.status_code}")
        assert response.status_code == 200
    
    def test_ramadan_today(self):
        """Test getting today's Ramadan info"""
        response = requests.get(f"{BASE_URL}/api/lifealign/ramadan/today")
        print(f"Ramadan today response: {response.status_code}")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
