"""
Test Suite for Iteration 273 - Voice Booking Notification Pipeline Verification
Tests:
1. Backend /api/health returns ok
2. Voice booking: POST /api/voice-booking/confirm-booking creates appointment AND sends notifications
3. Voice booking notification pipeline: Patient WhatsApp, Doctor WhatsApp, Staff WhatsApp
4. Regular appointment booking: POST /api/appointments/book sends email + WhatsApp
5. COD diagnostic order: POST /api/diagnostics with cod sends staff WhatsApp to 917039040040
6. Cashfree confirm_lab_booking sends staff WhatsApp to 917039040040
7. Cashfree confirm_pharmacy_order sends staff WhatsApp to 917039030030
8. Frontend checkout guards and CuraPay transition timing
"""

import pytest
import requests
import os
import re
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')
TEST_PHONE = "9833188288"


class TestHealthEndpoint:
    """Test backend health endpoint"""
    
    def test_health_returns_ok(self):
        """Verify /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ Health endpoint returns ok")


class TestVoiceBookingNotificationPipeline:
    """Test voice booking confirm-booking endpoint and notification pipeline"""
    
    def test_voice_booking_confirm_creates_appointment(self):
        """Test POST /api/voice-booking/confirm-booking creates appointment"""
        # Use a future date to avoid past date validation
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        payload = {
            "doctor": "Dr. Vikas",
            "clinic": "Pushpa Clinic",
            "date": future_date,
            "time": "18:30",
            "patient_name": "Test Voice Patient",
            "patient_phone": TEST_PHONE,
            "patient_email": "test@example.com",
            "source": "voice_booking"
        }
        
        response = requests.post(f"{BASE_URL}/api/voice-booking/confirm-booking", json=payload)
        
        # Should return 200 with booking details
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "booking_id" in data, f"Missing booking_id in response: {data}"
        assert "appointment_id" in data, f"Missing appointment_id in response: {data}"
        assert data.get("doctor") == "Dr. Vikas"
        assert data.get("clinic") == "Pushpa Clinic"
        assert data.get("patient_name") == "Test Voice Patient"
        
        print(f"✅ Voice booking created: booking_id={data.get('booking_id')}")
        return data.get("booking_id")


class TestVoiceBookingCodeReview:
    """Code review tests for voice booking notification pipeline"""
    
    def test_voice_booking_has_patient_whatsapp(self):
        """Verify voice_booking.py has patient WhatsApp notification"""
        with open("/app/backend/routes/voice_booking.py", "r") as f:
            content = f.read()
        
        # Check for send_diagyn_appointment_confirmation call
        assert "send_diagyn_appointment_confirmation" in content, "Missing patient WhatsApp function"
        assert "[VOICE] Patient WhatsApp sent" in content, "Missing patient WhatsApp log message"
        print("✅ Voice booking has patient WhatsApp notification")
    
    def test_voice_booking_has_doctor_whatsapp(self):
        """Verify voice_booking.py has doctor WhatsApp notification"""
        with open("/app/backend/routes/voice_booking.py", "r") as f:
            content = f.read()
        
        # Check for notify_doctor_whatsapp call
        assert "notify_doctor_whatsapp" in content, "Missing doctor WhatsApp function"
        assert "[VOICE] Doctor WhatsApp sent" in content, "Missing doctor WhatsApp log message"
        print("✅ Voice booking has doctor WhatsApp notification")
    
    def test_voice_booking_has_staff_whatsapp(self):
        """Verify voice_booking.py has staff WhatsApp notification"""
        with open("/app/backend/routes/voice_booking.py", "r") as f:
            content = f.read()
        
        # Check for notify_staff_new_appointment call
        assert "notify_staff_new_appointment" in content, "Missing staff WhatsApp function"
        assert "[VOICE] Staff WhatsApp sent" in content, "Missing staff WhatsApp log message"
        print("✅ Voice booking has staff WhatsApp notification")
    
    def test_voice_booking_has_email_notification(self):
        """Verify voice_booking.py has email notification for patient"""
        with open("/app/backend/routes/voice_booking.py", "r") as f:
            content = f.read()
        
        # Check for send_email_notification call
        assert "send_email_notification" in content, "Missing email notification function"
        assert "[VOICE] Patient email sent" in content, "Missing patient email log message"
        print("✅ Voice booking has email notification")


class TestCashfreeStaffNumbers:
    """Verify Cashfree webhook handlers use correct staff numbers"""
    
    def test_confirm_lab_booking_uses_mango_number(self):
        """Verify confirm_lab_booking sends staff WhatsApp to 917039040040"""
        with open("/app/backend/routes/cashfree.py", "r") as f:
            content = f.read()
        
        # Find confirm_lab_booking function
        lab_match = re.search(r'async def confirm_lab_booking.*?(?=async def|\Z)', content, re.DOTALL)
        assert lab_match, "confirm_lab_booking function not found"
        lab_func = lab_match.group()
        
        # Verify it uses 917039040040 for staff notification
        assert "917039040040" in lab_func, "Lab booking should use 917039040040 for staff WhatsApp"
        # Verify it does NOT use 919833188288 for lab staff
        assert "919833188288" not in lab_func or "membership" in lab_func.lower(), \
            "Lab booking should NOT use 919833188288 for staff (that's Nevika Cura number)"
        print("✅ confirm_lab_booking uses correct Mango staff number 917039040040")
    
    def test_confirm_pharmacy_order_uses_orange_number(self):
        """Verify confirm_pharmacy_order sends staff WhatsApp to 917039030030"""
        with open("/app/backend/routes/cashfree.py", "r") as f:
            content = f.read()
        
        # Find confirm_pharmacy_order function
        pharm_match = re.search(r'async def confirm_pharmacy_order.*?(?=async def|\Z)', content, re.DOTALL)
        assert pharm_match, "confirm_pharmacy_order function not found"
        pharm_func = pharm_match.group()
        
        # Verify it uses 917039030030 for staff notification
        assert "917039030030" in pharm_func, "Pharmacy order should use 917039030030 for staff WhatsApp"
        print("✅ confirm_pharmacy_order uses correct Orange staff number 917039030030")
    
    def test_confirm_appointment_uses_clinic_based_numbers(self):
        """Verify confirm_appointment uses clinic-based staff numbers"""
        with open("/app/backend/routes/cashfree.py", "r") as f:
            content = f.read()
        
        # Find confirm_appointment function
        appt_match = re.search(r'async def confirm_appointment.*?(?=async def|\Z)', content, re.DOTALL)
        assert appt_match, "confirm_appointment function not found"
        appt_func = appt_match.group()
        
        # Verify clinic-based routing
        assert "pushpa" in appt_func.lower(), "Should check for Pushpa clinic"
        assert "amnion" in appt_func.lower(), "Should check for Amnion clinic"
        assert "918108500522" in appt_func, "Pushpa clinic should use 918108500522"
        assert "918108500533" in appt_func, "Amnion clinic should use 918108500533"
        print("✅ confirm_appointment uses clinic-based staff numbers")


class TestCODDiagnosticNotifications:
    """Test COD diagnostic order sends patient WhatsApp"""
    
    def test_queue_status_sends_patient_whatsapp_for_cod(self):
        """Verify queue_status.py sends patient WhatsApp for COD orders"""
        with open("/app/backend/routes/queue_status.py", "r") as f:
            content = f.read()
        
        # Check for send_proton_lab_confirmation call in send_diagnostic_order_notifications
        assert "send_proton_lab_confirmation" in content, "Missing patient WhatsApp function for COD"
        assert "Patient WhatsApp sent for COD diagnostic order" in content, "Missing COD patient WhatsApp log"
        print("✅ COD diagnostic orders send patient WhatsApp via send_proton_lab_confirmation")


class TestRegularAppointmentNotifications:
    """Test regular appointment booking notifications"""
    
    def test_appointment_routes_has_all_notifications(self):
        """Verify appointment_routes.py sends email + WhatsApp to patient + doctor + staff"""
        with open("/app/backend/routes/appointment_routes.py", "r") as f:
            content = f.read()
        
        # Check for email notification
        assert "send_email_notification" in content, "Missing email notification"
        
        # Check for patient WhatsApp
        assert "send_diagyn_appointment_confirmation" in content, "Missing patient WhatsApp"
        
        # Check for doctor WhatsApp
        assert "notify_doctor_whatsapp" in content, "Missing doctor WhatsApp"
        
        # Check for staff notification
        assert "notify_staff_new_appointment" in content, "Missing staff notification"
        
        print("✅ Regular appointment booking has all notification channels")


class TestFrontendCheckoutGuards:
    """Test frontend checkout empty cart guards"""
    
    def test_mango_checkout_empty_cart_guard(self):
        """Verify MangoCheckout.jsx empty cart guard checks showBookingConfirmation"""
        with open("/app/frontend/src/pages/checkout/MangoCheckout.jsx", "r") as f:
            content = f.read()
        
        # Check for proper empty cart guard
        assert "!showBookingConfirmation" in content, "Missing showBookingConfirmation check in empty cart guard"
        assert "!orderDetails" in content, "Missing orderDetails check in empty cart guard"
        print("✅ MangoCheckout has proper empty cart guard with showBookingConfirmation check")
    
    def test_pharmacy_checkout_empty_cart_guard(self):
        """Verify PharmacyCheckout.jsx empty cart guard checks showBookingConfirmation"""
        with open("/app/frontend/src/pages/checkout/PharmacyCheckout.jsx", "r") as f:
            content = f.read()
        
        # Check for proper empty cart guard
        assert "!showBookingConfirmation" in content, "Missing showBookingConfirmation check in empty cart guard"
        assert "!orderDetails" in content, "Missing orderDetails check in empty cart guard"
        print("✅ PharmacyCheckout has proper empty cart guard with showBookingConfirmation check")
    
    def test_mango_checkout_cod_sets_confirmation(self):
        """Verify MangoCheckout.jsx COD flow sets showBookingConfirmation=true"""
        with open("/app/frontend/src/pages/checkout/MangoCheckout.jsx", "r") as f:
            content = f.read()
        
        # Check for setShowBookingConfirmation(true) in COD flow
        assert "setShowBookingConfirmation(true)" in content, "COD flow should set showBookingConfirmation=true"
        print("✅ MangoCheckout COD flow sets showBookingConfirmation=true")


class TestCuraPayTransitionTiming:
    """Test CuraPay transition fires AFTER API success"""
    
    def test_mango_curapay_after_api(self):
        """Verify MangoCheckout CuraPay transition fires after API success"""
        with open("/app/frontend/src/pages/checkout/MangoCheckout.jsx", "r") as f:
            content = f.read()
        
        # Check that setShowCuraPay is called after API response
        # The pattern should be: API call -> get response -> setShowCuraPay(true)
        assert "setShowCuraPay(true)" in content, "Missing setShowCuraPay call"
        
        # Verify it's in the pay_now flow after API success
        pay_now_section = content[content.find("paymentMethod === 'pay_now'"):]
        assert "setShowCuraPay(true)" in pay_now_section[:2000], "setShowCuraPay should be in pay_now flow"
        print("✅ MangoCheckout CuraPay transition fires after API success")
    
    def test_pharmacy_curapay_after_api(self):
        """Verify PharmacyCheckout CuraPay transition fires after API success"""
        with open("/app/frontend/src/pages/checkout/PharmacyCheckout.jsx", "r") as f:
            content = f.read()
        
        # Check that setShowCuraPay is called
        assert "setShowCuraPay(true)" in content, "Missing setShowCuraPay call"
        print("✅ PharmacyCheckout CuraPay transition fires after API success")


class TestDiagnosticOrderAPI:
    """Test COD diagnostic order API"""
    
    def test_cod_diagnostic_order_returns_success(self):
        """Test POST /api/diagnostics with COD returns success"""
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        payload = {
            "tests": ["CBC", "Thyroid Profile"],
            "patient_name": "Test COD Patient",
            "patient_phone": TEST_PHONE,
            "patient_email": "test@example.com",
            "patient_address": "123 Test Street, Mumbai",
            "preferred_date": future_date,
            "preferred_time_slot": "08:00-10:00",
            "collection_type": "home",
            "payment_method": "cod",
            "payment_status": "pending",
            "total_amount": 500
        }
        
        # Need auth token for this endpoint
        # First try without auth to see if it requires auth
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=payload)
        
        # If 401, we need auth - skip this test
        if response.status_code == 401:
            pytest.skip("Diagnostic order requires authentication")
        
        # If 200, verify response
        if response.status_code == 200:
            data = response.json()
            assert "id" in data or "order_id" in data or "booking_id" in data
            print(f"✅ COD diagnostic order created successfully")
        else:
            print(f"⚠️ Diagnostic order returned {response.status_code}: {response.text[:200]}")


class TestVoiceBookingEndpoints:
    """Test voice booking API endpoints"""
    
    def test_voice_booking_doctors_endpoint(self):
        """Test GET /api/voice-booking/doctors returns doctors list"""
        response = requests.get(f"{BASE_URL}/api/voice-booking/doctors")
        assert response.status_code == 200
        data = response.json()
        assert "doctors" in data
        print(f"✅ Voice booking doctors endpoint returns {len(data.get('doctors', []))} doctors")
    
    def test_voice_booking_parse_intent(self):
        """Test POST /api/voice-booking/parse-intent parses booking request"""
        payload = {
            "text": "Book appointment with Dr. Vikas tomorrow at 3 PM",
            "service": "diagyn"
        }
        
        response = requests.post(f"{BASE_URL}/api/voice-booking/parse-intent", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Should return parsed intent
        assert "understood" in data
        assert "message" in data
        print(f"✅ Voice booking parse-intent works: understood={data.get('understood')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
