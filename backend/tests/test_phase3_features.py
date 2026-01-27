"""
Phase 3 Features API Tests
- Voice Assistant (Multi-language)
- Teleconsultation
- Insurance Integration
- Health Packages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase3Setup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get patient authentication token"""
        # Send OTP
        send_res = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile=9876543210")
        assert send_res.status_code == 200
        otp = send_res.json().get('mock_otp')
        
        # Verify OTP
        verify_res = requests.post(f"{BASE_URL}/api/patients/portal/verify-otp?mobile=9876543210&otp={otp}")
        assert verify_res.status_code == 200
        token = verify_res.json().get('token')
        assert token is not None
        return token


class TestHealthPackages:
    """Health Packages API tests - No auth required for listing"""
    
    def test_get_packages_success(self):
        """Test getting health packages list"""
        response = requests.get(f"{BASE_URL}/api/features/packages")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'packages' in data
        assert len(data['packages']) >= 5
        
        # Verify package structure
        package = data['packages'][0]
        assert 'id' in package
        assert 'name' in package
        assert 'price' in package
        assert 'includes' in package
        assert isinstance(package['includes'], list)
    
    def test_packages_contain_expected_items(self):
        """Test that expected packages are present"""
        response = requests.get(f"{BASE_URL}/api/features/packages")
        data = response.json()
        
        package_ids = [p['id'] for p in data['packages']]
        assert 'basic_checkup' in package_ids
        assert 'diabetes_care' in package_ids
        assert 'womens_wellness' in package_ids
        assert 'senior_citizen' in package_ids
        assert 'maternity' in package_ids
    
    def test_packages_have_discounts(self):
        """Test that packages have discount information"""
        response = requests.get(f"{BASE_URL}/api/features/packages")
        data = response.json()
        
        for package in data['packages']:
            assert 'price' in package
            assert 'original_price' in package
            assert 'discount' in package
            assert package['price'] < package['original_price']


