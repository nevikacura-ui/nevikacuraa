"""
ALYNE - Region-Specific Resources Tests (Iteration 27)
Tests for India resources (Govt Schemes, Regional Foods, Seasonal Alerts, Ayurvedic Remedies)
Tests for USA resources (Insurance Guide, School Vaccines, WIC Program, Safety Standards)
Tests for Common features (Dev Screening, Telemedicine Tips, Parenting Tips)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://orange-health-ui.preview.emergentagent.com').rstrip('/')


class TestIndiaResources:
    """Test India-specific resource endpoints"""
    
    def test_get_india_resources(self):
        """Test GET /api/alyne/resources/india - returns government schemes and ayurvedic remedies"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["region"] == "india"
        
        # Verify government schemes
        assert "government_schemes" in data
        schemes = data["government_schemes"]
        assert len(schemes) >= 4  # Should have at least 4 schemes
        
        # Check for specific schemes
        scheme_ids = [s["id"] for s in schemes]
        assert "ayushman_bharat" in scheme_ids
        assert "icds" in scheme_ids
        assert "jssk" in scheme_ids
        assert "rbsk" in scheme_ids
        
        # Verify scheme structure
        ayushman = next(s for s in schemes if s["id"] == "ayushman_bharat")
        assert "name" in ayushman
        assert "description" in ayushman
        assert "eligibility" in ayushman
        assert "website" in ayushman
        assert "helpline" in ayushman
        
        # Verify ayurvedic remedies
        assert "ayurvedic_remedies" in data
        remedies = data["ayurvedic_remedies"]
        assert len(remedies) >= 6  # Should have at least 6 remedies
        
        # Verify emergency contacts
        assert "emergency_contacts" in data
        contacts = data["emergency_contacts"]
        assert "national_emergency" in contacts
        assert "ambulance" in contacts
        assert "child_helpline" in contacts
        
        print(f"✓ India resources: {len(schemes)} govt schemes, {len(remedies)} ayurvedic remedies")
    
    def test_get_india_food_guides(self):
        """Test GET /api/alyne/resources/india/food-guides - returns regional food guides"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/food-guides")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify all regions present
        assert "all_foods" in data
        foods = data["all_foods"]
        assert "north" in foods
        assert "south" in foods
        assert "east" in foods
        assert "west" in foods
        
        # Verify food structure for North India
        north_foods = foods["north"]
        assert len(north_foods) >= 3
        
        food = north_foods[0]
        assert "name" in food
        assert "age" in food
        assert "recipe" in food
        assert "benefits" in food
        
        print(f"✓ India food guides: North({len(foods['north'])}), South({len(foods['south'])}), East({len(foods['east'])}), West({len(foods['west'])})")
    
    def test_get_india_food_guides_by_region(self):
        """Test GET /api/alyne/resources/india/food-guides?region=south - returns specific region"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/food-guides?region=south")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["region"] == "south"
        assert "foods" in data
        assert len(data["foods"]) >= 3
        
        # Verify South Indian foods
        food_names = [f["name"] for f in data["foods"]]
        assert "Ragi Malt" in food_names or "Rice Kanji" in food_names
        
        print(f"✓ South India food guides: {len(data['foods'])} foods")
    
    def test_get_india_seasonal_alerts(self):
        """Test GET /api/alyne/resources/india/seasonal-alerts - returns seasonal health alerts"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/seasonal-alerts")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify current season detection
        assert "current_season" in data
        assert data["current_season"] in ["monsoon", "summer", "winter"]
        
        # Verify all seasons present
        assert "all_seasons" in data
        seasons = data["all_seasons"]
        assert "monsoon" in seasons
        assert "summer" in seasons
        assert "winter" in seasons
        
        # Verify monsoon alerts structure
        monsoon_alerts = seasons["monsoon"]
        assert len(monsoon_alerts) >= 3
        
        alert = monsoon_alerts[0]
        assert "disease" in alert
        assert "symptoms" in alert
        assert "prevention" in alert
        assert isinstance(alert["prevention"], list)
        
        print(f"✓ Seasonal alerts: Current={data['current_season']}, Monsoon({len(seasons['monsoon'])}), Summer({len(seasons['summer'])}), Winter({len(seasons['winter'])})")
    
    def test_get_india_seasonal_alerts_by_season(self):
        """Test GET /api/alyne/resources/india/seasonal-alerts?season=monsoon - returns specific season"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/seasonal-alerts?season=monsoon")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["season"] == "monsoon"
        assert "alerts" in data
        
        # Verify monsoon diseases
        diseases = [a["disease"] for a in data["alerts"]]
        assert "Dengue" in diseases or "Malaria" in diseases
        
        print(f"✓ Monsoon alerts: {len(data['alerts'])} diseases")
    
    def test_get_ayurvedic_remedies(self):
        """Test GET /api/alyne/resources/india/ayurvedic - returns safe home remedies"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/india/ayurvedic")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "disclaimer" in data
        assert "remedies" in data
        
        remedies = data["remedies"]
        assert len(remedies) >= 6
        
        # Verify remedy structure
        remedy = remedies[0]
        assert "name" in remedy
        assert "for" in remedy
        assert "recipe" in remedy
        assert "age" in remedy
        assert "caution" in remedy
        
        # Check for specific remedies
        remedy_names = [r["name"] for r in remedies]
        assert "Tulsi Water" in remedy_names or "Turmeric Milk (Haldi Doodh)" in remedy_names
        
        print(f"✓ Ayurvedic remedies: {len(remedies)} safe home remedies")


class TestUSAResources:
    """Test USA-specific resource endpoints"""
    
    def test_get_usa_resources(self):
        """Test GET /api/alyne/resources/usa - returns insurance guide and WIC program"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["region"] == "usa"
        
        # Verify insurance guide
        assert "insurance_guide" in data
        terms = data["insurance_guide"]
        assert len(terms) >= 10
        
        # Verify WIC program
        assert "wic_program" in data
        wic = data["wic_program"]
        assert "name" in wic
        assert "description" in wic
        assert "eligibility" in wic
        assert "benefits" in wic
        
        # Verify emergency contacts
        assert "emergency_contacts" in data
        contacts = data["emergency_contacts"]
        assert contacts["emergency"] == "911"
        assert "poison_control" in contacts
        
        print(f"✓ USA resources: {len(terms)} insurance terms, WIC program info")
    
    def test_get_usa_insurance_guide(self):
        """Test GET /api/alyne/resources/usa/insurance-guide - returns pediatric insurance terminology"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/insurance-guide")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "title" in data
        assert "terms" in data
        
        terms = data["terms"]
        assert len(terms) >= 10
        
        # Verify term structure
        term = terms[0]
        assert "term" in term
        assert "definition" in term
        
        # Check for specific terms
        term_names = [t["term"] for t in terms]
        assert "Premium" in term_names
        assert "Deductible" in term_names
        assert "Copay" in term_names
        assert "CHIP" in term_names
        
        print(f"✓ Insurance guide: {len(terms)} terms explained")
    
    def test_get_usa_school_vaccines(self):
        """Test GET /api/alyne/resources/usa/school-vaccines - returns school immunization requirements"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/school-vaccines")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "title" in data
        assert "requirements" in data
        
        reqs = data["requirements"]
        
        # Verify kindergarten requirements
        assert "kindergarten" in reqs
        kindergarten = reqs["kindergarten"]
        assert len(kindergarten) >= 5
        assert any("DTaP" in v for v in kindergarten)
        assert any("MMR" in v for v in kindergarten)
        
        # Verify middle school requirements
        assert "middle_school" in reqs
        middle_school = reqs["middle_school"]
        assert len(middle_school) >= 2
        assert any("Tdap" in v for v in middle_school)
        
        # Verify note and exemptions
        assert "note" in reqs
        assert "exemptions" in reqs
        
        print(f"✓ School vaccines: Kindergarten({len(kindergarten)}), Middle School({len(middle_school)})")
    
    def test_get_usa_wic_program(self):
        """Test GET /api/alyne/resources/usa/wic - returns WIC program information"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/wic")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "program" in data
        
        program = data["program"]
        assert program["name"] == "Women, Infants, and Children (WIC)"
        assert "description" in program
        assert "eligibility" in program
        assert "benefits" in program
        assert "website" in program
        assert "find_office" in program
        
        # Verify eligibility criteria
        assert len(program["eligibility"]) >= 3
        
        # Verify benefits
        assert len(program["benefits"]) >= 4
        
        print(f"✓ WIC program: {len(program['eligibility'])} eligibility criteria, {len(program['benefits'])} benefits")
    
    def test_get_usa_safety_standards(self):
        """Test GET /api/alyne/resources/usa/safety - returns child safety standards"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/usa/safety")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "title" in data
        assert "standards" in data
        
        standards = data["standards"]
        assert len(standards) >= 3
        
        # Verify standard structure
        standard = standards[0]
        assert "category" in standard
        assert "guidelines" in standard
        assert "resource" in standard
        
        # Check for specific categories
        categories = [s["category"] for s in standards]
        assert "Car Seat Safety" in categories
        assert "Sleep Safety (SIDS Prevention)" in categories
        assert "Product Recalls" in categories
        
        print(f"✓ Safety standards: {len(standards)} categories")


