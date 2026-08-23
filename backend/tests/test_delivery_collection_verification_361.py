"""
Test Suite for Delivery/Collection Verification and Send Tracking Link Features
Tests:
1. Delivery verification - POST /api/pharmacy/delivery/verify with correct/wrong code
2. Collection verification - POST /api/mango/collection/verify with correct/wrong code
3. Collection info - GET /api/mango/collection/{id}/info
4. Order live tracking - GET /api/pharmacy/orders/{id}/live-tracking
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDeliveryVerification:
    """Test pharmacy delivery verification endpoints"""
    
    def test_delivery_verify_wrong_code(self):
        """Test delivery verification with wrong code returns error"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "000000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        assert "error" in data or "Invalid" in str(data)
        print(f"PASS: Wrong code returns error: {data.get('error', data)}")
    
    def test_delivery_verify_correct_code(self):
        """Test delivery verification with correct code (384729) marks as delivered"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "384729"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "delivered" in data.get("message", "").lower() or data.get("delivered_at")
        print(f"PASS: Correct code marks as delivered: {data}")
    
    def test_delivery_verify_already_delivered(self):
        """Test delivery verification on already delivered order returns error"""
        # Order should already be delivered from previous test
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "384729", "verification_code": "384729"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        assert "already" in data.get("error", "").lower()
        print(f"PASS: Already delivered returns error: {data.get('error')}")
    
    def test_delivery_verify_nonexistent_order(self):
        """Test delivery verification with nonexistent order returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/delivery/verify",
            json={"order_id": "999999", "verification_code": "999999"}
        )
        assert response.status_code == 404
        print("PASS: Nonexistent order returns 404")


class TestCollectionVerification:
    """Test lab collection verification endpoints"""
    
    def test_collection_info_endpoint(self):
        """Test GET /api/mango/collection/{id}/info returns booking details"""
        response = requests.get(f"{BASE_URL}/api/mango/collection/592741/info")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("booking_id") == "592741"
        assert "patient_name" in data
        assert "tests" in data
        print(f"PASS: Collection info returns booking details: booking_id={data.get('booking_id')}, patient={data.get('patient_name')}")
    
    def test_collection_verify_wrong_code(self):
        """Test collection verification with wrong code returns error"""
        response = requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "000000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        assert "error" in data or "Invalid" in str(data)
        print(f"PASS: Wrong code returns error: {data.get('error', data)}")
    
    def test_collection_verify_correct_code(self):
        """Test collection verification with correct code (592741) marks as sample_collected"""
        response = requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "592741"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "collected" in data.get("message", "").lower() or data.get("collected_at")
        print(f"PASS: Correct code marks as collected: {data}")
    
    def test_collection_verify_already_collected(self):
        """Test collection verification on already collected booking returns error"""
        # Booking should already be collected from previous test
        response = requests.post(
            f"{BASE_URL}/api/mango/collection/verify",
            json={"booking_id": "592741", "verification_code": "592741"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        assert "already" in data.get("error", "").lower()
        print(f"PASS: Already collected returns error: {data.get('error')}")
    
    def test_collection_info_nonexistent(self):
        """Test collection info with nonexistent booking returns 404"""
        response = requests.get(f"{BASE_URL}/api/mango/collection/999999/info")
        assert response.status_code == 404
        print("PASS: Nonexistent booking returns 404")


class TestLiveTracking:
    """Test live tracking endpoint for delivery agent page"""
    
    def test_order_live_tracking(self):
        """Test GET /api/pharmacy/orders/{id}/live-tracking returns order info"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/384729/live-tracking")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("order_id") == "384729"
        assert "status" in data
        assert "items" in data
        print(f"PASS: Live tracking returns order info: order_id={data.get('order_id')}, status={data.get('status')}")
    
    def test_order_live_tracking_nonexistent(self):
        """Test live tracking with nonexistent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders/999999/live-tracking")
        assert response.status_code == 404
        print("PASS: Nonexistent order returns 404")


class TestStaffLogin:
    """Test staff login for portal access"""
    
    def test_staff_login(self):
        """Test staff login with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "nevikacura", "password": "test1234"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or data.get("success") == True
        print(f"PASS: Staff login successful")
        return data.get("token")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
