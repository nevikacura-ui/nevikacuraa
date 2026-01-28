"""
Backend API Tests for Nevika Cura - New Features
Tests: Medicine count (4266), OTP-based auth, Pharmacy pagination, Autocomplete
Updated: Added 642 new medicines, removed company field from all medicines
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthhub-231.preview.emergentagent.com')


class TestMedicineCount:
    """Tests for medicine inventory count - should be 4266 (3624 + 642 new)"""
    
    def test_medicine_count_is_4266(self):
        """Test that total medicine count is exactly 4266"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert data["total"] == 4266, f"Expected 4266 medicines, got {data['total']}"
        print(f"✓ Medicine count is correct: {data['total']}")


class TestPharmacyPagination:
    """Tests for /api/pharmacy/all endpoint with pagination"""
    
    def test_get_all_medicines_default(self):
        """Test getting medicines with default pagination"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all")
        assert response.status_code == 200
        data = response.json()
        
        assert "medicines" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        assert "total_pages" in data
        
        assert data["total"] == 4266
        assert data["page"] == 1
        assert data["per_page"] == 50
        assert len(data["medicines"]) == 50
        print(f"✓ Pagination working: {len(data['medicines'])} medicines on page 1")
    
    def test_get_all_medicines_page_2(self):
        """Test getting second page of medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=2&per_page=50")
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 2
        assert len(data["medicines"]) == 50
        print(f"✓ Page 2 returned {len(data['medicines'])} medicines")
    
    def test_get_all_medicines_with_search(self):
        """Test search functionality in paginated endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?search=thyro")
        assert response.status_code == 200
        data = response.json()
        
        assert "medicines" in data
        assert data["total"] > 0
        
        # All results should contain 'thyro' in name
        for med in data["medicines"]:
            assert "thyro" in med["name"].lower(), f"Medicine {med['name']} doesn't match search"
        print(f"✓ Search 'thyro' returned {data['total']} medicines")
    
    def test_total_pages_calculation(self):
        """Test that total_pages is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?per_page=100")
        assert response.status_code == 200
        data = response.json()
        
        expected_pages = (4266 + 100 - 1) // 100  # Ceiling division
        assert data["total_pages"] == expected_pages
        print(f"✓ Total pages calculation correct: {data['total_pages']}")
    
    def test_medicine_has_no_company_field(self):
        """Test that medicines do not have company field (removed)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?per_page=10")
        assert response.status_code == 200
        data = response.json()
        
        for med in data["medicines"]:
            assert "company" not in med, f"Medicine {med['name']} still has company field"
            assert "name" in med
            assert "form" in med
        print(f"✓ Medicines have no company field, only name and form")


class TestPharmacyAutocomplete:
    """Tests for /api/pharmacy/autocomplete endpoint"""
    
    def test_autocomplete_thyro(self):
        """Test autocomplete for 'thyro'"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete?q=thyro&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data
        assert "query" in data
        assert data["query"] == "thyro"
        assert len(data["suggestions"]) > 0
        
        # All suggestions should contain 'thyro'
        for suggestion in data["suggestions"]:
            assert "thyro" in suggestion["name"].lower()
        print(f"✓ Autocomplete 'thyro' returned {len(data['suggestions'])} suggestions")
    
    def test_autocomplete_crocin(self):
        """Test autocomplete for 'crocin'"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete?q=crocin&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0
        print(f"✓ Autocomplete 'crocin' returned {len(data['suggestions'])} suggestions")
    
    def test_autocomplete_limit(self):
        """Test autocomplete respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/autocomplete?q=a&limit=3")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["suggestions"]) <= 3
        print(f"✓ Autocomplete limit respected: {len(data['suggestions'])} suggestions")


class TestAuthOTPSend:
    """Tests for /api/auth/otp/send endpoint"""
    
    def test_send_otp_success(self):
        """Test sending OTP successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": "9876543210"})
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "mock_otp" in data  # Mock OTP for testing
        assert data["expires_in"] == 300
        assert data["phone"] == "9876543210"
        print(f"✓ OTP sent successfully, mock_otp: {data['mock_otp']}")
    
    def test_send_otp_invalid_phone(self):
        """Test sending OTP with invalid phone"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": "123"})
        assert response.status_code == 400
        print("✓ Invalid phone rejected")


