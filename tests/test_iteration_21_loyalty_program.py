"""
Iteration 21 - Orange Pharmacy Loyalty Program Testing
Tests for:
- Pharmacy Loyalty Tiers API (Bronze, Silver, Gold)
- Pharmacy Loyalty FAQ API (10 FAQs)
- Pharmacy Loyalty Terms & Conditions API (12 sections)
- Pharmacy Loyalty Calculate Benefits API
- Billing Summary API
- Reminders Pending API
- Community Categories API (7 categories)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nevikacura-3.preview.emergentagent.com').rstrip('/')


class TestPharmacyLoyaltyTiers:
    """Test Pharmacy Loyalty Tiers API"""
    
    def test_get_loyalty_tiers(self):
        """GET /api/pharmacy/loyalty/tiers - Returns bronze, silver, gold tiers"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/tiers")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiers" in data
        assert "how_it_works" in data
        
        # Verify all 3 tiers exist
        tiers = data["tiers"]
        assert "bronze" in tiers
        assert "silver" in tiers
        assert "gold" in tiers
        
        # Verify Bronze tier
        bronze = tiers["bronze"]
        assert bronze["name"] == "Bronze"
        assert bronze["min_amount"] == 0
        assert bronze["medicine_discount_percent"] == 0
        
        # Verify Silver tier
        silver = tiers["silver"]
        assert silver["name"] == "Silver"
        assert silver["min_amount"] == 500
        assert silver["medicine_discount_percent"] == 5
        
        # Verify Gold tier
        gold = tiers["gold"]
        assert gold["name"] == "Gold"
        assert gold["min_amount"] == 1000
        assert gold["medicine_discount_percent"] == 10
        assert gold["visits_for_reward"] == 10
        
        # Verify how_it_works has 4 steps
        assert len(data["how_it_works"]) == 4


class TestPharmacyLoyaltyFAQ:
    """Test Pharmacy Loyalty FAQ API"""
    
    def test_get_loyalty_faq(self):
        """GET /api/pharmacy/loyalty/faq - Returns 10 FAQs"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/faq")
        assert response.status_code == 200
        
        data = response.json()
        assert "title" in data
        assert "faqs" in data
        
        # Verify exactly 10 FAQs
        faqs = data["faqs"]
        assert len(faqs) == 10, f"Expected 10 FAQs, got {len(faqs)}"
        
        # Verify FAQ structure
        for faq in faqs:
            assert "q" in faq
            assert "a" in faq
            assert len(faq["q"]) > 0
            assert len(faq["a"]) > 0
        
        # Verify specific FAQ topics exist
        faq_questions = [f["q"] for f in faqs]
        assert any("join" in q.lower() for q in faq_questions)
        assert any("tier" in q.lower() for q in faq_questions)
        assert any("point" in q.lower() for q in faq_questions)
        assert any("gold" in q.lower() for q in faq_questions)


class TestPharmacyLoyaltyTerms:
    """Test Pharmacy Loyalty Terms & Conditions API"""
    
    def test_get_loyalty_terms(self):
        """GET /api/pharmacy/loyalty/terms-and-conditions - Returns 12 sections"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/terms-and-conditions")
        assert response.status_code == 200
        
        data = response.json()
        assert "title" in data
        assert "effective_date" in data
        assert "sections" in data
        assert "last_updated" in data
        assert "acceptance" in data
        
        # Verify exactly 12 sections
        sections = data["sections"]
        assert len(sections) == 12, f"Expected 12 sections, got {len(sections)}"
        
        # Verify section structure
        for section in sections:
            assert "title" in section
            assert "content" in section
            assert isinstance(section["content"], list)
            assert len(section["content"]) > 0
        
        # Verify specific sections exist
        section_titles = [s["title"] for s in sections]
        assert any("Program Overview" in t for t in section_titles)
        assert any("Eligibility" in t for t in section_titles)
        assert any("Tier Benefits" in t for t in section_titles)
        assert any("Loyalty Points" in t for t in section_titles)
        assert any("Gold 10-Visit Reward" in t for t in section_titles)
        assert any("Contact Information" in t for t in section_titles)


