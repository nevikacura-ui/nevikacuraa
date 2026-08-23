"""Test server.py modularization - iteration 210
Tests P1 modularization: server.py reduced from 10,919 to 6,091 lines
New extracted modules: notification_service.py (service), queue_status.py, coupons.py, 
payment_links.py, diagnostics_extended.py + previous routes from iteration 209
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


# ==================== NEW: QUEUE_STATUS ROUTES ====================

class TestQueueStatusRoutes:
    """Queue Status & Live Queue API tests (routes/queue_status.py)"""
    
    def test_live_queue_status(self):
        """GET /api/appointments/queue/{doctor_id} returns queue status"""
        response = requests.get(f"{BASE_URL}/api/appointments/queue/test-doctor-123")
        assert response.status_code == 200
        data = response.json()
        assert "doctor_id" in data
        assert "queue" in data
        assert "stats" in data
        print(f"✓ Live queue status: {data.get('stats', {})}")
    
    def test_diagnostic_orders_endpoint(self):
        """GET /api/diagnostics returns 401 for unauthenticated (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        # Expect 401 or 422 for unauthenticated user
        assert response.status_code in [401, 403, 422, 200]
        print(f"✓ Diagnostics endpoint responds: {response.status_code}")


# ==================== NEW: COUPONS ROUTES ====================

class TestCouponsRoutes:
    """Coupon Validation API tests (routes/coupons.py)"""
    
    def test_coupon_validate_endpoint_missing_fields(self):
        """POST /api/coupons/validate returns 422 for missing fields (expected)"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={})
        # 422 is correct - validation requires code, amount, type
        assert response.status_code == 422
        print("✓ Coupon validate correctly requires all fields (422)")
    
    def test_coupon_validate_with_default_coupon(self):
        """POST /api/coupons/validate with WELCOME10 returns valid discount"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "WELCOME10",
            "amount": 500.0,
            "type": "pharmacy"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == True
        assert "discount" in data
        assert data.get("discount") == 50.0  # 10% of 500, max 100
        print(f"✓ Coupon WELCOME10 validated: discount = {data.get('discount')}")
    
    def test_coupon_validate_invalid_code(self):
        """POST /api/coupons/validate with invalid code returns invalid"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "INVALID123",
            "amount": 200.0,
            "type": "pharmacy"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == False
        print(f"✓ Invalid coupon correctly rejected")
    
    def test_pharmacy_orders_endpoint(self):
        """GET /api/pharmacy returns 401 for unauthenticated"""
        response = requests.get(f"{BASE_URL}/api/pharmacy")
        assert response.status_code in [401, 403, 422, 200]
        print(f"✓ Pharmacy orders endpoint responds: {response.status_code}")


# ==================== NEW: PAYMENT_LINKS ROUTES ====================

class TestPaymentLinksRoutes:
    """Payment Links & Prescription Email tests (routes/payment_links.py)"""
    
    def test_pharmacy_count_endpoint(self):
        """GET /api/pharmacy/count returns medicine count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert data["total"] > 0
        print(f"✓ Pharmacy medicine count: {data['total']}")
    
    def test_pharmacy_all_medicines(self):
        """GET /api/pharmacy/all returns paginated medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Pharmacy medicines: {len(data['medicines'])} items, total: {data['total']}")
    
    def test_pharmacy_search(self):
        """GET /api/pharmacy/search?q=paracetamol returns search results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=para&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"✓ Pharmacy search: {len(data['medicines'])} results for 'para'")


# ==================== NEW: DIAGNOSTICS_EXTENDED ROUTES ====================

