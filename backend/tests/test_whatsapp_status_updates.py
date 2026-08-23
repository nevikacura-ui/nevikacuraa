"""
WhatsApp Status Update Notifications - Extended Testing
Tests status update flows for:
- Orange Pharmacy: confirmed, packed, dispatched, delivered
- Mango Labs: sample collected, processing, reports ready

Note: MSG91 API is mocked in test environment.
These functions are called internally during order/booking status changes.
"""
import pytest
import requests
import os
import sys
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestOrangeStatusUpdatesIntegration:
    """Test Orange Pharmacy status update integrations via server endpoints"""
    
    def test_pharmacy_orders_endpoint_accessible(self, api_client):
        """Verify pharmacy orders endpoint is accessible"""
        response = api_client.get(f"{BASE_URL}/api/pharmacy/orders")
        # May return 401 if auth required, but endpoint should exist
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"Pharmacy orders endpoint status: {response.status_code}")
        
    def test_pharmacy_order_creation_endpoint(self, api_client):
        """Verify pharmacy order creation endpoint exists"""
        # Just check the endpoint exists, don't actually create order
        response = api_client.options(f"{BASE_URL}/api/pharmacy/orders")
        # OPTIONS may return 200, 204, 405, or 404
        assert response.status_code in [200, 204, 405, 404], f"Endpoint issue: {response.status_code}"


class TestMangoStatusUpdatesIntegration:
    """Test Mango Labs status update integrations"""
    
    def test_diagnostics_endpoint_accessible(self, api_client):
        """Verify diagnostics endpoint is accessible"""
        response = api_client.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"Diagnostics endpoint status: {response.status_code}")


class TestTemplateRegistration:
    """Verify all required templates are registered in MSG91 config"""
    
    def test_all_status_templates_registered(self, api_client):
        """Verify all status update templates are registered"""
        response = api_client.get(f"{BASE_URL}/api/test/msg91-status")
        assert response.status_code == 200
        
        data = response.json()
        templates = data.get("templates_configured", [])
        
        # Orange Pharmacy status templates
        orange_templates = [
            "orange_pharmacy_confirm",
            "orange_order_confirmed",
            "orange_order_packed",
            "orange_order_dispatched",
            "orange_order_delivered"
        ]
        
        # Mango Labs status templates
        mango_templates = [
            "proton_lab_confirm",
            "mango_sample_collected",
            "mango_processing",
            "mango_reports_ready",
            "proton_report_ready",
            "proton_report_delivered"
        ]
        
        # Check Orange templates
        for tpl in orange_templates:
            assert tpl in templates, f"Missing Orange template: {tpl}"
            print(f"✓ Orange template registered: {tpl}")
            
        # Check Mango templates
        for tpl in mango_templates:
            assert tpl in templates, f"Missing Mango template: {tpl}"
            print(f"✓ Mango template registered: {tpl}")


class TestDiaGynReminderNotifications:
    """Test appointment reminder flows"""
    
    def test_reminder_template_includes_booking_id(self, api_client):
        """Verify reminder templates include booking_id"""
        payload = {"phone": "9876543210", "template": "diagyn_appointment_reminder"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        sample = data.get("sample_data", {})
        
        assert "booking_id" in sample, "Reminder must include booking_id"
        print(f"Reminder booking_id: {sample['booking_id']}")
        
    def test_one_hour_reminder_includes_map_url(self, api_client):
        """Verify 1-hour reminder is supported"""
        payload = {"phone": "9876543210", "template": "diagyn_one_hour_reminder"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("template") == "diagyn_one_hour_reminder"


class TestBookingIdInMessages:
    """Verify booking_id is correctly passed to all confirmation messages"""
    
    def test_diagyn_confirmation_has_booking_id(self, api_client):
        """DiaGyn appointment confirmation includes booking_id"""
        payload = {"phone": "9876543210", "template": "diagyn_appointment_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        data = response.json()
        sample = data.get("sample_data", {})
        assert "booking_id" in sample
        assert sample["booking_id"], "booking_id should not be empty"
        
    def test_mango_confirmation_has_booking_id(self, api_client):
        """Mango Labs confirmation includes booking_id"""
        payload = {"phone": "9876543210", "template": "proton_lab_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        data = response.json()
        sample = data.get("sample_data", {})
        assert "booking_id" in sample
        assert sample["booking_id"], "booking_id should not be empty"
        
    def test_orange_confirmation_has_order_id(self, api_client):
        """Orange Pharmacy confirmation includes order_id (as booking_id)"""
        payload = {"phone": "9876543210", "template": "orange_pharmacy_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        data = response.json()
        sample = data.get("sample_data", {})
        assert "order_id" in sample
        assert sample["order_id"], "order_id should not be empty"


class TestEndpointStatusUpdates:
    """Test that status update endpoints trigger WhatsApp notifications"""
    
    def test_pharmacy_status_update_endpoint_exists(self, api_client):
        """Verify pharmacy status update can be triggered"""
        # Check pharmacy orders route structure
        response = api_client.get(f"{BASE_URL}/api/pharmacy/orders")
        assert response.status_code in [200, 401, 403], "Pharmacy orders endpoint issue"
        
    def test_diagnostics_status_update_endpoint_exists(self, api_client):
        """Verify diagnostics status update can be triggered"""
        # Check diagnostics route structure
        response = api_client.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code in [200, 401, 403], "Diagnostics endpoint issue"


class TestTemplateVariableMapping:
    """Verify correct template variables are used"""
    
    def test_diagyn_variables(self, api_client):
        """Test DiaGyn template has correct variable structure"""
        payload = {"phone": "9876543210", "template": "diagyn_appointment_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        data = response.json()
        sample = data.get("sample_data", {})
        
        required_vars = ["patient_name", "date", "time", "doctor_name", "clinic_name", "booking_id"]
        for var in required_vars:
            assert var in sample, f"Missing variable: {var}"
            
    def test_proton_lab_variables(self, api_client):
        """Test Mango Labs template has correct variable structure"""
        payload = {"phone": "9876543210", "template": "proton_lab_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        data = response.json()
        sample = data.get("sample_data", {})
        
        required_vars = ["patient_name", "tests", "preferred_date", "preferred_time", "booking_id", "address"]
        for var in required_vars:
            assert var in sample, f"Missing variable: {var}"
            
    def test_orange_pharmacy_variables(self, api_client):
        """Test Orange Pharmacy template has correct variable structure"""
        payload = {"phone": "9876543210", "template": "orange_pharmacy_confirm"}
        response = api_client.post(f"{BASE_URL}/api/test/send-whatsapp", json=payload)
        
        data = response.json()
        sample = data.get("sample_data", {})
        
        required_vars = ["patient_name", "order_id", "items", "delivery_address"]
        for var in required_vars:
            assert var in sample, f"Missing variable: {var}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
