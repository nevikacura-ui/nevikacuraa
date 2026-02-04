"""
Test suite for Omnia Diabetes Care Portal - Authenticated User Flow
Uses email/password registration to bypass SMS OTP requirement
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://orange-health-ui.preview.emergentagent.com')

class TestOmniaAuthenticatedFlow:
    """Test Omnia endpoints with authenticated user using email/password registration"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register a test user and get auth token"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_omnia_{unique_id}@example.com"
        test_phone = f"98765{unique_id[:5]}"
        test_password = "TestPass123!"
        test_name = "Omnia Test User"
        
        # Register new user via email/password (bypasses SMS OTP)
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "phone": test_phone,
                "password": test_password,
                "name": test_name
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            token = data.get("token")
            print(f"✓ Registered new user: {test_email}")
            return token
        elif register_response.status_code == 400 and "already registered" in register_response.text:
            # User exists, try login
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": test_email,
                    "password": test_password
                }
            )
            if login_response.status_code == 200:
                token = login_response.json().get("token")
                print(f"✓ Logged in existing user: {test_email}")
                return token
        
        pytest.fail(f"Failed to authenticate: {register_response.text}")
    
    @pytest.fixture
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    # ============ Profile Tests ============
    
    def test_get_omnia_profile_authenticated(self, headers):
        """GET /api/omnia/profile with auth should return profile or null"""
        response = requests.get(f"{BASE_URL}/api/omnia/profile", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "profile" in data
        print(f"✓ GET /api/omnia/profile - Status: 200, Profile: {data['profile']}")
    
    def test_save_omnia_profile(self, headers):
        """POST /api/omnia/profile should save diabetes profile"""
        profile_data = {
            "diabetesType": "type2",
            "age": "45",
            "gender": "male"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/profile",
            headers=headers,
            json=profile_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ POST /api/omnia/profile - Profile saved successfully")
        
        # Verify profile was saved by fetching it
        get_response = requests.get(f"{BASE_URL}/api/omnia/profile", headers=headers)
        assert get_response.status_code == 200
        profile = get_response.json().get("profile")
        assert profile is not None
        assert profile.get("diabetesType") == "type2"
        assert profile.get("age") == "45"
        assert profile.get("gender") == "male"
        print(f"✓ Profile verified: diabetesType={profile.get('diabetesType')}, age={profile.get('age')}")
    
    # ============ Sugar Log Tests ============
    
    def test_add_sugar_log_fbs_normal(self, headers):
        """POST /api/omnia/sugar-logs should add FBS reading (normal range)"""
        log_data = {
            "type": "fbs",
            "value": "95",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "08:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=headers,
            json=log_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "log" in data
        assert data["log"]["type"] == "fbs"
        assert data["log"]["value"] == "95"
        assert data.get("alert") is None  # Normal value, no alert
        print(f"✓ POST /api/omnia/sugar-logs (FBS normal) - Log ID: {data['log']['id']}")
    
    def test_add_sugar_log_ppbs_normal(self, headers):
        """POST /api/omnia/sugar-logs should add PPBS reading (normal range)"""
        log_data = {
            "type": "ppbs",
            "value": "130",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "14:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=headers,
            json=log_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["log"]["type"] == "ppbs"
        assert data["log"]["value"] == "130"
        assert data.get("alert") is None  # Normal value, no alert
        print(f"✓ POST /api/omnia/sugar-logs (PPBS normal) - Log ID: {data['log']['id']}")
    
    def test_add_sugar_log_low_alert(self, headers):
        """POST /api/omnia/sugar-logs with low value (<70) should return 'low' alert"""
        log_data = {
            "type": "fbs",
            "value": "55",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "07:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=headers,
            json=log_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("alert") == "low"
        print(f"✓ POST /api/omnia/sugar-logs (LOW) - Alert: {data.get('alert')}")
    
    def test_add_sugar_log_high_alert(self, headers):
        """POST /api/omnia/sugar-logs with high value (>180) should return 'high' alert"""
        log_data = {
            "type": "ppbs",
            "value": "200",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "15:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=headers,
            json=log_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("alert") == "high"
        print(f"✓ POST /api/omnia/sugar-logs (HIGH) - Alert: {data.get('alert')}")
    
    def test_add_sugar_log_very_high_alert(self, headers):
        """POST /api/omnia/sugar-logs with very high value (>250) should return 'very_high' alert"""
        log_data = {
            "type": "ppbs",
            "value": "280",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "16:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=headers,
            json=log_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("alert") == "very_high"
        print(f"✓ POST /api/omnia/sugar-logs (VERY HIGH) - Alert: {data.get('alert')}")
    
    def test_get_sugar_logs(self, headers):
        """GET /api/omnia/sugar-logs should return list of logs"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-logs", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)
        assert len(data["logs"]) >= 5  # We added 5 logs in previous tests
        print(f"✓ GET /api/omnia/sugar-logs - Found {len(data['logs'])} logs")
    
    def test_get_sugar_stats(self, headers):
        """GET /api/omnia/sugar-stats should return statistics"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "stats" in data
        stats = data["stats"]
        assert stats is not None
        assert "total_readings" in stats
        assert "fbs" in stats
        assert "ppbs" in stats
        assert stats["fbs"]["count"] >= 2  # We added 2 FBS logs
        assert stats["ppbs"]["count"] >= 3  # We added 3 PPBS logs
        print(f"✓ GET /api/omnia/sugar-stats - Total readings: {stats['total_readings']}, FBS avg: {stats['fbs']['avg']}, PPBS avg: {stats['ppbs']['avg']}")
    
    def test_delete_sugar_log(self, headers):
        """DELETE /api/omnia/sugar-logs/{log_id} should delete a log"""
        # First add a log to delete
        log_data = {
            "type": "random",
            "value": "150",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "12:00"
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=headers,
            json=log_data
        )
        assert add_response.status_code == 200
        log_id = add_response.json()["log"]["id"]
        print(f"  Added log to delete: {log_id}")
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/omnia/sugar-logs/{log_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True
        print(f"✓ DELETE /api/omnia/sugar-logs/{log_id} - Deleted successfully")
        
        # Verify it's deleted by trying to delete again (should 404)
        delete_again = requests.delete(
            f"{BASE_URL}/api/omnia/sugar-logs/{log_id}",
            headers=headers
        )
        assert delete_again.status_code == 404
        print(f"✓ Verified log is deleted (404 on second delete)")


class TestOmniaEndpointsNoAuth:
    """Test Omnia endpoints without authentication - should return 401"""
    
    def test_omnia_profile_requires_auth(self):
        """GET /api/omnia/profile should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/omnia/profile")
        assert response.status_code == 401
        print(f"✓ GET /api/omnia/profile without auth - 401 as expected")
    
    def test_omnia_sugar_logs_requires_auth(self):
        """GET /api/omnia/sugar-logs should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-logs")
        assert response.status_code == 401
        print(f"✓ GET /api/omnia/sugar-logs without auth - 401 as expected")
    
    def test_omnia_sugar_stats_requires_auth(self):
        """GET /api/omnia/sugar-stats should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-stats")
        assert response.status_code == 401
        print(f"✓ GET /api/omnia/sugar-stats without auth - 401 as expected")
    
    def test_omnia_post_profile_requires_auth(self):
        """POST /api/omnia/profile should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/omnia/profile",
            json={"diabetesType": "type2", "age": "45", "gender": "male"}
        )
        assert response.status_code == 401
        print(f"✓ POST /api/omnia/profile without auth - 401 as expected")
    
    def test_omnia_post_sugar_log_requires_auth(self):
        """POST /api/omnia/sugar-logs should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            json={"type": "fbs", "value": "120", "date": "2026-01-11"}
        )
        assert response.status_code == 401
        print(f"✓ POST /api/omnia/sugar-logs without auth - 401 as expected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
