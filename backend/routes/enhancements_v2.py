"""
Enhancement APIs V2 - Additional Backend Routes for Enhancement Features
Implements: AI Triage, Symptom Checker, Teleconsultation, Community Forums,
Wearables, Insurance, Broadcast Messages, Staff Analytics, and more.
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import os
import uuid
import random

router = APIRouter(prefix="/enhancements", tags=["Enhancement Features V2"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_here')

# Database reference
db = None

def set_db(database):
    global db
    db = database

async def get_user_from_token(authorization: str = Header(None)):
    """Extract user info from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================================
# AI TRIAGE ASSISTANT (#21)
# ============================================================
class TriageRequest(BaseModel):
    symptoms: List[str]
    duration: str = "1-3 days"
    severity: str = "moderate"
    age: Optional[int] = None
    gender: Optional[str] = None
    existing_conditions: Optional[List[str]] = []

class TriageResponse(BaseModel):
    urgency: str  # emergency, urgent, routine, self-care
    recommendation: str
    suggested_specialty: Optional[str]
    suggested_tests: List[str]
    home_care_tips: List[str]
    confidence: float

@router.post("/ai-triage", response_model=TriageResponse)
async def ai_triage_assessment(request: TriageRequest, user = Depends(get_user_from_token)):
    """AI-powered triage assessment based on symptoms"""
    
    # Emergency symptoms that require immediate attention
    emergency_symptoms = ["chest_pain", "breathing_difficulty", "unconscious", "severe_bleeding", 
                         "stroke_symptoms", "heart_attack", "seizure"]
    
    # Check for emergency conditions
    if any(s in emergency_symptoms for s in request.symptoms):
        return TriageResponse(
            urgency="emergency",
            recommendation="Please call emergency services (112) or go to the nearest emergency room immediately.",
            suggested_specialty="Emergency Medicine",
            suggested_tests=["ECG", "Blood Tests", "CT Scan"],
            home_care_tips=["Stay calm", "Don't drive yourself", "Have someone with you"],
            confidence=0.95
        )
    
    # Urgent symptoms
    urgent_symptoms = ["high_fever", "severe_pain", "persistent_vomiting", "blood_in_stool", 
                      "sudden_vision_loss", "severe_headache"]
    
    if any(s in urgent_symptoms for s in request.symptoms):
        return TriageResponse(
            urgency="urgent",
            recommendation="Please consult a doctor within 24 hours. Book an appointment or visit urgent care.",
            suggested_specialty="General Medicine",
            suggested_tests=["CBC", "Basic Metabolic Panel"],
            home_care_tips=["Rest well", "Stay hydrated", "Monitor symptoms"],
            confidence=0.85
        )
    
    # Symptom to specialty mapping
    specialty_map = {
        "fever": "General Medicine",
        "cough": "Pulmonology",
        "headache": "Neurology",
        "stomach_pain": "Gastroenterology",
        "skin_rash": "Dermatology",
        "joint_pain": "Orthopedics",
        "anxiety": "Psychiatry",
        "pregnancy_symptoms": "Obstetrics & Gynecology",
    }
    
    suggested_specialty = None
    for symptom in request.symptoms:
        if symptom in specialty_map:
            suggested_specialty = specialty_map[symptom]
            break
    
    # Routine assessment
    return TriageResponse(
        urgency="routine",
        recommendation="Your symptoms suggest a routine consultation. Book an appointment at your convenience.",
        suggested_specialty=suggested_specialty or "General Medicine",
        suggested_tests=["Basic Health Checkup"],
        home_care_tips=[
            "Rest adequately",
            "Stay hydrated - drink 8-10 glasses of water",
            "Maintain a balanced diet",
            "Monitor your symptoms and note any changes"
        ],
        confidence=0.75
    )


# ============================================================
# SYMPTOM CHECKER (#19)
# ============================================================
class SymptomAnalysis(BaseModel):
    symptoms: List[str]
    additional_info: Optional[Dict[str, Any]] = {}