class TestHealthPackagesAuth:
    """Health Packages booking tests - Auth required"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        send_res = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile=9876543210")
        otp = send_res.json().get('mock_otp')
        verify_res = requests.post(f"{BASE_URL}/api/patients/portal/verify-otp?mobile=9876543210&otp={otp}")
        self.token = verify_res.json().get('token')
        self.headers = {'Authorization': f'Bearer {self.token}'}
    
    def test_book_package_requires_auth(self):
        """Test that booking requires authentication"""
        response = requests.post(f"{BASE_URL}/api/features/packages/book?package_id=basic_checkup&preferred_date=2026-02-15")
        assert response.status_code == 401
    
    def test_book_package_success(self):
        """Test booking a health package"""
        response = requests.post(
            f"{BASE_URL}/api/features/packages/book?package_id=basic_checkup&preferred_date=2026-02-15",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'booking_id' in data
        assert data['booking_id'].startswith('PKG')
        assert 'instructions' in data


class TestVoiceAssistant:
    """Voice Assistant API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        send_res = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile=9876543210")
        otp = send_res.json().get('mock_otp')
        verify_res = requests.post(f"{BASE_URL}/api/patients/portal/verify-otp?mobile=9876543210&otp={otp}")
        self.token = verify_res.json().get('token')
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def test_voice_command_requires_auth(self):
        """Test that voice command requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/features/voice/process-command",
            json={"text": "Book appointment", "language": "en"}
        )
        assert response.status_code == 401
    
    def test_voice_command_english(self):
        """Test voice command processing in English"""
        response = requests.post(
            f"{BASE_URL}/api/features/voice/process-command",
            headers=self.headers,
            json={"text": "Book an appointment with Dr. Vikas for tomorrow", "language": "en"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'intent' in data
        assert 'response_text' in data
        assert data['language'] == 'en'
        assert data['ai_powered'] == True
    
    def test_voice_command_hindi(self):
        """Test voice command processing in Hindi"""
        response = requests.post(
            f"{BASE_URL}/api/features/voice/process-command",
            headers=self.headers,
            json={"text": "डॉ. विकास से अपॉइंटमेंट बुक करें", "language": "hi"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert data['language'] == 'hi'
        assert data['ai_powered'] == True
    
    def test_voice_command_marathi(self):
        """Test voice command processing in Marathi"""
        response = requests.post(
            f"{BASE_URL}/api/features/voice/process-command",
            headers=self.headers,
            json={"text": "डॉ. विकास सोबत अपॉइंटमेंट बुक करा", "language": "mr"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert data['language'] == 'mr'
        assert data['ai_powered'] == True
    
    def test_voice_command_extracts_doctor(self):
        """Test that voice command extracts doctor name"""
        response = requests.post(
            f"{BASE_URL}/api/features/voice/process-command",
            headers=self.headers,
            json={"text": "I want to see Dr. Vikas Jha", "language": "en"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'extracted_data' in data
        # Doctor should be extracted
        assert data['extracted_data'].get('doctor') is not None or data['intent'] == 'book_appointment'


class TestTeleconsultation:
    """Teleconsultation API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        send_res = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile=9876543210")
        otp = send_res.json().get('mock_otp')
        verify_res = requests.post(f"{BASE_URL}/api/patients/portal/verify-otp?mobile=9876543210&otp={otp}")
        self.token = verify_res.json().get('token')
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def test_teleconsult_request_requires_auth(self):
        """Test that teleconsult request requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/features/teleconsult/request",
            json={
                "doctor_id": "doc_vikas",
                "preferred_date": "2026-02-01",
                "preferred_time": "10:00 AM",
                "reason": "Checkup",
                "consultation_type": "video"
            }
        )
        assert response.status_code == 401
    
    def test_teleconsult_request_video(self):
        """Test booking video teleconsultation"""
        response = requests.post(
            f"{BASE_URL}/api/features/teleconsult/request",
            headers=self.headers,
            json={
                "doctor_id": "doc_vikas",
                "preferred_date": "2026-02-01",
                "preferred_time": "10:00 AM",
                "reason": "Diabetes checkup",
                "consultation_type": "video"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'consultation_id' in data
        assert data['status'] == 'pending'
        assert data['estimated_fee'] == 500  # Video fee
    
    def test_teleconsult_request_audio(self):
        """Test booking audio teleconsultation"""
        response = requests.post(
            f"{BASE_URL}/api/features/teleconsult/request",
            headers=self.headers,
            json={
                "doctor_id": "doc_neha",
                "preferred_date": "2026-02-02",
                "preferred_time": "11:00 AM",
                "reason": "Follow-up",
                "consultation_type": "audio"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert data['estimated_fee'] == 300  # Audio fee
    
    def test_get_upcoming_teleconsultations(self):
        """Test getting upcoming teleconsultations"""
        response = requests.get(
            f"{BASE_URL}/api/features/teleconsult/upcoming",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'consultations' in data
        assert isinstance(data['consultations'], list)
    
    def test_join_teleconsultation(self):
        """Test joining a teleconsultation"""
        # First book a consultation
        book_res = requests.post(
            f"{BASE_URL}/api/features/teleconsult/request",
            headers=self.headers,
            json={
                "doctor_id": "doc_vikas",
                "preferred_date": "2026-02-03",
                "preferred_time": "2:00 PM",
                "reason": "Test",
                "consultation_type": "video"
            }
        )
        consultation_id = book_res.json().get('consultation_id')
        
        # Join the consultation
        response = requests.post(
            f"{BASE_URL}/api/features/teleconsult/{consultation_id}/join",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'meeting_link' in data
        assert consultation_id in data['meeting_link']


class TestInsuranceIntegration:
    """Insurance Integration API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        send_res = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile=9876543210")
        otp = send_res.json().get('mock_otp')
        verify_res = requests.post(f"{BASE_URL}/api/patients/portal/verify-otp?mobile=9876543210&otp={otp}")
        self.token = verify_res.json().get('token')
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def test_insurance_verify_requires_auth(self):
        """Test that insurance verify requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/features/insurance/verify?provider=star_health&policy_number=SH123"
        )
        assert response.status_code == 401
    
    def test_insurance_verify_star_health(self):
        """Test verifying Star Health insurance"""
        response = requests.post(
            f"{BASE_URL}/api/features/insurance/verify?provider=star_health&policy_number=SH123456789",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert data['verified'] == True
        assert data['provider'] == 'Star Health Insurance'
        assert 'coverage' in data
        assert data['coverage']['consultation']['covered'] == True
    
    def test_insurance_verify_hdfc_ergo(self):
        """Test verifying HDFC ERGO insurance"""
        response = requests.post(
            f"{BASE_URL}/api/features/insurance/verify?provider=hdfc_ergo&policy_number=HE987654321",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert data['verified'] == True
        assert data['provider'] == 'HDFC ERGO Health Insurance'
    
    def test_insurance_verify_icici_lombard(self):
        """Test verifying ICICI Lombard insurance"""
        response = requests.post(
            f"{BASE_URL}/api/features/insurance/verify?provider=icici_lombard&policy_number=IL555555555",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert data['verified'] == True
        assert data['provider'] == 'ICICI Lombard Health Insurance'
    
    def test_insurance_verify_unknown_provider(self):
        """Test verifying unknown insurance provider"""
        response = requests.post(
            f"{BASE_URL}/api/features/insurance/verify?provider=unknown_provider&policy_number=XYZ123",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == False
        assert data['verified'] == False
        assert 'not found' in data['message'].lower()
    
    def test_submit_insurance_claim(self):
        """Test submitting insurance claim"""
        response = requests.post(
            f"{BASE_URL}/api/features/insurance/claim",
            headers=self.headers,
            json={
                "insurance_provider": "star_health",
                "policy_number": "SH123456789",
                "claim_type": "consultation",
                "amount": 500,
                "description": "Doctor consultation fee"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'claim_id' in data
        assert data['claim_id'].startswith('CLM')
        assert data['status'] == 'submitted'
    
    def test_get_insurance_claims(self):
        """Test getting insurance claims"""
        response = requests.get(
            f"{BASE_URL}/api/features/insurance/claims",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'claims' in data
        assert isinstance(data['claims'], list)
    
    def test_claim_persists_in_database(self):
        """Test that submitted claim is persisted and retrievable"""
        # Submit a claim
        submit_res = requests.post(
            f"{BASE_URL}/api/features/insurance/claim",
            headers=self.headers,
            json={
                "insurance_provider": "hdfc_ergo",
                "policy_number": "HE987654321",
                "claim_type": "pharmacy",
                "amount": 1500,
                "description": "TEST_Pharmacy purchase"
            }
        )
        claim_id = submit_res.json().get('claim_id')
        
        # Get claims and verify
        get_res = requests.get(
            f"{BASE_URL}/api/features/insurance/claims",
            headers=self.headers
        )
        claims = get_res.json().get('claims', [])
        
        # Find the submitted claim
        found = any(c['id'] == claim_id for c in claims)
        assert found, f"Claim {claim_id} not found in claims list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
