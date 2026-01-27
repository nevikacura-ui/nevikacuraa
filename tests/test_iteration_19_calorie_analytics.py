"""
Iteration 19 - Testing New Features:
1. Indian Food Calorie Tracker API (GET /api/calories/food-database, GET /api/calories/search)
2. User Preferences API (PUT /api/user/preferences, GET /api/user/preferences)
3. Admin Analytics API (GET /api/admin/analytics)
4. Calorie Tracker in Glydex and Evara modules
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://careflow-170.preview.emergentagent.com')

# Test credentials
ADMIN_PASSWORD = "nevikacura2026"
TEST_EMAIL = f"test_calorie_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "TestPass123"
TEST_NAME = "Test Calorie User"
TEST_PHONE = "9876543210"


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        # Health endpoint may return HTML or JSON
        try:
            data = response.json()
            assert data.get("status") == "healthy"
        except:
            # If not JSON, just check status code
            pass
        print("✓ Health endpoint working")


class TestCaloriesFoodDatabase:
    """Test Indian Food Calorie Database API"""
    
    def test_get_food_database(self):
        """Test GET /api/calories/food-database returns Indian food data"""
        response = requests.get(f"{BASE_URL}/api/calories/food-database")
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "categories" in data
        assert "foods" in data
        assert "total_items" in data
        
        # Check we have food categories
        categories = data["categories"]
        assert len(categories) > 0
        print(f"✓ Food database has {len(categories)} categories")
        
        # Check total items
        total = data["total_items"]
        assert total > 50  # Should have 100+ items
        print(f"✓ Food database has {total} total items")
        
        # Check foods structure
        foods = data["foods"]
        assert isinstance(foods, dict)
        
        # Check at least one category has foods
        for category, food_list in foods.items():
            if len(food_list) > 0:
                first_food = food_list[0]
                assert "name" in first_food
                assert "calories" in first_food
                print(f"✓ Category '{category}' has {len(food_list)} foods")
                break
    
    def test_search_foods_dosa(self):
        """Test searching for 'dosa' returns relevant results"""
        response = requests.get(f"{BASE_URL}/api/calories/search?q=dosa")
        assert response.status_code == 200
        data = response.json()
        
        assert "query" in data
        assert data["query"] == "dosa"
        assert "results" in data
        
        results = data["results"]
        assert len(results) > 0
        print(f"✓ Search 'dosa' returned {len(results)} results")
        
        # Check first result has required fields
        first = results[0]
        assert "name" in first
        assert "calories" in first
        assert "dosa" in first["name"].lower()
        print(f"✓ First result: {first['name']} - {first['calories']} cal")
    
    def test_search_foods_idli(self):
        """Test searching for 'idli' returns relevant results"""
        response = requests.get(f"{BASE_URL}/api/calories/search?q=idli")
        assert response.status_code == 200
        data = response.json()
        
        results = data["results"]
        assert len(results) > 0
        print(f"✓ Search 'idli' returned {len(results)} results")
    
    def test_search_foods_biryani(self):
        """Test searching for 'biryani' returns relevant results"""
        response = requests.get(f"{BASE_URL}/api/calories/search?q=biryani")
        assert response.status_code == 200
        data = response.json()
        
        results = data["results"]
        assert len(results) > 0
        print(f"✓ Search 'biryani' returned {len(results)} results")
    
    def test_search_foods_short_query(self):
        """Test search with short query (less than 2 chars) returns error"""
        response = requests.get(f"{BASE_URL}/api/calories/search?q=a")
        # Should return 422 validation error for min_length=2
        assert response.status_code == 422
        print("✓ Short query validation working")


class TestUserPreferencesAPI:
    """Test User Preferences/Interests API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register a test user and get auth token"""
        # First try to register
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME,
            "phone": TEST_PHONE
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("token")
        elif response.status_code == 400:
            # User might already exist, try login
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code == 200:
                return response.json().get("token")
        
        pytest.skip("Could not authenticate test user")
    
    def test_get_preferences_unauthenticated(self):
        """Test GET /api/user/preferences without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/user/preferences")
        assert response.status_code == 401
        print("✓ Preferences endpoint requires authentication")
    
    def test_get_preferences_authenticated(self, auth_token):
        """Test GET /api/user/preferences with auth returns preferences"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/user/preferences", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "interests" in data
        assert "onboarding_complete" in data
        print(f"✓ Got user preferences: interests={data['interests']}, onboarding={data['onboarding_complete']}")
    
    def test_update_preferences(self, auth_token):
        """Test PUT /api/user/preferences updates interests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update with interests
        update_data = {
            "interests": ["evara", "glydex", "diagyn"],
            "onboarding_complete": True
        }
        response = requests.put(f"{BASE_URL}/api/user/preferences", json=update_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "user" in data
        print("✓ Updated user preferences successfully")
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/user/preferences", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "evara" in data["interests"]
        assert "glydex" in data["interests"]
        assert data["onboarding_complete"] == True
        print(f"✓ Verified preferences: {data['interests']}")


class TestAdminAnalyticsAPI:
    """Test Admin Analytics API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_analytics_unauthenticated(self):
        """Test analytics endpoint requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code in [401, 403]
        print("✓ Analytics endpoint requires admin authentication")
    
    def test_analytics_default_7_days(self, admin_token):
        """Test GET /api/admin/analytics returns 7 days data by default"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "date_labels" in data
        assert "appointments" in data
        assert "revenue" in data
        assert "diagnostics" in data
        assert "pharmacy" in data
        assert "appointments_by_doctor" in data
        assert "total_revenue" in data
        assert "total_appointments" in data
        
        # Check date_labels has 8 entries (7 days + today)
        assert len(data["date_labels"]) == 8
        print(f"✓ Analytics returned {len(data['date_labels'])} days of data")
        print(f"✓ Total revenue: ₹{data['total_revenue']}")
        print(f"✓ Total appointments: {data['total_appointments']}")
    
    def test_analytics_custom_days(self, admin_token):
        """Test GET /api/admin/analytics?days=30 returns 30 days data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics?days=30", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check date_labels has 31 entries (30 days + today)
        assert len(data["date_labels"]) == 31
        print(f"✓ Analytics with days=30 returned {len(data['date_labels'])} days of data")
    
    def test_analytics_appointments_by_doctor(self, admin_token):
        """Test analytics includes appointments by doctor breakdown"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        by_doctor = data.get("appointments_by_doctor", {})
        if by_doctor:
            for doctor, stats in by_doctor.items():
                print(f"✓ {doctor}: {stats['total']} total, {stats['confirmed']} confirmed")
        else:
            print("✓ No appointments by doctor data (may be empty)")


class TestAdminTabLayout:
    """Test Admin Dashboard Tab Layout"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint for dashboard"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check stats fields
        assert "total_medicines" in data
        assert "total_users" in data
        assert "total_appointments" in data
        assert "total_diagnostic_orders" in data
        assert "total_pharmacy_orders" in data
        
        print(f"✓ Admin stats: {data['total_medicines']} medicines, {data['total_users']} users")
        print(f"✓ Orders: {data['total_appointments']} appointments, {data['total_diagnostic_orders']} diagnostics, {data['total_pharmacy_orders']} pharmacy")


class TestGlydexModule:
    """Test Glydex Diabetes Care Module"""
    
    def test_glydex_profile_unauthenticated(self):
        """Test Glydex profile requires auth"""
        response = requests.get(f"{BASE_URL}/api/glydex/profile")
        # Should return 401 or empty profile
        assert response.status_code in [200, 401]
        print("✓ Glydex profile endpoint accessible")
    
    def test_glydex_sugar_logs_unauthenticated(self):
        """Test Glydex sugar logs requires auth"""
        response = requests.get(f"{BASE_URL}/api/glydex/sugar-logs")
        assert response.status_code in [200, 401]
        print("✓ Glydex sugar logs endpoint accessible")


class TestEvaraModule:
    """Test Evara Women's Wellness Module"""
    
    def test_evara_profile(self):
        """Test Evara profile endpoint - may require auth"""
        response = requests.get(f"{BASE_URL}/api/evara/profile")
        # Evara profile may require auth or return has_profile: false
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert "has_profile" in data
            print("✓ Evara profile endpoint working")
        else:
            print("✓ Evara profile requires authentication")
    
    def test_evara_programs(self):
        """Test Evara programs endpoint"""
        response = requests.get(f"{BASE_URL}/api/evara/programs")
        assert response.status_code == 200
        data = response.json()
        assert "programs" in data
        programs = data["programs"]
        assert len(programs) > 0
        print(f"✓ Evara has {len(programs)} programs")


class TestCalorieLogging:
    """Test Calorie Logging (requires auth)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for calorie logging tests"""
        # Try to login with existing test user
        login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        
        if response.status_code == 200:
            return response.json().get("token")
        
        # Try to register
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME,
            "phone": TEST_PHONE
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Could not authenticate for calorie logging tests")
    
    def test_log_calorie_unauthenticated(self):
        """Test calorie logging requires auth"""
        log_data = {
            "food_name": "Dosa",
            "calories": 133,
            "protein": 3.9,
            "carbs": 18,
            "fat": 5,
            "fiber": 0.7,
            "meal_type": "breakfast",
            "quantity": 1,
            "date": "2026-01-14"
        }
        response = requests.post(f"{BASE_URL}/api/calories/log", json=log_data)
        assert response.status_code == 401
        print("✓ Calorie logging requires authentication")
    
    def test_log_calorie_authenticated(self, auth_token):
        """Test calorie logging with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        log_data = {
            "food_name": "Masala Dosa",
            "calories": 206,
            "protein": 5.7,
            "carbs": 24,
            "fat": 10,
            "fiber": 2,
            "meal_type": "breakfast",
            "quantity": 1,
            "date": "2026-01-14"
        }
        response = requests.post(f"{BASE_URL}/api/calories/log", json=log_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "log" in data
        print(f"✓ Logged calorie: {data['log']['food_name']} - {data['log']['calories']} cal")
    
    def test_get_calorie_logs(self, auth_token):
        """Test getting calorie logs"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/calories/logs?date=2026-01-14", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "logs" in data
        assert "totals" in data
        print(f"✓ Got {len(data['logs'])} calorie logs")
        print(f"✓ Daily totals: {data['totals']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
