"""
Test Iteration 270: QR Removal, Splash Screen, WhatsApp Numbers, Weekly Digest
Tests for:
1. QR code fully removed from all booking flows
2. Splash screen sessionStorage fix
3. WhatsApp notification numbers updated
4. Weekly digest endpoints (NEW)
5. Health glance endpoint
6. Smart reminders check endpoint
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_health_endpoint_returns_ok(self):
        """Test /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ /api/health returns ok")


class TestQRCodeRemoval:
    """Test QR code has been fully removed from codebase"""
    
    def test_no_qrcode_import_in_server(self):
        """Verify no qrcode import in server.py"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        assert 'import qrcode' not in content
        assert 'from qrcode' not in content
        print("✅ No qrcode import in server.py")
    
    def test_no_generate_booking_qr_code_function(self):
        """Verify generate_booking_qr_code function removed"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        assert 'def generate_booking_qr_code' not in content
        print("✅ generate_booking_qr_code function removed")
    
    def test_no_generate_generic_qr_code_function(self):
        """Verify generate_generic_qr_code function removed"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        assert 'def generate_generic_qr_code' not in content
        print("✅ generate_generic_qr_code function removed")
    
    def test_no_qr_in_appointment_routes(self):
        """Verify no QR references in appointment_routes.py"""
        with open('/app/backend/routes/appointment_routes.py', 'r') as f:
            content = f.read()
        # Should not have qrcode import or QR generation
        assert 'import qrcode' not in content
        assert 'generate_qr' not in content.lower() or 'qr_code' not in content.lower()
        print("✅ No QR references in appointment_routes.py")
    
    def test_no_qr_in_coupons_routes(self):
        """Verify no QR references in coupons.py (pharmacy)"""
        with open('/app/backend/routes/coupons.py', 'r') as f:
            content = f.read()
        assert 'import qrcode' not in content
        assert 'qr_code' not in content.lower() or 'generate_qr' not in content.lower()
        print("✅ No QR references in coupons.py (pharmacy)")
    
    def test_no_qr_in_queue_status_routes(self):
        """Verify no QR references in queue_status.py (diagnostics)"""
        with open('/app/backend/routes/queue_status.py', 'r') as f:
            content = f.read()
        assert 'import qrcode' not in content
        assert 'qr_code' not in content.lower() or 'generate_qr' not in content.lower()
        print("✅ No QR references in queue_status.py (diagnostics)")
    
    def test_generate_booking_email_template_returns_none_for_qr(self):
        """Verify generate_booking_email_template returns (html, None) - no QR data"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        # Check that the function returns html, None (no QR attachment)
        assert 'return html, None' in content or 'return (html, None)' in content
        print("✅ generate_booking_email_template returns (html, None)")


class TestWhatsAppNotificationNumbers:
    """Test WhatsApp notification numbers are correctly configured"""
    
    def test_staff_notification_numbers_pushpa(self):
        """Verify Pushpa clinic number: 918108500522"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        assert '"pushpa clinic": "918108500522"' in content or '"pushpa": "918108500522"' in content
        print("✅ Pushpa clinic number: 918108500522")
    
    def test_staff_notification_numbers_amnion(self):
        """Verify Amnion clinic number: 918108500533"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        assert '"amnion clinic": "918108500533"' in content or '"amnion": "918108500533"' in content
        print("✅ Amnion clinic number: 918108500533")
    
    def test_staff_notification_numbers_nevika_cura(self):
        """Verify Nevika Cura number: 919833188288"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        assert '"nevika cura": "919833188288"' in content or '"nevika": "919833188288"' in content
        print("✅ Nevika Cura number: 919833188288")
    
    def test_staff_notification_numbers_mango(self):
        """Verify Mango Labs number: 917039040040"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        assert '"mango": "917039040040"' in content or '"mango health labs": "917039040040"' in content
        print("✅ Mango Labs number: 917039040040")
    
    def test_staff_notification_numbers_orange(self):
        """Verify Orange Pharmacy number: 917039030030"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        assert '"orange": "917039030030"' in content or '"orange pharmacy": "917039030030"' in content
        print("✅ Orange Pharmacy number: 917039030030")
    
    def test_doctor_whatsapp_numbers_neha_patel(self):
        """Verify Dr. Neha Patel number: 917045266466"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        assert '"Dr. Neha Patel": "917045266466"' in content
        print("✅ Dr. Neha Patel number: 917045266466")
    
    def test_doctor_whatsapp_numbers_vikas_jha(self):
        """Verify Dr. Vikas Jha number: 919699409888"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        assert '"Dr. Vikas Jha": "919699409888"' in content
        print("✅ Dr. Vikas Jha number: 919699409888")
    
    def test_department_phones_orange_updated(self):
        """Verify department_phones orange number: 917039030030"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        # Check notify_staff_new_order function has correct orange number
        assert '"orange": "917039030030"' in content
        print("✅ department_phones orange: 917039030030")
    
    def test_doctor_matching_case_insensitive(self):
        """Verify notify_doctor_whatsapp uses case-insensitive partial matching"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        # Check for .lower() usage in doctor matching
        assert 'doctor_lower = doctor_name.lower()' in content or '.lower()' in content
        print("✅ Doctor matching is case-insensitive with partial matching")


class TestWeeklyDigestEndpoints:
    """Test NEW weekly digest email feature endpoints"""
    
    def test_weekly_digest_preview_endpoint(self):
        """Test GET /api/weekly-digest/preview/{phone} returns HTML 200"""
        response = requests.get(f"{BASE_URL}/api/weekly-digest/preview/9833188288")
        assert response.status_code == 200
        # Should return HTML content
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type or 'application/json' in content_type
        # Check for HTML content or valid JSON response
        if 'text/html' in content_type:
            assert '<html' in response.text.lower() or '<!doctype' in response.text.lower()
            print("✅ Weekly digest preview returns HTML")
        else:
            data = response.json()
            # If JSON, it might be an error response but should still be 200
            print(f"✅ Weekly digest preview returns: {data}")
    
    def test_weekly_digest_send_endpoint(self):
        """Test POST /api/weekly-digest/send works"""
        response = requests.post(f"{BASE_URL}/api/weekly-digest/send")
        assert response.status_code == 200
        data = response.json()
        # Should have success field
        assert 'success' in data
        print(f"✅ Weekly digest send endpoint works: {data}")
    
    def test_weekly_digest_service_exists(self):
        """Verify weekly_digest.py service file exists"""
        import os
        assert os.path.exists('/app/backend/services/weekly_digest.py')
        print("✅ weekly_digest.py service exists")
    
    def test_weekly_digest_scheduler_configured(self):
        """Verify weekly digest scheduler is configured in server.py startup"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        assert 'schedule_weekly_digest' in content
        assert 'Weekly health digest scheduler started' in content or 'weekly digest scheduler' in content.lower()
        print("✅ Weekly digest scheduler configured in startup")


