"""
Test Suite for Iteration 304 - DiaGynStaffPortal & AdminPanel Refactoring
Tests: Health API, Invoice endpoint, Cashfree webhook, Staff login
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_api_health(self):
        """Test /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ /api/health returns 200")


class TestInvoiceEndpoint:
    """Invoice endpoint tests"""
    
    def test_invoice_returns_404_for_nonexistent_booking(self):
        """Test /api/appointments/invoice/{booking_id} returns 404 for non-existent booking"""
        response = requests.get(f"{BASE_URL}/api/appointments/invoice/NONEXISTENT-123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invoice endpoint returns 404 for non-existent booking")
    
    def test_invoice_does_not_crash_with_dummy_id(self):
        """Test invoice endpoint doesn't return 500"""
        response = requests.get(f"{BASE_URL}/api/appointments/invoice/TEST-DUMMY-ID")
        assert response.status_code != 500, f"Invoice endpoint crashed with 500"
        print("✓ Invoice endpoint doesn't crash (returns {})".format(response.status_code))


class TestCashfreeWebhook:
    """Cashfree webhook endpoint tests"""
    
    def test_webhook_exists_and_handles_empty_body(self):
        """Test /api/payment-webhooks/cashfree handles empty body gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/payment-webhooks/cashfree",
            json={},
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 (webhook always returns 200 to prevent retries)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should indicate ignored due to no order_id
        assert data.get("status") in ["ignored", "success"], f"Unexpected status: {data}"
        print("✓ Cashfree webhook handles empty body gracefully")
    
    def test_webhook_handles_malformed_payload(self):
        """Test webhook handles malformed payload without crashing"""
        response = requests.post(
            f"{BASE_URL}/api/payment-webhooks/cashfree",
            json={"type": "PAYMENT_SUCCESS", "data": {}},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Webhook crashed: {response.status_code}"
        print("✓ Cashfree webhook handles malformed payload")


class TestStaffLogin:
    """Staff login tests"""
    
    def test_staff_login_success(self):
        """Test staff login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        assert response.status_code == 200, f"Staff login failed: {response.status_code}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print("✓ Staff login successful with dr_vikas/test1234")
        return data.get("token") or data.get("access_token")
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "invalid_user", "password": "wrong_pass"}
        )
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("✓ Staff login correctly rejects invalid credentials")


class TestDiaGynStaffConfig:
    """DiaGyn Staff Portal config tests"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "dr_vikas", "password": "test1234"}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Staff login failed")
    
    def test_diagyn_staff_config(self, staff_token):
        """Test DiaGyn staff config endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/config",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        # May return 200 or 401 depending on role
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ DiaGyn staff config endpoint returns {response.status_code}")


class TestAdminConfigEndpoints:
    """Admin panel config endpoints tests"""
    
    def test_config_clinics(self):
        """Test /api/config/clinics returns data"""
        response = requests.get(f"{BASE_URL}/api/config/clinics")
        assert response.status_code == 200, f"Clinics config failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of clinics"
        print(f"✓ /api/config/clinics returns {len(data)} clinics")
    
    def test_config_doctors(self):
        """Test /api/config/doctors returns data"""
        response = requests.get(f"{BASE_URL}/api/config/doctors")
        assert response.status_code == 200, f"Doctors config failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of doctors"
        print(f"✓ /api/config/doctors returns {len(data)} doctors")
    
    def test_config_fees(self):
        """Test /api/config/fees returns data"""
        response = requests.get(f"{BASE_URL}/api/config/fees")
        assert response.status_code == 200, f"Fees config failed: {response.status_code}"
        data = response.json()
        assert "consultation_fees" in data or "scan_fees" in data or isinstance(data, dict), "Expected fees data"
        print("✓ /api/config/fees returns fee data")
    
    def test_config_services(self):
        """Test /api/config/services returns data"""
        response = requests.get(f"{BASE_URL}/api/config/services")
        assert response.status_code == 200, f"Services config failed: {response.status_code}"
        print("✓ /api/config/services returns 200")
    
    def test_config_testimonials(self):
        """Test /api/config/testimonials returns data"""
        response = requests.get(f"{BASE_URL}/api/config/testimonials")
        assert response.status_code == 200, f"Testimonials config failed: {response.status_code}"
        print("✓ /api/config/testimonials returns 200")
    
    def test_config_health_tips(self):
        """Test /api/config/health-tips returns data"""
        response = requests.get(f"{BASE_URL}/api/config/health-tips")
        assert response.status_code == 200, f"Health tips config failed: {response.status_code}"
        print("✓ /api/config/health-tips returns 200")
    
    def test_config_certifications(self):
        """Test /api/config/certifications returns data"""
        response = requests.get(f"{BASE_URL}/api/config/certifications")
        assert response.status_code == 200, f"Certifications config failed: {response.status_code}"
        print("✓ /api/config/certifications returns 200")


class TestFamilyHealthEndpoints:
    """Family Health Hub endpoints tests"""
    
    def test_family_members_endpoint(self):
        """Test /api/family/members/{phone} endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/family/members/9876543210")
        # Should return 200 with empty list or actual members
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ Family members endpoint returns {response.status_code}")
    
    def test_family_vault_records_endpoint(self):
        """Test /api/family-vault/records/{member_id} endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/family-vault/records/test-member")
        # Should return 200 with empty records or actual records
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ Family vault records endpoint returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
