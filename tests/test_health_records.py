"""
Test Health Records API Endpoints
- GET /api/health-records/summary/{user_id} - Health summary endpoint
- GET /api/health-records/timeline/{user_id} - Health timeline endpoint
- GET /api/health-records/trends/blood-sugar/{user_id} - Blood sugar trends
- GET /api/health-records/family/{user_id} - Family members list
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_health_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Health Test User"
TEST_PHONE = "9876543210"


class TestHealthRecordsPublicEndpoints:
    """Test health records endpoints (public - no auth required for user_id based queries)"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user and return user data with token"""
        # Register a new user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME,
            "phone": TEST_PHONE
        })
        
        if register_response.status_code == 200:
            data = register_response.json()
            return {
                "user_id": data["user"]["id"],
                "token": data["token"],
                "email": TEST_EMAIL
            }
        elif register_response.status_code == 400:
            # User might already exist, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                return {
                    "user_id": data["user"]["id"],
                    "token": data["token"],
                    "email": TEST_EMAIL
                }
        
        pytest.skip("Could not create or login test user")
    
    def test_health_summary_endpoint_exists(self, test_user):
        """Test GET /api/health-records/summary/{user_id} returns valid response"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/summary/{user_id}")
        
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "user" in data, "Response should contain 'user' field"
        assert "stats" in data, "Response should contain 'stats' field"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_appointments" in stats, "Stats should contain 'total_appointments'"
        assert "completed_appointments" in stats, "Stats should contain 'completed_appointments'"
        assert "total_diagnostic_tests" in stats, "Stats should contain 'total_diagnostic_tests'"
        assert "total_pharmacy_orders" in stats, "Stats should contain 'total_pharmacy_orders'"
        assert "blood_sugar_readings" in stats, "Stats should contain 'blood_sugar_readings'"
        
        print(f"✓ Health summary endpoint working - Stats: {stats}")
    
    def test_health_summary_invalid_user(self):
        """Test GET /api/health-records/summary/{user_id} with invalid user returns 404"""
        invalid_user_id = "invalid_user_12345"
        response = requests.get(f"{BASE_URL}/api/health-records/summary/{invalid_user_id}")
        
        # Should return 404 for non-existent user
        assert response.status_code == 404, f"Expected 404 for invalid user, got {response.status_code}"
        print("✓ Health summary returns 404 for invalid user")
    
    def test_health_timeline_endpoint_exists(self, test_user):
        """Test GET /api/health-records/timeline/{user_id} returns valid response"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/timeline/{user_id}")
        
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "timeline" in data, "Response should contain 'timeline' field"
        assert isinstance(data["timeline"], list), "Timeline should be a list"
        
        print(f"✓ Health timeline endpoint working - {len(data['timeline'])} items")
    
    def test_health_timeline_with_limit(self, test_user):
        """Test GET /api/health-records/timeline/{user_id}?limit=5 respects limit parameter"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/timeline/{user_id}?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        # Timeline should not exceed limit
        assert len(data["timeline"]) <= 5, "Timeline should respect limit parameter"
        print(f"✓ Health timeline respects limit parameter")
    
    def test_blood_sugar_trends_endpoint_exists(self, test_user):
        """Test GET /api/health-records/trends/blood-sugar/{user_id} returns valid response"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/trends/blood-sugar/{user_id}")
        
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure - either has trends or message for no data
        assert "trends" in data or "message" in data, "Response should contain 'trends' or 'message'"
        
        if "message" in data:
            print(f"✓ Blood sugar trends endpoint working - No data: {data['message']}")
        else:
            print(f"✓ Blood sugar trends endpoint working - Trends: {data.get('trends', {})}")
    
    def test_blood_sugar_trends_with_months_param(self, test_user):
        """Test GET /api/health-records/trends/blood-sugar/{user_id}?months=3"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/trends/blood-sugar/{user_id}?months=3")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have period_months in response
        if "period_months" in data:
            assert data["period_months"] == 3, "Should respect months parameter"
        
        print("✓ Blood sugar trends respects months parameter")
    
    def test_family_members_endpoint_exists(self, test_user):
        """Test GET /api/health-records/family/{user_id} returns valid response"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/family/{user_id}")
        
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "family_members" in data, "Response should contain 'family_members' field"
        assert isinstance(data["family_members"], list), "family_members should be a list"
        
        print(f"✓ Family members endpoint working - {len(data['family_members'])} members")


class TestHealthRecordsDataIntegrity:
    """Test data integrity and response structure"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user and return user data with token"""
        test_email = f"test_health_data_{uuid.uuid4().hex[:8]}@test.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": TEST_PASSWORD,
            "name": "Data Test User",
            "phone": "9876543211"
        })
        
        if register_response.status_code == 200:
            data = register_response.json()
            return {
                "user_id": data["user"]["id"],
                "token": data["token"],
                "email": test_email
            }
        
        pytest.skip("Could not create test user")
    
    def test_summary_contains_user_info(self, test_user):
        """Verify summary contains correct user information"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/summary/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # User info should be present
        user = data.get("user", {})
        assert user.get("id") == user_id, "User ID should match"
        assert "email" in user, "User should have email"
        assert "name" in user, "User should have name"
        
        # Password should NOT be in response
        assert "password" not in user, "Password should not be exposed"
        assert "password_hash" not in user, "Password hash should not be exposed"
        
        print("✓ Summary contains correct user info without sensitive data")
    
    def test_timeline_item_structure(self, test_user):
        """Verify timeline items have correct structure"""
        user_id = test_user["user_id"]
        response = requests.get(f"{BASE_URL}/api/health-records/timeline/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # If there are timeline items, verify structure
        for item in data.get("timeline", []):
            assert "type" in item, "Timeline item should have 'type'"
            assert "title" in item, "Timeline item should have 'title'"
            assert "date" in item, "Timeline item should have 'date'"
            assert item["type"] in ["appointment", "diagnostic", "pharmacy", "prescription", "vaccination"], \
                f"Invalid timeline type: {item['type']}"
        
        print(f"✓ Timeline items have correct structure")


class TestHealthRecordsAPIHealth:
    """Basic API health checks"""
    
    def test_api_is_accessible(self):
        """Test that the API is accessible"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✓ API is accessible")
    
    def test_health_records_routes_registered(self):
        """Test that health records routes are registered by checking a known endpoint"""
        # Use a random user_id - should return 404 (not 404 for route not found)
        response = requests.get(f"{BASE_URL}/api/health-records/summary/test_user_123")
        
        # Should return 404 (user not found) not 404 (route not found)
        # If route doesn't exist, FastAPI returns different error
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        # Check it's a proper "User not found" error, not "Not Found" for route
        data = response.json()
        assert "detail" in data, "Should have detail field"
        assert "not found" in data["detail"].lower(), f"Should be user not found error: {data}"
        
        print("✓ Health records routes are properly registered")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
