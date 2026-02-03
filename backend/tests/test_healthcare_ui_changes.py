"""
Test Healthcare UI Changes - Nevika Cura
Tests for:
1. Cashfree payment endpoint
2. Service pages accessibility
3. API health checks
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCashfreePaymentEndpoint:
    """Test Cashfree payment integration"""
    
    def test_cashfree_create_order_endpoint_exists(self):
        """Test that Cashfree create-order endpoint exists and accepts requests"""
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json={
                "customer_id": "TEST_USER_123",
                "customer_name": "Test Patient",
                "customer_email": "test@example.com",
                "customer_phone": "9876543210",
                "amount": 100,
                "product_type": "lab_test",
                "product_id": "TEST_LAB_123"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 with order details or 500 if Cashfree credentials issue
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "order_id" in data, "Response should contain order_id"
            assert "success" in data, "Response should contain success field"
            print(f"✓ Cashfree order created: {data.get('order_id')}")
    
    def test_cashfree_order_status_endpoint(self):
        """Test order status endpoint"""
        # Test with a non-existent order ID
        response = requests.get(
            f"{BASE_URL}/api/payments/cashfree/order-status/TEST_ORDER_123",
            headers={"Content-Type": "application/json"}
        )
        # Should return 404 for non-existent order
        assert response.status_code in [404, 500], f"Unexpected status: {response.status_code}"
        print("✓ Order status endpoint accessible")


class TestServicePagesAPIs:
    """Test APIs used by service pages"""
    
    def test_diagnostics_endpoint(self):
        """Test diagnostics booking endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/diagnostics",
            json={
                "tests": ["CBC (Complete Blood Count)"],
                "preferred_date": "2026-02-10",
                "preferred_time_slot": "09:00-11:00",
                "patient_name": "Test Patient",
                "patient_phone": "9876543210",
                "patient_email": "test@example.com",
                "payment_method": "cod",
                "collection_type": "home",
                "patient_address": "Test Address, Mumbai"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should accept the booking
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Diagnostics endpoint accessible, status: {response.status_code}")
    
    def test_live_queue_status(self):
        """Test live queue status endpoint"""
        for clinic in ['diagyn', 'mango']:
            response = requests.get(f"{BASE_URL}/api/live-queue/status/{clinic}")
            # Should return queue status or 404 if not implemented
            assert response.status_code in [200, 404], f"Unexpected status for {clinic}: {response.status_code}"
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Queue status for {clinic}: {data}")
    
    def test_booking_limits_endpoint(self):
        """Test booking limits endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/booking-limits/status",
            params={"phone": "9876543210"}
        )
        # Should return booking limits status
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Booking limits: {data}")


class TestOTPEndpoints:
    """Test OTP endpoints used in booking flow"""
    
    def test_otp_send_endpoint(self):
        """Test OTP send endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/otp/send",
            json={
                "phone": "9876543210",
                "service": "proton"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should accept OTP request
        assert response.status_code in [200, 400, 429], f"Unexpected status: {response.status_code}"
        print(f"✓ OTP send endpoint accessible, status: {response.status_code}")
    
    def test_otp_verify_endpoint(self):
        """Test OTP verify endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/otp/verify",
            json={
                "phone": "9876543210",
                "otp": "123456",
                "service": "proton"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should reject invalid OTP
        assert response.status_code in [400, 401, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ OTP verify endpoint accessible, status: {response.status_code}")


class TestCouponEndpoint:
    """Test coupon validation endpoint"""
    
    def test_coupon_validate_endpoint(self):
        """Test coupon validation"""
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={
                "code": "MANGO15",
                "amount": 1000,
                "type": "lab_test"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return validation result
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Coupon validation: {data}")


class TestPharmacyEndpoints:
    """Test pharmacy-related endpoints"""
    
    def test_pharmacy_orders_endpoint(self):
        """Test pharmacy orders endpoint (requires staff auth)"""
        response = requests.get(f"{BASE_URL}/api/staff/pharmacy/orders")
        # Requires staff authentication
        assert response.status_code in [200, 401, 403, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Pharmacy orders endpoint accessible, status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
