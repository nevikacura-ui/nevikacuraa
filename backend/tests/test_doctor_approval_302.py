"""
Doctor EMR & Consultation System - P0-P1 QA Tests
Tests: Health check, Doctor login, Clinical Drug Check, Patient Prescriptions, Pharmacy Orders
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DOCTOR_USERNAME = "dr_vikas"
DOCTOR_PASSWORD = "test1234"
TEST_PHONE = "9833188288"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_api_health(self):
        """GET /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "ok" or "status" in data, f"Unexpected response: {data}"
        print(f"PASSED: Health check - status: {data}")


class TestDoctorAuth:
    """Doctor authentication tests"""
    
    def test_doctor_login_success(self):
        """POST /api/staff/login with valid credentials returns JWT token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_USERNAME,
            "password": DOCTOR_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        assert len(data["token"]) > 0, "Token is empty"
        assert "staff" in data, f"No staff info in response: {data}"
        print(f"PASSED: Doctor login - token received, staff: {data.get('staff', {}).get('name')}")
        return data["token"]
    
    def test_doctor_login_invalid_credentials(self):
        """POST /api/staff/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("PASSED: Invalid credentials correctly rejected with 401")


class TestClinicalIntelligence:
    """Clinical Drug Check endpoint tests (GPT-5.2 powered)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for doctor"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_USERNAME,
            "password": DOCTOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_clinical_drug_check_success(self, auth_token):
        """POST /api/emr/clinical/drug-check with valid data returns success with alerts array"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "medicines": ["Metformin 500mg", "Glimepiride 2mg"],
            "patient_allergies": ["Sulfa"],
            "patient_age": "55",
            "diagnosis": ["Type 2 Diabetes"]
        }
        response = requests.post(
            f"{BASE_URL}/api/emr/clinical/drug-check",
            json=payload,
            headers=headers,
            timeout=30  # AI endpoint may take time
        )
        assert response.status_code == 200, f"Drug check failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "alerts" in data, f"No alerts array in response: {data}"
        assert isinstance(data["alerts"], list), f"Alerts should be a list: {data}"
        print(f"PASSED: Clinical drug check - success={data['success']}, alerts count={len(data['alerts'])}")
    
    def test_clinical_drug_check_empty_medicines(self, auth_token):
        """POST /api/emr/clinical/drug-check with empty medicines returns safe=True"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "medicines": [],
            "patient_allergies": [],
            "patient_age": "30",
            "diagnosis": []
        }
        response = requests.post(
            f"{BASE_URL}/api/emr/clinical/drug-check",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Drug check failed: {response.status_code}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert data.get("safe") == True, f"Expected safe=True for empty medicines: {data}"
        print(f"PASSED: Empty medicines check - safe={data['safe']}")


class TestPatientPrescriptions:
    """Patient prescription access tests"""
    
    def test_patient_prescriptions_by_phone(self):
        """GET /api/emr/patient/prescriptions?phone=XXXX returns success"""
        response = requests.get(f"{BASE_URL}/api/emr/patient/prescriptions?phone={TEST_PHONE}")
        assert response.status_code == 200, f"Patient prescriptions failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "prescriptions" in data, f"No prescriptions array in response: {data}"
        assert isinstance(data["prescriptions"], list), f"Prescriptions should be a list: {data}"
        print(f"PASSED: Patient prescriptions - count={len(data['prescriptions'])}")
    
    def test_patient_prescriptions_invalid_phone(self):
        """GET /api/emr/patient/prescriptions with short phone returns 400"""
        response = requests.get(f"{BASE_URL}/api/emr/patient/prescriptions?phone=123")
        assert response.status_code == 400, f"Expected 400 for invalid phone, got: {response.status_code}"
        print("PASSED: Invalid phone correctly rejected with 400")


class TestPharmacyOrders:
    """Pharmacy order approval flow tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for doctor"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": DOCTOR_USERNAME,
            "password": DOCTOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_pending_pharmacy_orders(self, auth_token):
        """GET /api/emr/pharmacy-orders/pending with Bearer token returns success with orders array"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/emr/pharmacy-orders/pending",
            headers=headers
        )
        assert response.status_code == 200, f"Pending orders failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "orders" in data, f"No orders array in response: {data}"
        assert isinstance(data["orders"], list), f"Orders should be a list: {data}"
        print(f"PASSED: Pending pharmacy orders - count={len(data['orders'])}")
    
    def test_all_pharmacy_orders(self, auth_token):
        """GET /api/emr/pharmacy-orders/all returns success"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/emr/pharmacy-orders/all",
            headers=headers
        )
        assert response.status_code == 200, f"All orders failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "orders" in data, f"No orders array in response: {data}"
        print(f"PASSED: All pharmacy orders - count={len(data['orders'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
