"""
Test Suite: Cura Wallet + CuraX Coins System
Tests wallet balance, add money, coin earning, coin redemption, and referral endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')

# Test phone number
TEST_PHONE = "9876543210"
NEW_TEST_PHONE = f"TEST_{uuid.uuid4().hex[:8]}"  # For referral tests


class TestWalletEndpoints:
    """Cura Wallet API Tests"""
    
    def test_get_wallet_creates_if_not_exists(self):
        """GET /api/wallet/{phone} should create wallet if not exists"""
        response = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "wallet" in data, "Response should contain wallet"
        wallet = data["wallet"]
        
        # Verify wallet structure
        assert "phone" in wallet, "Wallet should have phone"
        assert "balance" in wallet, "Wallet should have balance"
        assert "coins" in wallet, "Wallet should have coins"
        assert "referral_code" in wallet, "Wallet should have referral_code"
        assert "tier" in wallet, "Wallet should have tier"
        assert "total_earned_coins" in wallet, "Wallet should have total_earned_coins"
        
        # Verify phone is cleaned
        assert len(wallet["phone"]) == 10, "Phone should be 10 digits"
        print(f"✓ Wallet exists: balance=₹{wallet['balance']}, coins={wallet['coins']}, tier={wallet['tier']}")
    
    def test_add_money_to_wallet(self):
        """POST /api/wallet/add-money should add money to wallet"""
        # Get initial balance
        initial = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        initial_balance = initial["balance"]
        
        # Add money
        add_amount = 100
        response = requests.post(
            f"{BASE_URL}/api/wallet/add-money",
            json={"phone": TEST_PHONE, "amount": add_amount, "source": "self"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Should return success=true"
        assert "wallet" in data, "Response should contain updated wallet"
        assert "transaction" in data, "Response should contain transaction"
        
        # Verify balance increased
        new_balance = data["wallet"]["balance"]
        assert new_balance == initial_balance + add_amount, f"Balance should be {initial_balance + add_amount}, got {new_balance}"
        
        # Verify transaction
        txn = data["transaction"]
        assert txn["type"] == "credit", "Transaction type should be credit"
        assert txn["amount"] == add_amount, "Transaction amount should match"
        assert txn["source"] == "self", "Transaction source should be self"
        print(f"✓ Added ₹{add_amount}: new balance=₹{new_balance}")
    
    def test_add_money_negative_amount_fails(self):
        """POST /api/wallet/add-money with negative amount should fail"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/add-money",
            json={"phone": TEST_PHONE, "amount": -50, "source": "self"}
        )
        assert response.status_code == 400, f"Expected 400 for negative amount, got {response.status_code}"
        print("✓ Negative amount correctly rejected")
    
    def test_add_money_zero_amount_fails(self):
        """POST /api/wallet/add-money with zero amount should fail"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/add-money",
            json={"phone": TEST_PHONE, "amount": 0, "source": "self"}
        )
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
        print("✓ Zero amount correctly rejected")
    
    def test_get_wallet_transactions(self):
        """GET /api/wallet/transactions/{phone} should return transaction history"""
        response = requests.get(f"{BASE_URL}/api/wallet/transactions/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data, "Response should contain transactions"
        
        transactions = data["transactions"]
        assert isinstance(transactions, list), "Transactions should be a list"
        
        if len(transactions) > 0:
            txn = transactions[0]
            assert "id" in txn, "Transaction should have id"
            assert "type" in txn, "Transaction should have type"
            assert "amount" in txn, "Transaction should have amount"
            assert "created_at" in txn, "Transaction should have created_at"
        
        print(f"✓ Found {len(transactions)} wallet transactions")


class TestCuraXCoinsEndpoints:
    """CuraX Coins API Tests"""
    
    def test_earn_coins_with_action(self):
        """POST /api/coins/earn should award coins based on action"""
        # Get initial coins
        initial = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        initial_coins = initial["coins"]
        
        # Earn coins for consultation
        response = requests.post(
            f"{BASE_URL}/api/coins/earn",
            json={"phone": TEST_PHONE, "coins": 0, "action": "consultation"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Should return success=true"
        assert "coins_earned" in data, "Response should contain coins_earned"
        assert "wallet" in data, "Response should contain updated wallet"
        assert "transaction" in data, "Response should contain transaction"
        
        # Verify coins earned (consultation = 20 coins for 'none' tier)
        coins_earned = data["coins_earned"]
        assert coins_earned >= 20, f"Should earn at least 20 coins for consultation, got {coins_earned}"
        
        # Verify wallet updated
        new_coins = data["wallet"]["coins"]
        assert new_coins == initial_coins + coins_earned, f"Coins should be {initial_coins + coins_earned}, got {new_coins}"
        
        # Verify transaction
        txn = data["transaction"]
        assert txn["type"] == "earned", "Transaction type should be earned"
        assert txn["action"] == "consultation", "Transaction action should be consultation"
        print(f"✓ Earned {coins_earned} coins for consultation")
    
    def test_earn_coins_with_custom_amount(self):
        """POST /api/coins/earn should award custom coins if provided"""
        response = requests.post(
            f"{BASE_URL}/api/coins/earn",
            json={"phone": TEST_PHONE, "coins": 50, "action": "custom_bonus"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["coins_earned"] >= 50, f"Should earn at least 50 coins, got {data['coins_earned']}"
        print(f"✓ Earned custom {data['coins_earned']} coins")
    
    def test_redeem_coins_minimum_100(self):
        """POST /api/coins/redeem with <100 coins should fail"""
        response = requests.post(
            f"{BASE_URL}/api/coins/redeem",
            json={"phone": TEST_PHONE, "coins": 50}
        )
        assert response.status_code == 400, f"Expected 400 for <100 coins, got {response.status_code}"
        
        detail = response.json().get("detail", "")
        assert "100" in detail or "minimum" in detail.lower(), "Error should mention minimum 100 coins"
        print("✓ Redeem <100 coins correctly rejected")
    
    def test_redeem_coins_insufficient_balance(self):
        """POST /api/coins/redeem with more coins than balance should fail"""
        # Get current coins
        wallet = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        current_coins = wallet["coins"]
        
        # Try to redeem more than available
        response = requests.post(
            f"{BASE_URL}/api/coins/redeem",
            json={"phone": TEST_PHONE, "coins": current_coins + 1000}
        )
        assert response.status_code == 400, f"Expected 400 for insufficient coins, got {response.status_code}"
        print("✓ Redeem insufficient coins correctly rejected")
    
    def test_redeem_coins_success(self):
        """POST /api/coins/redeem should convert coins to wallet balance"""
        # Ensure we have enough coins
        requests.post(
            f"{BASE_URL}/api/coins/earn",
            json={"phone": TEST_PHONE, "coins": 150, "action": "test_earn"}
        )
        
        # Get state before redeem
        before = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        before_coins = before["coins"]
        before_balance = before["balance"]
        
        # Redeem 100 coins
        redeem_amount = 100
        response = requests.post(
            f"{BASE_URL}/api/coins/redeem",
            json={"phone": TEST_PHONE, "coins": redeem_amount}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Should return success=true"
        
        # Verify coins decreased and balance increased
        after = data["wallet"]
        assert after["coins"] == before_coins - redeem_amount, "Coins should decrease by redeem amount"
        assert after["balance"] == before_balance + redeem_amount, "Balance should increase by redeem amount (1:1 ratio)"
        
        # Verify transaction
        txn = data["transaction"]
        assert txn["type"] == "redeemed", "Transaction type should be redeemed"
        assert txn["coins"] == redeem_amount, "Transaction coins should match"
        assert txn["rupee_value"] == redeem_amount, "Rupee value should equal coins (1:1)"
        print(f"✓ Redeemed {redeem_amount} coins → ₹{redeem_amount}")
    
    def test_get_coin_transactions(self):
        """GET /api/coins/transactions/{phone} should return coin history"""
        response = requests.get(f"{BASE_URL}/api/coins/transactions/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data, "Response should contain transactions"
        
        transactions = data["transactions"]
        assert isinstance(transactions, list), "Transactions should be a list"
        
        if len(transactions) > 0:
            txn = transactions[0]
            assert "id" in txn, "Transaction should have id"
            assert "type" in txn, "Transaction should have type (earned/redeemed)"
            assert "coins" in txn, "Transaction should have coins"
        
        print(f"✓ Found {len(transactions)} coin transactions")
    
    def test_get_coin_rules(self):
        """GET /api/coins/rules should return earning rules and tier multipliers"""
        response = requests.get(f"{BASE_URL}/api/coins/rules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify earning rules
        assert "earning_rules" in data, "Response should contain earning_rules"
        rules = data["earning_rules"]
        assert "consultation" in rules, "Should have consultation rule"
        assert "lab_test" in rules, "Should have lab_test rule"
        assert "pharmacy" in rules, "Should have pharmacy rule"
        assert "referral" in rules, "Should have referral rule"
        
        # Verify tier multipliers
        assert "tier_multipliers" in data, "Response should contain tier_multipliers"
        tiers = data["tier_multipliers"]
        assert "none" in tiers, "Should have none tier"
        assert "silver" in tiers, "Should have silver tier"
        assert "gold" in tiers, "Should have gold tier"
        assert "platinum" in tiers, "Should have platinum tier"
        
        # Verify conversion rate
        assert "conversion" in data, "Should have conversion info"
        assert "min_redemption" in data, "Should have min_redemption"
        
        print(f"✓ Coin rules: {len(rules)} actions, {len(tiers)} tiers, min redeem={data['min_redemption']}")


class TestReferralEndpoints:
    """Referral System API Tests"""
    
    def test_get_referral_code(self):
        """GET /api/referral/{phone} should return referral code"""
        response = requests.get(f"{BASE_URL}/api/referral/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "referral_code" in data, "Response should contain referral_code"
        assert "referrals_count" in data, "Response should contain referrals_count"
        
        code = data["referral_code"]
        assert code.startswith("CURA"), "Referral code should start with CURA"
        assert len(code) >= 8, "Referral code should be at least 8 chars"
        
        print(f"✓ Referral code: {code}, referrals: {data['referrals_count']}")


class TestWalletDataPersistence:
    """Verify data persists correctly"""
    
    def test_wallet_changes_persist(self):
        """Verify wallet changes are persisted to database"""
        # Get initial state
        initial = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        
        # Add money
        add_response = requests.post(
            f"{BASE_URL}/api/wallet/add-money",
            json={"phone": TEST_PHONE, "amount": 10, "source": "test"}
        )
        assert add_response.status_code == 200
        
        # Verify persistence with new GET
        after = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        assert after["balance"] == initial["balance"] + 10, "Balance change should persist"
        
        print("✓ Wallet balance changes persist correctly")
    
    def test_coin_changes_persist(self):
        """Verify coin changes are persisted to database"""
        # Get initial state
        initial = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        
        # Earn coins
        earn_response = requests.post(
            f"{BASE_URL}/api/coins/earn",
            json={"phone": TEST_PHONE, "coins": 25, "action": "test"}
        )
        assert earn_response.status_code == 200
        earned = earn_response.json()["coins_earned"]
        
        # Verify persistence with new GET
        after = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}").json()["wallet"]
        assert after["coins"] == initial["coins"] + earned, "Coin change should persist"
        
        print("✓ Coin changes persist correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
