"""
Test Suite for Evara Period Tracking, Glydex Sugar Logging, and Reneu Wellness APIs
Tests the NEW backend functionality implemented for iteration 184

Endpoints tested:
- POST/GET /api/evara/period-log, /api/evara/period-history (requires auth)
- POST/GET /api/glydex/sugar-log, /api/glydex/sugar-logs (requires auth)
- GET /api/reneu/programs, /api/reneu/nutrition, /api/reneu/sleep-tips (public)
- GET /api/reneu/skin-care, /api/reneu/hair-care (public)
- POST /api/reneu/sleep-log, /api/reneu/fitness-log (requires auth)
- GET /api/reneu/sleep-logs (requires auth)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-rx-portal.preview.emergentagent.com").rstrip("/")

# Test credentials
TEST_EMAIL = "apitest@nevika.com"
TEST_PASSWORD = "test1234"


class TestAuthentication:
    """Test patient authentication - prerequisite for other tests"""

    def test_patient_login(self):
        """Test patient login and get JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/patient/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not returned"
        assert "user" in data, "User not returned"
        # Store token for other tests
        TestAuthentication.token = data["token"]
        print(f"LOGIN SUCCESS - Token obtained for {TEST_EMAIL}")


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for authenticated tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/patient/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - cannot proceed with authenticated tests")


# ==================== EVARA PERIOD TRACKING TESTS ====================

