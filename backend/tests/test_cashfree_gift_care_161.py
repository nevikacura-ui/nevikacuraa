"""
Test Cashfree Payment Integration for Gift Cards & Care Packages
Iteration 161 - Testing Cashfree order creation, gift card lifecycle, care package enrollment
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGiftCardCRUD:
    """Gift Card CRUD operations with status checks"""
    
    def test_purchase_gift_card_creates_inactive(self):
        """POST /api/gift-cards/purchase creates gift card with status='inactive'"""
        payload = {
            "buyer_name": "TEST_Buyer_161",
            "buyer_phone": "9876543210",
            "buyer_email": "test@example.com",
            "recipient_name": "TEST_Recipient_161",
            "recipient_phone": "9876543211",
            "amount": 999,
            "template": "birthday",
            "personal_message": "Happy Birthday!",
            "delivery_method": "whatsapp",
            "payment_method": "online"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "gift_card" in data, "Response should contain gift_card"
        
        gc = data["gift_card"]
        # Verify key fields
        assert gc.get("status") == "inactive", f"Expected status='inactive', got {gc.get('status')}"
        assert gc.get("payment_status") == "pending", f"Expected payment_status='pending', got {gc.get('payment_status')}"
        assert gc.get("amount") == 999, f"Expected amount=999, got {gc.get('amount')}"
        assert gc.get("balance") == 999, f"Expected balance=999, got {gc.get('balance')}"
        assert gc.get("code"), "Gift card should have a code"
        assert gc["code"].startswith("NC"), f"Code should start with 'NC', got {gc['code']}"
        assert len(gc["code"]) == 12, f"Code should be 12 chars, got {len(gc['code'])}"
        assert gc.get("id"), "Gift card should have an id"
        assert gc.get("template") == "birthday", f"Expected template='birthday', got {gc.get('template')}"
        
        print(f"SUCCESS: Gift card created with id={gc['id']}, code={gc['code']}, status=inactive")
        return gc
    
    def test_check_gift_card_shows_inactive(self):
        """GET /api/gift-cards/check/{code} shows inactive status before payment"""
        # First create a gift card
        create_payload = {
            "buyer_name": "TEST_Buyer_Check",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_Recipient_Check",
            "recipient_phone": "9876543211",
            "amount": 500,
            "template": "general"
        }
        create_res = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=create_payload)
        assert create_res.status_code == 200
        gc = create_res.json()["gift_card"]
        code = gc["code"]
        
        # Now check the card
        response = requests.get(f"{BASE_URL}/api/gift-cards/check/{code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("code") == code, f"Expected code={code}"
        assert data.get("status") == "inactive", f"Expected status='inactive', got {data.get('status')}"
        assert data.get("balance") == 500, f"Expected balance=500, got {data.get('balance')}"
        assert data.get("amount") == 500, f"Expected amount=500"
        
        print(f"SUCCESS: Gift card check shows status=inactive for code={code}")
        return data
    
    def test_activate_gift_card_manual(self):
        """POST /api/gift-cards/activate/{id} activates card (manual fallback)"""
        # First create a gift card
        create_payload = {
            "buyer_name": "TEST_Buyer_Activate",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_Recipient_Activate",
            "recipient_phone": "9876543211",
            "amount": 1999,
            "template": "diwali"
        }
        create_res = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=create_payload)
        assert create_res.status_code == 200
        gc = create_res.json()["gift_card"]
        card_id = gc["id"]
        code = gc["code"]
        
        # Activate the card
        response = requests.post(f"{BASE_URL}/api/gift-cards/activate/{card_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert data.get("code") == code, f"Expected code={code}"
        
        # Verify it's now active
        check_res = requests.get(f"{BASE_URL}/api/gift-cards/check/{code}")
        assert check_res.status_code == 200
        check_data = check_res.json()
        assert check_data.get("status") == "active", f"Expected status='active' after activation, got {check_data.get('status')}"
        
        print(f"SUCCESS: Gift card activated - id={card_id}, code={code}, status=active")
        return data
    
    def test_use_gift_card_deducts_balance(self):
        """POST /api/gift-cards/use deducts from balance correctly"""
        # Create and activate a gift card
        create_payload = {
            "buyer_name": "TEST_Buyer_Use",
            "buyer_phone": "9876543210",
            "recipient_name": "TEST_Recipient_Use",
            "recipient_phone": "9876543211",
            "amount": 2000,
            "template": "general"
        }
        create_res = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=create_payload)
        assert create_res.status_code == 200
        gc = create_res.json()["gift_card"]
        card_id = gc["id"]
        code = gc["code"]
        
        # Activate first
        activate_res = requests.post(f"{BASE_URL}/api/gift-cards/activate/{card_id}")
        assert activate_res.status_code == 200
        
        # Use part of the balance
        use_payload = {
            "code": code,
            "amount": 500,
            "service": "lab_test",
            "order_id": "TEST_ORDER_161"
        }
        response = requests.post(f"{BASE_URL}/api/gift-cards/use", json=use_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert data.get("amount_used") == 500, f"Expected amount_used=500, got {data.get('amount_used')}"
        assert data.get("remaining_balance") == 1500, f"Expected remaining_balance=1500, got {data.get('remaining_balance')}"
        assert data.get("transaction_id"), "Should return transaction_id"
        
        # Verify balance updated
        check_res = requests.get(f"{BASE_URL}/api/gift-cards/check/{code}")
        assert check_res.json().get("balance") == 1500, "Balance should be 1500 after use"
        
        print(f"SUCCESS: Gift card used - amount_used=500, remaining_balance=1500")
        return data
    
    def test_gift_card_stats(self):
        """GET /api/gift-cards/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/gift-cards/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify stats structure
        assert "total" in data, "Should have total"
        assert "active" in data, "Should have active"
        assert "used" in data, "Should have used"
        assert "pending" in data, "Should have pending"
        assert "total_sold" in data, "Should have total_sold"
        assert "total_redeemed" in data, "Should have total_redeemed"
        
        print(f"SUCCESS: Gift card stats - total={data.get('total')}, active={data.get('active')}, pending={data.get('pending')}")
        return data


