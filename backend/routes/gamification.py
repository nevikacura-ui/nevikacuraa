from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/gamification", tags=["Health Streaks & Gamification"])

db = None

def set_db(database):
    global db
    db = database

# ── Models ──

class CheckInRequest(BaseModel):
    phone: str
    activity: str  # steps, water, sleep, exercise, meditation, medicine, checkup

class BadgeClaimRequest(BaseModel):
    phone: str
    badge_id: str

# ── Activity Definitions ──

ACTIVITIES = {
    "steps": {"name": "Daily Steps", "icon": "footprints", "points": 10, "unit": "steps"},
    "water": {"name": "Stay Hydrated", "icon": "droplet", "points": 5, "unit": "glasses"},
    "sleep": {"name": "Good Sleep", "icon": "moon", "points": 10, "unit": "hours"},
    "exercise": {"name": "Exercise", "icon": "dumbbell", "points": 15, "unit": "minutes"},
    "meditation": {"name": "Meditation", "icon": "brain", "points": 10, "unit": "minutes"},
    "medicine": {"name": "Medicine Taken", "icon": "pill", "points": 5, "unit": "doses"},
    "checkup": {"name": "Health Checkup", "icon": "heart-pulse", "points": 25, "unit": "visit"},
}

BADGES = [
    {"id": "streak_3", "name": "Getting Started", "desc": "3-day health streak", "icon": "flame", "requirement": 3, "type": "streak", "coins": 20},
    {"id": "streak_7", "name": "Week Warrior", "desc": "7-day health streak", "icon": "flame", "requirement": 7, "type": "streak", "coins": 50},
    {"id": "streak_14", "name": "Fortnight Fighter", "desc": "14-day health streak", "icon": "flame", "requirement": 14, "type": "streak", "coins": 100},
    {"id": "streak_30", "name": "Monthly Master", "desc": "30-day health streak", "icon": "crown", "requirement": 30, "type": "streak", "coins": 250},
    {"id": "streak_100", "name": "Century Champion", "desc": "100-day health streak", "icon": "trophy", "requirement": 100, "type": "streak", "coins": 1000},
    {"id": "activities_10", "name": "Active Explorer", "desc": "Complete 10 activities", "icon": "star", "requirement": 10, "type": "total_activities", "coins": 30},
    {"id": "activities_50", "name": "Health Enthusiast", "desc": "Complete 50 activities", "icon": "star", "requirement": 50, "type": "total_activities", "coins": 100},
    {"id": "all_types", "name": "Well-Rounded", "desc": "Try all activity types", "icon": "target", "requirement": 7, "type": "unique_types", "coins": 75},
]

# ── Endpoints ──

