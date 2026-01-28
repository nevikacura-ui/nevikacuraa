"""
Iteration 29 - Wallet and Teleconsultation API Tests
Tests for:
- Wallet API: balance, topup, screenshot upload, transactions
- Teleconsult API: config, booked-slots, book, my-bookings, cancel
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthhub-231.preview.emergentagent.com').rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_wallet_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "testpass123"
TEST_PHONE = "9876543210"
TEST_NAME = "Wallet Test User"


class TestWalletAndTeleconsultAPIs:
    """Test Wallet and Teleconsultation APIs"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Register a test user and get auth token"""
        # First try to register
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "phone": TEST_PHONE,
            "name": TEST_NAME
        })
        
        if register_response.status_code == 200:
            return register_response.json().get("token")
        elif register_response.status_code == 400 and "already registered" in register_response.text.lower():
            # User exists, try login
            login_response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if login_response.status_code == 200:
                return login_response.json().get("token")
        
        pytest.skip(f"Could not authenticate: {register_response.text}")
        return None
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authorization headers"""
        if not auth_token:
            pytest.skip("No auth token available")
        return {"Authorization": f"Bearer {auth_token}"}
    
    # ============ TELECONSULT CONFIG (No Auth Required) ============
    
    def test_teleconsult_config(self, session):
        """Test GET /api/teleconsult/config - returns doctors and slots config"""
        response = session.get(f"{BASE_URL}/api/teleconsult/config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "doctors" in data, "Response should contain 'doctors'"
        assert "slots_per_day" in data, "Response should contain 'slots_per_day'"
        assert "slot_duration" in data, "Response should contain 'slot_duration'"
        assert "timing" in data, "Response should contain 'timing'"
        assert "payment_method" in data, "Response should contain 'payment_method'"
        
        # Verify doctors
        doctors = data["doctors"]
        assert "dr-neha-patel" in doctors, "Dr. Neha Patel should be in doctors"
        assert "dr-vikas-jha" in doctors, "Dr. Vikas Jha should be in doctors"
        
        # Verify Dr. Neha Patel details
        neha = doctors["dr-neha-patel"]
        assert neha["name"] == "Dr. Neha Patel"
        assert neha["fee"] == 300
        assert neha["specialization"] == "Obstetrics & Gynecology"
        
        # Verify Dr. Vikas Jha details
        vikas = doctors["dr-vikas-jha"]
        assert vikas["name"] == "Dr. Vikas Jha"
        assert vikas["fee"] == 250
        assert vikas["specialization"] == "Obstetrics & Gynecology"
        
        # Verify slot configuration
        assert data["slot_duration"] == 15, "Slot duration should be 15 minutes"
        assert data["timing"] == "9:00 AM - 9:00 PM", "Timing should be 9 AM to 9 PM"
        assert data["payment_method"] == "wallet_only", "Payment method should be wallet_only"
        
        print(f"✓ Teleconsult config: {len(doctors)} doctors, {data['slots_per_day']} slots/day")
    
    def test_teleconsult_booked_slots(self, session):
        """Test GET /api/teleconsult/booked-slots - returns booked slots for doctor/date"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = session.get(
            f"{BASE_URL}/api/teleconsult/booked-slots",
            params={"doctor": "dr-neha-patel", "date": tomorrow}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "booked_slots" in data, "Response should contain 'booked_slots'"
        assert isinstance(data["booked_slots"], list), "booked_slots should be a list"
        
        print(f"✓ Booked slots for Dr. Neha Patel on {tomorrow}: {len(data['booked_slots'])} slots booked")
    
    # ============ WALLET APIs (Auth Required) ============
    
    def test_wallet_balance_unauthorized(self, session):
        """Test GET /api/wallet/balance without auth - should return 401"""
        response = session.get(f"{BASE_URL}/api/wallet/balance")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wallet balance correctly requires authentication")
    
    def test_wallet_balance_authorized(self, session, auth_headers):
        """Test GET /api/wallet/balance with auth - returns balance and UPI details"""
        response = session.get(f"{BASE_URL}/api/wallet/balance", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "balance" in data, "Response should contain 'balance'"
        assert "total_added" in data, "Response should contain 'total_added'"
        assert "total_spent" in data, "Response should contain 'total_spent'"
        assert "upi_details" in data, "Response should contain 'upi_details'"
        
        # Verify UPI details
        upi = data["upi_details"]
        assert "upi_id" in upi, "UPI details should contain 'upi_id'"
        assert "name" in upi, "UPI details should contain 'name'"
        assert upi["upi_id"] == "nevikacura@ybl", "UPI ID should be nevikacura@ybl"
        
        print(f"✓ Wallet balance: ₹{data['balance']}, UPI: {upi['upi_id']}")
    
    def test_wallet_topup_unauthorized(self, session):
        """Test POST /api/wallet/topup without auth - should return 401"""
        response = session.post(f"{BASE_URL}/api/wallet/topup", json={
            "amount": 500,
            "payment_method": "upi"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wallet topup correctly requires authentication")
    
    def test_wallet_topup_minimum_amount(self, session, auth_headers):
        """Test POST /api/wallet/topup with amount below minimum - should return 400"""
        response = session.post(
            f"{BASE_URL}/api/wallet/topup",
            headers=auth_headers,
            json={"amount": 50, "payment_method": "upi"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "minimum" in response.text.lower(), "Error should mention minimum amount"
        print("✓ Wallet topup correctly rejects amount below ₹100 minimum")
    
    def test_wallet_topup_maximum_amount(self, session, auth_headers):
        """Test POST /api/wallet/topup with amount above maximum - should return 400"""
        response = session.post(
            f"{BASE_URL}/api/wallet/topup",
            headers=auth_headers,
            json={"amount": 60000, "payment_method": "upi"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "maximum" in response.text.lower(), "Error should mention maximum amount"
        print("✓ Wallet topup correctly rejects amount above ₹50,000 maximum")
    
    def test_wallet_topup_valid(self, session, auth_headers):
        """Test POST /api/wallet/topup with valid amount - creates pending topup"""
        response = session.post(
            f"{BASE_URL}/api/wallet/topup",
            headers=auth_headers,
            json={
                "amount": 500,
                "payment_method": "upi",
                "transaction_id": f"TXN{uuid.uuid4().hex[:8].upper()}"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "transaction_id" in data, "Response should contain transaction_id"
        assert "upi_details" in data, "Response should contain upi_details"
        
        # Store transaction ID for screenshot upload test
        TestWalletAndTeleconsultAPIs.topup_transaction_id = data["transaction_id"]
        
        print(f"✓ Wallet topup request created: {data['transaction_id']}")
    
    def test_wallet_topup_screenshot_unauthorized(self, session):
        """Test POST /api/wallet/topup/{id}/screenshot without auth - should return 401"""
        response = session.post(f"{BASE_URL}/api/wallet/topup/fake-id/screenshot")
        
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("✓ Screenshot upload correctly requires authentication")
    
    def test_wallet_transactions_unauthorized(self, session):
        """Test GET /api/wallet/transactions without auth - should return 401"""
        response = session.get(f"{BASE_URL}/api/wallet/transactions")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wallet transactions correctly requires authentication")
    
    def test_wallet_transactions_authorized(self, session, auth_headers):
        """Test GET /api/wallet/transactions with auth - returns transaction history"""
        response = session.get(f"{BASE_URL}/api/wallet/transactions", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data, "Response should contain 'transactions'"
        assert isinstance(data["transactions"], list), "transactions should be a list"
        
        print(f"✓ Wallet transactions: {len(data['transactions'])} transactions found")
    
    # ============ TELECONSULT APIs (Auth Required) ============
    
    def test_teleconsult_my_bookings_unauthorized(self, session):
        """Test GET /api/teleconsult/my-bookings without auth - should return 401"""
        response = session.get(f"{BASE_URL}/api/teleconsult/my-bookings")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ My bookings correctly requires authentication")
    
    def test_teleconsult_my_bookings_authorized(self, session, auth_headers):
        """Test GET /api/teleconsult/my-bookings with auth - returns user's bookings"""
        response = session.get(f"{BASE_URL}/api/teleconsult/my-bookings", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "bookings" in data, "Response should contain 'bookings'"
        assert isinstance(data["bookings"], list), "bookings should be a list"
        
        print(f"✓ My teleconsult bookings: {len(data['bookings'])} bookings found")
    
    def test_teleconsult_book_unauthorized(self, session):
        """Test POST /api/teleconsult/book without auth - should return 401"""
        response = session.post(f"{BASE_URL}/api/teleconsult/book", json={
            "doctor_id": "dr-neha-patel",
            "doctor_name": "Dr. Neha Patel",
            "date": "2026-01-20",
            "time": "10:00 AM",
            "patient_name": "Test Patient",
            "patient_phone": "9876543210",
            "reason": "Test booking",
            "fee": 300
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Teleconsult booking correctly requires authentication")
    
    def test_teleconsult_book_insufficient_balance(self, session, auth_headers):
        """Test POST /api/teleconsult/book with insufficient wallet balance - should return 400"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/teleconsult/book",
            headers=auth_headers,
            json={
                "doctor_id": "dr-neha-patel",
                "doctor_name": "Dr. Neha Patel",
                "date": tomorrow,
                "time": "10:00 AM",
                "patient_name": TEST_NAME,
                "patient_phone": TEST_PHONE,
                "reason": "Test booking",
                "fee": 300,
                "payment_method": "wallet"
            }
        )
        
        # Should fail due to insufficient balance (new user has 0 balance)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "insufficient" in response.text.lower() or "balance" in response.text.lower(), \
            "Error should mention insufficient balance"
        
        print("✓ Teleconsult booking correctly rejects insufficient wallet balance")
    
    def test_teleconsult_book_invalid_doctor(self, session, auth_headers):
        """Test POST /api/teleconsult/book with invalid doctor - should return 400"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/teleconsult/book",
            headers=auth_headers,
            json={
                "doctor_id": "dr-invalid-doctor",
                "doctor_name": "Dr. Invalid",
                "date": tomorrow,
                "time": "10:00 AM",
                "patient_name": TEST_NAME,
                "patient_phone": TEST_PHONE,
                "reason": "Test booking",
                "fee": 300,
                "payment_method": "wallet"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "invalid" in response.text.lower() or "doctor" in response.text.lower(), \
            "Error should mention invalid doctor"
        
        print("✓ Teleconsult booking correctly rejects invalid doctor")
    
    def test_teleconsult_cancel_unauthorized(self, session):
        """Test POST /api/teleconsult/cancel/{id} without auth - should return 401"""
        response = session.post(f"{BASE_URL}/api/teleconsult/cancel/fake-booking-id")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Teleconsult cancel correctly requires authentication")
    
    def test_teleconsult_cancel_not_found(self, session, auth_headers):
        """Test POST /api/teleconsult/cancel/{id} with invalid booking - should return 404"""
        response = session.post(
            f"{BASE_URL}/api/teleconsult/cancel/nonexistent-booking-id",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Teleconsult cancel correctly returns 404 for non-existent booking")


class TestWalletAdminAPIs:
    """Test Wallet Admin APIs"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        """Get admin token"""
        # Admin login with password
        response = session.post(f"{BASE_URL}/api/admin/login", json={
            "password": "nevikacura2026"
        })
        
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip(f"Could not get admin token: {response.text}")
        return None
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get admin authorization headers"""
        if not admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_wallet_admin_pending_unauthorized(self, session):
        """Test GET /api/wallet/admin/pending without admin auth - should return 401"""
        response = session.get(f"{BASE_URL}/api/wallet/admin/pending")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin pending topups correctly requires admin authentication")
    
    def test_wallet_admin_pending_authorized(self, session, admin_headers):
        """Test GET /api/wallet/admin/pending with admin auth - returns pending topups"""
        response = session.get(f"{BASE_URL}/api/wallet/admin/pending", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pending_topups" in data, "Response should contain 'pending_topups'"
        assert isinstance(data["pending_topups"], list), "pending_topups should be a list"
        
        print(f"✓ Admin pending topups: {len(data['pending_topups'])} pending requests")
    
    def test_wallet_admin_all_unauthorized(self, session):
        """Test GET /api/wallet/admin/all without admin auth - should return 401"""
        response = session.get(f"{BASE_URL}/api/wallet/admin/all")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin all wallets correctly requires admin authentication")
    
    def test_wallet_admin_all_authorized(self, session, admin_headers):
        """Test GET /api/wallet/admin/all with admin auth - returns all wallets"""
        response = session.get(f"{BASE_URL}/api/wallet/admin/all", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "wallets" in data, "Response should contain 'wallets'"
        assert "total_users" in data, "Response should contain 'total_users'"
        assert "total_balance" in data, "Response should contain 'total_balance'"
        
        print(f"✓ Admin all wallets: {data['total_users']} users, total balance: ₹{data['total_balance']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
