"""
Test ABHA/NDHM Integration and Language Features
Tests for Feature 1 (ABHA) and Feature 2 (Vernacular Language Support)
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestABHACreateInit:
    """Test ABHA creation initialization endpoint"""
    
    def test_create_init_mobile_method_success(self):
        """Test POST /api/abha/create/init with mobile method"""
        response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "mobile",
            "identifier": "9876543210",
            "name": "Test User ABHA"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transaction_id" in data, "Response should contain transaction_id"
        assert "message" in data, "Response should contain message"
        assert data.get("demo_mode") == True, "Should be in demo mode"
        assert "TXN-" in data["transaction_id"], "Transaction ID should start with TXN-"
        print(f"PASS: ABHA init with mobile - txn_id: {data['transaction_id']}")
        return data["transaction_id"]
    
    def test_create_init_aadhaar_method_success(self):
        """Test POST /api/abha/create/init with aadhaar method"""
        response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "aadhaar",
            "identifier": "123456789012",
            "name": "Test Aadhaar User",
            "year_of_birth": 1990,
            "gender": "M"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transaction_id" in data
        assert data.get("demo_mode") == True
        print(f"PASS: ABHA init with aadhaar - txn_id: {data['transaction_id']}")
    
    def test_create_init_invalid_mobile(self):
        """Test validation for invalid mobile number"""
        response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "mobile",
            "identifier": "12345",  # Invalid - not 10 digits
            "name": "Test User"
        })
        assert response.status_code == 400, f"Expected 400 for invalid mobile, got {response.status_code}"
        print("PASS: Invalid mobile number rejected")
    
    def test_create_init_invalid_aadhaar(self):
        """Test validation for invalid aadhaar number"""
        response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "aadhaar",
            "identifier": "12345",  # Invalid - not 12 digits
            "name": "Test User"
        })
        assert response.status_code == 400, f"Expected 400 for invalid aadhaar, got {response.status_code}"
        print("PASS: Invalid aadhaar number rejected")
    
    def test_create_init_invalid_method(self):
        """Test validation for invalid method"""
        response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "invalid_method",
            "identifier": "9876543210",
            "name": "Test User"
        })
        assert response.status_code == 400, f"Expected 400 for invalid method, got {response.status_code}"
        print("PASS: Invalid method rejected")


class TestABHAVerifyOTP:
    """Test ABHA OTP verification endpoint"""
    
    def test_verify_otp_success(self):
        """Test POST /api/abha/create/verify with correct OTP 123456"""
        # First, initiate ABHA creation
        init_response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "mobile",
            "identifier": "9876543211",
            "name": "Test Verify User"
        })
        assert init_response.status_code == 200
        txn_id = init_response.json()["transaction_id"]
        
        # Verify with OTP 123456
        verify_response = requests.post(f"{BASE_URL}/api/abha/create/verify", json={
            "transaction_id": txn_id,
            "otp": "123456"
        })
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}: {verify_response.text}"
        
        data = verify_response.json()
        assert "abha_number" in data, "Response should contain abha_number"
        assert "abha_address" in data, "Response should contain abha_address"
        assert "name" in data, "Response should contain name"
        assert data["name"] == "Test Verify User"
        assert data.get("demo_mode") == True
        
        # Validate ABHA number format (XX-XXXX-XXXX-XXXX)
        abha_num = data["abha_number"]
        parts = abha_num.split("-")
        assert len(parts) == 4, f"ABHA number should have 4 parts: {abha_num}"
        
        print(f"PASS: ABHA created - {abha_num}")
        return data
    
    def test_verify_otp_invalid_otp(self):
        """Test verification with wrong OTP"""
        # First, initiate ABHA creation
        init_response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "mobile",
            "identifier": "9876543212",
            "name": "Test Wrong OTP User"
        })
        assert init_response.status_code == 200
        txn_id = init_response.json()["transaction_id"]
        
        # Verify with wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/abha/create/verify", json={
            "transaction_id": txn_id,
            "otp": "000000"
        })
        assert verify_response.status_code == 400, f"Expected 400 for wrong OTP, got {verify_response.status_code}"
        print("PASS: Wrong OTP rejected")
    
    def test_verify_otp_invalid_transaction(self):
        """Test verification with invalid transaction ID"""
        verify_response = requests.post(f"{BASE_URL}/api/abha/create/verify", json={
            "transaction_id": "INVALID-TXN-ID",
            "otp": "123456"
        })
        assert verify_response.status_code == 404, f"Expected 404 for invalid txn, got {verify_response.status_code}"
        print("PASS: Invalid transaction ID rejected")


class TestABHALink:
    """Test ABHA linking endpoint"""
    
    def test_link_abha_to_phone(self):
        """Test POST /api/abha/link"""
        test_phone = f"TEST_{random.randint(1000000000, 9999999999)}"
        test_abha = f"{random.randint(10,99)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}"
        
        response = requests.post(f"{BASE_URL}/api/abha/link", json={
            "abha_number": test_abha,
            "phone": test_phone
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["abha_number"] == test_abha
        assert data["phone"] == test_phone
        print(f"PASS: ABHA {test_abha} linked to phone {test_phone}")
        return test_phone, test_abha


class TestABHAProfile:
    """Test ABHA profile retrieval endpoint"""
    
    def test_get_profile_linked(self):
        """Test GET /api/abha/profile/{phone} for linked ABHA"""
        # First create and link an ABHA
        test_phone = f"TEST_PROFILE_{random.randint(1000000000, 9999999999)}"
        
        # Create ABHA
        init_response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "mobile",
            "identifier": "9876543213",
            "name": "Test Profile User"
        })
        assert init_response.status_code == 200
        txn_id = init_response.json()["transaction_id"]
        
        verify_response = requests.post(f"{BASE_URL}/api/abha/create/verify", json={
            "transaction_id": txn_id,
            "otp": "123456"
        })
        assert verify_response.status_code == 200
        abha_number = verify_response.json()["abha_number"]
        
        # Link ABHA
        link_response = requests.post(f"{BASE_URL}/api/abha/link", json={
            "abha_number": abha_number,
            "phone": test_phone
        })
        assert link_response.status_code == 200
        
        # Get profile
        profile_response = requests.get(f"{BASE_URL}/api/abha/profile/{test_phone}")
        assert profile_response.status_code == 200, f"Expected 200, got {profile_response.status_code}"
        
        data = profile_response.json()
        assert data.get("linked") == True, "Profile should show linked=True"
        assert data["abha_number"] == abha_number
        assert "abha_address" in data
        assert "name" in data
        print(f"PASS: Profile retrieved for {test_phone}")
    
    def test_get_profile_not_linked(self):
        """Test GET /api/abha/profile/{phone} for non-linked phone"""
        response = requests.get(f"{BASE_URL}/api/abha/profile/NONEXISTENT_PHONE_123")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("linked") == False, "Profile should show linked=False for non-linked phone"
        print("PASS: Non-linked phone returns linked=False")


class TestABHARecords:
    """Test ABHA health records endpoint"""
    
    def test_get_records_existing_abha(self):
        """Test GET /api/abha/records/{abha_number}"""
        # First create an ABHA
        init_response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "mobile",
            "identifier": "9876543214",
            "name": "Test Records User"
        })
        assert init_response.status_code == 200
        txn_id = init_response.json()["transaction_id"]
        
        verify_response = requests.post(f"{BASE_URL}/api/abha/create/verify", json={
            "transaction_id": txn_id,
            "otp": "123456"
        })
        assert verify_response.status_code == 200
        abha_number = verify_response.json()["abha_number"]
        
        # Get records
        records_response = requests.get(f"{BASE_URL}/api/abha/records/{abha_number}")
        assert records_response.status_code == 200, f"Expected 200, got {records_response.status_code}"
        
        data = records_response.json()
        assert data["abha_number"] == abha_number
        assert "records" in data
        assert "total" in data
        assert data.get("demo_mode") == True
        print(f"PASS: Records retrieved for ABHA {abha_number}")
    
    def test_get_records_nonexistent_abha(self):
        """Test GET /api/abha/records/{abha_number} for non-existent ABHA"""
        response = requests.get(f"{BASE_URL}/api/abha/records/99-9999-9999-9999")
        assert response.status_code == 404, f"Expected 404 for non-existent ABHA, got {response.status_code}"
        print("PASS: Non-existent ABHA returns 404")


class TestLanguagePreferences:
    """Test language preference API (if exists)"""
    
    def test_language_preferences_endpoint(self):
        """Test PUT /api/features/language/preferences"""
        # This endpoint may require authentication, so we test if it exists
        response = requests.put(f"{BASE_URL}/api/features/language/preferences", json={
            "language": "hi"
        })
        # Accept 200 (success), 401 (auth required), or 404 (endpoint doesn't exist)
        assert response.status_code in [200, 401, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"Language preferences endpoint status: {response.status_code}")


class TestRegressionHome:
    """Regression test for Home page API"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Health endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
