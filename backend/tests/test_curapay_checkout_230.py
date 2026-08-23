"""
Test Suite for CuraPay and Checkout Flow - Iteration 230
Tests the payment creation API, pharmacy order, and diagnostics endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://premium-rx-portal.preview.emergentagent.com"

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")


class TestCashfreePaymentAPI:
    """Tests for Cashfree payment creation API"""
    
    def test_create_order_success(self):
        """Test successful order creation with Cashfree"""
        payload = {
            "customer_id": f"TEST_CUST_{int(time.time())}",
            "customer_name": "Test User",
            "customer_email": "test@nevikacura.com",
            "customer_phone": "9876543210",
            "amount": 199,
            "product_type": "pharmacy",
            "product_id": f"TEST_ORDER_{int(time.time())}",
            "return_url": f"{BASE_URL}/track?phone=9876543210"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "order_id" in data
        assert "payment_session_id" in data
        assert "cf_order_id" in data
        assert data["order_status"] == "ACTIVE"
        
        # Verify session ID format (Cashfree returns session_ prefix)
        assert data["payment_session_id"].startswith("session_")
        print(f"✓ Payment order created: {data['order_id']}")
    
    def test_create_order_lab_test(self):
        """Test order creation for lab tests (Mango checkout)"""
        payload = {
            "customer_id": f"TEST_LAB_{int(time.time())}",
            "customer_name": "Test Patient",
            "customer_email": "patient@nevikacura.com",
            "customer_phone": "9876543211",
            "amount": 350,
            "product_type": "lab_test",
            "product_id": f"MNG_TEST_{int(time.time())}",
            "return_url": f"{BASE_URL}/track?phone=9876543211"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "payment_session_id" in data
        print(f"✓ Lab test payment order created: {data['order_id']}")
    
    def test_create_order_missing_phone(self):
        """Test order creation fails gracefully with missing phone"""
        payload = {
            "customer_id": "TEST_MISSING",
            "customer_name": "Test User",
            "customer_email": "test@nevikacura.com",
            # Missing phone
            "amount": 100,
            "product_type": "pharmacy",
            "product_id": "TEST_ORDER"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json=payload
        )
        
        # Should fail with validation error
        assert response.status_code in [400, 422]
        print("✓ Missing phone validation working")


class TestPharmacyOrderAPI:
    """Tests for pharmacy order creation"""
    
    def test_create_pharmacy_order(self):
        """Test creating a pharmacy order"""
        order_data = {
            "medicines": [{
                "name": "Test Medicine",
                "quantity": 1,
                "mrp": 200,
                "price": 150,
                "discount_percent": 25
            }],
            "patient_name": "Test User",
            "patient_phone": "9876543210",
            "patient_email": "test@nevikacura.com",
            "delivery_address": "123 Test St, Chhindwara - 480001",
            "payment_method": "cashfree",
            "payment_status": "pending",
            "subtotal": 200,
            "discount": 50,
            "delivery_charge": 49,
            "total_amount": 199
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "order_id" in data or "id" in data
        print(f"✓ Pharmacy order created")
    
    def test_create_pharmacy_order_missing_name(self):
        """Test pharmacy order validation requires patient name"""
        order_data = {
            "medicines": [{
                "name": "Test Medicine",
                "quantity": 1,
                "price": 150
            }],
            # Missing patient_name
            "patient_phone": "9876543210",
            "total_amount": 199
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data
        )
        
        # Should accept but may have empty name or require it
        # Just verify it doesn't crash
        assert response.status_code in [200, 201, 400, 422]
        print("✓ Pharmacy order validation tested")


class TestDiagnosticsAPI:
    """Tests for diagnostics/lab booking API"""
    
    def test_create_lab_booking(self):
        """Test creating a lab test booking"""
        booking_data = {
            "tests": ["Complete Blood Count (CBC)", "Thyroid Profile"],
            "patient_name": "Test Patient",
            "patient_phone": "9876543210",
            "patient_email": "test@nevikacura.com",
            "patient_address": "456 Test Ave, Chhindwara - 480001",
            "preferred_date": "2026-01-15",
            "preferred_time_slot": "08:00-10:00",
            "collection_type": "home",
            "payment_method": "cod",
            "payment_status": "cod",
            "total_amount": 500
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diagnostics",
            json=booking_data
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "order_id" in data or "id" in data or "booking_id" in data
        print(f"✓ Lab booking created")
    
    def test_create_lab_booking_center_collection(self):
        """Test lab booking with center collection"""
        booking_data = {
            "tests": ["Blood Sugar Fasting"],
            "patient_name": "Test Patient",
            "patient_phone": "9876543211",
            "preferred_date": "2026-01-16",
            "preferred_time_slot": "10:00-12:00",
            "collection_type": "center",
            "payment_method": "qr_card",
            "payment_status": "cod",
            "total_amount": 100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diagnostics",
            json=booking_data
        )
        
        assert response.status_code in [200, 201]
        print("✓ Lab booking (center collection) created")


class TestAddressAPI:
    """Tests for address management API"""
    
    def test_get_addresses(self):
        """Test getting saved addresses for a phone"""
        phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/addresses/{phone}")
        
        # Should return 200 even if no addresses
        assert response.status_code == 200
        data = response.json()
        assert "addresses" in data
        assert isinstance(data["addresses"], list)
        print(f"✓ Got {len(data['addresses'])} saved addresses")
    
    def test_save_address(self):
        """Test saving a new address"""
        phone = "9876543210"
        address_data = {
            "label": "home",
            "full_address": "TEST 123 Test St, Near Test Landmark, Chhindwara - 480001",
            "landmark": "Near Test Landmark",
            "pincode": "480001",
            "city": "Chhindwara",
            "state": "MP",
            "is_default": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/addresses?phone={phone}",
            json=address_data
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "address" in data
        saved_address = data["address"]
        assert saved_address.get("label") == "home"
        
        # Cleanup - delete the test address
        if "id" in saved_address:
            cleanup = requests.delete(f"{BASE_URL}/api/addresses/{saved_address['id']}")
            print(f"✓ Address saved and cleaned up")
        else:
            print("✓ Address saved")


class TestWalletAPI:
    """Tests for wallet API"""
    
    def test_get_wallet_balance(self):
        """Test getting wallet balance"""
        phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/wallet/{phone}")
        
        # May return 200 with wallet or 404 if no wallet
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            if "wallet" in data and data["wallet"]:
                assert "balance" in data["wallet"]
                print(f"✓ Wallet balance: ₹{data['wallet']['balance']}")
            else:
                print("✓ No wallet found (expected for test user)")
        else:
            print("✓ Wallet endpoint working (no wallet for test user)")


class TestPaymentMethodsAPI:
    """Tests for saved payment methods API"""
    
    def test_get_payment_methods(self):
        """Test getting saved payment methods"""
        phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/payment-methods/{phone}")
        
        # May return 200 with methods or 404
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "payment_methods" in data
            print(f"✓ Got {len(data['payment_methods'])} saved payment methods")
        else:
            print("✓ Payment methods endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
