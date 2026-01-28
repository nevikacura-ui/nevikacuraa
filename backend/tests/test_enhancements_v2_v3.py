"""
Test Enhancement APIs V2 and V3 - Backend Testing
Tests for: Community Forums, Digital Signage, Revenue Forecasting, Shift Schedule,
Room Availability, Inventory Alerts, Wearable Insights, Health Coach Advice,
Audit Trail, Billing Reconciliation
"""
import pytest
import requests
import os
import jwt
from datetime import datetime, timezone, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_here')


def generate_test_token(user_id="test_user_123", name="Test User"):
    """Generate a valid JWT token for testing"""
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_headers():
    """Generate auth headers with valid JWT token"""
    token = generate_test_token()
    return {"Authorization": f"Bearer {token}"}


class TestCommunityForumPosts:
    """Test GET /api/enhancements/community/posts - Community forum posts listing"""
    
    def test_get_community_posts_success(self, api_client):
        """Test community posts endpoint returns proper structure"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/community/posts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data, "Response should contain 'posts' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "page" in data, "Response should contain 'page' key"
        assert isinstance(data["posts"], list), "Posts should be a list"
        
        # Verify post structure if posts exist
        if data["posts"]:
            post = data["posts"][0]
            assert "id" in post, "Post should have 'id'"
            assert "title" in post, "Post should have 'title'"
            assert "content" in post, "Post should have 'content'"
            assert "category" in post, "Post should have 'category'"
            print(f"✓ Community posts returned {len(data['posts'])} posts")
    
    def test_get_community_posts_with_category_filter(self, api_client):
        """Test community posts with category filter"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/community/posts?category=diabetes")
        
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        print(f"✓ Category filter works, returned {len(data['posts'])} posts")
    
    def test_get_community_posts_pagination(self, api_client):
        """Test community posts pagination"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/community/posts?page=1&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        print(f"✓ Pagination works, page {data['page']}")


class TestDigitalSignageContent:
    """Test GET /api/admin/signage/content - Digital signage content"""
    
    def test_get_signage_content_success(self, api_client):
        """Test digital signage content endpoint returns proper structure"""
        response = api_client.get(f"{BASE_URL}/api/admin/signage/content")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "content" in data, "Response should contain 'content' key"
        assert isinstance(data["content"], list), "Content should be a list"
        
        # Verify content structure
        if data["content"]:
            content_item = data["content"][0]
            assert "type" in content_item, "Content item should have 'type'"
            assert "data" in content_item, "Content item should have 'data'"
            assert "duration" in content_item, "Content item should have 'duration'"
        
        assert "settings" in data, "Response should contain 'settings'"
        print(f"✓ Digital signage returned {len(data['content'])} content items")
    
    def test_get_signage_content_with_location(self, api_client):
        """Test digital signage with location parameter"""
        response = api_client.get(f"{BASE_URL}/api/admin/signage/content?location=lobby")
        
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        print("✓ Location filter works for signage content")


class TestRevenueForecasting:
    """Test GET /api/admin/analytics/revenue-forecast - Revenue forecasting"""
    
    def test_get_revenue_forecast_success(self, api_client, auth_headers):
        """Test revenue forecast endpoint returns proper structure"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/analytics/revenue-forecast",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "current_month" in data, "Response should contain 'current_month'"
        assert "forecast" in data, "Response should contain 'forecast'"
        assert "revenue_by_service" in data, "Response should contain 'revenue_by_service'"
        assert "trends" in data, "Response should contain 'trends'"
        
        # Verify current month structure
        current = data["current_month"]
        assert "revenue" in current, "Current month should have 'revenue'"
        assert "target" in current, "Current month should have 'target'"
        
        # Verify forecast structure
        assert isinstance(data["forecast"], list), "Forecast should be a list"
        if data["forecast"]:
            forecast_item = data["forecast"][0]
            assert "month" in forecast_item
            assert "predicted_revenue" in forecast_item
            assert "confidence" in forecast_item
        
        print(f"✓ Revenue forecast returned with {len(data['forecast'])} months ahead")
    
    def test_revenue_forecast_requires_auth(self, api_client):
        """Test revenue forecast requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/analytics/revenue-forecast")
        
        assert response.status_code == 401, "Should require authentication"
        print("✓ Revenue forecast correctly requires authentication")


class TestShiftSchedule:
    """Test GET /api/admin/shifts/schedule - Staff shift schedule"""
    
    def test_get_shift_schedule_success(self, api_client, auth_headers):
        """Test shift schedule endpoint returns proper structure"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/shifts/schedule",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "schedule" in data, "Response should contain 'schedule'"
        assert isinstance(data["schedule"], list), "Schedule should be a list"
        
        # Verify schedule structure if data exists
        if data["schedule"]:
            staff_schedule = data["schedule"][0]
            assert "staff_id" in staff_schedule or "staff_name" in staff_schedule
            assert "shifts" in staff_schedule or "shift" in staff_schedule
        
        # Check for summary if present
        if "summary" in data:
            summary = data["summary"]
            assert "total_staff" in summary or "on_duty_today" in summary
        
        print(f"✓ Shift schedule returned {len(data['schedule'])} staff schedules")
    
    def test_shift_schedule_requires_auth(self, api_client):
        """Test shift schedule requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/shifts/schedule")
        
        assert response.status_code == 401, "Should require authentication"
        print("✓ Shift schedule correctly requires authentication")


class TestRoomAvailability:
    """Test GET /api/enhancements/rooms/availability - Room availability"""
    
    def test_get_room_availability_success(self, api_client):
        """Test room availability endpoint returns proper structure"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/rooms/availability")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rooms" in data, "Response should contain 'rooms'"
        assert isinstance(data["rooms"], list), "Rooms should be a list"
        
        # Verify room structure
        if data["rooms"]:
            room = data["rooms"][0]
            assert "id" in room, "Room should have 'id'"
            assert "name" in room, "Room should have 'name'"
            assert "type" in room, "Room should have 'type'"
            assert "available_slots" in room or "capacity" in room
        
        print(f"✓ Room availability returned {len(data['rooms'])} rooms")
    
    def test_room_availability_with_date(self, api_client):
        """Test room availability with date parameter"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/rooms/availability?date=2026-01-28")
        
        assert response.status_code == 200
        data = response.json()
        assert "rooms" in data
        print("✓ Date filter works for room availability")


class TestInventoryAlerts:
    """Test GET /api/enhancements/inventory/alerts - Inventory alerts"""
    
    def test_get_inventory_alerts_success(self, api_client, auth_headers):
        """Test inventory alerts endpoint returns proper structure"""
        response = api_client.get(
            f"{BASE_URL}/api/enhancements/inventory/alerts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "alerts" in data, "Response should contain 'alerts'"
        assert isinstance(data["alerts"], list), "Alerts should be a list"
        
        # Verify alert structure if alerts exist
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "id" in alert, "Alert should have 'id'"
            assert "item" in alert, "Alert should have 'item'"
            assert "current_stock" in alert, "Alert should have 'current_stock'"
            assert "status" in alert, "Alert should have 'status'"
        
        # Check for summary
        if "summary" in data:
            summary = data["summary"]
            assert "critical_items" in summary or "low_stock_items" in summary
        
        print(f"✓ Inventory alerts returned {len(data['alerts'])} alerts")
    
    def test_inventory_alerts_requires_auth(self, api_client):
        """Test inventory alerts requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/inventory/alerts")
        
        assert response.status_code == 401, "Should require authentication"
        print("✓ Inventory alerts correctly requires authentication")


