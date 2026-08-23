"""
Test Medical Records Vault and Smart Reminders P1 Features
- Medical Records: Upload, List, Download, Star, Delete, Stats
- Smart Reminders: Create, List, Today, Complete, Toggle, Delete, Stats, Suggestions
"""

import pytest
import requests
import os
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9833188288"

class TestMedicalRecordsAPI:
    """Medical Records Vault API Tests"""
    
    def test_medical_records_stats(self):
        """GET /api/medical-records/stats/{phone} - Get vault stats"""
        response = requests.get(f"{BASE_URL}/api/medical-records/stats/{TEST_PHONE}")
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "total_records" in data
        assert "starred_records" in data
        assert "total_size_bytes" in data
        assert "total_size_mb" in data
        assert "category_counts" in data
        print(f"Stats: {data['total_records']} records, {data['total_size_mb']} MB")
    
    def test_medical_records_list(self):
        """GET /api/medical-records/list/{phone} - List records"""
        response = requests.get(f"{BASE_URL}/api/medical-records/list/{TEST_PHONE}")
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "records" in data
        assert "total" in data
        assert "category_counts" in data
        assert "categories" in data
        print(f"Listed {data['total']} records")
    
    def test_medical_records_list_with_category_filter(self):
        """GET /api/medical-records/list/{phone}?category=prescription - Filter by category"""
        response = requests.get(f"{BASE_URL}/api/medical-records/list/{TEST_PHONE}?category=prescription")
        assert response.status_code == 200, f"List with filter failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        # All returned records should be prescriptions
        for record in data.get("records", []):
            assert record.get("category") == "prescription", f"Wrong category: {record.get('category')}"
        print(f"Filtered to {len(data.get('records', []))} prescription records")
    
    def test_medical_records_list_with_search(self):
        """GET /api/medical-records/list/{phone}?search=test - Search records"""
        response = requests.get(f"{BASE_URL}/api/medical-records/list/{TEST_PHONE}?search=test")
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Search returned {len(data.get('records', []))} records")
    
    def test_medical_records_upload(self):
        """POST /api/medical-records/upload - Upload a test file"""
        # Create a test PDF-like file
        test_content = b"%PDF-1.4 Test medical record content"
        files = {
            'file': ('TEST_medical_record.pdf', io.BytesIO(test_content), 'application/pdf')
        }
        data = {
            'phone': TEST_PHONE,
            'category': 'lab_report',
            'title': 'TEST_Lab Report Jan 2026',
            'notes': 'Test upload from pytest',
            'doctor_name': 'Dr. Test',
            'record_date': '2026-01-15'
        }
        response = requests.post(f"{BASE_URL}/api/medical-records/upload", files=files, data=data)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result.get("success") == True
        assert "record" in result
        record = result["record"]
        assert record.get("title") == "TEST_Lab Report Jan 2026"
        assert record.get("category") == "lab_report"
        assert record.get("doctor_name") == "Dr. Test"
        assert "id" in record
        print(f"Uploaded record ID: {record['id']}")
        return record["id"]
    
    def test_medical_records_star_toggle(self):
        """PUT /api/medical-records/star/{record_id} - Toggle star"""
        # First get a record to star
        list_response = requests.get(f"{BASE_URL}/api/medical-records/list/{TEST_PHONE}")
        records = list_response.json().get("records", [])
        if not records:
            pytest.skip("No records to star")
        
        record_id = records[0]["id"]
        original_starred = records[0].get("is_starred", False)
        
        # Toggle star
        response = requests.put(f"{BASE_URL}/api/medical-records/star/{record_id}")
        assert response.status_code == 200, f"Star toggle failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "is_starred" in data
        assert data["is_starred"] != original_starred, "Star should have toggled"
        print(f"Toggled star to: {data['is_starred']}")
        
        # Toggle back
        response2 = requests.put(f"{BASE_URL}/api/medical-records/star/{record_id}")
        assert response2.status_code == 200
        assert response2.json()["is_starred"] == original_starred
    
    def test_medical_records_download(self):
        """GET /api/medical-records/download/{record_id} - Download file"""
        # Get a record to download
        list_response = requests.get(f"{BASE_URL}/api/medical-records/list/{TEST_PHONE}")
        records = list_response.json().get("records", [])
        if not records:
            pytest.skip("No records to download")
        
        record_id = records[0]["id"]
        response = requests.get(f"{BASE_URL}/api/medical-records/download/{record_id}", allow_redirects=True)
        # Should return file or 200
        assert response.status_code == 200, f"Download failed: {response.status_code}"
        print(f"Download response content-type: {response.headers.get('content-type', 'unknown')}")
    
    def test_medical_records_download_not_found(self):
        """GET /api/medical-records/download/{invalid_id} - 404 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/medical-records/download/invalid-record-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_medical_records_star_not_found(self):
        """PUT /api/medical-records/star/{invalid_id} - 404 for invalid ID"""
        response = requests.put(f"{BASE_URL}/api/medical-records/star/invalid-record-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestSmartRemindersAPI:
    """Smart Reminders API Tests"""
    
    def test_smart_reminders_stats(self):
        """GET /api/smart-reminders/stats/{phone} - Get reminder stats"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/stats/{TEST_PHONE}")
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "total_reminders" in data
        assert "active_reminders" in data
        assert "completed_today" in data
        assert "type_counts" in data
        print(f"Stats: {data['total_reminders']} total, {data['active_reminders']} active")
    
    def test_smart_reminders_list(self):
        """GET /api/smart-reminders/list/{phone} - List reminders"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/list/{TEST_PHONE}")
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "reminders" in data
        assert "total" in data
        assert "type_counts" in data
        assert "types" in data
        print(f"Listed {data['total']} reminders")
    
    def test_smart_reminders_list_with_type_filter(self):
        """GET /api/smart-reminders/list/{phone}?reminder_type=medication - Filter by type"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/list/{TEST_PHONE}?reminder_type=medication")
        assert response.status_code == 200, f"List with filter failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        for reminder in data.get("reminders", []):
            assert reminder.get("reminder_type") == "medication"
        print(f"Filtered to {len(data.get('reminders', []))} medication reminders")
    
    def test_smart_reminders_today(self):
        """GET /api/smart-reminders/today/{phone} - Get today's reminders"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/today/{TEST_PHONE}")
        assert response.status_code == 200, f"Today failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "date" in data
        assert "upcoming" in data
        assert "past" in data
        assert "total_today" in data
        print(f"Today: {data['total_today']} reminders ({len(data['upcoming'])} upcoming, {len(data['past'])} past)")
    
    def test_smart_reminders_suggestions(self):
        """GET /api/smart-reminders/suggestions/{phone} - Get smart suggestions"""
        response = requests.get(f"{BASE_URL}/api/smart-reminders/suggestions/{TEST_PHONE}")
        assert response.status_code == 200, f"Suggestions failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "suggestions" in data
        print(f"Got {len(data['suggestions'])} suggestions")
    
    def test_smart_reminders_create(self):
        """POST /api/smart-reminders/create - Create a reminder"""
        payload = {
            "phone": TEST_PHONE,
            "title": "TEST_Take Blood Pressure Medicine",
            "reminder_type": "medication",
            "description": "Morning dose",
            "reminder_time": "08:00",
            "reminder_date": "2026-01-20",
            "recurrence": "daily",
            "priority": "high",
            "notes": "Test reminder from pytest"
        }
        response = requests.post(f"{BASE_URL}/api/smart-reminders/create", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "reminder" in data
        reminder = data["reminder"]
        assert reminder.get("title") == "TEST_Take Blood Pressure Medicine"
        assert reminder.get("reminder_type") == "medication"
        assert reminder.get("priority") == "high"
        assert reminder.get("recurrence") == "daily"
        assert reminder.get("is_active") == True
        assert "id" in reminder
        print(f"Created reminder ID: {reminder['id']}")
        return reminder["id"]
    
    def test_smart_reminders_complete(self):
        """PUT /api/smart-reminders/complete/{id} - Mark as completed"""
        # Get a reminder to complete
        list_response = requests.get(f"{BASE_URL}/api/smart-reminders/list/{TEST_PHONE}")
        reminders = list_response.json().get("reminders", [])
        if not reminders:
            pytest.skip("No reminders to complete")
        
        reminder_id = reminders[0]["id"]
        response = requests.put(f"{BASE_URL}/api/smart-reminders/complete/{reminder_id}")
        assert response.status_code == 200, f"Complete failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Completed reminder: {reminder_id}")
    
    def test_smart_reminders_toggle(self):
        """PUT /api/smart-reminders/toggle/{id} - Toggle active/inactive"""
        # Get a reminder to toggle
        list_response = requests.get(f"{BASE_URL}/api/smart-reminders/list/{TEST_PHONE}?active_only=false")
        reminders = list_response.json().get("reminders", [])
        if not reminders:
            pytest.skip("No reminders to toggle")
        
        reminder_id = reminders[0]["id"]
        original_active = reminders[0].get("is_active", True)
        
        response = requests.put(f"{BASE_URL}/api/smart-reminders/toggle/{reminder_id}")
        assert response.status_code == 200, f"Toggle failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "is_active" in data
        assert data["is_active"] != original_active, "Active state should have toggled"
        print(f"Toggled active to: {data['is_active']}")
        
        # Toggle back
        response2 = requests.put(f"{BASE_URL}/api/smart-reminders/toggle/{reminder_id}")
        assert response2.status_code == 200
    
    def test_smart_reminders_complete_not_found(self):
        """PUT /api/smart-reminders/complete/{invalid_id} - 404 for invalid ID"""
        response = requests.put(f"{BASE_URL}/api/smart-reminders/complete/invalid-reminder-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_smart_reminders_toggle_not_found(self):
        """PUT /api/smart-reminders/toggle/{invalid_id} - 404 for invalid ID"""
        response = requests.put(f"{BASE_URL}/api/smart-reminders/toggle/invalid-reminder-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_medical_records(self):
        """Delete TEST_ prefixed medical records"""
        list_response = requests.get(f"{BASE_URL}/api/medical-records/list/{TEST_PHONE}?search=TEST_")
        records = list_response.json().get("records", [])
        deleted = 0
        for record in records:
            if record.get("title", "").startswith("TEST_"):
                del_response = requests.delete(f"{BASE_URL}/api/medical-records/delete/{record['id']}")
                if del_response.status_code == 200:
                    deleted += 1
        print(f"Cleaned up {deleted} test medical records")
    
    def test_cleanup_test_reminders(self):
        """Delete TEST_ prefixed reminders"""
        list_response = requests.get(f"{BASE_URL}/api/smart-reminders/list/{TEST_PHONE}?active_only=false")
        reminders = list_response.json().get("reminders", [])
        deleted = 0
        for reminder in reminders:
            if reminder.get("title", "").startswith("TEST_"):
                del_response = requests.delete(f"{BASE_URL}/api/smart-reminders/delete/{reminder['id']}")
                if del_response.status_code == 200:
                    deleted += 1
        print(f"Cleaned up {deleted} test reminders")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
