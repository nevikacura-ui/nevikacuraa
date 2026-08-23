"""
Backend tests for Wallet Gift Cash feature - iteration 142
Tests admin gift cash endpoints:
- POST /api/wallet/admin/gift-cash
- GET /api/wallet/admin/gift-cash/history
- GET /api/wallet/admin/search-user
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/staff/login", json={
        "username": "admin",
        "password": "test1234"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAdminGiftCash:
    """Test admin gift cash endpoints"""
    
    def test_admin_login_returns_token(self):
        """Test admin can login and get token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["staff"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_gift_cash_endpoint_requires_auth(self):
        """Test gift cash endpoint requires admin auth"""
        response = requests.post(f"{BASE_URL}/api/wallet/admin/gift-cash", json={
            "user_phone": "9999999999",
            "amount": 100
        })
        assert response.status_code == 401
        print("PASS: Gift cash requires authentication")
    
    def test_gift_cash_to_user(self, admin_headers):
        """Test admin can add gift cash to a user"""
        response = requests.post(f"{BASE_URL}/api/wallet/admin/gift-cash", 
            headers=admin_headers,
            json={
                "user_phone": "9999999999",
                "amount": 50,
                "description": "Test gift cash from testing agent",
                "admin_note": "Automated test"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "new_balance" in data
        assert data["new_balance"] >= 50
        print(f"PASS: Gift cash added. New balance: Rs.{data['new_balance']}")
    
    def test_gift_cash_validation_negative_amount(self, admin_headers):
        """Test gift cash rejects negative amount"""
        response = requests.post(f"{BASE_URL}/api/wallet/admin/gift-cash",
            headers=admin_headers,
            json={
                "user_phone": "9999999999",
                "amount": -100,
                "description": "Invalid negative amount"
            }
        )
        assert response.status_code == 400
        print("PASS: Negative amount rejected")
    
    def test_gift_cash_validation_max_limit(self, admin_headers):
        """Test gift cash rejects amount above max limit"""
        response = requests.post(f"{BASE_URL}/api/wallet/admin/gift-cash",
            headers=admin_headers,
            json={
                "user_phone": "9999999999",
                "amount": 15000,  # Above 10000 limit
                "description": "Exceeds limit"
            }
        )
        assert response.status_code == 400
        print("PASS: Amount above limit rejected")
    
    def test_gift_cash_history_endpoint(self, admin_headers):
        """Test admin can view gift cash history"""
        response = requests.get(f"{BASE_URL}/api/wallet/admin/gift-cash/history",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert isinstance(data["transactions"], list)
        print(f"PASS: Gift cash history returned {len(data['transactions'])} transactions")
    
    def test_search_user_endpoint(self, admin_headers):
        """Test admin can search users for gift cash"""
        response = requests.get(f"{BASE_URL}/api/wallet/admin/search-user?phone=9999999999",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
        print(f"PASS: User search returned {len(data['users'])} result(s)")
    
    def test_search_user_empty_returns_recent(self, admin_headers):
        """Test search with empty phone returns recent wallets"""
        response = requests.get(f"{BASE_URL}/api/wallet/admin/search-user",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"PASS: Empty search returned {len(data['users'])} recent wallet(s)")


class TestWalletUserEndpoints:
    """Test wallet balance and transactions for users"""
    
    def test_wallet_balance_requires_auth(self):
        """Test wallet balance requires user auth"""
        response = requests.get(f"{BASE_URL}/api/wallet/balance")
        assert response.status_code == 401
        print("PASS: Wallet balance requires authentication")
    
    def test_wallet_transactions_requires_auth(self):
        """Test wallet transactions requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet/transactions")
        assert response.status_code == 401
        print("PASS: Wallet transactions requires authentication")


class TestHomePageApis:
    """Test home page loads correctly"""
    
    def test_config_clinics(self):
        """Test clinics config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config/clinics")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Config clinics returned {len(data)} clinics")
    
    def test_config_doctors(self):
        """Test doctors config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config/doctors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Config doctors returned {len(data)} doctors")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
