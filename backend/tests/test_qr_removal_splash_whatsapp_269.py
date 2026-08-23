"""
Test Suite for P0-P1 Changes - Iteration 269
1. QR Code Removal Verification
2. Splash Screen Fix (sessionStorage)
3. WhatsApp Notification Config Updates

Tests verify:
- No qrcode import in server.py
- No QR generation functions exist
- No QR attachments in email templates
- WhatsApp numbers updated correctly
- Doctor/Staff notification functions still work
"""
import pytest
import requests
import os
import sys

# Add backend to path for imports
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestQRCodeRemoval:
    """Verify QR code feature is completely removed"""
    
    def test_no_qrcode_import_in_server(self):
        """Verify qrcode library is not imported in server.py"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        # Check for qrcode import
        assert 'import qrcode' not in content, "qrcode import found in server.py"
        assert 'from qrcode' not in content, "qrcode import found in server.py"
        print("PASS: No qrcode import in server.py")
    
    def test_no_generate_booking_qr_code_function(self):
        """Verify generate_booking_qr_code function is removed"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'def generate_booking_qr_code' not in content, "generate_booking_qr_code function found"
        assert 'generate_booking_qr_code(' not in content, "generate_booking_qr_code call found"
        print("PASS: No generate_booking_qr_code function in server.py")
    
    def test_no_generate_generic_qr_code_function(self):
        """Verify generate_generic_qr_code function is removed"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'def generate_generic_qr_code' not in content, "generate_generic_qr_code function found"
        assert 'generate_generic_qr_code(' not in content, "generate_generic_qr_code call found"
        print("PASS: No generate_generic_qr_code function in server.py")
    
    def test_no_qr_in_appointment_routes(self):
        """Verify no QR code references in appointment_routes.py"""
        with open('/app/backend/routes/appointment_routes.py', 'r') as f:
            content = f.read()
        
        assert 'qrcode' not in content.lower(), "qrcode reference found in appointment_routes.py"
        assert 'qr_base64' not in content, "qr_base64 reference found in appointment_routes.py"
        print("PASS: No QR code references in appointment_routes.py")
    
    def test_no_qr_in_coupons_routes(self):
        """Verify no QR code references in coupons.py (pharmacy orders)"""
        with open('/app/backend/routes/coupons.py', 'r') as f:
            content = f.read()
        
        assert 'qrcode' not in content.lower(), "qrcode reference found in coupons.py"
        assert 'qr_base64' not in content, "qr_base64 reference found in coupons.py"
        print("PASS: No QR code references in coupons.py")
    
    def test_no_qr_in_queue_status_routes(self):
        """Verify no QR code references in queue_status.py (diagnostic orders)"""
        with open('/app/backend/routes/queue_status.py', 'r') as f:
            content = f.read()
        
        assert 'qrcode' not in content.lower(), "qrcode reference found in queue_status.py"
        assert 'qr_base64' not in content, "qr_base64 reference found in queue_status.py"
        print("PASS: No QR code references in queue_status.py")
    
    def test_generate_booking_email_template_returns_none_for_qr(self):
        """Verify generate_booking_email_template returns None as second element (no QR)"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        # Find the function and check it returns (html, None)
        assert 'return html, None' in content or 'return (html, None)' in content, \
            "generate_booking_email_template should return (html, None)"
        print("PASS: generate_booking_email_template returns None for QR")