@router.post("/check-in")
async def daily_check_in(req: CheckInRequest):
    """Record a daily health activity check-in"""
    if req.activity not in ACTIVITIES:
        raise HTTPException(400, f"Invalid activity. Choose from: {', '.join(ACTIVITIES.keys())}")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    activity_info = ACTIVITIES[req.activity]

    # Check if already checked in for this activity today
    existing = await db.health_checkins.find_one({
        "phone": req.phone, "activity": req.activity, "date": today
    })
    if existing:
        return {"message": "Already checked in for this activity today", "already_done": True}

    # Record check-in
    await db.health_checkins.insert_one({
        "phone": req.phone,
        "activity": req.activity,
        "date": today,
        "points": activity_info["points"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Update streak
    streak_data = await _update_streak(req.phone, today)

    # Award CuraCoins
    await db.curacoins_ledger.insert_one({
        "phone": req.phone,
        "type": "health_streak",
        "amount": activity_info["points"],
        "description": f"{activity_info['name']} check-in",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Check for new badges
    new_badges = await _check_badges(req.phone, streak_data)

    return {
        "message": f"{activity_info['name']} recorded!",
        "points_earned": activity_info["points"],
        "current_streak": streak_data["current_streak"],
        "longest_streak": streak_data["longest_streak"],
        "new_badges": new_badges,
    }


async def _update_streak(phone, today):
    """Calculate and update the user's streak"""
    from datetime import timedelta
    yesterday = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")

    streak_doc = await db.health_streaks.find_one({"phone": phone}, {"_id": 0})

    if not streak_doc:
        streak_doc = {"phone": phone, "current_streak": 1, "longest_streak": 1, "last_date": today, "total_checkins": 1}
        await db.health_streaks.insert_one({**streak_doc})
        return streak_doc

    if streak_doc.get("last_date") == today:
        return streak_doc

    if streak_doc.get("last_date") == yesterday:
        new_streak = streak_doc.get("current_streak", 0) + 1
    else:
        new_streak = 1

    longest = max(new_streak, streak_doc.get("longest_streak", 0))
    total = streak_doc.get("total_checkins", 0) + 1

    await db.health_streaks.update_one(
        {"phone": phone},
        {"$set": {"current_streak": new_streak, "longest_streak": longest, "last_date": today, "total_checkins": total}}
    )
    return {"current_streak": new_streak, "longest_streak": longest, "total_checkins": total}


async def _check_badges(phone, streak_data):
    """Check if user earned new badges"""
    earned = await db.health_badges.find({"phone": phone}, {"_id": 0, "badge_id": 1}).to_list(50)
    earned_ids = {b["badge_id"] for b in earned}
    new_badges = []

    total_activities = await db.health_checkins.count_documents({"phone": phone})
    unique_types = len(await db.health_checkins.distinct("activity", {"phone": phone}))

    for badge in BADGES:
        if badge["id"] in earned_ids:
            continue
        met = False
        if badge["type"] == "streak" and streak_data.get("current_streak", 0) >= badge["requirement"]:
            met = True
        elif badge["type"] == "total_activities" and total_activities >= badge["requirement"]:
            met = True
        elif badge["type"] == "unique_types" and unique_types >= badge["requirement"]:
            met = True

        if met:
            await db.health_badges.insert_one({
                "phone": phone, "badge_id": badge["id"], "earned_at": datetime.now(timezone.utc).isoformat()
            })
            await db.curacoins_ledger.insert_one({
                "phone": phone, "type": "badge_reward", "amount": badge["coins"],
                "description": f"Badge: {badge['name']}", "created_at": datetime.now(timezone.utc).isoformat()
            })
            new_badges.append({"badge": badge, "coins_earned": badge["coins"]})

    return new_badges


@router.get("/profile/{phone}")
async def get_gamification_profile(phone: str):
    """Get user's gamification profile"""
    streak = await db.health_streaks.find_one({"phone": phone}, {"_id": 0})
    if not streak:
        streak = {"current_streak": 0, "longest_streak": 0, "total_checkins": 0}

    earned_badges = await db.health_badges.find({"phone": phone}, {"_id": 0}).to_list(50)
    earned_ids = {b["badge_id"] for b in earned_badges}

    badges_with_status = []
    for badge in BADGES:
        badges_with_status.append({**badge, "earned": badge["id"] in earned_ids})

    # Today's check-ins
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_checkins = await db.health_checkins.find(
        {"phone": phone, "date": today}, {"_id": 0, "activity": 1}
    ).to_list(20)
    today_activities = [c["activity"] for c in today_checkins]

    # Total points
    pipeline = [{"$match": {"phone": phone}}, {"$group": {"_id": None, "total": {"$sum": "$points"}}}]
    points_result = await db.health_checkins.aggregate(pipeline).to_list(1)
    total_points = points_result[0]["total"] if points_result else 0

    return {
        "current_streak": streak.get("current_streak", 0),
        "longest_streak": streak.get("longest_streak", 0),
        "total_checkins": streak.get("total_checkins", 0),
        "total_points": total_points,
        "badges": badges_with_status,
        "earned_badge_count": len(earned_ids),
        "today_activities": today_activities,
        "activities": ACTIVITIES,
    }


@router.get("/leaderboard")
async def get_leaderboard():
    """Get top health streak users"""
    leaders = await db.health_streaks.find(
        {"phone": {"$exists": True, "$ne": ""}}, 
        {"_id": 0, "phone": 1, "current_streak": 1, "longest_streak": 1, "total_checkins": 1}
    ).sort("longest_streak", -1).limit(10).to_list(10)

    # Enrich with user names
    for leader in leaders:
        phone = leader.get("phone", "")
        if phone:
            user = await db.users.find_one({"phone": phone}, {"_id": 0, "name": 1})
            leader["name"] = user.get("name", "Anonymous") if user else "Anonymous"
            leader["phone"] = phone[:3] + "****" + phone[-3:] if len(phone) >= 6 else "****"
        else:
            leader["name"] = "Anonymous"
            leader["phone"] = "****"

    return {"leaderboard": leaders}
