"""
Test Suite for Iteration 385: SPA Fallback Fix + Theme Toggle
Tests:
1. API endpoints return proper JSON (not HTML)
2. SPA fallback returns HTML for non-API routes
3. Theme toggle functionality (frontend)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')


class TestAPIEndpointsReturnJSON:
    """Test that API endpoints return proper JSON responses, not HTML"""
    
    def test_health_endpoint_returns_json(self):
        """GET /api/health should return JSON {status: ok}"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        print(f"✓ /api/health returns JSON: {data}")
    
    def test_doctors_featured_returns_json(self):
        """GET /api/doctors/featured should return a list of doctors"""
        response = requests.get(f"{BASE_URL}/api/doctors/featured")
        assert response.status_code == 200
        data = response.json()
        assert "doctors" in data
        assert isinstance(data["doctors"], list)
        assert len(data["doctors"]) > 0
        # Verify doctor structure
        doctor = data["doctors"][0]
        assert "id" in doctor
        assert "name" in doctor
        assert "specialization" in doctor
        print(f"✓ /api/doctors/featured returns {len(data['doctors'])} doctors")
    
    def test_otp_send_returns_json(self):
        """POST /api/otp/sms/send should return JSON (success or rate limit)"""
        response = requests.post(
            f"{BASE_URL}/api/otp/sms/send",
            json={"phone": "9876543210"},
            headers={"Content-Type": "application/json"}
        )
        # Should return JSON regardless of success or rate limit
        data = response.json()
        # Either success response or rate limit response
        if response.status_code == 200:
            assert "success" in data
            print(f"✓ /api/otp/sms/send returns JSON: success={data['success']}")
        elif response.status_code == 429 or "wait" in str(data.get("detail", "")).lower():
            # Rate limited - still returns JSON, which is correct
            assert "detail" in data
            print(f"✓ /api/otp/sms/send returns JSON (rate limited): {data['detail']}")
        else:
            # Any other response should still be JSON
            assert isinstance(data, dict)
            print(f"✓ /api/otp/sms/send returns JSON: {data}")
    
    def test_nonexistent_api_returns_json_404(self):
        """Non-existent API endpoint should return JSON 404, not HTML"""
        response = requests.get(f"{BASE_URL}/api/nonexistent-endpoint-xyz")
        assert response.status_code == 404
        # Should be JSON, not HTML
        content_type = response.headers.get('content-type', '')
        assert 'application/json' in content_type, f"Expected JSON, got {content_type}"
        data = response.json()
        assert "detail" in data
        print(f"✓ /api/nonexistent-endpoint returns JSON 404: {data}")


class TestSPAFallback:
    """Test that non-API routes return HTML (SPA fallback)"""
    
    def test_random_page_returns_html(self):
        """Non-API route like /some-page should return HTML"""
        response = requests.get(f"{BASE_URL}/some-random-page-xyz")
        # Should return 200 with HTML (SPA fallback)
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type, f"Expected HTML, got {content_type}"
        # Should contain React app markers
        assert '<!DOCTYPE html>' in response.text or '<html' in response.text
        print(f"✓ /some-random-page returns HTML (SPA fallback)")
    
    def test_diagyn_route_returns_html(self):
        """Frontend route /diagyn should return HTML"""
        response = requests.get(f"{BASE_URL}/diagyn")
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type
        print(f"✓ /diagyn returns HTML (SPA fallback)")
    
    def test_labs_route_returns_html(self):
        """Frontend route /labs should return HTML"""
        response = requests.get(f"{BASE_URL}/labs")
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type
        print(f"✓ /labs returns HTML (SPA fallback)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
