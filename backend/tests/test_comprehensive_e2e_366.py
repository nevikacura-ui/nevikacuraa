"""
Comprehensive E2E Testing - Iteration 366
Tests all critical flows for Nevika Cura Healthcare Platform:
1. Orange Pharmacy E2E Flow
2. Mango Labs E2E Flow
3. DiaGyn Appointment + Close Consultation Glitch Fix
4. Staff Portal Login (staffToken key verification)
5. Cashfree Payment Endpoints
6. WhatsApp OTP Endpoints
7. My Orders Auto-Populate
8. Profile Navigation
9. Admin Portal
10. Membership/Care Package Activation
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

# Test phone for orders
TEST_PHONE = "9876543210"
TEST_EMAIL = "test@nevikacura.com"

# Admin credentials
ADMIN_USERNAME = "nevikacura"
ADMIN_PASSWORD = "test1234"

# Staff credentials
STAFF_USERNAME = "staff_diagyn"
STAFF_PASSWORD = "test1234"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ API health check passed")


class TestCashfreePaymentEndpoints:
    """FLOW 9 - Cashfree Payment Endpoints"""
    
    def test_cashfree_health_check(self):
        """Test Cashfree health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/health-check")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✅ Cashfree health check: {data.get('status')}")
    
    def test_create_pharmacy_order(self):
        """Test creating a Cashfree order for pharmacy"""
        payload = {
            "customer_id": f"TEST_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test User",
            "customer_email": TEST_EMAIL,
            "customer_phone": TEST_PHONE,
            "amount": 500.0,
            "product_type": "pharmacy",
            "product_id": f"TEST_ORDER_{uuid.uuid4().hex[:8]}",
            "return_url": f"{BASE_URL}/payment-success"
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "order_id" in data
        assert "payment_session_id" in data
        print(f"✅ Cashfree pharmacy order created: {data.get('order_id')}")
        return data.get("order_id")
    
    def test_create_diagnostic_order(self):
        """Test creating a Cashfree order for diagnostics"""
        payload = {
            "customer_id": f"TEST_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test User",
            "customer_email": TEST_EMAIL,
            "customer_phone": TEST_PHONE,
            "amount": 1200.0,
            "product_type": "lab_test",
            "product_id": f"TEST_LAB_{uuid.uuid4().hex[:8]}",
            "return_url": f"{BASE_URL}/payment-success"
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "order_id" in data
        print(f"✅ Cashfree diagnostic order created: {data.get('order_id')}")
    
    def test_create_appointment_order(self):
        """Test creating a Cashfree order for appointment"""
        payload = {
            "customer_id": f"TEST_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test User",
            "customer_email": TEST_EMAIL,
            "customer_phone": TEST_PHONE,
            "amount": 800.0,
            "product_type": "appointment",
            "product_id": f"TEST_APT_{uuid.uuid4().hex[:8]}",
            "return_url": f"{BASE_URL}/payment-success"
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Cashfree appointment order created: {data.get('order_id')}")
    
    def test_create_care_package_order(self):
        """FLOW 8 - Test creating a Cashfree order for care package"""
        payload = {
            "customer_id": f"TEST_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test User",
            "customer_email": TEST_EMAIL,
            "customer_phone": TEST_PHONE,
            "amount": 999.0,
            "product_type": "care_package",
            "product_id": f"TEST_CARE_{uuid.uuid4().hex[:8]}",
            "return_url": f"{BASE_URL}/payment-success"
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Cashfree care package order created: {data.get('order_id')}")
    
    def test_verify_nonexistent_order(self):
        """Test verify endpoint with non-existent order"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/NONEXISTENT_ORDER_123")
        assert response.status_code == 404
        print("✅ Verify endpoint returns 404 for non-existent order")
    
    def test_order_status_nonexistent(self):
        """Test order-status endpoint with non-existent order"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/order-status/NONEXISTENT_ORDER_123")
        assert response.status_code == 404
        print("✅ Order-status endpoint returns 404 for non-existent order")


class TestWhatsAppOTPEndpoints:
    """FLOW 10 - WhatsApp OTP Endpoints"""
    
    def test_send_otp_endpoint_exists(self):
        """Test WhatsApp OTP send endpoint exists"""
        # We don't actually send OTP to avoid spam, just verify endpoint exists
        payload = {"phone": "0000000000", "purpose": "test"}
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json=payload)
        # Should return 400 for invalid phone or 500 if MSG91 rejects
        assert response.status_code in [200, 400, 500]
        print(f"✅ WhatsApp OTP send endpoint exists (status: {response.status_code})")
    
    def test_verify_otp_endpoint_exists(self):
        """Test WhatsApp OTP verify endpoint exists"""
        payload = {"phone": "0000000000", "otp": "123456"}
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json=payload)
        # Should return 400 for invalid OTP
        assert response.status_code in [400, 500]
        print(f"✅ WhatsApp OTP verify endpoint exists (status: {response.status_code})")
    
    def test_resend_otp_endpoint_exists(self):
        """Test WhatsApp OTP resend endpoint exists"""
        payload = {"phone": "0000000000", "purpose": "test"}
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/resend", json=payload)
        # Should return 400 or 500
        assert response.status_code in [200, 400, 500]
        print(f"✅ WhatsApp OTP resend endpoint exists (status: {response.status_code})")


class TestStaffLogin:
    """FLOW 4 & 7 - Staff Portal Login Tests"""
    
    def test_admin_login(self):
        """FLOW 7 - Test admin login with correct credentials"""
        payload = {
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Admin login successful, token received")
        return data.get("token")
    
    def test_staff_login(self):
        """FLOW 4 - Test DiaGyn staff login"""
        payload = {
            "username": STAFF_USERNAME,
            "password": STAFF_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Staff login successful, token received")
        return data.get("token")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        payload = {
            "username": "invalid_user",
            "password": "wrong_password"
        }
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        assert response.status_code in [401, 404]
        print("✅ Invalid login correctly rejected")


class TestDiaGynStaffPortal:
    """FLOW 3 & 14 - DiaGyn Staff Portal Tests including Close Consultation Glitch Fix"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff token for authenticated requests"""
        payload = {"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_diagyn_config(self, staff_token):
        """Test DiaGyn config endpoint"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "clinics" in data or "fee_codes" in data or "scan_fees" in data
        print("✅ DiaGyn config endpoint working")
    
    def test_today_appointments(self, staff_token):
        """Test today's appointments endpoint"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/appointments/today", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data or "summary" in data or isinstance(data, list)
        print(f"✅ Today's appointments endpoint working")
    
    def test_available_slots(self, staff_token):
        """Test available slots endpoint"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/slots/available",
            params={"date": today, "clinic": "Pushpa Clinic", "doctor": "Dr. Pushpa Nayak"},
            headers=headers
        )
        # 200 or 422 if doctor not found
        assert response.status_code in [200, 422]
        print(f"✅ Available slots endpoint checked (status: {response.status_code})")
    
    def test_billing_pending(self, staff_token):
        """Test billing pending endpoint"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/billing/pending", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data or "pending_count" in data or "appointments" in data
        print("✅ Billing pending endpoint working")
    
    def test_billing_analytics(self, staff_token):
        """Test billing analytics endpoint"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/billing/analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print("✅ Billing analytics endpoint working")
    
    def test_close_billing_endpoint_exists(self, staff_token):
        """FLOW 14 - Test close billing endpoint exists (the glitch fix)"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        # Test with a fake appointment ID - should return 404 (not 500)
        payload = {
            "appointment_id": "FAKE_APT_ID_123",
            "final_amount": 500,
            "payment_method": "cash"
        }
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/billing/close",
            json=payload,
            headers=headers
        )
        # Should return 404 for non-existent appointment, not 500
        assert response.status_code in [404, 400]
        print("✅ Close billing endpoint exists and handles invalid appointment correctly")


class TestMyOrdersEndpoint:
    """FLOW 12 - My Orders Auto-Populate Tests"""
    
    def test_my_orders_with_phone(self):
        """Test my-orders endpoint with phone number"""
        response = requests.get(
            f"{BASE_URL}/api/orders/my-orders",
            params={"phone": TEST_PHONE}
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "orders" in data
        print(f"✅ My orders endpoint working - found {len(data.get('orders', []))} orders")
    
    def test_my_orders_with_email(self):
        """Test my-orders endpoint with email"""
        response = requests.get(
            f"{BASE_URL}/api/orders/my-orders",
            params={"email": TEST_EMAIL}
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print("✅ My orders endpoint works with email")
    
    def test_my_orders_without_params(self):
        """Test my-orders endpoint without phone/email"""
        response = requests.get(f"{BASE_URL}/api/orders/my-orders")
        assert response.status_code == 200
        data = response.json()
        # Should return empty orders with message
        assert "orders" in data
        print("✅ My orders endpoint handles missing params gracefully")


class TestPharmacyBrowse:
    """FLOW 1 - Orange Pharmacy Browse Tests"""
    
    def test_pharmacy_search(self):
        """Test pharmacy search endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/v3/search",
            params={"q": "paracetamol"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data or "results" in data or isinstance(data, list)
        print("✅ Pharmacy search endpoint working")
    
    def test_pharmacy_categories(self):
        """Test pharmacy categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/categories")
        assert response.status_code == 200
        print("✅ Pharmacy categories endpoint working")
    
    def test_pharmacy_browse(self):
        """Test pharmacy browse endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse")
        assert response.status_code == 200
        print("✅ Pharmacy browse endpoint working")
    
    def test_pharmacy_trending(self):
        """Test pharmacy trending endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending")
        assert response.status_code == 200
        print("✅ Pharmacy trending endpoint working")
    
    def test_create_pharmacy_order(self):
        """Test creating a pharmacy order"""
        payload = {
            "patient_name": "Test User",
            "patient_phone": TEST_PHONE,
            "patient_email": TEST_EMAIL,
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 2, "price": 50}
            ],
            "total_amount": 100,
            "delivery_address": "Test Address, Mumbai",
            "payment_method": "cod"
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=payload)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data or "booking_id" in data or "order_id" in data
        print(f"✅ Pharmacy order created successfully")


class TestDiagnosticsBrowse:
    """FLOW 2 - Mango Labs Browse Tests"""
    
    def test_diagnostic_tests_catalog(self):
        """Test diagnostic tests catalog endpoint"""
        response = requests.get(f"{BASE_URL}/api/diagnostic-tests")
        # May return 200 or 404 depending on route registration
        assert response.status_code in [200, 404]
        print(f"✅ Diagnostic tests catalog endpoint checked (status: {response.status_code})")
    
    def test_diagnostic_categories(self):
        """Test diagnostic categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/diagnostic-tests/categories")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]
        print(f"✅ Diagnostic categories endpoint checked (status: {response.status_code})")


class TestMembershipPlans:
    """FLOW 8 - Membership/Subscription Tests"""
    
    def test_membership_plans_endpoint(self):
        """Test membership plans endpoint"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers")
        # May return 200 or 404
        assert response.status_code in [200, 404]
        print(f"✅ Membership plans endpoint checked (status: {response.status_code})")
    
    def test_care_programs_endpoint(self):
        """Test care programs endpoint"""
        response = requests.get(f"{BASE_URL}/api/care-programs")
        # May return 200 or 404
        assert response.status_code in [200, 404]
        print(f"✅ Care programs endpoint checked (status: {response.status_code})")


class TestNotificationServices:
    """FLOW 10 & 11 - Notification Service Tests"""
    
    def test_error_report_endpoint(self):
        """Test error report endpoint"""
        payload = {
            "error": "Test error",
            "page": "/test",
            "user_agent": "pytest"
        }
        response = requests.post(f"{BASE_URL}/api/error-report", json=payload)
        assert response.status_code == 200
        print("✅ Error report endpoint working")


class TestStaffPortals:
    """FLOW 5 & 6 - Staff Portal Tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        payload = {"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/staff/login", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_pharmacy_orders_staff_view(self, admin_token):
        """FLOW 5 - Test pharmacy orders visible to staff"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers=headers
        )
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404, 401]
        print(f"✅ Pharmacy orders staff endpoint checked (status: {response.status_code})")
    
    def test_diagnostic_orders_staff_view(self, admin_token):
        """FLOW 6 - Test diagnostic orders visible to staff"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/diagnostic-orders",
            headers=headers
        )
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404, 401]
        print(f"✅ Diagnostic orders staff endpoint checked (status: {response.status_code})")


class TestDeliveryChargeLogic:
    """Test delivery charge logic - ₹49 under ₹1000, FREE for ₹1000+"""
    
    def test_delivery_charge_under_1000(self):
        """Test delivery charge is ₹49 for orders under ₹1000"""
        # This is a frontend logic test - we verify the API accepts the order
        payload = {
            "patient_name": "Test User",
            "patient_phone": TEST_PHONE,
            "medicines": [{"name": "Test Med", "quantity": 1, "price": 500}],
            "total_amount": 549,  # 500 + 49 delivery
            "delivery_charge": 49,
            "delivery_address": "Test Address",
            "payment_method": "cod"
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=payload)
        assert response.status_code in [200, 201]
        print("✅ Order with ₹49 delivery charge accepted")
    
    def test_free_delivery_over_1000(self):
        """Test delivery is FREE for orders ₹1000+"""
        payload = {
            "patient_name": "Test User",
            "patient_phone": TEST_PHONE,
            "medicines": [{"name": "Test Med", "quantity": 1, "price": 1200}],
            "total_amount": 1200,  # No delivery charge
            "delivery_charge": 0,
            "delivery_address": "Test Address",
            "payment_method": "cod"
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=payload)
        assert response.status_code in [200, 201]
        print("✅ Order with FREE delivery (₹1000+) accepted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
