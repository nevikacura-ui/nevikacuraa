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
    {"religion_id": "jain", "religion_name": "Jain", "description": "Jain traditions", "is_active": True},
    {"religion_id": "christian", "religion_name": "Christian", "description": "Christian traditions", "is_active": True}
]

INITIAL_COMMUNITIES = [
    # Muslim communities
    {"community_id": "ismaili", "religion_id": "muslim", "community_name": "Ismaili", "description": "Shia Ismaili Muslims", "is_active": True},
    {"community_id": "sunni", "religion_id": "muslim", "community_name": "Sunni", "description": "Sunni Muslims", "is_active": True},
    {"community_id": "shia", "religion_id": "muslim", "community_name": "Shia", "description": "Shia Muslims", "is_active": True},
    # Hindu communities
    {"community_id": "hindu_general", "religion_id": "hindu", "community_name": "General", "description": "General Hindu traditions", "is_active": True},
    {"community_id": "hindu_brahmin", "religion_id": "hindu", "community_name": "Brahmin", "description": "Brahmin community", "is_active": True},
    {"community_id": "hindu_gujarati", "religion_id": "hindu", "community_name": "Gujarati", "description": "Gujarati Hindu traditions", "is_active": True},
    {"community_id": "hindu_marathi", "religion_id": "hindu", "community_name": "Marathi", "description": "Marathi Hindu traditions", "is_active": True},
    {"community_id": "hindu_south_indian", "religion_id": "hindu", "community_name": "South Indian", "description": "South Indian Hindu traditions", "is_active": True},
    # Jain communities
    {"community_id": "jain_shwetambar", "religion_id": "jain", "community_name": "Shwetambar", "description": "Shwetambar Jains", "is_active": True},
    {"community_id": "jain_digambar", "religion_id": "jain", "community_name": "Digambar", "description": "Digambar Jains", "is_active": True},
    {"community_id": "jain_general", "religion_id": "jain", "community_name": "General", "description": "General Jain traditions", "is_active": True},
    # Christian communities
    {"community_id": "christian_catholic", "religion_id": "christian", "community_name": "Catholic", "description": "Roman Catholic traditions", "is_active": True},
    {"community_id": "christian_protestant", "religion_id": "christian", "community_name": "Protestant", "description": "Protestant traditions", "is_active": True},
    {"community_id": "christian_orthodox", "religion_id": "christian", "community_name": "Orthodox", "description": "Orthodox Christian traditions", "is_active": True},
    {"community_id": "christian_general", "religion_id": "christian", "community_name": "General", "description": "General Christian traditions", "is_active": True}
]

