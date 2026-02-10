"""
LifeAlign - Cultural & Community Health Sync Engine
Database Models and Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# ============ ENUMS ============

class LocationType(str, Enum):
    INDIA = "INDIA"
    ABROAD = "ABROAD"

class FestivalType(str, Enum):
    FASTING = "FASTING"
    CELEBRATION = "CELEBRATION"
    NIGHT_VIGIL = "NIGHT_VIGIL"
    DRY_FAST = "DRY_FAST"
    VEGETARIAN_PERIOD = "VEGETARIAN_PERIOD"

class TriggerType(str, Enum):
    BEFORE = "BEFORE"
    DURING = "DURING"
    AFTER = "AFTER"

class ConditionType(str, Enum):
    DIABETES = "DIABETES"
    CKD = "CKD"
    PREGNANCY = "PREGNANCY"
    ELDERLY = "ELDERLY"
    GENERAL = "GENERAL"
    HYPERTENSION = "HYPERTENSION"
    HEART_DISEASE = "HEART_DISEASE"

class ActionType(str, Enum):
    ALERT = "ALERT"
    REMINDER = "REMINDER"
    RECOMMEND_TEST = "RECOMMEND_TEST"
    MEDICATION_ADJUSTMENT = "MEDICATION_ADJUSTMENT"
    HYDRATION_ALERT = "HYDRATION_ALERT"
    NUTRITION_GUIDANCE = "NUTRITION_GUIDANCE"

class NotificationStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    READ = "READ"

# ============ REQUEST/RESPONSE MODELS ============

class UserProfileUpdate(BaseModel):
    religion_id: Optional[str] = None
    community_id: Optional[str] = None
    location_type: Optional[LocationType] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    chronic_conditions: Optional[List[str]] = None
    medications: Optional[List[Dict[str, Any]]] = None
    fasting_preference: Optional[bool] = None

class FestivalDateCreate(BaseModel):
    festival_id: str
    year: int
    start_date: date
    end_date: date
    region_id: Optional[str] = None
    moon_confirmed: bool = False

class HealthRuleCreate(BaseModel):
    festival_id: str
    trigger_type: TriggerType
    condition_type: ConditionType
    action_type: ActionType
    action_payload: Dict[str, Any]
    priority_level: int = 1

class UserFestivalOptIn(BaseModel):
    festival_date_id: str
    fasting_opt_in: bool

# ============ RESPONSE MODELS ============

class ReligionResponse(BaseModel):
    religion_id: str
    religion_name: str
    description: Optional[str] = None
    is_active: bool = True

class CommunityResponse(BaseModel):
    community_id: str
    religion_id: str
    community_name: str
    description: Optional[str] = None
    is_active: bool = True

class FestivalResponse(BaseModel):
    festival_id: str
    religion_id: str
    community_id: Optional[str] = None
    festival_name: str
    festival_type: FestivalType
    description: Optional[str] = None
    is_fixed_gregorian: bool = False

class FestivalDateResponse(BaseModel):
    festival_date_id: str
    festival_id: str
    festival_name: str
    festival_type: FestivalType
    year: int
    start_date: date
    end_date: date
    days_remaining: Optional[int] = None
    is_active: bool = False
    moon_confirmed: bool = False

class HealthAlertResponse(BaseModel):
    alert_id: str
    alert_type: ActionType
    title: str
    message: str
    priority: int
    action_url: Optional[str] = None
    festival_name: Optional[str] = None

class DashboardResponse(BaseModel):
    user_religion: Optional[str] = None
    user_community: Optional[str] = None
    location_type: LocationType = LocationType.INDIA
    upcoming_festivals: List[FestivalDateResponse] = []
    active_festivals: List[FestivalDateResponse] = []
    health_alerts: List[HealthAlertResponse] = []
    health_readiness_score: int = 100
    risk_flags: List[str] = []
    recommended_tests: List[Dict[str, Any]] = []
    medication_adjustments: List[Dict[str, Any]] = []

# ============ INITIAL DATA ============

INITIAL_RELIGIONS = [
    {"religion_id": "hindu", "religion_name": "Hindu", "description": "Sanatan Dharma traditions", "is_active": True},
    {"religion_id": "muslim", "religion_name": "Muslim", "description": "Islamic traditions", "is_active": True},
    {"religion_id": "sikh", "religion_name": "Sikh", "description": "Sikh traditions", "is_active": False},
    {"religion_id": "jain", "religion_name": "Jain", "description": "Jain traditions", "is_active": False},
    {"religion_id": "christian", "religion_name": "Christian", "description": "Christian traditions", "is_active": False}
]

INITIAL_COMMUNITIES = [
    # Muslim communities
    {"community_id": "ismaili", "religion_id": "muslim", "community_name": "Ismaili", "description": "Shia Ismaili Muslims", "is_active": True},
    {"community_id": "sunni", "religion_id": "muslim", "community_name": "Sunni", "description": "Sunni Muslims", "is_active": True},
    {"community_id": "shia", "religion_id": "muslim", "community_name": "Shia", "description": "Shia Muslims", "is_active": True},
    # Hindu communities
    {"community_id": "hindu_general", "religion_id": "hindu", "community_name": "General", "description": "General Hindu traditions", "is_active": True},
    {"community_id": "hindu_brahmin", "religion_id": "hindu", "community_name": "Brahmin", "description": "Brahmin community", "is_active": True},
    {"community_id": "hindu_gujarati", "religion_id": "hindu", "community_name": "Gujarati", "description": "Gujarati Hindu traditions", "is_active": True}
]

INITIAL_FESTIVALS = [
    # Islamic festivals
    {"festival_id": "ramadan", "religion_id": "muslim", "community_id": None, "festival_name": "Ramadan", "festival_type": "FASTING", "description": "Holy month of fasting", "is_fixed_gregorian": False, "lunar_month": 9},
    {"festival_id": "eid_fitr", "religion_id": "muslim", "community_id": None, "festival_name": "Eid al-Fitr", "festival_type": "CELEBRATION", "description": "Festival of Breaking Fast", "is_fixed_gregorian": False, "lunar_month": 10},
    {"festival_id": "eid_adha", "religion_id": "muslim", "community_id": None, "festival_name": "Eid al-Adha", "festival_type": "CELEBRATION", "description": "Festival of Sacrifice", "is_fixed_gregorian": False, "lunar_month": 12},
    {"festival_id": "laylat_qadr", "religion_id": "muslim", "community_id": None, "festival_name": "Laylat al-Qadr", "festival_type": "NIGHT_VIGIL", "description": "Night of Power", "is_fixed_gregorian": False, "lunar_month": 9},
    # Ismaili specific
    {"festival_id": "imamat_day", "religion_id": "muslim", "community_id": "ismaili", "festival_name": "Imamat Day", "festival_type": "CELEBRATION", "description": "Anniversary of Imamat", "is_fixed_gregorian": True, "gregorian_date": "07-11"},
    {"festival_id": "salgirah", "religion_id": "muslim", "community_id": "ismaili", "festival_name": "Salgirah", "festival_type": "CELEBRATION", "description": "Birthday celebration of Imam", "is_fixed_gregorian": True, "gregorian_date": "12-13"},
    {"festival_id": "navroz_ismaili", "religion_id": "muslim", "community_id": "ismaili", "festival_name": "Navroz", "festival_type": "CELEBRATION", "description": "Persian New Year", "is_fixed_gregorian": True, "gregorian_date": "03-21"},
    # Hindu festivals
    {"festival_id": "chaitra_navratri", "religion_id": "hindu", "community_id": None, "festival_name": "Chaitra Navratri", "festival_type": "FASTING", "description": "Nine nights of spring", "is_fixed_gregorian": False},
    {"festival_id": "sharad_navratri", "religion_id": "hindu", "community_id": None, "festival_name": "Sharad Navratri", "festival_type": "FASTING", "description": "Nine nights of autumn", "is_fixed_gregorian": False},
    {"festival_id": "mahashivratri", "religion_id": "hindu", "community_id": None, "festival_name": "Mahashivratri", "festival_type": "NIGHT_VIGIL", "description": "Great night of Shiva", "is_fixed_gregorian": False},
    {"festival_id": "ekadashi", "religion_id": "hindu", "community_id": None, "festival_name": "Ekadashi", "festival_type": "FASTING", "description": "Fortnightly fasting day", "is_fixed_gregorian": False},
    {"festival_id": "shravan", "religion_id": "hindu", "community_id": None, "festival_name": "Shravan Month", "festival_type": "VEGETARIAN_PERIOD", "description": "Holy month of Shravan", "is_fixed_gregorian": False},
    {"festival_id": "karva_chauth", "religion_id": "hindu", "community_id": None, "festival_name": "Karva Chauth", "festival_type": "DRY_FAST", "description": "Day-long fast for spouse", "is_fixed_gregorian": False},
    {"festival_id": "diwali", "religion_id": "hindu", "community_id": None, "festival_name": "Diwali", "festival_type": "CELEBRATION", "description": "Festival of Lights", "is_fixed_gregorian": False},
    {"festival_id": "makar_sankranti", "religion_id": "hindu", "community_id": None, "festival_name": "Makar Sankranti", "festival_type": "CELEBRATION", "description": "Harvest festival", "is_fixed_gregorian": True, "gregorian_date": "01-14"}
]

# 2026 Festival Dates (sample)
FESTIVAL_DATES_2026 = [
    # Ramadan 2026 (Feb 17 - Mar 19 approx)
    {"festival_id": "ramadan", "year": 2026, "start_date": "2026-02-17", "end_date": "2026-03-19", "moon_confirmed": False},
    {"festival_id": "eid_fitr", "year": 2026, "start_date": "2026-03-20", "end_date": "2026-03-20", "moon_confirmed": False},
    {"festival_id": "eid_adha", "year": 2026, "start_date": "2026-05-27", "end_date": "2026-05-27", "moon_confirmed": False},
    # Navratri 2026
    {"festival_id": "chaitra_navratri", "year": 2026, "start_date": "2026-03-29", "end_date": "2026-04-06", "moon_confirmed": True},
    {"festival_id": "sharad_navratri", "year": 2026, "start_date": "2026-09-21", "end_date": "2026-09-29", "moon_confirmed": True},
    # Other Hindu festivals 2026
    {"festival_id": "mahashivratri", "year": 2026, "start_date": "2026-02-14", "end_date": "2026-02-14", "moon_confirmed": True},
    {"festival_id": "diwali", "year": 2026, "start_date": "2026-10-20", "end_date": "2026-10-24", "moon_confirmed": True},
    {"festival_id": "makar_sankranti", "year": 2026, "start_date": "2026-01-14", "end_date": "2026-01-14", "moon_confirmed": True},
    # Ismaili festivals
    {"festival_id": "imamat_day", "year": 2026, "start_date": "2026-07-11", "end_date": "2026-07-11", "moon_confirmed": True},
    {"festival_id": "salgirah", "year": 2026, "start_date": "2026-12-13", "end_date": "2026-12-13", "moon_confirmed": True},
    {"festival_id": "navroz_ismaili", "year": 2026, "start_date": "2026-03-21", "end_date": "2026-03-21", "moon_confirmed": True}
]

# Health Logic Rules
HEALTH_RULES = [
    # Ramadan rules
    {
        "festival_id": "ramadan",
        "trigger_type": "BEFORE",
        "condition_type": "DIABETES",
        "action_type": "ALERT",
        "action_payload": {
            "title": "Fasting Advisory",
            "message": "Patients with diabetes should consult their physician before fasting during Ramadan. Blood sugar management requires careful monitoring.",
            "severity": "high"
        },
        "priority_level": 1
    },
    {
        "festival_id": "ramadan",
        "trigger_type": "DURING",
        "condition_type": "DIABETES",
        "action_type": "MEDICATION_ADJUSTMENT",
        "action_payload": {
            "title": "Medication Timing",
            "message": "Adjust diabetes medication timing for Suhoor and Iftar. Take medications with meals.",
            "timing_shift": "iftar_suhoor"
        },
        "priority_level": 1
    },
    {
        "festival_id": "ramadan",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "HYDRATION_ALERT",
        "action_payload": {
            "title": "Hydration Reminder",
            "message": "Drink plenty of water between Iftar and Suhoor. Aim for 8-10 glasses.",
            "reminder_times": ["iftar", "before_sleep", "suhoor"]
        },
        "priority_level": 2
    },
    {
        "festival_id": "ramadan",
        "trigger_type": "BEFORE",
        "condition_type": "CKD",
        "action_type": "ALERT",
        "action_payload": {
            "title": "Medical Advisory",
            "message": "Fasting is not recommended for patients with kidney disease. Please consult your nephrologist.",
            "severity": "critical"
        },
        "priority_level": 1
    },
    {
        "festival_id": "ramadan",
        "trigger_type": "BEFORE",
        "condition_type": "PREGNANCY",
        "action_type": "ALERT",
        "action_payload": {
            "title": "Pregnancy Advisory",
            "message": "Pregnant women are exempted from fasting. Consult your OB-GYN for personalized guidance.",
            "severity": "high"
        },
        "priority_level": 1
    },
    {
        "festival_id": "ramadan",
        "trigger_type": "BEFORE",
        "condition_type": "GENERAL",
        "action_type": "RECOMMEND_TEST",
        "action_payload": {
            "title": "Pre-Ramadan Health Check",
            "message": "Get a health screening before starting your fast.",
            "tests": ["HbA1c", "Kidney Function", "Electrolytes", "CBC"]
        },
        "priority_level": 2
    },
    # Navratri rules
    {
        "festival_id": "chaitra_navratri",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "NUTRITION_GUIDANCE",
        "action_payload": {
            "title": "Navratri Nutrition",
            "message": "Include protein-rich vegetarian foods like paneer, nuts, and milk products. Avoid refined flour.",
            "diet_tips": ["sabudana_khichdi", "kuttu_atta", "fruits", "dairy"]
        },
        "priority_level": 2
    },
    {
        "festival_id": "chaitra_navratri",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "RECOMMEND_TEST",
        "action_payload": {
            "title": "Iron & B12 Check",
            "message": "Extended vegetarian fasting can affect iron and B12 levels. Consider testing if you feel fatigued.",
            "tests": ["Iron", "Ferritin", "Vitamin B12"]
        },
        "priority_level": 3
    },
    {
        "festival_id": "sharad_navratri",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "NUTRITION_GUIDANCE",
        "action_payload": {
            "title": "Navratri Nutrition",
            "message": "Stay hydrated with coconut water and fruit juices. Include sendha namak for minerals.",
            "diet_tips": ["coconut_water", "fruits", "dairy", "nuts"]
        },
        "priority_level": 2
    },
    # Karva Chauth rules
    {
        "festival_id": "karva_chauth",
        "trigger_type": "BEFORE",
        "condition_type": "DIABETES",
        "action_type": "ALERT",
        "action_payload": {
            "title": "Dry Fast Advisory",
            "message": "Dry fasting without water can be risky for diabetics. Monitor blood sugar closely.",
            "severity": "high"
        },
        "priority_level": 1
    },
    {
        "festival_id": "karva_chauth",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "HYDRATION_ALERT",
        "action_payload": {
            "title": "Pre-Dawn Hydration",
            "message": "Drink plenty of water and eat fruits before sunrise to maintain hydration.",
            "reminder_times": ["sargi"]
        },
        "priority_level": 1
    }
]