class TestPharmacyLoyaltyCalculateBenefits:
    """Test Pharmacy Loyalty Calculate Benefits API"""
    
    def test_calculate_benefits_gold_tier(self):
        """GET /api/pharmacy/loyalty/calculate-benefits - Amount 1200 should be Gold tier"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/calculate-benefits?amount=1200&order_type=pharmacy")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "gold"
        assert data["tier_name"] == "Gold"
        assert data["discount_percent"] == 10
        assert data["discount_amount"] == 120.0  # 10% of 1200
        assert data["free_delivery"] == True
        assert data["final_amount"] == 1080.0  # 1200 - 120
        assert data["points_earned"] == 12  # 1200/100 = 12 points
    
    def test_calculate_benefits_silver_tier(self):
        """GET /api/pharmacy/loyalty/calculate-benefits - Amount 600 should be Silver tier"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/calculate-benefits?amount=600&order_type=pharmacy")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "silver"
        assert data["tier_name"] == "Silver"
        assert data["discount_percent"] == 5
        assert data["discount_amount"] == 30.0  # 5% of 600
        assert data["free_delivery"] == True
        assert data["final_amount"] == 570.0  # 600 - 30
        assert data["points_earned"] == 6  # 600/100 = 6 points
    
    def test_calculate_benefits_bronze_tier(self):
        """GET /api/pharmacy/loyalty/calculate-benefits - Amount 300 should be Bronze tier"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/calculate-benefits?amount=300&order_type=pharmacy")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "bronze"
        assert data["tier_name"] == "Bronze"
        assert data["discount_percent"] == 0
        assert data["discount_amount"] == 0
        assert data["free_delivery"] == False  # Bronze needs 500+ for free delivery
        assert data["final_amount"] == 300.0
        assert data["points_earned"] == 3  # 300/100 = 3 points
    
    def test_calculate_benefits_diagnostic_2x_points(self):
        """GET /api/pharmacy/loyalty/calculate-benefits - Diagnostic orders get 2x points"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/calculate-benefits?amount=500&order_type=diagnostic")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "silver"
        assert data["points_earned"] == 10  # 500/100 * 2 = 10 points (2x for diagnostic)


class TestBillingSummary:
    """Test Billing Summary API"""
    
    def test_get_billing_summary(self):
        """GET /api/billing/summary - Returns billing summary"""
        response = requests.get(f"{BASE_URL}/api/billing/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_invoices" in data
        assert "total_billed" in data
        assert "total_collected" in data
        assert "total_due" in data
        assert "collection_rate" in data
        assert "status_counts" in data
        assert "service_counts" in data
        assert "service_revenue" in data
        assert "overdue" in data
        
        # Verify numeric values
        assert isinstance(data["total_invoices"], int)
        assert isinstance(data["total_billed"], (int, float))
        assert isinstance(data["total_collected"], (int, float))
        assert isinstance(data["collection_rate"], (int, float))


class TestRemindersPending:
    """Test Reminders Pending API"""
    
    def test_get_pending_reminders(self):
        """GET /api/reminders/pending - Returns today and tomorrow reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders/pending")
        assert response.status_code == 200
        
        data = response.json()
        assert "today" in data
        assert "tomorrow" in data
        assert "total" in data
        
        # Verify structure
        assert isinstance(data["today"], list)
        assert isinstance(data["tomorrow"], list)
        assert isinstance(data["total"], int)
        
        # Verify reminder structure if any exist
        all_reminders = data["today"] + data["tomorrow"]
        for reminder in all_reminders:
            assert "id" in reminder
            assert "reminder_type" in reminder
            assert "patient_name" in reminder
            assert "scheduled_date" in reminder
            assert "status" in reminder


class TestCommunityCategories:
    """Test Community Categories API"""
    
    def test_get_community_categories(self):
        """GET /api/community/categories - Returns 7 categories"""
        response = requests.get(f"{BASE_URL}/api/community/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        
        # Verify exactly 7 categories
        categories = data["categories"]
        assert len(categories) == 7, f"Expected 7 categories, got {len(categories)}"
        
        # Verify category structure
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "icon" in cat
            assert "color" in cat
        
        # Verify specific categories exist
        category_ids = [c["id"] for c in categories]
        expected_categories = ["pregnancy", "fertility", "menopause", "pcos", "nutrition", "mental_health", "general"]
        for expected in expected_categories:
            assert expected in category_ids, f"Missing category: {expected}"


class TestHealthEndpoint:
    """Test Health/Root Endpoint"""
    
    def test_api_health(self):
        """GET /api/ - Returns API health status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Nevika Cura API"
        assert data["status"] == "healthy"
        assert "services" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