INITIAL_FESTIVALS = [
    # Islamic festivals
    {"festival_id": "ramadan", "religion_id": "muslim", "community_id": None, "festival_name": "Ramadan", "festival_type": "FASTING", "description": "Holy month of fasting", "is_fixed_gregorian": False, "lunar_month": 9},
    {"festival_id": "eid_fitr", "religion_id": "muslim", "community_id": None, "festival_name": "Eid al-Fitr", "festival_type": "CELEBRATION", "description": "Festival of Breaking Fast", "is_fixed_gregorian": False, "lunar_month": 10},
    {"festival_id": "eid_adha", "religion_id": "muslim", "community_id": None, "festival_name": "Eid al-Adha", "festival_type": "CELEBRATION", "description": "Festival of Sacrifice", "is_fixed_gregorian": False, "lunar_month": 12},
    {"festival_id": "laylat_qadr", "religion_id": "muslim", "community_id": None, "festival_name": "Laylat al-Qadr", "festival_type": "NIGHT_VIGIL", "description": "Night of Power", "is_fixed_gregorian": False, "lunar_month": 9},
    # Ismaili specific
    {"festival_id": "imamat_day", "religion_id": "muslim", "community_id": "ismaili", "festival_name": "Imamat Day", "festival_type": "CELEBRATION", "description": "Anniversary of Imamat", "is_fixed_gregorian": True, "gregorian_date": "07-11"},
    {"festival_id": "salgirah", "religion_id": "muslim", "community_id": "ismaili", "festival_name": "Salgirah", "festival_type": "CELEBRATION", "description": "Birthday of His Highness the Aga Khan", "is_fixed_gregorian": True, "gregorian_date": "10-12"},
    {"festival_id": "navroz_ismaili", "religion_id": "muslim", "community_id": "ismaili", "festival_name": "Navroz", "festival_type": "CELEBRATION", "description": "Persian New Year - Spring Equinox", "is_fixed_gregorian": True, "gregorian_date": "03-21"},
    {"festival_id": "chand_raat", "religion_id": "muslim", "community_id": None, "festival_name": "Chand Raat", "festival_type": "CELEBRATION", "description": "Moon Sighting Night before Eid", "is_fixed_gregorian": False, "lunar_month": 10},
    {"festival_id": "shab_e_meraj", "religion_id": "muslim", "community_id": None, "festival_name": "Shab-e-Meraj", "festival_type": "NIGHT_VIGIL", "description": "Night of Ascension", "is_fixed_gregorian": False, "lunar_month": 7},
    # Hindu festivals
    {"festival_id": "chaitra_navratri", "religion_id": "hindu", "community_id": None, "festival_name": "Chaitra Navratri", "festival_type": "FASTING", "description": "Nine nights of spring", "is_fixed_gregorian": False},
    {"festival_id": "sharad_navratri", "religion_id": "hindu", "community_id": None, "festival_name": "Sharad Navratri", "festival_type": "FASTING", "description": "Nine nights of autumn", "is_fixed_gregorian": False},
    {"festival_id": "mahashivratri", "religion_id": "hindu", "community_id": None, "festival_name": "Mahashivratri", "festival_type": "NIGHT_VIGIL", "description": "Great night of Shiva", "is_fixed_gregorian": False},
    {"festival_id": "ekadashi", "religion_id": "hindu", "community_id": None, "festival_name": "Ekadashi", "festival_type": "FASTING", "description": "Fortnightly fasting day", "is_fixed_gregorian": False},
    {"festival_id": "shravan", "religion_id": "hindu", "community_id": None, "festival_name": "Shravan Month", "festival_type": "VEGETARIAN_PERIOD", "description": "Holy month of Shravan", "is_fixed_gregorian": False},
    {"festival_id": "karva_chauth", "religion_id": "hindu", "community_id": None, "festival_name": "Karva Chauth", "festival_type": "DRY_FAST", "description": "Day-long fast for spouse", "is_fixed_gregorian": False},
    {"festival_id": "diwali", "religion_id": "hindu", "community_id": None, "festival_name": "Diwali", "festival_type": "CELEBRATION", "description": "Festival of Lights", "is_fixed_gregorian": False},
    {"festival_id": "makar_sankranti", "religion_id": "hindu", "community_id": None, "festival_name": "Makar Sankranti", "festival_type": "CELEBRATION", "description": "Harvest festival", "is_fixed_gregorian": True, "gregorian_date": "01-14"},
    {"festival_id": "holi", "religion_id": "hindu", "community_id": None, "festival_name": "Holi", "festival_type": "CELEBRATION", "description": "Festival of Colors", "is_fixed_gregorian": False},
    {"festival_id": "ganesh_chaturthi", "religion_id": "hindu", "community_id": None, "festival_name": "Ganesh Chaturthi", "festival_type": "CELEBRATION", "description": "Birthday of Lord Ganesha", "is_fixed_gregorian": False},
    {"festival_id": "janmashtami", "religion_id": "hindu", "community_id": None, "festival_name": "Janmashtami", "festival_type": "FASTING", "description": "Birthday of Lord Krishna", "is_fixed_gregorian": False},
    # Jain festivals
    {"festival_id": "paryushana", "religion_id": "jain", "community_id": None, "festival_name": "Paryushana Parva", "festival_type": "FASTING", "description": "Eight or ten days of fasting and reflection", "is_fixed_gregorian": False},
    {"festival_id": "das_lakshana", "religion_id": "jain", "community_id": "jain_digambar", "festival_name": "Das Lakshana", "festival_type": "FASTING", "description": "Ten-day festival of forgiveness", "is_fixed_gregorian": False},
    {"festival_id": "mahavir_jayanti", "religion_id": "jain", "community_id": None, "festival_name": "Mahavir Jayanti", "festival_type": "CELEBRATION", "description": "Birth anniversary of Lord Mahavir", "is_fixed_gregorian": False},
    {"festival_id": "diwali_jain", "religion_id": "jain", "community_id": None, "festival_name": "Diwali (Jain)", "festival_type": "CELEBRATION", "description": "Nirvana of Lord Mahavir", "is_fixed_gregorian": False},
    {"festival_id": "samvatsari", "religion_id": "jain", "community_id": None, "festival_name": "Samvatsari", "festival_type": "CELEBRATION", "description": "Day of seeking forgiveness", "is_fixed_gregorian": False},
    {"festival_id": "ayambil_oli", "religion_id": "jain", "community_id": None, "festival_name": "Ayambil Oli", "festival_type": "FASTING", "description": "Nine-day fasting period twice a year", "is_fixed_gregorian": False},
    # Christian festivals
    {"festival_id": "lent", "religion_id": "christian", "community_id": None, "festival_name": "Lent", "festival_type": "FASTING", "description": "40 days of fasting before Easter", "is_fixed_gregorian": False},
    {"festival_id": "good_friday", "religion_id": "christian", "community_id": None, "festival_name": "Good Friday", "festival_type": "FASTING", "description": "Day of fasting commemorating crucifixion", "is_fixed_gregorian": False},
    {"festival_id": "easter", "religion_id": "christian", "community_id": None, "festival_name": "Easter", "festival_type": "CELEBRATION", "description": "Resurrection of Jesus Christ", "is_fixed_gregorian": False},
    {"festival_id": "christmas", "religion_id": "christian", "community_id": None, "festival_name": "Christmas", "festival_type": "CELEBRATION", "description": "Birth of Jesus Christ", "is_fixed_gregorian": True, "gregorian_date": "12-25"},
    {"festival_id": "ash_wednesday", "religion_id": "christian", "community_id": None, "festival_name": "Ash Wednesday", "festival_type": "FASTING", "description": "Beginning of Lent", "is_fixed_gregorian": False},
    {"festival_id": "advent", "religion_id": "christian", "community_id": None, "festival_name": "Advent", "festival_type": "VEGETARIAN_PERIOD", "description": "Four weeks before Christmas", "is_fixed_gregorian": False}
]

