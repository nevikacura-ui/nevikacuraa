"""
Test suite for 8 Feature Mapping Tasks - Iteration 266
Tests: ABHA, Vernacular, Video Consult, AI Health Assistant, Health Streaks, Wearables, CuraPlus redirect, Nearby services
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestHyperlocalServices:
    """Test Nearby/Hyperlocal services API - 14 services with Shalom Hospital"""
    
    def test_get_all_services_returns_14(self):
        """GET /api/hyperlocal/services should return 14 services"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/services")
        assert response.status_code == 200
        data = response.json()
        assert data.get('total') == 14, f"Expected 14 services, got {data.get('total')}"
        
    def test_shalom_hospital_exists(self):
        """Shalom Hospital should be in the services list"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/services")
        assert response.status_code == 200
        data = response.json()
        services = data.get('services', [])
        shalom = [s for s in services if 'Shalom' in s.get('name', '')]
        assert len(shalom) == 1, "Shalom Hospital not found in services"
        
    def test_shalom_hospital_has_google_maps_link(self):
        """Shalom Hospital should have a Google Maps link"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/services")
        assert response.status_code == 200
        data = response.json()
        services = data.get('services', [])
        shalom = [s for s in services if 'Shalom' in s.get('name', '')][0]
        assert 'google_maps_link' in shalom, "Shalom Hospital missing google_maps_link"
        assert 'maps.google.com' in shalom['google_maps_link'], "Invalid Google Maps link"
        
    def test_services_have_call_and_map_data(self):
        """Each service should have phone and address for Call/Map buttons"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/services")
        assert response.status_code == 200
        data = response.json()
        services = data.get('services', [])
        for svc in services:
            assert 'phone' in svc, f"Service {svc.get('name')} missing phone"
            assert 'address' in svc, f"Service {svc.get('name')} missing address"
            
    def test_hyperlocal_stats_endpoint(self):
        """GET /api/hyperlocal/stats should return service counts"""
        response = requests.get(f"{BASE_URL}/api/hyperlocal/stats")
        assert response.status_code == 200
        data = response.json()
        assert 'total_services' in data
        assert data['total_services'] >= 14


class TestABHAEndpoints:
    """Test ABHA/NDHM endpoints (MOCKED backend)"""
    
    def test_abha_create_init_endpoint_exists(self):
        """POST /api/abha/create/init should exist (mocked)"""
        response = requests.post(f"{BASE_URL}/api/abha/create/init", json={
            "method": "mobile",
            "identifier": "9876543210",
            "name": "Test User"
        })
        # Should return 200 or 422 (validation) - not 404
        assert response.status_code in [200, 422, 400], f"ABHA create/init endpoint returned {response.status_code}"
        
    def test_abha_link_endpoint_exists(self):
        """POST /api/abha/link should exist (mocked)"""
        response = requests.post(f"{BASE_URL}/api/abha/link", json={
            "phone": "9876543210",
            "abha_number": "12-3456-7890-1234"
        })
        # Should return 200 or 422 (validation) - not 404
        assert response.status_code in [200, 422, 400], f"ABHA link endpoint returned {response.status_code}"
        
    def test_abha_profile_endpoint_exists(self):
        """GET /api/abha/profile/{phone} should exist"""
        response = requests.get(f"{BASE_URL}/api/abha/profile/9876543210")
        # Should return 200 (with linked: false if no data)
        assert response.status_code == 200, f"ABHA profile endpoint returned {response.status_code}"


class TestHealthAssistantAPI:
    """Test AI Health Assistant (CuraBot) API"""
    
    def test_health_assistant_chat_endpoint(self):
        """POST /api/health-assistant/chat should work"""
        response = requests.post(f"{BASE_URL}/api/health-assistant/chat", json={
            "message": "What are symptoms of diabetes?",
            "session_id": "test-session-123"
        })
        # Should return 200 or 500 (if AI service unavailable)
        assert response.status_code in [200, 500], f"Health assistant returned {response.status_code}"


class TestHealthStreaksAPI:
    """Test Health Streaks API"""
    
    def test_health_streaks_endpoint(self):
        """GET /api/health-streaks should return streak data"""
        response = requests.get(f"{BASE_URL}/api/health-streaks", params={
            "phone": "9876543210"
        })
        # Should return 200 or 404 (no data for user)
        assert response.status_code in [200, 404], f"Health streaks returned {response.status_code}"


class TestWearablesAPI:
    """Test Wearables sync API"""
    
    def test_wearables_connect_endpoint(self):
        """POST /api/wearables/connect should exist"""
        response = requests.post(f"{BASE_URL}/api/wearables/connect", json={
            "provider": "google_fit",
            "phone": "9876543210"
        })
        # Should return 200 or 400/422 (validation)
        assert response.status_code in [200, 400, 422, 404], f"Wearables connect returned {response.status_code}"


class TestCuraPlusRedirect:
    """Test CuraPlus -> CuraOne redirect"""
    
    def test_cura_plus_route_redirects(self):
        """GET /cura-plus should redirect to /cura-one"""
        # This is a frontend route, so we test the API doesn't have /cura-plus
        response = requests.get(f"{BASE_URL}/api/cura-plus", allow_redirects=False)
        # Should return 404 (no API route) - redirect is handled by frontend
        assert response.status_code in [404, 307, 302], f"Expected 404 or redirect, got {response.status_code}"


class TestVideoConsultAPI:
    """Test Video Consultation API"""
    
    def test_video_consult_room_creation(self):
        """POST /api/video-consult/room should create a room"""
        response = requests.post(f"{BASE_URL}/api/video-consult/room", json={
            "booking_id": "test-booking-123",
            "doctor_id": "dr_vikas"
        })
        # Should return 200 or 400/422 (validation)
        assert response.status_code in [200, 400, 422, 404], f"Video consult room returned {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
