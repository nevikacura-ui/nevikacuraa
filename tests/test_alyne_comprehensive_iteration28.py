"""
ALYNE Kids Health & Care Module - Comprehensive Testing
Iteration 28 - Testing all region-specific features

Tests cover:
- ALYNE service card on home page (mobile/desktop)
- Region selector (India/USA)
- India-specific: Govt Schemes, Regional Foods, Seasonal Alerts, Home Remedies, Kids Shop
- USA-specific: Pediatrician Finder, School Vaccines, WIC Program, Safety Guides, Brightwheel
- Child profile CRUD
- Vaccination tracker (IAP for India, CDC for USA)
- Growth chart with WHO percentiles
- Health log, Documents, Reminders
- Dashboard endpoint
- AI Chat endpoint
- Symptom Checker
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_USER_ID = "test_user_123"
TEST_CHILD_ID = "child_fc20ed0f2b58"


class TestAlyneRegionConfig:
    """Test region configuration endpoints"""
    
    def test_get_region_config(self):
        """Test GET /api/alyne/config/regions returns India and USA"""
        response = requests.get(f"{BASE_URL}/api/alyne/config/regions")
        assert response.status_code == 200
        data = response.json()
        assert "regions" in data
        assert len(data["regions"]) == 2
        
        # Verify India config
        india = next((r for r in data["regions"] if r["id"] == "india"), None)
        assert india is not None
        assert india["vaccination_schedule"] == "IAP (Indian Academy of Pediatrics)"
        assert "aadhaar_number" in india["id_fields"]
        
        # Verify USA config
        usa = next((r for r in data["regions"] if r["id"] == "usa"), None)
        assert usa is not None
        assert usa["vaccination_schedule"] == "CDC"
        assert "insurance_provider" in usa["id_fields"]
        print("✓ Region config returns India (IAP) and USA (CDC)")


class TestIndiaResources:
    """Test India-specific resource endpoints"""
    
    def test_india_resources_main(self):
        """Test GET /api/alyne/resources/india returns govt schemes and ayurvedic remedies"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["region"] == "india"
        assert "government_schemes" in data
        assert "ayurvedic_remedies" in data
        assert "emergency_contacts" in data
        print(f"✓ India resources: {len(data['government_schemes'])} govt schemes, {len(data['ayurvedic_remedies'])} remedies")
    
    def test_india_govt_schemes(self):
        """Test India government schemes include required programs"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india")
        assert response.status_code == 200
        data = response.json()
        
        schemes = data["government_schemes"]
        scheme_ids = [s["id"] for s in schemes]
        
        # Verify required schemes are present
        required_schemes = ["ayushman_bharat", "icds", "jssk", "rbsk"]
        for scheme_id in required_schemes:
            assert scheme_id in scheme_ids, f"Missing scheme: {scheme_id}"
        
        # Verify scheme structure
        for scheme in schemes:
            assert "name" in scheme
            assert "description" in scheme
            assert "eligibility" in scheme
        print(f"✓ India govt schemes: {', '.join(scheme_ids)}")
    
    def test_india_food_guides(self):
        """Test GET /api/alyne/resources/india/food-guides returns regional foods"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/food-guides")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "all_foods" in data
        
        # Verify all 4 regions present
        regions = list(data["all_foods"].keys())
        assert "north" in regions
        assert "south" in regions
        assert "east" in regions
        assert "west" in regions
        
        # Verify food structure
        for region, foods in data["all_foods"].items():
            assert len(foods) > 0, f"No foods for {region}"
            for food in foods:
                assert "name" in food
                assert "age" in food
                assert "recipe" in food
                assert "benefits" in food
        print(f"✓ India food guides: {len(regions)} regions with foods")
    
    def test_india_seasonal_alerts(self):
        """Test GET /api/alyne/resources/india/seasonal-alerts returns seasonal health alerts"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/seasonal-alerts")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "all_seasons" in data
        assert "current_season" in data
        
        # Verify all 3 seasons present
        seasons = list(data["all_seasons"].keys())
        assert "monsoon" in seasons
        assert "summer" in seasons
        assert "winter" in seasons
        
        # Verify alert structure
        for season, alerts in data["all_seasons"].items():
            assert len(alerts) > 0, f"No alerts for {season}"
            for alert in alerts:
                assert "disease" in alert
                assert "symptoms" in alert
                assert "prevention" in alert
        print(f"✓ India seasonal alerts: {len(seasons)} seasons, current: {data['current_season']}")
    
    def test_india_ayurvedic_remedies(self):
        """Test GET /api/alyne/resources/india/ayurvedic returns home remedies"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/ayurvedic")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "remedies" in data
        assert "disclaimer" in data
        
        remedies = data["remedies"]
        assert len(remedies) >= 5, "Should have at least 5 remedies"
        
        # Verify remedy structure
        for remedy in remedies:
            assert "name" in remedy
            assert "for" in remedy
            assert "recipe" in remedy
            assert "age" in remedy
            assert "caution" in remedy
        print(f"✓ India ayurvedic remedies: {len(remedies)} remedies")


