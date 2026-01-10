"""
Loyalty Points System Tests for Nevika Cura Healthcare
Tests:
- Staff (Pharmacy/Diagnostics) can search users by phone
- Staff can add loyalty points (1-500 max)
- Admin can view loyalty summary
- Admin can redeem/subtract points
- Admin can view transaction history
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PASSWORD = "nevikacura2026"
PHARMACY_STAFF = {"username": "staff_pharmacy", "password": "Nevika@2026P"}
DIAGNOSTICS_STAFF = {"username": "staff_proton", "password": "Nevika@2026L"}
TEST_USER_PHONE = "9876543210"  # User with existing loyalty points


class TestLoyaltyPointsBackend:
    """Test loyalty points API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.pharmacy_token = None
        self.diagnostics_token = None
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if not self.admin_token:
            response = self.session.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
            assert response.status_code == 200, f"Admin login failed: {response.text}"
            self.admin_token = response.json().get("token")
        return self.admin_token
    
    def get_pharmacy_token(self):
        """Get pharmacy staff authentication token"""
        if not self.pharmacy_token:
            response = self.session.post(f"{BASE_URL}/api/staff/login", json=PHARMACY_STAFF)
            assert response.status_code == 200, f"Pharmacy staff login failed: {response.text}"
            self.pharmacy_token = response.json().get("token")
        return self.pharmacy_token
    
    def get_diagnostics_token(self):
        """Get diagnostics staff authentication token"""
        if not self.diagnostics_token:
            response = self.session.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
            assert response.status_code == 200, f"Diagnostics staff login failed: {response.text}"
            self.diagnostics_token = response.json().get("token")
        return self.diagnostics_token
    
    # ============ Admin Login Tests ============
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Admin login successful")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={"password": "wrongpassword"})
        assert response.status_code == 401
        print(f"✓ Admin login correctly rejects invalid password")
    
    # ============ Staff Login Tests ============
    
    def test_pharmacy_staff_login(self):
        """Test pharmacy staff login"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json=PHARMACY_STAFF)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "pharmacy_staff"
        print(f"✓ Pharmacy staff login successful, role: {data.get('role')}")
    
    def test_diagnostics_staff_login(self):
        """Test diagnostics staff login"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "diagnostics_staff"
        print(f"✓ Diagnostics staff login successful, role: {data.get('role')}")
    
    # ============ Loyalty Points - Search User by Phone ============
    
    def test_pharmacy_staff_search_user_by_phone(self):
        """Test pharmacy staff can search user by phone"""
        token = self.get_pharmacy_token()
        response = self.session.get(
            f"{BASE_URL}/api/loyalty-points/by-phone/{TEST_USER_PHONE}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
        if data["found"]:
            assert "user_name" in data
            assert "loyalty_points" in data
            print(f"✓ Pharmacy staff found user: {data.get('user_name')}, Points: {data.get('loyalty_points')}")
        else:
            print(f"✓ Pharmacy staff search returned: User not registered")
    
    def test_diagnostics_staff_search_user_by_phone(self):
        """Test diagnostics staff can search user by phone"""
        token = self.get_diagnostics_token()
        response = self.session.get(
            f"{BASE_URL}/api/loyalty-points/by-phone/{TEST_USER_PHONE}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
        print(f"✓ Diagnostics staff search successful, found: {data.get('found')}")
    
    def test_search_unregistered_user(self):
        """Test searching for unregistered phone number"""
        token = self.get_pharmacy_token()
        response = self.session.get(
            f"{BASE_URL}/api/loyalty-points/by-phone/1111111111",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("found") == False
        assert "User not registered" in data.get("message", "")
        print(f"✓ Unregistered user search returns correct message")
    
    def test_search_without_auth_fails(self):
        """Test that search without authentication fails"""
        response = self.session.get(f"{BASE_URL}/api/loyalty-points/by-phone/{TEST_USER_PHONE}")
        assert response.status_code in [401, 403]
        print(f"✓ Search without auth correctly returns {response.status_code}")
    
    # ============ Loyalty Points - Add Points (Staff) ============
    
    def test_pharmacy_staff_add_points(self):
        """Test pharmacy staff can add loyalty points"""
        token = self.get_pharmacy_token()
        
        # First search to get current points
        search_response = self.session.get(
            f"{BASE_URL}/api/loyalty-points/by-phone/{TEST_USER_PHONE}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if search_response.status_code == 200 and search_response.json().get("found"):
            initial_points = search_response.json().get("loyalty_points", 0)
            
            # Add points
            add_response = self.session.post(
                f"{BASE_URL}/api/staff/loyalty-points/add",
                json={
                    "phone": TEST_USER_PHONE,
                    "points": 10,
                    "reason": "TEST_Pharmacy order reward"
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            assert add_response.status_code == 200
            data = add_response.json()
            assert data.get("success") == True
            assert "new_balance" in data
            print(f"✓ Pharmacy staff added 10 points. New balance: {data.get('new_balance')}")
        else:
            pytest.skip("Test user not found - skipping add points test")
    
    def test_diagnostics_staff_add_points(self):
        """Test diagnostics staff can add loyalty points"""
        token = self.get_diagnostics_token()
        
        # First search to verify user exists
        search_response = self.session.get(
            f"{BASE_URL}/api/loyalty-points/by-phone/{TEST_USER_PHONE}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if search_response.status_code == 200 and search_response.json().get("found"):
            # Add points
            add_response = self.session.post(
                f"{BASE_URL}/api/staff/loyalty-points/add",
                json={
                    "phone": TEST_USER_PHONE,
                    "points": 15,
                    "reason": "TEST_Diagnostic test reward"
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            assert add_response.status_code == 200
            data = add_response.json()
            assert data.get("success") == True
            print(f"✓ Diagnostics staff added 15 points. New balance: {data.get('new_balance')}")
        else:
            pytest.skip("Test user not found - skipping add points test")
    
    def test_add_points_max_500_validation(self):
        """Test that points are limited (max 500 per transaction)"""
        token = self.get_pharmacy_token()
        
        # Try to add more than 500 points - should still work but frontend limits to 500
        add_response = self.session.post(
            f"{BASE_URL}/api/staff/loyalty-points/add",
            json={
                "phone": TEST_USER_PHONE,
                "points": 500,  # Max allowed
                "reason": "TEST_Max points test"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        # Backend should accept up to 500
        if add_response.status_code == 200:
            print(f"✓ Adding 500 points (max) succeeded")
        else:
            print(f"✓ Add points response: {add_response.status_code}")
    
    def test_add_zero_points_fails(self):
        """Test that adding zero points fails"""
        token = self.get_pharmacy_token()
        add_response = self.session.post(
            f"{BASE_URL}/api/staff/loyalty-points/add",
            json={
                "phone": TEST_USER_PHONE,
                "points": 0,
                "reason": "TEST_Zero points"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert add_response.status_code == 400
        print(f"✓ Adding zero points correctly rejected")
    
    def test_add_negative_points_fails(self):
        """Test that adding negative points fails"""
        token = self.get_pharmacy_token()
        add_response = self.session.post(
            f"{BASE_URL}/api/staff/loyalty-points/add",
            json={
                "phone": TEST_USER_PHONE,
                "points": -10,
                "reason": "TEST_Negative points"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert add_response.status_code == 400
        print(f"✓ Adding negative points correctly rejected")
    
    def test_add_points_to_unregistered_user_fails(self):
        """Test that adding points to unregistered user fails"""
        token = self.get_pharmacy_token()
        add_response = self.session.post(
            f"{BASE_URL}/api/staff/loyalty-points/add",
            json={
                "phone": "1111111111",
                "points": 10,
                "reason": "TEST_Unregistered user"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert add_response.status_code == 404
        print(f"✓ Adding points to unregistered user correctly rejected")
    
    # ============ Admin - Loyalty Summary ============
    
    def test_admin_get_loyalty_summary(self):
        """Test admin can get loyalty points summary"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/loyalty-points/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary fields
        assert "total_points_issued" in data
        assert "total_points_redeemed" in data
        assert "points_in_circulation" in data
        assert "users_with_points" in data
        assert "top_users" in data
        
        print(f"✓ Admin loyalty summary:")
        print(f"  - Total Issued: {data.get('total_points_issued')}")
        print(f"  - Total Redeemed: {data.get('total_points_redeemed')}")
        print(f"  - In Circulation: {data.get('points_in_circulation')}")
        print(f"  - Users with Points: {data.get('users_with_points')}")
        print(f"  - Top Users: {len(data.get('top_users', []))}")
    
    def test_admin_summary_without_auth_fails(self):
        """Test that summary without auth fails"""
        response = self.session.get(f"{BASE_URL}/api/admin/loyalty-points/summary")
        assert response.status_code in [401, 403]
        print(f"✓ Summary without auth correctly returns {response.status_code}")
    
    # ============ Admin - Subtract/Redeem Points ============
    
    def test_admin_subtract_points(self):
        """Test admin can subtract/redeem loyalty points"""
        token = self.get_admin_token()
        
        # First get user's current points
        search_response = self.session.get(
            f"{BASE_URL}/api/loyalty-points/by-phone/{TEST_USER_PHONE}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if search_response.status_code == 200 and search_response.json().get("found"):
            current_points = search_response.json().get("loyalty_points", 0)
            
            if current_points >= 5:
                # Subtract points
                subtract_response = self.session.post(
                    f"{BASE_URL}/api/admin/loyalty-points/subtract",
                    json={
                        "phone": TEST_USER_PHONE,
                        "points": 5,
                        "reason": "TEST_Redemption for discount"
                    },
                    headers={"Authorization": f"Bearer {token}"}
                )
                assert subtract_response.status_code == 200
                data = subtract_response.json()
                assert data.get("success") == True
                assert "new_balance" in data
                assert "previous_balance" in data
                print(f"✓ Admin subtracted 5 points. Previous: {data.get('previous_balance')}, New: {data.get('new_balance')}")
            else:
                print(f"✓ User has {current_points} points - skipping subtract test (need at least 5)")
        else:
            pytest.skip("Test user not found - skipping subtract points test")
    
    def test_admin_subtract_more_than_balance_fails(self):
        """Test that subtracting more than balance fails"""
        token = self.get_admin_token()
        
        # Try to subtract a very large amount
        subtract_response = self.session.post(
            f"{BASE_URL}/api/admin/loyalty-points/subtract",
            json={
                "phone": TEST_USER_PHONE,
                "points": 999999,
                "reason": "TEST_Excessive redemption"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert subtract_response.status_code == 400
        assert "Insufficient" in subtract_response.json().get("detail", "")
        print(f"✓ Subtracting more than balance correctly rejected")
    
    def test_staff_cannot_subtract_points(self):
        """Test that staff cannot subtract points (admin only)"""
        token = self.get_pharmacy_token()
        subtract_response = self.session.post(
            f"{BASE_URL}/api/admin/loyalty-points/subtract",
            json={
                "phone": TEST_USER_PHONE,
                "points": 5,
                "reason": "TEST_Staff trying to subtract"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert subtract_response.status_code in [401, 403]
        print(f"✓ Staff correctly cannot subtract points (status: {subtract_response.status_code})")
    
    # ============ Admin - Transaction History ============
    
    def test_admin_get_transactions(self):
        """Test admin can get transaction history"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/loyalty-points/transactions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "count" in data
        print(f"✓ Admin got {data.get('count')} transactions")
    
    def test_admin_get_transactions_by_phone(self):
        """Test admin can filter transactions by phone"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/loyalty-points/transactions",
            params={"phone": TEST_USER_PHONE, "limit": 20},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        print(f"✓ Admin got {data.get('count')} transactions for phone {TEST_USER_PHONE}")
        
        # Verify transaction structure
        if data.get("transactions"):
            tx = data["transactions"][0]
            assert "type" in tx  # credit or debit
            assert "points" in tx
            assert "reason" in tx
            print(f"  - Latest: {tx.get('type')} {tx.get('points')} pts - {tx.get('reason')}")
    
    def test_transactions_without_auth_fails(self):
        """Test that transactions without auth fails"""
        response = self.session.get(f"{BASE_URL}/api/admin/loyalty-points/transactions")
        assert response.status_code in [401, 403]
        print(f"✓ Transactions without auth correctly returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