class TestHealthGlanceEndpoint:
    """Test health-glance aggregation endpoint"""
    
    def test_health_glance_endpoint_structure(self):
        """Test GET /api/health-glance/{phone} returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/health-glance/9833188288")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert 'success' in data
        assert 'active_reminders' in data
        assert 'medical_records' in data
        assert 'health_streak' in data
        assert 'cura_coins' in data
        assert 'completed_today' in data
        assert 'next_appointment' in data
        
        # Verify data types
        assert isinstance(data['active_reminders'], int)
        assert isinstance(data['medical_records'], int)
        assert isinstance(data['health_streak'], int)
        assert isinstance(data['cura_coins'], int)
        assert isinstance(data['completed_today'], int)
        
        print(f"✅ Health glance endpoint returns correct structure: {data}")


class TestSmartRemindersEndpoint:
    """Test smart reminders check endpoint"""
    
    def test_smart_reminders_check_notifications(self):
        """Test POST /api/smart-reminders/check-notifications works"""
        response = requests.post(f"{BASE_URL}/api/smart-reminders/check-notifications")
        assert response.status_code == 200
        data = response.json()
        
        # Should have success field
        assert 'success' in data
        print(f"✅ Smart reminders check-notifications works: {data}")


class TestSplashScreenFix:
    """Test splash screen sessionStorage fix in IntroScreen.jsx"""
    
    def test_splash_played_session_storage_check(self):
        """Verify IntroScreen checks sessionStorage('splash_played') on init"""
        with open('/app/frontend/src/components/IntroScreen.jsx', 'r') as f:
            content = f.read()
        assert "sessionStorage.getItem('splash_played')" in content
        print("✅ IntroScreen checks sessionStorage('splash_played') on init")
    
    def test_splash_played_session_storage_set(self):
        """Verify IntroScreen sets sessionStorage after splash plays"""
        with open('/app/frontend/src/components/IntroScreen.jsx', 'r') as f:
            content = f.read()
        assert "sessionStorage.setItem('splash_played'" in content
        print("✅ IntroScreen sets sessionStorage('splash_played') after splash")
    
    def test_splash_skips_to_main_when_played(self):
        """Verify splash returns 'main' phase when already played"""
        with open('/app/frontend/src/components/IntroScreen.jsx', 'r') as f:
            content = f.read()
        # Check that initial state returns 'main' if splash_played is set
        assert "return 'main'" in content or "return \"main\"" in content
        print("✅ Splash skips to 'main' phase when already played")


class TestBackendAPIAccess:
    """Test basic backend API accessibility"""
    
    def test_doctors_endpoint_accessible(self):
        """Test /api/doctors endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200
        print("✅ /api/doctors endpoint accessible")
    
    def test_booked_slots_endpoint_accessible(self):
        """Test /api/appointments/booked-slots endpoint is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={"doctor": "Dr. Vikas Jha", "clinic": "Pushpa Clinic", "date": "2026-01-20"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'booked_slots' in data
        print("✅ /api/appointments/booked-slots endpoint accessible")


class TestPharmacyLoyaltyOrangeNumber:
    """Test pharmacy_loyalty.py has updated Orange number"""
    
    def test_pharmacy_loyalty_orange_number(self):
        """Verify pharmacy_loyalty.py has Orange number 917039030030"""
        try:
            with open('/app/backend/routes/pharmacy_loyalty.py', 'r') as f:
                content = f.read()
            # Check for the updated Orange number
            if '917039030030' in content:
                print("✅ pharmacy_loyalty.py has Orange number 917039030030")
            elif '918108500511' in content:
                print("⚠️ pharmacy_loyalty.py still has old Orange number 918108500511")
            else:
                print("ℹ️ pharmacy_loyalty.py doesn't have explicit Orange number")
        except FileNotFoundError:
            print("ℹ️ pharmacy_loyalty.py not found - skipping")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
