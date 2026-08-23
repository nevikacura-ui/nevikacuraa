"""
Test new features for iteration 288:
1. AI Enrichment API (admin panel)
2. Pharmacy Trending & Recently Viewed APIs
3. CuraPay email banner (code review only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIEnrichmentAPI:
    """Test AI Enrichment endpoints for admin panel"""
    
    def test_enrichment_status_endpoint(self):
        """GET /api/admin/ai-enrichment/status returns enrichment stats"""
        response = requests.get(f"{BASE_URL}/api/admin/ai-enrichment/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "total_products" in data, "Missing total_products field"
        assert "total_missing" in data, "Missing total_missing field"
        assert "enriched_percentage" in data, "Missing enriched_percentage field"
        assert "missing_by_store" in data, "Missing missing_by_store field"
        
        # Verify data types
        assert isinstance(data["total_products"], int), "total_products should be int"
        assert isinstance(data["total_missing"], int), "total_missing should be int"
        assert isinstance(data["enriched_percentage"], (int, float)), "enriched_percentage should be numeric"
        assert isinstance(data["missing_by_store"], dict), "missing_by_store should be dict"
        
        print(f"✓ Enrichment status: {data['total_products']} products, {data['enriched_percentage']}% enriched")
    
    def test_enrichment_trigger_endpoint(self):
        """POST /api/admin/ai-enrichment/trigger starts background job"""
        response = requests.post(f"{BASE_URL}/api/admin/ai-enrichment/trigger?store=all&batch_size=1&max_batches=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return job_id (either new job or existing running job)
        assert "job_id" in data, "Missing job_id in response"
        
        if data.get("success"):
            assert "message" in data, "Missing message for successful trigger"
            print(f"✓ Enrichment job started: {data['job_id']}")
        else:
            # Job already running
            assert "progress" in data or "message" in data, "Should have progress or message"
            print(f"✓ Enrichment job already running: {data['job_id']}")


class TestPharmacyTrendingAPI:
    """Test Pharmacy Trending & Recently Viewed endpoints"""
    
    def test_trending_endpoint_default(self):
        """GET /api/pharmacy/trending returns trending medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "trending" in data, "Missing trending field"
        assert isinstance(data["trending"], list), "trending should be a list"
        
        # Check source field
        assert "source" in data, "Missing source field"
        assert data["source"] in ["orders", "starred_fallback"], f"Unexpected source: {data['source']}"
        
        print(f"✓ Trending medicines: {len(data['trending'])} items (source: {data['source']})")
    
    def test_trending_endpoint_with_params(self):
        """GET /api/pharmacy/trending with store and limit params"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/trending?store=orange_pharmacy&limit=6")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "trending" in data, "Missing trending field"
        assert len(data["trending"]) <= 6, f"Expected max 6 items, got {len(data['trending'])}"
        
        # Verify medicine structure if items exist
        if data["trending"]:
            med = data["trending"][0]
            assert "id" in med, "Medicine missing id"
            assert "name" in med, "Medicine missing name"
            print(f"✓ First trending medicine: {med['name']}")
        else:
            print("✓ No trending medicines (empty list is valid)")
    
    def test_track_view_endpoint(self):
        """POST /api/pharmacy/track-view tracks medicine view"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/track-view?medicine_id=test_med_123&store=orange_pharmacy"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("tracked") == True, "Expected tracked: true"
        print("✓ Medicine view tracked successfully")
    
    def test_recently_viewed_endpoint(self):
        """GET /api/pharmacy/recently-viewed returns medicine details for IDs"""
        # First get some real medicine IDs from trending
        trending_response = requests.get(f"{BASE_URL}/api/pharmacy/trending?limit=3")
        trending_data = trending_response.json()
        
        if trending_data.get("trending"):
            # Use real medicine IDs
            ids = [m["id"] for m in trending_data["trending"][:3]]
            ids_str = ",".join(ids)
        else:
            # Use dummy IDs (will return empty list)
            ids_str = "test_id_1,test_id_2"
        
        response = requests.get(f"{BASE_URL}/api/pharmacy/recently-viewed?ids={ids_str}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "medicines" in data, "Missing medicines field"
        assert isinstance(data["medicines"], list), "medicines should be a list"
        
        print(f"✓ Recently viewed: {len(data['medicines'])} medicines returned")
    
    def test_recently_viewed_empty_ids(self):
        """GET /api/pharmacy/recently-viewed with empty IDs returns empty list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/recently-viewed?ids=")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("medicines") == [], "Expected empty medicines list"
        print("✓ Empty IDs returns empty list")


class TestEmailTemplateCodeReview:
    """Code review for CuraPay email banner changes"""
    
    def test_curapay_logo_url_updated(self):
        """Verify CuraPay logo URL is updated in email_templates.py"""
        # Read the email templates file
        import sys
        sys.path.insert(0, '/app/backend')
        from services.email_templates import LOGO_CURAPAY
        
        expected_url = "https://customer-assets.emergentagent.com/job_01733c5e-6170-4599-b958-d3155c19b432/artifacts/7ghwsms8_file_00000000ca5c7208bdd5e559e8f91fba.png"
        assert LOGO_CURAPAY == expected_url, f"CuraPay logo URL mismatch: {LOGO_CURAPAY}"
        print(f"✓ CuraPay logo URL correct: {LOGO_CURAPAY[:60]}...")
    
    def test_curapay_banner_has_dark_background(self):
        """Verify CuraPay banner uses dark background (#111827)"""
        with open('/app/backend/services/email_templates.py', 'r') as f:
            content = f.read()
        
        # Check for dark background in curapay_block
        assert 'background:#111827' in content, "CuraPay banner should have dark background #111827"
        print("✓ CuraPay banner has dark background (#111827)")
    
    def test_curapay_banner_has_curacoins_text(self):
        """Verify CuraPay banner has CuraCoins/CuraCare points text"""
        with open('/app/backend/services/email_templates.py', 'r') as f:
            content = f.read()
        
        assert 'CuraCoins' in content, "CuraPay banner should mention CuraCoins"
        assert 'CuraCare' in content, "CuraPay banner should mention CuraCare"
        print("✓ CuraPay banner has CuraCoins and CuraCare text")
    
    def test_curapay_logo_height_60px(self):
        """Verify CuraPay logo height is 60px"""
        with open('/app/backend/services/email_templates.py', 'r') as f:
            content = f.read()
        
        # Check for height:60px in the curapay block
        assert 'height:60px' in content, "CuraPay logo should have height:60px"
        print("✓ CuraPay logo height is 60px")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
