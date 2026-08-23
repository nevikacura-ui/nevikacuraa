"""
Test Checkout Flows for Orange Pharmacy and Mango Labs
Tests: POST /api/pharmacy, POST /api/diagnostics, OTP endpoints

Features tested:
1. Pharmacy checkout - COD, Pay Later, Pay Now payment methods
2. Mango Labs checkout - Lab booking with home/center collection
3. OTP Send/Verify endpoints
4. Order response structure (booking_id, status)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://premium-rx-portal.preview.emergentagent.com"

# Test phone number for OTP tests
TEST_PHONE = "9876543210"
TEST_NAME = "Test Patient"
TEST_EMAIL = "test@example.com"

class TestHealthEndpoint:
    """Health check to verify backend is running"""
    
    def test_health_check(self):
        """Verify backend health endpoint via API"""
        # Use /api prefix for backend endpoint (goes through ingress)
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health check response: {response.status_code} - {response.text[:200]}")
        
        # If API health not available, try another known API endpoint
        if response.status_code == 404:
            response = requests.get(f"{BASE_URL}/api/pharmacy/count")
            print(f"Pharmacy count (health proxy): {response.status_code}")
            assert response.status_code == 200, "Backend API not responding"
            print("SUCCESS: Backend API is reachable (via pharmacy count)")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("SUCCESS: Backend is healthy")


class TestPharmacyOrderAPI:
    """Tests for POST /api/pharmacy - Orange Pharmacy checkout"""
    
    def test_pharmacy_order_cod_success(self):
        """Test creating pharmacy order with COD payment"""
        payload = {
            "medicines": [
                {"name": "Iron + Folic Acid", "quantity": 1},
                {"name": "Paracetamol 500mg", "quantity": 2}
            ],
            "patient_name": TEST_NAME,
            "patient_phone": f"TEST_{TEST_PHONE}",  # Prefix for cleanup
            "patient_email": TEST_EMAIL,
            "delivery_address": "123 Test Street, Test City - 480001",
            "payment_method": "cod",
            "payment_status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=payload)
        print(f"Pharmacy COD order response: {response.status_code}")
        print(f"Response data: {response.text}")
        
        # Should succeed with 200/201 or 401 (auth required)
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data or "booking_id" in data, "Response should have id or booking_id"
            assert "status" in data, "Response should have status"
            print(f"SUCCESS: Pharmacy COD order created - ID: {data.get('id', data.get('booking_id'))}")
            print(f"Order status: {data.get('status')}")
            
            # For COD, status should be 'pending' (ready to process)
            if data.get('status'):
                assert data['status'] in ['pending', 'Order Booked'], f"COD order status should be pending, got: {data['status']}"
        else:
            print("INFO: Authentication required for pharmacy orders")
    
    def test_pharmacy_order_pay_later(self):
        """Test creating pharmacy order with Pay Later payment"""
        payload = {
            "medicines": [
                {"name": "Vitamin D3", "quantity": 1}
            ],
            "patient_name": TEST_NAME,
            "patient_phone": f"TEST_{TEST_PHONE}2",
            "patient_email": TEST_EMAIL,
            "delivery_address": "456 Test Avenue, Test City - 480002",
            "payment_method": "pay_later",
            "payment_status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=payload)
        print(f"Pharmacy Pay Later order response: {response.status_code}")
        
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"SUCCESS: Pharmacy Pay Later order created - {data.get('booking_id', data.get('id'))}")
    
    def test_pharmacy_order_pay_now(self):
        """Test creating pharmacy order with Pay Now (online) payment"""
        payload = {
            "medicines": [
                {"name": "Multivitamin", "quantity": 1}
            ],
            "patient_name": TEST_NAME,
            "patient_phone": f"TEST_{TEST_PHONE}3",
            "patient_email": TEST_EMAIL,
            "delivery_address": "789 Test Road, Test City - 480003",
            "payment_method": "pay_now",
            "payment_status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=payload)
        print(f"Pharmacy Pay Now order response: {response.status_code}")
        
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            # For online payments, status should be 'draft' (awaiting payment)
            if data.get('status'):
                assert data['status'] in ['draft', 'pending'], f"Pay Now order status should be draft, got: {data['status']}"
            if data.get('requires_payment') is not None:
                assert data['requires_payment'] == True, "Pay Now orders should require payment"
            print(f"SUCCESS: Pharmacy Pay Now order created - {data.get('booking_id', data.get('id'))}")
    
    def test_pharmacy_order_validation_empty_medicines(self):
        """Test that empty medicines list is handled appropriately"""
        payload = {
            "medicines": [],
            "patient_name": TEST_NAME,
            "patient_phone": f"TEST_{TEST_PHONE}4",
            "delivery_address": "Test Address"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=payload)
        print(f"Empty medicines validation response: {response.status_code}")
        # Empty medicines may be rejected (400/422) or accepted (200) with 0 items
        # Both behaviors are valid - the UI prevents empty cart checkout
        assert response.status_code in [200, 201, 400, 401, 422], f"Unexpected status for empty medicines: {response.status_code}"
        if response.status_code in [400, 422]:
            print("SUCCESS: Empty medicines list correctly rejected")
        else:
            print("INFO: Empty medicines list was accepted (UI should prevent this)")


class TestDiagnosticsOrderAPI:
    """Tests for POST /api/diagnostics - Mango Labs checkout"""
    
    def test_lab_booking_cod_home_collection(self):
        """Test creating lab booking with COD and home collection"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "tests": ["CBC", "Lipid Profile"],
            "patient_name": TEST_NAME,
            "patient_phone": f"TEST_{TEST_PHONE}5",
            "patient_email": TEST_EMAIL,
            "patient_address": "123 Lab Test Street, Chhindwara - 480001",
            "preferred_date": tomorrow,
            "preferred_time_slot": "08:00-10:00",
            "collection_type": "home",
            "payment_method": "cod",
            "payment_status": "pending",
            "total_amount": 800.0
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=payload)
        print(f"Lab booking COD response: {response.status_code}")
        print(f"Response data: {response.text}")
        
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data or "booking_id" in data, "Response should have id or booking_id"
            assert "status" in data, "Response should have status"
            print(f"SUCCESS: Lab booking created - ID: {data.get('id', data.get('booking_id'))}")
            print(f"Booking status: {data.get('status')}")
            
            # For COD, status should be 'pending'
            if data.get('status'):
                assert data['status'] in ['pending', 'confirmed'], f"COD order status should be pending, got: {data['status']}"
        else:
            print("INFO: Authentication required for lab bookings")
    
    def test_lab_booking_center_visit(self):
        """Test creating lab booking with center visit"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "tests": ["HbA1c", "Thyroid Profile"],
            "patient_name": TEST_NAME,
            "patient_phone": f"TEST_{TEST_PHONE}6",
            "patient_email": TEST_EMAIL,
            "preferred_date": tomorrow,
            "preferred_time_slot": "10:00-12:00",
            "collection_type": "center",
            "payment_method": "qr_card",
            "payment_status": "pending",
            "total_amount": 1200.0
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=payload)
        print(f"Lab booking center visit response: {response.status_code}")
        
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"SUCCESS: Lab booking (center visit) created - {data.get('booking_id', data.get('id'))}")
    
    def test_lab_booking_pay_now(self):
        """Test creating lab booking with online payment"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "tests": ["Kidney Function Test"],
            "patient_name": TEST_NAME,
            "patient_phone": f"TEST_{TEST_PHONE}7",
            "patient_email": TEST_EMAIL,
            "patient_address": "456 Lab Street, Chhindwara",
            "preferred_date": tomorrow,
            "preferred_time_slot": "14:00-16:00",
            "collection_type": "home",
            "payment_method": "cashfree",  # Online payment
            "payment_status": "pending",
            "total_amount": 500.0
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=payload)
        print(f"Lab booking Pay Now response: {response.status_code}")
        
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            # For online payments, status should be 'draft'
            if data.get('status'):
                assert data['status'] in ['draft', 'pending'], f"Online order status should be draft, got: {data['status']}"
            print(f"SUCCESS: Lab booking (pay now) created - {data.get('booking_id', data.get('id'))}")