# 2026 Festival Dates (sample)
FESTIVAL_DATES_2026 = [
    # Ramadan 2026 (Feb 19 - Mar 20) - Based on Mumbai calendar
    {"festival_id": "ramadan", "year": 2026, "start_date": "2026-02-19", "end_date": "2026-03-20", "moon_confirmed": True},
    {"festival_id": "eid_fitr", "year": 2026, "start_date": "2026-03-21", "end_date": "2026-03-21", "moon_confirmed": False},
    {"festival_id": "eid_adha", "year": 2026, "start_date": "2026-05-27", "end_date": "2026-05-27", "moon_confirmed": False},
    {"festival_id": "laylat_qadr", "year": 2026, "start_date": "2026-03-15", "end_date": "2026-03-17", "moon_confirmed": True},
    # Ismaili specific events 2026
    {"festival_id": "imamat_day", "year": 2026, "start_date": "2026-07-11", "end_date": "2026-07-11", "moon_confirmed": True},
    {"festival_id": "salgirah", "year": 2026, "start_date": "2026-10-12", "end_date": "2026-10-12", "moon_confirmed": True},
    {"festival_id": "navroz_ismaili", "year": 2026, "start_date": "2026-03-21", "end_date": "2026-03-21", "moon_confirmed": True},
    {"festival_id": "chand_raat", "year": 2026, "start_date": "2026-03-20", "end_date": "2026-03-20", "moon_confirmed": False},
    {"festival_id": "shab_e_meraj", "year": 2026, "start_date": "2026-01-27", "end_date": "2026-01-27", "moon_confirmed": True},
    # Hindu festivals 2026
    {"festival_id": "chaitra_navratri", "year": 2026, "start_date": "2026-03-29", "end_date": "2026-04-06", "moon_confirmed": True},
    {"festival_id": "sharad_navratri", "year": 2026, "start_date": "2026-09-21", "end_date": "2026-09-29", "moon_confirmed": True},
    {"festival_id": "mahashivratri", "year": 2026, "start_date": "2026-02-14", "end_date": "2026-02-14", "moon_confirmed": True},
    {"festival_id": "diwali", "year": 2026, "start_date": "2026-10-20", "end_date": "2026-10-24", "moon_confirmed": True},
    {"festival_id": "makar_sankranti", "year": 2026, "start_date": "2026-01-14", "end_date": "2026-01-14", "moon_confirmed": True},
    {"festival_id": "holi", "year": 2026, "start_date": "2026-03-10", "end_date": "2026-03-11", "moon_confirmed": True},
    {"festival_id": "ganesh_chaturthi", "year": 2026, "start_date": "2026-08-27", "end_date": "2026-09-06", "moon_confirmed": True},
    {"festival_id": "janmashtami", "year": 2026, "start_date": "2026-08-14", "end_date": "2026-08-14", "moon_confirmed": True},
    {"festival_id": "karva_chauth", "year": 2026, "start_date": "2026-10-13", "end_date": "2026-10-13", "moon_confirmed": True},
    # Jain festivals 2026
    {"festival_id": "paryushana", "year": 2026, "start_date": "2026-08-20", "end_date": "2026-08-27", "moon_confirmed": True},
    {"festival_id": "das_lakshana", "year": 2026, "start_date": "2026-08-20", "end_date": "2026-08-29", "moon_confirmed": True},
    {"festival_id": "mahavir_jayanti", "year": 2026, "start_date": "2026-04-02", "end_date": "2026-04-02", "moon_confirmed": True},
    {"festival_id": "diwali_jain", "year": 2026, "start_date": "2026-10-20", "end_date": "2026-10-20", "moon_confirmed": True},
    {"festival_id": "samvatsari", "year": 2026, "start_date": "2026-08-27", "end_date": "2026-08-27", "moon_confirmed": True},
    {"festival_id": "ayambil_oli", "year": 2026, "start_date": "2026-03-22", "end_date": "2026-03-30", "moon_confirmed": True},
    # Christian festivals 2026
    {"festival_id": "lent", "year": 2026, "start_date": "2026-02-18", "end_date": "2026-04-04", "moon_confirmed": True},
    {"festival_id": "ash_wednesday", "year": 2026, "start_date": "2026-02-18", "end_date": "2026-02-18", "moon_confirmed": True},
    {"festival_id": "good_friday", "year": 2026, "start_date": "2026-04-03", "end_date": "2026-04-03", "moon_confirmed": True},
    {"festival_id": "easter", "year": 2026, "start_date": "2026-04-05", "end_date": "2026-04-05", "moon_confirmed": True},
    {"festival_id": "christmas", "year": 2026, "start_date": "2026-12-25", "end_date": "2026-12-25", "moon_confirmed": True},
    {"festival_id": "advent", "year": 2026, "start_date": "2026-11-29", "end_date": "2026-12-24", "moon_confirmed": True}
]

