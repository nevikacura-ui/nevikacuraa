"""
OTP-Based Delivery Verification Tests - Iteration 360
Tests for 6-digit order ID verification for pharmacy deliveries and lab sample collection.

Test Data:
- Pharmacy order: id=384729 (status: out_for_delivery) — verification code IS 384729
- Lab booking: booking_id=592741 (status: test_booked) — verification code IS 592741
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPharmacyDeliveryVerification:
    """Tests for POST /api/pharmacy/delivery/verify endpoint"""
    
    def test_delivery_verify_wrong_code_returns_error(self):
        """Verify that wrong verification code returns error"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "000000"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == False, f"Expected success=False, got {data}"
        assert "error" in data, f"Expected error message, got {data}"
        print(f"PASS: Wrong code returns error: {data.get('error')}")
    
    def test_delivery_verify_correct_code_marks_delivered(self):
        """Verify that correct code (order ID itself) marks order as delivered"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "384729"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "delivered" in data.get("message", "").lower() or data.get("delivered_at"), f"Expected delivery confirmation, got {data}"
        print(f"PASS: Correct code marks as delivered: {data}")
    
    def test_delivery_verify_already_delivered_returns_error(self):
        """Verify that already-delivered order returns error"""
        # First verify (should succeed or already be delivered from previous test)
        requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "384729"},
            headers={"Content-Type": "application/json"}
        )
        
        # Second verify should fail
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "384729"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == False, f"Expected success=False for already delivered, got {data}"
        assert "already" in data.get("error", "").lower(), f"Expected 'already delivered' error, got {data}"
        print(f"PASS: Already delivered returns error: {data.get('error')}")
    
    def test_delivery_verify_nonexistent_order_returns_404(self):
        """Verify that non-existent order returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "999999", "verification_code": "999999"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: Non-existent order returns 404")


class TestLabCollectionVerification:
    """Tests for POST /api/mango/collection/verify and GET /api/mango/collection/{id}/info endpoints"""
    
    def test_collection_info_returns_booking_details(self):
        """GET /api/mango/collection/592741/info returns booking details with tests"""
        response = requests.get(f"{BASE_URL}/api/mango/collection/592741/info")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert data.get("booking_id") == "592741", f"Expected booking_id=592741, got {data.get('booking_id')}"
        assert "patient_name" in data, f"Expected patient_name in response, got {data}"
        print(f"PASS: Collection info returns booking details: booking_id={data.get('booking_id')}, patient={data.get('patient_name')}")
    
    def test_collection_info_nonexistent_returns_404(self):
        """GET /api/mango/collection/999999/info returns 404 for non-existent booking"""
        response = requests.get(f"{BASE_URL}/api/mango/collection/999999/info")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: Non-existent booking returns 404")
    
    def test_collection_verify_wrong_code_returns_error(self):
        """Verify that wrong verification code returns error"""
        response = requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "000000"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == False, f"Expected success=False, got {data}"
        assert "error" in data, f"Expected error message, got {data}"
        print(f"PASS: Wrong code returns error: {data.get('error')}")
    
    def test_collection_verify_correct_code_marks_collected(self):
        """Verify that correct code (booking ID itself) marks as sample_collected"""
        response = requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "592741"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "collected" in data.get("message", "").lower() or data.get("collected_at"), f"Expected collection confirmation, got {data}"
        print(f"PASS: Correct code marks as collected: {data}")
    
    def test_collection_verify_already_collected_returns_error(self):
        """Verify that already-collected booking returns error"""
        # First verify (should succeed or already be collected from previous test)
        requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "592741"},
            headers={"Content-Type": "application/json"}
        )
        
        # Second verify should fail
        response = requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "592741"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == False, f"Expected success=False for already collected, got {data}"
        assert "already" in data.get("error", "").lower(), f"Expected 'already collected' error, got {data}"
        print(f"PASS: Already collected returns error: {data.get('error')}")


class TestOrderIdGeneration:
    """Tests for 6-digit order ID generation"""
    
    def test_pharmacy_order_creates_6digit_id(self):
        """POST /api/pharmacy/order creates order with 6-digit numerical ID"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/order",
            json={
                "customer": {"name": "Test User", "phone": "9876543210"},
                "address": {"line1": "Test Address", "city": "Mumbai", "pincode": "400001"},
                "payment_method": "pay_later",
                "items": [{"name": "Paracetamol", "price": 50, "quantity": 1}],
                "total": 50
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        order_id = data.get("order_id") or data.get("booking_id")
        assert order_id is not None, f"Expected order_id in response, got {data}"
        # Verify 6-digit numerical ID
        assert order_id.isdigit(), f"Expected numerical order_id, got {order_id}"
        assert len(order_id) == 6, f"Expected 6-digit order_id, got {order_id} (length={len(order_id)})"
        print(f"PASS: Pharmacy order created with 6-digit ID: {order_id}")
    
    def test_lab_booking_creates_6digit_id(self):
        """POST /api/lab/booking creates booking with 6-digit numerical ID"""
        response = requests.post(
            f"{BASE_URL}/api/lab/booking",
            json={
                "customer": {"name": "Test User", "phone": "9876543210"},
                "address": {"line1": "Test Address", "city": "Mumbai", "pincode": "400001"},
                "payment_method": "pay_later",
                "items": [{"name": "CBC Test", "price": 350}],
                "total": 350
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        booking_id = data.get("booking_id") or data.get("order_id")
        assert booking_id is not None, f"Expected booking_id in response, got {data}"
        # Verify 6-digit numerical ID
        assert booking_id.isdigit(), f"Expected numerical booking_id, got {booking_id}"
        assert len(booking_id) == 6, f"Expected 6-digit booking_id, got {booking_id} (length={len(booking_id)})"
        print(f"PASS: Lab booking created with 6-digit ID: {booking_id}")


class TestIdGeneratorUtility:
    """Tests for the generate_6digit_id utility function"""
    
    def test_id_generator_utility_exists(self):
        """Verify id_generator.py utility exists and has correct function"""
        import sys
        sys.path.insert(0, '/app/backend')
        try:
            from utils.id_generator import generate_6digit_id
            assert callable(generate_6digit_id), "generate_6digit_id should be callable"
            print("PASS: generate_6digit_id utility function exists and is callable")
        except ImportError as e:
            pytest.fail(f"Could not import generate_6digit_id: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
