"""
Test ALYNE Enhanced Features - Iteration 27
Tests for:
- Symptoms Checker API (6 symptoms with IAP/CDC guidelines)
- Kids Shop API (6 categories, 25 products)
- AI Chat API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nevika-cura-2.preview.emergentagent.com')

class TestAlyneSymptoms:
    """Test Symptoms Checker API - IAP/CDC Guidelines"""
    
    def test_get_symptoms_list(self):
        """GET /api/alyne/symptoms - should return 6 symptoms"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "symptoms" in data, "Response should have 'symptoms' key"
        
        symptoms = data["symptoms"]
        assert len(symptoms) == 6, f"Expected 6 symptoms, got {len(symptoms)}"
        
        # Verify expected symptoms
        symptom_ids = [s["id"] for s in symptoms]
        expected_symptoms = ["sore_throat", "cough", "skin_rash", "fever", "vomiting", "diarrhea"]
        for expected in expected_symptoms:
            assert expected in symptom_ids, f"Missing symptom: {expected}"
        
        # Verify symptom structure
        for symptom in symptoms:
            assert "id" in symptom, "Symptom should have 'id'"
            assert "name" in symptom, "Symptom should have 'name'"
            assert "icon" in symptom, "Symptom should have 'icon'"
            assert "description" in symptom, "Symptom should have 'description'"
        
        print(f"✓ GET /api/alyne/symptoms - 6 symptoms returned: {symptom_ids}")
    
    def test_get_symptom_details_fever_india(self):
        """GET /api/alyne/symptoms/fever?region=india - should return IAP guidelines"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms/fever?region=india")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "symptom" in data, "Response should have 'symptom' key"
        assert "primary_guidelines" in data, "Response should have 'primary_guidelines'"
        assert "region" in data, "Response should have 'region'"
        
        symptom = data["symptom"]
        assert symptom["name"] == "Fever", f"Expected 'Fever', got {symptom['name']}"
        assert "causes" in symptom, "Symptom should have 'causes'"
        assert "home_care" in symptom, "Symptom should have 'home_care'"
        assert "when_to_see_doctor" in symptom, "Symptom should have 'when_to_see_doctor'"
        assert "iap_guidelines" in symptom, "Symptom should have 'iap_guidelines'"
        assert "cdc_guidelines" in symptom, "Symptom should have 'cdc_guidelines'"
        
        assert data["region"] == "india", f"Expected region 'india', got {data['region']}"
        assert "IAP" in data["primary_guidelines"], "Primary guidelines should mention IAP for India"
        
        print(f"✓ GET /api/alyne/symptoms/fever?region=india - IAP guidelines returned")
    
    def test_get_symptom_details_cough_usa(self):
        """GET /api/alyne/symptoms/cough?region=usa - should return CDC guidelines"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms/cough?region=usa")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["region"] == "usa", f"Expected region 'usa', got {data['region']}"
        assert "CDC" in data["primary_guidelines"], "Primary guidelines should mention CDC for USA"
        
        print(f"✓ GET /api/alyne/symptoms/cough?region=usa - CDC guidelines returned")
    
    def test_get_symptom_details_all_symptoms(self):
        """Test all 6 symptoms have proper details"""
        symptoms = ["sore_throat", "cough", "skin_rash", "fever", "vomiting", "diarrhea"]
        
        for symptom_id in symptoms:
            response = requests.get(f"{BASE_URL}/api/alyne/symptoms/{symptom_id}")
            assert response.status_code == 200, f"Expected 200 for {symptom_id}, got {response.status_code}"
            
            data = response.json()
            symptom = data["symptom"]
            
            # Verify all required fields
            assert len(symptom["causes"]) > 0, f"{symptom_id} should have causes"
            assert len(symptom["home_care"]) > 0, f"{symptom_id} should have home_care tips"
            assert len(symptom["when_to_see_doctor"]) > 0, f"{symptom_id} should have when_to_see_doctor"
            
            print(f"  ✓ {symptom_id}: {len(symptom['causes'])} causes, {len(symptom['home_care'])} home care tips")
        
        print(f"✓ All 6 symptoms have proper IAP/CDC guidelines")
    
    def test_get_symptom_not_found(self):
        """GET /api/alyne/symptoms/invalid - should return 404"""
        response = requests.get(f"{BASE_URL}/api/alyne/symptoms/invalid_symptom")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/alyne/symptoms/invalid_symptom - 404 returned correctly")


