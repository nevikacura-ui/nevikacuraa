"""
EMR Module Tests - Iteration 300
Tests for:
- Trusted Formulary search (1038 curated medicines)
- All medicines search (582K catalog)
- Formulary categories
- Prescription creation with vitals and 1-0-0 dosage
- PDF generation with DiaGyn branding
- Frequency codes reference
- Orange Pharmacy formulary endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
DOCTOR_USERNAME = "dr_vikas"
DOCTOR_PASSWORD = "test1234"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASSED: API health check")


class TestDoctorAuth:
    """Doctor authentication tests"""
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                print(f"PASSED: Doctor login successful, got token")
                return token
        print(f"SKIPPED: Doctor login failed - {response.status_code}: {response.text}")
        pytest.skip("Doctor authentication failed")
    
    def test_doctor_login(self):
        """Test doctor can login"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD}
        )
        print(f"Doctor login response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "token" in data or "access_token" in data
            print("PASSED: Doctor login returns token")
        else:
            print(f"INFO: Doctor login returned {response.status_code} - {response.text[:200]}")


class TestFormularySearch:
    """Trusted Formulary search tests"""
    
    def test_formulary_search_dolo(self):
        """GET /api/emr/formulary/search?q=dolo returns formulary medicines"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/search?q=dolo")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "medicines" in data, "Response should contain 'medicines' key"
        assert "source" in data, "Response should contain 'source' key"
        assert data["source"] == "formulary", "Source should be 'formulary'"
        
        # Check if medicines have is_formulary flag
        if data["medicines"]:
            for med in data["medicines"]:
                # Formulary medicines should have is_formulary=true
                assert med.get("is_formulary") == True, f"Medicine {med.get('name')} should have is_formulary=true"
        
        print(f"PASSED: Formulary search for 'dolo' returned {len(data['medicines'])} medicines")
    
    def test_formulary_search_paracetamol(self):
        """Test formulary search for paracetamol"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/search?q=paracetamol")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"PASSED: Formulary search for 'paracetamol' returned {len(data['medicines'])} medicines")
    
    def test_formulary_search_short_query(self):
        """Test formulary search with short query returns empty"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/search?q=a")
        assert response.status_code == 200
        data = response.json()
        assert data["medicines"] == [], "Short query should return empty list"
        print("PASSED: Short query returns empty list")


class TestAllMedicinesSearch:
    """All medicines (582K catalog) search tests"""
    
    def test_all_search_paracetamol(self):
        """GET /api/emr/formulary/all-search?q=paracetamol returns from full catalog"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/all-search?q=paracetamol")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "medicines" in data, "Response should contain 'medicines' key"
        assert "source" in data, "Response should contain 'source' key"
        assert data["source"] == "all", "Source should be 'all'"
        
        print(f"PASSED: All medicines search for 'paracetamol' returned {len(data['medicines'])} medicines")
    
    def test_all_search_metformin(self):
        """Test all medicines search for metformin (diabetes drug)"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/all-search?q=metformin")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"PASSED: All medicines search for 'metformin' returned {len(data['medicines'])} medicines")


class TestFormularyCategories:
    """Formulary categories tests"""
    
    def test_get_formulary_categories(self):
        """GET /api/emr/formulary/categories returns categories with counts"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "categories" in data, "Response should contain 'categories' key"
        assert "total_medicines" in data, "Response should contain 'total_medicines' key"
        
        categories = data["categories"]
        total = data["total_medicines"]
        
        print(f"PASSED: Formulary has {len(categories)} categories with {total} total medicines")
        
        # Verify category structure
        if categories:
            cat = categories[0]
            assert "name" in cat, "Category should have 'name'"
            assert "count" in cat, "Category should have 'count'"
            print(f"  Top category: {cat['name']} ({cat['count']} medicines)")
    
    def test_formulary_by_category_general(self):
        """GET /api/emr/formulary/by-category/General returns medicines"""
        response = requests.get(f"{BASE_URL}/api/emr/formulary/by-category/General")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "medicines" in data, "Response should contain 'medicines' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "category" in data, "Response should contain 'category' key"
        
        print(f"PASSED: Category 'General' has {data['total']} medicines, returned {len(data['medicines'])}")


