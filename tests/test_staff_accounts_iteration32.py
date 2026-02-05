"""
Test Staff Accounts and Access Modules - Iteration 32
Tests for:
- Staff login for all accounts (staff_pushpa, staff_amnion, staff_pharmacy, doc_neha, doc_vikas)
- Walk-in appointment creation with staff token
- ANC Registration API
- Glydex Staff Portal API
- Biometric Attendance API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nevika-dashboard.preview.emergentagent.com')

# Staff credentials
STAFF_PASSWORD = "Nevika@2026C"
STAFF_ACCOUNTS = [
    {"username": "staff_pushpa", "name": "Staff Pushpa Clinic"},
    {"username": "staff_amnion", "name": "Staff Amnion Clinic"},
    {"username": "staff_pharmacy", "name": "Staff Orange Pharmacy"},
    {"username": "doc_neha", "name": "Dr. Neha"},
    {"username": "doc_vikas", "name": "Dr. Vikas"}
]


class TestStaffLogin:
    """Test staff login for all accounts"""
    
    @pytest.fixture
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_staff_pushpa_login(self, api_client):
        """Test staff_pushpa login with password"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pushpa",
            "password": STAFF_PASSWORD
        })
        print(f"staff_pushpa login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Token should be in response"
        assert "staff" in data, "Staff info should be in response"
        assert data["staff"]["name"] is not None
    
    def test_doc_neha_login(self, api_client):
        """Test doc_neha login with password"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_neha",
            "password": STAFF_PASSWORD
        })
        print(f"doc_neha login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "staff" in data
    
    def test_doc_vikas_login(self, api_client):
        """Test doc_vikas login with password"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "doc_vikas",
            "password": STAFF_PASSWORD
        })
        print(f"doc_vikas login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "staff" in data
    
    def test_staff_amnion_login(self, api_client):
        """Test staff_amnion login with password"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_amnion",
            "password": STAFF_PASSWORD
        })
        print(f"staff_amnion login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "staff" in data
    
    def test_staff_pharmacy_login(self, api_client):
        """Test staff_pharmacy login with password"""
        response = api_client.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": STAFF_PASSWORD
        })
        print(f"staff_pharmacy login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "staff" in data


class TestWalkInAppointment:
    """Test walk-in appointment creation with staff token"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff token for testing"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pushpa",
            "password": STAFF_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get staff token")
    
    def test_create_walkin_appointment(self, staff_token):
        """Test creating a walk-in appointment with staff token"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {staff_token}"
        }
        response = requests.post(f"{BASE_URL}/api/staff/appointments/walk-in", 
            headers=headers,
            json={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "patient_name": "TEST_WalkIn_Patient",
                "patient_phone": "9876543210",
                "patient_email": "test@example.com",
                "time": "11:30 AM",
                "notes": "Test walk-in appointment"
            }
        )
        print(f"Walk-in appointment response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "appointment" in data or "message" in data


class TestANCRegistration:
    """Test ANC Registration API"""
    
    def test_get_anc_patients_pushpa(self):
        """Test getting ANC patients for Pushpa clinic"""
        response = requests.get(f"{BASE_URL}/api/anc/patients/pushpa")
        print(f"ANC patients Pushpa response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "patients" in data
    
    def test_get_anc_patients_amnion(self):
        """Test getting ANC patients for Amnion clinic"""
        response = requests.get(f"{BASE_URL}/api/anc/patients/amnion")
        print(f"ANC patients Amnion response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "patients" in data
    
    def test_anc_dashboard_pushpa(self):
        """Test ANC dashboard for Pushpa clinic"""
        response = requests.get(f"{BASE_URL}/api/anc/dashboard/pushpa")
        print(f"ANC dashboard Pushpa response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "dashboard" in data


class TestGlydexStaffPortal:
    """Test Glydex Staff Portal API"""
    
    def test_glydex_staff_summary_report(self):
        """Test Glydex staff summary report"""
        response = requests.get(f"{BASE_URL}/api/glydex/staff/reports/summary")
        print(f"Glydex staff summary response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "summary" in data
    
    def test_glydex_staff_patients_list(self):
        """Test Glydex staff patients list"""
        response = requests.get(f"{BASE_URL}/api/glydex/staff/patients")
        print(f"Glydex staff patients response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "patients" in data


class TestBiometricAttendance:
    """Test Biometric Attendance API"""
    
    def test_attendance_report_pushpa(self):
        """Test attendance report for Pushpa clinic"""
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/report/pushpa")
        print(f"Attendance report Pushpa response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "report" in data
        assert "summary" in data
    
    def test_attendance_report_amnion(self):
        """Test attendance report for Amnion clinic"""
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/report/amnion")
        print(f"Attendance report Amnion response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "report" in data
    
    def test_attendance_report_pharmacy(self):
        """Test attendance report for Orange Pharmacy"""
        response = requests.get(f"{BASE_URL}/api/biometric-attendance/report/pharmacy")
        print(f"Attendance report Pharmacy response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "report" in data


class TestAdminDashboard:
    """Test Admin Dashboard access"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        print(f"Admin login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        print(f"Admin stats response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
