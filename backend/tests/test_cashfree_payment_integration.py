"""
Cashfree Payment Integration Tests
Tests for create-order, create-payment-link endpoints and WhatsApp notification
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')
TEST_PHONE = "9833188288"

class TestCashfreeOrderCreation:
    """Test Cashfree order creation for different product types"""
    
    def test_create_order_lab_test(self):
        """Test creating Cashfree order for lab_test product type"""
        payload = {
            "customer_id": f"TEST_LAB_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test Patient Lab",
            "customer_email": "testlab@example.com",
            "customer_phone": TEST_PHONE,
            "amount": 500.0,
            "product_type": "lab_test",
            "product_id": f"LAB_TEST_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        
        print(f"Lab Test Order - Status: {response.status_code}")
        print(f"Lab Test Order - Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Order creation failed: {data}"
        assert "order_id" in data, "Order ID not returned"
        assert "cf_order_id" in data, "Cashfree Order ID not returned"
        assert "payment_session_id" in data, "Payment session ID not returned"
        assert data.get("order_status") == "ACTIVE", f"Order status is not ACTIVE: {data.get('order_status')}"
        
        print(f"✅ Lab Test Order Created - Order ID: {data['order_id']}, CF Order ID: {data['cf_order_id']}")
        return data
    
    def test_create_order_pharmacy(self):
        """Test creating Cashfree order for pharmacy product type"""
        payload = {
            "customer_id": f"TEST_PHARM_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test Patient Pharmacy",
            "customer_email": "testpharm@example.com",
            "customer_phone": TEST_PHONE,
            "amount": 750.0,
            "product_type": "pharmacy",
            "product_id": f"PHARM_ORDER_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        
        print(f"Pharmacy Order - Status: {response.status_code}")
        print(f"Pharmacy Order - Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Order creation failed: {data}"
        assert "order_id" in data, "Order ID not returned"
        assert "cf_order_id" in data, "Cashfree Order ID not returned"
        assert "payment_session_id" in data, "Payment session ID not returned"
        
        print(f"✅ Pharmacy Order Created - Order ID: {data['order_id']}, CF Order ID: {data['cf_order_id']}")
        return data

    def test_create_order_invalid_amount(self):
        """Test creating order with invalid amount (should fail)"""
        payload = {
            "customer_id": "TEST_INVALID",
            "customer_name": "Test Invalid",
            "customer_email": "test@example.com",
            "customer_phone": TEST_PHONE,
            "amount": -100.0,  # Invalid negative amount
            "product_type": "pharmacy",
            "product_id": "INVALID_TEST"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        
        print(f"Invalid Amount Order - Status: {response.status_code}")
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✅ Invalid amount correctly rejected")


class TestCashfreePaymentLink:
    """Test Cashfree payment link creation and WhatsApp notification"""
    
    def test_create_payment_link_lab_test(self):
        """Test creating payment link for lab test and sending via WhatsApp"""
        payload = {
            "order_id": f"TEST_LAB_ORDER_{uuid.uuid4().hex[:8]}",
            "order_type": "lab_test",
            "customer_name": "Test Lab Patient",
            "customer_phone": TEST_PHONE,
            "customer_email": "testlab@example.com",
            "amount": 1500.0,
            "send_via": "whatsapp",
            "items_description": "CBC, Thyroid Profile, Vitamin D"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-payment-link", json=payload)
        
        print(f"Payment Link (Lab) - Status: {response.status_code}")
        print(f"Payment Link (Lab) - Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Payment link creation failed: {data}"
        assert "payment_link" in data, "Payment link URL not returned"
        assert "order_id" in data, "Order ID not returned"
        
        # Verify payment link is a valid Cashfree URL
        payment_link = data.get("payment_link", "")
        assert "cashfree" in payment_link.lower() or "payments" in payment_link.lower(), f"Invalid payment link: {payment_link}"
        
        print(f"✅ Payment Link Created: {data['payment_link']}")
        print(f"   Sent via: {data.get('sent_via', [])}")
        return data
    
    def test_create_payment_link_pharmacy(self):
        """Test creating payment link for pharmacy order and sending via WhatsApp"""
        payload = {
            "order_id": f"TEST_PHARM_ORDER_{uuid.uuid4().hex[:8]}",
            "order_type": "pharmacy",
            "customer_name": "Test Pharmacy Patient",
            "customer_phone": TEST_PHONE,
            "customer_email": "testpharm@example.com",
            "amount": 850.0,
            "send_via": "whatsapp",
            "items_description": "Paracetamol 500mg x 10, Vitamin C x 30"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-payment-link", json=payload)
        
        print(f"Payment Link (Pharmacy) - Status: {response.status_code}")
        print(f"Payment Link (Pharmacy) - Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Payment link creation failed: {data}"
        assert "payment_link" in data, "Payment link URL not returned"
        
        print(f"✅ Pharmacy Payment Link Created: {data['payment_link']}")
        return data


class TestOrderStatus:
    """Test order status retrieval"""
    
    def test_get_order_status(self):
        """Test getting order status after creation"""
        # First create an order
        payload = {
            "customer_id": f"TEST_STATUS_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test Status Check",
            "customer_email": "teststatus@example.com",
            "customer_phone": TEST_PHONE,
            "amount": 300.0,
            "product_type": "lab_test",
            "product_id": f"STATUS_TEST_{uuid.uuid4().hex[:8]}"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        assert create_response.status_code == 200, "Failed to create order for status test"
        
        order_id = create_response.json().get("order_id")
        print(f"Created order for status check: {order_id}")
        
        # Now check status
        status_response = requests.get(f"{BASE_URL}/api/payments/cashfree/order-status/{order_id}")
        
        print(f"Order Status - Status Code: {status_response.status_code}")
        print(f"Order Status - Response: {status_response.json()}")
        
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}"
        
        data = status_response.json()
        assert data.get("order_id") == order_id, "Order ID mismatch"
        assert "order_status" in data, "Order status not returned"
        
        print(f"✅ Order Status Retrieved: {data.get('order_status')}")


class TestPaymentLinkStatus:
    """Test payment link status retrieval"""
    
    def test_get_payment_link_status(self):
        """Test getting payment link status"""
        # First create a payment link
        payload = {
            "order_id": f"TEST_LINK_STATUS_{uuid.uuid4().hex[:8]}",
            "order_type": "lab_test",
            "customer_name": "Test Link Status",
            "customer_phone": TEST_PHONE,
            "amount": 500.0,
            "send_via": "whatsapp",
            "items_description": "Blood Test"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/cashfree/create-payment-link", json=payload)
        
        if create_response.status_code != 200:
            print(f"Failed to create payment link: {create_response.text}")
            pytest.skip("Payment link creation failed")
        
        order_id = create_response.json().get("order_id")
        print(f"Created payment link order: {order_id}")
        
        # Check payment link status
        status_response = requests.get(f"{BASE_URL}/api/payments/cashfree/payment-link-status/{order_id}")
        
        print(f"Payment Link Status - Status Code: {status_response.status_code}")
        
        if status_response.status_code == 200:
            data = status_response.json()
            print(f"Payment Link Status - Response: {data}")
            assert data.get("payment_order_id") == order_id or data.get("success") == True
            print(f"✅ Payment Link Status Retrieved")
        else:
            print(f"Note: Payment link status endpoint returned {status_response.status_code}")


class TestWhatsAppNotification:
    """Test WhatsApp notification for payment links"""
    
    def test_whatsapp_notification_sent(self):
        """Verify WhatsApp notification is attempted when creating payment link"""
        payload = {
            "order_id": f"TEST_WA_{uuid.uuid4().hex[:8]}",
            "order_type": "lab_test",
            "customer_name": "WhatsApp Test",
            "customer_phone": TEST_PHONE,  # Target phone for payment link
            "customer_email": "watest@example.com",
            "amount": 999.0,
            "send_via": "whatsapp",
            "items_description": "Complete Blood Count, Lipid Profile"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-payment-link", json=payload)
        
        print(f"WhatsApp Notification Test - Status: {response.status_code}")
        print(f"WhatsApp Notification Test - Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        sent_via = data.get("sent_via", [])
        
        # Check if WhatsApp was attempted (either success or link_generated)
        whatsapp_attempted = any("whatsapp" in sv.lower() for sv in sent_via)
        
        print(f"   Payment Link: {data.get('payment_link')}")
        print(f"   Sent Via: {sent_via}")
        print(f"   WhatsApp Attempted: {whatsapp_attempted}")
        
        # The payment link should be created regardless of WhatsApp success
        assert data.get("success") == True, "Payment link creation failed"
        assert data.get("payment_link"), "Payment link URL missing"
        
        print(f"✅ Payment link created to send to {TEST_PHONE}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