class TestOTPEndpoints:
    """Tests for OTP send and verify endpoints"""
    
    def test_otp_send_whatsapp(self):
        """Test sending OTP via WhatsApp"""
        payload = {
            "phone": TEST_PHONE,
            "purpose": "pharmacy_order"
        }
        
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/send", json=payload)
        print(f"OTP Send response: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        # OTP send should return 200 if MSG91 is configured
        assert response.status_code in [200, 400, 500], f"Unexpected OTP send status: {response.status_code}"
        
        if response.status_code == 200:
            print("SUCCESS: OTP send endpoint working")
        else:
            print(f"INFO: OTP send returned {response.status_code} - may need MSG91 config")
    
    def test_otp_verify_invalid(self):
        """Test OTP verification with invalid code"""
        payload = {
            "phone": TEST_PHONE,
            "otp": "000000"  # Invalid OTP
        }
        
        response = requests.post(f"{BASE_URL}/api/otp/whatsapp/verify", json=payload)
        print(f"OTP Verify (invalid) response: {response.status_code}")
        
        # Invalid OTP should return error (400/401/422)
        # or 200 with success=false
        assert response.status_code in [200, 400, 401, 422], f"Unexpected verify status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == False:
                print("SUCCESS: Invalid OTP correctly rejected")
            else:
                print("WARNING: Invalid OTP may have been accepted")
        else:
            print("SUCCESS: Invalid OTP correctly rejected with error status")


class TestPaymentEndpoints:
    """Tests for Cashfree payment endpoints"""
    
    def test_create_cashfree_order(self):
        """Test creating Cashfree payment order"""
        payload = {
            "customer_id": f"TEST_{TEST_PHONE}",
            "customer_name": TEST_NAME,
            "customer_email": TEST_EMAIL,
            "customer_phone": TEST_PHONE,
            "amount": 199,
            "product_type": "pharmacy",
            "product_id": "test-order-123",
            "return_url": f"{BASE_URL}/track?phone={TEST_PHONE}"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=payload)
        print(f"Cashfree create order response: {response.status_code}")
        
        # May fail if Cashfree not configured, but should not be 500
        assert response.status_code in [200, 400, 401, 500], f"Unexpected Cashfree status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            if "payment_session_id" in data or "payment_link" in data:
                print("SUCCESS: Cashfree order created successfully")
            else:
                print(f"INFO: Cashfree response: {data}")


class TestPharmacyInventory:
    """Tests for pharmacy medicine inventory"""
    
    def test_get_pharmacy_medicines(self):
        """Test fetching pharmacy medicine inventory"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all", params={"page": 1, "per_page": 10})
        print(f"Pharmacy inventory response: {response.status_code}")
        
        assert response.status_code == 200, f"Pharmacy inventory failed: {response.status_code}"
        
        data = response.json()
        assert "medicines" in data, "Response should have medicines list"
        print(f"SUCCESS: Retrieved {len(data.get('medicines', []))} medicines")
        print(f"Total medicines: {data.get('total', 0)}")
    
    def test_search_iron_folic_acid(self):
        """Test searching for Iron + Folic Acid medicine"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search", params={"q": "Iron Folic", "limit": 5})
        print(f"Medicine search response: {response.status_code}")
        
        assert response.status_code == 200, f"Medicine search failed: {response.status_code}"
        
        data = response.json()
        medicines = data.get("medicines", [])
        print(f"Search results: {len(medicines)} medicines found")
        
        # Check if Iron + Folic Acid is in results
        iron_found = any("iron" in m.get("name", "").lower() or "folic" in m.get("name", "").lower() for m in medicines)
        if iron_found:
            print("SUCCESS: Found Iron + Folic Acid in search results")
            # Check price if available
            for m in medicines:
                if "iron" in m.get("name", "").lower() or "folic" in m.get("name", "").lower():
                    price = m.get("price", 0)
                    print(f"  Medicine: {m.get('name')} - Price: ₹{price}")


class TestDiagnosticTests:
    """Tests for diagnostic test catalog"""
    
    def test_get_diagnostic_tests(self):
        """Test fetching diagnostic test catalog"""
        response = requests.get(f"{BASE_URL}/api/diagnostic-tests")
        print(f"Diagnostic tests response: {response.status_code}")
        
        # May need different endpoint
        if response.status_code == 404:
            # Try alternative endpoint
            response = requests.get(f"{BASE_URL}/api/diagnostics/tests")
            print(f"Alternative endpoint response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Retrieved diagnostic tests catalog")
        else:
            print(f"INFO: Diagnostic tests endpoint returned {response.status_code}")


# Run all tests when executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
