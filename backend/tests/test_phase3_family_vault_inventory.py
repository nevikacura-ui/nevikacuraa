"""
Phase 3 Testing: Family Health Vault, Bulk Inventory Import, Organ Map
Tests for:
- GET /api/family-vault/organ-map - Returns 12 organs with tests and conditions
- POST /api/family-vault/records - Add health record for a family member
- GET /api/family-vault/records/{member_id} - Get all records for a member
- DELETE /api/family-vault/records/{record_id} - Delete a health record
- POST /api/inventory/bulk-import - Upload CSV to bulk import medicines
- GET /api/inventory/export-template - Returns CSV template for import
- GET /api/inventory/stats - Returns inventory statistics
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrganMap:
    """Tests for the 3D Organ Viewer / Body Health Map API"""
    
    def test_get_organ_map_returns_12_organs(self):
        """GET /api/family-vault/organ-map should return 12 organs"""
        response = requests.get(f"{BASE_URL}/api/family-vault/organ-map")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "organs" in data, "Response should contain 'organs' key"
        
        organs = data["organs"]
        expected_organs = ["brain", "eyes", "thyroid", "heart", "lungs", "liver", 
                          "stomach", "pancreas", "kidneys", "reproductive", "bones", "blood"]
        
        assert len(organs) == 12, f"Expected 12 organs, got {len(organs)}"
        
        for organ in expected_organs:
            assert organ in organs, f"Missing organ: {organ}"
            assert "label" in organs[organ], f"Organ {organ} missing 'label'"
            assert "tests" in organs[organ], f"Organ {organ} missing 'tests'"
            assert "conditions" in organs[organ], f"Organ {organ} missing 'conditions'"
            assert isinstance(organs[organ]["tests"], list), f"Organ {organ} tests should be a list"
            assert isinstance(organs[organ]["conditions"], list), f"Organ {organ} conditions should be a list"
        
        print(f"✓ Organ map returns all 12 organs with tests and conditions")
    
    def test_organ_map_heart_has_correct_data(self):
        """Verify heart organ has expected tests and conditions"""
        response = requests.get(f"{BASE_URL}/api/family-vault/organ-map")
        assert response.status_code == 200
        
        heart = response.json()["organs"]["heart"]
        assert heart["label"] == "Heart & Cardiovascular"
        assert "ECG" in heart["tests"]
        assert "Lipid Profile" in heart["tests"]
        assert "Hypertension" in heart["conditions"]
        
        print(f"✓ Heart organ has correct label, tests, and conditions")


class TestFamilyVaultRecords:
    """Tests for Family Health Vault CRUD operations"""
    
    @pytest.fixture
    def test_member_id(self):
        return "TEST_member_phase3_257"
    
    def test_add_allergy_record(self, test_member_id):
        """POST /api/family-vault/records - Add allergy record"""
        payload = {
            "member_id": test_member_id,
            "record_type": "allergy",
            "title": "TEST_Penicillin Allergy",
            "details": "Severe allergic reaction to penicillin antibiotics",
            "severity": "severe",
            "active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family-vault/records",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "record" in data
        assert data["record"]["title"] == "TEST_Penicillin Allergy"
        assert data["record"]["record_type"] == "allergy"
        assert data["record"]["severity"] == "severe"
        assert "id" in data["record"]
        
        print(f"✓ Allergy record created with ID: {data['record']['id']}")
        return data["record"]["id"]
    
    def test_add_condition_record(self, test_member_id):
        """POST /api/family-vault/records - Add condition record"""
        payload = {
            "member_id": test_member_id,
            "record_type": "condition",
            "title": "TEST_Type 2 Diabetes",
            "details": "Diagnosed in 2020, managed with medication",
            "severity": "moderate",
            "active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family-vault/records",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["record"]["record_type"] == "condition"
        
        print(f"✓ Condition record created")
        return data["record"]["id"]
    
    def test_add_medication_record(self, test_member_id):
        """POST /api/family-vault/records - Add medication record"""
        payload = {
            "member_id": test_member_id,
            "record_type": "medication",
            "title": "TEST_Metformin 500mg",
            "details": "Take twice daily with meals",
            "active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family-vault/records",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["record"]["record_type"] == "medication"
        
        print(f"✓ Medication record created")
        return data["record"]["id"]
    
    def test_get_member_records(self, test_member_id):
        """GET /api/family-vault/records/{member_id} - Get all records"""
        # First add a record to ensure there's data
        payload = {
            "member_id": test_member_id,
            "record_type": "note",
            "title": "TEST_General Note",
            "details": "Patient prefers morning appointments"
        }
        requests.post(f"{BASE_URL}/api/family-vault/records", json=payload)
        
        # Now fetch records
        response = requests.get(f"{BASE_URL}/api/family-vault/records/{test_member_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "member_id" in data
        assert data["member_id"] == test_member_id
        assert "records" in data
        assert "allergies" in data
        assert "conditions" in data
        assert "medications" in data
        
        # Verify records are categorized
        assert isinstance(data["records"], list)
        assert isinstance(data["allergies"], list)
        assert isinstance(data["conditions"], list)
        assert isinstance(data["medications"], list)
        
        print(f"✓ Retrieved {len(data['records'])} records for member")
        print(f"  - Allergies: {len(data['allergies'])}")
        print(f"  - Conditions: {len(data['conditions'])}")
        print(f"  - Medications: {len(data['medications'])}")
    
    def test_delete_health_record(self, test_member_id):
        """DELETE /api/family-vault/records/{record_id} - Delete a record"""
        # First create a record to delete
        payload = {
            "member_id": test_member_id,
            "record_type": "surgery",
            "title": "TEST_Surgery to Delete",
            "details": "This record will be deleted"
        }
        create_response = requests.post(f"{BASE_URL}/api/family-vault/records", json=payload)
        assert create_response.status_code == 200
        record_id = create_response.json()["record"]["id"]
        
        # Delete the record
        delete_response = requests.delete(f"{BASE_URL}/api/family-vault/records/{record_id}")
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert data["success"] == True
        assert "deleted" in data["message"].lower() or "Record deleted" in data["message"]
        
        print(f"✓ Record {record_id} deleted successfully")
    
    def test_delete_nonexistent_record_returns_404(self):
        """DELETE /api/family-vault/records/{record_id} - 404 for nonexistent"""
        response = requests.delete(f"{BASE_URL}/api/family-vault/records/nonexistent-id-12345")
        assert response.status_code == 404
        
        print(f"✓ Correctly returns 404 for nonexistent record")


class TestBulkInventoryImport:
    """Tests for Bulk CSV Import for Pharmacy Inventory"""
    
    def test_get_csv_template(self):
        """GET /api/inventory/export-template - Returns CSV template"""
        response = requests.get(f"{BASE_URL}/api/inventory/export-template")
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        assert 'text/csv' in content_type, f"Expected text/csv, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disp
        assert 'medicine_import_template.csv' in content_disp
        
        # Verify CSV content
        csv_content = response.text
        assert 'name,form,mrp,sale_price,category,stock,manufacturer,description' in csv_content
        assert 'Paracetamol' in csv_content
        assert 'Metformin' in csv_content
        
        print(f"✓ CSV template downloaded with correct headers and sample data")
    
    def test_bulk_import_medicines_csv(self):
        """POST /api/inventory/bulk-import - Upload CSV to import medicines"""
        csv_content = """name,form,mrp,sale_price,category,stock,manufacturer,description
