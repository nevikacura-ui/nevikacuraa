"""
Test Suite for Feature 5 (AI Health Assistant), Feature 9 (CuraPlus Subscriptions), Feature 10 (Hyperlocal Health Network)
Iteration 262 - Testing new Indian market features
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAssistantAPI:
    """Feature 5: AI Health Assistant with Gemini chatbot"""
    
    def test_health_tips_endpoint(self):
        """GET /api/health-assistant/tips returns 6 health tips"""
        response = requests.get(f"{BASE_URL}/api/health-assistant/tips")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tips" in data, "Response should contain 'tips' key"
        tips = data["tips"]
        assert len(tips) == 6, f"Expected 6 tips, got {len(tips)}"
        
        # Verify tip structure
        for tip in tips:
            assert "category" in tip, "Each tip should have 'category'"
            assert "tip" in tip, "Each tip should have 'tip'"
            assert "icon" in tip, "Each tip should have 'icon'"
        
        # Verify categories
        categories = [t["category"] for t in tips]
        expected_categories = ["Nutrition", "Hydration", "Exercise", "Sleep", "Mental Health", "Preventive Care"]
        for cat in expected_categories:
            assert cat in categories, f"Missing category: {cat}"
        
        print(f"PASS: Health tips endpoint returns {len(tips)} tips with correct structure")
    
    def test_chat_endpoint_basic(self):
        """POST /api/health-assistant/chat with message returns AI reply"""
        payload = {
            "message": "What are home remedies for cold?",
            "session_id": None,
            "phone": "9999999999"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-assistant/chat", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "session_id" in data, "Response should contain 'session_id'"
        assert "reply" in data, "Response should contain 'reply'"
        assert len(data["reply"]) > 0, "Reply should not be empty"
        assert data["session_id"] is not None, "Session ID should be generated"
        
        print(f"PASS: Chat endpoint returns AI reply with session_id: {data['session_id'][:8]}...")
        return data["session_id"]
    
    def test_chat_endpoint_with_session(self):
        """POST /api/health-assistant/chat maintains conversation context"""
        # First message
        payload1 = {
            "message": "Tell me about diabetes",
            "session_id": None,
            "phone": "TEST_9876543210"
        }
        
        response1 = requests.post(f"{BASE_URL}/api/health-assistant/chat", json=payload1)
        assert response1.status_code == 200
        session_id = response1.json()["session_id"]
        
        # Second message with same session
        payload2 = {
            "message": "What diet should I follow?",
            "session_id": session_id,
            "phone": "TEST_9876543210"
        }
        
        response2 = requests.post(f"{BASE_URL}/api/health-assistant/chat", json=payload2)
        assert response2.status_code == 200
        
        data2 = response2.json()
        assert data2["session_id"] == session_id, "Session ID should be maintained"
        assert "message_count" in data2, "Response should contain message_count"
        assert data2["message_count"] >= 4, "Should have at least 4 messages (2 user + 2 assistant)"
        
        print(f"PASS: Chat maintains session context, message_count: {data2['message_count']}")
    
    def test_get_sessions_endpoint(self):
        """GET /api/health-assistant/sessions/{phone} returns user sessions"""
        phone = "TEST_9876543210"
        response = requests.get(f"{BASE_URL}/api/health-assistant/sessions/{phone}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sessions" in data, "Response should contain 'sessions'"
        assert isinstance(data["sessions"], list), "Sessions should be a list"
        
        print(f"PASS: Sessions endpoint returns {len(data['sessions'])} sessions for phone")
    
    def test_get_session_by_id(self):
        """GET /api/health-assistant/session/{session_id} returns full history"""
        # First create a session
        payload = {
            "message": "Test message for session retrieval",
            "session_id": None,
            "phone": "TEST_1234567890"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/health-assistant/chat", json=payload)
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Now retrieve it
        response = requests.get(f"{BASE_URL}/api/health-assistant/session/{session_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should contain 'messages'"
        assert len(data["messages"]) >= 2, "Should have at least 2 messages"
        
        print(f"PASS: Session retrieval returns {len(data['messages'])} messages")
    
    def test_delete_session(self):
        """DELETE /api/health-assistant/session/{session_id} deletes session"""
        # First create a session
        payload = {
            "message": "Test message for deletion",
            "session_id": None,
            "phone": "TEST_delete_session"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/health-assistant/chat", json=payload)
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/health-assistant/session/{session_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/health-assistant/session/{session_id}")
        assert get_response.status_code == 404, "Session should be deleted"
        
        print(f"PASS: Session deleted successfully")


class TestCuraPlusSubscriptions:
    """Feature 9: CuraPlus Subscription Bundles"""
    
    def test_subscription_plans_endpoint(self):
        """GET /api/subscriptions/plans returns subscription plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "plans" in data or "success" in data, "Response should contain plans data"
        
        # Check if plans exist (either as dict or list)
        plans = data.get("plans", data)
        assert plans is not None, "Plans should not be None"
        
        print(f"PASS: Subscription plans endpoint returns data")
    
    def test_subscription_status_endpoint(self):
        """GET /api/subscriptions/status/{phone} returns subscription status"""
        phone = "9999999999"
        response = requests.get(f"{BASE_URL}/api/subscriptions/status/{phone}")
        
        # This endpoint may return 200 with status or 404 if not found
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Subscription status endpoint returns data: {data.get('status', 'unknown')}")
        else:
            print(f"PASS: Subscription status endpoint returns 404 for non-subscribed user")
    
    def test_membership_plans_endpoint(self):
        """GET /api/subscriptions/membership-plans returns membership plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/membership-plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "plans" in data or "family_plans" in data, "Response should contain plans"
        
        print(f"PASS: Membership plans endpoint returns data")


class TestHyperlocalHealthNetwork:
    """Feature 10: Hyperlocal Health Network with nearby services"""
    
    def test_services_endpoint_basic(self):
        """GET /api/hyperlocal/services returns nearby health services"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/services")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "services" in data, "Response should contain 'services'"
        assert "total" in data, "Response should contain 'total'"
        
        services = data["services"]
        assert len(services) > 0, "Should have at least some services (demo data)"
        
        # Verify service structure
        for svc in services[:3]:  # Check first 3
            assert "name" in svc, "Service should have 'name'"
            assert "type" in svc, "Service should have 'type'"
            assert "address" in svc, "Service should have 'address'"
        
        print(f"PASS: Services endpoint returns {len(services)} services")
    
    def test_services_with_location(self):
        """GET /api/hyperlocal/services with lat/lng returns services with distances"""
        # Vasai coordinates
        params = {
            "lat": 19.3691,
            "lng": 72.8304,
            "radius": 25
        }
        
        response = requests.get(f"{BASE_URL}/api/hyperlocal/services", params=params)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        services = data["services"]
        
        # Check that distances are calculated
        services_with_distance = [s for s in services if s.get("distance_km") is not None]
        assert len(services_with_distance) > 0, "Should have services with calculated distances"
        
        # Verify distances are within radius
        for svc in services_with_distance:
            assert svc["distance_km"] <= 25, f"Service {svc['name']} distance {svc['distance_km']} exceeds radius"
        
        print(f"PASS: Services with location returns {len(services_with_distance)} services with distances")
    
    def test_services_filter_by_type(self):
        """GET /api/hyperlocal/services with type filter works"""
        types_to_test = ["pharmacy", "hospital", "clinic", "lab"]
        
        for service_type in types_to_test:
            response = requests.get(f"{BASE_URL}/api/hyperlocal/services", params={"type": service_type})
            assert response.status_code == 200, f"Expected 200 for type {service_type}"
            
            data = response.json()
            services = data["services"]
            
            # All returned services should be of the requested type
            for svc in services:
                assert svc["type"] == service_type, f"Service type mismatch: expected {service_type}, got {svc['type']}"
        
        print(f"PASS: Service type filtering works for all types")
    
    def test_stats_endpoint(self):
        """GET /api/hyperlocal/stats returns service counts by type"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify stats structure
        expected_keys = ["total_services", "pharmacies", "clinics", "hospitals", "labs", "blood_banks", "ambulances"]
        for key in expected_keys:
            assert key in data, f"Stats should contain '{key}'"
            assert isinstance(data[key], int), f"'{key}' should be an integer"
        
        # Total should be sum of all types
        type_sum = data["pharmacies"] + data["clinics"] + data["hospitals"] + data["labs"] + data["blood_banks"] + data["ambulances"]
        assert data["total_services"] == type_sum, f"Total {data['total_services']} should equal sum of types {type_sum}"
        
        print(f"PASS: Stats endpoint returns correct counts - Total: {data['total_services']}")
    
    def test_emergency_services_endpoint(self):
        """GET /api/hyperlocal/services/emergency returns emergency services"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/services/emergency")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "services" in data, "Response should contain 'services'"
        
        services = data["services"]
        
        # All returned services should have emergency_available = True
        for svc in services:
            assert svc.get("emergency_available") == True, f"Service {svc['name']} should have emergency_available=True"
        
        print(f"PASS: Emergency services endpoint returns {len(services)} emergency-ready services")


class TestHomePageRegression:
    """Regression test for Home page"""
    
    def test_home_page_loads(self):
        """Home page (/) loads correctly"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Home page loads correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
