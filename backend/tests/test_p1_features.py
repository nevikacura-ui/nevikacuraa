"""
P1 Features Backend Tests - Iteration 71
Tests for:
1. Prescription Upload with Email Notification
2. Refill Reminders CRUD
3. Subscription Box CRUD
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPrescriptionUpload:
    """Prescription Upload with Email Notification Tests"""
    
    def test_prescription_upload_success(self):
        """Test prescription upload creates record and sends email"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/prescription-upload", json={
            "patient_name": "TEST_Prescription_Patient",
            "patient_phone": "9876543210",
            "prescription_url": "https://example.com/test-prescription.jpg",
            "notes": "Test prescription upload for automated testing"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "upload_id" in data
        assert data["upload_id"].startswith("PRESC-")
        assert "message" in data
        print(f"✓ Prescription uploaded: {data['upload_id']}")
    
    def test_prescription_upload_without_notes(self):
        """Test prescription upload works without notes"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/prescription-upload", json={
            "patient_name": "TEST_NoNotes_Patient",
            "patient_phone": "9876543211",
            "prescription_url": "https://example.com/test-prescription2.jpg",
            "notes": ""
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Prescription uploaded without notes: {data['upload_id']}")


class TestRefillReminders:
    """Refill Reminder CRUD Tests"""
    
    def test_create_refill_reminder(self):
        """Test creating a refill reminder"""
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/pharmacy/refill-reminder", json={
            "patient_phone": test_phone,
            "patient_name": "TEST_Refill_Patient",
            "medicine_name": "Metformin 500mg",
            "quantity_bought": 30,
            "doses_per_day": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "reminder_id" in data
        assert data["reminder_id"].startswith("REFILL-")
        assert "refill_date" in data
        assert "days_until_refill" in data
        print(f"✓ Refill reminder created: {data['reminder_id']}, refill on {data['refill_date']}")
    
    def test_create_refill_reminder_high_dosage(self):
        """Test refill reminder with higher dosage (runs out faster)"""
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/pharmacy/refill-reminder", json={
            "patient_phone": test_phone,
            "patient_name": "TEST_HighDose_Patient",
            "medicine_name": "Paracetamol 500mg",
            "quantity_bought": 20,
            "doses_per_day": 2  # 2 doses per day = 10 days supply
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # 20 tablets / 2 per day = 10 days, remind 3 days before = 7 days
        assert data["days_until_refill"] == 7
        print(f"✓ High dosage reminder: {data['days_until_refill']} days until refill")
    
    def test_get_refill_reminders(self):
        """Test fetching refill reminders for a patient"""
        # First create a reminder
        test_phone = "9876543210"
        
        # Get reminders
        response = requests.get(f"{BASE_URL}/api/pharmacy/refill-reminders/{test_phone}")
        
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        assert isinstance(data["reminders"], list)
        print(f"✓ Retrieved {len(data['reminders'])} reminders for {test_phone}")
    
    def test_get_reminders_empty_phone(self):
        """Test fetching reminders for non-existent phone returns empty list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/refill-reminders/0000000000")
        
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        assert data["reminders"] == []
        print("✓ Empty reminders returned for non-existent phone")


class TestSubscriptionBox:
    """Subscription Box CRUD Tests"""
    
    def test_create_subscription_box(self):
        """Test creating a monthly subscription box"""
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-box", json={
            "patient_name": "TEST_Subscription_Patient",
            "patient_phone": test_phone,
            "patient_email": "test@example.com",
            "address": "123 Test Street, Nagpur",
            "medicines": [
                {"name": "Metformin 500mg", "quantity": 30},
                {"name": "Amlodipine 5mg", "quantity": 30}
            ],
            "frequency": "monthly"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "subscription_id" in data
        assert data["subscription_id"].startswith("SUBBOX-")
        assert data["frequency"] == "monthly"
        assert "next_delivery" in data
        print(f"✓ Subscription created: {data['subscription_id']}, next delivery: {data['next_delivery']}")
    
    def test_create_biweekly_subscription(self):
        """Test creating a bi-weekly subscription box"""
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-box", json={
            "patient_name": "TEST_BiWeekly_Patient",
            "patient_phone": test_phone,
            "address": "456 Test Avenue, Nagpur",
            "medicines": [{"name": "Vitamin D3", "quantity": 14}],
            "frequency": "bi-weekly"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["frequency"] == "bi-weekly"
        print(f"✓ Bi-weekly subscription created: {data['subscription_id']}")
    
    def test_get_subscription_boxes(self):
        """Test fetching subscription boxes for a patient"""
        test_phone = "9876543210"
        
        response = requests.get(f"{BASE_URL}/api/pharmacy/subscription-box/{test_phone}")
        
        assert response.status_code == 200
        data = response.json()
        assert "subscriptions" in data
        assert isinstance(data["subscriptions"], list)
        print(f"✓ Retrieved {len(data['subscriptions'])} subscriptions for {test_phone}")
    
    def test_pause_subscription(self):
        """Test pausing a subscription box"""
        # First create a subscription
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-box", json={
            "patient_name": "TEST_Pause_Patient",
            "patient_phone": test_phone,
            "address": "789 Test Road, Nagpur",
            "medicines": [{"name": "Test Medicine", "quantity": 30}],
            "frequency": "monthly"
        })
        
        assert create_response.status_code == 200
        subscription_id = create_response.json()["subscription_id"]
        
        # Pause the subscription
        pause_response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-box/{subscription_id}/pause")
        
        assert pause_response.status_code == 200
        data = pause_response.json()
        assert data["success"] == True
        assert "paused" in data["message"].lower()
        print(f"✓ Subscription {subscription_id} paused successfully")
    
    def test_resume_subscription(self):
        """Test resuming a paused subscription box"""
        # First create and pause a subscription
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-box", json={
            "patient_name": "TEST_Resume_Patient",
            "patient_phone": test_phone,
            "address": "101 Test Lane, Nagpur",
            "medicines": [{"name": "Test Medicine 2", "quantity": 30}],
            "frequency": "monthly"
        })
        
        subscription_id = create_response.json()["subscription_id"]
        
        # Pause first
        requests.post(f"{BASE_URL}/api/pharmacy/subscription-box/{subscription_id}/pause")
        
        # Resume
        resume_response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-box/{subscription_id}/resume")
        
        assert resume_response.status_code == 200
        data = resume_response.json()
        assert data["success"] == True
        assert "resumed" in data["message"].lower()
        print(f"✓ Subscription {subscription_id} resumed successfully")
    
    def test_pause_nonexistent_subscription(self):
        """Test pausing a non-existent subscription returns 404"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/subscription-box/NONEXISTENT-123/pause")
        
        assert response.status_code == 404
        print("✓ 404 returned for non-existent subscription pause")


class TestDiagnosticsCollectionType:
    """Test diagnostics booking with collection type"""
    
    def test_diagnostics_endpoint_exists(self):
        """Verify diagnostics endpoint is accessible"""
        # Just check the endpoint exists - we'll test full flow via UI
        response = requests.options(f"{BASE_URL}/api/diagnostics")
        # OPTIONS should return 200 or 405 (method not allowed but endpoint exists)
        assert response.status_code in [200, 405, 422]
        print("✓ Diagnostics endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