# Mumbai Ramadan 2026 Daily Timings
RAMADAN_TIMINGS_2026 = [
    {"day": 1, "date": "2026-02-19", "sehri": "05:51", "iftar": "18:41", "special": None},
    {"day": 2, "date": "2026-02-20", "sehri": "05:51", "iftar": "18:41", "special": None},
    {"day": 3, "date": "2026-02-21", "sehri": "05:50", "iftar": "18:42", "special": None},
    {"day": 4, "date": "2026-02-22", "sehri": "05:50", "iftar": "18:42", "special": None},
    {"day": 5, "date": "2026-02-23", "sehri": "05:49", "iftar": "18:42", "special": None},
    {"day": 6, "date": "2026-02-24", "sehri": "05:48", "iftar": "18:43", "special": None},
    {"day": 7, "date": "2026-02-25", "sehri": "05:48", "iftar": "18:43", "special": None},
    {"day": 8, "date": "2026-02-26", "sehri": "05:47", "iftar": "18:43", "special": None},
    {"day": 9, "date": "2026-02-27", "sehri": "05:46", "iftar": "18:44", "special": None},
    {"day": 10, "date": "2026-02-28", "sehri": "05:46", "iftar": "18:44", "special": None},
    {"day": 11, "date": "2026-03-01", "sehri": "05:45", "iftar": "18:44", "special": None},
    {"day": 12, "date": "2026-03-02", "sehri": "05:44", "iftar": "18:45", "special": None},
    {"day": 13, "date": "2026-03-03", "sehri": "05:44", "iftar": "18:45", "special": None},
    {"day": 14, "date": "2026-03-04", "sehri": "05:43", "iftar": "18:45", "special": None},
    {"day": 15, "date": "2026-03-05", "sehri": "05:42", "iftar": "18:46", "special": None},
    {"day": 16, "date": "2026-03-06", "sehri": "05:41", "iftar": "18:46", "special": None},
    {"day": 17, "date": "2026-03-07", "sehri": "05:41", "iftar": "18:46", "special": None},
    {"day": 18, "date": "2026-03-08", "sehri": "05:40", "iftar": "18:47", "special": None},
    {"day": 19, "date": "2026-03-09", "sehri": "05:39", "iftar": "18:47", "special": None},
    {"day": 20, "date": "2026-03-10", "sehri": "05:38", "iftar": "18:47", "special": None},
    {"day": 21, "date": "2026-03-11", "sehri": "05:38", "iftar": "18:47", "special": "Odd Night - Laylat al-Qadr possible"},
    {"day": 22, "date": "2026-03-12", "sehri": "05:37", "iftar": "18:48", "special": None},
    {"day": 23, "date": "2026-03-13", "sehri": "05:36", "iftar": "18:48", "special": "Odd Night - Laylat al-Qadr possible"},
    {"day": 24, "date": "2026-03-14", "sehri": "05:35", "iftar": "18:48", "special": None},
    {"day": 25, "date": "2026-03-15", "sehri": "05:34", "iftar": "18:49", "special": "Odd Night - Laylat al-Qadr possible"},
    {"day": 26, "date": "2026-03-16", "sehri": "05:33", "iftar": "18:49", "special": None},
    {"day": 27, "date": "2026-03-17", "sehri": "05:33", "iftar": "18:49", "special": "Laylat al-Qadr - Night of Power"},
    {"day": 28, "date": "2026-03-18", "sehri": "05:32", "iftar": "18:49", "special": None},
    {"day": 29, "date": "2026-03-19", "sehri": "05:31", "iftar": "18:50", "special": "Possible Chand Raat"},
    {"day": 30, "date": "2026-03-20", "sehri": "05:30", "iftar": "18:50", "special": "Chand Raat - Moon Sighting Night"}
]

# Exclusive FaithCare Access Accounts (30 accounts)
FAITHCARE_ACCOUNTS = [
    {"user_id": "FC2026001", "password": "faith@care001", "name": "User 1", "active": True},
    {"user_id": "FC2026002", "password": "faith@care002", "name": "User 2", "active": True},
    {"user_id": "FC2026003", "password": "faith@care003", "name": "User 3", "active": True},
    {"user_id": "FC2026004", "password": "faith@care004", "name": "User 4", "active": True},
    {"user_id": "FC2026005", "password": "faith@care005", "name": "User 5", "active": True},
    {"user_id": "FC2026006", "password": "faith@care006", "name": "User 6", "active": True},
    {"user_id": "FC2026007", "password": "faith@care007", "name": "User 7", "active": True},
    {"user_id": "FC2026008", "password": "faith@care008", "name": "User 8", "active": True},
    {"user_id": "FC2026009", "password": "faith@care009", "name": "User 9", "active": True},
    {"user_id": "FC2026010", "password": "faith@care010", "name": "User 10", "active": True},
    {"user_id": "FC2026011", "password": "faith@care011", "name": "User 11", "active": True},
    {"user_id": "FC2026012", "password": "faith@care012", "name": "User 12", "active": True},
    {"user_id": "FC2026013", "password": "faith@care013", "name": "User 13", "active": True},
    {"user_id": "FC2026014", "password": "faith@care014", "name": "User 14", "active": True},
    {"user_id": "FC2026015", "password": "faith@care015", "name": "User 15", "active": True},
    {"user_id": "FC2026016", "password": "faith@care016", "name": "User 16", "active": True},
    {"user_id": "FC2026017", "password": "faith@care017", "name": "User 17", "active": True},
    {"user_id": "FC2026018", "password": "faith@care018", "name": "User 18", "active": True},
    {"user_id": "FC2026019", "password": "faith@care019", "name": "User 19", "active": True},
    {"user_id": "FC2026020", "password": "faith@care020", "name": "User 20", "active": True},
    {"user_id": "FC2026021", "password": "faith@care021", "name": "User 21", "active": True},
    {"user_id": "FC2026022", "password": "faith@care022", "name": "User 22", "active": True},
    {"user_id": "FC2026023", "password": "faith@care023", "name": "User 23", "active": True},
    {"user_id": "FC2026024", "password": "faith@care024", "name": "User 24", "active": True},
    {"user_id": "FC2026025", "password": "faith@care025", "name": "User 25", "active": True},
    {"user_id": "FC2026026", "password": "faith@care026", "name": "User 26", "active": True},
    {"user_id": "FC2026027", "password": "faith@care027", "name": "User 27", "active": True},
    {"user_id": "FC2026028", "password": "faith@care028", "name": "User 28", "active": True},
    {"user_id": "FC2026029", "password": "faith@care029", "name": "User 29", "active": True},
    {"user_id": "FC2026030", "password": "faith@care030", "name": "User 30", "active": True}
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
    },
    # Jain Paryushana rules
    {
        "festival_id": "paryushana",
        "trigger_type": "BEFORE",
        "condition_type": "DIABETES",
        "action_type": "ALERT",
        "action_payload": {
            "title": "Paryushana Fasting Advisory",
            "message": "Extended fasting during Paryushana can affect blood sugar. Consult your doctor before participating.",
            "severity": "high"
        },
        "priority_level": 1
    },
    {
        "festival_id": "paryushana",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "NUTRITION_GUIDANCE",
        "action_payload": {
            "title": "Paryushana Nutrition",
            "message": "Maintain energy with easily digestible foods like khichdi, fruits, and boiled vegetables during eating hours.",
            "diet_tips": ["light_meals", "fruits", "boiled_vegetables", "buttermilk"]
        },
        "priority_level": 2
    },
    {
        "festival_id": "paryushana",
        "trigger_type": "BEFORE",
        "condition_type": "GENERAL",
        "action_type": "RECOMMEND_TEST",
        "action_payload": {
            "title": "Pre-Paryushana Health Check",
            "message": "Check your health status before beginning the fasting period.",
            "tests": ["CBC", "Blood Sugar", "Electrolytes"]
        },
        "priority_level": 2
    },
    {
        "festival_id": "ayambil_oli",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "NUTRITION_GUIDANCE",
        "action_payload": {
            "title": "Ayambil Nutrition",
            "message": "Ayambil fasting involves bland, oil-free food. Ensure adequate protein through pulses and legumes.",
            "diet_tips": ["bland_food", "no_oil", "pulses", "vegetables"]
        },
        "priority_level": 2
    },
    # Christian Lent rules
    {
        "festival_id": "lent",
        "trigger_type": "BEFORE",
        "condition_type": "DIABETES",
        "action_type": "ALERT",
        "action_payload": {
            "title": "Lenten Fasting Advisory",
            "message": "Fasting and abstinence during Lent requires careful blood sugar management. Consult your physician.",
            "severity": "medium"
        },
        "priority_level": 1
    },
    {
        "festival_id": "lent",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "NUTRITION_GUIDANCE",
        "action_payload": {
            "title": "Lenten Nutrition",
            "message": "Focus on fish, vegetables, and legumes during Lent. Maintain balanced nutrition while abstaining from meat.",
            "diet_tips": ["fish", "vegetables", "legumes", "whole_grains"]
        },
        "priority_level": 2
    },
    {
        "festival_id": "good_friday",
        "trigger_type": "DURING",
        "condition_type": "DIABETES",
        "action_type": "ALERT",
        "action_payload": {
            "title": "Good Friday Fast",
            "message": "Fasting on Good Friday requires careful blood sugar monitoring. Consider partial fasting if needed.",
            "severity": "medium"
        },
        "priority_level": 1
    },
    {
        "festival_id": "good_friday",
        "trigger_type": "DURING",
        "condition_type": "GENERAL",
        "action_type": "HYDRATION_ALERT",
        "action_payload": {
            "title": "Hydration Reminder",
            "message": "Stay hydrated during your fast. Water and clear liquids are permitted.",
            "reminder_times": ["morning", "afternoon", "evening"]
        },
        "priority_level": 2
    }
]



