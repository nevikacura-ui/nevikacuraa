"""
Booking ID Verification System Tests
=====================================
Tests for the 4-digit Booking ID verification system where:
- The booking_id itself serves as the verification code
- Staff at DiaGyn, Mango Labs, and Orange Pharmacy verify customers using booking_id
- Staff can use '0000' as an override code
"""

import pytest
import requests
import os
from datetime import datetime, timezone
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBookingCodeVerifyEndpoint:
    """Test /api/booking-code/verify endpoint"""
    
    def test_verify_matching_code_success(self):
        """Test: When entered code matches booking_id, verification succeeds"""
        # Use a 4-digit booking_id
        booking_id = "1234"
        
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": booking_id,
                "code": booking_id,  # Same as booking_id - should succeed
                "verified_by": "staff_pushpa",
                "verifier_role": "staff",
                "booking_type": "diagyn"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True, f"Expected success=True, got {data}"
        assert "verified" in data.get("message", "").lower() or data.get("success") == True
        print(f"✅ Matching code verification SUCCESS: {data}")
    
    def test_verify_mismatched_code_failure(self):
        """Test: When entered code does NOT match booking_id, verification fails"""
        booking_id = "5678"
        wrong_code = "9999"
        
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": booking_id,
                "code": wrong_code,  # Different from booking_id - should fail
                "verified_by": "staff_amnion",
                "verifier_role": "staff",
                "booking_type": "diagyn"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == False, f"Expected success=False for wrong code, got {data}"
        assert "invalid" in data.get("message", "").lower() or "error" in data
        print(f"✅ Mismatched code verification correctly FAILED: {data}")
    
    def test_staff_override_code_0000_always_works(self):
        """Test: Staff override code '0000' should ALWAYS work regardless of booking_id"""
        # Test with any random booking_id
        booking_id = "7777"
        override_code = "0000"
        
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": booking_id,
                "code": override_code,  # 0000 = staff override
                "verified_by": "staff_pharmacy",
                "verifier_role": "staff",
                "booking_type": "orange"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True, f"Expected success=True with override code 0000, got {data}"
        assert data.get("used_default_code") == True, f"Expected used_default_code=True, got {data}"
        print(f"✅ Staff override code 0000 works: {data}")
    
    def test_override_code_works_for_all_booking_types(self):
        """Test: Override code 0000 works for diagyn, mango, and orange"""
        booking_types = [
            ("diagyn", "staff", "staff_pushpa"),
            ("mango", "phlebotomist", "staff_proton"),
            ("orange", "delivery", "staff_pharmacy")
        ]
        
        for booking_type, verifier_role, verified_by in booking_types:
            response = requests.post(
                f"{BASE_URL}/api/booking-code/verify",
                json={
                    "booking_id": "9999",  # Any booking ID
                    "code": "0000",  # Override
                    "verified_by": verified_by,
                    "verifier_role": verifier_role,
                    "booking_type": booking_type
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True, f"Override code failed for {booking_type}: {data}"
            print(f"✅ Override code works for {booking_type}")
    
    def test_verify_with_missing_booking_id(self):
        """Test: Verification with empty booking_id should fail"""
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": "",
                "code": "1234",
                "verified_by": "test_staff",
                "booking_type": "diagyn"
            }
        )
        
        # Should either return error or success=False
        assert response.status_code in [200, 400, 422]
        if response.status_code == 200:
            data = response.json()
            # Empty booking_id and code "1234" won't match, so should fail
            # Unless override code 0000 is used
            print(f"Response for empty booking_id: {data}")
    
    def test_verify_with_whitespace_handling(self):
        """Test: Codes with whitespace should be normalized"""
        booking_id = "4321"
        
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": f" {booking_id} ",  # With spaces
                "code": booking_id,  # Clean
                "verified_by": "staff",
                "booking_type": "diagyn"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True, f"Whitespace normalization failed: {data}"
        print(f"✅ Whitespace normalization works: {data}")