class TestAlyneKidsShop:
    """Test Kids Shop API - Orange Pharmacy Subsidiary"""
    
    def test_get_shop_categories(self):
        """GET /api/alyne/shop/categories - should return 6 categories"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Response should have 'categories' key"
        
        categories = data["categories"]
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Verify expected categories
        category_ids = [c["id"] for c in categories]
        expected_categories = ["baby_food", "feeding", "diapers", "skincare", "health", "supplements"]
        for expected in expected_categories:
            assert expected in category_ids, f"Missing category: {expected}"
        
        # Verify category structure
        for cat in categories:
            assert "id" in cat, "Category should have 'id'"
            assert "name" in cat, "Category should have 'name'"
            assert "icon" in cat, "Category should have 'icon'"
            assert "description" in cat, "Category should have 'description'"
        
        print(f"✓ GET /api/alyne/shop/categories - 6 categories returned: {category_ids}")
    
    def test_get_shop_products_all(self):
        """GET /api/alyne/shop/products - should return 25 products"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Response should have 'products' key"
        assert "total" in data, "Response should have 'total' key"
        
        products = data["products"]
        assert len(products) == 25, f"Expected 25 products, got {len(products)}"
        assert data["total"] == 25, f"Expected total 25, got {data['total']}"
        
        # Verify product structure
        for product in products[:3]:  # Check first 3
            assert "id" in product, "Product should have 'id'"
            assert "name" in product, "Product should have 'name'"
            assert "brand" in product, "Product should have 'brand'"
            assert "price" in product, "Product should have 'price'"
            assert "mrp" in product, "Product should have 'mrp'"
            assert "category" in product, "Product should have 'category'"
            assert "rating" in product, "Product should have 'rating'"
        
        print(f"✓ GET /api/alyne/shop/products - 25 products returned")
    
    def test_get_shop_products_by_category(self):
        """GET /api/alyne/shop/products?category=feeding - should filter by category"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products?category=feeding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        products = data["products"]
        
        # All products should be in feeding category
        for product in products:
            assert product["category"] == "feeding", f"Product {product['name']} should be in 'feeding' category"
        
        print(f"✓ GET /api/alyne/shop/products?category=feeding - {len(products)} feeding products")
    
    def test_get_shop_products_search(self):
        """GET /api/alyne/shop/products?search=breast - should search products"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products?search=breast")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        products = data["products"]
        
        # All products should contain 'breast' in name or brand
        for product in products:
            name_brand = (product["name"] + product["brand"]).lower()
            assert "breast" in name_brand, f"Product {product['name']} should match 'breast' search"
        
        print(f"✓ GET /api/alyne/shop/products?search=breast - {len(products)} products found")
    
    def test_get_shop_bestsellers(self):
        """GET /api/alyne/shop/bestsellers - should return bestseller products"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/bestsellers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        products = data["products"]
        
        # All products should be bestsellers
        for product in products:
            assert product.get("bestseller") == True, f"Product {product['name']} should be a bestseller"
        
        print(f"✓ GET /api/alyne/shop/bestsellers - {len(products)} bestseller products")
    
    def test_get_product_details(self):
        """GET /api/alyne/shop/products/prod_001 - should return product details"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products/prod_001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "product" in data, "Response should have 'product' key"
        
        product = data["product"]
        assert product["id"] == "prod_001", f"Expected id 'prod_001', got {product['id']}"
        assert "name" in product, "Product should have 'name'"
        assert "price" in product, "Product should have 'price'"
        
        print(f"✓ GET /api/alyne/shop/products/prod_001 - {product['name']} returned")
    
    def test_get_product_not_found(self):
        """GET /api/alyne/shop/products/invalid - should return 404"""
        response = requests.get(f"{BASE_URL}/api/alyne/shop/products/invalid_product")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/alyne/shop/products/invalid_product - 404 returned correctly")


