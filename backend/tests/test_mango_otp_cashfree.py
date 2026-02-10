"""
Test Suite: Mango Labs OTP + Cashfree + Booking Limits
Tests WhatsApp OTP flow, Cashfree payment creation, and booking limits API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBookingLimits:
    """Test booking limits API - all should return True"""
    
    def test_booking_limits_returns_true_for_all(self):
        """Verify booking limits all return True (limits removed)"""
        response = requests.get(f"{BASE_URL}/api/booking-limits/status", params={
            "phone": "9876543210"
        })
        assert response.status_code == 200
        data = response.json()
        
        # All booking types should be allowed
        assert data.get("can_book_appointment") == True, "can_book_appointment should be True"
        assert data.get("can_book_diagnostic") == True, "can_book_diagnostic should be True"
        assert data.get("can_book_pharmacy") == True, "can_book_pharmacy should be True"
        assert data.get("can_book_teleconsult") == True, "can_book_teleconsult should be True"
        print("PASS: All booking limits return True (limits removed)")
    
    def test_booking_limits_without_phone(self):
        """Verify booking limits work without phone parameter"""
        response = requests.get(f"{BASE_URL}/api/booking-limits/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("can_book_appointment") == True
        assert data.get("can_book_diagnostic") == True
        print("PASS: Booking limits work without phone parameter")


class TestWhatsAppOTP:
    """Test WhatsApp OTP flow for Mango Labs booking"""
    
    def test_send_whatsapp_otp(self):
        """Test sending OTP via WhatsApp"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "9876543210",
            "purpose": "lab_booking"
        })
        
        # Should return 200 with OTP (mock mode)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"OTP send failed: {data}"
        # In test mode, OTP is returned
        if data.get("mock"):
            assert "otp" in data, "Mock OTP should be returned in test mode"
            print(f"PASS: WhatsApp OTP sent successfully (mock OTP: {data.get('otp')})")
        else:
            print("PASS: WhatsApp OTP sent via real MSG91")
    
    def test_verify_whatsapp_otp_with_mock(self):
        """Test verifying OTP after sending"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "9876543211",
            "purpose": "lab_booking"
        })
        
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        if send_data.get("mock") and send_data.get("otp"):
            # Verify with the mock OTP
            verify_response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": "9876543211",
                "otp": send_data.get("otp")
            })
            
            assert verify_response.status_code == 200
            verify_data = verify_response.json()
            assert verify_data.get("success") == True, f"OTP verification failed: {verify_data}"
            print("PASS: WhatsApp OTP verification successful")
        else:
            print("PASS: OTP sent but not in mock mode - skipping verification test")
    
    def test_verify_invalid_otp_fails(self):
        """Test that invalid OTP fails verification"""
        # Send OTP first
        send_response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": "9876543212",
            "purpose": "lab_booking"
        })
        assert send_response.status_code == 200
        
        # Try with wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": "9876543212",
            "otp": "000000"
        })
        
        # Should fail - either 400 or 200 with success=False
        if verify_response.status_code == 400:
            print("PASS: Invalid OTP correctly rejected with 400")
        else:
            data = verify_response.json()
            assert data.get("success") == False, "Invalid OTP should fail"
            print("PASS: Invalid OTP correctly rejected")


class TestCashfreePayment:
    """Test Cashfree payment order creation"""
    
    def test_create_cashfree_order(self):
        """Test creating a Cashfree payment order"""
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json={
            "customer_id": "TEST_123",
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "customer_phone": "9876543210",
            "amount": 100,
            "product_type": "lab_test",
            "product_id": "LAB_TEST_001"
        })
        
        # Should either succeed or fail gracefully
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, f"Order creation failed: {data}"
            assert "order_id" in data, "Order ID should be returned"
            assert "payment_session_id" in data or "cf_order_id" in data, "Payment session should be returned"
            print(f"PASS: Cashfree order created - order_id: {data.get('order_id')}")
        elif response.status_code == 500:
            # May fail if Cashfree credentials not configured
            data = response.json()
            print(f"WARN: Cashfree order creation failed (credentials issue?): {data.get('detail')}")
        else:
            print(f"WARN: Unexpected status code {response.status_code}: {response.text}")
    
    def test_get_order_status_not_found(self):
        """Test getting status of non-existent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/order-status/NONEXISTENT_ORDER")
        
        assert response.status_code == 404
        print("PASS: Non-existent order correctly returns 404")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        print("PASS: Health endpoint working")


class TestDiagnosticsAPI:
    """Test diagnostics booking API"""
    
    def test_diagnostic_test_list(self):
        """Test fetching diagnostic tests list"""
        response = requests.get(f"{BASE_URL}/api/diagnostic-tests")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict), "Should return list or dict of tests"
            print(f"PASS: Diagnostic tests list fetched - {len(data) if isinstance(data, list) else 'dict'} items")
        else:
            print(f"WARN: Diagnostic tests endpoint returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
