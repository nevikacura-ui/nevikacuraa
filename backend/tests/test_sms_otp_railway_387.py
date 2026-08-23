"""
Test SMS OTP text changes and Railway deployment config for iteration 387
Tests:
1. Backend health endpoint (/api/health)
2. Backend 404 JSON response (/api/nonexistent)
3. Railway config files existence and content
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_ok(self):
        """GET /api/health should return {status: ok}"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
    
    def test_nonexistent_api_returns_json_404(self):
        """GET /api/nonexistent should return JSON 404, not HTML"""
        response = requests.get(f"{BASE_URL}/api/nonexistent")
        assert response.status_code == 404
        # Should be JSON, not HTML
        content_type = response.headers.get('content-type', '')
        assert 'application/json' in content_type
        data = response.json()
        assert "detail" in data or "error" in data


class TestRailwayConfig:
    """Railway deployment config tests"""
    
    def test_railway_toml_exists(self):
        """railway.toml should exist at /app/railway.toml"""
        assert os.path.exists('/app/railway.toml'), "railway.toml not found"
    
    def test_railway_toml_has_healthcheck_path(self):
        """railway.toml should have healthcheckPath = /api/health"""
        with open('/app/railway.toml', 'r') as f:
            content = f.read()
        assert 'healthcheckPath' in content
        assert '/api/health' in content
    
    def test_nixpacks_toml_exists(self):
        """nixpacks.toml should exist at /app/nixpacks.toml"""
        assert os.path.exists('/app/nixpacks.toml'), "nixpacks.toml not found"
    
    def test_nixpacks_toml_has_emergent_index(self):
        """nixpacks.toml should have emergentintegrations extra-index-url"""
        with open('/app/nixpacks.toml', 'r') as f:
            content = f.read()
        assert 'extra-index-url' in content
        # Check for cloudfront URL (emergentintegrations)
        assert 'd33sy5i8bnduwe.cloudfront.net' in content


class TestSMSOTPEndpoints:
    """SMS OTP API endpoint tests"""
    
    def test_sms_otp_send_endpoint_exists(self):
        """POST /api/otp/sms/send should exist"""
        response = requests.post(f"{BASE_URL}/api/otp/sms/send", json={"phone": "9876543210"})
        # Should not be 404 - could be 200 or 400/422 for validation
        assert response.status_code != 404, "SMS OTP send endpoint not found"
    
    def test_sms_otp_verify_endpoint_exists(self):
        """POST /api/otp/sms/verify should exist"""
        response = requests.post(f"{BASE_URL}/api/otp/sms/verify", json={"phone": "9876543210", "otp": "123456"})
        # Should not be 404 - could be 200 or 400/422 for validation
        assert response.status_code != 404, "SMS OTP verify endpoint not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
