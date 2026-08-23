"""Health Streak Leaderboard & Personalized Wellness Tips API Routes"""
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from database import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

STEP_GOAL = 10000
STREAK_TARGET = 21


class LogStepsRequest(BaseModel):
    phone: str
    steps: int


def _compute_rewards(streak: int) -> dict:
    return {
        "consultation": streak >= STREAK_TARGET,
        "delivery": streak >= STREAK_TARGET,
    }


@router.get("/health-streak/{phone}")
async def get_health_streak(phone: str):
    """Get current streak data for a user by phone"""
    db = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    record = await db.health_streaks.find_one({"phone": phone}, {"_id": 0})

    if not record:
        return {
            "streak": 0,
            "today_steps": 0,
            "today_goal_reached": False,
            "rewards": _compute_rewards(0),
        }

    today_steps = record.get("daily_steps", {}).get(today, 0)
    streak = record.get("current_streak", 0)
    return {
        "streak": streak,
        "today_steps": today_steps,
        "today_goal_reached": today_steps >= STEP_GOAL,
        "rewards": _compute_rewards(streak),
    }


@router.post("/health-streak/log")
async def log_steps(req: LogStepsRequest):
    """Log steps for a user. Accumulates within a day, updates streak."""
    db = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    record = await db.health_streaks.find_one({"phone": req.phone}, {"_id": 0})

    if not record:
        new_record = {
            "phone": req.phone,
            "current_streak": 0,
            "longest_streak": 0,
            "total_activities": 0,
            "daily_steps": {today: req.steps},
            "last_goal_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        today_steps = req.steps
        streak = 0

        if today_steps >= STEP_GOAL:
            new_record["current_streak"] = 1
            new_record["longest_streak"] = 1
            new_record["last_goal_date"] = today
            new_record["total_activities"] = 1
            streak = 1

        await db.health_streaks.insert_one(new_record)
        return {
            "today_steps": today_steps,
            "streak": streak,
            "today_goal_reached": today_steps >= STEP_GOAL,
            "rewards": _compute_rewards(streak),
        }

    # Accumulate steps for today
    prev_today = record.get("daily_steps", {}).get(today, 0)
    new_today = prev_today + req.steps
    streak = record.get("current_streak", 0)
    longest = record.get("longest_streak", 0)
    last_goal = record.get("last_goal_date")
    total = record.get("total_activities", 0)

    update = {
        f"daily_steps.{today}": new_today,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Check if goal just reached today (wasn't reached before this log)
    was_goal = prev_today >= STEP_GOAL
    now_goal = new_today >= STEP_GOAL

    if now_goal and not was_goal:
        # Streak logic: if yesterday was a goal day, continue streak; else reset to 1
        if last_goal == yesterday:
            streak += 1
        elif last_goal == today:
            pass  # already counted
        else:
            streak = 1
        longest = max(longest, streak)
        total += 1
        update["current_streak"] = streak
        update["longest_streak"] = longest
        update["total_activities"] = total
        update["last_goal_date"] = today

    await db.health_streaks.update_one({"phone": req.phone}, {"$set": update})

    return {
        "today_steps": new_today,
        "streak": streak,
        "today_goal_reached": new_today >= STEP_GOAL,
        "rewards": _compute_rewards(streak),
    }


@router.get("/health-streak/leaderboard/{portal}")
async def get_streak_leaderboard(portal: str = "all", limit: int = 20):
    """Get health streak leaderboard"""
    db = get_db()
    pipeline = [
        {"$match": {"current_streak": {"$gt": 0}}},
        {"$sort": {"current_streak": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0, "phone": 1, "current_streak": 1,
            "longest_streak": 1, "total_activities": 1
        }}
    ]

    leaders = await db.health_streaks.aggregate(pipeline).to_list(limit)

    # Enrich with user names (mask phone for privacy)
    for leader in leaders:
        phone = leader.get("phone", "")
        user = await db.users.find_one({"phone": phone}, {"_id": 0, "name": 1})
        leader["name"] = user.get("name", "Anonymous") if user else "Anonymous"
        if phone and len(phone) > 4:
            leader["phone"] = phone[:2] + "***" + phone[-2:]

    return {"success": True, "leaderboard": leaders, "portal": portal}


@router.get("/wellness-tips/{user_id}")
async def get_personalized_wellness_tips(user_id: str):
    """Get personalized wellness tips based on user health profile"""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "password_hash": 0})

    tips = []

    if user:
        conditions = user.get("chronic_conditions", []) or user.get("health_info", {}).get("existing_conditions", "")
        age = user.get("age", 0)
        gender = user.get("gender", "")

        conditions_str = str(conditions).lower()
        if "diabetes" in conditions_str:
            tips.extend([
                {"category": "Diabetes Care", "tip": "Monitor blood sugar levels before and after meals. Aim for HbA1c below 7%."},
                {"category": "Diabetes Care", "tip": "Include fiber-rich foods like oats, vegetables, and whole grains in your diet."},
            ])
        if "hypertension" in conditions_str or "bp" in conditions_str:
            tips.extend([
                {"category": "Blood Pressure", "tip": "Reduce salt intake to less than 5g/day. Use herbs and spices for flavoring."},
                {"category": "Blood Pressure", "tip": "Regular walking for 30 minutes daily can help manage blood pressure."},
            ])
        if "thyroid" in conditions_str:
            tips.extend([
                {"category": "Thyroid Health", "tip": "Take thyroid medication on an empty stomach, 30 min before breakfast."},
                {"category": "Thyroid Health", "tip": "Include selenium-rich foods like Brazil nuts and fish."},
            ])
        if "pcod" in conditions_str or "pcos" in conditions_str:
            tips.extend([
                {"category": "PCOD Care", "tip": "Regular exercise and maintaining healthy weight helps manage PCOD symptoms."},
                {"category": "PCOD Care", "tip": "Reduce refined sugar and processed food intake."},
            ])

        if age:
            try:
                age_int = int(age)
                if age_int > 50:
                    tips.extend([
                        {"category": "Senior Health", "tip": "Get Vitamin D and calcium levels checked every 6 months."},
                        {"category": "Senior Health", "tip": "Regular eye checkups are important after 50. Schedule one with your doctor."},
                    ])
                elif age_int > 35:
                    tips.extend([
                        {"category": "Preventive Care", "tip": "Annual health checkups become crucial after 35. Book a full body checkup."},
                    ])
            except (ValueError, TypeError):
                pass

        if gender and gender.lower() in ["female", "f"]:
            tips.extend([
                {"category": "Women's Health", "tip": "Iron-rich foods like spinach, lentils, and dates support energy levels."},
            ])

    # General tips
    tips.extend([
        {"category": "General Health", "tip": "Stay hydrated - drink at least 8 glasses of water daily."},
        {"category": "General Health", "tip": "Get 7-8 hours of quality sleep for better immunity and mood."},
        {"category": "Preventive Care", "tip": "Regular health checkups can catch problems early. Book a full body checkup on Nevika Cura."},
    ])

    return {"success": True, "tips": tips[:8], "personalized": bool(user)}