class TestCarePackages:
    """Care Package endpoints testing"""
    
    def test_list_care_packages_returns_5(self):
        """GET /api/care-packages/list returns 5 packages with correct pricing"""
        response = requests.get(f"{BASE_URL}/api/care-packages/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "packages" in data, "Response should contain packages"
        packages = data["packages"]
        assert len(packages) == 5, f"Expected 5 packages, got {len(packages)}"
        
        # Verify expected package IDs
        expected_ids = ["diabetes_care", "thyroid_management", "pregnancy_journey", "senior_wellness", "cardiac_care"]
        actual_ids = [p["id"] for p in packages]
        for pid in expected_ids:
            assert pid in actual_ids, f"Package {pid} should be in list"
        
        # Verify each package has required fields
        for pkg in packages:
            assert pkg.get("id"), "Package should have id"
            assert pkg.get("name"), "Package should have name"
            assert pkg.get("price") > 0, "Package should have price > 0"
            assert pkg.get("original_value") > 0, "Package should have original_value"
            assert pkg.get("savings_percent") > 0, "Package should have savings_percent"
            assert pkg.get("includes"), "Package should have includes list"
        
        print(f"SUCCESS: Care packages list - {len(packages)} packages returned")
        return packages
    
    def test_enroll_care_package_creates_active(self):
        """POST /api/care-packages/enroll creates enrollment with status='active'"""
        payload = {
            "patient_name": "TEST_Patient_161",
            "patient_phone": "9876543212",
            "patient_email": "test_patient@example.com",
            "package_id": "diabetes_care",
            "payment_method": "online",
            "notes": "Test enrollment"
        }
        response = requests.post(f"{BASE_URL}/api/care-packages/enroll", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "enrollment" in data, "Response should contain enrollment"
        
        enrollment = data["enrollment"]
        assert enrollment.get("status") == "active", f"Expected status='active', got {enrollment.get('status')}"
        assert enrollment.get("payment_status") == "pending", f"Expected payment_status='pending'"
        assert enrollment.get("id"), "Enrollment should have id"
        assert enrollment.get("package_id") == "diabetes_care", "Package id should match"
        assert enrollment.get("package_name") == "Diabetes Care Program", "Package name should match"
        assert enrollment.get("package_price") == 4999, "Package price should be 4999"
        assert enrollment.get("start_date"), "Should have start_date"
        assert enrollment.get("end_date"), "Should have end_date"
        
        print(f"SUCCESS: Care package enrollment created - id={enrollment['id']}, status=active")
        return enrollment
    
    def test_list_enrollments(self):
        """GET /api/care-packages/enrollments/list returns enrollments"""
        response = requests.get(f"{BASE_URL}/api/care-packages/enrollments/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "enrollments" in data, "Response should contain enrollments"
        assert "total" in data, "Response should contain total"
        
        print(f"SUCCESS: Enrollments list - {data.get('total')} total enrollments")
        return data


class TestCashfreeOrderCreation:
    """Test Cashfree order creation for gift cards and care packages"""
    
    def test_create_order_gift_card(self):
        """POST /api/payments/cashfree/create-order with product_type='gift_card' returns payment_session_id"""
        # First create a gift card to get the product_id
        gc_payload = {
            "buyer_name": "TEST_Buyer_Cashfree",
            "buyer_phone": "9876543213",
            "recipient_name": "TEST_Recipient_Cashfree",
            "recipient_phone": "9876543214",
            "amount": 999,
            "template": "general"
        }
        gc_res = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=gc_payload)
        assert gc_res.status_code == 200
        gc = gc_res.json()["gift_card"]
        gift_card_id = gc["id"]
        
        # Now create Cashfree order
        order_payload = {
            "customer_id": f"GC_TEST_{int(time.time())}",
            "customer_name": "Test Buyer",
            "customer_email": "test@nevikacura.com",
            "customer_phone": "9876543213",
            "amount": 999,
            "product_type": "gift_card",
            "product_id": gift_card_id,
            "return_url": f"{BASE_URL}/gift-cards?order_id="
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=order_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert data.get("order_id"), "Should have order_id"
        assert data.get("payment_session_id"), "Should have payment_session_id (real Cashfree session)"
        assert data.get("cf_order_id"), "Should have cf_order_id from Cashfree"
        assert data.get("order_status") == "ACTIVE", f"Expected order_status='ACTIVE', got {data.get('order_status')}"
        
        # Verify order_id format includes GIFT_CARD
        assert "GIFT_CARD" in data["order_id"], f"Order ID should contain GIFT_CARD: {data['order_id']}"
        
        print(f"SUCCESS: Cashfree order created for gift_card - order_id={data['order_id']}, session_id={data['payment_session_id'][:20]}...")
        return data
    
    def test_create_order_care_package(self):
        """POST /api/payments/cashfree/create-order with product_type='care_package' returns payment_session_id"""
        # First create an enrollment to get the product_id
        enroll_payload = {
            "patient_name": "TEST_Patient_Cashfree",
            "patient_phone": "9876543215",
            "patient_email": "patient@test.com",
            "package_id": "senior_wellness",
            "payment_method": "online"
        }
        enroll_res = requests.post(f"{BASE_URL}/api/care-packages/enroll", json=enroll_payload)
        assert enroll_res.status_code == 200
        enrollment = enroll_res.json()["enrollment"]
        enrollment_id = enrollment["id"]
        
        # Now create Cashfree order
        order_payload = {
            "customer_id": f"CP_TEST_{int(time.time())}",
            "customer_name": "Test Patient",
            "customer_email": "patient@nevikacura.com",
            "customer_phone": "9876543215",
            "amount": 2999,  # senior_wellness price
            "product_type": "care_package",
            "product_id": enrollment_id,
            "return_url": f"{BASE_URL}/care-programs?order_id="
        }
        response = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=order_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert data.get("order_id"), "Should have order_id"
        assert data.get("payment_session_id"), "Should have payment_session_id"
        assert data.get("cf_order_id"), "Should have cf_order_id"
        assert data.get("order_status") == "ACTIVE", f"Expected order_status='ACTIVE'"
        
        # Verify order_id format includes CARE_PACKAGE
        assert "CARE_PACKAGE" in data["order_id"], f"Order ID should contain CARE_PACKAGE: {data['order_id']}"
        
        print(f"SUCCESS: Cashfree order created for care_package - order_id={data['order_id']}, session_id={data['payment_session_id'][:20]}...")
        return data


class TestCashfreeVerify:
    """Test Cashfree verify endpoint returns proper product info"""
    
    def test_verify_returns_product_type_info(self):
        """GET /api/payments/cashfree/verify/{order_id} returns proper product_type info"""
        # Create a gift card order first
        gc_payload = {
            "buyer_name": "TEST_Verify_Buyer",
            "buyer_phone": "9876543216",
            "recipient_name": "TEST_Verify_Recipient",
            "recipient_phone": "9876543217",
            "amount": 500,
            "template": "general"
        }
        gc_res = requests.post(f"{BASE_URL}/api/gift-cards/purchase", json=gc_payload)
        assert gc_res.status_code == 200
        gc = gc_res.json()["gift_card"]
        
        # Create Cashfree order
        order_payload = {
            "customer_id": f"VERIFY_TEST_{int(time.time())}",
            "customer_name": "Verify Buyer",
            "customer_email": "verify@test.com",
            "customer_phone": "9876543216",
            "amount": 500,
            "product_type": "gift_card",
            "product_id": gc["id"]
        }
        order_res = requests.post(f"{BASE_URL}/api/payments/cashfree/create-order", json=order_payload)
        assert order_res.status_code == 200
        order_data = order_res.json()
        order_id = order_data["order_id"]
        
        # Now verify the order
        response = requests.get(f"{BASE_URL}/api/payments/cashfree/verify/{order_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("order_id") == order_id, f"Expected order_id={order_id}"
        assert data.get("product_type") == "gift_card", f"Expected product_type='gift_card', got {data.get('product_type')}"
        assert data.get("order_status"), "Should have order_status"
        # Note: success will be False since payment hasn't been made
        # But the endpoint should work and return product_type
        
        print(f"SUCCESS: Verify endpoint works - order_id={order_id}, product_type=gift_card, order_status={data.get('order_status')}")
        return data


class TestGiftCardTemplates:
    """Test gift card templates endpoint"""
    
    def test_get_8_templates(self):
        """GET /api/gift-cards/templates returns 8 occasion templates"""
        response = requests.get(f"{BASE_URL}/api/gift-cards/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "templates" in data, "Response should contain templates"
        templates = data["templates"]
        
        expected_templates = ["mothers_day", "fathers_day", "birthday", "diwali", "wedding", "baby_shower", "general", "corporate"]
        assert len(templates) == 8, f"Expected 8 templates, got {len(templates)}"
        
        for key in expected_templates:
            assert key in templates, f"Template {key} should exist"
            t = templates[key]
            assert t.get("title"), f"Template {key} should have title"
            assert t.get("suggested_amounts"), f"Template {key} should have suggested_amounts"
        
        print(f"SUCCESS: 8 gift card templates returned")
        return templates


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
