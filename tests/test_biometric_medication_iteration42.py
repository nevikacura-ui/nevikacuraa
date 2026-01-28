"""
Test Suite for Biometric Attendance and Medication Tracker Features
Iteration 42 - Testing staff attendance data saving and medication tracker functionality

Endpoints tested:
- Biometric Attendance: /api/biometric-attendance/*
- Medication Tracker: /api/medication-tracker/*
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://medportal-nevika.preview.emergentagent.com').rstrip('/')

# Test data identifiers
TEST_STAFF_ID = f"test_staff_{uuid.uuid4().hex[:8]}"
TEST_USER_ID = f"test_user_{uuid.uuid4().hex[:8]}"
TEST_MEDICATION_ID = None  # Will be set after creating medication


class TestBiometricAttendanceReport:
    """Test biometric attendance report endpoints"""
    
    def test_get_clinic_report_pushpa(self):
        """Test GET /api/biometric-attendance/report/{clinic} for pushpa clinic"""
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/report/pushpa")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "pushpa"
        assert "date" in data
        assert "report" in data
        assert "summary" in data
        assert "total_staff" in data["summary"]
        assert "present" in data["summary"]
        assert "late" in data["summary"]
        assert "absent" in data["summary"]
        print(f"✓ Pushpa clinic report: {data['summary']['total_staff']} staff, {data['summary']['present']} present")
    
    def test_get_clinic_report_with_date(self):
        """Test GET /api/biometric-attendance/report/{clinic} with specific date"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/report/pushpa?date={today}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["date"] == today
        print(f"✓ Report for date {today} retrieved successfully")
    
    def test_get_monthly_report(self):
        """Test GET /api/biometric-attendance/monthly-report"""
        year = datetime.now().year
        month = datetime.now().month
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/monthly-report?clinic=pushpa&year={year}&month={month}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["clinic"] == "pushpa"
        assert data["year"] == year
        assert data["month"] == month
        assert "total_working_days" in data
        assert "staff_report" in data
        assert "summary" in data
        assert "total_staff" in data["summary"]
        assert "avg_attendance_rate" in data["summary"]
        print(f"✓ Monthly report: {data['summary']['total_staff']} staff, avg rate: {data['summary']['avg_attendance_rate']}%")


