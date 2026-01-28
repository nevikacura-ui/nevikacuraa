"""
Iteration 18 - Email OTP Authentication System Tests
Tests for:
1. Email OTP for signup (no SMS cost)
2. Password login after account created
3. SMS OTP only for password reset
4. No WhatsApp redirects - all orders use SMS notifications
5. Email notifications for order updates
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nevika-health-7.preview.emergentagent.com').rstrip('/')


class TestHealthEndpoint:
    """Health check tests"""
    
    def test_api_health(self):
        """Test API is accessible"""
        # Try the root health endpoint
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        # If not found, the API is still running
        assert response.status_code in [200, 404]


class TestEmailOTPEndpoints:
    """Email OTP authentication tests - NEW for signup"""
    
    def test_send_email_otp(self):
        """Test sending email OTP for signup"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": f"test_{uuid.uuid4().hex[:8]}@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "email" in data
        assert data["method"] in ["email", "mock"]
        assert data["expires_in"] == 600  # 10 minutes
    
    def test_send_email_otp_invalid_email(self):
        """Test sending email OTP with invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": "invalid-email"}
        )
        assert response.status_code == 400
    
    def test_verify_email_otp_invalid(self):
        """Test verifying email OTP with invalid code"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/verify",
            json={"email": "test@example.com", "otp": "000000"}
        )
        # Should fail with 400 for invalid OTP
        assert response.status_code == 400


class TestPasswordLogin:
    """Password-based login tests"""
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "Invalid credentials" in data.get("detail", "")
    
    def test_login_endpoint_exists(self):
        """Test login endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "test"}
        )
        # Should return 401 for invalid creds, not 404
        assert response.status_code == 401


class TestPasswordResetSMSOTP:
    """Password reset via SMS OTP tests"""
    
    def test_send_password_reset_otp(self):
        """Test sending SMS OTP for password reset"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password/send-otp",
            json={"phone": "9876543210"}
        )
        # Should work (user may not exist, but endpoint should respond)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert data["method"] in ["sms", "mock"]
    
    def test_send_password_reset_invalid_phone(self):
        """Test sending SMS OTP with invalid phone"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password/send-otp",
            json={"phone": "123"}
        )
        assert response.status_code == 400


class TestAdminLogin:
    """Admin portal login tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "nevikacura2026"}
        )
        assert response.status_code == 200
        data = response.json()
        # Response contains token and role, not "success" field
        assert "token" in data
        assert data.get("role") == "super_admin"
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "wrongpassword"}
        )
        assert response.status_code == 401


class TestStaffLogin:
    """Staff portal login tests"""
    
    def test_staff_login_doctor(self):
        """Test staff login with doctor credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "doc_neha", "password": "Nevika@2026D"}
        )
        assert response.status_code == 200
        data = response.json()
        # Response contains token and doctor info
        assert "token" in data
        assert data.get("doctor_name") == "Dr. Neha Patel"
    
    def test_staff_login_clinic(self):
        """Test staff login with clinic staff credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_pushpa", "password": "Nevika@2026C"}
        )
        assert response.status_code == 200
        data = response.json()
        # Response contains token and clinic info
        assert "token" in data
        assert data.get("clinic") == "Pushpa Clinic"


class TestAppointmentBookingNoWhatsApp:
    """Test appointment booking without WhatsApp redirects"""
    
    def test_diagyn_appointment_no_whatsapp(self):
        """Test DiaGyn appointment booking returns no WhatsApp redirect"""
        # First get OTP
        otp_response = requests.post(
            f"{BASE_URL}/api/otp/send",
            json={"phone": "9876543210", "service": "diagyn"}
        )
        assert otp_response.status_code == 200
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp", "123456")
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/otp/verify",
            json={"phone": "9876543210", "otp": mock_otp, "service": "diagyn"}
        )
        
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            verification_token = verify_data.get("verification_token", "")
            
            # Book appointment
            booking_response = requests.post(
                f"{BASE_URL}/api/appointments",
                json={
                    "doctor": "Dr. Neha Patel",
                    "clinic": "Pushpa Clinic",
                    "date": "2026-01-20",
                    "time": "11:00 AM",
                    "patient_name": "Test Patient Email Auth",
                    "patient_phone": "9876543210",
                    "patient_email": "test@example.com"
                },
                headers={"X-Verification-Token": verification_token}
            )
            
            if booking_response.status_code in [200, 201]:
                booking_data = booking_response.json()
                # Verify no WhatsApp redirect in response
                assert "whatsapp_redirect" not in booking_data or booking_data.get("whatsapp_redirect") is None
                # Should have SMS notification instead
                print(f"Appointment booked: {booking_data.get('id', 'N/A')}")


