"""
Payment Flow Tests for Nevika Cura
Tests:
1. Cashfree create-order API returns valid session
2. Pharmacy order API works for COD and pay_now
3. Diagnostics/Lab booking API works
4. Unified checkout API works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL not set")


class TestCashfreePayment:
    """Test Cashfree payment session creation"""
    
    def test_create_order_returns_session_id(self):
        """POST /api/payments/cashfree/create-order returns payment_session_id"""
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json={
            "customer_id": "TEST_9876543210",
            "customer_name": "Test User",
            "customer_email": "test@nevikacura.com",
            "customer_phone": "9876543210",
            "amount": 500,
            "product_type": "pharmacy",
            "product_id": "TEST_ORDER_123",
            "return_url": f"{BASE_URL}/track?phone=9876543210"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=true"
        assert "payment_session_id" in data, "Missing payment_session_id"
        assert "order_id" in data, "Missing order_id"
        assert len(data["payment_session_id"]) > 10, "payment_session_id seems invalid"
        print(f"✓ Cashfree session created: {data['order_id']}")


class TestPharmacyOrderAPI:
    """Test pharmacy order creation"""
    
    def test_pharmacy_cod_order(self):
        """POST /api/pharmacy creates order with COD payment"""
        response = requests.post(f"{BASE_URL}/api/pharmacy", json={
            "medicines": [{"name": "TEST_Paracetamol 500mg", "quantity": 2, "price": 25, "mrp": 30}],
            "patient_name": "Test COD User",
            "patient_phone": "9876543210",
            "delivery_address": "123 Test Street, Chhindwara - 480001",
            "payment_method": "cod",
            "payment_status": "pending"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing order id"
        assert data.get("payment_method") == "cod", "Payment method mismatch"
        print(f"✓ Pharmacy COD order created: {data['id']}")
    
    def test_pharmacy_pay_now_order(self):
        """POST /api/pharmacy creates order with pay_now payment"""
        response = requests.post(f"{BASE_URL}/api/pharmacy", json={
            "medicines": [{"name": "TEST_Vitamin D3 1000IU", "quantity": 1, "price": 350, "mrp": 400}],
            "patient_name": "Test PayNow User",
            "patient_phone": "9876543211",
            "delivery_address": "456 Test Road, Chhindwara - 480001",
            "payment_method": "pay_now",
            "payment_status": "pending"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing order id"
        assert data.get("payment_method") == "pay_now", "Payment method mismatch"
        print(f"✓ Pharmacy PayNow order created: {data['id']}")


class TestDiagnosticsOrderAPI:
    """Test lab/diagnostics order creation"""
    
    def test_lab_test_booking_cod(self):
        """POST /api/diagnostics creates lab booking with COD"""
        response = requests.post(f"{BASE_URL}/api/diagnostics", json={
            "tests": ["TEST_Complete Blood Count"],
            "preferred_date": "2026-03-15",
            "preferred_time_slot": "08:00-10:00",
            "collection_type": "home",
            "patient_name": "Test Lab User",
            "patient_phone": "9876543212",
            "patient_address": "789 Lab Street, Chhindwara - 480001",
            "payment_method": "cod",
            "payment_status": "pending",
            "total_amount": 450
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing booking id"
        assert data.get("payment_method") == "cod", "Payment method mismatch"
        print(f"✓ Lab booking created: {data['id']}")
    
    def test_lab_test_booking_pay_now(self):
        """POST /api/diagnostics creates lab booking with pay_now"""
        response = requests.post(f"{BASE_URL}/api/diagnostics", json={
            "tests": ["TEST_Thyroid Profile"],
            "preferred_date": "2026-03-16",
            "preferred_time_slot": "10:00-12:00",
            "collection_type": "home",
            "patient_name": "Test PayNow Lab User",
            "patient_phone": "9876543213",
            "patient_address": "101 PayNow Lab Street, Chhindwara - 480001",
            "payment_method": "pay_now",
            "payment_status": "pending",
            "total_amount": 550
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing booking id"
        print(f"✓ Lab PayNow booking created: {data['id']}")


class TestUnifiedCheckoutAPI:
    """Test unified checkout for pharmacy and lab"""
    
    def test_pharmacy_order_via_unified(self):
        """POST /api/pharmacy/order creates pharmacy order"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/order", json={
            "customer": {"name": "Test Unified User", "phone": "9876543214", "email": "unified@test.com"},
            "address": {"line1": "123 Unified Street", "city": "Chhindwara", "pincode": "480001"},
            "payment_method": "upi",
            "items": [{"name": "TEST_Aspirin 75mg", "price": 50, "quantity": 2, "type": "pharmacy"}],
            "subtotal": 100,
            "discount": 0,
            "delivery_fee": 0,
            "total": 100,
            "order_type": "pharmacy"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=true"
        assert "order_id" in data, "Missing order_id"
        print(f"✓ Unified pharmacy order created: {data['order_id']}")
    
    def test_lab_booking_via_unified(self):
        """POST /api/lab/booking creates lab booking"""
        response = requests.post(f"{BASE_URL}/api/lab/booking", json={
            "customer": {"name": "Test Lab Unified", "phone": "9876543215", "email": "labunified@test.com"},
            "address": {"line1": "456 Lab Unified Street", "city": "Chhindwara", "pincode": "480001"},
            "payment_method": "upi",
            "items": [{"name": "TEST_CBC", "price": 350, "quantity": 1, "type": "lab"}],
            "subtotal": 350,
            "discount": 0,
            "delivery_fee": 0,
            "total": 350,
            "order_type": "lab"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=true"
        assert "booking_id" in data, "Missing booking_id"
        print(f"✓ Unified lab booking created: {data['booking_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