class TestEvaraPeriodTracking:
    """Test Evara period tracking endpoints"""

    def test_period_log_without_auth(self):
        """POST /api/evara/period-log without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/evara/period-log",
            json={
                "start_date": "2025-01-15",
                "flow": "medium",
                "symptoms": ["Cramps", "Bloating"]
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("EVARA PERIOD LOG WITHOUT AUTH - Correctly returns 401")

    def test_period_log_with_auth(self, auth_token):
        """POST /api/evara/period-log with auth should work"""
        response = requests.post(
            f"{BASE_URL}/api/evara/period-log",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "start_date": "2025-01-15",
                "flow": "medium",
                "symptoms": ["Cramps", "Bloating"],
                "notes": "Test period log"
            }
        )
        assert response.status_code == 200, f"Period log failed: {response.text}"
        data = response.json()
        assert data.get("success") is True, "Period log not successful"
        assert "log" in data, "Log data not returned"
        assert "next_predicted" in data, "Next predicted date not returned"
        print(f"EVARA PERIOD LOG SUCCESS - Next predicted: {data.get('next_predicted')}")

    def test_period_history_without_auth(self):
        """GET /api/evara/period-history without auth should return empty"""
        response = requests.get(f"{BASE_URL}/api/evara/period-history")
        # Should return 200 with empty history for unauthenticated users
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("history") == [] or data.get("history") is not None
        print("EVARA PERIOD HISTORY WITHOUT AUTH - Returns empty/data correctly")

    def test_period_history_with_auth(self, auth_token):
        """GET /api/evara/period-history with auth should return logged periods"""
        response = requests.get(
            f"{BASE_URL}/api/evara/period-history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Period history failed: {response.text}"
        data = response.json()
        assert "history" in data, "History not in response"
        assert "average_cycle_length" in data, "Average cycle length not in response"
        print(f"EVARA PERIOD HISTORY SUCCESS - {len(data.get('history', []))} entries, avg cycle: {data.get('average_cycle_length')}d")


# ==================== GLYDEX SUGAR LOGGING TESTS ====================

class TestGlydexSugarLogging:
    """Test Glydex blood sugar logging endpoints"""

    def test_sugar_log_without_auth(self):
        """POST /api/glydex/sugar-log without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/glydex/sugar-log",
            json={
                "type": "fbs",
                "value": "95",  # value is string type
                "date": "2025-01-15"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("GLYDEX SUGAR LOG WITHOUT AUTH - Correctly returns 401")

    def test_sugar_log_with_auth(self, auth_token):
        """POST /api/glydex/sugar-log with auth should work - value is STRING"""
        response = requests.post(
            f"{BASE_URL}/api/glydex/sugar-log",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "type": "fbs",
                "value": "98",  # STRING type as per agent context
                "date": "2025-01-15",
                "time": "08:00"
            }
        )
        assert response.status_code == 200, f"Sugar log failed: {response.text}"
        data = response.json()
        assert data.get("status") == "added", "Sugar log not added"
        assert "log" in data, "Log data not returned"
        print(f"GLYDEX SUGAR LOG SUCCESS - FBS reading logged")

    def test_sugar_log_ppbs(self, auth_token):
        """POST /api/glydex/sugar-log PPBS type"""
        response = requests.post(
            f"{BASE_URL}/api/glydex/sugar-log",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "type": "ppbs",
                "value": "135",  # STRING type
                "date": "2025-01-15",
                "time": "14:00"
            }
        )
        assert response.status_code == 200, f"PPBS log failed: {response.text}"
        data = response.json()
        assert data.get("status") == "added"
        print("GLYDEX PPBS LOG SUCCESS")

    def test_sugar_logs_without_auth(self):
        """GET /api/glydex/sugar-logs without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/glydex/sugar-logs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("GLYDEX SUGAR LOGS WITHOUT AUTH - Correctly returns 401")

    def test_sugar_logs_with_auth(self, auth_token):
        """GET /api/glydex/sugar-logs with auth should return logged readings"""
        response = requests.get(
            f"{BASE_URL}/api/glydex/sugar-logs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Sugar logs fetch failed: {response.text}"
        data = response.json()
        assert "logs" in data, "Logs not in response"
        print(f"GLYDEX SUGAR LOGS SUCCESS - {len(data.get('logs', []))} readings found")


# ==================== RENEU WELLNESS CONTENT TESTS (PUBLIC) ====================

class TestReneuPublicEndpoints:
    """Test Reneu public endpoints - no auth required"""

    def test_get_fitness_programs(self):
        """GET /api/reneu/programs should return 5 fitness programs"""
        response = requests.get(f"{BASE_URL}/api/reneu/programs")
        assert response.status_code == 200, f"Programs fetch failed: {response.text}"
        data = response.json()
        assert "programs" in data, "Programs not in response"
        programs = data.get("programs", [])
        assert len(programs) == 5, f"Expected 5 programs, got {len(programs)}"
        
        # Verify program IDs
        expected_programs = {"yoga", "meditation", "weight_training", "hiit", "walking"}
        actual_programs = {p.get("id") for p in programs}
        assert expected_programs == actual_programs, f"Programs mismatch: {actual_programs}"
        
        print(f"RENEU PROGRAMS SUCCESS - 5 programs: {', '.join([p.get('name') for p in programs])}")

    def test_get_nutrition_plans(self):
        """GET /api/reneu/nutrition should return weight loss and weight gain plans"""
        response = requests.get(f"{BASE_URL}/api/reneu/nutrition")
        assert response.status_code == 200, f"Nutrition fetch failed: {response.text}"
        data = response.json()
        assert "plans" in data, "Plans not in response"
        plans = data.get("plans", [])
        assert len(plans) == 2, f"Expected 2 plans, got {len(plans)}"
        
        # Verify plan IDs
        plan_ids = {p.get("id") for p in plans}
        assert "weight_loss" in plan_ids, "Weight loss plan missing"
        assert "weight_gain" in plan_ids, "Weight gain plan missing"
        
        # Check plan structure
        for plan in plans:
            assert "meals" in plan, f"Meals missing in plan {plan.get('id')}"
            assert "tips" in plan, f"Tips missing in plan {plan.get('id')}"
        
        print(f"RENEU NUTRITION SUCCESS - 2 plans: Weight Loss, Weight Gain")

    def test_get_sleep_tips(self):
        """GET /api/reneu/sleep-tips should return sleep advice"""
        response = requests.get(f"{BASE_URL}/api/reneu/sleep-tips")
        assert response.status_code == 200, f"Sleep tips fetch failed: {response.text}"
        data = response.json()
        assert "tips" in data, "Tips not in response"
        tips = data.get("tips", [])
        assert len(tips) >= 5, f"Expected at least 5 tips, got {len(tips)}"
        
        # Verify tip structure
        for tip in tips:
            assert "title" in tip, "Title missing in tip"
            assert "desc" in tip, "Description missing in tip"
        
        print(f"RENEU SLEEP TIPS SUCCESS - {len(tips)} tips returned")

    def test_get_skin_care(self):
        """GET /api/reneu/skin-care should return routines and concerns"""
        response = requests.get(f"{BASE_URL}/api/reneu/skin-care")
        assert response.status_code == 200, f"Skin care fetch failed: {response.text}"
        data = response.json()
        assert "data" in data, "Data not in response"
        skin_data = data.get("data", {})
        
        # Verify structure
        assert "routines" in skin_data, "Routines missing"
        assert "concerns" in skin_data, "Concerns missing"
        assert "morning" in skin_data.get("routines", {}), "Morning routine missing"
        assert "evening" in skin_data.get("routines", {}), "Evening routine missing"
        
        print(f"RENEU SKIN CARE SUCCESS - Morning & evening routines + {len(skin_data.get('concerns', []))} concerns")

    def test_get_hair_care(self):
        """GET /api/reneu/hair-care should return routines and concerns"""
        response = requests.get(f"{BASE_URL}/api/reneu/hair-care")
        assert response.status_code == 200, f"Hair care fetch failed: {response.text}"
        data = response.json()
        assert "data" in data, "Data not in response"
        hair_data = data.get("data", {})
        
        # Verify structure
        assert "routines" in hair_data, "Routines missing"
        assert "concerns" in hair_data, "Concerns missing"
        
        print(f"RENEU HAIR CARE SUCCESS - {len(hair_data.get('routines', []))} routine steps + {len(hair_data.get('concerns', []))} concerns")


# ==================== RENEU AUTHENTICATED ENDPOINTS ====================

class TestReneuAuthenticatedEndpoints:
    """Test Reneu endpoints that require authentication"""

    def test_sleep_log_without_auth(self):
        """POST /api/reneu/sleep-log without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/reneu/sleep-log",
            json={
                "date": "2025-01-15",
                "bedtime": "23:00",
                "wakeup_time": "07:00",
                "quality": "good"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("RENEU SLEEP LOG WITHOUT AUTH - Correctly returns 401")

    def test_sleep_log_with_auth(self, auth_token):
        """POST /api/reneu/sleep-log with auth should work"""
        response = requests.post(
            f"{BASE_URL}/api/reneu/sleep-log",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "date": "2025-01-15",
                "bedtime": "23:00",
                "wakeup_time": "07:00",
                "screen_time_minutes": 45,
                "quality": "good",
                "notes": "Test sleep log"
            }
        )
        assert response.status_code == 200, f"Sleep log failed: {response.text}"
        data = response.json()
        assert data.get("status") == "added", "Sleep log not added"
        assert "log" in data, "Log data not returned"
        print("RENEU SLEEP LOG SUCCESS")

    def test_fitness_log_without_auth(self):
        """POST /api/reneu/fitness-log without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/reneu/fitness-log",
            json={
                "date": "2025-01-15",
                "program_id": "yoga",
                "duration_minutes": 30
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("RENEU FITNESS LOG WITHOUT AUTH - Correctly returns 401")

    def test_fitness_log_with_auth(self, auth_token):
        """POST /api/reneu/fitness-log with auth should work"""
        response = requests.post(
            f"{BASE_URL}/api/reneu/fitness-log",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "date": "2025-01-15",
                "program_id": "yoga",
                "duration_minutes": 30,
                "calories_burned": 150,
                "notes": "Test fitness log"
            }
        )
        assert response.status_code == 200, f"Fitness log failed: {response.text}"
        data = response.json()
        assert data.get("status") == "added", "Fitness log not added"
        print("RENEU FITNESS LOG SUCCESS")

    def test_sleep_logs_without_auth(self):
        """GET /api/reneu/sleep-logs without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/reneu/sleep-logs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("RENEU SLEEP LOGS WITHOUT AUTH - Correctly returns 401")

    def test_sleep_logs_with_auth(self, auth_token):
        """GET /api/reneu/sleep-logs with auth should return logged entries"""
        response = requests.get(
            f"{BASE_URL}/api/reneu/sleep-logs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Sleep logs fetch failed: {response.text}"
        data = response.json()
        assert "logs" in data, "Logs not in response"
        print(f"RENEU SLEEP LOGS SUCCESS - {len(data.get('logs', []))} logs found")


# ==================== PORTAL CHECKOUT ENDPOINT ====================

class TestPortalCheckout:
    """Test Cashfree checkout endpoint used by portal Subscribe buttons"""

    def test_cashfree_create_order(self):
        """POST /api/payments/cashfree/create-order should work"""
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json={
                "customer_id": f"TEST_{uuid.uuid4().hex[:8]}",
                "customer_name": "Test User",
                "customer_email": "test@example.com",
                "customer_phone": "9876543210",
                "amount": 99,
                "product_type": "membership",
                "product_id": "NEVIKA_EVARA_MONTHLY",
                "membership_plan": "monthly",
                "return_url": f"{BASE_URL}/one?order_id="
            }
        )
        assert response.status_code == 200, f"Create order failed: {response.text}"
        data = response.json()
        assert data.get("success") is True, "Order creation not successful"
        assert "payment_session_id" in data, "Payment session ID not returned"
        print(f"CASHFREE CREATE ORDER SUCCESS - Session ID obtained")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