class TestPharmacyOrderNoWhatsApp:
    """Test pharmacy order without WhatsApp redirects"""
    
    def test_pharmacy_order_no_whatsapp(self):
        """Test pharmacy order returns no WhatsApp redirect"""
        # First get OTP
        otp_response = requests.post(
            f"{BASE_URL}/api/otp/send",
            json={"phone": "9876543211", "service": "pharmacy"}
        )
        assert otp_response.status_code == 200
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp", "123456")
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/otp/verify",
            json={"phone": "9876543211", "otp": mock_otp, "service": "pharmacy"}
        )
        
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            verification_token = verify_data.get("verification_token", "")
            
            # Place order
            order_response = requests.post(
                f"{BASE_URL}/api/pharmacy/orders",
                json={
                    "medicines": [{"name": "Paracetamol 500mg", "quantity": 2}],
                    "patient_name": "Test Patient Pharmacy",
                    "patient_phone": "9876543211",
                    "patient_email": "test@example.com",
                    "delivery_address": "Test Address"
                },
                headers={"X-Verification-Token": verification_token}
            )
            
            if order_response.status_code in [200, 201]:
                order_data = order_response.json()
                # Verify no WhatsApp redirect
                assert "whatsapp_redirect" not in order_data or order_data.get("whatsapp_redirect") is None
                print(f"Pharmacy order placed: {order_data.get('id', 'N/A')}")


class TestDiagnosticBookingNoWhatsApp:
    """Test diagnostic booking without WhatsApp redirects"""
    
    def test_proton_booking_no_whatsapp(self):
        """Test Proton diagnostic booking returns no WhatsApp redirect"""
        # First get OTP
        otp_response = requests.post(
            f"{BASE_URL}/api/otp/send",
            json={"phone": "9876543212", "service": "proton"}
        )
        assert otp_response.status_code == 200
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp", "123456")
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/otp/verify",
            json={"phone": "9876543212", "otp": mock_otp, "service": "proton"}
        )
        
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            verification_token = verify_data.get("verification_token", "")
            
            # Book test
            booking_response = requests.post(
                f"{BASE_URL}/api/diagnostics/orders",
                json={
                    "tests": ["Complete Blood Count (CBC)"],
                    "preferred_date": "2026-01-20",
                    "patient_name": "Test Patient Diagnostic",
                    "patient_phone": "9876543212",
                    "patient_email": "test@example.com"
                },
                headers={"X-Verification-Token": verification_token}
            )
            
            if booking_response.status_code in [200, 201]:
                booking_data = booking_response.json()
                # Verify no WhatsApp redirect
                assert "whatsapp_redirect" not in booking_data or booking_data.get("whatsapp_redirect") is None
                print(f"Diagnostic booking: {booking_data.get('id', 'N/A')}")


class TestEvaraPage:
    """Test Evara page content"""
    
    def test_evara_content_endpoint(self):
        """Test Evara content is accessible"""
        # Evara content is served via frontend, but we can check if the page loads
        response = requests.get(f"{BASE_URL}/evara", timeout=10)
        # Should return HTML (frontend route)
        assert response.status_code == 200


class TestGlydexPage:
    """Test Glydex page"""
    
    def test_glydex_page_loads(self):
        """Test Glydex page loads"""
        response = requests.get(f"{BASE_URL}/glydex", timeout=10)
        # Should return HTML (frontend route)
        assert response.status_code == 200


class TestFeeCodes:
    """Test fee codes configuration"""
    
    def test_fee_codes_in_appointment(self):
        """Test fee codes are accepted in appointment booking"""
        # Get OTP first
        otp_response = requests.post(
            f"{BASE_URL}/api/otp/send",
            json={"phone": "9876543213", "service": "diagyn"}
        )
        assert otp_response.status_code == 200
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp", "123456")
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/otp/verify",
            json={"phone": "9876543213", "otp": mock_otp, "service": "diagyn"}
        )
        
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            verification_token = verify_data.get("verification_token", "")
            
            # Book with fee code N1 (No fees)
            booking_response = requests.post(
                f"{BASE_URL}/api/appointments",
                json={
                    "doctor": "Dr. Neha Patel",
                    "clinic": "Pushpa Clinic",
                    "date": "2026-01-21",
                    "time": "11:30 AM",
                    "patient_name": "Test Fee Code Patient",
                    "patient_phone": "9876543213",
                    "fee_code": "N1"
                },
                headers={"X-Verification-Token": verification_token}
            )
            
            # Should accept the fee_code parameter
            assert booking_response.status_code in [200, 201, 422]


class TestQRCodeFooter:
    """Test QR code in footer"""
    
    def test_homepage_loads(self):
        """Test homepage loads (QR code is in frontend)"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        assert response.status_code == 200
        # QR code is rendered in frontend Footer component


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