# ============ JAMATKHANA DATABASE ============
# Ismaili Jamatkhanas in India, USA, and Canada

JAMATKHANAS = [
    # India - Mumbai
    {"id": "jk_mumbai_1", "name": "Hasanabad Jamatkhana", "city": "Mumbai", "state": "Maharashtra", "country": "India", "address": "Hasanabad, Bhendi Bazaar, Mumbai 400003", "lat": 18.9586, "lng": 72.8313, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_mumbai_2", "name": "Khetwadi Jamatkhana", "city": "Mumbai", "state": "Maharashtra", "country": "India", "address": "Khetwadi, Mumbai 400004", "lat": 18.9567, "lng": 72.8215, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_mumbai_3", "name": "Dongri Jamatkhana", "city": "Mumbai", "state": "Maharashtra", "country": "India", "address": "Dongri, Mumbai 400009", "lat": 18.9520, "lng": 72.8390, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_mumbai_4", "name": "Byculla Jamatkhana", "city": "Mumbai", "state": "Maharashtra", "country": "India", "address": "Byculla, Mumbai 400008", "lat": 18.9785, "lng": 72.8347, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_mumbai_5", "name": "Mahalaxmi Jamatkhana", "city": "Mumbai", "state": "Maharashtra", "country": "India", "address": "Mahalaxmi, Mumbai 400034", "lat": 18.9825, "lng": 72.8114, "timings": {"morning": "05:30", "evening": "19:00"}},
    # India - Other Cities
    {"id": "jk_ahmedabad", "name": "Ahmedabad Jamatkhana", "city": "Ahmedabad", "state": "Gujarat", "country": "India", "address": "Relief Road, Ahmedabad 380001", "lat": 23.0225, "lng": 72.5714, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_bangalore", "name": "Bangalore Jamatkhana", "city": "Bangalore", "state": "Karnataka", "country": "India", "address": "Commercial Street, Bangalore 560001", "lat": 12.9814, "lng": 77.6087, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_kolkata", "name": "Kolkata Jamatkhana", "city": "Kolkata", "state": "West Bengal", "country": "India", "address": "Park Street Area, Kolkata 700016", "lat": 22.5532, "lng": 88.3510, "timings": {"morning": "05:30", "evening": "18:30"}},
    {"id": "jk_delhi", "name": "Delhi Jamatkhana", "city": "New Delhi", "state": "Delhi", "country": "India", "address": "Nizamuddin, New Delhi 110013", "lat": 28.5921, "lng": 77.2416, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_hyderabad", "name": "Hyderabad Jamatkhana", "city": "Hyderabad", "state": "Telangana", "country": "India", "address": "Banjara Hills, Hyderabad 500034", "lat": 17.4256, "lng": 78.4481, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_pune", "name": "Pune Jamatkhana", "city": "Pune", "state": "Maharashtra", "country": "India", "address": "Camp Area, Pune 411001", "lat": 18.5074, "lng": 73.8077, "timings": {"morning": "05:30", "evening": "19:00"}},
    {"id": "jk_surat", "name": "Surat Jamatkhana", "city": "Surat", "state": "Gujarat", "country": "India", "address": "Ring Road, Surat 395002", "lat": 21.1702, "lng": 72.8311, "timings": {"morning": "05:30", "evening": "19:00"}},
    
    # USA - East Coast
    {"id": "jk_nyc_queens", "name": "Headquarters Jamatkhana", "city": "New York", "state": "New York", "country": "USA", "address": "188-15 Union Turnpike, Fresh Meadows, NY 11366", "lat": 40.7282, "lng": -73.7949, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_nyc_manhattan", "name": "Manhattan Jamatkhana", "city": "New York", "state": "New York", "country": "USA", "address": "1 East 28th Street, New York, NY 10016", "lat": 40.7435, "lng": -73.9846, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_nj", "name": "New Jersey Jamatkhana", "city": "Edison", "state": "New Jersey", "country": "USA", "address": "Edison, NJ 08817", "lat": 40.5187, "lng": -74.4121, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_boston", "name": "Boston Jamatkhana", "city": "Boston", "state": "Massachusetts", "country": "USA", "address": "Waltham, MA 02451", "lat": 42.3765, "lng": -71.2356, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_philly", "name": "Philadelphia Jamatkhana", "city": "Philadelphia", "state": "Pennsylvania", "country": "USA", "address": "King of Prussia, PA 19406", "lat": 40.0876, "lng": -75.3821, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_dc", "name": "Washington DC Jamatkhana", "city": "Washington", "state": "DC", "country": "USA", "address": "Silver Spring, MD 20910", "lat": 38.9943, "lng": -77.0266, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_atlanta", "name": "Atlanta Jamatkhana", "city": "Atlanta", "state": "Georgia", "country": "USA", "address": "5765 N Point Pkwy, Alpharetta, GA 30022", "lat": 34.0454, "lng": -84.2807, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_miami", "name": "Miami Jamatkhana", "city": "Miami", "state": "Florida", "country": "USA", "address": "Coral Springs, FL 33065", "lat": 26.2285, "lng": -80.2711, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_tampa", "name": "Tampa Jamatkhana", "city": "Tampa", "state": "Florida", "country": "USA", "address": "Brandon, FL 33511", "lat": 27.9378, "lng": -82.2859, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_orlando", "name": "Orlando Jamatkhana", "city": "Orlando", "state": "Florida", "country": "USA", "address": "Orlando, FL 32819", "lat": 28.4512, "lng": -81.4624, "timings": {"morning": "06:00", "evening": "19:30"}},
    
    # USA - South/Central
    {"id": "jk_houston_main", "name": "Houston Headquarters", "city": "Houston", "state": "Texas", "country": "USA", "address": "12655 Dairy Ashford, Sugar Land, TX 77478", "lat": 29.6196, "lng": -95.6349, "timings": {"morning": "06:00", "evening": "20:00"}},
    {"id": "jk_houston_katy", "name": "Katy Jamatkhana", "city": "Houston", "state": "Texas", "country": "USA", "address": "Katy, TX 77449", "lat": 29.7858, "lng": -95.8245, "timings": {"morning": "06:00", "evening": "20:00"}},
    {"id": "jk_dallas_main", "name": "Dallas Headquarters", "city": "Dallas", "state": "Texas", "country": "USA", "address": "3901 W Park Blvd, Plano, TX 75075", "lat": 33.0198, "lng": -96.6989, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_austin", "name": "Austin Jamatkhana", "city": "Austin", "state": "Texas", "country": "USA", "address": "Austin, TX 78729", "lat": 30.4515, "lng": -97.7925, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_chicago_main", "name": "Chicago Headquarters", "city": "Chicago", "state": "Illinois", "country": "USA", "address": "2550 Willow Rd, Glenview, IL 60025", "lat": 42.0856, "lng": -87.7870, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_detroit", "name": "Detroit Jamatkhana", "city": "Detroit", "state": "Michigan", "country": "USA", "address": "Canton, MI 48187", "lat": 42.3087, "lng": -83.4817, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_minneapolis", "name": "Minneapolis Jamatkhana", "city": "Minneapolis", "state": "Minnesota", "country": "USA", "address": "Bloomington, MN 55437", "lat": 44.8408, "lng": -93.2983, "timings": {"morning": "06:00", "evening": "19:30"}},
    
    # USA - West Coast
    {"id": "jk_la_main", "name": "Los Angeles Headquarters", "city": "Los Angeles", "state": "California", "country": "USA", "address": "5959 Triumph St, Commerce, CA 90040", "lat": 33.9716, "lng": -118.1581, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_la_oc", "name": "Orange County Jamatkhana", "city": "Irvine", "state": "California", "country": "USA", "address": "Irvine, CA 92618", "lat": 33.6846, "lng": -117.8265, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_sf_main", "name": "San Francisco Headquarters", "city": "San Francisco", "state": "California", "country": "USA", "address": "36650 Fremont Blvd, Fremont, CA 94536", "lat": 37.5485, "lng": -121.9886, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_sj", "name": "San Jose Jamatkhana", "city": "San Jose", "state": "California", "country": "USA", "address": "San Jose, CA 95134", "lat": 37.4275, "lng": -121.9066, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_sandiego", "name": "San Diego Jamatkhana", "city": "San Diego", "state": "California", "country": "USA", "address": "San Diego, CA 92126", "lat": 32.9157, "lng": -117.1219, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_seattle", "name": "Seattle Jamatkhana", "city": "Seattle", "state": "Washington", "country": "USA", "address": "Kirkland, WA 98034", "lat": 47.7088, "lng": -122.1915, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_portland", "name": "Portland Jamatkhana", "city": "Portland", "state": "Oregon", "country": "USA", "address": "Beaverton, OR 97008", "lat": 45.4654, "lng": -122.8023, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_phoenix", "name": "Phoenix Jamatkhana", "city": "Phoenix", "state": "Arizona", "country": "USA", "address": "Scottsdale, AZ 85260", "lat": 33.5684, "lng": -111.8906, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_denver", "name": "Denver Jamatkhana", "city": "Denver", "state": "Colorado", "country": "USA", "address": "Aurora, CO 80014", "lat": 39.6501, "lng": -104.7854, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_lasvegas", "name": "Las Vegas Jamatkhana", "city": "Las Vegas", "state": "Nevada", "country": "USA", "address": "Henderson, NV 89052", "lat": 36.0123, "lng": -115.0372, "timings": {"morning": "06:00", "evening": "19:30"}},
    
    # Canada - Ontario
    {"id": "jk_toronto_hq", "name": "Toronto Headquarters (Aga Khan Museum)", "city": "Toronto", "state": "Ontario", "country": "Canada", "address": "77 Wynford Dr, North York, ON M3C 1K1", "lat": 43.7267, "lng": -79.3312, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_toronto_don", "name": "Don Mills Jamatkhana", "city": "Toronto", "state": "Ontario", "country": "Canada", "address": "Don Mills, Toronto, ON M3C", "lat": 43.7615, "lng": -79.3479, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_toronto_scar", "name": "Scarborough Jamatkhana", "city": "Toronto", "state": "Ontario", "country": "Canada", "address": "Scarborough, ON M1S", "lat": 43.7945, "lng": -79.2748, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_toronto_miss", "name": "Mississauga Jamatkhana", "city": "Mississauga", "state": "Ontario", "country": "Canada", "address": "Mississauga, ON L5N", "lat": 43.5890, "lng": -79.6441, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_brampton", "name": "Brampton Jamatkhana", "city": "Brampton", "state": "Ontario", "country": "Canada", "address": "Brampton, ON L6Y", "lat": 43.6834, "lng": -79.7663, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_ottawa", "name": "Ottawa Jamatkhana", "city": "Ottawa", "state": "Ontario", "country": "Canada", "address": "Ottawa, ON K2P", "lat": 45.4215, "lng": -75.6972, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_hamilton", "name": "Hamilton Jamatkhana", "city": "Hamilton", "state": "Ontario", "country": "Canada", "address": "Hamilton, ON L8E", "lat": 43.2557, "lng": -79.8711, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_london_on", "name": "London Jamatkhana", "city": "London", "state": "Ontario", "country": "Canada", "address": "London, ON N6A", "lat": 42.9849, "lng": -81.2453, "timings": {"morning": "06:00", "evening": "19:30"}},
    
    # Canada - British Columbia
    {"id": "jk_vancouver_main", "name": "Vancouver Headquarters", "city": "Vancouver", "state": "British Columbia", "country": "Canada", "address": "4010 Canada Way, Burnaby, BC V5G 1G7", "lat": 49.2618, "lng": -123.0009, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_burnaby", "name": "Burnaby Jamatkhana", "city": "Burnaby", "state": "British Columbia", "country": "Canada", "address": "Burnaby, BC V5H", "lat": 49.2488, "lng": -122.9805, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_surrey", "name": "Surrey Jamatkhana", "city": "Surrey", "state": "British Columbia", "country": "Canada", "address": "Surrey, BC V3T", "lat": 49.1913, "lng": -122.8490, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_richmond", "name": "Richmond Jamatkhana", "city": "Richmond", "state": "British Columbia", "country": "Canada", "address": "Richmond, BC V6X", "lat": 49.1666, "lng": -123.1336, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_victoria", "name": "Victoria Jamatkhana", "city": "Victoria", "state": "British Columbia", "country": "Canada", "address": "Victoria, BC V8Z", "lat": 48.4284, "lng": -123.3656, "timings": {"morning": "06:00", "evening": "19:30"}},
    
    # Canada - Alberta
    {"id": "jk_calgary_main", "name": "Calgary Headquarters", "city": "Calgary", "state": "Alberta", "country": "Canada", "address": "1823 33 St SW, Calgary, AB T3C 1P1", "lat": 51.0362, "lng": -114.1154, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_calgary_ne", "name": "Calgary NE Jamatkhana", "city": "Calgary", "state": "Alberta", "country": "Canada", "address": "NE Calgary, AB T3J", "lat": 51.0883, "lng": -113.9794, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_edmonton_main", "name": "Edmonton Headquarters", "city": "Edmonton", "state": "Alberta", "country": "Canada", "address": "11507 101 St NW, Edmonton, AB T5G 2A7", "lat": 53.5565, "lng": -113.5011, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_edmonton_s", "name": "Edmonton South Jamatkhana", "city": "Edmonton", "state": "Alberta", "country": "Canada", "address": "South Edmonton, AB T6H", "lat": 53.4684, "lng": -113.4938, "timings": {"morning": "06:00", "evening": "19:30"}},
    
    # Canada - Other Provinces
    {"id": "jk_montreal", "name": "Montreal Jamatkhana", "city": "Montreal", "state": "Quebec", "country": "Canada", "address": "Brossard, QC J4Z", "lat": 45.4580, "lng": -73.4507, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_winnipeg", "name": "Winnipeg Jamatkhana", "city": "Winnipeg", "state": "Manitoba", "country": "Canada", "address": "Winnipeg, MB R3M", "lat": 49.8538, "lng": -97.1478, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_saskatoon", "name": "Saskatoon Jamatkhana", "city": "Saskatoon", "state": "Saskatchewan", "country": "Canada", "address": "Saskatoon, SK S7L", "lat": 52.1332, "lng": -106.6700, "timings": {"morning": "06:00", "evening": "19:30"}},
    {"id": "jk_halifax", "name": "Halifax Jamatkhana", "city": "Halifax", "state": "Nova Scotia", "country": "Canada", "address": "Halifax, NS B3K", "lat": 44.6476, "lng": -63.5728, "timings": {"morning": "06:00", "evening": "19:30"}}
]

# ============ RAMADAN DIET PLANS ============
# Specialized diet plans for different health conditions during Ramadan

RAMADAN_DIET_PLANS = {
    "diabetic": {
        "condition": "Diabetes",
        "overview": "Managing blood sugar levels during Ramadan requires careful planning. Consult your doctor before fasting.",
        "sehri": {
            "title": "Sehri (Pre-Dawn Meal)",
            "tips": [
                "Eat complex carbohydrates: whole wheat roti, oats, brown rice",
                "Include protein: eggs, paneer, dal, lean meat",
                "Avoid sugary foods and white bread",
                "Drink plenty of water (2-3 glasses)",
                "Include fiber-rich vegetables"
            ],
            "foods_to_eat": ["Oatmeal with nuts", "Whole wheat paratha with yogurt", "Boiled eggs", "Grilled chicken", "Dal with vegetables", "Sugar-free milk"],
            "foods_to_avoid": ["White bread", "Sugary cereals", "Fruit juices", "Sweetened beverages", "Fried foods"]
        },
        "iftar": {
            "title": "Iftar (Breaking Fast)",
            "tips": [
                "Break fast with 1-2 dates and water",
                "Wait 15-20 minutes before main meal",
                "Avoid fried and sugary foods",
                "Monitor blood sugar before and after eating",
                "Eat slowly and in moderate portions"
            ],
            "foods_to_eat": ["Dates (1-2 only)", "Grilled meat/fish", "Vegetable soup", "Salads", "Grilled kebabs", "Roasted chickpeas"],
            "foods_to_avoid": ["Fried samosas", "Pakoras", "Sugary drinks", "Sweets", "White rice in large quantities"]
        },
        "monitoring": [
            "Check blood sugar 2-3 times daily",
            "Watch for signs of hypoglycemia: shakiness, sweating, confusion",
            "Break fast immediately if blood sugar drops below 70 mg/dL",
            "Keep glucose tablets handy"
        ],
        "medications": "Consult your doctor for medication timing adjustments during Ramadan"
    },
    "hypertension": {
        "condition": "High Blood Pressure",
        "overview": "Maintaining blood pressure during fasting requires attention to sodium intake and hydration.",
        "sehri": {
            "title": "Sehri (Pre-Dawn Meal)",
            "tips": [
                "Avoid salty foods and pickles",
                "Include potassium-rich foods: bananas, oranges, spinach",
                "Eat lean proteins",
                "Stay well hydrated",
                "Include whole grains"
            ],
            "foods_to_eat": ["Banana", "Oatmeal", "Low-salt whole wheat bread", "Boiled eggs", "Yogurt (unsalted)", "Fresh fruits"],
            "foods_to_avoid": ["Pickles", "Papad", "Processed cheese", "Canned foods", "Salted nuts"]
        },
        "iftar": {
            "title": "Iftar (Breaking Fast)",
            "tips": [
                "Break fast with dates and water",
                "Avoid salty snacks",
                "Choose grilled over fried foods",
                "Include plenty of vegetables",
                "Limit caffeine intake"
            ],
            "foods_to_eat": ["Fresh fruits", "Vegetable soup (low salt)", "Grilled chicken/fish", "Salads without salt", "Baked items", "Unsalted nuts"],
            "foods_to_avoid": ["Fried foods", "Biryani with high salt", "Kebabs with salt", "Processed meats", "Salty sauces"]
        },
        "monitoring": [
            "Check blood pressure twice daily",
            "Watch for symptoms: headache, dizziness, blurred vision",
            "Reduce salt intake to less than 2000mg daily",
            "Avoid dehydration"
        ],
        "medications": "Take medications as prescribed; consult doctor for timing during Ramadan"
    },
    "renal": {
        "condition": "Kidney Disease (CKD)",
        "overview": "Fasting with kidney disease requires careful management of fluid, protein, and electrolytes. Always consult your nephrologist.",
        "sehri": {
            "title": "Sehri (Pre-Dawn Meal)",
            "tips": [
                "Limit protein intake as advised by doctor",
                "Control potassium intake",
                "Manage fluid intake based on kidney function",
                "Avoid high-phosphorus foods",
                "Choose white rice over brown rice"
            ],
            "foods_to_eat": ["White rice", "Egg whites", "Cabbage", "Cauliflower", "Apples", "White bread"],
            "foods_to_avoid": ["Bananas", "Oranges", "Tomatoes", "Potatoes", "Whole grains", "Dairy in excess"]
        },
        "iftar": {
            "title": "Iftar (Breaking Fast)",
            "tips": [
                "Break fast with 1 date and limited water",
                "Control portion sizes strictly",
                "Avoid high-potassium foods",
                "Limit phosphorus-rich foods",
                "Eat small, frequent portions"
            ],
            "foods_to_eat": ["Dates (1 only)", "White rice dishes", "Grilled fish (small portion)", "Cucumber salad", "Apple", "Clear soups"],
            "foods_to_avoid": ["Red meat", "Dried fruits", "Chocolate", "Cola drinks", "Nuts", "Cheese"]
        },
        "monitoring": [
            "Monitor weight daily (fluid retention)",
            "Track urine output",
            "Watch for swelling in feet/ankles",
            "Check for shortness of breath",
            "Get regular kidney function tests during Ramadan"
        ],
        "medications": "Critical: Consult nephrologist for medication and dialysis schedule adjustments"
    }
}
