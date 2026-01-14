"""
Test Enhancement Features for Nevika Cura Healthcare App
- Doctor Availability Calendar
- WhatsApp Share for Evara content
- Health Records Storage
- Medicine Reorder functionality
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://alyne-kids-health.preview.emergentagent.com')

class TestDoctorAvailabilityCalendar:
    """Test Doctor Availability Calendar feature"""
    
    def test_get_doctors_availability_returns_data(self):
        """GET /api/doctors/availability returns availability for doctors"""
        response = requests.get(f"{BASE_URL}/api/doctors/availability")
        assert response.status_code == 200
        data = response.json()
        assert "availability" in data
        assert len(data["availability"]) >= 2  # At least 2 doctors
    
    def test_availability_contains_doctor_info(self):
        """Availability response contains doctor info and slots"""
        response = requests.get(f"{BASE_URL}/api/doctors/availability?days=7")
        assert response.status_code == 200
        data = response.json()
        
        for doc_avail in data["availability"]:
            assert "doctor" in doc_avail
            assert "slots" in doc_avail
            assert "id" in doc_avail["doctor"]
            assert "name" in doc_avail["doctor"]
            assert "clinic" in doc_avail["doctor"]
    
    def test_availability_slots_have_required_fields(self):
        """Each slot has date, day, available_count, booked_count"""
        response = requests.get(f"{BASE_URL}/api/doctors/availability?days=7")
        assert response.status_code == 200
        data = response.json()
        
        for doc_avail in data["availability"]:
            assert len(doc_avail["slots"]) == 7  # 7 days
            for slot in doc_avail["slots"]:
                assert "date" in slot
                assert "day" in slot
                assert "available_count" in slot
                assert "booked_count" in slot
                assert isinstance(slot["available_count"], int)


class TestWhatsAppShareEvara:
    """Test WhatsApp Share for Evara content"""
    
    def test_get_pcos_guide_share_content(self):
        """GET /api/evara/share/pcos_guide returns share content"""
        response = requests.get(f"{BASE_URL}/api/evara/share/pcos_guide")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        assert "message" in data
        assert "whatsapp_url" in data
        assert "PCOS" in data["message"]
        assert "wa.me" in data["whatsapp_url"]
    
    def test_get_pms_guide_share_content(self):
        """GET /api/evara/share/pms_guide returns share content"""
        response = requests.get(f"{BASE_URL}/api/evara/share/pms_guide")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        assert "message" in data
        assert "whatsapp_url" in data
        assert "PMS" in data["message"]
    
    def test_get_pregnancy_tips_share_content(self):
        """GET /api/evara/share/pregnancy_tips returns share content"""
        response = requests.get(f"{BASE_URL}/api/evara/share/pregnancy_tips")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        assert "message" in data
        assert "whatsapp_url" in data
        assert "Pregnancy" in data["message"]
    
    def test_invalid_content_type_returns_404(self):
        """GET /api/evara/share/invalid returns 404"""
        response = requests.get(f"{BASE_URL}/api/evara/share/invalid_content")
        assert response.status_code == 404


class TestHealthRecordsAPI:
    """Test Health Records Storage API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for testing"""
        # Try to login with test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_health_records@example.com",
            "password": "testpass123"
        })
        
        if login_response.status_code == 200:
            return login_response.json().get("token")
        
        # Register new test user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test_health_records@example.com",
            "password": "testpass123",
            "phone": "9876543210",
            "name": "Test Health Records User"
        })
        
        if register_response.status_code == 200:
            return register_response.json().get("token")
        
        pytest.skip("Could not authenticate for health records test")
    
    def test_get_health_records_requires_auth(self):
        """GET /api/health-records requires authentication"""
        response = requests.get(f"{BASE_URL}/api/health-records")
        assert response.status_code == 401
    
    def test_get_health_records_with_auth(self, auth_token):
        """GET /api/health-records returns records for authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/health-records",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "records" in data
        assert isinstance(data["records"], list)
    
    def test_create_health_record(self, auth_token):
        """POST /api/health-records creates a new record"""
        record_data = {
            "record_type": "prescription",
            "title": f"TEST_Prescription_{uuid.uuid4().hex[:8]}",
            "notes": "Test prescription notes",
            "file_url": "https://example.com/test-prescription.pdf",
            "date": "2026-01-11"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-records",
            json=record_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "record" in data
        assert data["record"]["title"] == record_data["title"]
        assert data["record"]["record_type"] == "prescription"
    
    def test_delete_health_record(self, auth_token):
        """DELETE /api/health-records/{record_id} deletes a record"""
        # First create a record
        record_data = {
            "record_type": "lab_report",
            "title": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "notes": "This will be deleted",
            "file_url": "https://example.com/test-delete.pdf"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/health-records",
            json=record_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert create_response.status_code == 200
        record_id = create_response.json()["record"]["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/health-records/{record_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True


class TestMedicineReorderAPI:
    """Test Medicine Reorder functionality"""
    
    @pytest.fixture
    def auth_token_and_order(self):
        """Get auth token and create a pharmacy order for testing"""
        # Try to login with test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_reorder@example.com",
            "password": "testpass123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
        else:
            # Register new test user
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test_reorder@example.com",
                "password": "testpass123",
                "phone": "9876543211",
                "name": "Test Reorder User"
            })
            
            if register_response.status_code == 200:
                token = register_response.json().get("token")
            else:
                pytest.skip("Could not authenticate for reorder test")
                return None
        
        # Create a pharmacy order
        order_data = {
            "medicines": [
                {"name": "TEST_Paracetamol 500mg", "quantity": 2},
                {"name": "TEST_Vitamin D3", "quantity": 1}
            ],
            "patient_name": "Test Reorder User",
            "patient_phone": "9876543211",
            "delivery_address": "Test Address for Reorder"
        }
        
        order_response = requests.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if order_response.status_code == 200:
            order_id = order_response.json().get("id")
            return {"token": token, "order_id": order_id}
        
        pytest.skip("Could not create pharmacy order for reorder test")
    
    def test_reorder_requires_auth(self):
        """GET /api/pharmacy/reorder/{order_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/reorder/some-order-id")
        assert response.status_code == 401
    
    def test_reorder_returns_order_details(self, auth_token_and_order):
        """GET /api/pharmacy/reorder/{order_id} returns previous order details"""
        token = auth_token_and_order["token"]
        order_id = auth_token_and_order["order_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/reorder/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "delivery_address" in data
        assert "patient_name" in data
        assert "patient_phone" in data
        assert len(data["medicines"]) >= 1
    
    def test_reorder_invalid_order_returns_404(self, auth_token_and_order):
        """GET /api/pharmacy/reorder/{invalid_id} returns 404"""
        token = auth_token_and_order["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/reorder/invalid-order-id-12345",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404


class TestAppointmentReminders:
    """Test Appointment Reminder SMS feature"""
    
    def test_send_reminder_invalid_appointment_returns_404(self):
        """POST /api/appointments/{invalid_id}/send-reminder returns 404"""
        response = requests.post(f"{BASE_URL}/api/appointments/invalid-appointment-id/send-reminder")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