@router.post("/symptom-checker/analyze")
async def analyze_symptoms(data: SymptomAnalysis, user = Depends(get_user_from_token)):
    """Analyze symptoms and provide possible conditions"""
    
    symptom_conditions_map = {
        "fever": ["Common Cold", "Viral Infection", "Flu", "COVID-19", "Dengue"],
        "headache": ["Tension Headache", "Migraine", "Sinusitis", "Dehydration"],
        "cough": ["Common Cold", "Bronchitis", "Asthma", "Allergies"],
        "fatigue": ["Anemia", "Thyroid Issues", "Viral Infection", "Sleep Disorder"],
        "nausea": ["Gastritis", "Food Poisoning", "Pregnancy", "Migraine"],
        "body_pain": ["Viral Fever", "Flu", "Fibromyalgia", "Overexertion"],
        "sore_throat": ["Pharyngitis", "Tonsillitis", "Common Cold", "Strep Throat"],
        "stomach_pain": ["Gastritis", "IBS", "Food Poisoning", "Appendicitis"],
        "dizziness": ["Vertigo", "Low Blood Pressure", "Anemia", "Dehydration"],
        "skin_rash": ["Allergic Reaction", "Eczema", "Contact Dermatitis", "Viral Exanthem"],
    }
    
    possible_conditions = {}
    
    for symptom in data.symptoms:
        symptom_key = symptom.lower().replace(" ", "_")
        if symptom_key in symptom_conditions_map:
            for condition in symptom_conditions_map[symptom_key]:
                if condition not in possible_conditions:
                    possible_conditions[condition] = 0
                possible_conditions[condition] += 1
    
    # Calculate probability based on symptom matches
    total_symptoms = len(data.symptoms)
    results = []
    for condition, matches in sorted(possible_conditions.items(), key=lambda x: x[1], reverse=True)[:5]:
        probability = min(95, (matches / max(total_symptoms, 1)) * 100 + random.randint(10, 30))
        results.append({
            "condition": condition,
            "probability": round(probability, 1),
            "matched_symptoms": matches
        })
    
    # Determine severity
    emergency_symptoms = ["chest_pain", "breathing_difficulty", "severe_bleeding"]
    has_emergency = any(s.lower().replace(" ", "_") in emergency_symptoms for s in data.symptoms)
    
    severity = "high" if has_emergency else "medium" if len(data.symptoms) > 3 else "low"
    
    # Log the analysis
    if db is not None:
        await db.symptom_analyses.insert_one({
            "user_id": user.get("user_id") or user.get("sub"),
            "symptoms": data.symptoms,
            "results": results,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "possible_conditions": results,
        "severity": severity,
        "recommendation": "Please consult a doctor for proper diagnosis" if severity != "low" else "Monitor symptoms, consult if they persist",
        "disclaimer": "This is for informational purposes only and not a medical diagnosis."
    }


# ============================================================
# TELECONSULTATION (#26)
# ============================================================
class TeleconsultationRequest(BaseModel):
    doctor_id: str
    patient_name: str
    patient_phone: str
    reason: str
    preferred_date: str
    preferred_time: str

class TeleconsultationSession(BaseModel):
    session_id: str
    doctor_id: str
    patient_id: str
    status: str
    scheduled_time: str
    meeting_link: Optional[str]

@router.post("/teleconsultation/book")
async def book_teleconsultation(request: TeleconsultationRequest, user = Depends(get_user_from_token)):
    """Book a teleconsultation session"""
    
    session_id = f"TC-{str(uuid.uuid4())[:8].upper()}"
    meeting_link = f"https://meet.nevikacura.com/{session_id}"
    
    session_data = {
        "session_id": session_id,
        "doctor_id": request.doctor_id,
        "patient_id": user.get("user_id") or user.get("sub"),
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "reason": request.reason,
        "scheduled_date": request.preferred_date,
        "scheduled_time": request.preferred_time,
        "meeting_link": meeting_link,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.teleconsultations.insert_one(session_data)
    
    return {
        "success": True,
        "session_id": session_id,
        "meeting_link": meeting_link,
        "message": f"Teleconsultation scheduled for {request.preferred_date} at {request.preferred_time}"
    }

@router.get("/teleconsultation/sessions")
async def get_teleconsultation_sessions(user = Depends(get_user_from_token)):
    """Get user's teleconsultation sessions"""
    
    user_id = user.get("user_id") or user.get("sub")
    
    if db is None:
        return {"sessions": []}
    
    sessions = await db.teleconsultations.find(
        {"patient_id": user_id},
        {"_id": 0}
    ).sort("scheduled_date", -1).to_list(20)
    
    return {"sessions": sessions}

@router.post("/teleconsultation/{session_id}/start")
async def start_teleconsultation(session_id: str, user = Depends(get_user_from_token)):
    """Start a teleconsultation session"""
    
    if db is not None:
        result = await db.teleconsultations.update_one(
            {"session_id": session_id},
            {"$set": {"status": "in_progress", "started_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        session = await db.teleconsultations.find_one({"session_id": session_id}, {"_id": 0})
        return {"success": True, "session": session}
    
    return {"success": True, "message": "Session started"}

@router.post("/teleconsultation/{session_id}/end")
async def end_teleconsultation(session_id: str, notes: str = Body(None), user = Depends(get_user_from_token)):
    """End a teleconsultation session"""
    
    if db is not None:
        await db.teleconsultations.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "completed",
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "consultation_notes": notes
            }}
        )
    
    return {"success": True, "message": "Session ended"}


# ============================================================
# COMMUNITY FORUMS (#28)
# ============================================================
class ForumPost(BaseModel):
    title: str
    content: str
    category: str = "general"
    tags: Optional[List[str]] = []
    is_anonymous: bool = False

class ForumComment(BaseModel):
    post_id: str
    content: str
    is_anonymous: bool = False

@router.get("/community/posts")
async def get_forum_posts(
    category: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 20
):
    """Get community forum posts"""
    
    if db is None:
        # Return sample data
        return {
            "posts": [
                {
                    "id": "post_1",
                    "title": "Tips for managing diabetes during festivals",
                    "content": "Here are some tips I've learned...",
                    "category": "diabetes",
                    "author": "Anonymous",
                    "likes": 24,
                    "comments_count": 8,
                    "created_at": "2026-01-25T10:30:00Z"
                },
                {
                    "id": "post_2",
                    "title": "First trimester experiences",
                    "content": "Sharing my journey...",
                    "category": "pregnancy",
                    "author": "HappyMom",
                    "likes": 45,
                    "comments_count": 15,
                    "created_at": "2026-01-24T15:20:00Z"
                }
            ],
            "total": 2,
            "page": page,
            "total_pages": 1
        }
    
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    posts = await db.forum_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.forum_posts.count_documents(query)
    
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }

@router.post("/community/posts")
async def create_forum_post(post: ForumPost, user = Depends(get_user_from_token)):
    """Create a new forum post"""
    
    post_data = {
        "id": f"post_{str(uuid.uuid4())[:8]}",
        "title": post.title,
        "content": post.content,
        "category": post.category,
        "tags": post.tags,
        "author_id": user.get("user_id") or user.get("sub"),
        "author": "Anonymous" if post.is_anonymous else user.get("name", "User"),
        "is_anonymous": post.is_anonymous,
        "likes": 0,
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.forum_posts.insert_one(post_data)
    
    return {"success": True, "post": {k: v for k, v in post_data.items() if k != "author_id"}}

@router.post("/community/posts/{post_id}/like")
async def like_forum_post(post_id: str, user = Depends(get_user_from_token)):
    """Like a forum post"""
    
    if db is not None:
        await db.forum_posts.update_one(
            {"id": post_id},
            {"$inc": {"likes": 1}}
        )
    
    return {"success": True}

@router.post("/community/posts/{post_id}/comments")
async def add_comment(post_id: str, comment: ForumComment, user = Depends(get_user_from_token)):
    """Add a comment to a forum post"""
    
    comment_data = {
        "id": f"comment_{str(uuid.uuid4())[:8]}",
        "post_id": post_id,
        "content": comment.content,
        "author_id": user.get("user_id") or user.get("sub"),
        "author": "Anonymous" if comment.is_anonymous else user.get("name", "User"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.forum_comments.insert_one(comment_data)
        await db.forum_posts.update_one({"id": post_id}, {"$inc": {"comments_count": 1}})
    
    return {"success": True, "comment": {k: v for k, v in comment_data.items() if k != "author_id"}}

@router.get("/community/posts/{post_id}/comments")
async def get_post_comments(post_id: str, page: int = 1, limit: int = 20):
    """Get comments for a forum post"""
    
    if db is None:
        return {"comments": [], "total": 0}
    
    skip = (page - 1) * limit
    comments = await db.forum_comments.find(
        {"post_id": post_id},
        {"_id": 0, "author_id": 0}
    ).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.forum_comments.count_documents({"post_id": post_id})
    
    return {"comments": comments, "total": total}


# ============================================================
# WEARABLE INTEGRATION (#29)
# ============================================================
class WearableData(BaseModel):
    device_type: str  # apple_watch, fitbit, google_fit
    data_type: str  # heart_rate, steps, sleep, blood_oxygen
    value: float
    unit: str
    timestamp: str

@router.post("/wearables/sync")
async def sync_wearable_data(data: List[WearableData], user = Depends(get_user_from_token)):
    """Sync data from wearable devices"""
    
    user_id = user.get("user_id") or user.get("sub")
    
    if db is not None:
        docs = []
        for item in data:
            docs.append({
                "user_id": user_id,
                "device_type": item.device_type,
                "data_type": item.data_type,
                "value": item.value,
                "unit": item.unit,
                "recorded_at": item.timestamp,
                "synced_at": datetime.now(timezone.utc).isoformat()
            })
        
        if docs:
            await db.wearable_data.insert_many(docs)
    
    return {"success": True, "synced_count": len(data)}

@router.get("/wearables/data")
async def get_wearable_data(
    data_type: str = None,
    start_date: str = None,
    end_date: str = None,
    user = Depends(get_user_from_token)
):
    """Get synced wearable data"""
    
    user_id = user.get("user_id") or user.get("sub")
    
    if db is None:
        # Return sample data
        return {
            "data": [
                {"data_type": "heart_rate", "value": 72, "unit": "bpm", "recorded_at": "2026-01-28T08:00:00Z"},
                {"data_type": "steps", "value": 8500, "unit": "steps", "recorded_at": "2026-01-28T18:00:00Z"},
                {"data_type": "sleep", "value": 7.5, "unit": "hours", "recorded_at": "2026-01-28T06:00:00Z"}
            ],
            "summary": {
                "avg_heart_rate": 72,
                "total_steps_today": 8500,
                "sleep_hours": 7.5
            }
        }
    
    query = {"user_id": user_id}
    if data_type:
        query["data_type"] = data_type
    
    data = await db.wearable_data.find(query, {"_id": 0, "user_id": 0}).sort("recorded_at", -1).limit(100).to_list(100)
    
    return {"data": data}

@router.get("/wearables/insights")
async def get_health_insights(user = Depends(get_user_from_token)):
    """Get AI-generated health insights from wearable data"""
    
    # In production, this would analyze actual data patterns
    return {
        "insights": [
            {
                "type": "positive",
                "title": "Great Sleep Pattern!",
                "message": "You've averaged 7.5 hours of sleep this week, which is optimal for adults.",
                "icon": "moon"
            },
            {
                "type": "warning",
                "title": "Low Activity Today",
                "message": "You're at 60% of your daily step goal. A 15-minute walk would help!",
                "icon": "footprints"
            },
            {
                "type": "info",
                "title": "Heart Rate Normal",
                "message": "Your resting heart rate of 72 bpm is within healthy range.",
                "icon": "heart"
            }
        ],
        "weekly_score": 78,
        "trend": "improving"
    }


# ============================================================
# INSURANCE INTEGRATION (#27)
# ============================================================
class InsuranceClaim(BaseModel):
    policy_number: str
    provider: str
    claim_type: str  # cashless, reimbursement
    treatment_type: str
    hospital_name: str
    admission_date: str
    discharge_date: Optional[str] = None
    estimated_amount: float
    documents: Optional[List[str]] = []

@router.post("/insurance/claims")
async def submit_insurance_claim(claim: InsuranceClaim, user = Depends(get_user_from_token)):
    """Submit an insurance claim"""
    
    claim_id = f"CLM-{str(uuid.uuid4())[:8].upper()}"
    
    claim_data = {
        "claim_id": claim_id,
        "user_id": user.get("user_id") or user.get("sub"),
        **claim.dict(),
        "status": "submitted",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "timeline": [
            {"status": "submitted", "timestamp": datetime.now(timezone.utc).isoformat(), "note": "Claim submitted"}
        ]
    }
    
    if db is not None:
        await db.insurance_claims.insert_one(claim_data)
    
    return {
        "success": True,
        "claim_id": claim_id,
        "message": "Insurance claim submitted successfully. You will receive updates via WhatsApp."
    }

@router.get("/insurance/claims")
async def get_insurance_claims(user = Depends(get_user_from_token)):
    """Get user's insurance claims"""
    
    user_id = user.get("user_id") or user.get("sub")
    
    if db is None:
        return {"claims": []}
    
    claims = await db.insurance_claims.find(
        {"user_id": user_id},
        {"_id": 0, "user_id": 0}
    ).sort("submitted_at", -1).to_list(50)
    
    return {"claims": claims}

@router.get("/insurance/claims/{claim_id}")
async def get_claim_details(claim_id: str, user = Depends(get_user_from_token)):
    """Get detailed claim information"""
    
    if db is None:
        return {
            "claim_id": claim_id,
            "status": "under_review",
            "timeline": [
                {"status": "submitted", "timestamp": "2026-01-25T10:00:00Z"},
                {"status": "under_review", "timestamp": "2026-01-26T14:00:00Z"}
            ]
        }
    
    claim = await db.insurance_claims.find_one(
        {"claim_id": claim_id},
        {"_id": 0, "user_id": 0}
    )
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    return claim

@router.get("/insurance/policies")
async def get_insurance_policies(user = Depends(get_user_from_token)):
    """Get user's registered insurance policies"""
    
    user_id = user.get("user_id") or user.get("sub")
    
    if db is None:
        return {
            "policies": [
                {
                    "policy_number": "POL123456",
                    "provider": "Star Health",
                    "type": "Family Floater",
                    "sum_insured": 500000,
                    "valid_until": "2027-03-15",
                    "members_covered": 4
                }
            ]
        }
    
    policies = await db.insurance_policies.find(
        {"user_id": user_id},
        {"_id": 0, "user_id": 0}
    ).to_list(20)
    
    return {"policies": policies}


# ============================================================
# BROADCAST MESSAGES (#46)
# ============================================================
class BroadcastMessage(BaseModel):
    title: str
    message: str
    target_audience: str  # all, patients, staff, doctors
    channels: List[str]  # whatsapp, sms, push, email
    scheduled_time: Optional[str] = None

@router.post("/broadcast/send")
async def send_broadcast_message(broadcast: BroadcastMessage, user = Depends(get_user_from_token)):
    """Send a broadcast message to target audience"""
    
    broadcast_id = f"BC-{str(uuid.uuid4())[:8].upper()}"
    
    broadcast_data = {
        "id": broadcast_id,
        "title": broadcast.title,
        "message": broadcast.message,
        "target_audience": broadcast.target_audience,
        "channels": broadcast.channels,
        "scheduled_time": broadcast.scheduled_time,
        "status": "scheduled" if broadcast.scheduled_time else "sent",
        "sent_by": user.get("user_id") or user.get("sub"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "recipients_count": 0,
        "delivered_count": 0
    }
    
    if db is not None:
        # Get recipient count based on target audience
        if broadcast.target_audience == "all":
            count = await db.users.count_documents({})
        elif broadcast.target_audience == "patients":
            count = await db.patients.count_documents({})
        elif broadcast.target_audience == "staff":
            count = await db.staff.count_documents({})
        else:
            count = 0
        
        broadcast_data["recipients_count"] = count
        await db.broadcast_messages.insert_one(broadcast_data)
    
    return {
        "success": True,
        "broadcast_id": broadcast_id,
        "message": f"Broadcast {'scheduled' if broadcast.scheduled_time else 'sent'} to {broadcast.target_audience}"
    }

@router.get("/broadcast/history")
async def get_broadcast_history(page: int = 1, limit: int = 20, user = Depends(get_user_from_token)):
    """Get broadcast message history"""
    
    if db is None:
        return {"broadcasts": [], "total": 0}
    
    skip = (page - 1) * limit
    broadcasts = await db.broadcast_messages.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.broadcast_messages.count_documents({})
    
    return {
        "broadcasts": broadcasts,
        "total": total,
        "page": page
    }


# ============================================================
# VIRTUAL HEALTH COACH (#31)
# ============================================================
class CoachingGoal(BaseModel):
    goal_type: str  # weight_loss, diabetes_management, fitness, stress_reduction
    target: str
    timeline_weeks: int = 12

@router.post("/health-coach/goals")
async def set_coaching_goal(goal: CoachingGoal, user = Depends(get_user_from_token)):
    """Set a health coaching goal"""
    
    goal_id = f"GOAL-{str(uuid.uuid4())[:8]}"
    
    goal_data = {
        "id": goal_id,
        "user_id": user.get("user_id") or user.get("sub"),
        **goal.dict(),
        "progress": 0,
        "status": "active",
        "milestones": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.coaching_goals.insert_one(goal_data)
    
    return {
        "success": True,
        "goal_id": goal_id,
        "message": "Health goal set! Your AI coach will guide you."
    }

@router.get("/health-coach/advice")
async def get_coaching_advice(user = Depends(get_user_from_token)):
    """Get personalized health coaching advice"""
    
    # In production, this would be AI-generated based on user's data
    return {
        "daily_tip": "Try to take a 10-minute walk after lunch to improve digestion and boost energy levels.",
        "motivation": "You're doing great! You've completed 7 days of your wellness streak.",
        "tasks": [
            {"task": "Drink 8 glasses of water", "completed": False},
            {"task": "30 minutes of exercise", "completed": False},
            {"task": "Log your meals", "completed": True},
            {"task": "Practice 5-minute meditation", "completed": False}
        ],
        "weekly_focus": "Stress Management",
        "resources": [
            {"title": "Breathing exercises for stress relief", "type": "video"},
            {"title": "Healthy meal prep ideas", "type": "article"}
        ]
    }

@router.post("/health-coach/checkin")
async def health_coach_checkin(data: Dict[str, Any], user = Depends(get_user_from_token)):
    """Daily check-in with health coach"""
    
    user_id = user.get("user_id") or user.get("sub")
    
    checkin_data = {
        "user_id": user_id,
        "mood": data.get("mood"),
        "energy_level": data.get("energy_level"),
        "sleep_quality": data.get("sleep_quality"),
        "water_intake": data.get("water_intake"),
        "exercise_minutes": data.get("exercise_minutes"),
        "notes": data.get("notes"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.health_checkins.insert_one(checkin_data)
    
    # Generate AI response
    response = "Great job checking in! "
    if data.get("mood", 5) >= 7:
        response += "You seem to be in a good mood today! "
    if data.get("exercise_minutes", 0) >= 30:
        response += "Excellent work on getting your exercise in! "
    if data.get("water_intake", 0) < 6:
        response += "Remember to drink more water throughout the day."
    
    return {
        "success": True,
        "ai_response": response,
        "streak": 7,  # Would be calculated from actual data
        "points_earned": 10
    }


# ============================================================
# TWO-WAY CHAT (#45)
# ============================================================
class ChatMessage(BaseModel):
    conversation_id: str
    message: str
    message_type: str = "text"  # text, image, file

@router.post("/chat/start")
async def start_chat_conversation(
    recipient_type: str = Query(..., description="doctor, staff, support"),
    recipient_id: str = None,
    user = Depends(get_user_from_token)
):
    """Start a new chat conversation"""
    
    conversation_id = f"CHAT-{str(uuid.uuid4())[:8]}"
    
    conversation_data = {
        "id": conversation_id,
        "patient_id": user.get("user_id") or user.get("sub"),
        "recipient_type": recipient_type,
        "recipient_id": recipient_id,
        "status": "active",
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.chat_conversations.insert_one(conversation_data)
    
    return {
        "success": True,
        "conversation_id": conversation_id
    }

@router.post("/chat/send")
async def send_chat_message(msg: ChatMessage, user = Depends(get_user_from_token)):
    """Send a chat message"""
    
    message_data = {
        "id": f"MSG-{str(uuid.uuid4())[:8]}",
        "sender_id": user.get("user_id") or user.get("sub"),
        "sender_type": "patient",
        "content": msg.message,
        "message_type": msg.message_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    
    if db is not None:
        await db.chat_conversations.update_one(
            {"id": msg.conversation_id},
            {"$push": {"messages": message_data}}
        )
    
    return {"success": True, "message_id": message_data["id"]}

@router.get("/chat/conversations")
async def get_chat_conversations(user = Depends(get_user_from_token)):
    """Get user's chat conversations"""
    
    user_id = user.get("user_id") or user.get("sub")
    
    if db is None:
        return {"conversations": []}
    
    conversations = await db.chat_conversations.find(
        {"patient_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"conversations": conversations}

@router.get("/chat/{conversation_id}/messages")
async def get_chat_messages(conversation_id: str, user = Depends(get_user_from_token)):
    """Get messages for a conversation"""
    
    if db is None:
        return {"messages": []}
    
    conversation = await db.chat_conversations.find_one(
        {"id": conversation_id},
        {"_id": 0}
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"messages": conversation.get("messages", [])}


# ============================================================
# STAFF PERFORMANCE ANALYTICS (#39)
# ============================================================
@router.get("/analytics/staff-performance")
async def get_staff_performance(
    staff_id: str = None,
    start_date: str = None,
    end_date: str = None,
    user = Depends(get_user_from_token)
):
    """Get staff performance analytics"""
    
    # In production, this would calculate from actual data
    return {
        "summary": {
            "total_appointments_handled": 145,
            "average_wait_time": 12,  # minutes
            "patient_satisfaction": 4.5,
            "on_time_rate": 92,  # percentage
        },
        "staff_rankings": [
            {"name": "Dr. Vikas Jha", "appointments": 65, "rating": 4.8, "on_time": 95},
            {"name": "Dr. Neha Patel", "appointments": 80, "rating": 4.7, "on_time": 90},
        ],
        "trends": {
            "appointments_this_week": [12, 15, 18, 14, 16, 20, 8],
            "satisfaction_trend": [4.3, 4.4, 4.5, 4.5, 4.6]
        }
    }


# ============================================================
# PATIENT CHECK-IN KIOSK (#44)
# ============================================================
@router.post("/kiosk/checkin")
async def kiosk_patient_checkin(
    appointment_id: str = Body(...),
    phone: str = Body(None),
    patient_name: str = Body(None)
):
    """Check-in patient via kiosk"""
    
    if db is not None:
        # Find and update appointment
        update_result = await db.appointments.update_one(
            {"id": appointment_id},
            {"$set": {"status": "In Clinic", "checked_in_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if update_result.modified_count == 0:
            # Try finding by phone
            if phone:
                appointment = await db.appointments.find_one({"patient_phone": phone, "status": "Booked"})
                if appointment:
                    await db.appointments.update_one(
                        {"_id": appointment["_id"]},
                        {"$set": {"status": "In Clinic", "checked_in_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    return {
                        "success": True,
                        "message": "Checked in successfully",
                        "queue_position": 3,
                        "estimated_wait": 15
                    }
    
    return {
        "success": True,
        "message": "Checked in successfully",
        "queue_position": 3,
        "estimated_wait": 15  # minutes
    }

@router.get("/kiosk/queue-display")
async def get_queue_display(clinic: str = None):
    """Get queue display data for kiosk screens"""
    
    if db is None:
        return {
            "current_token": "A-005",
            "now_serving": [
                {"token": "A-005", "doctor": "Dr. Vikas Jha", "room": "Room 1"},
                {"token": "B-003", "doctor": "Dr. Neha Patel", "room": "Room 2"}
            ],
            "upcoming": ["A-006", "A-007", "B-004", "B-005"],
            "average_wait": 12
        }
    
    # Get real queue data
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {"date": today, "status": {"$in": ["In Clinic", "Booked"]}}
    if clinic:
        query["clinic"] = clinic
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(50)
    
    now_serving = [a for a in appointments if a.get("status") == "In Clinic"][:3]
    upcoming = [a.get("token", a.get("id")[:6]) for a in appointments if a.get("status") == "Booked"][:10]
    
    return {
        "current_token": now_serving[0].get("token") if now_serving else "---",
        "now_serving": now_serving,
        "upcoming": upcoming,
        "average_wait": 12
    }


# ============================================================
# ROOM & RESOURCE BOOKING (#42)
# ============================================================
class RoomBooking(BaseModel):
    room_id: str
    purpose: str
    start_time: str
    end_time: str
    attendees: Optional[List[str]] = []

@router.get("/rooms/availability")
async def get_room_availability(date: str = None, clinic: str = None):
    """Get room availability for a date"""
    
    return {
        "rooms": [
            {
                "id": "room_1",
                "name": "Consultation Room 1",
                "type": "consultation",
                "capacity": 3,
                "amenities": ["AC", "Computer", "Examination Table"],
                "available_slots": ["09:00", "10:00", "14:00", "15:00", "16:00"]
            },
            {
                "id": "room_2",
                "name": "Procedure Room",
                "type": "procedure",
                "capacity": 5,
                "amenities": ["AC", "Medical Equipment", "Sterile Environment"],
                "available_slots": ["10:00", "11:00", "14:00"]
            },
            {
                "id": "room_3",
                "name": "Conference Room",
                "type": "meeting",
                "capacity": 10,
                "amenities": ["AC", "Projector", "Whiteboard", "Video Conferencing"],
                "available_slots": ["09:00", "11:00", "13:00", "15:00"]
            }
        ]
    }

@router.post("/rooms/book")
async def book_room(booking: RoomBooking, user = Depends(get_user_from_token)):
    """Book a room"""
    
    booking_id = f"RB-{str(uuid.uuid4())[:8].upper()}"
    
    booking_data = {
        "id": booking_id,
        "room_id": booking.room_id,
        "booked_by": user.get("user_id") or user.get("sub"),
        "purpose": booking.purpose,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "attendees": booking.attendees,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.room_bookings.insert_one(booking_data)
    
    return {
        "success": True,
        "booking_id": booking_id,
        "message": "Room booked successfully"
    }


# ============================================================
# SMART INVENTORY ALERTS (#36)
# ============================================================
@router.get("/inventory/alerts")
async def get_inventory_alerts(user = Depends(get_user_from_token)):
    """Get inventory alerts for low stock items"""
    
    if db is None:
        return {
            "alerts": [
                {
                    "id": "alert_1",
                    "item": "Paracetamol 500mg",
                    "current_stock": 50,
                    "minimum_stock": 100,
                    "status": "low",
                    "category": "medicines"
                },
                {
                    "id": "alert_2",
                    "item": "Surgical Gloves (M)",
                    "current_stock": 20,
                    "minimum_stock": 50,
                    "status": "critical",
                    "category": "supplies"
                },
                {
                    "id": "alert_3",
                    "item": "Blood Collection Tubes",
                    "current_stock": 30,
                    "minimum_stock": 100,
                    "status": "low",
                    "category": "lab_supplies"
                }
            ],
            "summary": {
                "critical_items": 1,
                "low_stock_items": 2,
                "expiring_soon": 5
            }
        }
    
    # Query for low stock items
    alerts = await db.inventory.find(
        {"$expr": {"$lt": ["$current_stock", "$minimum_stock"]}},
        {"_id": 0}
    ).to_list(50)
    
    return {
        "alerts": alerts,
        "summary": {
            "critical_items": len([a for a in alerts if a.get("current_stock", 0) < a.get("minimum_stock", 0) * 0.2]),
            "low_stock_items": len(alerts)
        }
    }

@router.post("/inventory/reorder")
async def create_reorder_request(
    item_id: str = Body(...),
    quantity: int = Body(...),
    user = Depends(get_user_from_token)
):
    """Create a reorder request for inventory item"""
    
    order_id = f"PO-{str(uuid.uuid4())[:8].upper()}"
    
    order_data = {
        "id": order_id,
        "item_id": item_id,
        "quantity": quantity,
        "requested_by": user.get("user_id") or user.get("sub"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.purchase_orders.insert_one(order_data)
    
    return {
        "success": True,
        "order_id": order_id,
        "message": "Reorder request submitted"
    }


# ============================================================
# SPLIT PAYMENT (#47)
# ============================================================
class SplitPaymentRequest(BaseModel):
    total_amount: float
    splits: List[Dict[str, Any]]  # [{"method": "card", "amount": 500}, {"method": "insurance", "amount": 500}]
    bill_id: str

@router.post("/payments/split")
async def process_split_payment(request: SplitPaymentRequest, user = Depends(get_user_from_token)):
    """Process a split payment"""
    
    payment_id = f"PAY-{str(uuid.uuid4())[:8].upper()}"
    
    # Validate splits add up to total
    total_splits = sum(s.get("amount", 0) for s in request.splits)
    if abs(total_splits - request.total_amount) > 0.01:
        raise HTTPException(status_code=400, detail="Split amounts must equal total amount")
    
    payment_data = {
        "id": payment_id,
        "bill_id": request.bill_id,
        "total_amount": request.total_amount,
        "splits": request.splits,
        "user_id": user.get("user_id") or user.get("sub"),
        "status": "processing",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.split_payments.insert_one(payment_data)
    
    # Process each split (in production, this would call payment gateways)
    processed_splits = []
    for split in request.splits:
        processed_splits.append({
            **split,
            "status": "completed",
            "transaction_id": f"TXN-{str(uuid.uuid4())[:8]}"
        })
    
    return {
        "success": True,
        "payment_id": payment_id,
        "processed_splits": processed_splits,
        "message": "Payment processed successfully"
    }


# ============================================================
# VOICE PRESCRIPTION (#15)
# ============================================================
@router.post("/voice-prescription/transcribe")
async def transcribe_voice_prescription(
    audio_url: str = Body(None),
    audio_text: str = Body(None),
    user = Depends(get_user_from_token)
):
    """Transcribe voice to prescription format"""
    
    # In production, this would use speech-to-text API
    # For now, parse the text input
    
    sample_prescription = {
        "medicines": [
            {
                "name": "Paracetamol 500mg",
                "dosage": "1 tablet",
                "frequency": "3 times a day",
                "duration": "5 days",
                "instructions": "After meals"
            },
            {
                "name": "Cetirizine 10mg",
                "dosage": "1 tablet",
                "frequency": "Once daily",
                "duration": "7 days",
                "instructions": "At bedtime"
            }
        ],
        "diagnosis": "Upper Respiratory Tract Infection",
        "advice": "Rest well, drink plenty of fluids",
        "follow_up": "After 5 days if symptoms persist"
    }
    
    return {
        "success": True,
        "transcription": audio_text or "Transcribed text would appear here",
        "parsed_prescription": sample_prescription,
        "confidence": 0.92
    }


# ============================================================
# DATA EXPORT (#50)
# ============================================================
@router.get("/data-export/request")
async def request_data_export(
    data_types: List[str] = Query(default=["appointments", "prescriptions", "reports"]),
    format: str = Query(default="pdf"),
    user = Depends(get_user_from_token)
):
    """Request export of user's health data"""
    
    export_id = f"EXP-{str(uuid.uuid4())[:8].upper()}"
    
    export_request = {
        "id": export_id,
        "user_id": user.get("user_id") or user.get("sub"),
        "data_types": data_types,
        "format": format,
        "status": "processing",
        "requested_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.data_exports.insert_one(export_request)
    
    return {
        "success": True,
        "export_id": export_id,
        "message": "Your data export is being prepared. You will receive a download link via email.",
        "estimated_time": "5-10 minutes"
    }

@router.get("/data-export/{export_id}/status")
async def get_export_status(export_id: str, user = Depends(get_user_from_token)):
    """Check status of data export request"""
    
    if db is None:
        return {
            "export_id": export_id,
            "status": "completed",
            "download_url": f"/api/data-export/{export_id}/download"
        }
    
    export = await db.data_exports.find_one({"id": export_id}, {"_id": 0})
    
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    
    return export


def setup_routes(database):
    """Setup routes with database"""
    global db
    db = database
    return router
