"""
Nevika Cura - Doctors API & WhatsApp OTP Tests
Tests for:
- GET /api/doctors - list of doctors
- GET /api/doctors/all - list of doctors
- GET /api/doctors/featured - featured doctors
- POST /api/otp/whatsapp/send - send OTP
- POST /api/otp/whatsapp/verify - verify OTP
- POST /api/otp/whatsapp/resend - resend OTP
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDoctorsAPI:
    """Tests for Doctor Profile endpoints"""
    
    def test_doctors_root_endpoint(self):
        """GET /api/doctors - should return list of doctors"""
        response = requests.get(f"{BASE_URL}/api/doctors", timeout=30)
        print(f"GET /api/doctors - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "doctors" in data, "Response should have 'doctors' key"
        assert isinstance(data["doctors"], list), "doctors should be a list"
        
        # Verify doctor data structure
        if len(data["doctors"]) > 0:
            doctor = data["doctors"][0]
            assert "id" in doctor, "Doctor should have 'id'"
            assert "name" in doctor, "Doctor should have 'name'"
            assert "specialization" in doctor, "Doctor should have 'specialization'"
            print(f"Found {len(data['doctors'])} doctors")
        
        print("✅ GET /api/doctors - PASSED")
    
    def test_doctors_all_endpoint(self):
        """GET /api/doctors/all - should return all doctors"""
        response = requests.get(f"{BASE_URL}/api/doctors/all", timeout=30)
        print(f"GET /api/doctors/all - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "doctors" in data, "Response should have 'doctors' key"
        assert isinstance(data["doctors"], list), "doctors should be a list"
        
        # Check for expected doctors
        doctor_names = [d["name"] for d in data["doctors"]]
        print(f"Doctors found: {doctor_names}")
        
        print("✅ GET /api/doctors/all - PASSED")
    
    def test_doctors_featured_endpoint(self):
        """GET /api/doctors/featured - should return featured doctors"""
        response = requests.get(f"{BASE_URL}/api/doctors/featured", timeout=30)
        print(f"GET /api/doctors/featured - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "doctors" in data, "Response should have 'doctors' key"
        
        # Verify featured doctors have featured=True
        for doctor in data["doctors"]:
            assert doctor.get("featured") == True, f"Doctor {doctor['name']} should be featured"
        
        print(f"✅ GET /api/doctors/featured - Found {len(data['doctors'])} featured doctors")
    
    def test_doctors_with_specialization_filter(self):
        """GET /api/doctors?specialization=Obstetrics - should filter by specialization"""
        response = requests.get(f"{BASE_URL}/api/doctors?specialization=Obstetrics", timeout=30)
        print(f"GET /api/doctors?specialization=Obstetrics - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned doctors should match the filter
        for doctor in data.get("doctors", []):
            assert "obstetrics" in doctor.get("specialization", "").lower()
        
        print("✅ GET /api/doctors with specialization filter - PASSED")
    
    def test_doctors_availability_endpoint(self):
        """GET /api/doctors/availability - should return weekly availability"""
        response = requests.get(f"{BASE_URL}/api/doctors/availability?days=7", timeout=30)
        print(f"GET /api/doctors/availability - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "availability" in data, "Response should have 'availability' key"
        assert len(data["availability"]) == 7, "Should have 7 days of availability"
        
        print("✅ GET /api/doctors/availability - PASSED")


class TestWhatsAppOTP:
    """Tests for WhatsApp OTP endpoints"""
    
    def test_send_otp_success(self):
        """POST /api/otp/whatsapp/send - should send OTP"""
        test_phone = "9833188288"  # Test phone from credentials
        
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/send",
            json={
                "phone": test_phone,
                "purpose": "appointment"
            },
            timeout=30
        )
        print(f"POST /api/otp/whatsapp/send - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=True"
        assert "phone_masked" in data, "Should have masked phone in response"
        
        # Store OTP for verification test (if mock mode)
        if data.get("mock") and data.get("otp"):
            pytest.otp_code = data["otp"]
            pytest.test_phone = test_phone
            print(f"Mock OTP received: {data['otp']}")
        else:
            pytest.otp_code = None
        
        print("✅ POST /api/otp/whatsapp/send - PASSED")
    
    def test_send_otp_invalid_phone(self):
        """POST /api/otp/whatsapp/send - should reject invalid phone"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/send",
            json={
                "phone": "123",  # Too short
                "purpose": "appointment"
            },
            timeout=30
        )
        print(f"POST /api/otp/whatsapp/send (invalid) - Status: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
        
        print("✅ Invalid phone rejected correctly")
    
    def test_verify_otp_success(self):
        """POST /api/otp/whatsapp/verify - should verify valid OTP"""
        test_phone = "9833188288"
        
        # First send OTP to get a valid code
        send_response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/send",
            json={"phone": test_phone, "purpose": "test"},
            timeout=30
        )
        
        if send_response.status_code != 200:
            pytest.skip("Could not send OTP for verification test")
        
        send_data = send_response.json()
        otp_code = send_data.get("otp")
        
        if not otp_code:
            pytest.skip("No mock OTP available for verification")
        
        # Now verify
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/verify",
            json={
                "phone": test_phone,
                "otp": otp_code
            },
            timeout=30
        )
        print(f"POST /api/otp/whatsapp/verify - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=True on valid OTP"
        
        print("✅ POST /api/otp/whatsapp/verify - PASSED")
    
    def test_verify_otp_invalid(self):
        """POST /api/otp/whatsapp/verify - should reject invalid OTP"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/verify",
            json={
                "phone": "9833188288",
                "otp": "000000"  # Wrong OTP
            },
            timeout=30
        )
        print(f"POST /api/otp/whatsapp/verify (invalid) - Status: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400 for invalid OTP, got {response.status_code}"
        
        print("✅ Invalid OTP rejected correctly")
    
    def test_resend_otp_success(self):
        """POST /api/otp/whatsapp/resend - should resend OTP"""
        test_phone = "9833188288"
        
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/resend",
            json={
                "phone": test_phone,
                "purpose": "appointment"
            },
            timeout=30
        )
        print(f"POST /api/otp/whatsapp/resend - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=True"
        
        print("✅ POST /api/otp/whatsapp/resend - PASSED")
    
    def test_verify_otp_format_validation(self):
        """POST /api/otp/whatsapp/verify - should validate OTP format"""
        response = requests.post(
            f"{BASE_URL}/api/otp/whatsapp/verify",
            json={
                "phone": "9833188288",
                "otp": "12345"  # Only 5 digits (should be 6)
            },
            timeout=30
        )
        print(f"POST /api/otp/whatsapp/verify (wrong format) - Status: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400 for wrong OTP format, got {response.status_code}"
        
        print("✅ OTP format validation works")


class TestPharmacyOrder:
    """Tests for Pharmacy Order endpoint"""
    
    def test_pharmacy_order_creation(self):
        """POST /api/pharmacy - should create pharmacy order"""
        order_data = {
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 2},
                {"name": "Vitamin D3", "quantity": 1}
            ],
            "patient_name": "Test User",
            "patient_phone": "9833188288",
            "patient_email": "test@example.com",
            "delivery_address": "123 Test Street, Test City - 400001",
            "payment_method": "cod",
            "payment_status": "cod",
            "total_amount": 250
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            timeout=30
        )
        print(f"POST /api/pharmacy - Status: {response.status_code}")
        
        # Accept 200 or 201 for success
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        
        data = response.json()
        # Check for order ID in response
        assert "order_id" in data or "id" in data, "Response should have order_id or id"
        
        print("✅ POST /api/pharmacy - PASSED")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """GET /api/health - should return health status"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=30)
        print(f"GET /api/health - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✅ API health check - PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
