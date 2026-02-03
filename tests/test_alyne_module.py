"""
ALYNE - Kids Health & Care Module Tests
Tests for child profile management, vaccinations, growth tracking, health log, documents, and reminders
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://medbooker-37.preview.emergentagent.com').rstrip('/')

# Test user ID for ALYNE module
TEST_USER_ID = f"test_user_{uuid.uuid4().hex[:8]}"
TEST_CHILD_ID = None  # Will be set after child creation

class TestAlyneConfigEndpoints:
    """Test ALYNE configuration endpoints"""
    
    def test_get_regions_config(self):
        """Test GET /api/alyne/config/regions - returns India and USA regions"""
        response = requests.get(f"{BASE_URL}/api/alyne/config/regions")
        assert response.status_code == 200
        
        data = response.json()
        assert "regions" in data
        assert len(data["regions"]) == 2
        
        # Verify India region
        india = next((r for r in data["regions"] if r["id"] == "india"), None)
        assert india is not None
        assert india["name"] == "India"
        assert india["vaccination_schedule"] == "IAP (Indian Academy of Pediatrics)"
        assert "aadhaar_number" in india["id_fields"]
        
        # Verify USA region
        usa = next((r for r in data["regions"] if r["id"] == "usa"), None)
        assert usa is not None
        assert usa["name"] == "United States"
        assert usa["vaccination_schedule"] == "CDC"
        assert "insurance_provider" in usa["id_fields"]
        
        print("✓ Regions config endpoint working - India (IAP) and USA (CDC) returned")


class TestAlyneChildProfiles:
    """Test ALYNE child profile CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        global TEST_CHILD_ID
        self.user_id = TEST_USER_ID
        self.child_data = {
            "name": f"TEST_Child_{uuid.uuid4().hex[:6]}",
            "date_of_birth": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),  # 1 year old
            "gender": "male",
            "blood_group": "O+",
            "region": "india",
            "allergies": ["peanuts"],
            "medical_conditions": []
        }
    
    def test_create_child_profile(self):
        """Test POST /api/alyne/children - create child profile"""
        global TEST_CHILD_ID
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/children?user_id={self.user_id}",
            json=self.child_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "child" in data
        assert "vaccinations_count" in data
        assert data["vaccinations_count"] > 0  # Should have auto-generated vaccinations
        
        child = data["child"]
        assert child["name"] == self.child_data["name"]
        assert child["gender"] == self.child_data["gender"]
        assert child["region"] == self.child_data["region"]
        assert "id" in child
        
        TEST_CHILD_ID = child["id"]
        print(f"✓ Child profile created: {child['id']} with {data['vaccinations_count']} vaccinations")
    
    def test_get_children_for_user(self):
        """Test GET /api/alyne/children/{user_id} - get all children for parent"""
        response = requests.get(f"{BASE_URL}/api/alyne/children/{self.user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "children" in data
        assert isinstance(data["children"], list)
        
        if len(data["children"]) > 0:
            child = data["children"][0]
            assert "id" in child
            assert "name" in child
            assert "age_display" in child
            print(f"✓ Found {len(data['children'])} children for user")
        else:
            print("✓ No children found (expected if test runs in isolation)")
    
    def test_get_single_child(self):
        """Test GET /api/alyne/child/{child_id} - get specific child"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            # Create a child first
            response = requests.post(
                f"{BASE_URL}/api/alyne/children?user_id={self.user_id}",
                json=self.child_data
            )
            TEST_CHILD_ID = response.json()["child"]["id"]
        
        response = requests.get(f"{BASE_URL}/api/alyne/child/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "child" in data
        assert data["child"]["id"] == TEST_CHILD_ID
        assert "age_months" in data["child"]
        assert "age_display" in data["child"]
        print(f"✓ Retrieved child: {data['child']['name']} - {data['child']['age_display']}")
    
    def test_update_child_profile(self):
        """Test PUT /api/alyne/child/{child_id} - update child profile"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        update_data = {
            "blood_group": "A+",
            "allergies": ["peanuts", "dairy"]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/alyne/child/{TEST_CHILD_ID}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print("✓ Child profile updated successfully")


class TestAlyneVaccinations:
    """Test ALYNE vaccination schedule endpoints"""
    
    def test_get_vaccinations_for_child(self):
        """Test GET /api/alyne/vaccinations/{child_id} - returns auto-generated vaccination schedule"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            # Create a child first
            user_id = f"test_vax_{uuid.uuid4().hex[:6]}"
            child_data = {
                "name": f"TEST_VaxChild_{uuid.uuid4().hex[:6]}",
                "date_of_birth": (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d"),  # 6 months old
                "gender": "female",
                "region": "india"
            }
            response = requests.post(
                f"{BASE_URL}/api/alyne/children?user_id={user_id}",
                json=child_data
            )
            TEST_CHILD_ID = response.json()["child"]["id"]
        
        response = requests.get(f"{BASE_URL}/api/alyne/vaccinations/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "vaccinations" in data
        assert "stats" in data
        assert isinstance(data["vaccinations"], list)
        assert len(data["vaccinations"]) > 0
        
        # Check vaccination structure
        vax = data["vaccinations"][0]
        assert "id" in vax
        assert "vaccine_name" in vax
        assert "scheduled_date" in vax
        assert "status" in vax
        
        # Check stats
        stats = data["stats"]
        assert "total" in stats
        assert "done" in stats
        assert "due" in stats
        assert "overdue" in stats
        assert "upcoming" in stats
        
        print(f"✓ Vaccinations retrieved: {stats['total']} total, {stats['due']} due, {stats['overdue']} overdue")
    
    def test_get_vaccination_schedule(self):
        """Test GET /api/alyne/vaccinations/{child_id}/schedule - get upcoming schedule"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        response = requests.get(f"{BASE_URL}/api/alyne/vaccinations/{TEST_CHILD_ID}/schedule")
        assert response.status_code == 200
        
        data = response.json()
        assert "child_name" in data
        assert "region" in data
        assert "schedule" in data
        print(f"✓ Vaccination schedule retrieved for {data['child_name']} ({data['region']})")


class TestAlyneGrowthTracking:
    """Test ALYNE growth tracking endpoints"""
    
    def test_add_growth_record(self):
        """Test POST /api/alyne/growth/{child_id} - add growth record with percentile calculation"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            # Create a child first
            user_id = f"test_growth_{uuid.uuid4().hex[:6]}"
            child_data = {
                "name": f"TEST_GrowthChild_{uuid.uuid4().hex[:6]}",
                "date_of_birth": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),  # 1 year old
                "gender": "male",
                "region": "india"
            }
            response = requests.post(
                f"{BASE_URL}/api/alyne/children?user_id={user_id}",
                json=child_data
            )
            TEST_CHILD_ID = response.json()["child"]["id"]
        
        growth_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "height_cm": 75.0,  # Normal for 1 year old boy
            "weight_kg": 9.5,   # Normal for 1 year old boy
            "head_circumference_cm": 46.0,
            "notes": "Regular checkup"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/growth/{TEST_CHILD_ID}",
            json=growth_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "record" in data
        
        record = data["record"]
        assert record["height_cm"] == growth_data["height_cm"]
        assert record["weight_kg"] == growth_data["weight_kg"]
        assert "height_percentile" in record
        assert "weight_percentile" in record
        
        # Check percentile structure
        if record["height_percentile"]:
            assert "percentile" in record["height_percentile"]
            assert "status" in record["height_percentile"]
        
        print(f"✓ Growth record added with percentiles - Height: {record.get('height_percentile', {}).get('percentile')}, Weight: {record.get('weight_percentile', {}).get('percentile')}")
    
    def test_get_growth_records(self):
        """Test GET /api/alyne/growth/{child_id} - get growth records"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        response = requests.get(f"{BASE_URL}/api/alyne/growth/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "records" in data
        assert "child_gender" in data
        print(f"✓ Growth records retrieved: {len(data['records'])} records")
    
    def test_get_growth_chart_data(self):
        """Test GET /api/alyne/growth/{child_id}/chart - get chart data with WHO standards"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        response = requests.get(f"{BASE_URL}/api/alyne/growth/{TEST_CHILD_ID}/chart")
        assert response.status_code == 200
        
        data = response.json()
        assert "records" in data
        assert "who_standards" in data
        assert "child_gender" in data
        
        # Verify WHO standards structure
        who = data["who_standards"]
        assert "height" in who
        assert "weight" in who
        print(f"✓ Growth chart data retrieved with WHO standards")


class TestAlyneHealthLog:
    """Test ALYNE health log endpoints"""
    
    def test_add_health_log_entry(self):
        """Test POST /api/alyne/health-log/{child_id} - add health log entry"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        log_entry = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "type": "doctor_visit",
            "title": "Regular Checkup",
            "description": "Routine pediatric checkup",
            "doctor_name": "Dr. Pediatrician",
            "medications": ["Vitamin D drops"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/health-log/{TEST_CHILD_ID}",
            json=log_entry
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "entry" in data
        assert data["entry"]["type"] == "doctor_visit"
        assert data["entry"]["title"] == "Regular Checkup"
        print(f"✓ Health log entry added: {data['entry']['id']}")
    
    def test_get_health_log(self):
        """Test GET /api/alyne/health-log/{child_id} - get health log entries"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        response = requests.get(f"{BASE_URL}/api/alyne/health-log/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "entries" in data
        print(f"✓ Health log retrieved: {len(data['entries'])} entries")


class TestAlyneDocuments:
    """Test ALYNE document storage endpoints"""
    
    def test_upload_document(self):
        """Test POST /api/alyne/documents/{child_id} - upload document"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        # Create a simple base64 encoded test document
        import base64
        test_content = "Test document content for ALYNE"
        base64_content = base64.b64encode(test_content.encode()).decode()
        
        document = {
            "name": "Test_Immunization_Record",
            "type": "immunization_record",
            "file_data": base64_content,
            "file_type": "pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/documents/{TEST_CHILD_ID}",
            json=document
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "document" in data
        assert data["document"]["name"] == "Test_Immunization_Record"
        assert data["document"]["type"] == "immunization_record"
        print(f"✓ Document uploaded: {data['document']['id']}")
    
    def test_get_documents(self):
        """Test GET /api/alyne/documents/{child_id} - get documents list"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        response = requests.get(f"{BASE_URL}/api/alyne/documents/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "documents" in data
        print(f"✓ Documents retrieved: {len(data['documents'])} documents")


class TestAlyneDashboard:
    """Test ALYNE dashboard summary endpoint"""
    
    def test_get_child_dashboard(self):
        """Test GET /api/alyne/dashboard/{child_id} - returns child dashboard summary"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            # Create a child first
            user_id = f"test_dash_{uuid.uuid4().hex[:6]}"
            child_data = {
                "name": f"TEST_DashChild_{uuid.uuid4().hex[:6]}",
                "date_of_birth": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
                "gender": "female",
                "region": "usa"
            }
            response = requests.post(
                f"{BASE_URL}/api/alyne/children?user_id={user_id}",
                json=child_data
            )
            TEST_CHILD_ID = response.json()["child"]["id"]
        
        response = requests.get(f"{BASE_URL}/api/alyne/dashboard/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify dashboard structure
        assert "child" in data
        assert "vaccination_stats" in data
        assert "latest_growth" in data or data["latest_growth"] is None
        assert "upcoming_reminders" in data
        assert "recent_health_logs" in data
        assert "document_count" in data
        
        # Verify child info
        child = data["child"]
        assert "id" in child
        assert "name" in child
        assert "age_display" in child
        
        # Verify vaccination stats
        vax_stats = data["vaccination_stats"]
        assert "total" in vax_stats
        assert "done" in vax_stats
        assert "due" in vax_stats
        
        print(f"✓ Dashboard retrieved for {child['name']}: {vax_stats['total']} vaccinations, {data['document_count']} documents")


class TestAlyneReminders:
    """Test ALYNE reminders endpoints"""
    
    def test_create_reminder(self):
        """Test POST /api/alyne/reminders - create reminder"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        reminder = {
            "child_id": TEST_CHILD_ID,
            "type": "vaccination",
            "title": "BCG Vaccination Due",
            "description": "Schedule BCG vaccination",
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "due_time": "10:00",
            "repeat": "none",
            "enabled": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/reminders",
            json=reminder
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "reminder" in data
        assert data["reminder"]["type"] == "vaccination"
        print(f"✓ Reminder created: {data['reminder']['id']}")
    
    def test_get_reminders(self):
        """Test GET /api/alyne/reminders/{child_id} - get reminders"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID available")
        
        response = requests.get(f"{BASE_URL}/api/alyne/reminders/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "reminders" in data
        print(f"✓ Reminders retrieved: {len(data['reminders'])} reminders")


class TestAlyneCleanup:
    """Cleanup test data"""
    
    def test_delete_test_child(self):
        """Test DELETE /api/alyne/child/{child_id} - delete child and related data"""
        global TEST_CHILD_ID
        
        if not TEST_CHILD_ID:
            pytest.skip("No child ID to delete")
        
        response = requests.delete(f"{BASE_URL}/api/alyne/child/{TEST_CHILD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Test child deleted: {TEST_CHILD_ID}")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/alyne/child/{TEST_CHILD_ID}")
        assert response.status_code == 404
        print("✓ Verified child no longer exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