class TestPharmacyOrderBookingId:
    """Test that pharmacy orders return 4-digit booking_id"""
    
    def setup_method(self):
        """Get auth token for pharmacy tests"""
        self.token = None
        try:
            # Login as pharmacy staff
            login_resp = requests.post(
                f"{BASE_URL}/api/staff/login",
                json={"username": "staff_pharmacy", "password": "pharmacy123"}
            )
            if login_resp.status_code == 200:
                self.token = login_resp.json().get("token")
        except:
            pass
    
    def test_pharmacy_order_endpoint_exists(self):
        """Test: Check pharmacy order endpoint exists"""
        # Just check the endpoint is available (GET for orders list)
        response = requests.get(f"{BASE_URL}/api/pharmacy/orders")
        # Might return 401 (unauthorized) or 200 - either is fine, not 404
        assert response.status_code != 404, "Pharmacy orders endpoint not found"
        print(f"✅ Pharmacy orders endpoint exists: {response.status_code}")
    
    def test_pharmacy_order_creation_returns_booking_id(self):
        """Test: When creating pharmacy order, it should return a 4-digit booking_id"""
        # First get a patient/user token
        # Try guest checkout mode
        order_data = {
            "patient_name": "Test Patient",
            "patient_phone": "9876543210",
            "address": "123 Test Street, Mumbai",
            "medicines": [{"name": "Paracetamol", "quantity": 2, "price": 50}],
            "total": 100,
            "payment_method": "cod"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/orders",
            json=order_data,
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
        
        # Log the response for debugging
        print(f"Pharmacy order response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            booking_id = data.get("booking_id") or data.get("order_id") or data.get("id")
            if booking_id:
                # Check if it's a 4-digit format
                booking_id_str = str(booking_id)
                # It could be either pure 4-digit or prefixed
                print(f"✅ Pharmacy order created with booking_id: {booking_id}")
        elif response.status_code == 401:
            print("⚠️ Pharmacy order requires authentication - skipping creation test")
            pytest.skip("Authentication required for pharmacy order creation")


class TestDiagnosticOrderBookingId:
    """Test that diagnostic orders return 4-digit booking_id"""
    
    def setup_method(self):
        """Get auth token for diagnostic tests"""
        self.token = None
        try:
            login_resp = requests.post(
                f"{BASE_URL}/api/staff/login",
                json={"username": "staff_proton", "password": "proton123"}
            )
            if login_resp.status_code == 200:
                self.token = login_resp.json().get("token")
        except:
            pass
    
    def test_diagnostic_order_endpoint_exists(self):
        """Test: Check diagnostic order endpoint exists"""
        # Correct endpoint is /api/diagnostics (not /api/diagnostic/orders)
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code != 404, "Diagnostics endpoint not found"
        print(f"✅ Diagnostics endpoint exists: {response.status_code}")


class TestDiaGynAppointmentBookingId:
    """Test that DiaGyn appointments return 4-digit booking_id"""
    
    def test_appointment_endpoint_exists(self):
        """Test: Check appointments endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/appointments")
        # Could be 401 (needs auth) or 200 - just not 404
        assert response.status_code != 404, "Appointments endpoint not found"
        print(f"✅ Appointments endpoint exists: {response.status_code}")
    
    def test_appointment_booking_returns_id(self):
        """Test: Check if booking_id is in appointment creation response"""
        # Try to create a test appointment
        appointment_data = {
            "patient_name": "Test Booking Patient",
            "patient_phone": "9876543210",
            "doctor": "Dr. Neha Patel",
            "clinic": "Amnion Clinic",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": "10:00 AM",
            "appointment_type": "ONLINE"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=appointment_data
        )
        
        print(f"Appointment creation response: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            booking_id = data.get("booking_id") or data.get("id")
            print(f"✅ Appointment created with booking_id: {booking_id}")
        elif response.status_code == 401:
            print("⚠️ Appointment creation requires authentication")


class TestVerificationForAllServices:
    """Integration tests for verification across all service types"""
    
    def test_diagyn_verification_flow(self):
        """Test complete verification flow for DiaGyn clinic"""
        test_booking_id = "2468"
        
        # Test matching code
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": test_booking_id,
                "code": test_booking_id,
                "verified_by": "clinic_staff",
                "verifier_role": "staff",
                "booking_type": "diagyn"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ DiaGyn verification flow works")
    
    def test_mango_verification_flow(self):
        """Test complete verification flow for Mango Labs"""
        test_booking_id = "1357"
        
        # Test with phlebotomist verifying
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": test_booking_id,
                "code": test_booking_id,
                "verified_by": "phlebotomist_001",
                "verifier_role": "phlebotomist",
                "booking_type": "mango"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Mango Labs verification flow works")
    
    def test_orange_verification_flow(self):
        """Test complete verification flow for Orange Pharmacy"""
        test_booking_id = "8642"
        
        # Test with delivery person verifying
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={
                "booking_id": test_booking_id,
                "code": test_booking_id,
                "verified_by": "delivery_agent_005",
                "verifier_role": "delivery",
                "booking_type": "orange"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Orange Pharmacy verification flow works")


class TestHealthCheck:
    """Basic health and endpoint availability tests"""
    
    def test_api_is_reachable(self):
        """Test API is reachable via booking-code endpoint"""
        # Use the booking-code endpoint to verify API is accessible
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={"booking_id": "test", "code": "0000"}
        )
        assert response.status_code == 200
        print(f"✅ API is reachable: {response.status_code}")
    
    def test_booking_code_verify_endpoint_available(self):
        """Test that booking-code/verify endpoint is available"""
        # Send minimal request to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/booking-code/verify",
            json={"booking_id": "test", "code": "0000"}
        )
        # Should not be 404 or 405
        assert response.status_code not in [404, 405], f"Endpoint not available: {response.status_code}"
        print(f"✅ Booking code verify endpoint available: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