class TestCommonResources:
    """Test common resource endpoints (available for both regions)"""
    
    def test_get_developmental_screening(self):
        """Test GET /api/alyne/resources/common/screening - returns ASQ-3 developmental screening info"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/common/screening")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "screening" in data
        
        screening = data["screening"]
        assert "asq3" in screening
        
        asq3 = screening["asq3"]
        assert asq3["name"] == "ASQ-3 (Ages & Stages Questionnaire)"
        assert "description" in asq3
        assert "age_range" in asq3
        assert "how_it_works" in asq3
        assert "areas" in asq3
        
        # Verify 5 developmental areas
        areas = asq3["areas"]
        assert len(areas) == 5
        
        area_names = [a["name"] for a in areas]
        assert "Communication" in area_names
        assert "Gross Motor" in area_names
        assert "Fine Motor" in area_names
        assert "Problem Solving" in area_names
        assert "Personal-Social" in area_names
        
        print(f"✓ Developmental screening: ASQ-3 with {len(areas)} areas")
    
    def test_get_telemedicine_tips(self):
        """Test GET /api/alyne/resources/common/telemedicine-tips - returns video consultation tips"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/common/telemedicine-tips")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "tips" in data
        
        tips = data["tips"]
        assert len(tips) >= 6
        
        # Verify tips are strings
        assert all(isinstance(tip, str) for tip in tips)
        
        # Check for specific tips
        tips_text = " ".join(tips).lower()
        assert "symptoms" in tips_text or "temperature" in tips_text
        assert "lighting" in tips_text or "video" in tips_text
        
        print(f"✓ Telemedicine tips: {len(tips)} tips")
    
    def test_get_parenting_tips(self):
        """Test GET /api/alyne/resources/common/parenting-tips - returns age-specific parenting tips"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/common/parenting-tips")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "all_tips" in data
        
        tips = data["all_tips"]
        
        # Verify all age groups present
        assert "newborn" in tips
        assert "infant" in tips
        assert "toddler" in tips
        
        # Verify tips structure
        assert len(tips["newborn"]) >= 5
        assert len(tips["infant"]) >= 5
        assert len(tips["toddler"]) >= 5
        
        print(f"✓ Parenting tips: Newborn({len(tips['newborn'])}), Infant({len(tips['infant'])}), Toddler({len(tips['toddler'])})")
    
    def test_get_parenting_tips_by_age_group(self):
        """Test GET /api/alyne/resources/common/parenting-tips?age_group=newborn - returns specific age group"""
        response = requests.get(f"{BASE_URL}/api/alyne/resources/common/parenting-tips?age_group=newborn")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["age_group"] == "newborn"
        assert "tips" in data
        
        tips = data["tips"]
        assert len(tips) >= 5
        
        # Verify newborn-specific tips
        tips_text = " ".join(tips).lower()
        assert "skin-to-skin" in tips_text or "breastfeeding" in tips_text or "feed" in tips_text
        
        print(f"✓ Newborn parenting tips: {len(tips)} tips")


class TestExistingAlyneEndpoints:
    """Test existing ALYNE endpoints still work"""
    
    def test_symptoms_endpoint(self):
        """Test GET /api/alyne/symptoms - returns symptom list"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms")
        assert response.status_code == 200
        
        data = response.json()
        assert "symptoms" in data
        assert len(data["symptoms"]) >= 6
        
        print(f"✓ Symptoms endpoint: {len(data['symptoms'])} symptoms")
    
    def test_shop_categories(self):
        """Test GET /api/alyne/shop/categories - returns shop categories"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        
        print(f"✓ Shop categories: {len(data['categories'])} categories")
    
    def test_shop_products(self):
        """Test GET /api/alyne/shop/products - returns products (MOCKED)"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        
        print(f"✓ Shop products: {len(data['products'])} products (MOCKED)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