class TestWearableInsights:
    """Test GET /api/enhancements/wearables/insights - Wearable health insights"""
    
    def test_get_wearable_insights_success(self, api_client, auth_headers):
        """Test wearable insights endpoint returns proper structure"""
        response = api_client.get(
            f"{BASE_URL}/api/enhancements/wearables/insights",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "insights" in data, "Response should contain 'insights'"
        assert isinstance(data["insights"], list), "Insights should be a list"
        
        # Verify insight structure
        if data["insights"]:
            insight = data["insights"][0]
            assert "type" in insight, "Insight should have 'type'"
            assert "title" in insight, "Insight should have 'title'"
            assert "message" in insight, "Insight should have 'message'"
        
        # Check for weekly score
        if "weekly_score" in data:
            assert isinstance(data["weekly_score"], (int, float))
        
        print(f"✓ Wearable insights returned {len(data['insights'])} insights")
    
    def test_wearable_insights_requires_auth(self, api_client):
        """Test wearable insights requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/wearables/insights")
        
        assert response.status_code == 401, "Should require authentication"
        print("✓ Wearable insights correctly requires authentication")


class TestHealthCoachAdvice:
    """Test GET /api/enhancements/health-coach/advice - Health coaching advice"""
    
    def test_get_health_coach_advice_success(self, api_client, auth_headers):
        """Test health coach advice endpoint returns proper structure"""
        response = api_client.get(
            f"{BASE_URL}/api/enhancements/health-coach/advice",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "daily_tip" in data, "Response should contain 'daily_tip'"
        assert "tasks" in data, "Response should contain 'tasks'"
        
        # Verify tasks structure
        assert isinstance(data["tasks"], list), "Tasks should be a list"
        if data["tasks"]:
            task = data["tasks"][0]
            assert "task" in task, "Task should have 'task'"
            assert "completed" in task, "Task should have 'completed'"
        
        # Check for optional fields
        if "motivation" in data:
            assert isinstance(data["motivation"], str)
        if "weekly_focus" in data:
            assert isinstance(data["weekly_focus"], str)
        
        print(f"✓ Health coach advice returned with {len(data['tasks'])} tasks")
    
    def test_health_coach_advice_requires_auth(self, api_client):
        """Test health coach advice requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/enhancements/health-coach/advice")
        
        assert response.status_code == 401, "Should require authentication"
        print("✓ Health coach advice correctly requires authentication")


class TestAuditTrail:
    """Test GET /api/admin/audit-trail - Audit trail logs"""
    
    def test_get_audit_trail_success(self, api_client, auth_headers):
        """Test audit trail endpoint returns proper structure"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/audit-trail",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logs" in data, "Response should contain 'logs'"
        assert isinstance(data["logs"], list), "Logs should be a list"
        
        # Verify log structure if logs exist
        if data["logs"]:
            log = data["logs"][0]
            assert "id" in log, "Log should have 'id'"
            assert "timestamp" in log, "Log should have 'timestamp'"
            assert "action" in log, "Log should have 'action'"
            assert "entity_type" in log, "Log should have 'entity_type'"
        
        # Check for pagination
        if "total" in data:
            assert isinstance(data["total"], int)
        if "page" in data:
            assert isinstance(data["page"], int)
        
        print(f"✓ Audit trail returned {len(data['logs'])} logs")
    
    def test_audit_trail_requires_auth(self, api_client):
        """Test audit trail requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/audit-trail")
        
        assert response.status_code == 401, "Should require authentication"
        print("✓ Audit trail correctly requires authentication")
    
    def test_audit_trail_with_filters(self, api_client, auth_headers):
        """Test audit trail with entity_type filter"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/audit-trail?entity_type=appointment",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        print("✓ Audit trail filter works")


class TestBillingReconciliation:
    """Test GET /api/admin/billing/reconciliation - Billing reconciliation"""
    
    def test_get_billing_reconciliation_success(self, api_client, auth_headers):
        """Test billing reconciliation endpoint returns proper structure"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/billing/reconciliation",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should contain 'summary'"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_billed" in summary, "Summary should have 'total_billed'"
        assert "total_collected" in summary, "Summary should have 'total_collected'"
        assert "pending" in summary, "Summary should have 'pending'"
        
        # Check for payment mode breakdown
        if "by_payment_mode" in data:
            assert isinstance(data["by_payment_mode"], list)
            if data["by_payment_mode"]:
                mode = data["by_payment_mode"][0]
                assert "mode" in mode
                assert "amount" in mode
        
        # Check for pending bills
        if "pending_bills" in data:
            assert isinstance(data["pending_bills"], list)
        
        print(f"✓ Billing reconciliation returned with total billed: {summary['total_billed']}")
    
    def test_billing_reconciliation_requires_auth(self, api_client):
        """Test billing reconciliation requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/billing/reconciliation")
        
        assert response.status_code == 401, "Should require authentication"
        print("✓ Billing reconciliation correctly requires authentication")


class TestAdditionalEnhancementEndpoints:
    """Test additional enhancement endpoints for completeness"""
    
    def test_predictive_alerts(self, api_client, auth_headers):
        """Test predictive health alerts endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/analytics/predictive-alerts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "alerts" in data, "Response should contain 'alerts'"
        assert isinstance(data["alerts"], list)
        
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "alert_type" in alert
            assert "severity" in alert
            assert "prediction" in alert
        
        print(f"✓ Predictive alerts returned {len(data['alerts'])} alerts")
    
    def test_health_outcomes(self, api_client, auth_headers):
        """Test health outcomes tracking endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/analytics/health-outcomes",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should contain 'summary'"
        
        summary = data["summary"]
        assert "total_patients_tracked" in summary
        assert "improvement_rate" in summary
        
        print(f"✓ Health outcomes returned with {summary['total_patients_tracked']} patients tracked")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
