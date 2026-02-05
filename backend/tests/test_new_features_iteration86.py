"""
Iteration 86: Backend API Tests
Testing:
1. WhatsApp OTP Send to test phone 9833188288 - POST /api/otp/whatsapp/send
2. WhatsApp OTP Verify - POST /api/otp/whatsapp/verify
3. Image Search API - GET /api/pharmacy/image-search?query=paracetamol
4. Mango Labs Send Report - POST /api/mango/bookings/{id}/send-report
5. Orange Pharmacy Send Invoice - POST /api/pharmacy/orders/{id}/send-invoice
"""

import pytest
import requests
import os
import random
import time

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STAFF_PHARMACY_USERNAME = "staff_pharmacy"
STAFF_PHARMACY_PASSWORD = "12345678"
STAFF_MANGO_USERNAME = "staff_mango"
STAFF_MANGO_PASSWORD = "12345678"
TEST_PHONE = "9833188288"


def get_pharmacy_staff_token():
    """Get authentication token for pharmacy staff"""
    response = requests.post(f"{BASE_URL}/api/staff/login", json={
        "username": STAFF_PHARMACY_USERNAME,
        "password": STAFF_PHARMACY_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


def get_mango_staff_token():
    """Get authentication token for mango labs staff"""
    response = requests.post(f"{BASE_URL}/api/staff/login", json={
        "username": STAFF_MANGO_USERNAME,
        "password": STAFF_MANGO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


class TestWhatsAppOTPToRealPhone:
    """Test WhatsApp OTP to actual test phone 9833188288"""
    
    def test_send_otp_to_test_phone(self):
        """Test sending OTP to the real test phone number"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": TEST_PHONE,
            "purpose": "verification"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "expires_in" in data
        assert data["expires_in"] == 300  # 5 minutes
        print(f"✓ OTP sent to test phone {TEST_PHONE}: {data}")
        
        # Store OTP if returned in mock mode for verification test
        return data.get("otp")
    
    def test_send_otp_signup_purpose(self):
        """Test sending OTP for signup purpose"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": TEST_PHONE,
            "purpose": "signup"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Signup OTP sent: {data}")
    
    def test_send_otp_guest_login_purpose(self):
        """Test sending OTP for guest login"""
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": TEST_PHONE,
            "purpose": "guest_login"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Guest login OTP sent: {data}")


class TestWhatsAppOTPVerify:
    """Test WhatsApp OTP verification endpoint"""
    
    def test_verify_invalid_otp(self):
        """Test verification with invalid OTP code"""
        # First send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": TEST_PHONE,
            "purpose": "verification"
        })
        assert send_resp.status_code == 200
        
        # Try to verify with wrong OTP
        verify_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": TEST_PHONE,
            "otp": "000000"
        })
        
        # Should reject invalid OTP
        assert verify_resp.status_code == 400
        data = verify_resp.json()
        assert "Invalid OTP" in data.get("detail", "")
        print(f"✓ Invalid OTP rejected: {data}")
    
    def test_verify_otp_format_validation(self):
        """Test OTP must be 6 digits"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": TEST_PHONE,
            "purpose": "verification"
        })
        
        # Try with 5 digits
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
            "phone": TEST_PHONE,
            "otp": "12345"  # Only 5 digits
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "6 digits" in data.get("detail", "")
        print(f"✓ Non-6-digit OTP rejected: {data}")
    
    def test_verify_full_flow_if_mock_mode(self):
        """Test complete verification flow if running in mock mode"""
        # Send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json={
            "phone": TEST_PHONE,
            "purpose": "signup"
        })
        assert send_resp.status_code == 200
        send_data = send_resp.json()
        
        # Check if mock mode returns OTP
        mock_otp = send_data.get("otp")
        
        if mock_otp:
            # Verify with correct OTP
            verify_resp = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json={
                "phone": TEST_PHONE,
                "otp": mock_otp
            })
            
            assert verify_resp.status_code == 200
            verify_data = verify_resp.json()
            assert verify_data.get("success") == True
            assert verify_data.get("message") == "OTP verified successfully"
            print(f"✓ Full OTP flow verified in mock mode: {verify_data}")
        else:
            print(f"✓ OTP sent (production mode - OTP not exposed)")


class TestImageSearchAPI:
    """Test GET /api/pharmacy/image-search endpoint"""
    
    def test_image_search_requires_auth(self):
        """Test image search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/image-search", params={
            "query": "paracetamol"
        })
        
        # Should require authentication
        assert response.status_code == 401
        print(f"✓ Image search requires auth: {response.status_code}")
    
    def test_image_search_paracetamol(self):
        """Test image search for paracetamol"""
        token = get_pharmacy_staff_token()
        assert token is not None, "Failed to get pharmacy staff token"
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/image-search",
            params={"query": "paracetamol"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "images" in data
        assert len(data["images"]) > 0
        
        # Verify image structure
        first_image = data["images"][0]
        assert "id" in first_image
        assert "preview_url" in first_image or "full_url" in first_image
        print(f"✓ Image search for paracetamol: {len(data['images'])} images found")
    
    def test_image_search_medicine(self):
        """Test image search for generic medicine query"""
        token = get_pharmacy_staff_token()
        assert token is not None, "Failed to get pharmacy staff token"
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/image-search",
            params={"query": "medicine"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "images" in data
        print(f"✓ Image search for medicine: {len(data.get('images', []))} images")
    
    def test_image_search_antibiotics(self):
        """Test image search for antibiotics"""
        token = get_pharmacy_staff_token()
        assert token is not None, "Failed to get pharmacy staff token"
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/image-search",
            params={"query": "antibiotics"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Image search for antibiotics: {data}")


class TestSendInvoiceAPI:
    """Test POST /api/pharmacy/orders/{id}/send-invoice endpoint"""
    
    def test_send_invoice_requires_auth(self):
        """Test send invoice requires authentication"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/orders/test-order/send-invoice")
        
        assert response.status_code == 401
        print(f"✓ Send invoice requires auth: {response.status_code}")
    
    def test_send_invoice_order_not_found(self):
        """Test send invoice for non-existent order"""
        token = get_pharmacy_staff_token()
        assert token is not None, "Failed to get pharmacy staff token"
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/orders/non-existent-order/send-invoice",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        print(f"✓ Send invoice for non-existent order: {data}")
    
    def test_send_invoice_no_invoice_uploaded(self):
        """Test send invoice when no invoice is uploaded - creates test order first"""
        token = get_pharmacy_staff_token()
        assert token is not None, "Failed to get pharmacy staff token"
        
        # Get existing orders
        orders_resp = requests.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if orders_resp.status_code == 200:
            orders = orders_resp.json().get("orders", [])
            # Find an order without invoice uploaded
            order_without_invoice = None
            for order in orders:
                if not order.get("invoice_uploaded"):
                    order_without_invoice = order
                    break
            
            if order_without_invoice:
                order_id = order_without_invoice.get("order_id")
                response = requests.post(
                    f"{BASE_URL}/api/pharmacy/orders/{order_id}/send-invoice",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                assert response.status_code == 400
                data = response.json()
                assert "No invoice uploaded" in data.get("detail", "")
                print(f"✓ Send invoice without upload rejected: {data}")
            else:
                print(f"✓ All orders have invoices uploaded - skipping test")
        else:
            print(f"✓ No orders available - skipping test")


class TestSendReportAPI:
    """Test POST /api/mango/bookings/{id}/send-report endpoint"""
    
    def test_send_report_requires_auth(self):
        """Test send report requires authentication"""
        response = requests.post(f"{BASE_URL}/api/mango/bookings/test-booking/send-report")
        
        assert response.status_code == 401
        print(f"✓ Send report requires auth: {response.status_code}")
    
    def test_send_report_booking_not_found(self):
        """Test send report for non-existent booking"""
        token = get_mango_staff_token()
        assert token is not None, "Failed to get mango labs staff token"
        
        response = requests.post(
            f"{BASE_URL}/api/mango/bookings/non-existent-booking/send-report",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        print(f"✓ Send report for non-existent booking: {data}")
    
    def test_send_report_no_report_uploaded(self):
        """Test send report when no report is uploaded"""
        token = get_mango_staff_token()
        assert token is not None, "Failed to get mango labs staff token"
        
        # Get existing bookings
        bookings_resp = requests.get(
            f"{BASE_URL}/api/mango/bookings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if bookings_resp.status_code == 200:
            bookings = bookings_resp.json().get("bookings", [])
            # Find a booking without report uploaded
            booking_without_report = None
            for booking in bookings:
                if not booking.get("report_uploaded"):
                    booking_without_report = booking
                    break
            
            if booking_without_report:
                booking_id = booking_without_report.get("booking_id")
                response = requests.post(
                    f"{BASE_URL}/api/mango/bookings/{booking_id}/send-report",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                assert response.status_code == 400
                data = response.json()
                assert "No report uploaded" in data.get("detail", "")
                print(f"✓ Send report without upload rejected: {data}")
            else:
                print(f"✓ All bookings have reports uploaded - skipping test")
        else:
            print(f"✓ No bookings available - skipping test")


class TestPharmacyStaffAPIs:
    """Test pharmacy staff portal APIs"""
    
    def test_get_pharmacy_orders(self):
        """Test getting pharmacy orders"""
        token = get_pharmacy_staff_token()
        assert token is not None, "Failed to get pharmacy staff token"
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "status_counts" in data
        print(f"✓ Get pharmacy orders: {len(data.get('orders', []))} orders")
    
    def test_get_pharmacy_dashboard_stats(self):
        """Test pharmacy dashboard stats"""
        token = get_pharmacy_staff_token()
        assert token is not None, "Failed to get pharmacy staff token"
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "today_orders" in data
        assert "pending_orders" in data
        print(f"✓ Pharmacy dashboard stats: {data}")


class TestMangoLabsStaffAPIs:
    """Test Mango Labs staff portal APIs"""
    
    def test_get_mango_bookings(self):
        """Test getting lab bookings"""
        token = get_mango_staff_token()
        assert token is not None, "Failed to get mango labs staff token"
        
        response = requests.get(
            f"{BASE_URL}/api/mango/bookings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data
        assert "status_counts" in data
        print(f"✓ Get mango bookings: {len(data.get('bookings', []))} bookings")
    
    def test_get_mango_dashboard_stats(self):
        """Test mango labs dashboard stats"""
        token = get_mango_staff_token()
        assert token is not None, "Failed to get mango labs staff token"
        
        response = requests.get(
            f"{BASE_URL}/api/mango/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "today_bookings" in data
        assert "pending_collection" in data
        print(f"✓ Mango labs dashboard stats: {data}")


class TestMSG91WhatsAppIntegration:
    """Test MSG91 WhatsApp templates"""
    
    def test_msg91_status(self):
        """Test MSG91 WhatsApp configuration status"""
        response = requests.get(f"{BASE_URL}/api/test/msg91-status")
        
        assert response.status_code == 200
        data = response.json()
        assert "configured" in data or "auth_key" in str(data).lower()
        print(f"✓ MSG91 status: {data}")
    
    def test_msg91_proton_report_ready_template(self):
        """Test MSG91 proton_report_ready template (for send-report)"""
        response = requests.post(f"{BASE_URL}/api/test/send-whatsapp", json={
            "phone": TEST_PHONE,
            "template": "proton_report_ready"
        })
        
        assert response.status_code == 200
        data = response.json()
        # MSG91 template test may succeed or return info about template
        print(f"✓ MSG91 proton_report_ready template test: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