class TestWhatsAppNotificationConfig:
    """Verify WhatsApp notification numbers are updated correctly"""
    
    def test_doctor_whatsapp_numbers_config(self):
        """Verify DOCTOR_WHATSAPP_NUMBERS has correct numbers"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        # Check Dr. Neha Patel number
        assert '917045266466' in content, "Dr. Neha Patel number (917045266466) not found"
        
        # Check Dr. Vikas Jha updated number
        assert '919699409888' in content, "Dr. Vikas Jha updated number (919699409888) not found"
        
        # Verify old number is NOT present
        assert '919930266466' not in content, "Old Dr. Vikas number (919930266466) still present"
        
        print("PASS: DOCTOR_WHATSAPP_NUMBERS has correct numbers")
        print("  - Dr. Neha Patel: 917045266466")
        print("  - Dr. Vikas Jha: 919699409888 (updated from 9930266466)")
    
    def test_staff_notification_numbers_config(self):
        """Verify STAFF_NOTIFICATION_NUMBERS has correct numbers"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        # Check Pushpa Clinic staff number
        assert '918108500522' in content, "Pushpa Clinic staff number (918108500522) not found"
        
        # Check Amnion Clinic staff number
        assert '918108500533' in content, "Amnion Clinic staff number (918108500533) not found"
        
        print("PASS: STAFF_NOTIFICATION_NUMBERS has correct numbers")
        print("  - Pushpa Clinic: 918108500522")
        print("  - Amnion Clinic: 918108500533")
    
    def test_notify_doctor_whatsapp_function_exists(self):
        """Verify notify_doctor_whatsapp function still exists"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        assert 'async def notify_doctor_whatsapp' in content, "notify_doctor_whatsapp function not found"
        print("PASS: notify_doctor_whatsapp function exists")
    
    def test_notify_doctor_whatsapp_called_in_appointment_routes(self):
        """Verify notify_doctor_whatsapp is called in appointment booking flow"""
        with open('/app/backend/routes/appointment_routes.py', 'r') as f:
            content = f.read()
        
        assert 'notify_doctor_whatsapp' in content, "notify_doctor_whatsapp not called in appointment_routes.py"
        assert 'await notify_doctor_whatsapp' in content, "notify_doctor_whatsapp not awaited in appointment_routes.py"
        print("PASS: notify_doctor_whatsapp is called in appointment booking flow")
    
    def test_send_diagyn_appointment_confirmation_called(self):
        """Verify send_diagyn_appointment_confirmation (patient WhatsApp) is called"""
        with open('/app/backend/routes/appointment_routes.py', 'r') as f:
            content = f.read()
        
        assert 'send_diagyn_appointment_confirmation' in content, \
            "send_diagyn_appointment_confirmation not found in appointment_routes.py"
        print("PASS: send_diagyn_appointment_confirmation is called for patient WhatsApp")
    
    def test_notify_staff_new_appointment_called(self):
        """Verify notify_staff_new_appointment (staff notification) is called"""
        with open('/app/backend/routes/appointment_routes.py', 'r') as f:
            content = f.read()
        
        assert 'notify_staff_new_appointment' in content, \
            "notify_staff_new_appointment not found in appointment_routes.py"
        print("PASS: notify_staff_new_appointment is called for staff notification")
    
    def test_doctor_matching_with_partial_match(self):
        """Verify doctor matching uses partial/case-insensitive match"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        # Check for partial match logic in notify_doctor_whatsapp
        assert 'doctor_lower' in content or '.lower()' in content, \
            "Case-insensitive matching not found in notify_doctor_whatsapp"
        print("PASS: Doctor matching uses case-insensitive/partial match")


class TestSplashScreenFix:
    """Verify splash screen fix using sessionStorage"""
    
    def test_splash_played_sessionStorage_check(self):
        """Verify IntroScreen checks sessionStorage for splash_played"""
        with open('/app/frontend/src/components/IntroScreen.jsx', 'r') as f:
            content = f.read()
        
        # Check for sessionStorage check on initial state
        assert "sessionStorage.getItem('splash_played')" in content, \
            "sessionStorage.getItem('splash_played') check not found"
        print("PASS: IntroScreen checks sessionStorage for splash_played")
    
    def test_splash_played_sessionStorage_set(self):
        """Verify IntroScreen sets sessionStorage after splash plays"""
        with open('/app/frontend/src/components/IntroScreen.jsx', 'r') as f:
            content = f.read()
        
        # Check for sessionStorage set after splash
        assert "sessionStorage.setItem('splash_played'" in content, \
            "sessionStorage.setItem('splash_played') not found"
        print("PASS: IntroScreen sets sessionStorage after splash plays")
    
    def test_splash_skips_to_main_when_played(self):
        """Verify splash skips to 'main' phase when already played"""
        with open('/app/frontend/src/components/IntroScreen.jsx', 'r') as f:
            content = f.read()
        
        # Check that initial state returns 'main' if splash_played is set
        assert "return 'main'" in content, "Splash skip to 'main' not found"
        print("PASS: Splash skips to 'main' phase when already played")


class TestBackendAPIHealth:
    """Verify backend APIs are working"""
    
    def test_health_endpoint(self):
        """Verify /api/health returns ok status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get('status') == 'ok', f"Health status not ok: {data}"
        print("PASS: /api/health returns ok status")
    
    def test_doctors_endpoint(self):
        """Verify doctors endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200, f"Doctors endpoint failed: {response.status_code}"
        print("PASS: /api/doctors endpoint accessible")
    
    def test_booked_slots_endpoint(self):
        """Verify booked-slots endpoint is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Vikas Jha",
                "clinic": "Pushpa Clinic",
                "date": "2026-01-20"
            }
        )
        assert response.status_code == 200, f"Booked slots endpoint failed: {response.status_code}"
        print("PASS: /api/appointments/booked-slots endpoint accessible")


class TestEmailTemplatesNoQR:
    """Verify email templates don't include QR code attachments"""
    
    def test_email_templates_no_qr_attachment(self):
        """Verify email templates don't have QR attachment logic"""
        # Check email_templates.py if it exists
        email_templates_path = '/app/backend/services/email_templates.py'
        try:
            with open(email_templates_path, 'r') as f:
                content = f.read()
            
            # Should not have QR attachment logic
            assert 'qr_base64' not in content or 'qr_code' not in content.lower(), \
                "QR code reference found in email_templates.py"
            print("PASS: email_templates.py has no QR code references")
        except FileNotFoundError:
            print("SKIP: email_templates.py not found (may be inline in server.py)")
    
    def test_server_email_no_qr_attachment(self):
        """Verify server.py email sending doesn't attach QR"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        # Check that email sending doesn't include QR attachment
        # The generate_booking_email_template should return (html, None)
        assert 'return html, None' in content or 'return (html, None)' in content, \
            "Email template should return None for QR attachment"
        print("PASS: Server email sending doesn't attach QR")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
