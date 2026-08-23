"""
Test Gift Card Redemption at Checkout - Iteration 162
Testing: 
- POST /api/gift-cards/purchase - creates gift card
- POST /api/gift-cards/activate/{id} - activates card
- GET /api/gift-cards/check/{code} - returns status and balance
- POST /api/gift-cards/use - deducts amount and returns remaining balance
- Error cases: amount > balance, non-existent code
"""
import pytest
import requests
import os
import random
import string
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGiftCardRedemption:
    """Gift card purchase, activation, check, and use flow tests"""
    
    @pytest.fixture(scope="class")
    def created_gift_card(self):
        """Create a gift card and return its details"""
        payload = {
            "buyer_name": "TEST_Buyer",
            "buyer_phone": "9876543210",
            "buyer_email": "testbuyer@example.com",
            "recipient_name": "TEST_Recipient",
            "recipient_phone": "9123456789",
            "amount": 1000,
            "template": "general",
            "personal_message": "Test gift card message",
            "delivery_method": "whatsapp",
            "payment_method": "online"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=payload)
        assert response.status_code == 200, f"Failed to create gift card: {response.text}"
        data = response.json()
        assert data.get("success") is True
        return data.get("gift_card")
    
    def test_purchase_gift_card(self):
        """Test POST /api/gift-cards/purchase creates a gift card"""
        payload = {
            "buyer_name": "TEST_PurchaseTest",
            "buyer_phone": "9876543210",
            "buyer_email": "purchase@test.com",
            "recipient_name": "TEST_RecipientPurchase",
            "recipient_phone": "9123456789",
            "amount": 500,
            "template": "birthday",
            "personal_message": "Happy Birthday!",
            "delivery_method": "email",
            "payment_method": "online"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=payload)
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert data.get("success") is True
        gift_card = data.get("gift_card")
        assert gift_card is not None
        assert "id" in gift_card
        assert "code" in gift_card
        assert gift_card["code"].startswith("NC"), "Code should start with NC prefix"
        assert len(gift_card["code"]) == 12, "Code should be 12 chars (NC + 10 alphanumeric)"
        assert gift_card["amount"] == 500
        assert gift_card["balance"] == 500
        assert gift_card["status"] == "inactive"
        assert gift_card["payment_status"] == "pending"
        assert gift_card["buyer_name"] == "TEST_PurchaseTest"
        assert gift_card["recipient_name"] == "TEST_RecipientPurchase"
        assert "expires_at" in gift_card
        
    def test_check_gift_card_before_activation(self, created_gift_card):
        """Test GET /api/gift-cards/check/{code} before activation - status should be inactive"""
        code = created_gift_card["code"]
        response = requests.get(f"{BASE_URL}/api/gift-cards/check/{code}")
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert data["code"] == code
        assert data["status"] == "inactive", "Card should be inactive before activation"
        assert data["balance"] == 1000
        assert data["amount"] == 1000

    def test_activate_gift_card(self, created_gift_card):
        """Test POST /api/gift-cards/activate/{id} activates the card"""
        card_id = created_gift_card["id"]
        response = requests.post(f"{BASE_URL}/api/gift-cards/activate/{card_id}")
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert data.get("success") is True
        assert data.get("message") == "Gift card activated"
        assert data.get("code") == created_gift_card["code"]

    def test_check_gift_card_after_activation(self, created_gift_card):
        """Test GET /api/gift-cards/check/{code} returns status='active' and balance after activation"""
        # First activate the card
        card_id = created_gift_card["id"]
        requests.post(f"{BASE_URL}/api/gift-cards/activate/{card_id}")
        
        # Now check
        code = created_gift_card["code"]
        response = requests.get(f"{BASE_URL}/api/gift-cards/check/{code}")
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert data["code"] == code
        assert data["status"] == "active", "Card should be active after activation"
        assert data["balance"] == 1000
        
    def test_use_gift_card_partial_redemption(self, created_gift_card):
        """Test POST /api/gift-cards/use correctly deducts amount and returns remaining balance"""
        # First activate the card
        card_id = created_gift_card["id"]
        requests.post(f"{BASE_URL}/api/gift-cards/activate/{card_id}")
        
        code = created_gift_card["code"]
        payload = {
            "code": code,
            "amount": 300,
            "service": "pharmacy",
            "order_id": "TEST_ORDER_001"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/use", json=payload)
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert data.get("success") is True
        assert data["amount_used"] == 300
        assert data["remaining_balance"] == 700, "Balance should be 1000 - 300 = 700"
        assert "transaction_id" in data
        
        # Verify with GET
        check_response = requests.get(f"{BASE_URL}/api/gift-cards/check/{code}")
        assert check_response.status_code == 200
        check_data = check_response.json()
        assert check_data["balance"] == 700
        assert check_data["status"] == "active", "Card should still be active with remaining balance"
        
    def test_use_gift_card_full_redemption(self):
        """Test POST /api/gift-cards/use - full redemption changes status to 'used'"""
        # Create a new card for this test
        create_payload = {
            "buyer_name": "TEST_FullRedemption",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_RecipientFull",
            "recipient_phone": "9123456789",
            "amount": 200,
            "template": "general"
        }
        create_resp = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=create_payload)
        assert create_resp.status_code == 200
        gift_card = create_resp.json()["gift_card"]
        
        # Activate
        requests.post(f"{BASE_URL}/api/gift-cards/activate/{gift_card['id']}")
        
        # Use full balance
        use_payload = {
            "code": gift_card["code"],
            "amount": 200,
            "service": "lab_test",
            "order_id": "TEST_ORDER_FULL"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/use", json=use_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["remaining_balance"] == 0
        
        # Verify status is 'used'
        check_response = requests.get(f"{BASE_URL}/api/gift-cards/check/{gift_card['code']}")
        check_data = check_response.json()
        assert check_data["balance"] == 0
        assert check_data["status"] == "used", "Card status should be 'used' when balance is 0"

    def test_use_gift_card_amount_exceeds_balance(self):
        """Test POST /api/gift-cards/use with amount > balance returns error"""
        # Create a new card
        create_payload = {
            "buyer_name": "TEST_ExceedBalance",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_RecipientExceed",
            "recipient_phone": "9123456789",
            "amount": 100,
            "template": "general"
        }
        create_resp = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=create_payload)
        assert create_resp.status_code == 200
        gift_card = create_resp.json()["gift_card"]
        
        # Activate
        requests.post(f"{BASE_URL}/api/gift-cards/activate/{gift_card['id']}")
        
        # Try to use more than balance
        use_payload = {
            "code": gift_card["code"],
            "amount": 150,  # More than 100 balance
            "service": "pharmacy",
            "order_id": "TEST_ORDER_EXCEED"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/use", json=use_payload)
        
        # Should return 400 error
        assert response.status_code == 400, "Should return 400 when amount exceeds balance"
        data = response.json()
        assert "detail" in data
        assert "Insufficient balance" in data["detail"]

    def test_check_nonexistent_gift_card(self):
        """Test GET /api/gift-cards/check/{code} for non-existent code returns 404"""
        fake_code = "NCFAKECODE99"
        response = requests.get(f"{BASE_URL}/api/gift-cards/check/{fake_code}")
        
        assert response.status_code == 404, "Should return 404 for non-existent code"
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_use_inactive_gift_card(self):
        """Test POST /api/gift-cards/use with inactive card returns error"""
        # Create a card but don't activate it
        create_payload = {
            "buyer_name": "TEST_InactiveUse",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_RecipientInactive",
            "recipient_phone": "9123456789",
            "amount": 100,
            "template": "general"
        }
        create_resp = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=create_payload)
        assert create_resp.status_code == 200
        gift_card = create_resp.json()["gift_card"]
        
        # Try to use without activating
        use_payload = {
            "code": gift_card["code"],
            "amount": 50,
            "service": "pharmacy",
            "order_id": "TEST_ORDER_INACTIVE"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/use", json=use_payload)
        
        # Should return 400 error
        assert response.status_code == 400, "Should return 400 for inactive card"
        data = response.json()
        assert "detail" in data
        assert "inactive" in data["detail"].lower() or "invalid" in data["detail"].lower()

    def test_gift_card_templates_endpoint(self):
        """Test GET /api/gift-cards/templates returns all templates"""
        response = requests.get(f"{BASE_URL}/api/gift-cards/templates")
        
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        
        # Should have 8 templates as per code
        assert len(templates) >= 8
        assert "mothers_day" in templates
        assert "birthday" in templates
        assert "general" in templates
        assert "corporate" in templates

    def test_gift_card_stats_endpoint(self):
        """Test GET /api/gift-cards/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/gift-cards/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "active" in data
        assert "used" in data
        assert "pending" in data
        assert isinstance(data["total"], int)

    def test_purchase_gift_card_min_amount_validation(self):
        """Test purchase with amount < 100 returns error"""
        payload = {
            "buyer_name": "TEST_MinAmount",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_RecipientMin",
            "recipient_phone": "9123456789",
            "amount": 50,  # Less than 100 minimum
            "template": "general"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=payload)
        
        assert response.status_code == 400, "Should return 400 for amount < 100"
        data = response.json()
        assert "detail" in data
        assert "100" in data["detail"]

    def test_purchase_gift_card_max_amount_validation(self):
        """Test purchase with amount > 50000 returns error"""
        payload = {
            "buyer_name": "TEST_MaxAmount",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_RecipientMax",
            "recipient_phone": "9123456789",
            "amount": 60000,  # More than 50000 max
            "template": "general"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=payload)
        
        assert response.status_code == 400, "Should return 400 for amount > 50000"
        data = response.json()
        assert "detail" in data
        assert "50,000" in data["detail"] or "50000" in data["detail"]


class TestGiftCardCodeFormat:
    """Test gift card code generation format"""
    
    def test_multiple_codes_unique(self):
        """Verify multiple gift cards have unique codes"""
        codes = []
        for i in range(3):
            payload = {
                "buyer_name": f"TEST_Unique{i}",
                "buyer_phone": "9876543210",
                "recipient_name": f"TEST_RecipientUnique{i}",
                "recipient_phone": "9123456789",
                "amount": 100,
                "template": "general"
            }
            response = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=payload)
            assert response.status_code == 200
            codes.append(response.json()["gift_card"]["code"])
        
        # All codes should be unique
        assert len(codes) == len(set(codes)), "All gift card codes should be unique"
        
        # All codes should follow format NC + 10 alphanumeric
        for code in codes:
            assert code.startswith("NC")
            assert len(code) == 12
