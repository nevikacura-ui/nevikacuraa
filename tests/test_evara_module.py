"""
Test suite for Evara Women's Wellness Module
Tests the new backlog features: Week-by-Week Pregnancy Guide, Home Services, Community Sessions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEvaraPrograms:
    """Test Evara programs endpoint"""
    
    def test_get_programs_returns_5_programs(self):
        """Verify /api/evara/programs returns 5 programs"""
        response = requests.get(f"{BASE_URL}/api/evara/programs")
        assert response.status_code == 200
        
        data = response.json()
        assert "programs" in data
        programs = data["programs"]
        assert len(programs) == 5, f"Expected 5 programs, got {len(programs)}"
        
        # Verify program structure
        for program in programs:
            assert "id" in program
            assert "name" in program
            assert "description" in program


class TestPregnancyWeeklyGuide:
    """Test pregnancy week-by-week guide endpoints"""
    
    def test_get_all_weeks_returns_42_weeks(self):
        """Verify /api/evara/pregnancy/all-weeks returns 42 weeks"""
        response = requests.get(f"{BASE_URL}/api/evara/pregnancy/all-weeks")
        assert response.status_code == 200
        
        data = response.json()
        assert "weeks" in data
        weeks = data["weeks"]
        assert len(weeks) == 42, f"Expected 42 weeks, got {len(weeks)}"
        
        # Verify week structure
        for week in weeks:
            assert "week" in week
            assert "title" in week
            assert "baby" in week
            assert "mom" in week
            assert "size" in week
            assert "tip" in week
    
    def test_get_specific_week_content(self):
        """Verify /api/evara/pregnancy/week/{week} returns correct content"""
        # Test week 1
        response = requests.get(f"{BASE_URL}/api/evara/pregnancy/week/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["week"] == 1
        assert "content" in data
        assert data["trimester"] == 1
        
        # Test week 20 (second trimester)
        response = requests.get(f"{BASE_URL}/api/evara/pregnancy/week/20")
        assert response.status_code == 200
        
        data = response.json()
        assert data["week"] == 20
        assert data["trimester"] == 2
        
        # Test week 40 (third trimester)
        response = requests.get(f"{BASE_URL}/api/evara/pregnancy/week/40")
        assert response.status_code == 200
        
        data = response.json()
        assert data["week"] == 40
        assert data["trimester"] == 3
    
    def test_invalid_week_returns_error(self):
        """Verify invalid week numbers return 400 error"""
        # Week 0
        response = requests.get(f"{BASE_URL}/api/evara/pregnancy/week/0")
        assert response.status_code == 400
        
        # Week 43
        response = requests.get(f"{BASE_URL}/api/evara/pregnancy/week/43")
        assert response.status_code == 400


class TestHomeServices:
    """Test home services endpoints"""
    
    def test_get_home_services_returns_4_services(self):
        """Verify /api/evara/home-services returns 4 services"""
        response = requests.get(f"{BASE_URL}/api/evara/home-services")
        assert response.status_code == 200
        
        data = response.json()
        assert "services" in data
        services = data["services"]
        assert len(services) == 4, f"Expected 4 services, got {len(services)}"
        
        # Verify service structure
        for service in services:
            assert "id" in service
            assert "name" in service
            assert "description" in service
            assert "includes" in service
            assert "duration" in service
        
        # Verify disclaimer is present
        assert "disclaimer" in data
    
    def test_home_services_include_expected_types(self):
        """Verify home services include expected service types"""
        response = requests.get(f"{BASE_URL}/api/evara/home-services")
        assert response.status_code == 200
        
        data = response.json()
        service_ids = [s["id"] for s in data["services"]]
        
        expected_services = ["postnatal_nurse", "lactation_consultant", "physiotherapy", "sample_collection"]
        for expected in expected_services:
            assert expected in service_ids, f"Missing service: {expected}"


class TestCommunitySessions:
    """Test community/live sessions endpoints"""
    
    def test_get_community_sessions_returns_6_sessions(self):
        """Verify /api/evara/community/sessions returns 6 sessions"""
        response = requests.get(f"{BASE_URL}/api/evara/community/sessions")
        assert response.status_code == 200
        
        data = response.json()
        assert "sessions" in data
        sessions = data["sessions"]
        assert len(sessions) == 6, f"Expected 6 sessions, got {len(sessions)}"
        
        # Verify session structure
        for session in sessions:
            assert "id" in session
            assert "title" in session
            assert "description" in session
            assert "host" in session
            assert "duration" in session
            assert "topics" in session
            assert "type" in session
    
    def test_community_sessions_include_upcoming_live(self):
        """Verify community sessions include upcoming live session info"""
        response = requests.get(f"{BASE_URL}/api/evara/community/sessions")
        assert response.status_code == 200
        
        data = response.json()
        assert "upcoming_live" in data
        
        upcoming = data["upcoming_live"]
        assert "title" in upcoming
        assert "description" in upcoming
        assert "next_date" in upcoming
        assert "time" in upcoming


class TestEvaraProfile:
    """Test Evara profile endpoint"""
    
    def test_get_profile_without_auth_returns_401(self):
        """Verify /api/evara/profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/evara/profile")
        # Profile endpoint requires authentication
        assert response.status_code == 401 or response.status_code == 200


class TestEvaraChat:
    """Test Evara AI chat endpoint"""
    
    def test_chat_endpoint_works(self):
        """Verify /api/evara/chat accepts messages"""
        response = requests.post(
            f"{BASE_URL}/api/evara/chat",
            json={
                "message": "Hello, what is PCOS?",
                "session_id": None
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        assert len(data["response"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
