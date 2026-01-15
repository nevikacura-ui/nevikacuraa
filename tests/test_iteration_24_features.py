"""
Iteration 24 - Testing New Features:
1. Staff Billing Module (in Staff Portal)
2. Community Forum page
3. Reminders/Scheduler page
4. Footer Quick Billing link
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthfix-1.preview.emergentagent.com')

# Test credentials
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"

class TestStaffBillingAPIs:
    """Staff Billing Module API Tests"""
    
    def test_inventory_search_services(self):
        """Test inventory search for DiaGyn services"""
        response = requests.get(f"{BASE_URL}/api/staff-billing/inventory/search", params={"q": "consultation"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) > 0
        # Check DiaGyn services are returned
        diagyn_services = [r for r in data["results"] if r["source"] == "DiaGyn"]
        assert len(diagyn_services) > 0
        print(f"✓ Found {len(diagyn_services)} DiaGyn services for 'consultation'")
    
    def test_inventory_search_tests(self):
        """Test inventory search for Proton diagnostic tests"""
        response = requests.get(f"{BASE_URL}/api/staff-billing/inventory/search", params={"q": "blood"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # Check Proton tests are returned
        proton_tests = [r for r in data["results"] if r["source"] == "Proton"]
        assert len(proton_tests) > 0
        print(f"✓ Found {len(proton_tests)} Proton tests for 'blood'")
    
    def test_inventory_search_medicines(self):
        """Test inventory search for Orange Pharmacy medicines"""
        response = requests.get(f"{BASE_URL}/api/staff-billing/inventory/search", params={"q": "tablet"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # Check pharmacy medicines are returned
        pharmacy_meds = [r for r in data["results"] if r["source"] == "Orange Pharmacy"]
        assert len(pharmacy_meds) > 0
        print(f"✓ Found {len(pharmacy_meds)} Orange Pharmacy medicines for 'tablet'")
    
    def test_inventory_search_with_category_filter(self):
        """Test inventory search with category filter"""
        response = requests.get(f"{BASE_URL}/api/staff-billing/inventory/search", params={"q": "test", "category": "test"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # All results should be tests
        for result in data["results"]:
            assert result["type"] == "test"
        print(f"✓ Category filter working - {len(data['results'])} tests returned")
    
    def test_patient_loyalty_lookup(self):
        """Test patient loyalty points lookup"""
        response = requests.get(f"{BASE_URL}/api/staff-billing/patient-loyalty/9876543210")
        assert response.status_code == 200
        data = response.json()
        assert "total_earned" in data
        assert "total_used" in data
        assert "available_points" in data
        print(f"✓ Patient loyalty lookup working - {data['available_points']} points available")
    
    def test_create_bill(self):
        """Test bill creation"""
        bill_data = {
            "patient_name": f"TEST_Bill_{uuid.uuid4().hex[:6]}",
            "patient_phone": "9876543288",
            "items": [
                {
                    "item_type": "service",
                    "item_name": "General Physician Consultation",
                    "item_code": "CONS-GEN",
                    "quantity": 1,
                    "unit_price": 400
                },
                {
                    "item_type": "test",
                    "item_name": "CBC (Complete Blood Count)",
                    "item_code": "CBC",
                    "quantity": 1,
                    "unit_price": 250
                }
            ],
            "payment_method": "cash",
            "clinic": "pushpa"
        }
        response = requests.post(f"{BASE_URL}/api/staff-billing/create-bill", json=bill_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "bill" in data
        assert "bill_number" in data["bill"]
        assert data["bill"]["final_total"] == 650  # 400 + 250
        print(f"✓ Bill created: {data['bill']['bill_number']} - Total: ₹{data['bill']['final_total']}")
    
    def test_create_bill_with_discount(self):
        """Test bill creation with discount"""
        bill_data = {
            "patient_name": f"TEST_Discount_{uuid.uuid4().hex[:6]}",
            "patient_phone": "9876543277",
            "items": [
                {
                    "item_type": "service",
                    "item_name": "OB-GYN Consultation",
                    "item_code": "CONS-OBG",
                    "quantity": 1,
                    "unit_price": 500
                }
            ],
            "discount_amount": 50,
            "payment_method": "upi",
            "clinic": "pushpa"
        }
        response = requests.post(f"{BASE_URL}/api/staff-billing/create-bill", json=bill_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["bill"]["final_total"] == 450  # 500 - 50 discount
        print(f"✓ Bill with discount created - Total: ₹{data['bill']['final_total']}")


class TestCommunityAPIs:
    """Community Forum API Tests"""
    
    def test_get_categories(self):
        """Test getting community categories"""
        response = requests.get(f"{BASE_URL}/api/community/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) == 7  # 7 categories defined
        category_ids = [c["id"] for c in data["categories"]]
        assert "pregnancy" in category_ids
        assert "pcos" in category_ids
        assert "menopause" in category_ids
        print(f"✓ Found {len(data['categories'])} community categories")
    
    def test_get_featured_discussions(self):
        """Test getting featured discussions"""
        response = requests.get(f"{BASE_URL}/api/community/featured")
        assert response.status_code == 200
        data = response.json()
        assert "featured" in data
        assert len(data["featured"]) == 3  # 3 featured discussions
        for feat in data["featured"]:
            assert "title" in feat
            assert "category" in feat
            assert "likes" in feat
        print(f"✓ Found {len(data['featured'])} featured discussions")
    
    def test_get_posts(self):
        """Test getting community posts"""
        response = requests.get(f"{BASE_URL}/api/community/posts")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Community posts API working - {data['total']} total posts")
    
    def test_get_posts_with_category_filter(self):
        """Test getting posts filtered by category"""
        response = requests.get(f"{BASE_URL}/api/community/posts", params={"category": "pregnancy"})
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        # All posts should be in pregnancy category
        for post in data["posts"]:
            assert post["category"] == "pregnancy"
        print(f"✓ Category filter working - {len(data['posts'])} pregnancy posts")
    
    def test_create_post(self):
        """Test creating a community post"""
        post_data = {
            "title": f"TEST_Post_{uuid.uuid4().hex[:6]} - Health Tips",
            "content": "This is a test post for iteration 24 testing. Sharing health tips.",
            "category": "general",
            "is_anonymous": False
        }
        response = requests.post(
            f"{BASE_URL}/api/community/posts",
            json=post_data,
            params={"user_name": "TestUser24"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "post" in data
        assert data["post"]["title"] == post_data["title"]
        print(f"✓ Post created: {data['post']['id']}")
        return data["post"]["id"]
    
    def test_like_post(self):
        """Test liking a post"""
        # First create a post
        post_data = {
            "title": f"TEST_Like_{uuid.uuid4().hex[:6]}",
            "content": "Test post for like testing",
            "category": "general",
            "is_anonymous": False
        }
        create_response = requests.post(
            f"{BASE_URL}/api/community/posts",
            json=post_data,
            params={"user_name": "TestUser"}
        )
        post_id = create_response.json()["post"]["id"]
        
        # Like the post
        response = requests.post(f"{BASE_URL}/api/community/posts/{post_id}/like")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Post liked successfully")
    
    def test_add_comment(self):
        """Test adding a comment to a post"""
        # First create a post
        post_data = {
            "title": f"TEST_Comment_{uuid.uuid4().hex[:6]}",
            "content": "Test post for comment testing",
            "category": "general",
            "is_anonymous": False
        }
        create_response = requests.post(
            f"{BASE_URL}/api/community/posts",
            json=post_data,
            params={"user_name": "TestUser"}
        )
        post_id = create_response.json()["post"]["id"]
        
        # Add comment
        comment_data = {
            "content": "This is a test comment",
            "is_anonymous": False
        }
        response = requests.post(
            f"{BASE_URL}/api/community/posts/{post_id}/comment",
            json=comment_data,
            params={"user_name": "Commenter24"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "comment" in data
        print(f"✓ Comment added successfully")


class TestRemindersAPIs:
    """Reminders/Scheduler API Tests"""
    
    def test_get_pending_reminders(self):
        """Test getting pending reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders/pending")
        assert response.status_code == 200
        data = response.json()
        assert "today" in data
        assert "tomorrow" in data
        assert "total" in data
        print(f"✓ Pending reminders: {len(data['today'])} today, {len(data['tomorrow'])} tomorrow")
    
    def test_list_reminders(self):
        """Test listing all reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders/list")
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Reminders list API working - {data['total']} total reminders")
    
    def test_list_reminders_with_filter(self):
        """Test listing reminders with type filter"""
        response = requests.get(f"{BASE_URL}/api/reminders/list", params={"reminder_type": "follow_up"})
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        # All reminders should be follow_up type
        for reminder in data["reminders"]:
            assert reminder["reminder_type"] == "follow_up"
        print(f"✓ Reminder type filter working")
    
    def test_create_reminder(self):
        """Test creating a reminder"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        reminder_data = {
            "reminder_type": "custom",
            "patient_name": f"TEST_Reminder_{uuid.uuid4().hex[:6]}",
            "patient_phone": "9876543266",
            "patient_email": "test_reminder24@example.com",
            "title": "Test Reminder for Iteration 24",
            "message": "This is a test reminder message",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "repeat": None
        }
        response = requests.post(f"{BASE_URL}/api/reminders/create", json=reminder_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "reminder" in data
        assert data["reminder"]["status"] == "scheduled"
        print(f"✓ Reminder created: {data['reminder']['id']}")
        return data["reminder"]["id"]
    
    def test_cancel_reminder(self):
        """Test cancelling a reminder"""
        # First create a reminder
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        reminder_data = {
            "reminder_type": "custom",
            "patient_name": f"TEST_Cancel_{uuid.uuid4().hex[:6]}",
            "patient_phone": "9876543255",
            "title": "Test Cancel Reminder",
            "message": "This reminder will be cancelled",
            "scheduled_date": tomorrow,
            "scheduled_time": "11:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/reminders/create", json=reminder_data)
        reminder_id = create_response.json()["reminder"]["id"]
        
        # Cancel the reminder
        response = requests.delete(f"{BASE_URL}/api/reminders/{reminder_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Reminder cancelled successfully")


class TestPatientFlowAPIs:
    """Patient Flow/Queue Management API Tests"""
    
    def test_patient_lookup(self):
        """Test patient lookup by phone"""
        response = requests.get(f"{BASE_URL}/api/patient-flow/patient/lookup", params={"phone": "9876543210"})
        assert response.status_code == 200
        data = response.json()
        assert "patient" in data
        assert "loyalty" in data
        assert "recent_appointments" in data
        assert "pending_dues" in data
        print(f"✓ Patient lookup working - Loyalty tier: {data['loyalty']['tier']}")
    
    def test_get_queue(self):
        """Test getting clinic queue"""
        response = requests.get(f"{BASE_URL}/api/patient-flow/queue/pushpa")
        assert response.status_code == 200
        data = response.json()
        assert "waiting" in data
        assert "in_consultation" in data
        assert "completed" in data
        assert "stats" in data
        print(f"✓ Queue API working - {data['stats']['total_patients']} patients in queue")
    
    def test_queue_display(self):
        """Test queue display endpoint"""
        response = requests.get(f"{BASE_URL}/api/patient-flow/queue/pushpa/display")
        assert response.status_code == 200
        data = response.json()
        assert "now_serving" in data
        assert "next_in_line" in data
        assert "last_updated" in data
        print(f"✓ Queue display API working")


class TestStaffPortalLogin:
    """Staff Portal Login Tests"""
    
    def test_staff_login(self):
        """Test staff login"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "clinic_staff_pushpa"
        assert data["clinic"] == "Pushpa Clinic"
        print(f"✓ Staff login successful - Role: {data['role']}")
        return data["token"]


class TestAPIHealth:
    """API Health Check"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API is healthy - Services: {', '.join(data['services'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
