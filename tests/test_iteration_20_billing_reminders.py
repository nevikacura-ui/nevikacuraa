"""
Iteration 20 - Testing New Features:
1. Billing API - POST /api/billing/invoices, GET /api/billing/summary, GET /api/billing/due-payments
2. Reminders API - POST /api/reminders/create, GET /api/reminders/pending, POST /api/reminders/appointment-followup
3. Community API - GET /api/community/categories, GET /api/community/featured, POST /api/community/posts
4. Push Notifications - POST /api/notifications/appointment-reminder, POST /api/cron/appointment-reminders
5. Data Migration - medicines_catalog, diagnostic_tests_catalog, food_catalog collections
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")


class TestBillingAPI:
    """Billing & Due Payments System Tests"""
    
    def test_create_invoice(self):
        """Test POST /api/billing/invoices - Create new invoice"""
        invoice_data = {
            "patient_name": "TEST_Billing_Patient",
            "patient_phone": "9876543210",
            "patient_email": "test_billing@example.com",
            "service_type": "appointment",
            "service_id": "test-apt-001",
            "items": [
                {"description": "Consultation Fee", "quantity": 1, "unit_price": 500, "total": 500},
                {"description": "Lab Test", "quantity": 1, "unit_price": 300, "total": 300}
            ],
            "discount": 50,
            "tax_percent": 5,
            "notes": "Test invoice for iteration 20",
            "payment_status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/billing/invoices", json=invoice_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "invoice" in data
        
        invoice = data["invoice"]
        assert invoice["patient_name"] == "TEST_Billing_Patient"
        assert invoice["service_type"] == "appointment"
        assert "invoice_number" in invoice
        assert invoice["subtotal"] == 800  # 500 + 300
        assert invoice["discount"] == 50
        assert invoice["tax_amount"] == 40  # 5% of 800
        assert invoice["total"] == 790  # 800 - 50 + 40
        assert invoice["payment_status"] == "pending"
        
        print(f"✓ Invoice created: {invoice['invoice_number']}")
        return invoice
    
    def test_get_billing_summary(self):
        """Test GET /api/billing/summary - Get billing summary"""
        response = requests.get(f"{BASE_URL}/api/billing/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_invoices" in data
        assert "total_billed" in data
        assert "total_collected" in data
        assert "total_due" in data
        assert "collection_rate" in data
        assert "status_counts" in data
        assert "overdue" in data
        
        print(f"✓ Billing summary: {data['total_invoices']} invoices, ₹{data['total_billed']} billed")
        return data
    
    def test_get_due_payments(self):
        """Test GET /api/billing/due-payments - Get due payments list"""
        response = requests.get(f"{BASE_URL}/api/billing/due-payments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "due_payments" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        print(f"✓ Due payments: {data['total']} pending payments")
        return data
    
    def test_list_invoices(self):
        """Test GET /api/billing/invoices - List all invoices"""
        response = requests.get(f"{BASE_URL}/api/billing/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invoices" in data
        assert "total" in data
        assert "page" in data
        
        print(f"✓ Invoices list: {data['total']} total invoices")
        return data


class TestRemindersAPI:
    """Automated Reminders System Tests"""
    
    def test_create_reminder(self):
        """Test POST /api/reminders/create - Create new reminder"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        reminder_data = {
            "reminder_type": "follow_up",
            "patient_name": "TEST_Reminder_Patient",
            "patient_phone": "9876543211",
            "patient_email": "test_reminder@example.com",
            "title": "Follow-up Reminder",
            "message": "Please schedule your follow-up appointment",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "repeat": None,
            "metadata": {"test": True}
        }
        
        response = requests.post(f"{BASE_URL}/api/reminders/create", json=reminder_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "reminder" in data
        
        reminder = data["reminder"]
        assert reminder["reminder_type"] == "follow_up"
        assert reminder["patient_name"] == "TEST_Reminder_Patient"
        assert reminder["status"] == "scheduled"
        
        print(f"✓ Reminder created: {reminder['id'][:8]}...")
        return reminder
    
    def test_get_pending_reminders(self):
        """Test GET /api/reminders/pending - Get pending reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders/pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "today" in data
        assert "tomorrow" in data
        assert "total" in data
        
        print(f"✓ Pending reminders: {data['total']} (today: {len(data['today'])}, tomorrow: {len(data['tomorrow'])})")
        return data
    
    def test_list_reminders(self):
        """Test GET /api/reminders/list - List all reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reminders" in data
        assert "total" in data
        
        print(f"✓ Reminders list: {data['total']} total reminders")
        return data


class TestCommunityAPI:
    """Women's Health Community Tests"""
    
    def test_get_community_categories(self):
        """Test GET /api/community/categories - Get community categories"""
        response = requests.get(f"{BASE_URL}/api/community/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "categories" in data
        
        categories = data["categories"]
        assert len(categories) > 0
        
        # Check category structure
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "icon" in cat
        
        category_ids = [c["id"] for c in categories]
        expected_categories = ["pregnancy", "fertility", "menopause", "pcos", "nutrition", "mental_health", "general"]
        for expected in expected_categories:
            assert expected in category_ids, f"Missing category: {expected}"
        
        print(f"✓ Community categories: {len(categories)} categories")
        return data
    
    def test_get_featured_discussions(self):
        """Test GET /api/community/featured - Get featured discussions"""
        response = requests.get(f"{BASE_URL}/api/community/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "featured" in data
        
        featured = data["featured"]
        assert len(featured) > 0
        
        # Check featured structure
        for post in featured:
            assert "id" in post
            assert "title" in post
            assert "category" in post
            assert "replies_count" in post
            assert "likes" in post
        
        print(f"✓ Featured discussions: {len(featured)} posts")
        return data
    
    def test_create_community_post(self):
        """Test POST /api/community/posts - Create new community post"""
        post_data = {
            "title": "TEST_Community_Post - Tips for managing stress",
            "content": "This is a test post for iteration 20 testing. Sharing some tips for managing stress during pregnancy.",
            "category": "pregnancy",
            "is_anonymous": False
        }
        
        response = requests.post(f"{BASE_URL}/api/community/posts", json=post_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "post" in data
        
        post = data["post"]
        assert post["title"] == post_data["title"]
        assert post["category"] == "pregnancy"
        assert post["status"] == "active"
        assert post["likes"] == 0
        assert post["replies_count"] == 0
        
        print(f"✓ Community post created: {post['id'][:8]}...")
        return post
    
    def test_get_community_posts(self):
        """Test GET /api/community/posts - Get community posts"""
        response = requests.get(f"{BASE_URL}/api/community/posts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data
        assert "total" in data
        
        print(f"✓ Community posts: {data['total']} total posts")
        return data


class TestPushNotifications:
    """Push Notification Endpoints Tests"""
    
    def test_appointment_reminder_notification_no_appointment(self):
        """Test POST /api/notifications/appointment-reminder - Invalid appointment"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/appointment-reminder",
            params={"appointment_id": "non-existent-id"}
        )
        # Should return 404 for non-existent appointment
        assert response.status_code == 404
        print("✓ Appointment reminder returns 404 for invalid appointment")
    
    def test_cron_appointment_reminders_invalid_secret(self):
        """Test POST /api/cron/appointment-reminders - Invalid secret"""
        response = requests.post(
            f"{BASE_URL}/api/cron/appointment-reminders",
            params={"secret": "wrong_secret"}
        )
        assert response.status_code == 403
        print("✓ Cron endpoint rejects invalid secret")
    
    def test_cron_appointment_reminders_valid_secret(self):
        """Test POST /api/cron/appointment-reminders - Valid secret"""
        response = requests.post(
            f"{BASE_URL}/api/cron/appointment-reminders",
            params={"secret": "nevika_cron_2026"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "appointments_checked" in data
        assert "notified" in data
        
        print(f"✓ Cron appointment reminders: {data['appointments_checked']} checked, {data['notified']} notified")
        return data


class TestDataMigration:
    """Data Migration - MongoDB Collections Tests"""
    
    def test_medicines_catalog_exists(self):
        """Test medicines_catalog collection has data"""
        # Use the pharmacy inventory endpoint which reads from medicines_catalog
        response = requests.get(f"{BASE_URL}/api/pharmacy/inventory")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "medicines" in data
        
        medicines = data["medicines"]
        assert len(medicines) > 0, "Medicines catalog should have data"
        
        # Check medicine structure
        if len(medicines) > 0:
            med = medicines[0]
            assert "name" in med
            assert "category" in med
            assert "price" in med
        
        print(f"✓ Medicines catalog: {len(medicines)} medicines available")
        return data
    
    def test_diagnostic_tests_catalog_exists(self):
        """Test diagnostic_tests_catalog collection has data"""
        # Use the diagnostics tests endpoint
        response = requests.get(f"{BASE_URL}/api/diagnostics/tests")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tests" in data
        
        tests = data["tests"]
        assert len(tests) > 0, "Diagnostic tests catalog should have data"
        
        # Check test structure
        if len(tests) > 0:
            test = tests[0]
            assert "name" in test
            assert "category" in test
            assert "price" in test
        
        print(f"✓ Diagnostic tests catalog: {len(tests)} tests available")
        return data
    
    def test_food_catalog_exists(self):
        """Test food_catalog collection has data via calorie API"""
        response = requests.get(f"{BASE_URL}/api/calories/food-database")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "foods" in data
        
        foods = data["foods"]
        assert len(foods) > 0, "Food catalog should have data"
        
        # Count total food items
        total_items = sum(len(items) for items in foods.values())
        
        print(f"✓ Food catalog: {len(foods)} categories, {total_items} total items")
        return data


class TestAppointmentFollowupReminder:
    """Test appointment follow-up reminder creation"""
    
    def test_create_appointment_followup_no_appointment(self):
        """Test POST /api/reminders/appointment-followup - Invalid appointment"""
        response = requests.post(
            f"{BASE_URL}/api/reminders/appointment-followup",
            params={"appointment_id": "non-existent-id", "followup_days": 7}
        )
        # Should return 404 for non-existent appointment
        assert response.status_code == 404
        print("✓ Appointment followup returns 404 for invalid appointment")


class TestBillingPaymentFlow:
    """Test complete billing payment flow"""
    
    def test_create_invoice_and_record_payment(self):
        """Test creating invoice and recording partial payment"""
        # Create invoice
        invoice_data = {
            "patient_name": "TEST_Payment_Patient",
            "patient_phone": "9876543212",
            "service_type": "diagnostic",
            "service_id": "test-diag-001",
            "items": [
                {"description": "Blood Test", "quantity": 1, "unit_price": 1000, "total": 1000}
            ],
            "discount": 0,
            "tax_percent": 0,
            "payment_status": "pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/billing/invoices", json=invoice_data)
        assert create_response.status_code == 200
        
        invoice = create_response.json()["invoice"]
        invoice_id = invoice["id"]
        
        # Record partial payment
        payment_data = {
            "invoice_id": invoice_id,
            "amount": 500,
            "payment_method": "upi",
            "reference_number": "UPI123456",
            "notes": "Partial payment"
        }
        
        payment_response = requests.post(
            f"{BASE_URL}/api/billing/invoices/{invoice_id}/payment",
            json=payment_data
        )
        assert payment_response.status_code == 200, f"Expected 200, got {payment_response.status_code}: {payment_response.text}"
        
        payment_result = payment_response.json()
        assert payment_result["success"] == True
        assert payment_result["invoice_status"] == "partial"
        assert payment_result["amount_paid"] == 500
        assert payment_result["amount_due"] == 500
        
        print(f"✓ Payment recorded: ₹500 paid, ₹500 due")
        return payment_result


class TestCommunityStats:
    """Test community statistics endpoint"""
    
    def test_get_community_stats(self):
        """Test GET /api/community/stats - Get community statistics"""
        response = requests.get(f"{BASE_URL}/api/community/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_posts" in data
        assert "total_comments" in data
        assert "categories" in data
        
        print(f"✓ Community stats: {data['total_posts']} posts, {data['total_comments']} comments")
        return data


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
