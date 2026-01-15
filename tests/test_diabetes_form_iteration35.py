"""
Test Diabetes Form Feature - Iteration 35
Tests for:
1. Diabetes form send API - POST /api/glydex/form/send
2. Diabetes form fetch API - GET /api/glydex/form/{form_id}
3. Diabetes form submit API - POST /api/glydex/form/{form_id}/submit
4. Diabetes forms list API - GET /api/glydex/forms/list
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDiabetesFormAPIs:
    """Test Diabetes Form APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_patient_name = f"TEST_Patient_{uuid.uuid4().hex[:6]}"
        self.test_phone = f"+91{uuid.uuid4().hex[:10]}"
        self.test_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    
    def test_send_diabetes_form_link(self):
        """Test POST /api/glydex/form/send - Send diabetes form link"""
        response = requests.post(
            f"{BASE_URL}/api/glydex/form/send",
            json={
                "patient_name": self.test_patient_name,
                "patient_phone": self.test_phone,
                "patient_email": self.test_email,
                "send_via": "both",
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Expected success=True"
        assert "form_id" in data, "Expected form_id in response"
        assert "form_link" in data, "Expected form_link in response"
        assert "message" in data, "Expected message in response"
        
        # Verify form_id is a valid UUID
        form_id = data["form_id"]
        assert len(form_id) == 36, f"Expected UUID format, got {form_id}"
        
        # Verify form_link contains the form_id
        assert form_id in data["form_link"], "form_link should contain form_id"
        
        # Store form_id for subsequent tests
        self.__class__.created_form_id = form_id
        print(f"Created form with ID: {form_id}")
    
    def test_get_diabetes_form_allotted(self):
        """Test GET /api/glydex/form/{form_id} - Get form details (allotted status)"""
        # First create a new form
        create_response = requests.post(
            f"{BASE_URL}/api/glydex/form/send",
            json={
                "patient_name": f"TEST_GetForm_{uuid.uuid4().hex[:6]}",
                "patient_phone": f"+91{uuid.uuid4().hex[:10]}",
                "send_via": "sms",
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha"
            }
        )
        assert create_response.status_code == 200
        form_id = create_response.json()["form_id"]
        
        # Get the form
        response = requests.get(f"{BASE_URL}/api/glydex/form/{form_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert data.get("id") == form_id, "Form ID should match"
        assert data.get("status") == "allotted", "New form should have 'allotted' status"
        assert "patient" in data, "Expected patient info in response"
        assert data["patient"]["name"] is not None, "Patient name should be present"
        assert data.get("clinic") == "Pushpa Clinic", "Clinic should match"
        assert data.get("doctor") == "Dr. Vikas Jha", "Doctor should match"
        
        print(f"Form {form_id} status: {data['status']}")
    
    def test_submit_diabetes_form(self):
        """Test POST /api/glydex/form/{form_id}/submit - Submit filled form"""
        # First create a new form
        create_response = requests.post(
            f"{BASE_URL}/api/glydex/form/send",
            json={
                "patient_name": f"TEST_Submit_{uuid.uuid4().hex[:6]}",
                "patient_phone": f"+91{uuid.uuid4().hex[:10]}",
                "send_via": "sms",
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha"
            }
        )
        assert create_response.status_code == 200
        form_id = create_response.json()["form_id"]
        
        # Submit the form
        submit_data = {
            "full_name": "Test Patient Diabetes",
            "age": "45",
            "phone": "+919876543210",
            "diabetes_type": "type2",
            "consent_given": True,
            "family_history": True,
            "insulin_user": False,
            "recent_hba1c": "7.2",
            "gender": "male",
            "blood_group": "O+",
            "medical_conditions": ["Hypertension", "Obesity"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/glydex/form/{form_id}/submit",
            json=submit_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response
        assert data.get("success") == True, "Expected success=True"
        assert data.get("form_id") == form_id, "Form ID should match"
        assert "message" in data, "Expected message in response"
        
        # Verify form status changed to 'filled'
        get_response = requests.get(f"{BASE_URL}/api/glydex/form/{form_id}")
        assert get_response.status_code == 200
        form_data = get_response.json()
        
        assert form_data.get("status") == "filled", "Form status should be 'filled' after submission"
        assert form_data.get("form_data") is not None, "Form data should be present after submission"
        assert form_data["form_data"]["diabetes_type"] == "type2", "Submitted data should be persisted"
        
        print(f"Form {form_id} submitted successfully, status: {form_data['status']}")
    
    def test_submit_already_filled_form(self):
        """Test submitting an already filled form returns error"""
        # First create and submit a form
        create_response = requests.post(
            f"{BASE_URL}/api/glydex/form/send",
            json={
                "patient_name": f"TEST_AlreadyFilled_{uuid.uuid4().hex[:6]}",
                "patient_phone": f"+91{uuid.uuid4().hex[:10]}",
                "send_via": "sms",
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha"
            }
        )
        form_id = create_response.json()["form_id"]
        
        # Submit first time
        submit_data = {
            "full_name": "Test Patient",
            "phone": "+919876543210",
            "diabetes_type": "type2",
            "consent_given": True
        }
        requests.post(f"{BASE_URL}/api/glydex/form/{form_id}/submit", json=submit_data)
        
        # Try to submit again
        response = requests.post(
            f"{BASE_URL}/api/glydex/form/{form_id}/submit",
            json=submit_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("error") == "Form already submitted", "Should return error for already submitted form"
        
        print("Correctly rejected duplicate submission")
    
    def test_get_nonexistent_form(self):
        """Test GET /api/glydex/form/{form_id} with invalid form_id"""
        fake_form_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/glydex/form/{fake_form_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("error") == "Form not found or expired", "Should return error for non-existent form"
        
        print("Correctly handled non-existent form")
    
    def test_list_diabetes_forms(self):
        """Test GET /api/glydex/forms/list - List all forms"""
        response = requests.get(f"{BASE_URL}/api/glydex/forms/list")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Expected success=True"
        assert "forms" in data, "Expected forms list in response"
        assert "counts" in data, "Expected counts in response"
        
        # Verify counts structure
        counts = data["counts"]
        assert "total" in counts, "Expected total count"
        assert "allotted" in counts, "Expected allotted count"
        assert "filled" in counts, "Expected filled count"
        
        # Verify total = allotted + filled
        assert counts["total"] == counts["allotted"] + counts["filled"], "Total should equal allotted + filled"
        
        print(f"Forms list: Total={counts['total']}, Allotted={counts['allotted']}, Filled={counts['filled']}")
    
    def test_list_diabetes_forms_by_clinic(self):
        """Test GET /api/glydex/forms/list with clinic filter"""
        response = requests.get(f"{BASE_URL}/api/glydex/forms/list?clinic=Pushpa")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        
        # Verify all forms are from Pushpa Clinic
        for form in data.get("forms", []):
            assert "Pushpa" in form.get("clinic", ""), f"Form clinic should contain 'Pushpa', got {form.get('clinic')}"
        
        print(f"Filtered forms by clinic: {len(data.get('forms', []))} forms")
    
    def test_list_diabetes_forms_by_status(self):
        """Test GET /api/glydex/forms/list with status filter"""
        # Test allotted status
        response = requests.get(f"{BASE_URL}/api/glydex/forms/list?status=allotted")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify all forms have allotted status
        for form in data.get("forms", []):
            assert form.get("status") == "allotted", f"Form status should be 'allotted', got {form.get('status')}"
        
        print(f"Filtered forms by status=allotted: {len(data.get('forms', []))} forms")
    
    def test_send_form_via_sms_only(self):
        """Test sending form via SMS only"""
        response = requests.post(
            f"{BASE_URL}/api/glydex/form/send",
            json={
                "patient_name": f"TEST_SMSOnly_{uuid.uuid4().hex[:6]}",
                "patient_phone": f"+91{uuid.uuid4().hex[:10]}",
                "send_via": "sms",
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("sms_sent") == True, "SMS should be sent"
        
        print("SMS-only form sent successfully")
    
    def test_send_form_via_email_only(self):
        """Test sending form via Email only"""
        response = requests.post(
            f"{BASE_URL}/api/glydex/form/send",
            json={
                "patient_name": f"TEST_EmailOnly_{uuid.uuid4().hex[:6]}",
                "patient_phone": f"+91{uuid.uuid4().hex[:10]}",
                "patient_email": f"test_{uuid.uuid4().hex[:6]}@example.com",
                "send_via": "email",
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("email_sent") == True, "Email should be sent"
        
        print("Email-only form sent successfully")


class TestStaffLogin:
    """Test Staff Login for Glydex access"""
    
    def test_staff_login_doc_vikas(self):
        """Test staff login with doc_vikas credentials"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={
                "username": "doc_vikas",
                "password": "Nevika@2026C"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Expected token in response"
        assert "staff" in data, "Expected staff info in response"
        
        # Verify staff info
        staff = data["staff"]
        assert staff.get("name") == "Dr. Vikas", "Staff name should be Dr. Vikas"
        assert staff.get("role") == "doctor", "Staff role should be doctor"
        assert "glydex" in staff.get("access_modules", []), "Staff should have glydex access"
        
        print(f"Staff login successful: {staff['name']} ({staff['role']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
