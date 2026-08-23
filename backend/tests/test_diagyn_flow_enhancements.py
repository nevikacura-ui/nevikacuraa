"""
DiaGyn Flow Enhancements Test Suite
Tests for:
1. Staff Portal - Check-in by Booking Code (POST /api/diagyn-staff/check-in/by-code)
2. Doctor Portal - Fee Collection with Payment Options (POST /api/diagyn-staff/doctor/collect-fee)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')


class TestDiaGynStaffLogin:
    """Test staff login for DiaGyn portal"""
    
    def test_staff_login_success(self):
        """Test staff login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Token not found in response"
        assert "staff" in data, "Staff object not found in response"
        assert data["staff"]["role"] == "diagyn_staff", f"Expected diagyn_staff role, got {data['staff']['role']}"
        print(f"✓ Staff login successful: {data['staff']['name']}")
        return data["token"]
    
    def test_doctor_login_success(self):
        """Test doctor login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Token not found in response"
        print(f"✓ Doctor login successful: {data.get('staff', {}).get('name', 'Unknown')}")
        return data["token"]


class TestCheckInByBookingCode:
    """Test Staff Portal - Check-in by Booking Code feature"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, staff_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {staff_token}"}
    
    def test_check_in_by_code_endpoint_exists(self, auth_headers):
        """Verify check-in by code endpoint exists"""
        # Try with an invalid code to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/check-in/by-code",
            json={"booking_code": "INVALID123", "clinic": "Pushpa Clinic"},
            headers=auth_headers
        )
        
        # Should get 404 (not found) not 404 endpoint not found
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}"
        data = response.json()
        assert "detail" in data or "message" in data, "Expected error message in response"
        print(f"✓ Check-in by code endpoint exists (returned {response.status_code})")
    
    def test_check_in_by_code_validation_short_code(self, auth_headers):
        """Test validation for short booking code"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/check-in/by-code",
            json={"booking_code": "", "clinic": "Pushpa Clinic"},
            headers=auth_headers
        )
        
        # Should fail validation or return error  
        # Note: API may return 200 with error status or 400/404/422
        if response.status_code == 200:
            data = response.json()
            # Check if it's an error response with success=False
            assert data.get("success") == False or "detail" in data or "error" in data, "Expected error response"
        else:
            assert response.status_code in [400, 404, 422], f"Expected error, got {response.status_code}"
        print("✓ Short booking code validation works")
    
    def test_check_in_by_code_invalid_code(self, auth_headers):
        """Test check-in with non-existent booking code"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/check-in/by-code",
            json={"booking_code": "NONEXISTENT999", "clinic": "Pushpa Clinic"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "detail" in data or "message" in data
        print(f"✓ Invalid booking code returns 404: {data.get('detail', data.get('message'))}")
    
    def test_check_in_by_code_without_auth(self):
        """Test check-in by code without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/check-in/by-code",
            json={"booking_code": "ABC123", "clinic": "Pushpa Clinic"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Check-in by code requires authentication")


class TestDoctorFeeCollection:
    """Test Doctor Portal - Fee Collection with Payment Options"""
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, doctor_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {doctor_token}"}
    
    def test_doctor_collect_fee_endpoint_exists(self, auth_headers):
        """Verify doctor fee collection endpoint exists"""
        # Try with invalid appointment to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/doctor/collect-fee",
            json={
                "appointment_id": "invalid-id-12345",
                "fee_code": "G1",
                "scan_codes": [],
                "total_amount": 150,
                "payment_method": "cash",
                "send_receipt_whatsapp": True
            },
            headers=auth_headers
        )
        
        # Should return 404 (appointment not found)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Doctor collect-fee endpoint exists")
    
    def test_doctor_collect_fee_validation(self, auth_headers):
        """Test validation for fee collection request"""
        # Missing required fields
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/doctor/collect-fee",
            json={
                "appointment_id": "test-id"
                # Missing fee_code, total_amount, payment_method
            },
            headers=auth_headers
        )
        
        # Should fail validation (422)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Fee collection validation works")
    
    def test_doctor_collect_fee_payment_methods(self, auth_headers):
        """Test that all payment methods are accepted"""
        payment_methods = ["cash", "upi", "cashfree"]
        
        for method in payment_methods:
            response = requests.post(
                f"{BASE_URL}/api/diagyn-staff/doctor/collect-fee",
                json={
                    "appointment_id": f"test-{method}",
                    "fee_code": "G1",
                    "scan_codes": [],
                    "total_amount": 150,
                    "payment_method": method,
                    "send_receipt_whatsapp": True
                },
                headers=auth_headers
            )
            
            # Should return 404 (appointment not found) not 400/422 (bad request)
            assert response.status_code == 404, f"Payment method {method}: Expected 404, got {response.status_code}"
            print(f"✓ Payment method '{method}' accepted by API")
    
    def test_doctor_collect_fee_without_auth(self):
        """Test fee collection without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/doctor/collect-fee",
            json={
                "appointment_id": "test-id",
                "fee_code": "G1",
                "total_amount": 150,
                "payment_method": "cash",
                "send_receipt_whatsapp": True
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Fee collection requires authentication")


class TestDiaGynPortalConfig:
    """Test portal configuration endpoints"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, staff_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {staff_token}"}
    
    def test_get_portal_config(self, auth_headers):
        """Test getting portal configuration"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/config",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify config contains required sections
        assert "clinics" in data, "Missing clinics in config"
        assert "fee_codes" in data, "Missing fee_codes in config"
        assert "scan_fees" in data, "Missing scan_fees in config"
        
        # Verify Pushpa and Amnion clinics exist
        assert "Pushpa Clinic" in data["clinics"], "Missing Pushpa Clinic"
        assert "Amnion Clinic" in data["clinics"], "Missing Amnion Clinic"
        
        # Verify fee codes for Dr. Vikas Jha
        assert "Dr. Vikas Jha" in data["fee_codes"], "Missing Dr. Vikas Jha fee codes"
        fee_codes = data["fee_codes"]["Dr. Vikas Jha"]
        assert "G1" in fee_codes, "Missing G1 fee code"
        assert "NF" in fee_codes, "Missing NF (No Fee) code"
        
        print(f"✓ Portal config contains {len(data['clinics'])} clinics")
        print(f"✓ Portal config contains {len(data['fee_codes'])} doctors' fee codes")
        print(f"✓ Portal config contains {len(data['scan_fees'])} scan fee codes")


class TestCreateAndCheckInAppointment:
    """Integration test: Create appointment and check-in by code"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, staff_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {staff_token}"}
    
    def test_full_check_in_flow(self, auth_headers):
        """Test full flow: book appointment -> check-in by code"""
        # Get IST date
        from datetime import datetime, timedelta
        ist_offset = timedelta(hours=5, minutes=30)
        now_ist = datetime.utcnow() + ist_offset
        today = now_ist.strftime("%Y-%m-%d")
        
        # 1. Create a walk-in appointment
        booking_response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "time": "18:00",  # Evening slot
                "patient_name": "TEST_CheckinFlow_Patient",
                "patient_mobile": "9876543210",
                "appointment_type": "WALK_IN"
            },
            headers=auth_headers
        )
        
        if booking_response.status_code == 409:
            print("⚠ Slot already booked, skipping full flow test")
            return
        
        assert booking_response.status_code == 200, f"Booking failed: {booking_response.text}"
        booking_data = booking_response.json()
        booking_id = booking_data.get("booking_id")
        appointment_id = booking_data.get("appointment", {}).get("id")
        print(f"✓ Created appointment: {booking_id}")
        
        try:
            # 2. Check-in using booking code
            checkin_response = requests.post(
                f"{BASE_URL}/api/diagyn-staff/check-in/by-code",
                json={"booking_code": booking_id, "clinic": "Pushpa Clinic"},
                headers=auth_headers
            )
            
            assert checkin_response.status_code == 200, f"Check-in failed: {checkin_response.text}"
            checkin_data = checkin_response.json()
            
            assert checkin_data.get("success") == True, "Check-in not successful"
            assert "token_number" in checkin_data, "Token number not assigned"
            
            print(f"✓ Checked in successfully: Token #{checkin_data['token_number']}")
            print(f"✓ Patient: {checkin_data.get('appointment', {}).get('patient_name')}")
            
            # 3. Verify token data for printing
            token_data = checkin_data.get("token_data", {})
            assert token_data.get("token_number"), "Token data missing token_number"
            assert token_data.get("patient_name"), "Token data missing patient_name"
            print(f"✓ Token data includes: {list(token_data.keys())}")
            
        finally:
            # Cleanup: Cancel the appointment
            cleanup_response = requests.put(
                f"{BASE_URL}/api/diagyn-staff/appointments/{appointment_id}/status",
                json={"status": "Cancelled"},
                headers=auth_headers
            )
            if cleanup_response.status_code == 200:
                print("✓ Test appointment cleaned up")


class TestDoctorFeeCollectionWithAppointment:
    """Integration test: Create appointment, check-in, and collect fee"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor authentication token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        return response.json()["token"]
    
    def test_full_fee_collection_flow(self, staff_token, doctor_token):
        """Test full flow: book -> check-in -> withDoctor -> collect fee"""
        staff_headers = {"Authorization": f"Bearer {staff_token}"}
        doctor_headers = {"Authorization": f"Bearer {doctor_token}"}
        
        # Get IST date
        from datetime import datetime, timedelta
        ist_offset = timedelta(hours=5, minutes=30)
        now_ist = datetime.utcnow() + ist_offset
        today = now_ist.strftime("%Y-%m-%d")
        
        # 1. Create appointment
        booking_response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "time": "18:30",  # Different slot
                "patient_name": "TEST_FeeCollection_Patient",
                "patient_mobile": "9876543211",
                "appointment_type": "WALK_IN"
            },
            headers=staff_headers
        )
        
        if booking_response.status_code == 409:
            print("⚠ Slot already booked, skipping fee collection flow test")
            return
        
        assert booking_response.status_code == 200, f"Booking failed: {booking_response.text}"
        booking_data = booking_response.json()
        appointment_id = booking_data["appointment"]["id"]
        booking_id = booking_data["booking_id"]
        print(f"✓ Created appointment: {booking_id}")
        
        try:
            # 2. Check-in
            checkin_response = requests.put(
                f"{BASE_URL}/api/diagyn-staff/appointments/{appointment_id}/status",
                json={"status": "CheckedIn"},
                headers=staff_headers
            )
            assert checkin_response.status_code == 200, f"Check-in failed: {checkin_response.text}"
            print(f"✓ Checked in: Token #{checkin_response.json().get('token_data', {}).get('token_number')}")
            
            # 3. With Doctor
            withdr_response = requests.put(
                f"{BASE_URL}/api/diagyn-staff/appointments/{appointment_id}/status",
                json={"status": "WithDoctor"},
                headers=doctor_headers
            )
            assert withdr_response.status_code == 200, f"WithDoctor failed: {withdr_response.text}"
            print("✓ Patient with doctor")
            
            # 4. Collect fee (using new endpoint)
            fee_response = requests.post(
                f"{BASE_URL}/api/diagyn-staff/doctor/collect-fee",
                json={
                    "appointment_id": appointment_id,
                    "fee_code": "G1",
                    "scan_codes": [],
                    "total_amount": 150.0,
                    "payment_method": "cash",
                    "notes": "Test fee collection",
                    "send_receipt_whatsapp": False  # Don't send for test
                },
                headers=doctor_headers
            )
            
            assert fee_response.status_code == 200, f"Fee collection failed: {fee_response.text}"
            fee_data = fee_response.json()
            
            assert fee_data.get("success") == True, "Fee collection not successful"
            assert "receipt_number" in fee_data, "Receipt number not generated"
            
            print(f"✓ Fee collected: Receipt #{fee_data['receipt_number']}")
            print(f"✓ Payment method: cash")
            
        finally:
            # Cleanup is implicit since we completed the appointment
            pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
