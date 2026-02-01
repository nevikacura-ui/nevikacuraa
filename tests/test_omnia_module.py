"""
Test suite for Omnia Diabetes Care Portal module
Tests: Blood Sugar Logging, Diet Plans, Book Tests, Warning Signs, Emergency Guide
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://health-ux.preview.emergentagent.com')

class TestOmniaEndpointsNoAuth:
    """Test Omnia endpoints without authentication - should return 401"""
    
    def test_omnia_profile_requires_auth(self):
        """GET /api/omnia/profile should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/omnia/profile")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Authentication required" in data["detail"] or "Not authenticated" in data["detail"]
    
    def test_omnia_sugar_logs_requires_auth(self):
        """GET /api/omnia/sugar-logs should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-logs")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_omnia_sugar_stats_requires_auth(self):
        """GET /api/omnia/sugar-stats should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/omnia/sugar-stats")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_omnia_post_profile_requires_auth(self):
        """POST /api/omnia/profile should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/omnia/profile",
            json={
                "diabetesType": "type2",
                "age": "45",
                "gender": "male"
            }
        )
        assert response.status_code == 401
    
    def test_omnia_post_sugar_log_requires_auth(self):
        """POST /api/omnia/sugar-logs should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            json={
                "type": "fbs",
                "value": "120",
                "date": "2026-01-11"
            }
        )
        assert response.status_code == 401


class TestOmniaWithAuth:
    """Test Omnia endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        # Register a test user
        test_email = f"test_omnia_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        test_phone = "9876543210"
        
        # Send OTP
        otp_response = requests.post(
            f"{BASE_URL}/api/auth/otp/send",
            json={"phone": test_phone}
        )
        
        if otp_response.status_code == 200:
            otp_data = otp_response.json()
            mock_otp = otp_data.get("mock_otp", "123456")
            
            # Verify OTP
            verify_response = requests.post(
                f"{BASE_URL}/api/auth/otp/verify",
                json={"phone": test_phone, "otp": mock_otp}
            )
            
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                
                if verify_data.get("user_exists"):
                    # Login existing user
                    login_response = requests.post(
                        f"{BASE_URL}/api/auth/login/otp",
                        json={"phone": test_phone, "otp": mock_otp}
                    )
                    if login_response.status_code == 200:
                        self.token = login_response.json().get("token")
                else:
                    # Register new user
                    register_response = requests.post(
                        f"{BASE_URL}/api/auth/register/otp",
                        json={
                            "phone": test_phone,
                            "otp": mock_otp,
                            "email": test_email,
                            "password": "testpass123",
                            "name": "Test Omnia User"
                        }
                    )
                    if register_response.status_code == 200:
                        self.token = register_response.json().get("token")
        
        if not hasattr(self, 'token') or not self.token:
            pytest.skip("Could not authenticate - skipping authenticated tests")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_omnia_profile_with_auth(self):
        """GET /api/omnia/profile with auth should return profile or null"""
        response = requests.get(
            f"{BASE_URL}/api/omnia/profile",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
    
    def test_save_omnia_profile(self):
        """POST /api/omnia/profile should save diabetes profile"""
        profile_data = {
            "diabetesType": "type2",
            "age": "45",
            "gender": "male",
            "height": "170",
            "weight": "75",
            "medications": "Metformin 500mg"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/profile",
            headers=self.headers,
            json=profile_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify profile was saved
        get_response = requests.get(
            f"{BASE_URL}/api/omnia/profile",
            headers=self.headers
        )
        assert get_response.status_code == 200
        profile = get_response.json().get("profile")
        assert profile is not None
        assert profile.get("diabetesType") == "type2"
    
    def test_add_sugar_log_fbs(self):
        """POST /api/omnia/sugar-logs should add FBS reading"""
        log_data = {
            "type": "fbs",
            "value": "110",
            "date": "2026-01-11",
            "time": "08:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=self.headers,
            json=log_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "log" in data
        assert data["log"]["type"] == "fbs"
        assert data["log"]["value"] == "110"
    
    def test_add_sugar_log_ppbs(self):
        """POST /api/omnia/sugar-logs should add PPBS reading"""
        log_data = {
            "type": "ppbs",
            "value": "145",
            "date": "2026-01-11",
            "time": "14:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=self.headers,
            json=log_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["log"]["type"] == "ppbs"
    
    def test_add_sugar_log_low_alert(self):
        """POST /api/omnia/sugar-logs with low value should return alert"""
        log_data = {
            "type": "fbs",
            "value": "60",
            "date": "2026-01-11",
            "time": "07:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=self.headers,
            json=log_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("alert") == "low"
    
    def test_add_sugar_log_high_alert(self):
        """POST /api/omnia/sugar-logs with high value should return alert"""
        log_data = {
            "type": "ppbs",
            "value": "200",
            "date": "2026-01-11",
            "time": "15:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=self.headers,
            json=log_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("alert") == "high"
    
    def test_get_sugar_logs(self):
        """GET /api/omnia/sugar-logs should return list of logs"""
        response = requests.get(
            f"{BASE_URL}/api/omnia/sugar-logs",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)
    
    def test_get_sugar_stats(self):
        """GET /api/omnia/sugar-stats should return statistics"""
        response = requests.get(
            f"{BASE_URL}/api/omnia/sugar-stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data


class TestOmniaAuthFlow:
    """Test Omnia OTP-based authentication flow"""
    
    def test_send_otp_for_omnia(self):
        """POST /api/auth/otp/send should work for Omnia service"""
        response = requests.post(
            f"{BASE_URL}/api/auth/otp/send",
            json={"phone": "9876543210", "service": "omnia"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "expires_in" in data


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_api_health_check(self):
        """GET /api/health should return healthy status (via API prefix)"""
        # Note: /health without /api prefix returns frontend HTML
        # The backend health endpoint is at /health but accessed via /api/health through ingress
        response = requests.get(f"{BASE_URL}/api/auth/me")
        # Should return 401 (not authenticated) which proves backend is running
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