TEST_Aspirin 75mg,Tablet,35.00,30.00,Cardiac,100,Bayer,Blood thinner for heart health
TEST_Omeprazole 20mg,Capsule,85.00,75.00,Gastro,150,Sun Pharma,Acid reflux treatment
TEST_Vitamin D3 1000IU,Softgel,120.00,100.00,Supplements,200,Abbott,Vitamin D supplement"""
        
        files = {
            'file': ('test_medicines.csv', csv_content, 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/bulk-import",
            files=files
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["imported"] == 3, f"Expected 3 imported, got {data['imported']}"
        assert "errors" in data
        assert "message" in data
        
        print(f"✓ Bulk import successful: {data['imported']} medicines imported")
        print(f"  - Skipped: {data['skipped']}")
        print(f"  - Errors: {len(data['errors'])}")
    
    def test_bulk_import_rejects_non_csv(self):
        """POST /api/inventory/bulk-import - Rejects non-CSV files"""
        files = {
            'file': ('test.txt', 'This is not a CSV file', 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/bulk-import",
            files=files
        )
        assert response.status_code == 400
        
        print(f"✓ Correctly rejects non-CSV files")
    
    def test_bulk_import_handles_empty_rows(self):
        """POST /api/inventory/bulk-import - Handles rows with missing name"""
        csv_content = """name,form,mrp,sale_price,category,stock,manufacturer,description
TEST_Valid Medicine,Tablet,50.00,45.00,General,100,Test Pharma,Valid medicine
,Tablet,30.00,25.00,General,50,Test Pharma,Missing name - should skip
TEST_Another Valid,Capsule,60.00,55.00,General,75,Test Pharma,Another valid"""
        
        files = {
            'file': ('test_with_empty.csv', csv_content, 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/bulk-import",
            files=files
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["imported"] == 2, f"Expected 2 imported (skipping empty name), got {data['imported']}"
        assert data["skipped"] >= 1, "Should have skipped at least 1 row"
        
        print(f"✓ Correctly skips rows with missing name: {data['skipped']} skipped")
    
    def test_get_inventory_stats(self):
        """GET /api/inventory/stats - Returns inventory statistics"""
        response = requests.get(f"{BASE_URL}/api/inventory/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "low_stock" in data
        assert "categories" in data
        
        assert isinstance(data["total"], int)
        assert isinstance(data["low_stock"], int)
        assert isinstance(data["categories"], list)
        
        print(f"✓ Inventory stats retrieved:")
        print(f"  - Total medicines: {data['total']}")
        print(f"  - Low stock items: {data['low_stock']}")
        print(f"  - Categories: {len(data['categories'])}")


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_cleanup_test_records(self):
        """Clean up TEST_ prefixed records from family_health_records"""
        # Get records for test member
        test_member_id = "TEST_member_phase3_257"
        response = requests.get(f"{BASE_URL}/api/family-vault/records/{test_member_id}")
        
        if response.status_code == 200:
            records = response.json().get("records", [])
            deleted_count = 0
            for record in records:
                if record.get("title", "").startswith("TEST_"):
                    delete_resp = requests.delete(f"{BASE_URL}/api/family-vault/records/{record['id']}")
                    if delete_resp.status_code == 200:
                        deleted_count += 1
            
            print(f"✓ Cleaned up {deleted_count} test records")
        else:
            print(f"✓ No test records to clean up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