class TestAuthOTPVerify:
    """Tests for /api/auth/otp/verify endpoint"""
    
    def test_verify_otp_success(self):
        """Test verifying OTP successfully"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": "9876543211"})
        assert send_response.status_code == 200
        mock_otp = send_response.json()["mock_otp"]
        
        # Then verify
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9876543211",
            "otp": mock_otp
        })
        assert verify_response.status_code == 200
        data = verify_response.json()
        
        assert data["success"] == True
        assert data["verified"] == True
        assert "verification_token" in data
        assert "user_exists" in data
        print(f"✓ OTP verified successfully, user_exists: {data['user_exists']}")
    
    def test_verify_otp_invalid(self):
        """Test verifying with invalid OTP"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": "9876543212"})
        assert send_response.status_code == 200
        
        # Then verify with wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9876543212",
            "otp": "000000"
        })
        assert verify_response.status_code == 400
        print("✓ Invalid OTP rejected")
    
    def test_verify_otp_not_found(self):
        """Test verifying OTP that was never sent"""
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9999999999",
            "otp": "123456"
        })
        assert verify_response.status_code == 400
        print("✓ OTP not found error returned")


class TestAuthOTPRegistration:
    """Tests for /api/auth/register/otp endpoint"""
    
    def test_register_with_otp(self):
        """Test full OTP registration flow"""
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"[:10]
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Step 1: Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": unique_phone})
        assert send_response.status_code == 200
        mock_otp = send_response.json()["mock_otp"]
        
        # Step 2: Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": unique_phone,
            "otp": mock_otp
        })
        assert verify_response.status_code == 200
        
        # Step 3: Register
        register_response = requests.post(f"{BASE_URL}/api/auth/register/otp", json={
            "phone": unique_phone,
            "otp": mock_otp,
            "email": unique_email,
            "password": "testpass123",
            "name": "TEST_OTP User"
        })
        assert register_response.status_code == 200
        data = register_response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["phone"] == unique_phone
        assert data["user"]["email"] == unique_email
        print(f"✓ User registered via OTP: {unique_email}")


class TestAuthOTPLogin:
    """Tests for /api/auth/login/otp endpoint"""
    
    def test_login_with_otp_existing_user(self):
        """Test OTP login for existing user"""
        # First create a user
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"[:10]
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register via traditional method
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "phone": unique_phone,
            "name": "TEST_Login User"
        })
        assert register_response.status_code == 200
        
        # Now login via OTP
        # Step 1: Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": unique_phone})
        assert send_response.status_code == 200
        mock_otp = send_response.json()["mock_otp"]
        
        # Step 2: Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": unique_phone,
            "otp": mock_otp
        })
        assert verify_response.status_code == 200
        assert verify_response.json()["user_exists"] == True
        
        # Step 3: Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login/otp", json={
            "phone": unique_phone,
            "otp": mock_otp
        })
        assert login_response.status_code == 200
        data = login_response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["phone"] == unique_phone
        print(f"✓ User logged in via OTP: {unique_email}")


class TestOrderOTP:
    """Tests for order OTP endpoints (pharmacy/diagnostics)"""
    
    def test_send_order_otp(self):
        """Test sending OTP for pharmacy order"""
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "phone": "9876543213",
            "service": "pharmacy"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "mock_otp" in data
        print(f"✓ Order OTP sent: {data['mock_otp']}")
    
    def test_verify_order_otp(self):
        """Test verifying OTP for order"""
        # Send OTP
        send_response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "phone": "9876543214",
            "service": "pharmacy"
        })
        mock_otp = send_response.json()["mock_otp"]
        
        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "phone": "9876543214",
            "otp": mock_otp,
            "service": "pharmacy"
        })
        assert verify_response.status_code == 200
        data = verify_response.json()
        
        assert data["success"] == True
        assert "verification_token" in data
        print("✓ Order OTP verified successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
