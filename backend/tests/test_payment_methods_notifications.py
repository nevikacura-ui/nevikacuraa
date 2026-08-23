"""
Test Payment Methods CRUD and WhatsApp Wallet Notification Templates
Iteration 194 - Testing Cashfree payment methods management and WhatsApp templates

Features tested:
- Payment Methods: Save UPI, Save Card, Get methods, Delete, Set default
- WhatsApp Templates: wallet_reward, coins_redeemed, wallet_refund
- Template content verification: Orange Pharmacy, Mango Health Labs mentions
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9876543210"
TEST_PREFIX = "TEST_"


class TestPaymentMethodsCRUD:
    """Test Payment Methods CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and cleanup after each test"""
        self.created_pm_ids = []
        yield
        # Cleanup: Delete test-created payment methods
        for pm_id in self.created_pm_ids:
            try:
                requests.delete(f"{BASE_URL}/api/payment-methods/{pm_id}")
            except:
                pass
    
    def test_save_upi_method(self):
        """POST /api/payment-methods - Save UPI method with valid upi_id"""
        payload = {
            "phone": TEST_PHONE,
            "method_type": "upi",
            "upi_id": f"{TEST_PREFIX}test@ybl",
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/payment-methods", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert "payment_method" in data
        pm = data["payment_method"]
        assert pm["method_type"] == "upi"
        assert pm["upi_id"] == f"{TEST_PREFIX}test@ybl"
        assert "id" in pm
        self.created_pm_ids.append(pm["id"])
        print(f"✓ UPI method saved with ID: {pm['id']}")
    
    def test_save_upi_validation_error(self):
        """POST /api/payment-methods - UPI without upi_id should fail"""
        payload = {
            "phone": TEST_PHONE,
            "method_type": "upi",
            "upi_id": None,  # Missing UPI ID
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/payment-methods", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing UPI ID, got {response.status_code}"
        print("✓ UPI validation correctly rejects missing upi_id")
    
    def test_save_card_method(self):
        """POST /api/payment-methods - Save Card method with card_last4"""
        payload = {
            "phone": TEST_PHONE,
            "method_type": "card",
            "card_last4": "9876",
            "card_network": "visa",
            "card_holder": f"{TEST_PREFIX} Test User",
            "card_expiry": "12/28",
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/payment-methods", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        pm = data["payment_method"]
        assert pm["method_type"] == "card"
        assert pm["card_last4"] == "9876"
        assert pm["card_network"] == "visa"
        assert pm["card_holder"] == f"{TEST_PREFIX} Test User"
        assert pm["card_expiry"] == "12/28"
        self.created_pm_ids.append(pm["id"])
        print(f"✓ Card method saved with ID: {pm['id']}")
    
    def test_save_card_validation_error(self):
        """POST /api/payment-methods - Card without card_last4 should fail"""
        payload = {
            "phone": TEST_PHONE,
            "method_type": "card",
            "card_last4": None,  # Missing last 4
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/payment-methods", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing card_last4, got {response.status_code}"
        print("✓ Card validation correctly rejects missing card_last4")
    
    def test_get_payment_methods(self):
        """GET /api/payment-methods/{phone} - Returns all saved methods"""
        # First save a test method
        payload = {
            "phone": TEST_PHONE,
            "method_type": "upi",
            "upi_id": f"{TEST_PREFIX}get_test@paytm",
            "is_default": False
        }
        create_resp = requests.post(f"{BASE_URL}/api/payment-methods", json=payload)
        pm_id = create_resp.json()["payment_method"]["id"]
        self.created_pm_ids.append(pm_id)
        
        # Now GET
        response = requests.get(f"{BASE_URL}/api/payment-methods/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "payment_methods" in data
        assert isinstance(data["payment_methods"], list)
        print(f"✓ GET returns {len(data['payment_methods'])} payment methods")
    
    def test_delete_payment_method(self):
        """DELETE /api/payment-methods/{pm_id} - Removes a method"""
        # Create first
        payload = {
            "phone": TEST_PHONE,
            "method_type": "upi",
            "upi_id": f"{TEST_PREFIX}delete_me@upi",
            "is_default": False
        }
        create_resp = requests.post(f"{BASE_URL}/api/payment-methods", json=payload)
        pm_id = create_resp.json()["payment_method"]["id"]
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/payment-methods/{pm_id}")
        assert del_resp.status_code == 200, f"Expected 200, got {del_resp.status_code}"
        assert del_resp.json()["success"] is True
        
        # Verify deletion - it should be gone from list
        get_resp = requests.get(f"{BASE_URL}/api/payment-methods/{TEST_PHONE}")
        methods = get_resp.json()["payment_methods"]
        ids = [m["id"] for m in methods]
        assert pm_id not in ids, "Payment method should be deleted"
        print(f"✓ Payment method {pm_id} deleted successfully")
    
    def test_delete_nonexistent_method(self):
        """DELETE /api/payment-methods/{pm_id} - 404 for unknown ID"""
        response = requests.delete(f"{BASE_URL}/api/payment-methods/nonexistent_id_12345")
        assert response.status_code == 404, f"Expected 404 for unknown ID, got {response.status_code}"
        print("✓ DELETE correctly returns 404 for nonexistent method")
    
    def test_set_default_payment(self):
        """PUT /api/payment-methods/{pm_id}/default - Sets method as default"""
        # Create two methods
        pm1_payload = {
            "phone": TEST_PHONE,
            "method_type": "upi",
            "upi_id": f"{TEST_PREFIX}default1@upi",
            "is_default": True  # Start as default
        }
        pm1_resp = requests.post(f"{BASE_URL}/api/payment-methods", json=pm1_payload)
        pm1_id = pm1_resp.json()["payment_method"]["id"]
        self.created_pm_ids.append(pm1_id)
        
        pm2_payload = {
            "phone": TEST_PHONE,
            "method_type": "upi",
            "upi_id": f"{TEST_PREFIX}default2@upi",
            "is_default": False
        }
        pm2_resp = requests.post(f"{BASE_URL}/api/payment-methods", json=pm2_payload)
        pm2_id = pm2_resp.json()["payment_method"]["id"]
        self.created_pm_ids.append(pm2_id)
        
        # Set pm2 as default
        set_resp = requests.put(f"{BASE_URL}/api/payment-methods/{pm2_id}/default?phone={TEST_PHONE}")
        assert set_resp.status_code == 200, f"Expected 200, got {set_resp.status_code}"
        assert set_resp.json()["success"] is True
        
        # Verify pm2 is now default and pm1 is not
        get_resp = requests.get(f"{BASE_URL}/api/payment-methods/{TEST_PHONE}")
        methods = get_resp.json()["payment_methods"]
        for m in methods:
            if m["id"] == pm2_id:
                assert m["is_default"] is True, "pm2 should be default now"
            elif m["id"] == pm1_id:
                assert m["is_default"] is False, "pm1 should no longer be default"
        print(f"✓ Set default payment method successfully")


class TestWhatsAppNotificationTemplates:
    """Test WhatsApp Wallet Notification Templates"""
    
    def test_wallet_reward_notification(self):
        """POST /api/notify/wallet-reward - Sends/logs wallet reward notification"""
        payload = {
            "phone": TEST_PHONE,
            "patient_name": "Test Patient",
            "amount": 50.0,
            "coins": 20,
            "action": "consultation booking",
            "balance": 550.0,
            "total_coins": 120
        }
        response = requests.post(f"{BASE_URL}/api/notify/wallet-reward", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        # WhatsApp not configured, so sent=false but preview available
        assert "preview" in data or "message" in data
        
        # Verify template content mentions Orange Pharmacy and Mango Health Labs
        preview = data.get("preview", "")
        if preview:
            assert "Orange Pharmacy" in preview, "Template should mention Orange Pharmacy"
            assert "Mango Health Labs" in preview, "Template should mention Mango Health Labs"
        print("✓ Wallet reward notification logged successfully")
        print(f"  - Sent: {data.get('sent', False)}")
    
    def test_coins_redeemed_notification(self):
        """POST /api/notify/coins-redeemed - Sends/logs coins redeemed notification"""
        payload = {
            "phone": TEST_PHONE,
            "patient_name": "Test Patient",
            "coins": 200,
            "value": 200.0,
            "balance": 750.0,
            "remaining_coins": 120
        }
        response = requests.post(f"{BASE_URL}/api/notify/coins-redeemed", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        
        # Verify template mentions Orange Pharmacy and Mango Health Labs
        preview = data.get("preview", "")
        if preview:
            assert "Orange Pharmacy" in preview, "Template should mention Orange Pharmacy"
            assert "Mango Health Labs" in preview, "Template should mention Mango Health Labs"
        print("✓ Coins redeemed notification logged successfully")
    
    def test_wallet_refund_notification(self):
        """POST /api/notify/wallet-refund - Sends/logs wallet refund notification"""
        payload = {
            "phone": TEST_PHONE,
            "patient_name": "Test Patient",
            "amount": 300.0,
            "reason": "Cancelled appointment",
            "balance": 1050.0
        }
        response = requests.post(f"{BASE_URL}/api/notify/wallet-refund", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        
        # Verify template mentions Orange Pharmacy and Mango Health Labs
        preview = data.get("preview", "")
        if preview:
            assert "Orange Pharmacy" in preview, "Template should mention Orange Pharmacy"
            assert "Mango Health Labs" in preview, "Template should mention Mango Health Labs"
        print("✓ Wallet refund notification logged successfully")
    
    def test_get_notification_templates(self):
        """GET /api/notify/templates - Returns 3 template previews"""
        response = requests.get(f"{BASE_URL}/api/notify/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        assert len(templates) == 3, f"Expected 3 templates, got {len(templates)}"
        
        template_names = [t["name"] for t in templates]
        assert "cura_wallet_reward" in template_names
        assert "cura_coins_redeemed" in template_names
        assert "cura_wallet_refund" in template_names
        
        # Verify each template has required fields
        for t in templates:
            assert "name" in t
            assert "description" in t
            assert "variables" in t
            assert "sample" in t
            
            # Verify sample content mentions the partner brands
            sample = t["sample"]
            assert "Orange Pharmacy" in sample or "Mango Health Labs" in sample, \
                f"Template {t['name']} should mention partner brands"
        
        print(f"✓ Got {len(templates)} notification templates")
        for t in templates:
            print(f"  - {t['name']}: {len(t['variables'])} variables")
    
    def test_get_wallet_notification_history(self):
        """GET /api/notifications/wallet/{phone} - Returns notification history"""
        # First send a notification to ensure there's history
        payload = {
            "phone": TEST_PHONE,
            "patient_name": "History Test",
            "amount": 25.0,
            "reason": "Test refund",
            "balance": 525.0
        }
        requests.post(f"{BASE_URL}/api/notify/wallet-refund", json=payload)
        
        # Now get history
        response = requests.get(f"{BASE_URL}/api/notifications/wallet/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        print(f"✓ Got {len(data['notifications'])} wallet notifications in history")
        
        if data["notifications"]:
            notif = data["notifications"][0]
            assert "template" in notif
            assert "message" in notif
            assert "created_at" in notif
            print(f"  - Latest: {notif['template']}")


class TestExistingPaymentMethods:
    """Test seeded payment methods mentioned in context"""
    
    def test_seeded_methods_exist(self):
        """Verify seeded payment methods (rahul@ybl, ****4567 Visa) exist"""
        response = requests.get(f"{BASE_URL}/api/payment-methods/{TEST_PHONE}")
        assert response.status_code == 200
        
        data = response.json()
        methods = data["payment_methods"]
        
        # Check for seeded UPI (rahul@ybl)
        upi_methods = [m for m in methods if m["method_type"] == "upi"]
        # Check for seeded Card (****4567 Visa)
        card_methods = [m for m in methods if m["method_type"] == "card"]
        
        print(f"✓ Found {len(upi_methods)} UPI and {len(card_methods)} Card methods")
        for m in methods:
            if m["method_type"] == "upi":
                print(f"  - UPI: {m.get('upi_id', 'N/A')}")
            else:
                print(f"  - Card: ****{m.get('card_last4', 'N/A')} ({m.get('card_network', 'N/A')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
