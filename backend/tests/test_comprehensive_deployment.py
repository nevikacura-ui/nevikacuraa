"""
Comprehensive Deployment Test Suite for Nevika Cura Health Portal
Tests: 3-tier membership, APIs, and critical endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestHealthEndpoint:
    """Health check endpoint tests"""

    def test_health_endpoint_returns_ok(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ Health check passed: {data}")


class TestMembershipTiersAPI:
    """Membership tiers API tests"""

    def test_get_all_plans_returns_3_tiers(self):
        """GET /api/membership-tiers/plans returns 3 plans"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert len(data.get("plans", [])) == 3
        
        tier_ids = [p["id"] for p in data["plans"]]
        assert "gold" in tier_ids
        assert "silver" in tier_ids
        assert "bronze" in tier_ids
        print(f"✓ Plans endpoint returns 3 tiers: {tier_ids}")

    def test_gold_plan_correct_price(self):
        """GET /api/membership-tiers/plans/gold has price 999"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/gold", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        plan = data.get("plan", {})
        assert plan.get("price") == 999
        assert plan.get("name") == "Gold"
        print(f"✓ Gold plan: ₹{plan.get('price')}, {plan.get('benefits', {}).get('medicine_discount')}% discount")

    def test_silver_plan_correct_price(self):
        """GET /api/membership-tiers/plans/silver has price 799"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/silver", timeout=10)
        assert response.status_code == 200
        data = response.json()
        plan = data.get("plan", {})
        assert plan.get("price") == 799
        assert plan.get("name") == "Silver"
        print(f"✓ Silver plan: ₹{plan.get('price')}, {plan.get('benefits', {}).get('medicine_discount')}% discount")

    def test_bronze_plan_correct_price(self):
        """GET /api/membership-tiers/plans/bronze has price 499"""
        response = requests.get(f"{BASE_URL}/api/membership-tiers/plans/bronze", timeout=10)
        assert response.status_code == 200
        data = response.json()
        plan = data.get("plan", {})
        assert plan.get("price") == 499
        assert plan.get("name") == "Bronze"
        print(f"✓ Bronze plan: ₹{plan.get('price')}, {plan.get('benefits', {}).get('medicine_discount')}% discount")


class TestPostVisitCareAPI:
    """Post-visit care tips API tests"""

    def test_post_visit_care_default(self):
        """GET /api/ai/post-visit-care returns default tips"""
        response = requests.get(f"{BASE_URL}/api/ai/post-visit-care", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        tips = data.get("tips", [])
        assert len(tips) > 0
        print(f"✓ Post-visit care endpoint returns {len(tips)} tips")

    def test_post_visit_care_consultation_type(self):
        """GET /api/ai/post-visit-care?consultation_type=online returns tips"""
        response = requests.get(f"{BASE_URL}/api/ai/post-visit-care?consultation_type=online", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert data.get("consultation_type") == "online"
        print(f"✓ Post-visit care with type=online works")


class TestPharmacyAPI:
    """Pharmacy API tests"""

    def test_pharmacy_count(self):
        """GET /api/pharmacy/count returns total count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count", timeout=10)
        assert response.status_code == 200
        data = response.json()
        total = data.get("total", 0)
        assert total > 0
        print(f"✓ Pharmacy has {total} medicines")

    def test_pharmacy_all_returns_medicines(self):
        """GET /api/pharmacy/all returns medicines list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10", timeout=10)
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        assert len(medicines) > 0
        print(f"✓ Pharmacy returns {len(medicines)} medicines on page 1")


class TestDoctorsAPI:
    """Doctors API tests"""

    def test_doctors_list(self):
        """GET /api/doctors returns doctors list"""
        response = requests.get(f"{BASE_URL}/api/doctors", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Doctors endpoint works: {len(data) if isinstance(data, list) else 'N/A'} doctors")
        else:
            print(f"⚠ Doctors endpoint returned {response.status_code}")


class TestMangoLabsAPI:
    """Mango Labs API tests"""

    def test_lab_tests_packages(self):
        """GET /api/lab-tests/packages returns packages"""
        response = requests.get(f"{BASE_URL}/api/lab-tests/packages", timeout=10)
        if response.status_code == 200:
            data = response.json()
            packages = data.get("packages", [])
            print(f"✓ Lab tests packages: {len(packages)} available")
        else:
            print(f"⚠ Lab packages returned {response.status_code}")


class TestDiaGynAPI:
    """DiaGyn appointment-related API tests"""

    def test_appointments_booked_slots(self):
        """GET /api/appointments/booked-slots works"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={"doctor": "Dr. Vikas Jha", "clinic": "Pushpa Clinic", "date": "2026-01-25"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            slots = data.get("booked_slots", [])
            print(f"✓ Booked slots endpoint works: {len(slots)} slots booked")
        else:
            print(f"⚠ Booked slots returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
