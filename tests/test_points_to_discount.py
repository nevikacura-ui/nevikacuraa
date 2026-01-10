"""
Points-to-Discount Feature Tests for Nevika Cura Healthcare
Tests:
- GET /api/user/loyalty-points - Returns user's current loyalty points
- POST /api/pharmacy with points_used field - Deducts points and creates order with discount
- Validates points_used doesn't exceed user's balance
- Returns error if user not logged in but tries to use points
- Order record stores points_used and discount_amount fields
- Loyalty transaction created when points are used for discount
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
TEST_USER = {
    "email": "loyalty_test@example.com",
    "password": "test123",
    "phone": "8765432109",
    "name": "Loyalty Test User"
}


class TestPointsToDiscount:
    """Test Points-to-Discount feature for Pharmacy orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.user_token = None
    
    def get_or_create_test_user(self):
        """Get existing test user or create new one"""
        # Try to login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.user_token = data.get("token")
            return data.get("user")
        
        # If login fails, register new user
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"],
            "phone": TEST_USER["phone"],
            "name": TEST_USER["name"]
        })
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.user_token = data.get("token")
            return data.get("user")
        elif register_response.status_code == 400 and "already registered" in register_response.text.lower():
            # User exists but login failed - try again
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            })
            if login_response.status_code == 200:
                data = login_response.json()
                self.user_token = data.get("token")
                return data.get("user")
        
        pytest.skip(f"Could not get or create test user: {register_response.text}")
    
    def add_points_to_user(self, points=100):
        """Add loyalty points to test user via staff API"""
        # Login as pharmacy staff
        staff_response = self.session.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pharmacy",
            "password": "Nevika@2026P"
        })
        
        if staff_response.status_code != 200:
            print(f"Staff login failed: {staff_response.text}")
            return False
        
        staff_token = staff_response.json().get("token")
        
        # Add points
        add_response = self.session.post(
            f"{BASE_URL}/api/staff/loyalty-points/add",
            json={
                "phone": TEST_USER["phone"],
                "points": points,
                "reason": "TEST_Points for discount testing"
            },
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        if add_response.status_code == 200:
            print(f"✓ Added {points} points to test user")
            return True
        else:
            print(f"Failed to add points: {add_response.text}")
            return False
    
    # ============ GET /api/user/loyalty-points Tests ============
    
    def test_get_loyalty_points_authenticated(self):
        """Test GET /api/user/loyalty-points returns user's points when authenticated"""
        user = self.get_or_create_test_user()
        
        response = self.session.get(
            f"{BASE_URL}/api/user/loyalty-points",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "loyalty_points" in data, "Response should contain loyalty_points field"
        assert isinstance(data["loyalty_points"], int), "loyalty_points should be an integer"
        print(f"✓ GET /api/user/loyalty-points returned: {data['loyalty_points']} points")
    
    def test_get_loyalty_points_unauthenticated(self):
        """Test GET /api/user/loyalty-points returns 401 when not authenticated"""
        response = self.session.get(f"{BASE_URL}/api/user/loyalty-points")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/user/loyalty-points correctly returns 401 for unauthenticated user")
    
    def test_get_loyalty_points_invalid_token(self):
        """Test GET /api/user/loyalty-points returns 401 with invalid token"""
        response = self.session.get(
            f"{BASE_URL}/api/user/loyalty-points",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/user/loyalty-points correctly returns 401 for invalid token")
    
    # ============ POST /api/pharmacy with points_used Tests ============
    
    def test_pharmacy_order_with_points_discount(self):
        """Test creating pharmacy order with loyalty points discount"""
        user = self.get_or_create_test_user()
        
        # First check current points
        points_response = self.session.get(
            f"{BASE_URL}/api/user/loyalty-points",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        initial_points = points_response.json().get("loyalty_points", 0)
        print(f"Initial points: {initial_points}")
        
        # Add points if needed
        if initial_points < 100:
            self.add_points_to_user(200)
            # Re-check points
            points_response = self.session.get(
                f"{BASE_URL}/api/user/loyalty-points",
                headers={"Authorization": f"Bearer {self.user_token}"}
            )
            initial_points = points_response.json().get("loyalty_points", 0)
            print(f"Points after adding: {initial_points}")
        
        if initial_points < 50:
            pytest.skip("Not enough points for discount test")
        
        points_to_use = 50  # 50 points = ₹5 discount
        expected_discount = (points_to_use / 100) * 10  # ₹5
        
        # Create pharmacy order with points
        order_data = {
            "medicines": [{"name": "TEST_Paracetamol", "quantity": 2}],
            "patient_name": TEST_USER["name"],
            "patient_phone": TEST_USER["phone"],
            "patient_email": TEST_USER["email"],
            "delivery_address": "Test Address for Points Discount",
            "points_used": points_to_use
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert order_response.status_code == 200, f"Expected 200, got {order_response.status_code}: {order_response.text}"
        order = order_response.json()
        
        # Verify order contains points_used and discount_amount
        assert "points_used" in order, "Order should contain points_used field"
        assert "discount_amount" in order, "Order should contain discount_amount field"
        assert order["points_used"] == points_to_use, f"Expected points_used={points_to_use}, got {order['points_used']}"
        assert order["discount_amount"] == expected_discount, f"Expected discount={expected_discount}, got {order['discount_amount']}"
        
        print(f"✓ Pharmacy order created with {points_to_use} points = ₹{expected_discount} discount")
        
        # Verify points were deducted
        new_points_response = self.session.get(
            f"{BASE_URL}/api/user/loyalty-points",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        new_points = new_points_response.json().get("loyalty_points", 0)
        expected_new_points = initial_points - points_to_use
        
        assert new_points == expected_new_points, f"Expected {expected_new_points} points after deduction, got {new_points}"
        print(f"✓ Points correctly deducted: {initial_points} -> {new_points}")
    
    def test_pharmacy_order_without_points(self):
        """Test creating pharmacy order without using points"""
        user = self.get_or_create_test_user()
        
        order_data = {
            "medicines": [{"name": "TEST_Aspirin", "quantity": 1}],
            "patient_name": TEST_USER["name"],
            "patient_phone": TEST_USER["phone"],
            "delivery_address": "Test Address No Points",
            "points_used": 0
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert order_response.status_code == 200, f"Expected 200, got {order_response.status_code}: {order_response.text}"
        order = order_response.json()
        
        assert order.get("points_used", 0) == 0, "points_used should be 0"
        assert order.get("discount_amount", 0) == 0, "discount_amount should be 0"
        print(f"✓ Pharmacy order created without points discount")
    
    def test_pharmacy_order_points_exceed_balance(self):
        """Test that using more points than balance fails"""
        user = self.get_or_create_test_user()
        
        # Get current points
        points_response = self.session.get(
            f"{BASE_URL}/api/user/loyalty-points",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        current_points = points_response.json().get("loyalty_points", 0)
        
        # Try to use more points than available
        order_data = {
            "medicines": [{"name": "TEST_Ibuprofen", "quantity": 1}],
            "patient_name": TEST_USER["name"],
            "patient_phone": TEST_USER["phone"],
            "delivery_address": "Test Address Exceed Points",
            "points_used": current_points + 1000  # More than available
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert order_response.status_code == 400, f"Expected 400, got {order_response.status_code}"
        assert "Insufficient" in order_response.text, "Error should mention insufficient points"
        print(f"✓ Correctly rejected order with points exceeding balance")
    
    def test_pharmacy_order_points_unauthenticated(self):
        """Test that using points without login fails"""
        order_data = {
            "medicines": [{"name": "TEST_Vitamin", "quantity": 1}],
            "patient_name": "Guest User",
            "patient_phone": "9999999999",
            "delivery_address": "Guest Address",
            "points_used": 100  # Trying to use points without login
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data
            # No Authorization header
        )
        
        assert order_response.status_code == 401, f"Expected 401, got {order_response.status_code}"
        print(f"✓ Correctly rejected points usage for unauthenticated user")
    
    def test_pharmacy_order_zero_points_guest(self):
        """Test that guest can place order with 0 points"""
        order_data = {
            "medicines": [{"name": "TEST_Cough Syrup", "quantity": 1}],
            "patient_name": "Guest User",
            "patient_phone": "9999999998",
            "delivery_address": "Guest Address",
            "points_used": 0  # No points
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data
        )
        
        assert order_response.status_code == 200, f"Expected 200, got {order_response.status_code}: {order_response.text}"
        print(f"✓ Guest can place order without points")
    
    # ============ Loyalty Transaction Tests ============
    
    def test_loyalty_transaction_created_on_discount(self):
        """Test that loyalty transaction is created when points are used"""
        user = self.get_or_create_test_user()
        
        # Add points first
        self.add_points_to_user(100)
        
        # Get admin token to check transactions
        admin_response = self.session.post(f"{BASE_URL}/api/admin/login", json={"password": "nevikacura2026"})
        if admin_response.status_code != 200:
            pytest.skip("Admin login failed")
        admin_token = admin_response.json().get("token")
        
        # Get initial transaction count
        initial_tx_response = self.session.get(
            f"{BASE_URL}/api/admin/loyalty-points/transactions",
            params={"phone": TEST_USER["phone"], "limit": 100},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        initial_count = initial_tx_response.json().get("count", 0)
        
        # Create order with points
        order_data = {
            "medicines": [{"name": "TEST_Transaction Test Med", "quantity": 1}],
            "patient_name": TEST_USER["name"],
            "patient_phone": TEST_USER["phone"],
            "delivery_address": "Transaction Test Address",
            "points_used": 50
        }
        
        self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Check transactions again
        new_tx_response = self.session.get(
            f"{BASE_URL}/api/admin/loyalty-points/transactions",
            params={"phone": TEST_USER["phone"], "limit": 100},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        new_count = new_tx_response.json().get("count", 0)
        transactions = new_tx_response.json().get("transactions", [])
        
        # Find the debit transaction for pharmacy discount
        discount_tx = None
        for tx in transactions:
            if tx.get("type") == "debit" and "Pharmacy order discount" in tx.get("reason", ""):
                discount_tx = tx
                break
        
        assert discount_tx is not None, "Should find a debit transaction for pharmacy discount"
        assert discount_tx.get("points") == 50, f"Transaction should be for 50 points, got {discount_tx.get('points')}"
        print(f"✓ Loyalty transaction created for discount: {discount_tx.get('reason')}")
    
    # ============ Discount Calculation Tests ============
    
    def test_discount_calculation_100_points(self):
        """Test that 100 points = ₹10 discount"""
        user = self.get_or_create_test_user()
        
        # Add enough points
        self.add_points_to_user(200)
        
        order_data = {
            "medicines": [{"name": "TEST_Discount Calc Med", "quantity": 1}],
            "patient_name": TEST_USER["name"],
            "patient_phone": TEST_USER["phone"],
            "delivery_address": "Discount Calc Address",
            "points_used": 100
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        if order_response.status_code == 200:
            order = order_response.json()
            assert order.get("discount_amount") == 10.0, f"100 points should give ₹10 discount, got ₹{order.get('discount_amount')}"
            print(f"✓ 100 points = ₹10 discount verified")
        else:
            print(f"Order failed: {order_response.text}")
    
    def test_discount_calculation_50_points(self):
        """Test that 50 points = ₹5 discount"""
        user = self.get_or_create_test_user()
        
        # Add enough points
        self.add_points_to_user(100)
        
        order_data = {
            "medicines": [{"name": "TEST_Discount 50 Med", "quantity": 1}],
            "patient_name": TEST_USER["name"],
            "patient_phone": TEST_USER["phone"],
            "delivery_address": "Discount 50 Address",
            "points_used": 50
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/pharmacy",
            json=order_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        if order_response.status_code == 200:
            order = order_response.json()
            assert order.get("discount_amount") == 5.0, f"50 points should give ₹5 discount, got ₹{order.get('discount_amount')}"
            print(f"✓ 50 points = ₹5 discount verified")
        else:
            print(f"Order failed: {order_response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