class TestBiometricAttendanceFlow:
    """Test biometric attendance registration and marking flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        global TEST_STAFF_ID
        TEST_STAFF_ID = f"test_staff_{uuid.uuid4().hex[:8]}"
    
    def test_register_device(self):
        """Test POST /api/biometric-attendance/register-device"""
        payload = {
            "staff_id": TEST_STAFF_ID,
            "staff_name": "Test Staff Iteration42",
            "clinic": "pushpa",
            "device_id": f"device_{uuid.uuid4().hex[:8]}",
            "credential_id": f"cred_{uuid.uuid4().hex[:8]}",
            "public_key": "test_public_key_42",
            "device_name": "Test Device 42"
        }
        
        response = requests.post(f"{BASE_URL}/api/biometric-attendance/register-device", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "device_id" in data
        print(f"✓ Device registered for staff: {TEST_STAFF_ID}")
        
        # Store credential_id for later tests
        self.__class__.credential_id = payload["credential_id"]
    
    def test_mark_check_in(self):
        """Test POST /api/biometric-attendance/mark-attendance for check-in"""
        # First register device
        credential_id = f"cred_{uuid.uuid4().hex[:8]}"
        register_payload = {
            "staff_id": TEST_STAFF_ID,
            "staff_name": "Test Staff CheckIn",
            "clinic": "pushpa",
            "device_id": f"device_{uuid.uuid4().hex[:8]}",
            "credential_id": credential_id,
            "public_key": "test_public_key",
            "device_name": "Test Device"
        }
        requests.post(f"{BASE_URL}/api/biometric-attendance/register-device", json=register_payload)
        
        # Mark check-in
        payload = {
            "staff_id": TEST_STAFF_ID,
            "credential_id": credential_id,
            "signature": "test_signature",
            "action": "check_in"
        }
        
        response = requests.post(f"{BASE_URL}/api/biometric-attendance/mark-attendance", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "check_in_time" in data
        assert data["status"] in ["present", "late"]
        print(f"✓ Check-in marked at {data['check_in_time']}, status: {data['status']}")
    
    def test_get_today_attendance(self):
        """Test GET /api/biometric-attendance/today/{staff_id}"""
        # First register and check-in
        staff_id = f"test_staff_{uuid.uuid4().hex[:8]}"
        credential_id = f"cred_{uuid.uuid4().hex[:8]}"
        
        register_payload = {
            "staff_id": staff_id,
            "staff_name": "Test Staff Today",
            "clinic": "pushpa",
            "device_id": f"device_{uuid.uuid4().hex[:8]}",
            "credential_id": credential_id,
            "public_key": "test_public_key",
            "device_name": "Test Device"
        }
        requests.post(f"{BASE_URL}/api/biometric-attendance/register-device", json=register_payload)
        
        checkin_payload = {
            "staff_id": staff_id,
            "credential_id": credential_id,
            "signature": "test_signature",
            "action": "check_in"
        }
        requests.post(f"{BASE_URL}/api/biometric-attendance/mark-attendance", json=checkin_payload)
        
        # Get today's attendance
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/today/{staff_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "date" in data
        assert "attendance" in data
        assert data["attendance"]["staff_id"] == staff_id
        print(f"✓ Today's attendance retrieved for {staff_id}")
    
    def test_get_attendance_history(self):
        """Test GET /api/biometric-attendance/history/{staff_id}"""
        # Use existing staff
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/history/staff_pushpa_01?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "history" in data
        assert "summary" in data
        assert "present_days" in data["summary"]
        assert "late_days" in data["summary"]
        assert "absent_days" in data["summary"]
        print(f"✓ Attendance history retrieved: {data['summary']['present_days']} present days")


class TestMedicationTrackerCRUD:
    """Test medication tracker CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        global TEST_USER_ID
        TEST_USER_ID = f"test_user_{uuid.uuid4().hex[:8]}"
    
    def test_add_medication(self):
        """Test POST /api/medication-tracker/medications/{user_id}"""
        global TEST_MEDICATION_ID
        
        payload = {
            "name": "Test Medication 42",
            "dosage": "500mg",
            "frequency": "twice_daily",
            "times": ["09:00", "21:00"],
            "instructions": "after_meal",
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "quantity": 30,
            "refill_reminder_days": 3,
            "color": "#14b8a6"
        }
        
        response = requests.post(f"{BASE_URL}/api/medication-tracker/medications/{TEST_USER_ID}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "medication" in data
        assert data["medication"]["name"] == "Test Medication 42"
        assert data["medication"]["dosage"] == "500mg"
        assert data["medication"]["frequency"] == "twice_daily"
        assert data["medication"]["is_active"] == True
        
        TEST_MEDICATION_ID = data["medication"]["id"]
        print(f"✓ Medication added: {TEST_MEDICATION_ID}")
    
    def test_get_medications(self):
        """Test GET /api/medication-tracker/medications/{user_id}"""
        # First add a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": "Test Med Get",
            "dosage": "100mg",
            "frequency": "once_daily",
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=payload)
        
        # Get medications
        response = requests.get(f"{BASE_URL}/api/medication-tracker/medications/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "medications" in data
        assert len(data["medications"]) >= 1
        print(f"✓ Retrieved {len(data['medications'])} medications")
    
    def test_update_medication(self):
        """Test PUT /api/medication-tracker/medications/{user_id}/{medication_id}"""
        # First add a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        add_payload = {
            "name": "Test Med Update",
            "dosage": "100mg",
            "frequency": "once_daily",
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        add_response = requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        med_id = add_response.json()["medication"]["id"]
        
        # Update medication
        update_payload = {
            "dosage": "200mg",
            "notes": "Updated dosage"
        }
        response = requests.put(f"{BASE_URL}/api/medication-tracker/medications/{user_id}/{med_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Medication updated: {med_id}")
    
    def test_delete_medication(self):
        """Test DELETE /api/medication-tracker/medications/{user_id}/{medication_id}"""
        # First add a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        add_payload = {
            "name": "Test Med Delete",
            "dosage": "100mg",
            "frequency": "once_daily",
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        add_response = requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        med_id = add_response.json()["medication"]["id"]
        
        # Delete medication
        response = requests.delete(f"{BASE_URL}/api/medication-tracker/medications/{user_id}/{med_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Medication deleted: {med_id}")


class TestMedicationTrackerSchedule:
    """Test medication tracker schedule and logging"""
    
    def test_get_today_schedule(self):
        """Test GET /api/medication-tracker/today/{user_id}"""
        # First add a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": "Test Med Schedule",
            "dosage": "100mg",
            "frequency": "twice_daily",
            "times": ["09:00", "21:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=payload)
        
        # Get today's schedule
        response = requests.get(f"{BASE_URL}/api/medication-tracker/today/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "schedule" in data
        assert "summary" in data
        assert "total_doses" in data["summary"]
        assert "taken" in data["summary"]
        assert "pending" in data["summary"]
        assert "adherence_rate" in data["summary"]
        print(f"✓ Today's schedule: {data['summary']['total_doses']} doses")
    
    def test_log_medication_taken(self):
        """Test POST /api/medication-tracker/log/{user_id}"""
        # First add a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        add_payload = {
            "name": "Test Med Log",
            "dosage": "100mg",
            "frequency": "once_daily",
            "times": ["09:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        add_response = requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        med_id = add_response.json()["medication"]["id"]
        
        # Log medication as taken
        log_payload = {
            "medication_id": med_id,
            "scheduled_time": "09:00",
            "action": "taken"
        }
        response = requests.post(f"{BASE_URL}/api/medication-tracker/log/{user_id}", json=log_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "log_id" in data
        print(f"✓ Medication logged as taken: {data['log_id']}")
    
    def test_log_medication_skipped(self):
        """Test POST /api/medication-tracker/log/{user_id} with skipped action"""
        # First add a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        add_payload = {
            "name": "Test Med Skip",
            "dosage": "100mg",
            "frequency": "once_daily",
            "times": ["09:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        add_response = requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        med_id = add_response.json()["medication"]["id"]
        
        # Log medication as skipped
        log_payload = {
            "medication_id": med_id,
            "scheduled_time": "09:00",
            "action": "skipped"
        }
        response = requests.post(f"{BASE_URL}/api/medication-tracker/log/{user_id}", json=log_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Medication logged as skipped")


class TestMedicationTrackerStatistics:
    """Test medication tracker statistics and history"""
    
    def test_get_history(self):
        """Test GET /api/medication-tracker/history/{user_id}"""
        # First add and log a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        add_payload = {
            "name": "Test Med History",
            "dosage": "100mg",
            "frequency": "once_daily",
            "times": ["09:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        add_response = requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        med_id = add_response.json()["medication"]["id"]
        
        # Log medication
        log_payload = {
            "medication_id": med_id,
            "scheduled_time": "09:00",
            "action": "taken"
        }
        requests.post(f"{BASE_URL}/api/medication-tracker/log/{user_id}", json=log_payload)
        
        # Get history
        response = requests.get(f"{BASE_URL}/api/medication-tracker/history/{user_id}?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_days" in data
        assert "history" in data
        assert "logs" in data
        assert "statistics" in data
        assert "adherence_rate" in data["statistics"]
        print(f"✓ History retrieved: {data['statistics']['adherence_rate']}% adherence")
    
    def test_get_statistics(self):
        """Test GET /api/medication-tracker/statistics/{user_id}"""
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        
        # Add a medication first
        add_payload = {
            "name": "Test Med Stats",
            "dosage": "100mg",
            "frequency": "once_daily",
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        
        response = requests.get(f"{BASE_URL}/api/medication-tracker/statistics/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_days" in data
        assert "active_medications" in data
        assert "total_doses" in data
        assert "doses_taken" in data
        assert "adherence_rate" in data
        assert "current_streak" in data
        print(f"✓ Statistics: {data['active_medications']} active meds, {data['adherence_rate']}% adherence")
    
    def test_get_refill_alerts(self):
        """Test GET /api/medication-tracker/refill-alerts/{user_id}"""
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        
        # Add a medication with low quantity
        add_payload = {
            "name": "Test Med Refill",
            "dosage": "100mg",
            "frequency": "once_daily",
            "times": ["09:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "quantity": 3,
            "refill_reminder_days": 5
        }
        requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        
        response = requests.get(f"{BASE_URL}/api/medication-tracker/refill-alerts/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "alerts" in data
        print(f"✓ Refill alerts: {len(data['alerts'])} alerts")


class TestMedicationTrackerQuickActions:
    """Test medication tracker quick actions"""
    
    def test_quick_log_taken(self):
        """Test POST /api/medication-tracker/quick-log/{user_id}/{medication_id}"""
        # First add a medication
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        add_payload = {
            "name": "Test Med Quick",
            "dosage": "100mg",
            "frequency": "twice_daily",
            "times": ["09:00", "12:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        add_response = requests.post(f"{BASE_URL}/api/medication-tracker/medications/{user_id}", json=add_payload)
        med_id = add_response.json()["medication"]["id"]
        
        # Quick log all doses
        response = requests.post(f"{BASE_URL}/api/medication-tracker/quick-log/{user_id}/{med_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "doses_logged" in data
        print(f"✓ Quick log: {data['doses_logged']} doses logged")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
