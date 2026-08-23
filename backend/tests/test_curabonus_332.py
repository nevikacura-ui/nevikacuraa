"""
CuraBonus Gamified Loyalty System Tests - Iteration 332
Tests for: earn, redeem, claim-reward, profile, steps, history endpoints
Orange Pharmacy only (excludes Orange Generics)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test phone number with existing profile
TEST_PHONE = "9876543210"
# New phone for fresh profile tests
NEW_TEST_PHONE = f"TEST_{uuid.uuid4().hex[:8]}"


class TestCuraBonusStepsConfig:
    """Test /api/curabonus/steps endpoint - returns 8-step configuration"""
    
    def test_get_steps_config(self):
        """GET /api/curabonus/steps returns 8 steps with tiers and coin info"""
        response = requests.get(f"{BASE_URL}/api/curabonus/steps")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "steps" in data, "Response should contain 'steps'"
        assert "tiers" in data, "Response should contain 'tiers'"
        assert "coin_value" in data, "Response should contain 'coin_value'"
        assert "min_redeem" in data, "Response should contain 'min_redeem'"
        
        # Verify 8 steps
        steps = data["steps"]
        assert len(steps) == 8, f"Expected 8 steps, got {len(steps)}"
        
        # Verify step structure
        for step in steps:
            assert "step" in step
            assert "orders_required" in step
            assert "spend_required" in step
            assert "reward" in step
            assert "reward_type" in step
            assert "reward_value" in step
            assert "icon" in step
        
        # Verify tiers
        tiers = data["tiers"]
        assert "bronze" in tiers
        assert "silver" in tiers
        assert "gold" in tiers
        
        # Verify coin value and min redeem
        assert data["coin_value"] == 1.0, "1 coin = ₹1"
        assert data["min_redeem"] == 50, "Minimum 50 coins to redeem"
        
        print(f"✓ Steps config: 8 steps, 3 tiers, coin_value={data['coin_value']}, min_redeem={data['min_redeem']}")


class TestCuraBonusProfile:
    """Test /api/curabonus/profile endpoint"""
    
    def test_get_profile_existing_user(self):
        """GET /api/curabonus/profile?phone=9876543210 returns profile with steps"""
        response = requests.get(f"{BASE_URL}/api/curabonus/profile?phone={TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["phone"] == TEST_PHONE
        assert "coins" in data
        assert "total_orders" in data
        assert "total_spent" in data
        assert "current_step" in data
        assert "tier" in data
        assert "tier_info" in data
        assert "steps" in data
        assert "coin_value" in data
        assert "min_redeem" in data
        
        # Verify steps detail
        steps = data["steps"]
        assert len(steps) == 8, f"Expected 8 steps in profile, got {len(steps)}"
        for step in steps:
            assert "unlocked" in step
            assert "claimed" in step
            assert "claimable" in step
        
        print(f"✓ Profile for {TEST_PHONE}: coins={data['coins']}, tier={data['tier']}, step={data['current_step']}")
    
    def test_get_profile_new_user_creates_profile(self):
        """GET /api/curabonus/profile for new phone creates fresh profile"""
        new_phone = f"TEST{uuid.uuid4().hex[:6]}"
        response = requests.get(f"{BASE_URL}/api/curabonus/profile?phone={new_phone}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["phone"] == new_phone
        assert data["coins"] == 0, "New user should have 0 coins"
        assert data["total_orders"] == 0, "New user should have 0 orders"
        assert data["total_spent"] == 0, "New user should have 0 spent"
        assert data["current_step"] == 0, "New user should be at step 0"
        assert data["tier"] == "bronze", "New user should be bronze tier"
        
        print(f"✓ New profile created for {new_phone}: coins=0, tier=bronze")


class TestCuraBonusEarn:
    """Test /api/curabonus/earn endpoint - award coins after delivery"""
    
    def test_earn_coins_orange_pharmacy(self):
        """POST /api/curabonus/earn awards coins for orange_pharmacy source"""
        order_id = f"TEST_ORDER_{uuid.uuid4().hex[:8]}"
        payload = {
            "phone": TEST_PHONE,
            "order_id": order_id,
            "amount": 500,  # Should earn 5 coins (1 per ₹100)
            "source": "orange_pharmacy"
        }
        
        response = requests.post(f"{BASE_URL}/api/curabonus/earn", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "coins_awarded"
        assert data["coins_earned"] >= 5, f"Expected at least 5 coins for ₹500, got {data['coins_earned']}"
        assert "new_balance" in data
        assert "new_step" in data
        assert "tier" in data
        
        print(f"✓ Earned {data['coins_earned']} coins for ₹500 order, new_balance={data['new_balance']}")
    
    def test_earn_coins_rejects_orange_generics(self):
        """POST /api/curabonus/earn rejects orange_generics source with 400"""
        order_id = f"TEST_ORDER_{uuid.uuid4().hex[:8]}"
        payload = {
            "phone": TEST_PHONE,
            "order_id": order_id,
            "amount": 500,
            "source": "orange_generics"  # Should be rejected
        }
        
        response = requests.post(f"{BASE_URL}/api/curabonus/earn", json=payload)
        assert response.status_code == 400, f"Expected 400 for orange_generics, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "orange generics" in data["detail"].lower() or "not available" in data["detail"].lower()
        
        print(f"✓ Correctly rejected orange_generics: {data['detail']}")
    
    def test_earn_coins_prevents_double_earn(self):
        """POST /api/curabonus/earn prevents double-earning for same order_id"""
        order_id = f"TEST_DOUBLE_{uuid.uuid4().hex[:8]}"
        payload = {
            "phone": TEST_PHONE,
            "order_id": order_id,
            "amount": 200,
            "source": "orange_pharmacy"
        }
        
        # First earn
        response1 = requests.post(f"{BASE_URL}/api/curabonus/earn", json=payload)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["status"] == "coins_awarded"
        
        # Second earn with same order_id
        response2 = requests.post(f"{BASE_URL}/api/curabonus/earn", json=payload)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["status"] == "already_awarded", f"Expected 'already_awarded', got {data2['status']}"
        assert data2["coins_earned"] == 0, "Should not earn coins on duplicate"
        
        print(f"✓ Double-earn prevented: first={data1['coins_earned']} coins, second=0 (already_awarded)")
    
    def test_earn_coins_rejects_zero_amount(self):
        """POST /api/curabonus/earn rejects zero or negative amount"""
        order_id = f"TEST_ZERO_{uuid.uuid4().hex[:8]}"
        payload = {
            "phone": TEST_PHONE,
            "order_id": order_id,
            "amount": 0,
            "source": "orange_pharmacy"
        }
        
        response = requests.post(f"{BASE_URL}/api/curabonus/earn", json=payload)
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
        
        print("✓ Correctly rejected zero amount order")


class TestCuraBonusClaimReward:
    """Test /api/curabonus/claim-reward endpoint"""
    
    def test_claim_reward_invalid_step(self):
        """POST /api/curabonus/claim-reward rejects invalid step numbers"""
        payload = {
            "phone": TEST_PHONE,
            "step": 0  # Invalid - steps are 1-8
        }
        
        response = requests.post(f"{BASE_URL}/api/curabonus/claim-reward", json=payload)
        assert response.status_code == 400, f"Expected 400 for step 0, got {response.status_code}"
        
        # Also test step 9
        payload["step"] = 9
        response = requests.post(f"{BASE_URL}/api/curabonus/claim-reward", json=payload)
        assert response.status_code == 400, f"Expected 400 for step 9, got {response.status_code}"
        
        print("✓ Correctly rejected invalid step numbers (0 and 9)")
    
    def test_claim_reward_not_unlocked(self):
        """POST /api/curabonus/claim-reward rejects claim for unlocked step"""
        # Create a fresh user with no orders
        fresh_phone = f"FRESH{uuid.uuid4().hex[:6]}"
        
        # First get profile to create user
        requests.get(f"{BASE_URL}/api/curabonus/profile?phone={fresh_phone}")
        
        # Try to claim step 2 (requires 3 orders)
        payload = {
            "phone": fresh_phone,
            "step": 2
        }
        
        response = requests.post(f"{BASE_URL}/api/curabonus/claim-reward", json=payload)
        assert response.status_code == 400, f"Expected 400 for unlocked step, got {response.status_code}"
        
        data = response.json()
        assert "not yet unlocked" in data["detail"].lower() or "not unlocked" in data["detail"].lower()
        
        print(f"✓ Correctly rejected claim for unlocked step: {data['detail']}")


class TestCuraBonusRedeem:
    """Test /api/curabonus/redeem endpoint"""
    
    def test_redeem_coins_minimum_check(self):
        """POST /api/curabonus/redeem requires minimum 50 coins"""
        payload = {
            "phone": TEST_PHONE,
            "coins": 10  # Below minimum
        }
        
        response = requests.post(f"{BASE_URL}/api/curabonus/redeem", json=payload)
        assert response.status_code == 400, f"Expected 400 for below minimum, got {response.status_code}"
        
        data = response.json()
        assert "50" in data["detail"] or "minimum" in data["detail"].lower()
        
        print(f"✓ Correctly rejected redeem below minimum: {data['detail']}")
    
    def test_redeem_coins_insufficient_balance(self):
        """POST /api/curabonus/redeem rejects if insufficient coins"""
        # Create fresh user with 0 coins
        fresh_phone = f"REDEEM{uuid.uuid4().hex[:6]}"
        requests.get(f"{BASE_URL}/api/curabonus/profile?phone={fresh_phone}")
        
        payload = {
            "phone": fresh_phone,
            "coins": 100  # User has 0 coins
        }
        
        response = requests.post(f"{BASE_URL}/api/curabonus/redeem", json=payload)
        assert response.status_code == 400, f"Expected 400 for insufficient coins, got {response.status_code}"
        
        data = response.json()
        assert "insufficient" in data["detail"].lower()
        
        print(f"✓ Correctly rejected insufficient coins: {data['detail']}")


class TestCuraBonusHistory:
    """Test /api/curabonus/history endpoint"""
    
    def test_get_history(self):
        """GET /api/curabonus/history?phone=... returns transaction history"""
        response = requests.get(f"{BASE_URL}/api/curabonus/history?phone={TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data
        
        # Transactions should be a list
        txns = data["transactions"]
        assert isinstance(txns, list)
        
        if len(txns) > 0:
            # Verify transaction structure
            txn = txns[0]
            assert "type" in txn  # earn, redeem, bonus
            assert "coins" in txn
            assert "created_at" in txn
            print(f"✓ History for {TEST_PHONE}: {len(txns)} transactions, latest type={txn['type']}")
        else:
            print(f"✓ History for {TEST_PHONE}: 0 transactions (empty)")


class TestCuraBonusIntegration:
    """Integration tests for full CuraBonus flow"""
    
    def test_full_earn_and_profile_update(self):
        """Full flow: earn coins → verify profile updated"""
        # Create fresh user
        test_phone = f"FLOW{uuid.uuid4().hex[:6]}"
        
        # Get initial profile
        profile_res = requests.get(f"{BASE_URL}/api/curabonus/profile?phone={test_phone}")
        assert profile_res.status_code == 200
        initial = profile_res.json()
        initial_coins = initial["coins"]
        initial_orders = initial["total_orders"]
        
        # Earn coins
        order_id = f"FLOW_ORDER_{uuid.uuid4().hex[:8]}"
        earn_res = requests.post(f"{BASE_URL}/api/curabonus/earn", json={
            "phone": test_phone,
            "order_id": order_id,
            "amount": 300,
            "source": "orange_pharmacy"
        })
        assert earn_res.status_code == 200
        earned = earn_res.json()
        
        # Verify profile updated
        profile_res2 = requests.get(f"{BASE_URL}/api/curabonus/profile?phone={test_phone}")
        assert profile_res2.status_code == 200
        updated = profile_res2.json()
        
        assert updated["coins"] == initial_coins + earned["coins_earned"]
        assert updated["total_orders"] == initial_orders + 1
        assert updated["total_spent"] >= 300
        
        print(f"✓ Full flow: earned {earned['coins_earned']} coins, orders {initial_orders}→{updated['total_orders']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
