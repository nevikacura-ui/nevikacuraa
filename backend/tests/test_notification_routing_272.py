"""
Test Suite for Iteration 272 - Critical Notification Routing Bug Fixes
Tests:
1. Staff WhatsApp numbers in notification_service.py (mango=917039040040, orange=917039030030)
2. Staff WhatsApp numbers in cashfree.py webhook handlers
3. COD diagnostic order triggers patient WhatsApp via send_proton_lab_confirmation
4. Cashfree order creation returns payment_session_id
5. Health endpoint returns ok
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_health_returns_ok(self):
        """Backend /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✅ Health endpoint returns ok")


class TestNotificationServiceNumbers:
    """Test staff WhatsApp numbers in notification_service.py"""
    
    def test_notification_service_mango_number(self):
        """Mango staff number is 917039040040 in notification_service.py"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        # Check STAFF_NOTIFICATION_NUMBERS has mango=917039040040
        assert '"mango": "917039040040"' in content or "'mango': '917039040040'" in content or \
               '"mango_labs": "917039040040"' in content or "'mango_labs': '917039040040'" in content or \
               '"mango health labs": "917039040040"' in content
        print("✅ notification_service.py has mango=917039040040")
    
    def test_notification_service_orange_number(self):
        """Orange staff number is 917039030030 in notification_service.py"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        # Check STAFF_NOTIFICATION_NUMBERS has orange=917039030030
        assert '"orange": "917039030030"' in content or "'orange': '917039030030'" in content or \
               '"orange pharmacy": "917039030030"' in content or "'orange pharmacy': '917039030030'" in content
        print("✅ notification_service.py has orange=917039030030")
    
    def test_notification_service_department_phones_mango(self):
        """department_phones in notify_staff_new_order has mango=917039040040"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        # Check department_phones dict has proton/mango=917039040040
        assert '"proton": "917039040040"' in content or "'proton': '917039040040'" in content
        print("✅ department_phones has proton/mango=917039040040")
    
    def test_notification_service_department_phones_orange(self):
        """department_phones in notify_staff_new_order has orange=917039030030"""
        with open('/app/backend/services/notification_service.py', 'r') as f:
            content = f.read()
        
        # Check department_phones dict has orange=917039030030
        assert '"orange": "917039030030"' in content or "'orange': '917039030030'" in content
        print("✅ department_phones has orange=917039030030")


class TestCashfreeWebhookNumbers:
    """Test staff WhatsApp numbers in cashfree.py webhook handlers"""
    
    def test_cashfree_lab_booking_staff_number(self):
        """confirm_lab_booking sends staff WhatsApp to 917039040040 (not 919833188288)"""
        with open('/app/backend/routes/cashfree.py', 'r') as f:
            content = f.read()
        
        # Find confirm_lab_booking function and check staff number
        # Should have recipient_phone="917039040040" for lab staff
        lab_section = content[content.find('async def confirm_lab_booking'):content.find('async def confirm_appointment')]
        
        # Check that 917039040040 is used for lab staff notification
        assert '917039040040' in lab_section, "Lab booking should notify staff at 917039040040"
        
        # Check that 919833188288 is NOT hardcoded for lab staff
        # (919833188288 should only be for membership and default fallback)
        lines_with_919833188288 = [line for line in lab_section.split('\n') if '919833188288' in line]
        assert len(lines_with_919833188288) == 0, f"Lab booking should NOT use 919833188288 for staff. Found: {lines_with_919833188288}"
        
        print("✅ confirm_lab_booking uses 917039040040 for staff WhatsApp")
    
    def test_cashfree_pharmacy_order_staff_number(self):
        """confirm_pharmacy_order sends staff WhatsApp to 917039030030 (not 919833188288)"""
        with open('/app/backend/routes/cashfree.py', 'r') as f:
            content = f.read()
        
        # Find confirm_pharmacy_order function and check staff number
        pharmacy_section = content[content.find('async def confirm_pharmacy_order'):content.find('async def confirm_lab_booking')]
        
        # Check that 917039030030 is used for pharmacy staff notification
        assert '917039030030' in pharmacy_section, "Pharmacy order should notify staff at 917039030030"
        
        # Check that 919833188288 is NOT hardcoded for pharmacy staff
        lines_with_919833188288 = [line for line in pharmacy_section.split('\n') if '919833188288' in line]
        assert len(lines_with_919833188288) == 0, f"Pharmacy order should NOT use 919833188288 for staff. Found: {lines_with_919833188288}"
        
        print("✅ confirm_pharmacy_order uses 917039030030 for staff WhatsApp")
    
    def test_cashfree_appointment_staff_number_clinic_based(self):
        """confirm_appointment sends staff WhatsApp to clinic-specific number"""
        with open('/app/backend/routes/cashfree.py', 'r') as f:
            content = f.read()
        
        # Find confirm_appointment function
        appt_section = content[content.find('async def confirm_appointment'):content.find('async def activate_gift_card')]
        
        # Check that clinic-based routing exists (pushpa, amnion)
        assert 'pushpa' in appt_section.lower(), "Appointment should check for Pushpa clinic"
        assert 'amnion' in appt_section.lower(), "Appointment should check for Amnion clinic"
        assert '918108500522' in appt_section, "Pushpa clinic should use 918108500522"
        assert '918108500533' in appt_section, "Amnion clinic should use 918108500533"
        
        print("✅ confirm_appointment uses clinic-specific staff numbers (Pushpa=918108500522, Amnion=918108500533)")
    
    def test_cashfree_membership_uses_nevika_number(self):
        """activate_membership_after_payment sends staff WhatsApp to 919833188288 (Nevika Cura)"""
        with open('/app/backend/routes/cashfree.py', 'r') as f:
            content = f.read()
        
        # Find activate_membership_after_payment function
        membership_section = content[content.find('async def activate_membership_after_payment'):content.find('async def confirm_pharmacy_order')]
        
        # Check that 919833188288 is used for membership staff notification (Nevika Cura)
        assert '919833188288' in membership_section, "Membership should notify Nevika Cura staff at 919833188288"
        
        print("✅ activate_membership_after_payment uses 919833188288 for Nevika Cura staff")


class TestCODDiagnosticPatientWhatsApp:
    """Test COD diagnostic order triggers patient WhatsApp"""
    
    def test_queue_status_sends_patient_whatsapp_for_cod(self):
        """COD diagnostic order calls send_proton_lab_confirmation for patient WhatsApp"""
        with open('/app/backend/routes/queue_status.py', 'r') as f:
            content = f.read()
        
        # Check that send_proton_lab_confirmation is imported
        assert 'send_proton_lab_confirmation' in content, "queue_status.py should import send_proton_lab_confirmation"
        
        # Check that send_proton_lab_confirmation is called in send_diagnostic_order_notifications
        notifications_section = content[content.find('async def send_diagnostic_order_notifications'):content.find('@router.get("/diagnostics"')]
        assert 'send_proton_lab_confirmation' in notifications_section, "send_diagnostic_order_notifications should call send_proton_lab_confirmation"
        
        print("✅ COD diagnostic order sends patient WhatsApp via send_proton_lab_confirmation")


class TestCashfreeOrderCreation:
    """Test Cashfree order creation endpoint"""
    
    def test_cashfree_create_order_lab_test(self):
        """POST /api/payments/cashfree/create-order returns payment_session_id for lab_test"""
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json={
                "customer_id": "TEST_LAB_272",
                "customer_name": "Test Patient",
                "customer_email": "test@example.com",
                "customer_phone": "9833188288",
                "amount": 100,
                "product_type": "lab_test",
                "product_id": "TEST_LAB_ORDER_272"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "payment_session_id" in data, f"Expected payment_session_id in response, got {data}"
        assert "order_id" in data, f"Expected order_id in response, got {data}"
        print(f"✅ Cashfree create-order for lab_test returns payment_session_id: {data.get('payment_session_id')[:20]}...")
    
    def test_cashfree_create_order_pharmacy(self):
        """POST /api/payments/cashfree/create-order returns payment_session_id for pharmacy"""
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-order",
            json={
                "customer_id": "TEST_PHARM_272",
                "customer_name": "Test Patient",
                "customer_email": "test@example.com",
                "customer_phone": "9833188288",
                "amount": 150,
                "product_type": "pharmacy",
                "product_id": "TEST_PHARM_ORDER_272"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "payment_session_id" in data, f"Expected payment_session_id in response, got {data}"
        print(f"✅ Cashfree create-order for pharmacy returns payment_session_id: {data.get('payment_session_id')[:20]}...")


class TestCODDiagnosticOrderAPI:
    """Test COD diagnostic order API"""
    
    def test_cod_diagnostic_order_returns_success(self):
        """POST /api/diagnostics with payment_method=cod returns success with booking_id"""
        response = requests.post(
            f"{BASE_URL}/api/diagnostics",
            json={
                "tests": ["CBC"],
                "patient_name": "Test Patient 272",
                "patient_phone": "9833188288",
                "collection_type": "home",
                "preferred_date": "2026-03-28",
                "total_amount": 100,
                "payment_method": "cod",
                "payment_status": "pending"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data or "order_id" in data, f"Expected id or order_id in response, got {data}"
        assert "booking_id" in data, f"Expected booking_id in response, got {data}"
        print(f"✅ COD diagnostic order created successfully: booking_id={data.get('booking_id')}")


class TestFrontendCheckoutGuards:
    """Test frontend checkout empty cart guards"""
    
    def test_mango_checkout_empty_cart_guard(self):
        """MangoCheckout empty cart guard checks showBookingConfirmation and orderDetails"""
        with open('/app/frontend/src/pages/checkout/MangoCheckout.jsx', 'r') as f:
            content = f.read()
        
        # Check that empty cart guard includes showBookingConfirmation and orderDetails checks
        assert '!showBookingConfirmation' in content, "MangoCheckout should check !showBookingConfirmation in empty cart guard"
        assert '!orderDetails' in content, "MangoCheckout should check !orderDetails in empty cart guard"
        
        # Check the specific guard pattern
        assert 'labCart.length === 0 && !showCuraPay && !showBookingConfirmation && !orderDetails' in content, \
            "MangoCheckout empty cart guard should check all conditions"
        
        print("✅ MangoCheckout empty cart guard checks showBookingConfirmation and orderDetails")
    
    def test_mango_checkout_cod_sets_confirmation(self):
        """MangoCheckout COD flow sets showBookingConfirmation=true"""
        with open('/app/frontend/src/pages/checkout/MangoCheckout.jsx', 'r') as f:
            content = f.read()
        
        # Check that setShowBookingConfirmation(true) is called
        assert 'setShowBookingConfirmation(true)' in content, "MangoCheckout should call setShowBookingConfirmation(true)"
        
        print("✅ MangoCheckout COD flow sets showBookingConfirmation=true")
    
    def test_pharmacy_checkout_empty_cart_guard(self):
        """PharmacyCheckout empty cart guard checks showBookingConfirmation and orderDetails"""
        with open('/app/frontend/src/pages/checkout/PharmacyCheckout.jsx', 'r') as f:
            content = f.read()
        
        # Check that empty cart guard includes showBookingConfirmation and orderDetails checks
        assert '!showBookingConfirmation' in content, "PharmacyCheckout should check !showBookingConfirmation in empty cart guard"
        assert '!orderDetails' in content, "PharmacyCheckout should check !orderDetails in empty cart guard"
        
        # Check the specific guard pattern
        assert 'pharmacyCart.length === 0 && !showCuraPay && !showBookingConfirmation && !orderDetails' in content, \
            "PharmacyCheckout empty cart guard should check all conditions"
        
        print("✅ PharmacyCheckout empty cart guard checks showBookingConfirmation and orderDetails")


class TestCuraPayTransitionTiming:
    """Test CuraPay transition fires AFTER API success"""
    
    def test_mango_checkout_curapay_after_api(self):
        """MangoCheckout CuraPay transition fires AFTER API success"""
        with open('/app/frontend/src/pages/checkout/MangoCheckout.jsx', 'r') as f:
            content = f.read()
        
        # Find the placeOrder function
        place_order_section = content[content.find('const placeOrder = async'):content.find('const handleCuraPayComplete')]
        
        # Check that setShowCuraPay(true) comes AFTER API calls
        # The pattern should be: API call -> setPendingRedirect -> setShowCuraPay(true)
        api_call_pos = place_order_section.find('await fetch')
        set_curapay_pos = place_order_section.find('setShowCuraPay(true)')
        
        assert api_call_pos < set_curapay_pos, "setShowCuraPay(true) should come AFTER API call"
        
        print("✅ MangoCheckout CuraPay transition fires AFTER API success")
    
    def test_pharmacy_checkout_curapay_after_api(self):
        """PharmacyCheckout CuraPay transition fires AFTER API success"""
        with open('/app/frontend/src/pages/checkout/PharmacyCheckout.jsx', 'r') as f:
            content = f.read()
        
        # Find the placeOrder function
        place_order_section = content[content.find('const placeOrder = async'):content.find('const handleCuraPayComplete')]
        
        # Check that setShowCuraPay(true) comes AFTER API calls
        api_call_pos = place_order_section.find('await fetch')
        set_curapay_pos = place_order_section.find('setShowCuraPay(true)')
        
        assert api_call_pos < set_curapay_pos, "setShowCuraPay(true) should come AFTER API call"
        
        print("✅ PharmacyCheckout CuraPay transition fires AFTER API success")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
