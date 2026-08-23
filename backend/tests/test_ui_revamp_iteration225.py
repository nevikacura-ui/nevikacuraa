"""
Test for Healthcare Super-app UI Revamp - Iteration 225
Testing: Portal cards, new pages (PrescriptionScanner, MedicineReminders, FamilyHealth),
Backend APIs for prescription extraction and medicine reminders
"""

import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestPrescriptionOCRAPI:
    """Tests for /api/prescription/extract endpoint"""

    def test_extract_endpoint_exists(self):
        """Test that prescription extract endpoint exists (even without file)"""
        # This should return 422 (missing file) not 404 (not found)
        response = requests.post(f"{BASE_URL}/api/prescription/extract")
        assert response.status_code in [400, 422], f"Expected 400/422 for missing file, got {response.status_code}"
        print(f"PASS: /api/prescription/extract endpoint exists (status: {response.status_code})")

    def test_common_medicines_endpoint(self):
        """Test common medicines suggestion endpoint"""
        response = requests.get(f"{BASE_URL}/api/prescription/common-medicines")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "common_medicines" in data, "Response should have common_medicines"
        assert len(data["common_medicines"]) > 0, "Should return at least one medicine"
        print(f"PASS: /api/prescription/common-medicines returns {len(data['common_medicines'])} medicines")


class TestMedicineRemindersAPI:
    """Tests for /api/medicine-reminders endpoints"""

    def test_today_schedule_unauthorized(self):
        """Test today endpoint returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/medicine-reminders/today")
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print("PASS: /api/medicine-reminders/today requires auth (returns 401)")

    def test_my_reminders_unauthorized(self):
        """Test my-reminders endpoint returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/medicine-reminders/my-reminders")
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print("PASS: /api/medicine-reminders/my-reminders requires auth (returns 401)")

    def test_create_reminder_unauthorized(self):
        """Test create endpoint returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/medicine-reminders/create", json={
            "medicine_name": "Test Med",
            "dosage": "10mg",
            "frequency": "once_daily",
            "time_slots": ["09:00"],
            "start_date": "2026-01-20"
        })
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print("PASS: /api/medicine-reminders/create requires auth (returns 401)")


class TestFamilyMembersAPI:
    """Tests for /api/family-members endpoints used by FamilyHealthPage"""

    def test_family_members_endpoint_exists(self):
        """Test family members endpoint for a phone number"""
        # Test with a mock phone number - should return empty array or members
        response = requests.get(f"{BASE_URL}/api/family-members/9999999999")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "members" in data or isinstance(data, list), "Should return members data"
        print(f"PASS: /api/family-members endpoint works")


class TestDoctorsAPI:
    """Tests for /api/doctors endpoints used by DoctorSearch"""

    def test_get_all_doctors(self):
        """Test all doctors endpoint"""
        response = requests.get(f"{BASE_URL}/api/doctors/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "doctors" in data, "Response should have doctors array"
        print(f"PASS: /api/doctors/all returns {len(data.get('doctors', []))} doctors")


class TestPortalsNavigation:
    """Tests for portal pages exist in frontend routes"""

    def test_portals_page_exists(self):
        """Test /portals page loads"""
        response = requests.get(f"{BASE_URL}/portals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /portals page exists")

    def test_mycura_page_exists(self):
        """Test /my-cura page loads"""
        response = requests.get(f"{BASE_URL}/my-cura")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /my-cura page exists")

    def test_prescription_scanner_page_exists(self):
        """Test /prescription-scanner page loads"""
        response = requests.get(f"{BASE_URL}/prescription-scanner")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /prescription-scanner page exists")

    def test_medicine_reminders_page_exists(self):
        """Test /medicine-reminders page loads"""
        response = requests.get(f"{BASE_URL}/medicine-reminders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /medicine-reminders page exists")

    def test_family_health_page_exists(self):
        """Test /family-health page loads"""
        response = requests.get(f"{BASE_URL}/family-health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /family-health page exists")

    def test_diagyn_page_exists(self):
        """Test /diagyn page loads"""
        response = requests.get(f"{BASE_URL}/diagyn")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /diagyn page exists")

    def test_doctor_search_page_exists(self):
        """Test /doctor-search page loads"""
        response = requests.get(f"{BASE_URL}/doctor-search")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /doctor-search page exists")

    def test_symptom_checker_page_exists(self):
        """Test /symptom-checker page loads"""
        response = requests.get(f"{BASE_URL}/symptom-checker")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /symptom-checker page exists")

    def test_profile_redirects_or_loads(self):
        """Test /profile page loads or redirects to login"""
        response = requests.get(f"{BASE_URL}/profile", allow_redirects=False)
        # Should either load (200) or redirect to login
        assert response.status_code in [200, 301, 302], f"Expected 200 or redirect, got {response.status_code}"
        print(f"PASS: /profile page responds correctly (status: {response.status_code})")


class TestHealthEndpoints:
    """Test basic health/status endpoints"""

    def test_api_health(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/health endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
