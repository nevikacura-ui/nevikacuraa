"""
Health Streak Gamification Feature Tests
Tests for: GET /api/health-streak/{phone}, POST /api/health-streak/log, GET /api/health-streak/leaderboard/{portal}
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthStreakAPI:
    """Health Streak API endpoint tests"""
    
    def test_get_health_streak_existing_user(self):
        """Test GET /api/health-streak/{phone} for existing user"""
        response = requests.get(f"{BASE_URL}/api/health-streak/9403890429")
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "streak" in data
        assert "today_steps" in data
        assert "today_goal_reached" in data
        assert "rewards" in data
        
        # Validate data types
        assert isinstance(data["streak"], int)
        assert isinstance(data["today_steps"], int)
        assert isinstance(data["today_goal_reached"], bool)
        assert isinstance(data["rewards"], dict)
        
        # Validate rewards structure
        assert "consultation" in data["rewards"]
        assert "delivery" in data["rewards"]
        print(f"✓ GET health-streak for existing user: streak={data['streak']}, steps={data['today_steps']}")
    
    def test_get_health_streak_new_user(self):
        """Test GET /api/health-streak/{phone} for new user returns defaults"""
        test_phone = f"TEST_NEW_{datetime.now().strftime('%H%M%S')}"
        response = requests.get(f"{BASE_URL}/api/health-streak/{test_phone}")
        assert response.status_code == 200
        
        data = response.json()
        # New user should have zero values
        assert data["streak"] == 0
        assert data["today_steps"] == 0
        assert data["today_goal_reached"] == False
        assert data["rewards"]["consultation"] == False
        assert data["rewards"]["delivery"] == False
        print(f"✓ GET health-streak for new user returns defaults")
    
    def test_log_steps_creates_new_record(self):
        """Test POST /api/health-streak/log creates a new record"""
        test_phone = f"TEST_LOG_{datetime.now().strftime('%H%M%S')}"
        
        # Log steps for new user
        response = requests.post(
            f"{BASE_URL}/api/health-streak/log",
            json={"phone": test_phone, "steps": 3000}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["today_steps"] == 3000
        assert data["streak"] == 0  # Not reached goal yet
        assert data["today_goal_reached"] == False
        print(f"✓ POST log steps creates new record: {data['today_steps']} steps")
    
    def test_log_steps_accumulates(self):
        """Test POST /api/health-streak/log accumulates steps within a day"""
        test_phone = f"TEST_ACCUM_{datetime.now().strftime('%H%M%S')}"
        
        # First log
        response1 = requests.post(
            f"{BASE_URL}/api/health-streak/log",
            json={"phone": test_phone, "steps": 3000}
        )
        assert response1.status_code == 200
        assert response1.json()["today_steps"] == 3000
        
        # Second log - should accumulate
        response2 = requests.post(
            f"{BASE_URL}/api/health-streak/log",
            json={"phone": test_phone, "steps": 4000}
        )
        assert response2.status_code == 200
        assert response2.json()["today_steps"] == 7000  # 3000 + 4000
        print(f"✓ POST log steps accumulates: 3000 + 4000 = {response2.json()['today_steps']}")
    
    def test_log_steps_goal_reached_updates_streak(self):
        """Test POST /api/health-streak/log updates streak when 10K goal is reached"""
        test_phone = f"TEST_GOAL_{datetime.now().strftime('%H%M%S')}"
        
        # Log 10000 steps to reach goal
        response = requests.post(
            f"{BASE_URL}/api/health-streak/log",
            json={"phone": test_phone, "steps": 10000}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["today_steps"] == 10000
        assert data["today_goal_reached"] == True
        assert data["streak"] == 1  # Streak should be 1 on first goal
        print(f"✓ POST log steps goal reached: streak={data['streak']}, goal_reached={data['today_goal_reached']}")
    
    def test_log_steps_exceeding_goal(self):
        """Test POST /api/health-streak/log handles steps exceeding goal"""
        test_phone = f"TEST_EXCEED_{datetime.now().strftime('%H%M%S')}"
        
        # Log 15000 steps
        response = requests.post(
            f"{BASE_URL}/api/health-streak/log",
            json={"phone": test_phone, "steps": 15000}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["today_steps"] == 15000
        assert data["today_goal_reached"] == True
        assert data["streak"] == 1
        print(f"✓ POST log steps exceeding goal: {data['today_steps']} steps")
    
    def test_leaderboard_returns_data(self):
        """Test GET /api/health-streak/leaderboard/all returns leaderboard data"""
        response = requests.get(f"{BASE_URL}/api/health-streak/leaderboard/all")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "leaderboard" in data
        assert "portal" in data
        assert data["portal"] == "all"
        
        # Validate leaderboard structure
        assert isinstance(data["leaderboard"], list)
        if len(data["leaderboard"]) > 0:
            leader = data["leaderboard"][0]
            assert "current_streak" in leader
            assert "name" in leader
            # Phone should be masked for privacy
            if "phone" in leader:
                phone = leader["phone"]
                assert "***" in phone  # Should be masked
        print(f"✓ GET leaderboard: {len(data['leaderboard'])} entries")
    
    def test_leaderboard_sorted_by_streak(self):
        """Test GET /api/health-streak/leaderboard returns sorted by streak descending"""
        response = requests.get(f"{BASE_URL}/api/health-streak/leaderboard/all")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        # Verify sorted by streak descending
        for i in range(len(leaderboard) - 1):
            current_streak = leaderboard[i].get("current_streak", 0)
            next_streak = leaderboard[i + 1].get("current_streak", 0)
            assert current_streak >= next_streak, "Leaderboard not sorted by streak"
        print(f"✓ GET leaderboard sorted by streak descending")
    
    def test_log_steps_invalid_data(self):
        """Test POST /api/health-streak/log handles missing data"""
        # Missing steps field
        response = requests.post(
            f"{BASE_URL}/api/health-streak/log",
            json={"phone": "TEST_INVALID"}
        )
        # Should return 422 for validation error
        assert response.status_code == 422
        print(f"✓ POST log steps validates required fields")
    
    def test_rewards_unlock_at_21_days(self):
        """Test rewards structure - not unlocked below 21 days"""
        test_phone = f"TEST_REWARDS_{datetime.now().strftime('%H%M%S')}"
        
        response = requests.post(
            f"{BASE_URL}/api/health-streak/log",
            json={"phone": test_phone, "steps": 10000}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Rewards should not be unlocked at streak of 1
        assert data["rewards"]["consultation"] == False
        assert data["rewards"]["delivery"] == False
        print(f"✓ Rewards not unlocked at streak={data['streak']} (requires 21)")


class TestWellnessTipsAPI:
    """Wellness Tips API endpoint tests"""
    
    def test_wellness_tips_returns_tips(self):
        """Test GET /api/wellness-tips/{user_id} returns tips"""
        response = requests.get(f"{BASE_URL}/api/wellness-tips/test_user")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "tips" in data
        assert isinstance(data["tips"], list)
        assert len(data["tips"]) > 0
        
        # Validate tip structure
        tip = data["tips"][0]
        assert "category" in tip
        assert "tip" in tip
        print(f"✓ GET wellness-tips returns {len(data['tips'])} tips")


# Cleanup fixture - delete test data after tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Note: Test data with TEST_ prefix created during tests"""
    yield
    # Cleanup would be done here if needed
    print("Test data cleanup note: TEST_ prefixed records may remain in DB")
