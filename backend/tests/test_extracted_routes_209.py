"""Test extracted routes from server.py modularization - iteration 209
Tests: Senova, Pharmacy Extended, Portal Features, Waitlist, Thrive360, Health Streak (P3)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ==================== HEALTH CHECK ====================

class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ Health check passed: {data}")


# ==================== STAFF LOGIN ====================

class TestStaffLogin:
    """Staff authentication tests"""
    
    def test_staff_login_valid_credentials(self):
        """Test staff login with staff_orange/test1234"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_orange",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "staff" in data, "No staff info in response"
        staff = data["staff"]
        assert staff.get("username") == "staff_orange" or "orange" in str(staff).lower()
        print(f"✓ Staff login successful: {staff.get('name', staff.get('username'))}")
        return data["token"]
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code in [401, 404, 400]
        print("✓ Invalid credentials correctly rejected")


# ==================== SENOVA ROUTES ====================

class TestSenovaRoutes:
    """Senova Senior Care API tests"""
    
    def test_get_profile_not_found(self):
        """GET /api/senova/profile/9999999999 returns profile not found"""
        response = requests.get(f"{BASE_URL}/api/senova/profile/9999999999")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False or data.get("message") == "Profile not found"
        print(f"✓ Senova profile not found response: {data}")
    
    def test_create_and_get_profile(self):
        """Test creating and retrieving senior profile"""
        test_phone = "TEST_9876543210"
        
        # Create profile
        create_response = requests.post(f"{BASE_URL}/api/senova/profile", json={
            "name": "Test Senior",
            "age": 65,
            "phone": test_phone,
            "address": "Test Address",
            "conditions": ["diabetes", "hypertension"]
        })
        assert create_response.status_code == 200
        assert create_response.json().get("success") == True
        
        # Get profile
        get_response = requests.get(f"{BASE_URL}/api/senova/profile/{test_phone}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("success") == True
        assert data.get("profile", {}).get("name") == "Test Senior"
        print(f"✓ Senova create/get profile works")


# ==================== PHARMACY EXTENDED ROUTES ====================

class TestPharmacyExtendedRoutes:
    """Pharmacy Extended API tests"""
    
    def test_express_fee_endpoint(self):
        """GET /api/pharmacy/express-fee returns express_fee=50"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/express-fee")
        assert response.status_code == 200
        data = response.json()
        assert data.get("express_fee") == 50
        assert data.get("estimated_time") == "2 hours"
        print(f"✓ Express fee endpoint: {data}")
    
    def test_refill_reminders_not_found(self):
        """GET /api/pharmacy/refill-reminders/9999999999 returns empty reminders"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/refill-reminders/9999999999")
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        assert isinstance(data["reminders"], list)
        print(f"✓ Refill reminders for non-existent user: {data}")
    
    def test_create_refill_reminder(self):
        """Test creating a refill reminder"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/refill-reminder", json={
            "patient_phone": "TEST_1234567890",
            "patient_name": "Test Patient",
            "medicine_name": "Metformin 500mg",
            "quantity_bought": 30,
            "doses_per_day": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "reminder_id" in data
        print(f"✓ Refill reminder created: {data['reminder_id']}")


# ==================== PORTAL FEATURES ROUTES ====================

class TestPortalFeaturesRoutes:
    """Portal Features API tests"""
    
    def test_membership_portal_form_submission(self):
        """POST /api/memberships/portal-form works with valid data"""
        response = requests.post(f"{BASE_URL}/api/memberships/portal-form", json={
            "name": "Test User",
            "phone": "TEST_9999988888",
            "email": "test@example.com",
            "age": 35,
            "gender": "male",
            "existing_conditions": "None",
            "plan_type": "evara_basic"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "profile_id" in data
        print(f"✓ Membership portal form submitted: {data}")
    
    def test_google_nudge_stats(self):
        """GET /api/review/google-nudge/stats returns stats object"""
        response = requests.get(f"{BASE_URL}/api/review/google-nudge/stats")
        assert response.status_code == 200
        data = response.json()
        assert "shown" in data
        assert "clicked" in data
        assert "click_rate" in data
        print(f"✓ Google nudge stats: {data}")


# ==================== HEALTH STREAK P3 ROUTES ====================

class TestHealthStreakRoutes:
    """Health Streak Leaderboard & Wellness Tips API tests (P3 features)"""
    
    def test_health_streak_leaderboard_all(self):
        """GET /api/health-streak/leaderboard/all returns leaderboard"""
        response = requests.get(f"{BASE_URL}/api/health-streak/leaderboard/all")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        assert data.get("portal") == "all"
        print(f"✓ Health streak leaderboard: {len(data['leaderboard'])} entries")
    
    def test_wellness_tips_user(self):
        """GET /api/wellness-tips/test-user returns wellness tips"""
        response = requests.get(f"{BASE_URL}/api/wellness-tips/test-user")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "tips" in data
        assert isinstance(data["tips"], list)
        assert len(data["tips"]) > 0, "Should have at least general tips"
        print(f"✓ Wellness tips: {len(data['tips'])} tips returned")
        # Verify tip structure
        for tip in data["tips"]:
            assert "category" in tip
            assert "tip" in tip


# ==================== THRIVE360 ROUTES ====================

class TestThrive360Routes:
    """Thrive360 Fitness API tests"""
    
    def test_book_fitness_session(self):
        """Test booking a fitness session"""
        response = requests.post(f"{BASE_URL}/api/thrive360/session", json={
            "program": "yoga",
            "session_type": "group",
            "preferred_date": "2026-01-20",
            "preferred_time": "08:00 AM",
            "user_phone": "TEST_5555555555",
            "user_name": "Test Fitness User"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "session_id" in data
        print(f"✓ Thrive360 session booked: {data['session_id']}")


# ==================== WAITLIST ROUTES ====================

class TestWaitlistRoutes:
    """Waitlist notification API tests"""
    
    def test_notify_waitlist_available(self):
        """Test waitlist notification endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/appointments/waitlist/notify-available", json={
            "doctor_id": "test-doctor-id",
            "available_date": "2026-01-20",
            "available_slot": "10:00 AM"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Waitlist notification: {data}")


# ==================== FRONTEND PAGES ====================

class TestFrontendPages:
    """Frontend page accessibility tests"""
    
    def test_homepage_loads(self):
        """Test homepage at / loads"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Homepage loads correctly")
    
    def test_staff_login_page(self):
        """Test /staff route loads"""
        response = requests.get(f"{BASE_URL}/staff")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Staff login page loads")
    
    def test_doctor_login_page(self):
        """Test /doctor-login route loads"""
        response = requests.get(f"{BASE_URL}/doctor-login")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Doctor login page loads")
    
    def test_pharmacy_page(self):
        """Test /pharmacy route loads"""
        response = requests.get(f"{BASE_URL}/pharmacy")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Pharmacy page loads")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