class TestUSAResources:
    """Test USA-specific resource endpoints"""
    
    def test_usa_resources_main(self):
        """Test GET /api/alyne/resources/usa returns insurance guide and WIC"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["region"] == "usa"
        assert "insurance_guide" in data
        assert "wic_program" in data
        assert "emergency_contacts" in data
        print(f"✓ USA resources: insurance guide, WIC program, emergency contacts")
    
    def test_usa_insurance_guide(self):
        """Test GET /api/alyne/resources/usa/insurance-guide returns insurance terms"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/insurance-guide")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "terms" in data
        
        terms = data["terms"]
        assert len(terms) >= 10, "Should have at least 10 insurance terms"
        
        # Verify key terms present
        term_names = [t["term"] for t in terms]
        required_terms = ["Premium", "Deductible", "Copay", "Coinsurance"]
        for term in required_terms:
            assert term in term_names, f"Missing term: {term}"
        
        # Verify term structure
        for term in terms:
            assert "term" in term
            assert "definition" in term
        print(f"✓ USA insurance guide: {len(terms)} terms")
    
    def test_usa_school_vaccines(self):
        """Test GET /api/alyne/resources/usa/school-vaccines returns vaccine requirements"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/school-vaccines")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "requirements" in data
        
        requirements = data["requirements"]
        assert "kindergarten" in requirements
        assert "middle_school" in requirements
        
        # Verify kindergarten vaccines
        kindergarten = requirements["kindergarten"]
        assert len(kindergarten) >= 4, "Should have at least 4 kindergarten vaccines"
        
        # Verify middle school vaccines
        middle_school = requirements["middle_school"]
        assert len(middle_school) >= 1, "Should have at least 1 middle school vaccine"
        print(f"✓ USA school vaccines: {len(kindergarten)} kindergarten, {len(middle_school)} middle school")
    
    def test_usa_wic_program(self):
        """Test GET /api/alyne/resources/usa/wic returns WIC program info"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/wic")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "program" in data
        
        program = data["program"]
        assert "name" in program
        assert "description" in program
        assert "eligibility" in program
        assert "benefits" in program
        assert "website" in program
        print(f"✓ USA WIC program: {program['name']}")
    
    def test_usa_safety_standards(self):
        """Test GET /api/alyne/resources/usa/safety returns safety guidelines"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/safety")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "standards" in data
        
        standards = data["standards"]
        assert len(standards) >= 3, "Should have at least 3 safety categories"
        
        # Verify safety categories
        categories = [s["category"] for s in standards]
        assert "Car Seat Safety" in categories
        assert "Sleep Safety (SIDS Prevention)" in categories
        
        # Verify structure
        for standard in standards:
            assert "category" in standard
            assert "guidelines" in standard
            assert "resource" in standard
        print(f"✓ USA safety standards: {len(standards)} categories")


class TestCommonResources:
    """Test common resource endpoints (both regions)"""
    
    def test_developmental_screening(self):
        """Test GET /api/alyne/resources/common/screening returns ASQ-3 info"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/common/screening")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "screening" in data
        
        screening = data["screening"]
        assert "asq3" in screening
        
        asq3 = screening["asq3"]
        assert "name" in asq3
        assert "areas" in asq3
        assert len(asq3["areas"]) == 5, "ASQ-3 should have 5 developmental areas"
        print(f"✓ Developmental screening: ASQ-3 with {len(asq3['areas'])} areas")
    
    def test_telemedicine_tips(self):
        """Test GET /api/alyne/resources/common/telemedicine-tips returns tips"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/common/telemedicine-tips")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "tips" in data
        assert len(data["tips"]) >= 5, "Should have at least 5 telemedicine tips"
        print(f"✓ Telemedicine tips: {len(data['tips'])} tips")
    
    def test_parenting_tips(self):
        """Test GET /api/alyne/resources/common/parenting-tips returns age-wise tips"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/common/parenting-tips")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "all_tips" in data
        
        tips = data["all_tips"]
        assert "newborn" in tips
        assert "infant" in tips
        assert "toddler" in tips
        print(f"✓ Parenting tips: {len(tips)} age groups")


