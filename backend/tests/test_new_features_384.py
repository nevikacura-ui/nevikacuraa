"""
Test Suite for Iteration 384 - 3 New Features:
1. Order Notifications: Auto-send WhatsApp via MSG91 when pharmacy/lab order status changes
2. Family Members: Max 5 per patient, selection in booking flow
3. Refill Reminders: WhatsApp alerts when medicine stock is low
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test phone number
TEST_PHONE = "9876543210"


class TestOrderNotifications:
    """Test Order Status Notification APIs"""
    
    def test_order_status_notify_pharmacy_confirmed(self):
        """POST /api/order-status-notify with pharmacy_order confirmed status"""
        response = requests.post(f"{BASE_URL}/api/order-status-notify", json={
            "order_type": "pharmacy_order",
            "order_id": f"TEST-PH-{uuid.uuid4().hex[:6].upper()}",
            "new_status": "confirmed",
            "phone": TEST_PHONE,
            "patient_name": "Test Patient",
            "items_summary": "Paracetamol 500mg x 10",
            "total_amount": "150"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert data.get("whatsapp_sent") == True, f"Expected whatsapp_sent=True for confirmed status, got {data}"
        assert "notification" in data, f"Expected notification in response, got {data}"
        print(f"PASS: Pharmacy order confirmed notification - whatsapp_sent={data.get('whatsapp_sent')}")
    
    def test_order_status_notify_lab_confirmed(self):
        """POST /api/order-status-notify with lab_order confirmed status"""
        response = requests.post(f"{BASE_URL}/api/order-status-notify", json={
            "order_type": "lab_order",
            "order_id": f"TEST-LAB-{uuid.uuid4().hex[:6].upper()}",
            "new_status": "confirmed",
            "phone": TEST_PHONE,
            "patient_name": "Test Patient",
            "items_summary": "CBC, Thyroid Profile"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        # Lab confirmed should also trigger WhatsApp
        assert data.get("whatsapp_sent") == True, f"Expected whatsapp_sent=True for lab confirmed, got {data}"
        print(f"PASS: Lab order confirmed notification - whatsapp_sent={data.get('whatsapp_sent')}")
    
    def test_order_status_notify_pharmacy_packed(self):
        """POST /api/order-status-notify with pharmacy_order packed status (no WhatsApp)"""
        response = requests.post(f"{BASE_URL}/api/order-status-notify", json={
            "order_type": "pharmacy_order",
            "order_id": f"TEST-PH-{uuid.uuid4().hex[:6].upper()}",
            "new_status": "packed",
            "phone": TEST_PHONE,
            "patient_name": "Test Patient"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        # Packed status should NOT trigger WhatsApp (wa: False in STATUS_MESSAGES)
        assert data.get("whatsapp_sent") == False, f"Expected whatsapp_sent=False for packed status, got {data}"
        print(f"PASS: Pharmacy order packed notification - whatsapp_sent={data.get('whatsapp_sent')} (correctly not sent)")
    
    def test_get_order_notifications(self):
        """GET /api/order-notifications/{phone} returns recent notifications"""
        response = requests.get(f"{BASE_URL}/api/order-notifications/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notifications" in data, f"Expected notifications in response, got {data}"
        assert "unread_count" in data, f"Expected unread_count in response, got {data}"
        print(f"PASS: Get order notifications - found {len(data.get('notifications', []))} notifications, {data.get('unread_count')} unread")
    
    def test_mark_notifications_read(self):
        """POST /api/order-notifications/{phone}/mark-read returns success"""
        response = requests.post(f"{BASE_URL}/api/order-notifications/{TEST_PHONE}/mark-read")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        print(f"PASS: Mark notifications read - success={data.get('success')}")


class TestFamilyMembers:
    """Test Family Member APIs with 5-member limit"""
    
    def test_add_family_member(self):
        """POST /api/health-records/family/{user_id} adds a member"""
        response = requests.post(f"{BASE_URL}/api/health-records/family/{TEST_PHONE}", json={
            "name": f"Test Child {uuid.uuid4().hex[:4]}",
            "relation": "child",
            "gender": "male",
            "blood_group": "O+",
            "date_of_birth": "2015-05-15"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "member_id" in data, f"Expected member_id in response, got {data}"
        print(f"PASS: Add family member - member_id={data.get('member_id')}")
        return data.get("member_id")
    
    def test_get_family_members(self):
        """GET /api/health-records/family/{user_id} returns members"""
        response = requests.get(f"{BASE_URL}/api/health-records/family/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "family_members" in data, f"Expected family_members in response, got {data}"
        members = data.get("family_members", [])
        print(f"PASS: Get family members - found {len(members)} members")
        return members
    
    def test_family_member_5_limit(self):
        """Verify max 5 family members limit"""
        # First get current count
        response = requests.get(f"{BASE_URL}/api/health-records/family/{TEST_PHONE}")
        current_members = response.json().get("family_members", [])
        current_count = len(current_members)
        
        # If already at 5, try to add one more and expect 400
        if current_count >= 5:
            response = requests.post(f"{BASE_URL}/api/health-records/family/{TEST_PHONE}", json={
                "name": "Overflow Member",
                "relation": "sibling"
            })
            assert response.status_code == 400, f"Expected 400 when exceeding 5 members, got {response.status_code}"
            print(f"PASS: Family member 5-limit enforced - got 400 when trying to add 6th member")
        else:
            print(f"INFO: Currently {current_count}/5 members - limit not yet reached")
    
    def test_phase4_family_members_endpoint(self):
        """POST /api/family/members with 5-member limit (phase4 route)"""
        response = requests.post(f"{BASE_URL}/api/family/members?phone={TEST_PHONE}", json={
            "name": f"Phase4 Test {uuid.uuid4().hex[:4]}",
            "relation": "sibling",
            "age": 25,
            "gender": "female"
        })
        # Should be 200 if under limit, 400 if at limit
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        data = response.json()
        if response.status_code == 200:
            assert data.get("success") == True, f"Expected success=True, got {data}"
            print(f"PASS: Phase4 family member added - member_id={data.get('member', {}).get('id')}")
        else:
            assert "Maximum 5" in str(data), f"Expected limit error message, got {data}"
            print(f"PASS: Phase4 family member limit enforced - {data}")


class TestMedicineRefillReminders:
    """Test Medicine Refill Check API"""
    
    def test_refill_check_endpoint(self):
        """GET /api/medicine-reminders/refill-check returns success with low_stock_count"""
        response = requests.get(f"{BASE_URL}/api/medicine-reminders/refill-check")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "low_stock_count" in data, f"Expected low_stock_count in response, got {data}"
        assert "alerts_sent" in data, f"Expected alerts_sent in response, got {data}"
        print(f"PASS: Refill check - low_stock_count={data.get('low_stock_count')}, alerts_sent={data.get('alerts_sent')}")


class TestHealthRecordsEndpoints:
    """Additional health records endpoint tests"""
    
    def test_health_summary(self):
        """GET /api/health-records/summary/{user_id}"""
        response = requests.get(f"{BASE_URL}/api/health-records/summary/{TEST_PHONE}")
        # May return 404 if user not found, which is acceptable
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "stats" in data, f"Expected stats in response, got {data}"
            print(f"PASS: Health summary - stats={data.get('stats')}")
        else:
            print(f"INFO: Health summary - user not found (404)")
    
    def test_health_timeline(self):
        """GET /api/health-records/timeline/{user_id}"""
        response = requests.get(f"{BASE_URL}/api/health-records/timeline/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "timeline" in data, f"Expected timeline in response, got {data}"
        print(f"PASS: Health timeline - {len(data.get('timeline', []))} events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
