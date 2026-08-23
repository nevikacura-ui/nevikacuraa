"""
Test Phase 4 Features - Iteration 191
Testing: Favorites, Addresses, Family Members, Health Stats, Recent Orders, FCM Push Notifications
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9876543210"

class TestFavorites:
    """Test Favorites CRUD endpoints"""
    
    created_fav_ids = []
    
    def test_get_favorites_empty_or_list(self):
        """GET /api/favorites/{phone} - should return favorites list"""
        response = requests.get(f"{BASE_URL}/api/favorites/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "favorites" in data
        assert isinstance(data["favorites"], list)
        print(f"✓ GET /api/favorites/{TEST_PHONE} - returned {len(data['favorites'])} favorites")
    
    def test_create_favorite_medicine(self):
        """POST /api/favorites - create a medicine favorite"""
        payload = {
            "item_type": "medicine",
            "name": f"TEST_Medicine_{uuid.uuid4().hex[:6]}",
            "price": 150.0,
            "description": "Test medicine for Iteration 191"
        }
        response = requests.post(f"{BASE_URL}/api/favorites?phone={TEST_PHONE}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "favorite" in data
        fav = data["favorite"]
        assert fav["item_type"] == "medicine"
        assert fav["name"] == payload["name"]
        assert "id" in fav
        self.__class__.created_fav_ids.append(fav["id"])
        print(f"✓ POST /api/favorites - created medicine favorite: {fav['id']}")
    
    def test_create_favorite_test(self):
        """POST /api/favorites - create a lab test favorite"""
        payload = {
            "item_type": "test",
            "name": f"TEST_LabTest_{uuid.uuid4().hex[:6]}",
            "price": 350.0,
            "description": "Test lab test for Iteration 191"
        }
        response = requests.post(f"{BASE_URL}/api/favorites?phone={TEST_PHONE}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "favorite" in data
        fav = data["favorite"]
        assert fav["item_type"] == "test"
        self.__class__.created_fav_ids.append(fav["id"])
        print(f"✓ POST /api/favorites - created test favorite: {fav['id']}")
    
    def test_get_favorites_with_filter(self):
        """GET /api/favorites/{phone}?item_type=medicine - filter favorites"""
        response = requests.get(f"{BASE_URL}/api/favorites/{TEST_PHONE}?item_type=medicine")
        assert response.status_code == 200
        data = response.json()
        assert "favorites" in data
        # All returned items should be medicines
        for fav in data["favorites"]:
            assert fav["item_type"] == "medicine"
        print(f"✓ GET /api/favorites/{TEST_PHONE}?item_type=medicine - filtered correctly")
    
    def test_delete_favorite(self):
        """DELETE /api/favorites/{fav_id} - remove a favorite"""
        if not self.__class__.created_fav_ids:
            pytest.skip("No favorites to delete")
        fav_id = self.__class__.created_fav_ids.pop()
        response = requests.delete(f"{BASE_URL}/api/favorites/{fav_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ DELETE /api/favorites/{fav_id} - deleted favorite")
    
    def test_delete_favorite_not_found(self):
        """DELETE /api/favorites/{fav_id} - 404 for non-existent"""
        response = requests.delete(f"{BASE_URL}/api/favorites/nonexistent123")
        assert response.status_code == 404
        print("✓ DELETE /api/favorites/nonexistent123 - correctly returns 404")
    
    @pytest.fixture(autouse=True, scope="class")
    def cleanup(self):
        yield
        # Cleanup remaining test favorites
        for fav_id in self.__class__.created_fav_ids:
            try:
                requests.delete(f"{BASE_URL}/api/favorites/{fav_id}")
            except:
                pass


class TestAddresses:
    """Test Saved Addresses CRUD endpoints"""
    
    created_addr_ids = []
    
    def test_get_addresses(self):
        """GET /api/addresses/{phone} - should return addresses list"""
        response = requests.get(f"{BASE_URL}/api/addresses/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "addresses" in data
        assert isinstance(data["addresses"], list)
        print(f"✓ GET /api/addresses/{TEST_PHONE} - returned {len(data['addresses'])} addresses")
    
    def test_create_address(self):
        """POST /api/addresses - create a new address"""
        payload = {
            "label": "home",
            "full_address": f"TEST_Address_{uuid.uuid4().hex[:6]}, 123 Test Street",
            "landmark": "Near Test Hospital",
            "pincode": "480001",
            "city": "Chhindwara",
            "state": "Madhya Pradesh",
            "lat": 22.0574,
            "lng": 78.9382,
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/addresses?phone={TEST_PHONE}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "address" in data
        addr = data["address"]
        assert addr["label"] == "home"
        assert addr["pincode"] == "480001"
        assert "id" in addr
        self.__class__.created_addr_ids.append(addr["id"])
        print(f"✓ POST /api/addresses - created address: {addr['id']}")
    
    def test_create_address_work(self):
        """POST /api/addresses - create a work address"""
        payload = {
            "label": "work",
            "full_address": f"TEST_WorkAddress_{uuid.uuid4().hex[:6]}, Office Building",
            "landmark": "Near Bus Stand",
            "pincode": "480002",
            "city": "Chhindwara",
            "state": "Madhya Pradesh",
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/addresses?phone={TEST_PHONE}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        self.__class__.created_addr_ids.append(data["address"]["id"])
        print(f"✓ POST /api/addresses - created work address")
    
    def test_set_default_address(self):
        """PUT /api/addresses/{address_id}/default - set address as default"""
        if not self.__class__.created_addr_ids:
            pytest.skip("No addresses to set as default")
        addr_id = self.__class__.created_addr_ids[0]
        response = requests.put(f"{BASE_URL}/api/addresses/{addr_id}/default?phone={TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ PUT /api/addresses/{addr_id}/default - set as default")
        
        # Verify the address is now default
        get_response = requests.get(f"{BASE_URL}/api/addresses/{TEST_PHONE}")
        addresses = get_response.json()["addresses"]
        default_addr = next((a for a in addresses if a["id"] == addr_id), None)
        if default_addr:
            assert default_addr.get("is_default") == True
            print(f"✓ Verified address {addr_id} is now default")
    
    def test_delete_address(self):
        """DELETE /api/addresses/{address_id} - remove an address"""
        if not self.__class__.created_addr_ids:
            pytest.skip("No addresses to delete")
        addr_id = self.__class__.created_addr_ids.pop()
        response = requests.delete(f"{BASE_URL}/api/addresses/{addr_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ DELETE /api/addresses/{addr_id} - deleted address")
    
    def test_delete_address_not_found(self):
        """DELETE /api/addresses/{address_id} - 404 for non-existent"""
        response = requests.delete(f"{BASE_URL}/api/addresses/nonexistent_addr")
        assert response.status_code == 404
        print("✓ DELETE /api/addresses/nonexistent_addr - correctly returns 404")
    
    @pytest.fixture(autouse=True, scope="class")
    def cleanup(self):
        yield
        # Cleanup remaining test addresses
        for addr_id in self.__class__.created_addr_ids:
            try:
                requests.delete(f"{BASE_URL}/api/addresses/{addr_id}")
            except:
                pass


class TestFamilyMembers:
    """Test Family Members CRUD endpoints"""
    
    created_member_ids = []
    
    def test_get_family_members(self):
        """GET /api/family/members/{phone} - should return members list"""
        response = requests.get(f"{BASE_URL}/api/family/members/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert isinstance(data["members"], list)
        print(f"✓ GET /api/family/members/{TEST_PHONE} - returned {len(data['members'])} members")
    
    def test_add_family_member_spouse(self):
        """POST /api/family/members - add a spouse"""
        payload = {
            "name": f"TEST_Spouse_{uuid.uuid4().hex[:6]}",
            "relation": "spouse",
            "age": 35,
            "gender": "female",
            "phone": "9876543211",
            "blood_group": "B+",
            "allergies": ["Penicillin"],
            "conditions": []
        }
        response = requests.post(f"{BASE_URL}/api/family/members?phone={TEST_PHONE}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "member" in data
        member = data["member"]
        assert member["relation"] == "spouse"
        assert member["gender"] == "female"
        assert "id" in member
        self.__class__.created_member_ids.append(member["id"])
        print(f"✓ POST /api/family/members - added spouse: {member['id']}")
    
    def test_add_family_member_child(self):
        """POST /api/family/members - add a child"""
        payload = {
            "name": f"TEST_Child_{uuid.uuid4().hex[:6]}",
            "relation": "child",
            "age": 8,
            "gender": "male",
            "blood_group": "O+"
        }
        response = requests.post(f"{BASE_URL}/api/family/members?phone={TEST_PHONE}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        member = data["member"]
        assert member["relation"] == "child"
        assert member["age"] == 8
        self.__class__.created_member_ids.append(member["id"])
        print(f"✓ POST /api/family/members - added child: {member['id']}")
    
    def test_add_family_member_parent(self):
        """POST /api/family/members - add a parent"""
        payload = {
            "name": f"TEST_Parent_{uuid.uuid4().hex[:6]}",
            "relation": "parent",
            "age": 65,
            "gender": "male",
            "blood_group": "A+",
            "conditions": ["diabetes", "hypertension"]
        }
        response = requests.post(f"{BASE_URL}/api/family/members?phone={TEST_PHONE}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        member = data["member"]
        assert member["relation"] == "parent"
        assert "diabetes" in member.get("conditions", [])
        self.__class__.created_member_ids.append(member["id"])
        print(f"✓ POST /api/family/members - added parent: {member['id']}")
    
    def test_delete_family_member(self):
        """DELETE /api/family/members/{member_id} - remove a family member"""
        if not self.__class__.created_member_ids:
            pytest.skip("No members to delete")
        member_id = self.__class__.created_member_ids.pop()
        response = requests.delete(f"{BASE_URL}/api/family/members/{member_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ DELETE /api/family/members/{member_id} - deleted member")
    
    def test_delete_family_member_not_found(self):
        """DELETE /api/family/members/{member_id} - 404 for non-existent"""
        response = requests.delete(f"{BASE_URL}/api/family/members/nonexistent_member")
        assert response.status_code == 404
        print("✓ DELETE /api/family/members/nonexistent_member - correctly returns 404")
    
    @pytest.fixture(autouse=True, scope="class")
    def cleanup(self):
        yield
        # Cleanup remaining test members
        for member_id in self.__class__.created_member_ids:
            try:
                requests.delete(f"{BASE_URL}/api/family/members/{member_id}")
            except:
                pass


class TestHealthStats:
    """Test Health Stats endpoint (returns MOCKED data)"""
    
    def test_get_health_stats(self):
        """GET /api/health-stats/{phone} - should return health metrics (MOCKED)"""
        response = requests.get(f"{BASE_URL}/api/health-stats/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        metrics = data["metrics"]
        assert isinstance(metrics, list)
        assert len(metrics) == 6  # 6 default metrics
        
        # Verify metric structure
        metric_keys = [m["key"] for m in metrics]
        assert "sleep" in metric_keys
        assert "steps" in metric_keys
        assert "heart_rate" in metric_keys
        assert "bmi" in metric_keys
        assert "water" in metric_keys
        assert "calories" in metric_keys
        
        # Verify metric has required fields
        sample = metrics[0]
        assert "label" in sample
        assert "value" in sample
        assert "unit" in sample
        assert "target" in sample
        assert "trend" in sample
        assert "color" in sample
        
        print(f"✓ GET /api/health-stats/{TEST_PHONE} - returned 6 MOCKED metrics")


class TestRecentOrders:
    """Test Recent Orders endpoint for quick reorder"""
    
    def test_get_recent_orders(self):
        """GET /api/recent-orders/{phone} - should return pharmacy orders and lab tests"""
        response = requests.get(f"{BASE_URL}/api/recent-orders/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "pharmacy_orders" in data
        assert "lab_tests" in data
        assert isinstance(data["pharmacy_orders"], list)
        assert isinstance(data["lab_tests"], list)
        print(f"✓ GET /api/recent-orders/{TEST_PHONE} - returned {len(data['pharmacy_orders'])} pharmacy orders, {len(data['lab_tests'])} lab tests")


class TestFCMPushNotifications:
    """Test FCM Push Notification endpoints"""
    
    test_token = f"fake_token_{uuid.uuid4().hex[:8]}"
    
    def test_register_fcm_token(self):
        """POST /api/fcm/register-token - register device token"""
        payload = {
            "token": self.__class__.test_token,
            "user_email": "test@example.com",
            "device_info": "Test Device - Iteration 191"
        }
        response = requests.post(f"{BASE_URL}/api/fcm/register-token", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ POST /api/fcm/register-token - registered token")
    
    def test_send_push_notification_to_token(self):
        """POST /api/fcm/send - send notification to specific token (will fail=1 for fake token)"""
        payload = {
            "title": "Test Notification",
            "body": "This is a test notification from Iteration 191",
            "target_token": self.__class__.test_token,
            "data": {"type": "test", "action": "view"}
        }
        response = requests.post(f"{BASE_URL}/api/fcm/send", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # For fake tokens, sent=0 and failed=1 is expected
        assert "sent" in data
        assert "failed" in data
        print(f"✓ POST /api/fcm/send - API works (sent={data['sent']}, failed={data['failed']} - expected for fake token)")
    
    def test_send_push_notification_to_email(self):
        """POST /api/fcm/send - send notification to email target"""
        payload = {
            "title": "Test via Email",
            "body": "Notification targeting email",
            "target_email": "test@example.com"
        }
        response = requests.post(f"{BASE_URL}/api/fcm/send", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ POST /api/fcm/send (email target) - API works")
    
    def test_send_push_notification_no_target(self):
        """POST /api/fcm/send - should fail without target"""
        payload = {
            "title": "No Target",
            "body": "This should fail"
        }
        response = requests.post(f"{BASE_URL}/api/fcm/send", json=payload)
        assert response.status_code == 400
        print(f"✓ POST /api/fcm/send (no target) - correctly returns 400")
    
    def test_unregister_fcm_token(self):
        """DELETE /api/fcm/unregister/{token} - unregister device token"""
        response = requests.delete(f"{BASE_URL}/api/fcm/unregister/{self.__class__.test_token}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ DELETE /api/fcm/unregister - unregistered token")


class TestHealthRemindersDefaults:
    """Test Health Reminders default templates"""
    
    def test_get_evara_reminders(self):
        """GET /api/health-reminders/defaults/evara - get Evara portal reminders"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/evara")
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        reminders = data["reminders"]
        assert len(reminders) >= 1
        # Check reminder structure
        sample = reminders[0]
        assert "id" in sample
        assert "title" in sample
        assert "body" in sample
        assert "time" in sample
        assert "portal" in sample
        print(f"✓ GET /api/health-reminders/defaults/evara - returned {len(reminders)} reminder templates")
    
    def test_get_glydex_reminders(self):
        """GET /api/health-reminders/defaults/glydex - get Glydex portal reminders"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/glydex")
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        reminders = data["reminders"]
        assert len(reminders) >= 1
        print(f"✓ GET /api/health-reminders/defaults/glydex - returned {len(reminders)} reminder templates")
    
    def test_get_reneu_reminders(self):
        """GET /api/health-reminders/defaults/reneu - get Reneu portal reminders"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/reneu")
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        print(f"✓ GET /api/health-reminders/defaults/reneu - returned {len(data['reminders'])} reminder templates")
    
    def test_get_invalid_portal_reminders(self):
        """GET /api/health-reminders/defaults/invalid - should return 404"""
        response = requests.get(f"{BASE_URL}/api/health-reminders/defaults/invalid_portal")
        assert response.status_code == 404
        print(f"✓ GET /api/health-reminders/defaults/invalid_portal - correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
