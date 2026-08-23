"""
Test Suite for Iteration 195: Festival Banner, AI Health Insights, Family Wallet, Coins System
Tests new features: AI-powered health insights, Family wallet, Coins earning
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
TEST_PHONE = "9876543210"


class TestAIHealthInsights:
    """AI Health Insights API tests - POST /api/ai-health-insights and GET /api/ai-health-insights/history"""

    def test_ai_health_insights_post(self):
        """P1: POST /api/ai-health-insights with phone should return success:true and source:ai or source:rules"""
        response = requests.post(f"{BASE_URL}/api/ai-health-insights", json={
            "phone": TEST_PHONE
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify required fields
        assert data.get("success") == True, f"Expected success:true, got {data.get('success')}"
        assert data.get("source") in ["ai", "rules"], f"Expected source:ai or source:rules, got {data.get('source')}"
        
        # Verify response structure
        assert "ai_summary" in data, "Missing ai_summary field"
        assert "risk_factors" in data, "Missing risk_factors field"
        assert "recommendations" in data, "Missing recommendations field"
        assert "health_data" in data, "Missing health_data field"
        
        print(f"AI Health Insights: source={data.get('source')}, summary_length={len(data.get('ai_summary', ''))}")
        print(f"Response structure valid: success={data['success']}, source={data['source']}")

    def test_ai_health_insights_history(self):
        """P1: GET /api/ai-health-insights/history/{phone} should return insights array"""
        response = requests.get(f"{BASE_URL}/api/ai-health-insights/history/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify structure
        assert "insights" in data, "Missing insights field"
        assert isinstance(data["insights"], list), "insights should be a list"
        
        print(f"AI Insights history: {len(data['insights'])} records found")


class TestFamilyWallet:
    """Family Wallet API tests - GET /api/wallet/family/{phone}"""

    def test_get_family_wallet(self):
        """P1: GET /api/wallet/family/{phone} should return wallet and family_members"""
        response = requests.get(f"{BASE_URL}/api/wallet/family/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify structure
        assert "wallet" in data, "Missing wallet field"
        assert "family_members" in data, "Missing family_members field"
        assert isinstance(data["family_members"], list), "family_members should be a list"
        
        print(f"Family wallet: balance={data['wallet'].get('balance') if data['wallet'] else 'N/A'}, members={len(data['family_members'])}")


class TestWalletRoutes:
    """Wallet Add Money and Coins earning tests"""

    def test_wallet_add_money(self):
        """P1: POST /api/wallet/add-money with phone and amount should succeed"""
        response = requests.post(f"{BASE_URL}/api/wallet/add-money", json={
            "phone": TEST_PHONE,
            "amount": 10,
            "source": "self"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify success
        assert data.get("success") == True, f"Expected success:true, got {data.get('success')}"
        assert "wallet" in data, "Missing wallet field"
        assert "transaction" in data, "Missing transaction field"
        
        # Verify wallet has updated balance
        assert data["wallet"].get("balance") is not None, "Wallet balance should be present"
        
        print(f"Wallet add money: success={data['success']}, new_balance={data['wallet'].get('balance')}")

    def test_coins_earn(self):
        """P1: POST /api/coins/earn with phone, coins, action should succeed"""
        response = requests.post(f"{BASE_URL}/api/coins/earn", json={
            "phone": TEST_PHONE,
            "coins": 10,
            "action": "consultation"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify success
        assert data.get("success") == True, f"Expected success:true, got {data.get('success')}"
        assert "wallet" in data, "Missing wallet field"
        assert "coins_earned" in data, "Missing coins_earned field"
        assert data.get("coins_earned") >= 10, f"Expected at least 10 coins earned, got {data.get('coins_earned')}"
        
        print(f"Coins earned: {data['coins_earned']} coins for consultation, total={data['wallet'].get('coins')}")

    def test_wallet_get_basic(self):
        """Test basic wallet GET endpoint"""
        response = requests.get(f"{BASE_URL}/api/wallet/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "wallet" in data, "Missing wallet field"
        assert data["wallet"].get("phone") is not None, "Wallet should have phone"
        assert data["wallet"].get("balance") is not None, "Wallet should have balance"
        assert data["wallet"].get("coins") is not None, "Wallet should have coins"
        
        print(f"Wallet: balance={data['wallet'].get('balance')}, coins={data['wallet'].get('coins')}")


class TestHealthInsightsRoutes:
    """Health insights and streak endpoints"""

    def test_health_insights_basic(self):
        """Test GET /api/health-insights/{phone}"""
        response = requests.get(f"{BASE_URL}/api/health-insights/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify health score structure
        assert "health_score" in data, "Missing health_score field"
        assert "score_label" in data, "Missing score_label field"
        assert "risks" in data, "Missing risks field"
        assert "tips" in data, "Missing tips field"
        assert "stats" in data, "Missing stats field"
        
        print(f"Health insights: score={data['health_score']}, label={data['score_label']}")

    def test_health_streak_get(self):
        """Test GET /api/health-streak/{phone}"""
        response = requests.get(f"{BASE_URL}/api/health-streak/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "streak" in data, "Missing streak field"
        assert "rewards" in data, "Missing rewards field"
        
        print(f"Health streak: current={data['streak'].get('current_streak')}, longest={data['streak'].get('longest_streak')}")


class TestCoinRules:
    """Test coin rules endpoint"""

    def test_coin_rules(self):
        """Test GET /api/coins/rules"""
        response = requests.get(f"{BASE_URL}/api/coins/rules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "earning_rules" in data, "Missing earning_rules"
        assert "tier_multipliers" in data, "Missing tier_multipliers"
        assert "conversion" in data, "Missing conversion"
        assert "min_redemption" in data, "Missing min_redemption"
        
        print(f"Coin rules: conversion={data['conversion']}, min_redemption={data['min_redemption']}")


class TestAPIHealth:
    """Basic API health check"""

    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/")
        # API root may return 200 or 404, just check it responds
        assert response.status_code in [200, 404, 422], f"API not responding: {response.status_code}"
        print(f"API health check: status={response.status_code}")