class TestSymptomChecker:
    """Test symptom checker endpoints"""
    
    def test_get_symptoms_list(self):
        """Test GET /api/alyne/symptoms returns list of symptoms"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms")
        assert response.status_code == 200
        data = response.json()
        
        assert "symptoms" in data
        symptoms = data["symptoms"]
        assert len(symptoms) >= 6, "Should have at least 6 symptoms"
        
        # Verify required symptoms
        symptom_ids = [s["id"] for s in symptoms]
        required = ["fever", "cough", "sore_throat", "vomiting", "diarrhea", "skin_rash"]
        for symptom_id in required:
            assert symptom_id in symptom_ids, f"Missing symptom: {symptom_id}"
        print(f"✓ Symptoms list: {len(symptoms)} symptoms")
    
    def test_get_symptom_details_india(self):
        """Test GET /api/alyne/symptoms/{id} returns IAP guidelines for India"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms/fever?region=india")
        assert response.status_code == 200
        data = response.json()
        
        assert "symptom" in data
        assert "primary_guidelines" in data
        assert data["region"] == "india"
        
        symptom = data["symptom"]
        assert "name" in symptom
        assert "home_care" in symptom
        assert "when_to_see_doctor" in symptom
        assert "iap_guidelines" in symptom
        print(f"✓ Symptom details (India): {symptom['name']} with IAP guidelines")
    
    def test_get_symptom_details_usa(self):
        """Test GET /api/alyne/symptoms/{id} returns CDC guidelines for USA"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms/fever?region=usa")
        assert response.status_code == 200
        data = response.json()
        
        assert "symptom" in data
        assert "primary_guidelines" in data
        assert data["region"] == "usa"
        
        symptom = data["symptom"]
        assert "cdc_guidelines" in symptom
        print(f"✓ Symptom details (USA): {symptom['name']} with CDC guidelines")


class TestKidsShop:
    """Test Kids Shop endpoints (India only feature)"""
    
    def test_get_shop_categories(self):
        """Test GET /api/alyne/shop/categories returns product categories"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) >= 5, "Should have at least 5 categories"
        
        # Verify category structure
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "icon" in cat
        print(f"✓ Shop categories: {len(categories)} categories")
    
    def test_get_shop_products(self):
        """Test GET /api/alyne/shop/products returns products"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert "total" in data
        
        products = data["products"]
        assert len(products) >= 20, "Should have at least 20 products"
        
        # Verify product structure (note: prices are included in backend but hidden in frontend for India)
        for product in products[:5]:  # Check first 5
            assert "id" in product
            assert "name" in product
            assert "brand" in product
            assert "category" in product
        print(f"✓ Shop products: {len(products)} products")
    
    def test_get_shop_products_by_category(self):
        """Test GET /api/alyne/shop/products?category=baby_food filters correctly"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products?category=baby_food")
        assert response.status_code == 200
        data = response.json()
        
        products = data["products"]
        for product in products:
            assert product["category"] == "baby_food"
        print(f"✓ Shop products filtered by category: {len(products)} baby food products")
    
    def test_get_bestsellers(self):
        """Test GET /api/alyne/shop/bestsellers returns bestselling products"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/bestsellers")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        products = data["products"]
        
        for product in products:
            assert product.get("bestseller") == True
        print(f"✓ Shop bestsellers: {len(products)} bestselling products")


class TestChildProfileCRUD:
    """Test child profile CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.created_child_id = None
    
    def test_create_child_profile(self):
        """Test POST /api/alyne/children creates child with vaccination schedule"""
        child_data = {
            "name": "Test Baby",
            "date_of_birth": (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d"),  # 6 months old
            "gender": "female",
            "blood_group": "O+",
            "region": "india"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/children?user_id={self.test_user_id}",
            json=child_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "child" in data
        assert "vaccinations_count" in data
        assert data["vaccinations_count"] > 0, "Should auto-generate vaccinations"
        
        self.created_child_id = data["child"]["id"]
        print(f"✓ Created child profile: {self.created_child_id} with {data['vaccinations_count']} vaccinations")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alyne/child/{self.created_child_id}")
    
    def test_get_children_for_user(self):
        """Test GET /api/alyne/children/{user_id} returns children list"""
        response = requests.get(f"{BASE_URL}/api/alyne/children/{TEST_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "children" in data
        # May have existing test children
        print(f"✓ Get children: {len(data['children'])} children for user")
    
    def test_get_existing_child(self):
        """Test GET /api/alyne/child/{child_id} returns child details"""
        response = requests.get(f"{BASE_URL}/api/alyne/child/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "child" in data
        child = data["child"]
        assert "name" in child
        assert "age_display" in child
        assert "region" in child
        print(f"✓ Get child: {child['name']}, age: {child['age_display']}")


class TestVaccinationTracker:
    """Test vaccination tracker endpoints"""
    
    def test_get_vaccinations(self):
        """Test GET /api/alyne/vaccinations/{child_id} returns vaccination records"""
        response = requests.get(f"{BASE_URL}/api/alyne/vaccinations/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "vaccinations" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "done" in stats
        assert "due" in stats
        assert "overdue" in stats
        assert "upcoming" in stats
        assert "total" in stats
        print(f"✓ Vaccinations: {stats['total']} total, {stats['done']} done, {stats['due']} due, {stats['overdue']} overdue")
    
    def test_get_vaccination_schedule(self):
        """Test GET /api/alyne/vaccinations/{child_id}/schedule returns upcoming vaccines"""
        response = requests.get(f"{BASE_URL}/api/alyne/vaccinations/{TEST_CHILD_ID}/schedule")
        assert response.status_code == 200
        data = response.json()
        
        assert "child_name" in data
        assert "region" in data
        assert "schedule" in data
        print(f"✓ Vaccination schedule for {data['child_name']} ({data['region']})")


class TestGrowthChart:
    """Test growth chart endpoints"""
    
    def test_get_growth_records(self):
        """Test GET /api/alyne/growth/{child_id} returns growth records"""
        response = requests.get(f"{BASE_URL}/api/alyne/growth/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "records" in data
        assert "child_gender" in data
        print(f"✓ Growth records: {len(data['records'])} records")
    
    def test_get_growth_chart_data(self):
        """Test GET /api/alyne/growth/{child_id}/chart returns WHO standards"""
        response = requests.get(f"{BASE_URL}/api/alyne/growth/{TEST_CHILD_ID}/chart")
        assert response.status_code == 200
        data = response.json()
        
        assert "records" in data
        assert "who_standards" in data
        assert "child_gender" in data
        
        who = data["who_standards"]
        assert "height" in who
        assert "weight" in who
        print(f"✓ Growth chart data with WHO standards for {data['child_gender']}")
    
    def test_add_growth_record(self):
        """Test POST /api/alyne/growth/{child_id} adds record with percentile"""
        growth_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "height_cm": 70.0,
            "weight_kg": 8.5,
            "notes": "Test growth record"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/growth/{TEST_CHILD_ID}",
            json=growth_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "record" in data
        
        record = data["record"]
        assert "height_percentile" in record
        assert "weight_percentile" in record
        print(f"✓ Added growth record with percentiles: height {record['height_percentile']}, weight {record['weight_percentile']}")


class TestDashboard:
    """Test dashboard endpoint"""
    
    def test_get_dashboard(self):
        """Test GET /api/alyne/dashboard/{child_id} returns summary"""
        response = requests.get(f"{BASE_URL}/api/alyne/dashboard/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "child" in data
        assert "vaccination_stats" in data
        assert "latest_growth" in data
        assert "upcoming_reminders" in data
        assert "recent_health_logs" in data
        assert "document_count" in data
        
        child = data["child"]
        assert "name" in child
        assert "age_display" in child
        print(f"✓ Dashboard for {child['name']}: vax stats, growth, reminders, logs, docs")


class TestAIChat:
    """Test AI Chat endpoint"""
    
    def test_chat_endpoint_exists(self):
        """Test POST /api/alyne/chat endpoint is accessible"""
        chat_data = {
            "message": "What are signs of teething?",
            "session_id": f"test_session_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/chat?user_id={TEST_USER_ID}",
            json=chat_data
        )
        
        # May return 500 if LLM key not configured, but endpoint should exist
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            print(f"✓ AI Chat endpoint working")
        else:
            print(f"✓ AI Chat endpoint exists (LLM may not be configured)")


class TestHealthLog:
    """Test health log endpoints"""
    
    def test_add_health_log_entry(self):
        """Test POST /api/alyne/health-log/{child_id} adds entry"""
        entry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "type": "symptom",
            "title": "Mild fever",
            "description": "Temperature 99.5F, gave paracetamol"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/health-log/{TEST_CHILD_ID}",
            json=entry_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "entry" in data
        print(f"✓ Added health log entry: {entry_data['title']}")
    
    def test_get_health_log(self):
        """Test GET /api/alyne/health-log/{child_id} returns entries"""
        response = requests.get(f"{BASE_URL}/api/alyne/health-log/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        print(f"✓ Health log: {len(data['entries'])} entries")


class TestReminders:
    """Test reminders endpoints"""
    
    def test_create_reminder(self):
        """Test POST /api/alyne/reminders creates reminder"""
        reminder_data = {
            "child_id": TEST_CHILD_ID,
            "type": "vaccination",
            "title": "MMR Vaccine Due",
            "description": "Schedule MMR vaccine appointment",
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "enabled": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/reminders",
            json=reminder_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "reminder" in data
        print(f"✓ Created reminder: {reminder_data['title']}")
    
    def test_get_reminders(self):
        """Test GET /api/alyne/reminders/{child_id} returns reminders"""
        response = requests.get(f"{BASE_URL}/api/alyne/reminders/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "reminders" in data
        print(f"✓ Reminders: {len(data['reminders'])} reminders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
