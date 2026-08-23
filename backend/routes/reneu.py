"""
Reneu - Wellness & Fitness Portal
Fitness programs, yoga, meditation, weight training, nutrition, sleep tracking, skin & hair care
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reneu", tags=["Reneu"])

db = None
JWT_SECRET = None

def set_db(database):
    global db
    db = database

def set_jwt_secret(secret):
    global JWT_SECRET
    JWT_SECRET = secret

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET or os.environ.get("JWT_SECRET", "nevika-health-secret-key-2024"), algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        class UserObj:
            def __init__(self, data):
                self.id = data.get("id")
                self.name = data.get("name")
        return UserObj(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except Exception:
        return None


# ==================== CONTENT DATA ====================

FITNESS_PROGRAMS = {
    "yoga": {
        "id": "yoga",
        "name": "Yoga & Flexibility",
        "category": "yoga",
        "level": "All Levels",
        "duration": "30 min",
        "sessions": 20,
        "description": "Improve flexibility, balance, and mental clarity with guided yoga sessions.",
        "schedule": [
            {"day": "Mon", "focus": "Sun Salutations & Warm-up", "duration": "30 min"},
            {"day": "Tue", "focus": "Standing Poses & Balance", "duration": "30 min"},
            {"day": "Wed", "focus": "Rest / Gentle Stretching", "duration": "15 min"},
            {"day": "Thu", "focus": "Hip Openers & Twists", "duration": "30 min"},
            {"day": "Fri", "focus": "Backbends & Strength", "duration": "30 min"},
            {"day": "Sat", "focus": "Full Flow Practice", "duration": "45 min"},
            {"day": "Sun", "focus": "Restorative Yoga", "duration": "20 min"},
        ],
        "benefits": ["Increased flexibility", "Better posture", "Stress relief", "Improved breathing", "Core strength"],
    },
    "meditation": {
        "id": "meditation",
        "name": "Mind & Meditation",
        "category": "meditation",
        "level": "All Levels",
        "duration": "15 min",
        "sessions": 21,
        "description": "Guided meditation for stress relief, better sleep, and mental clarity.",
        "schedule": [
            {"day": "Daily", "focus": "Morning Mindfulness", "duration": "10 min"},
            {"day": "Daily", "focus": "Breathing Exercise (4-7-8)", "duration": "5 min"},
            {"day": "Mon/Wed/Fri", "focus": "Body Scan Meditation", "duration": "15 min"},
            {"day": "Tue/Thu", "focus": "Loving Kindness Meditation", "duration": "15 min"},
            {"day": "Sat", "focus": "Deep Relaxation (Yoga Nidra)", "duration": "20 min"},
            {"day": "Sun", "focus": "Gratitude & Journaling", "duration": "10 min"},
        ],
        "benefits": ["Reduced anxiety", "Better sleep", "Emotional balance", "Improved focus", "Lower blood pressure"],
    },
    "weight_training": {
        "id": "weight_training",
        "name": "Weight Training",
        "category": "strength",
        "level": "Intermediate",
        "duration": "45 min",
        "sessions": 16,
        "description": "Build muscle, boost metabolism, and increase strength with structured weight training.",
        "schedule": [
            {"day": "Mon", "focus": "Chest & Triceps", "duration": "45 min"},
            {"day": "Tue", "focus": "Back & Biceps", "duration": "45 min"},
            {"day": "Wed", "focus": "Active Recovery / Cardio", "duration": "30 min"},
            {"day": "Thu", "focus": "Shoulders & Arms", "duration": "45 min"},
            {"day": "Fri", "focus": "Legs & Glutes", "duration": "45 min"},
            {"day": "Sat", "focus": "Full Body Circuit", "duration": "40 min"},
            {"day": "Sun", "focus": "Rest Day", "duration": "—"},
        ],
        "benefits": ["Muscle growth", "Fat loss", "Stronger bones", "Better metabolism", "Injury prevention"],
    },
    "hiit": {
        "id": "hiit",
        "name": "HIIT Cardio",
        "category": "cardio",
        "level": "Advanced",
        "duration": "25 min",
        "sessions": 12,
        "description": "High-intensity interval training for maximum calorie burn in minimum time.",
        "schedule": [
            {"day": "Mon", "focus": "Tabata (20s on/10s off x8)", "duration": "25 min"},
            {"day": "Wed", "focus": "AMRAP Circuit", "duration": "25 min"},
            {"day": "Fri", "focus": "Sprint Intervals", "duration": "20 min"},
            {"day": "Sat", "focus": "Full Body HIIT", "duration": "30 min"},
        ],
        "benefits": ["Maximum calorie burn", "Improved endurance", "Heart health", "Time efficient", "Afterburn effect"],
    },
    "walking": {
        "id": "walking",
        "name": "Walking Program",
        "category": "cardio",
        "level": "Beginner",
        "duration": "40 min",
        "sessions": 30,
        "description": "Structured walking program for beginners to build a fitness habit.",
        "schedule": [
            {"day": "Week 1-2", "focus": "20 min brisk walk", "duration": "20 min"},
            {"day": "Week 3-4", "focus": "30 min walk + intervals", "duration": "30 min"},
            {"day": "Week 5-6", "focus": "40 min walk + hills", "duration": "40 min"},
            {"day": "Week 7-8", "focus": "45 min power walk", "duration": "45 min"},
        ],
        "benefits": ["Weight management", "Heart health", "Joint-friendly", "Mood booster", "Easy to start"],
    },
}

NUTRITION_PLANS = {
    "weight_loss": {
        "id": "weight_loss",
        "name": "Weight Loss Plan",
        "goal": "Lose 0.5-1 kg per week",
        "calories": "1200-1500 kcal/day",
        "description": "Calorie-deficit plan with balanced macros for sustainable weight loss.",
        "meals": {
            "breakfast": [
                {"item": "Oats with berries & chia seeds", "calories": 250, "protein": "8g"},
                {"item": "Egg white omelette + 1 toast", "calories": 220, "protein": "18g"},
                {"item": "Greek yogurt with nuts & honey", "calories": 200, "protein": "15g"},
            ],
            "lunch": [
                {"item": "Grilled chicken salad with olive oil", "calories": 350, "protein": "30g"},
                {"item": "Quinoa bowl with roasted vegetables", "calories": 320, "protein": "12g"},
                {"item": "2 Roti + Dal + Sabzi + Raita", "calories": 380, "protein": "15g"},
            ],
            "dinner": [
                {"item": "Grilled fish + steamed broccoli", "calories": 280, "protein": "28g"},
                {"item": "Soup + whole wheat bread", "calories": 250, "protein": "10g"},
                {"item": "Paneer tikka + salad", "calories": 300, "protein": "22g"},
            ],
            "snacks": [
                {"item": "Apple + 10 almonds", "calories": 150, "protein": "4g"},
                {"item": "Green tea + roasted makhana", "calories": 80, "protein": "3g"},
            ],
        },
        "tips": ["Drink 3L water daily", "Avoid sugar after 6 PM", "Include protein in every meal", "Eat fiber-rich foods first"],
    },
    "weight_gain": {
        "id": "weight_gain",
        "name": "Weight Gain Plan",
        "goal": "Gain 0.5-1 kg per week",
        "calories": "2500-3000 kcal/day",
        "description": "Calorie-surplus plan with high protein for healthy weight gain and muscle building.",
        "meals": {
            "breakfast": [
                {"item": "Banana shake + peanut butter toast", "calories": 500, "protein": "20g"},
                {"item": "4 egg omelette + paratha", "calories": 550, "protein": "28g"},
                {"item": "Poha with nuts + glass of milk", "calories": 450, "protein": "15g"},
            ],
            "lunch": [
                {"item": "Rice + chicken curry + dal + curd", "calories": 600, "protein": "35g"},
                {"item": "3 Roti + paneer butter masala + rice", "calories": 650, "protein": "25g"},
                {"item": "Biryani + raita + salad", "calories": 600, "protein": "22g"},
            ],
            "dinner": [
                {"item": "Pasta with chicken/paneer + garlic bread", "calories": 550, "protein": "25g"},
                {"item": "3 Roti + mixed veg + dal + ghee", "calories": 500, "protein": "18g"},
                {"item": "Rice + fish curry + vegetables", "calories": 520, "protein": "30g"},
            ],
            "snacks": [
                {"item": "Protein shake + banana", "calories": 350, "protein": "30g"},
                {"item": "Dry fruits mix (50g)", "calories": 280, "protein": "8g"},
                {"item": "Peanut butter sandwich", "calories": 300, "protein": "12g"},
            ],
        },
        "tips": ["Eat every 3 hours", "Add healthy fats (ghee, nuts, olive oil)", "Strength train 4x per week", "Sleep 8+ hours"],
    },
}

SLEEP_TIPS = [
    {"title": "Reduce Screen Time", "desc": "Stop using phone/laptop 1 hour before bed. Blue light disrupts melatonin.", "icon": "moon"},
    {"title": "Fix Your Schedule", "desc": "Sleep and wake at the same time daily, even on weekends.", "icon": "clock"},
    {"title": "Cool Room", "desc": "Keep bedroom temperature 18-22°C for optimal sleep.", "icon": "thermometer"},
    {"title": "No Caffeine After 2 PM", "desc": "Caffeine stays in your system for 6-8 hours.", "icon": "coffee"},
    {"title": "Exercise Early", "desc": "Exercise at least 4 hours before bedtime for better sleep quality.", "icon": "dumbbell"},
    {"title": "Wind-Down Routine", "desc": "Read, meditate, or take a warm bath 30 min before bed.", "icon": "book"},
]

SKIN_CARE = {
    "routines": {
        "morning": [
            {"step": 1, "name": "Cleanser", "desc": "Gentle face wash suitable for your skin type", "duration": "1 min"},
            {"step": 2, "name": "Toner", "desc": "Alcohol-free toner to balance pH", "duration": "30 sec"},
            {"step": 3, "name": "Serum", "desc": "Vitamin C serum for brightness & protection", "duration": "1 min"},
            {"step": 4, "name": "Moisturizer", "desc": "Lightweight moisturizer with SPF or separate sunscreen", "duration": "1 min"},
            {"step": 5, "name": "Sunscreen", "desc": "SPF 30+ broad-spectrum, reapply every 2 hrs", "duration": "1 min"},
        ],
        "evening": [
            {"step": 1, "name": "Double Cleanse", "desc": "Oil cleanser then water-based cleanser", "duration": "2 min"},
            {"step": 2, "name": "Exfoliant", "desc": "Chemical exfoliant (AHA/BHA) 2-3 times/week", "duration": "1 min"},
            {"step": 3, "name": "Serum", "desc": "Retinol or niacinamide serum", "duration": "1 min"},
            {"step": 4, "name": "Eye Cream", "desc": "Peptide-based for dark circles & fine lines", "duration": "30 sec"},
            {"step": 5, "name": "Night Cream", "desc": "Rich moisturizer for overnight repair", "duration": "1 min"},
        ],
    },
    "concerns": [
        {"issue": "Acne", "tips": ["Use salicylic acid cleanser", "Non-comedogenic products only", "Don't touch your face", "Change pillowcase weekly"]},
        {"issue": "Dark Circles", "tips": ["Sleep 7-8 hrs", "Use caffeine eye cream", "Cold compress morning", "Stay hydrated"]},
        {"issue": "Pigmentation", "tips": ["Vitamin C serum daily", "SPF 50 sunscreen", "Niacinamide products", "Avoid sun 10 AM - 4 PM"]},
        {"issue": "Dry Skin", "tips": ["Hyaluronic acid serum", "Cream-based cleanser", "Humidifier in bedroom", "Avoid hot water on face"]},
    ],
}

HAIR_CARE = {
    "routines": [
        {"step": 1, "name": "Oil Massage", "freq": "2x/week", "desc": "Coconut/argan oil, leave 1-2 hours before wash"},
        {"step": 2, "name": "Gentle Shampoo", "freq": "2-3x/week", "desc": "Sulfate-free shampoo, focus on scalp"},
        {"step": 3, "name": "Conditioner", "freq": "Every wash", "desc": "Apply mid-length to tips, leave 2-3 min"},
        {"step": 4, "name": "Hair Mask", "freq": "1x/week", "desc": "Deep conditioning mask for 15-20 min"},
        {"step": 5, "name": "Serum/Leave-in", "freq": "After wash", "desc": "Heat protectant before styling, serum for frizz"},
    ],
    "concerns": [
        {"issue": "Hair Fall", "tips": ["Check iron & vitamin D levels", "Biotin supplement", "Scalp massage daily", "Reduce heat styling", "Protein-rich diet"]},
        {"issue": "Dandruff", "tips": ["Ketoconazole shampoo", "Tea tree oil treatment", "Don't scratch scalp", "Manage stress"]},
        {"issue": "Dry Hair", "tips": ["Deep condition weekly", "Avoid hot water", "Use wide-tooth comb", "Trim every 6-8 weeks"]},
        {"issue": "Premature Grey", "tips": ["Check B12 & thyroid", "Amla supplements", "Reduce stress", "Protect from sun"]},
    ],
}


# ==================== MODELS ====================

class SleepLog(BaseModel):
    date: str
    bedtime: str
    wakeup_time: str
    screen_time_minutes: Optional[int] = None
    quality: Optional[str] = "fair"  # poor, fair, good, excellent
    notes: Optional[str] = None

class FitnessLog(BaseModel):
    date: str
    program_id: str
    duration_minutes: int
    calories_burned: Optional[int] = None
    notes: Optional[str] = None


# ==================== ROUTES ====================

@router.get("/programs")
async def get_fitness_programs():
    """Get all fitness programs"""
    return {"programs": list(FITNESS_PROGRAMS.values())}

@router.get("/programs/{program_id}")
async def get_fitness_program(program_id: str):
    program = FITNESS_PROGRAMS.get(program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"program": program}

@router.get("/nutrition")
async def get_nutrition_plans():
    return {"plans": list(NUTRITION_PLANS.values())}

@router.get("/nutrition/{plan_id}")
async def get_nutrition_plan(plan_id: str):
    plan = NUTRITION_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"plan": plan}

@router.get("/sleep-tips")
async def get_sleep_tips():
    return {"tips": SLEEP_TIPS}

@router.get("/skin-care")
async def get_skin_care():
    return {"data": SKIN_CARE}

@router.get("/hair-care")
async def get_hair_care():
    return {"data": HAIR_CARE}

@router.post("/sleep-log")
async def add_sleep_log(data: SleepLog, user=Depends(get_current_user)):
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reneu_sleep_logs.insert_one(log)
    log.pop("_id", None)
    return {"status": "added", "log": log}

@router.get("/sleep-logs")
async def get_sleep_logs(user=Depends(get_current_user)):
    logs = await db.reneu_sleep_logs.find(
        {"user_id": user.id}, {"_id": 0}
    ).sort("date", -1).to_list(30)
    return {"logs": logs}

@router.post("/fitness-log")
async def add_fitness_log(data: FitnessLog, user=Depends(get_current_user)):
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reneu_fitness_logs.insert_one(log)
    log.pop("_id", None)
    return {"status": "added", "log": log}

@router.get("/fitness-logs")
async def get_fitness_logs(user=Depends(get_current_user)):
    logs = await db.reneu_fitness_logs.find(
        {"user_id": user.id}, {"_id": 0}
    ).sort("date", -1).to_list(50)
    return {"logs": logs}
