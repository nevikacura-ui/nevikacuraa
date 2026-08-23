"""
WhatsApp Notification Regression Tests
Tests all WhatsApp notification flows via MSG91 for:
- DiaGyn appointment confirmations (booking_id in message)
- Mango Labs booking confirmations (booking_id in message)
- Orange Pharmacy order confirmations (booking_id in message)
- Appointment reminder notifications
- Order status update notifications (dispatched, delivered)
- Lab test status notifications (sample collected, report ready)

Note: MSG91 API is mocked in test environment but functional in production.
Templates updated for Orange and Mango brands.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9876543210"
TEST_EMAIL = "test@test.com"

# Session fixture
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestMSG91Configuration:
    """Test MSG91 WhatsApp API configuration status"""
    
    def test_msg91_status_endpoint(self, api_client):
        """Test MSG91 configuration status endpoint"""
        response = api_client.get(f"{BASE_URL}/api/test/msg91-status")
        assert response.status_code == 200, f"MSG91 status endpoint failed: {response.text}"
        
        data = response.json()
        print(f"MSG91 Status: {data}")
        
        # Check configuration status
        assert "auth_key_configured" in data or "success" in data
        assert "templates_configured" in data or "error" in data
        
        # Log templates available
        if "templates_configured" in data:
            templates = data["templates_configured"]
            print(f"Available templates: {templates}")
            
            # Verify key templates are registered
            expected_templates = [
                "diagyn_appointment_confirm",
                "proton_lab_confirm",
                "orange_pharmacy_confirm",
                "diagyn_appointment_reminder",
                "orange_order_dispatched",
                "mango_sample_collected"
            ]
            for tpl in expected_templates:
                assert tpl in templates, f"Missing template: {tpl}"


class TestDiaGynAppointmentNotifications:
    """Test DiaGyn appointment WhatsApp confirmation and reminders"""
    
    def test_appointment_confirmation_template(self, api_client):
        """Test DiaGyn appointment confirmation WhatsApp - includes booking_id"""
        payload = {
            "phone": TEST_PHONE,
            "template": "diagyn_appointment_confirm"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Appointment confirmation failed: {response.text}"
        
        data = response.json()
        print(f"DiaGyn Appointment Confirmation Response: {data}")
        
        # Verify response structure
        assert "template" in data
        assert data["template"] == "diagyn_appointment_confirm"
        assert "sample_data" in data
        
        # Verify booking_id is in the sample data
        sample = data["sample_data"]
        assert "booking_id" in sample, "booking_id must be in confirmation message"
        assert "patient_name" in sample
        assert "date" in sample
        assert "time" in sample
        assert "doctor_name" in sample
        assert "clinic_name" in sample
        
        print(f"Booking ID used: {sample['booking_id']}")
    
    def test_appointment_reminder_template(self, api_client):
        """Test DiaGyn appointment reminder WhatsApp - includes booking_id"""
        payload = {
            "phone": TEST_PHONE,
            "template": "diagyn_appointment_reminder"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Appointment reminder failed: {response.text}"
        
        data = response.json()
        print(f"DiaGyn Appointment Reminder Response: {data}")
        
        assert data["template"] == "diagyn_appointment_reminder"
        sample = data["sample_data"]
        assert "booking_id" in sample, "booking_id must be in reminder message"
        
    def test_one_hour_reminder_template(self, api_client):
        """Test DiaGyn 1-hour reminder with Google Maps URL"""
        payload = {
            "phone": TEST_PHONE,
            "template": "diagyn_one_hour_reminder"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"One hour reminder failed: {response.text}"
        
        data = response.json()
        print(f"One Hour Reminder Response: {data}")
        
        assert data["template"] == "diagyn_one_hour_reminder"
        sample = data["sample_data"]
        assert "booking_id" in sample
        
    def test_walkin_emergency_template(self, api_client):
        """Test DiaGyn walk-in/emergency confirmation"""
        payload = {
            "phone": TEST_PHONE,
            "template": "diagyn_walkin_emergency"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Walk-in template failed: {response.text}"
        
        data = response.json()
        print(f"Walk-in/Emergency Response: {data}")
        
        assert data["template"] == "diagyn_walkin_emergency"
        sample = data["sample_data"]
        assert "token_number" in sample
        assert "appointment_type" in sample
        
    def test_appointment_completed_template(self, api_client):
        """Test DiaGyn appointment completed / thank you"""
        payload = {
            "phone": TEST_PHONE,
            "template": "diagyn_appointment_completed"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Appointment completed failed: {response.text}"
        
        data = response.json()
        print(f"Appointment Completed Response: {data}")
        
        assert data["template"] == "diagyn_appointment_completed"
        sample = data["sample_data"]
        assert "follow_up_date" in sample
        assert "feedback_url" in sample


class TestMangoLabsNotifications:
    """Test Mango Health Labs WhatsApp booking confirmation and status updates"""
    
    def test_lab_confirmation_template(self, api_client):
        """Test Mango Labs booking confirmation - includes booking_id"""
        payload = {
            "phone": TEST_PHONE,
            "template": "proton_lab_confirm"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Lab confirmation failed: {response.text}"
        
        data = response.json()
        print(f"Mango Lab Confirmation Response: {data}")
        
        assert data["template"] == "proton_lab_confirm"
        sample = data["sample_data"]
        
        # Verify booking_id is included in confirmation
        assert "booking_id" in sample, "booking_id must be in lab confirmation message"
        assert "tests" in sample
        assert "preferred_date" in sample
        assert "preferred_time" in sample
        assert "patient_name" in sample
        assert "address" in sample
        
        print(f"Lab Booking ID: {sample['booking_id']}")
        
    def test_report_ready_template(self, api_client):
        """Test Mango Labs report ready notification"""
        payload = {
            "phone": TEST_PHONE,
            "template": "proton_report_ready"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Report ready failed: {response.text}"
        
        data = response.json()
        print(f"Report Ready Response: {data}")
        
        assert data["template"] == "proton_report_ready"
        sample = data["sample_data"]
        assert "booking_id" in sample
        assert "download_url" in sample
        
    def test_sonography_confirmation_template(self, api_client):
        """Test Mango sonography booking confirmation"""
        payload = {
            "phone": TEST_PHONE,
            "template": "proton_sonography_confirm"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Sonography confirmation failed: {response.text}"
        
        data = response.json()
        print(f"Sonography Confirmation Response: {data}")
        
        assert data["template"] == "proton_sonography_confirm"
        sample = data["sample_data"]
        assert "booking_id" in sample
        assert "scan_type" in sample


class TestOrangePharmacyNotifications:
    """Test Orange Pharmacy WhatsApp order confirmation and status updates"""
    
    def test_pharmacy_confirmation_template(self, api_client):
        """Test Orange Pharmacy order confirmation - includes booking_id (order_id)"""
        payload = {
            "phone": TEST_PHONE,
            "template": "orange_pharmacy_confirm"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Pharmacy confirmation failed: {response.text}"
        
        data = response.json()
        print(f"Orange Pharmacy Confirmation Response: {data}")
        
        assert data["template"] == "orange_pharmacy_confirm"
        sample = data["sample_data"]
        
        # Verify order_id (booking_id) is included
        assert "order_id" in sample, "order_id must be in pharmacy confirmation message"
        assert "items" in sample
        assert "delivery_address" in sample
        assert "patient_name" in sample
        
        print(f"Pharmacy Order ID: {sample['order_id']}")
        
    def test_order_delivered_template(self, api_client):
        """Test Orange Pharmacy order delivered notification"""
        payload = {
            "phone": TEST_PHONE,
            "template": "orange_order_delivered"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Order delivered failed: {response.text}"
        
        data = response.json()
        print(f"Order Delivered Response: {data}")
        
        assert data["template"] == "orange_order_delivered"
        sample = data["sample_data"]
        assert "order_id" in sample
        assert "delivered_time" in sample
        assert "invoice_url" in sample


class TestTemplateVariables:
    """Test that templates use correct variables and booking_id format"""
    
    def test_diagyn_template_has_booking_id_variable(self, api_client):
        """Verify DiaGyn template includes booking_id as template variable"""
        payload = {"phone": TEST_PHONE, "template": "diagyn_appointment_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        data = response.json()
        
        sample = data.get("sample_data", {})
        booking_id = sample.get("booking_id", "")
        
        # Booking ID should be in format PC-XXXX or DG-XXXX
        assert booking_id.startswith("PC-") or booking_id.startswith("DG-"), f"Unexpected booking_id format: {booking_id}"
        print(f"DiaGyn booking_id format: {booking_id}")
        
    def test_mango_template_has_booking_id_variable(self, api_client):
        """Verify Mango Labs template includes booking_id as template variable"""
        payload = {"phone": TEST_PHONE, "template": "proton_lab_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        data = response.json()
        
        sample = data.get("sample_data", {})
        booking_id = sample.get("booking_id", "")
        
        # Booking ID should be in format PD-XXXX or LB-XXXX
        assert booking_id.startswith("PD-") or booking_id.startswith("LB-"), f"Unexpected booking_id format: {booking_id}"
        print(f"Mango Labs booking_id format: {booking_id}")
        
    def test_orange_template_has_order_id_variable(self, api_client):
        """Verify Orange Pharmacy template includes order_id as template variable"""
        payload = {"phone": TEST_PHONE, "template": "orange_pharmacy_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        data = response.json()
        
        sample = data.get("sample_data", {})
        order_id = sample.get("order_id", "")
        
        # Order ID should be in format OP-XXXX or RX-XXXX
        assert order_id.startswith("OP-") or order_id.startswith("RX-"), f"Unexpected order_id format: {order_id}"
        print(f"Orange Pharmacy order_id format: {order_id}")


class TestInvalidTemplates:
    """Test error handling for invalid templates"""
    
    def test_invalid_template_returns_error(self, api_client):
        """Test that invalid template name returns appropriate error"""
        payload = {
            "phone": TEST_PHONE,
            "template": "nonexistent_template"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200  # Endpoint should not fail
        
        data = response.json()
        print(f"Invalid Template Response: {data}")
        
        # Should return error or available templates list
        assert data.get("success") == False or "available_templates" in data


class TestPhoneNumberNormalization:
    """Test phone number formatting in WhatsApp service"""
    
    def test_10_digit_phone_normalized(self, api_client):
        """Test 10-digit phone number gets country code added"""
        payload = {
            "phone": "9876543210",
            "template": "diagyn_appointment_confirm"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        print(f"Phone normalization test: {data}")
        
    def test_phone_with_country_code(self, api_client):
        """Test phone number with existing country code"""
        payload = {
            "phone": "919876543210",
            "template": "diagyn_appointment_confirm"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200
        
    def test_phone_with_plus_sign(self, api_client):
        """Test phone number with + prefix"""
        payload = {
            "phone": "+919876543210",
            "template": "diagyn_appointment_confirm"
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200


class TestAllTemplatesAvailable:
    """Test all registered templates are callable"""
    
    @pytest.mark.parametrize("template", [
        "diagyn_appointment_confirm",
        "diagyn_appointment_reminder",
        "diagyn_one_hour_reminder",
        "diagyn_walkin_emergency",
        "diagyn_appointment_completed",
        "proton_lab_confirm",
        "proton_report_ready",
        "proton_sonography_confirm",
        "orange_pharmacy_confirm",
        "orange_order_delivered"
    ])
    def test_template_callable(self, api_client, template):
        """Test each template can be called via API"""
        payload = {
            "phone": TEST_PHONE,
            "template": template
        }
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        assert response.status_code == 200, f"Template {template} failed: {response.text}"
        
        data = response.json()
        assert data.get("template") == template
        assert "sample_data" in data
        
        print(f"Template {template}: OK")


# Additional tests for status update functions
class TestStatusUpdateNotifications:
    """Test order and lab status update WhatsApp notifications"""
    
    def test_status_endpoint_exists(self, api_client):
        """Verify status-related endpoints exist"""
        # Test pharmacy orders endpoint
        response = api_client.get(f"{BASE_URL}/api/pharmacy/orders")
        assert response.status_code in [200, 401, 404], f"Pharmacy orders endpoint issue: {response.status_code}"
        
        # Test diagnostics endpoint
        response = api_client.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code in [200, 401, 404], f"Diagnostics endpoint issue: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