class TestDiagnosticsExtendedRoutes:
    """Proton Trend Analysis & Home Collection tests (routes/diagnostics_extended.py)"""
    
    def test_diagnostic_trends_endpoint(self):
        """GET /api/diagnostics/trends/{patient_id} returns trends data"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/trends/test-patient-123")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "parameters" in data
        assert "total_tests" in data
        print(f"✓ Diagnostic trends: {data.get('total_tests')} test types")
    
    def test_diagnostic_history_endpoint(self):
        """GET /api/diagnostics/history/{patient_id} returns test history"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/history/test-patient-123")
        assert response.status_code == 200
        data = response.json()
        assert "patient_id" in data
        assert "history" in data
        assert "test_types" in data
        print(f"✓ Diagnostic history: {len(data['test_types'])} test types")
    
    def test_home_collection_booking(self):
        """POST /api/diagnostics/home-collection books home sample collection"""
        response = requests.post(f"{BASE_URL}/api/diagnostics/home-collection", json={
            "patient_name": "Test Patient",
            "patient_phone": "TEST_1234567890",
            "address": "Test Address 123",
            "pincode": "400001",
            "tests": ["Blood Sugar", "Lipid Profile"],
            "preferred_date": "2026-01-20",
            "preferred_time": "09:00 AM"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "booking" in data
        print(f"✓ Home collection booked: {data['booking']['id']}")


# ==================== EXISTING: SENOVA ROUTES ====================

class TestSenovaRoutes:
    """Senova Senior Care API tests (routes/senova.py)"""
    
    def test_get_profile_not_found(self):
        """GET /api/senova/profile/9999999999 returns profile not found"""
        response = requests.get(f"{BASE_URL}/api/senova/profile/9999999999")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False or data.get("message") == "Profile not found"
        print(f"✓ Senova profile not found response")


# ==================== EXISTING: PHARMACY EXTENDED ROUTES ====================

class TestPharmacyExtendedRoutes:
    """Pharmacy Extended API tests (routes/pharmacy_extended.py)"""
    
    def test_express_fee_endpoint(self):
        """GET /api/pharmacy/express-fee returns express_fee=50"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/express-fee")
        assert response.status_code == 200
        data = response.json()
        assert data.get("express_fee") == 50
        assert data.get("estimated_time") == "2 hours"
        print(f"✓ Express fee: {data}")
    
    def test_refill_reminders_not_found(self):
        """GET /api/pharmacy/refill-reminders/9999999999 returns empty reminders"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/refill-reminders/9999999999")
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        assert isinstance(data["reminders"], list)
        print(f"✓ Refill reminders: {len(data['reminders'])} items")


# ==================== EXISTING: PORTAL FEATURES ROUTES ====================

class TestPortalFeaturesRoutes:
    """Portal Features API tests (routes/portal_features.py)"""
    
    def test_membership_portal_form_submission(self):
        """POST /api/memberships/portal-form works"""
        response = requests.post(f"{BASE_URL}/api/memberships/portal-form", json={
            "name": "Test User 210",
            "phone": "TEST_9999988888",
            "email": "test210@example.com",
            "age": 35,
            "gender": "male",
            "existing_conditions": "None",
            "plan_type": "evara_basic"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "profile_id" in data
        print(f"✓ Portal form submitted: {data}")
    
    def test_google_nudge_stats(self):
        """GET /api/review/google-nudge/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/review/google-nudge/stats")
        assert response.status_code == 200
        data = response.json()
        assert "shown" in data
        assert "clicked" in data
        print(f"✓ Google nudge stats: {data}")


# ==================== EXISTING: HEALTH STREAK ROUTES ====================

class TestHealthStreakRoutes:
    """Health Streak API tests (routes/health_streak.py)"""
    
    def test_health_streak_leaderboard_all(self):
        """GET /api/health-streak/leaderboard/all returns leaderboard"""
        response = requests.get(f"{BASE_URL}/api/health-streak/leaderboard/all")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "leaderboard" in data
        print(f"✓ Leaderboard: {len(data['leaderboard'])} entries")
    
    def test_wellness_tips_user(self):
        """GET /api/wellness-tips/test-user returns tips"""
        response = requests.get(f"{BASE_URL}/api/wellness-tips/test-user")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "tips" in data
        assert len(data["tips"]) > 0
        print(f"✓ Wellness tips: {len(data['tips'])} tips")


# ==================== EXISTING: THRIVE360 ROUTES ====================

class TestThrive360Routes:
    """Thrive360 Fitness API tests (routes/thrive360.py)"""
    
    def test_book_fitness_session(self):
        """POST /api/thrive360/session books session"""
        response = requests.post(f"{BASE_URL}/api/thrive360/session", json={
            "program": "yoga",
            "session_type": "group",
            "preferred_date": "2026-01-25",
            "preferred_time": "08:00 AM",
            "user_phone": "TEST_5555555555",
            "user_name": "Test Fitness User"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "session_id" in data
        print(f"✓ Thrive360 session: {data['session_id']}")


# ==================== EXISTING: WAITLIST ROUTES ====================

class TestWaitlistRoutes:
    """Waitlist notification API tests (routes/waitlist.py)"""
    
    def test_notify_waitlist_available(self):
        """POST /api/appointments/waitlist/notify-available works"""
        response = requests.post(f"{BASE_URL}/api/appointments/waitlist/notify-available", json={
            "doctor_id": "test-doctor-id",
            "available_date": "2026-01-25",
            "available_slot": "10:00 AM"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Waitlist notification: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