class TestAlyneAIChat:
    """Test AI Chat API - ALYNE 24/7 Pediatric Assistant"""
    
    def test_chat_endpoint_simple_message(self):
        """POST /api/alyne/chat - should return AI response"""
        payload = {
            "message": "What are the signs of teething in babies?",
            "child_id": "child_fc20ed0f2b58",  # Existing test child
            "session_id": "test_session_123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/alyne/chat?user_id=test_user_123",
            json=payload
        )
        
        # AI chat may take time, allow for 500 if service not configured
        if response.status_code == 500:
            data = response.json()
            if "AI service" in str(data.get("detail", "")):
                print(f"⚠ AI Chat service not fully configured (expected in test env)")
                pytest.skip("AI service not configured")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' key"
        assert "response" in data, "Response should have 'response' key"
        assert "session_id" in data, "Response should have 'session_id' key"
        
        assert data["success"] == True, "Chat should be successful"
        assert len(data["response"]) > 50, "AI response should be substantial"
        
        print(f"✓ POST /api/alyne/chat - AI response received ({len(data['response'])} chars)")
    
    def test_chat_history(self):
        """GET /api/alyne/chat/history/{session_id} - should return chat history"""
        response = requests.get(f"{BASE_URL}/api/alyne/chat/history/test_session_123")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "chats" in data, "Response should have 'chats' key"
        
        print(f"✓ GET /api/alyne/chat/history - {len(data['chats'])} messages in history")


class TestAlyneSymptomCheck:
    """Test Symptom Check API with age-specific recommendations"""
    
    def test_symptom_check_infant(self):
        """POST /api/alyne/symptoms/check - should return age-specific notes for infant"""
        payload = {
            "symptom": "fever",
            "child_id": "child_fc20ed0f2b58",
            "child_age_months": 2,  # Under 3 months
            "region": "india"
        }
        
        response = requests.post(f"{BASE_URL}/api/alyne/symptoms/check", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "symptom" in data, "Response should have 'symptom' key"
        assert "age_specific_notes" in data, "Response should have 'age_specific_notes'"
        assert "disclaimer" in data, "Response should have 'disclaimer'"
        
        # For infant under 3 months, should have warning
        age_notes = data["age_specific_notes"]
        assert len(age_notes) > 0, "Should have age-specific notes for infant"
        assert any("under 3 months" in note.lower() for note in age_notes), "Should warn about infants under 3 months"
        
        print(f"✓ POST /api/alyne/symptoms/check - Age-specific notes for infant: {age_notes}")


class TestExistingAlyneAPIs:
    """Verify existing ALYNE APIs still work"""
    
    def test_config_regions(self):
        """GET /api/alyne/config/regions - should return India and USA"""
        response = requests.get(f"{BASE_URL}/api/alyne/config/regions")
        assert response.status_code == 200
        data = response.json()
        assert len(data["regions"]) == 2
        print(f"✓ GET /api/alyne/config/regions - 2 regions returned")
    
    def test_get_children(self):
        """GET /api/alyne/children/{user_id} - should return children"""
        response = requests.get(f"{BASE_URL}/api/alyne/children/test_user_123")
        assert response.status_code == 200
        data = response.json()
        assert "children" in data
        print(f"✓ GET /api/alyne/children/test_user_123 - {len(data['children'])} children")
    
    def test_get_dashboard(self):
        """GET /api/alyne/dashboard/{child_id} - should return dashboard"""
        response = requests.get(f"{BASE_URL}/api/alyne/dashboard/child_fc20ed0f2b58")
        assert response.status_code == 200
        data = response.json()
        assert "child" in data
        assert "vaccination_stats" in data
        print(f"✓ GET /api/alyne/dashboard/child_fc20ed0f2b58 - Dashboard returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