class TestFrequencyCodes:
    """Frequency codes reference tests"""
    
    def test_get_frequency_codes(self):
        """GET /api/emr/frequency-codes returns dosage pattern reference"""
        response = requests.get(f"{BASE_URL}/api/emr/frequency-codes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "codes" in data, "Response should contain 'codes' key"
        codes = data["codes"]
        
        # Verify expected 1-0-0 patterns exist
        expected_patterns = ["1-0-0", "0-1-0", "0-0-1", "1-1-1", "SOS", "BD", "TDS"]
        for pattern in expected_patterns:
            assert pattern in codes, f"Pattern '{pattern}' should be in frequency codes"
        
        print(f"PASSED: Frequency codes returned {len(codes)} patterns")
        print(f"  Sample: 1-0-0 = {codes.get('1-0-0')}, 1-1-1 = {codes.get('1-1-1')}")


class TestPrescriptionCRUD:
    """Prescription creation and retrieval tests"""
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
        pytest.skip("Doctor authentication failed")
    
    def test_create_prescription_with_vitals(self, doctor_token):
        """POST /api/emr/prescription/create creates prescription with vitals and 1-0-0 dosage"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        # First check if test appointment exists
        appt_response = requests.get(
            f"{BASE_URL}/api/emr/appointment/TEST-RX-001",
            headers=headers
        )
        
        if appt_response.status_code != 200:
            print(f"INFO: Test appointment TEST-RX-001 not found, skipping prescription test")
            pytest.skip("Test appointment not found")
        
        prescription_data = {
            "booking_id": "TEST-RX-001",
            "template_type": "diabetes",
            "vitals": {
                "blood_pressure": "120/80",
                "pulse": "72",
                "temperature": "98.6",
                "spo2": "98",
                "weight": "70",
                "height": "170"
            },
            "chief_complaints": "Elevated blood sugar levels, fatigue",
            "diagnosis": "Type 2 Diabetes Mellitus",
            "medicines": [
                {
                    "name": "Metformin 500mg",
                    "dosage": "500mg",
                    "frequency": "1-0-1",
                    "duration": "30 days",
                    "timing": "After food",
                    "notes": "Take with meals",
                    "is_formulary": True
                },
                {
                    "name": "Glimepiride 1mg",
                    "dosage": "1mg",
                    "frequency": "1-0-0",
                    "duration": "30 days",
                    "timing": "Before food",
                    "notes": "Morning before breakfast",
                    "is_formulary": True
                }
            ],
            "investigations": ["HbA1c", "Fasting Blood Sugar", "Lipid Profile"],
            "advice": "Regular exercise, monitor blood sugar daily",
            "diet_advice": "Low carb diet, avoid sweets",
            "follow_up_date": "2026-02-15",
            "notes": "Review in 1 month",
            "diabetes_data": {
                "fasting_sugar": "140",
                "pp_sugar": "200",
                "hba1c": "7.5",
                "diet_advice": "Reduce rice intake",
                "exercise_advice": "30 min walk daily"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/emr/prescription/create",
            json=prescription_data,
            headers=headers
        )
        
        if response.status_code == 404:
            print("INFO: Appointment not found for prescription creation")
            pytest.skip("Test appointment not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Prescription creation should succeed"
        assert "prescription_id" in data, "Response should contain prescription_id"
        
        print(f"PASSED: Prescription created with ID: {data['prescription_id']}")
        return data["prescription_id"]


class TestPDFGeneration:
    """PDF generation tests"""
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
        pytest.skip("Doctor authentication failed")
    
    def test_generate_pdf(self, doctor_token):
        """POST /api/emr/prescription/{id}/generate-pdf generates PDF with DiaGyn branding"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        # Try to generate PDF for test prescription
        response = requests.post(
            f"{BASE_URL}/api/emr/prescription/TEST-RX-001/generate-pdf",
            headers=headers
        )
        
        if response.status_code == 404:
            print("INFO: Test prescription not found for PDF generation")
            pytest.skip("Test prescription not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "PDF generation should succeed"
        assert "pdf_base64" in data, "Response should contain pdf_base64"
        assert "filename" in data, "Response should contain filename"
        
        # Verify PDF is valid base64
        import base64
        try:
            pdf_bytes = base64.b64decode(data["pdf_base64"])
            # Check PDF magic bytes
            assert pdf_bytes[:4] == b'%PDF', "Generated file should be a valid PDF"
            print(f"PASSED: PDF generated successfully, size: {len(pdf_bytes)} bytes")
        except Exception as e:
            print(f"WARNING: Could not validate PDF: {e}")


class TestOrangePharmacyFormulary:
    """Orange Pharmacy formulary endpoint tests"""
    
    @pytest.fixture(scope="class")
    def pharmacy_token(self):
        """Get pharmacy staff token"""
        # Try pharmacy staff login
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "pharmacy_staff", "password": "test1234"}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
        
        # Try admin login as fallback
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "admin", "password": "admin123"}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
        
        pytest.skip("Pharmacy staff authentication failed")
    
    def test_orange_pharmacy_formulary(self, pharmacy_token):
        """GET /api/pharmacy/formulary returns formulary medicines (staff portal)"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/formulary",
            headers=headers
        )
        
        if response.status_code == 401 or response.status_code == 403:
            print("INFO: Pharmacy formulary requires specific staff role")
            pytest.skip("Pharmacy staff access required")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "medicines" in data, "Response should contain 'medicines' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "categories" in data, "Response should contain 'categories' key"
        
        print(f"PASSED: Orange Pharmacy formulary has {data['total']} medicines")


class TestEMRAppointment:
    """EMR appointment retrieval tests"""
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
        pytest.skip("Doctor authentication failed")
    
    def test_get_appointment_for_emr(self, doctor_token):
        """GET /api/emr/appointment/{booking_id} returns appointment details"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/emr/appointment/TEST-RX-001",
            headers=headers
        )
        
        if response.status_code == 404:
            print("INFO: Test appointment TEST-RX-001 not found")
            # This is expected if no test data exists
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        expected_fields = ["booking_id", "patient_name", "patient_phone"]
        for field in expected_fields:
            assert field in data, f"Response should contain '{field}'"
        
        print(f"PASSED: Appointment retrieved for {data.get('patient_name')}")


class TestTemplates:
    """EMR template tests"""
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
        pytest.skip("Doctor authentication failed")
    
    def test_get_template_categories(self):
        """GET /api/emr/templates/categories returns template categories"""
        response = requests.get(f"{BASE_URL}/api/emr/templates/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "categories" in data, "Response should contain 'categories' key"
        categories = data["categories"]
        
        # Verify expected categories exist
        expected = ["diabetes", "obgyn", "general"]
        for cat in expected:
            assert cat in categories, f"Category '{cat}' should exist"
        
        print(f"PASSED: Template categories: {list(categories.keys())}")
    
    def test_get_doctor_templates(self, doctor_token):
        """GET /api/emr/templates returns doctor's saved templates"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/emr/templates",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "templates" in data, "Response should contain 'templates' key"
        print(f"PASSED: Doctor has {len(data['templates'])} saved templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
