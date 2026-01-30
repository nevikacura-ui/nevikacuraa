"""
Evara - Women's Wellness & Care Module
All Evara-related routes for period tracking, pregnancy, subscriptions, etc.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

# PDF generation imports
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO
from fastapi.responses import StreamingResponse

# LLM imports for AI chat
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evara", tags=["Evara"])

# MongoDB connection and auth - will be injected by server.py
db = None
get_current_user = None
get_current_user_optional = None
send_sms_notification = None

def set_db(database):
    global db
    db = database

def set_auth_dependencies(auth_func, auth_optional_func):
    global get_current_user, get_current_user_optional
    get_current_user = auth_func
    get_current_user_optional = auth_optional_func

def set_sms_function(sms_func):
    global send_sms_notification
    send_sms_notification = sms_func


# ============ EVARA MODELS ============

class EvaraProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    age: int
    marital_status: Optional[str] = None
    pregnancy_status: str
    menstrual_status: str
    known_conditions: Optional[List[str]] = []
    weight: Optional[float] = None
    height: Optional[float] = None
    lifestyle_goals: Optional[List[str]] = []
    preferred_language: str = "English"
    assigned_programs: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EvaraOnboarding(BaseModel):
    age: int
    marital_status: Optional[str] = None
    pregnancy_status: str
    menstrual_status: str
    known_conditions: Optional[List[str]] = []
    weight: Optional[float] = None
    height: Optional[float] = None
    lifestyle_goals: Optional[List[str]] = []
    preferred_language: str = "English"


class EvaraChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class EvaraReminderCreate(BaseModel):
    type: str
    title: str
    message: str
    scheduled_date: str
    scheduled_time: str
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None


class HomeServiceRequest(BaseModel):
    service_type: str
    preferred_date: str
    preferred_time: str
    address: str
    notes: Optional[str] = None
    phone: str


class SubscriptionCheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str


class User(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None


# ============ EVARA SYSTEM MESSAGE FOR AI ============

EVARA_SYSTEM_MESSAGE = """You are Evara, a compassionate and knowledgeable women's wellness companion by Nevika Cura Healthcare. 

Your role is to:
- Provide empathetic, non-judgmental support for women's health topics
- Offer educational information about menstrual health, pregnancy, PCOS, menopause, and general wellness
- Give lifestyle and nutrition guidance appropriate to the user's life stage
- Send gentle reminders and encouragement

IMPORTANT RULES:
1. NEVER provide medical diagnosis or prescriptions
2. NEVER replace professional medical consultation
3. Always include appropriate disclaimers
4. If user reports severe symptoms (heavy bleeding, severe pain, pregnancy danger signs, mental health crisis), immediately advise seeking medical help
5. Use warm, caring, and professional language
6. Respect privacy and sensitivity of topics
7. Be culturally aware and inclusive

Always end responses about health concerns with: "For personalized medical advice, please consult with a healthcare professional."
"""


# ============ EVARA PROGRAM DEFINITIONS ============

EVARA_PROGRAMS = {
    "menstrual_health": {
        "name": "Menstrual Health & Period Tracking",
        "description": "Track your cycle, understand your body, and manage PMS effectively",
        "features": ["Cycle prediction", "Symptom logging", "Mood tracking", "Educational content"],
        "icon": "calendar"
    },
    "pcos_hormonal": {
        "name": "PCOS & Hormonal Balance",
        "description": "Comprehensive program for PCOS management with diet plans and exercise",
        "features": ["PCOS diet plans", "Exercise routines", "Symptom management", "Doctor consultations"],
        "icon": "heart-pulse"
    },
    "pregnancy_support": {
        "name": "Pregnancy Journey",
        "description": "Week-by-week guidance through your pregnancy",
        "features": ["Weekly baby updates", "Antenatal tips", "Nutrition guidance", "Danger sign awareness"],
        "icon": "baby"
    },
    "menopause_care": {
        "name": "Menopause & Beyond",
        "description": "Navigate perimenopause and menopause with confidence",
        "features": ["Symptom management", "Bone health", "Heart health", "Mental wellness"],
        "icon": "flower"
    },
    "wellness_community": {
        "name": "Wellness Community",
        "description": "Join live sessions, workshops, and connect with other women",
        "features": ["Live yoga sessions", "Nutrition workshops", "Support groups", "Expert Q&A"],
        "icon": "users"
    }
}


# ============ PREGNANCY WEEKLY CONTENT ============

PREGNANCY_WEEKLY_CONTENT = {
    1: {"title": "Week 1", "baby": "Conception hasn't occurred yet. Your body is preparing for ovulation.", "mom": "Track your cycle and take prenatal vitamins with folic acid.", "size": "N/A", "tip": "Start taking 400mcg folic acid daily."},
    2: {"title": "Week 2", "baby": "Your egg is maturing in the ovary, preparing for release.", "mom": "Ovulation typically happens around day 14 of your cycle.", "size": "N/A", "tip": "Track ovulation signs if trying to conceive."},
    3: {"title": "Week 3", "baby": "Fertilization! The sperm meets the egg. A tiny ball of cells is forming.", "mom": "You may not know you're pregnant yet.", "size": "Microscopic", "tip": "Continue prenatal vitamins and avoid alcohol."},
    4: {"title": "Week 4", "baby": "Implantation occurs. The embryo attaches to your uterine wall.", "mom": "You might notice light spotting or feel early pregnancy signs.", "size": "Poppy seed", "tip": "Take a pregnancy test if your period is late."},
    5: {"title": "Week 5", "baby": "The neural tube is forming, which becomes the brain and spine.", "mom": "Morning sickness may begin. Fatigue is common.", "size": "Sesame seed", "tip": "Eat small, frequent meals to manage nausea."},
    6: {"title": "Week 6", "baby": "The heart starts beating! Tiny arm and leg buds appear.", "mom": "Breast tenderness and frequent urination may increase.", "size": "Lentil", "tip": "Schedule your first prenatal appointment."},
    7: {"title": "Week 7", "baby": "Facial features begin forming. Brain is growing rapidly.", "mom": "Food aversions and cravings may develop.", "size": "Blueberry", "tip": "Stay hydrated, especially if experiencing nausea."},
    8: {"title": "Week 8", "baby": "Fingers and toes are forming. Baby is moving, though you can't feel it.", "mom": "Your uterus is expanding. You may feel cramping.", "size": "Raspberry", "tip": "Avoid hot tubs and saunas."},
    12: {"title": "Week 12", "baby": "All major organs are formed. Baby can open and close fingers.", "mom": "Risk of miscarriage decreases significantly.", "size": "Lime", "tip": "First trimester screening may be offered now."},
    16: {"title": "Week 16", "baby": "Baby can hear! Facial expressions are developing.", "mom": "You may start showing. Energy levels improve.", "size": "Avocado", "tip": "Consider prenatal yoga or gentle exercise."},
    20: {"title": "Week 20", "baby": "Halfway there! Baby is very active. You can feel movements.", "mom": "Anatomy scan can reveal baby's sex if desired.", "size": "Banana", "tip": "Start talking or singing to your baby!"},
    24: {"title": "Week 24", "baby": "Baby's lungs are developing. Can respond to sounds.", "mom": "Glucose screening test around this time.", "size": "Corn on the cob", "tip": "Watch for signs of gestational diabetes."},
    28: {"title": "Week 28", "baby": "Baby can open eyes and has regular sleep cycles.", "mom": "Third trimester begins! You may feel more tired.", "size": "Eggplant", "tip": "Count baby kicks - 10 movements in 2 hours is normal."},
    32: {"title": "Week 32", "baby": "Baby is practicing breathing. Bones are hardening.", "mom": "Braxton Hicks contractions may occur.", "size": "Squash", "tip": "Prepare your hospital bag."},
    36: {"title": "Week 36", "baby": "Baby is gaining weight rapidly. Head may engage in pelvis.", "mom": "Weekly prenatal visits begin.", "size": "Papaya", "tip": "Review birth plan with your healthcare provider."},
    40: {"title": "Week 40", "baby": "Full term! Baby is ready to meet you.", "mom": "Watch for labor signs: contractions, water breaking.", "size": "Watermelon", "tip": "Stay calm and contact your doctor when labor begins."},
}


# ============ HOME SERVICES ============

HOME_SERVICES = {
    "postnatal_nurse": {
        "name": "Postnatal Nurse Visit",
        "description": "Professional nurse visits for mother and baby care after delivery",
        "includes": ["Mother health check", "Baby care guidance", "Breastfeeding support", "Wound care"],
        "duration": "1-2 hours per visit",
        "note": "Services coordinated through partner healthcare providers"
    },
    "lactation_consultant": {
        "name": "Lactation Consultant",
        "description": "Expert guidance for breastfeeding challenges",
        "includes": ["Latch assessment", "Feeding positions", "Milk supply issues", "Pumping guidance"],
        "duration": "45-60 minutes",
        "note": "Virtual and home visit options available"
    },
    "physiotherapy": {
        "name": "Women's Physiotherapy",
        "description": "Specialized physiotherapy for prenatal and postnatal care",
        "includes": ["Pelvic floor exercises", "Diastasis recti treatment", "Back pain relief", "Pregnancy exercises"],
        "duration": "45 minutes",
        "note": "Home visits available in select areas"
    },
    "sample_collection": {
        "name": "Home Sample Collection",
        "description": "Lab sample collection at your doorstep",
        "includes": ["Blood tests", "Urine tests", "Prenatal screenings"],
        "duration": "15-20 minutes",
        "note": "Coordinated with Proton Diagnostics",
        "redirect": "/proton"
    }
}


# ============ SUBSCRIPTION PLANS ============

EVARA_SUBSCRIPTION_PLANS = {
    "evara_monthly": {
        "name": "Evara Monthly",
        "amount": 199,
        "currency": "inr",
        "duration_days": 30,
        "features": ["Period tracking", "AI Chat support", "Exercise videos", "Nutrition plans"]
    },
    "evara_quarterly": {
        "name": "Evara Quarterly",
        "amount": 499,
        "currency": "inr",
        "duration_days": 90,
        "features": ["All monthly features", "Live sessions", "Doctor consultations", "Priority support"]
    },
    "evara_annual": {
        "name": "Evara Annual",
        "amount": 1499,
        "currency": "inr",
        "duration_days": 365,
        "features": ["All quarterly features", "Personal wellness coach", "Exclusive workshops", "Partner discounts"]
    }
}


# ============ COMMUNITY SESSIONS ============

COMMUNITY_SESSIONS = [
    {"id": "yoga_prenatal", "title": "Prenatal Yoga", "host": "Dr. Meera Sharma", "day": "Monday", "time": "7:00 AM", "type": "live"},
    {"id": "nutrition_pcos", "title": "PCOS Nutrition Workshop", "host": "Dt. Priya Kapoor", "day": "Wednesday", "time": "6:00 PM", "type": "workshop"},
    {"id": "menopause_support", "title": "Menopause Support Group", "host": "Dr. Anjali Rao", "day": "Friday", "time": "5:00 PM", "type": "support_group"},
    {"id": "meditation_women", "title": "Women's Meditation Circle", "host": "Instructor Kavita", "day": "Saturday", "time": "8:00 AM", "type": "live"},
]


# ============ AI CHAT ============

evara_chats = {}  # Store chat sessions

async def get_evara_chat(session_id: str, user_context: str = "") -> LlmChat:
    """Get or create Evara AI chat session"""
    if session_id not in evara_chats:
        system_msg = EVARA_SYSTEM_MESSAGE
        if user_context:
            system_msg += f"\n\nUser Context: {user_context}"
        
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=session_id,
            system_message=system_msg
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        evara_chats[session_id] = chat
    
    return evara_chats[session_id]


# ============ HELPER FUNCTIONS ============

def assign_evara_programs(profile: dict) -> List[str]:
    """Auto-assign programs based on user profile"""
    assigned = []
    age = profile.get("age", 25)
    pregnancy_status = profile.get("pregnancy_status", "no")
    menstrual_status = profile.get("menstrual_status", "regular")
    conditions = profile.get("known_conditions", [])
    
    assigned.append("wellness_community")
    
    if menstrual_status != "menopausal" and 15 <= age <= 50:
        assigned.append("menstrual_health")
    
    if "PCOS" in conditions or "pcos" in [c.lower() for c in conditions]:
        assigned.append("pcos_hormonal")
    
    if pregnancy_status in ["yes", "planning"]:
        assigned.append("pregnancy_support")
    
    if menstrual_status == "menopausal" or age >= 45:
        assigned.append("menopause_care")
    
    return assigned


# ============ EVARA ROUTES ============

@router.post("/onboarding")
async def evara_onboarding(data: EvaraOnboarding, user = Depends(lambda: get_current_user_optional)):
    """Complete Evara onboarding and get program assignments"""
    user_id = user["id"] if user else str(uuid.uuid4())
    
    existing = await db.evara_profiles.find_one({"user_id": user_id})
    if existing:
        assigned_programs = assign_evara_programs(data.model_dump())
        await db.evara_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                **data.model_dump(),
                "assigned_programs": assigned_programs,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "message": "Profile updated",
            "assigned_programs": [
                {**EVARA_PROGRAMS[p], "id": p}
                for p in assigned_programs if p in EVARA_PROGRAMS
            ]
        }
    
    profile = EvaraProfile(
        user_id=user_id,
        **data.model_dump()
    )
    assigned_programs = assign_evara_programs(data.model_dump())
    profile.assigned_programs = assigned_programs
    
    profile_dict = profile.model_dump()
    profile_dict["created_at"] = profile_dict["created_at"].isoformat()
    profile_dict["updated_at"] = profile_dict["updated_at"].isoformat()
    
    await db.evara_profiles.insert_one(profile_dict)
    
    return {
        "success": True,
        "profile_id": profile.id,
        "assigned_programs": [
            {**EVARA_PROGRAMS[p], "id": p}
            for p in assigned_programs if p in EVARA_PROGRAMS
        ]
    }


@router.get("/profile")
async def get_evara_profile(user = Depends(lambda: get_current_user_optional)):
    """Get user's Evara profile"""
    if not user:
        return {"profile": None, "programs": list(EVARA_PROGRAMS.values())}
    
    profile = await db.evara_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    
    return {
        "profile": profile,
        "programs": [
            {**EVARA_PROGRAMS[p], "id": p}
            for p in profile.get("assigned_programs", []) if p in EVARA_PROGRAMS
        ] if profile else []
    }


@router.get("/programs")
async def get_all_programs():
    """Get all available Evara programs"""
    return {
        "programs": [
            {**v, "id": k} for k, v in EVARA_PROGRAMS.items()
        ]
    }


@router.get("/program/{program_id}/content")
async def get_program_content(program_id: str):
    """Get content for a specific program"""
    if program_id not in EVARA_PROGRAMS:
        raise HTTPException(status_code=404, detail="Program not found")
    
    program = EVARA_PROGRAMS[program_id]
    
    content = {
        "menstrual_health": {
            "articles": [
                {"title": "Understanding Your Menstrual Cycle", "read_time": "5 min"},
                {"title": "Managing PMS Naturally", "read_time": "4 min"},
                {"title": "When to See a Doctor About Period Problems", "read_time": "3 min"}
            ],
            "videos": [
                {"title": "Gentle Yoga for Period Pain", "duration": "15 min"},
                {"title": "Nutrition for Hormonal Balance", "duration": "10 min"}
            ]
        },
        "pcos_hormonal": {
            "articles": [
                {"title": "PCOS: Symptoms and Diagnosis", "read_time": "6 min"},
                {"title": "PCOS-Friendly Diet Guide", "read_time": "8 min"},
                {"title": "Exercise and PCOS Management", "read_time": "5 min"}
            ],
            "videos": [
                {"title": "PCOS Exercise Routine", "duration": "20 min"},
                {"title": "Meal Prep for PCOS", "duration": "15 min"}
            ]
        }
    }
    
    return {
        "program": program,
        "content": content.get(program_id, {"articles": [], "videos": []})
    }


@router.post("/chat")
async def evara_chat(data: EvaraChatMessage, user = Depends(lambda: get_current_user_optional)):
    """Chat with Evara AI assistant"""
    session_id = data.session_id or str(uuid.uuid4())
    
    user_context = ""
    if user:
        profile = await db.evara_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
        if profile:
            user_context = f"Age: {profile.get('age')}, Pregnancy Status: {profile.get('pregnancy_status')}, Menstrual Status: {profile.get('menstrual_status')}"
    
    chat = await get_evara_chat(session_id, user_context)
    response = await chat.send_message(UserMessage(content=data.message))
    
    chat_record = {
        "session_id": session_id,
        "user_id": user["id"] if user else None,
        "user_message": data.message,
        "ai_response": response.content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.evara_chats.insert_one(chat_record)
    
    return {
        "session_id": session_id,
        "response": response.content
    }


@router.get("/chat/history")
async def get_chat_history(session_id: str, user = Depends(lambda: get_current_user_optional)):
    """Get chat history for a session"""
    history = await db.evara_chats.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(50)
    return {"history": history}


# ============ REMINDERS ============

@router.post("/reminders")
async def create_reminder(data: EvaraReminderCreate, user = Depends(lambda: get_current_user_optional)):
    """Create a new reminder"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to create reminders")
    
    reminder = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.evara_reminders.insert_one(reminder)
    reminder.pop("_id", None)
    return {"success": True, "reminder": reminder}


@router.get("/reminders")
async def get_reminders(user = Depends(lambda: get_current_user_optional)):
    """Get user's reminders"""
    if not user:
        return {"reminders": []}
    
    reminders = await db.evara_reminders.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).to_list(50)
    return {"reminders": reminders}


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user = Depends(lambda: get_current_user_optional)):
    """Delete a reminder"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await db.evara_reminders.update_one(
        {"id": reminder_id, "user_id": user["id"]},
        {"$set": {"is_active": False}}
    )
    return {"success": result.modified_count > 0}


@router.post("/reminders/whatsapp")
async def set_whatsapp_reminder(
    reminder_type: str,
    phone: str,
    user = Depends(lambda: get_current_user_optional)
):
    """Set up WhatsApp reminder preferences"""
    valid_types = ["period", "medication", "appointment", "pregnancy_weekly", "wellness"]
    if reminder_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Choose from: {valid_types}")
    
    preference = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
        "phone": phone,
        "reminder_type": reminder_type,
        "channel": "sms",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.evara_reminder_preferences.find_one({
        "phone": phone,
        "reminder_type": reminder_type
    })
    
    if existing:
        await db.evara_reminder_preferences.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": True}}
        )
    else:
        await db.evara_reminder_preferences.insert_one(preference)
    
    if send_sms_notification:
        try:
            message = f"""Evara - Reminder Set! ✓

Type: {reminder_type.replace('_', ' ').title()}
Channel: SMS

You'll receive reminders on this number.

To stop: Reply STOP

- Evara by Nevika Cura"""
            await send_sms_notification(phone, message)
        except Exception as e:
            logger.error(f"Failed to send reminder confirmation: {e}")
    
    return {
        "success": True,
        "message": f"{reminder_type.replace('_', ' ').title()} reminders activated via SMS"
    }


# ============ PERIOD TRACKING ============

@router.post("/period/log")
async def log_period(
    start_date: str,
    end_date: Optional[str] = None,
    flow: str = "medium",
    symptoms: Optional[List[str]] = None,
    notes: Optional[str] = None,
    user = Depends(lambda: get_current_user_optional)
):
    """Log period data"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to track your period")
    
    period_log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "start_date": start_date,
        "end_date": end_date,
        "flow": flow,
        "symptoms": symptoms or [],
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evara_period_logs.insert_one(period_log)
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    next_predicted = (start + timedelta(days=28)).strftime("%Y-%m-%d")
    
    return {
        "success": True,
        "log": {k: v for k, v in period_log.items() if k != "_id"},
        "next_predicted": next_predicted
    }


@router.get("/period/history")
async def get_period_history(user = Depends(lambda: get_current_user_optional)):
    """Get period tracking history"""
    if not user:
        return {"history": [], "predictions": None}
    
    history = await db.evara_period_logs.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("start_date", -1)]).limit(12).to_list(12)
    
    if len(history) >= 2:
        cycles = []
        for i in range(len(history) - 1):
            start1 = datetime.strptime(history[i]["start_date"], "%Y-%m-%d")
            start2 = datetime.strptime(history[i+1]["start_date"], "%Y-%m-%d")
            cycles.append((start1 - start2).days)
        avg_cycle = sum(cycles) // len(cycles) if cycles else 28
    else:
        avg_cycle = 28
    
    next_predicted = None
    if history:
        last_start = datetime.strptime(history[0]["start_date"], "%Y-%m-%d")
        next_predicted = (last_start + timedelta(days=avg_cycle)).strftime("%Y-%m-%d")
    
    return {
        "history": history,
        "average_cycle_length": avg_cycle,
        "next_predicted": next_predicted
    }


# ============ PREGNANCY CONTENT ============

@router.get("/pregnancy/week/{week}")
async def get_pregnancy_week_content(week: int):
    """Get pregnancy content for a specific week"""
    if week < 1 or week > 42:
        raise HTTPException(status_code=400, detail="Week must be between 1 and 42")
    
    content = PREGNANCY_WEEKLY_CONTENT.get(week, {})
    return {
        "week": week,
        "content": content,
        "trimester": 1 if week <= 12 else (2 if week <= 27 else 3)
    }


@router.get("/pregnancy/all-weeks")
async def get_all_pregnancy_weeks():
    """Get all pregnancy week content"""
    return {
        "weeks": [
            {"week": w, **content}
            for w, content in PREGNANCY_WEEKLY_CONTENT.items()
        ]
    }


# ============ HOME SERVICES ============

@router.get("/home-services")
async def get_home_services():
    """Get available home services"""
    return {
        "services": [
            {"id": k, **v} for k, v in HOME_SERVICES.items()
        ],
        "disclaimer": "These services are coordinated through our partner providers."
    }


@router.post("/home-services/request")
async def request_home_service(data: HomeServiceRequest, user = Depends(lambda: get_current_user_optional)):
    """Request a home service"""
    if data.service_type not in HOME_SERVICES:
        raise HTTPException(status_code=400, detail="Invalid service type")
    
    request_record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
        "service_type": data.service_type,
        "service_name": HOME_SERVICES[data.service_type]["name"],
        "preferred_date": data.preferred_date,
        "preferred_time": data.preferred_time,
        "address": data.address,
        "notes": data.notes,
        "phone": data.phone,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evara_service_requests.insert_one(request_record)
    request_record.pop("_id", None)
    
    return {
        "success": True,
        "request": request_record,
        "message": "Your request has been submitted. Our team will contact you shortly."
    }


@router.get("/home-services/my-requests")
async def get_my_service_requests(user = Depends(lambda: get_current_user_optional)):
    """Get user's service requests"""
    if not user:
        return {"requests": []}
    
    requests = await db.evara_service_requests.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    return {"requests": requests}


# ============ COMMUNITY SESSIONS ============

@router.get("/community/sessions")
async def get_community_sessions():
    """Get available community sessions"""
    return {"sessions": COMMUNITY_SESSIONS}


@router.post("/community/register/{session_id}")
async def register_for_session(session_id: str, user = Depends(lambda: get_current_user_optional)):
    """Register for a community session"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to register")
    
    session = next((s for s in COMMUNITY_SESSIONS if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    registration = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "session_title": session["title"],
        "registered_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evara_session_registrations.insert_one(registration)
    
    return {
        "success": True,
        "message": f"Registered for {session['title']}",
        "session": session
    }


# ============ SHARE CONTENT ============

@router.get("/share/{content_type}")
async def get_evara_share_content(content_type: str):
    """Get shareable WhatsApp content for Evara educational material"""
    share_content = {
        "pcos_guide": {
            "title": "PCOS Guide",
            "message": "🌸 *Understanding PCOS* 🌸\n\nLearn about symptoms, diet plans, and exercise routines for managing PCOS.\n\n✅ Symptoms & Diagnosis\n✅ PCOS-Friendly Diet\n✅ Weekly Exercise Plan\n\nDownload Nevika Cura app for the complete guide!\n\n#PCOSAwareness #WomensHealth"
        },
        "pms_guide": {
            "title": "PMS Guide",
            "message": "🌷 *Understanding PMS* 🌷\n\nTips to manage premenstrual syndrome effectively.\n\n✅ Physical & Emotional Symptoms\n✅ Dietary Changes\n✅ Exercise & Lifestyle Tips\n\nDownload Nevika Cura app for more!\n\n#PMS #WomensWellness"
        },
        "pregnancy_tips": {
            "title": "Pregnancy Tips",
            "message": "🤰 *Pregnancy Week-by-Week Guide* 🤰\n\nTrack your baby's development from week 1 to 42!\n\n✅ Baby's size & growth\n✅ Mom's body changes\n✅ Weekly tips\n\nDownload Nevika Cura app!\n\n#Pregnancy #MomToBe"
        }
    }
    
    if content_type not in share_content:
        raise HTTPException(status_code=404, detail="Content type not found")
    
    content = share_content[content_type]
    message = content['message'].replace(' ', '%20').replace('\n', '%0A')
    whatsapp_url = f"https://wa.me/?text={message}"
    
    return {
        "title": content["title"],
        "message": content["message"],
        "whatsapp_url": whatsapp_url
    }


@router.get("/share-period-report")
async def share_period_report(user = Depends(lambda: get_current_user)):
    """Generate shareable period report for WhatsApp"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    history = await db.evara_period_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("start_date", -1).to_list(6)
    
    if not history:
        return {"report": "No period data to share", "whatsapp_url": None}
    
    report_lines = [
        "🌸 *EVARA PERIOD REPORT* 🌸",
        f"Patient: {user.name}",
        f"Date: {datetime.now().strftime('%d %b %Y')}",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "*Recent Cycles:*"
    ]
    
    for log in history[:3]:
        report_lines.append(f"📍 {log.get('start_date', 'N/A')} - Flow: {log.get('flow', 'N/A')}")
    
    report_lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "_Generated by Nevika Cura - Evara_"
    ])
    
    report_text = "\n".join(report_lines)
    whatsapp_url = f"https://wa.me/?text={report_text.replace(' ', '%20').replace(chr(10), '%0A')}"
    
    return {"report": report_text, "whatsapp_url": whatsapp_url}


# ============ PDF DOWNLOAD ============

@router.get("/download-pdf")
async def download_evara_pdf_report(user = Depends(lambda: get_current_user)):
    """Generate a downloadable PDF report of period tracking data"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    period_logs = await db.evara_period_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("start_date", -1).to_list(24)
    
    cycle_lengths = []
    if len(period_logs) >= 2:
        for i in range(len(period_logs) - 1):
            try:
                current = datetime.strptime(period_logs[i]["start_date"], "%Y-%m-%d")
                previous = datetime.strptime(period_logs[i+1]["start_date"], "%Y-%m-%d")
                cycle_length = (current - previous).days
                if 21 <= cycle_length <= 45:
                    cycle_lengths.append(cycle_length)
            except:
                pass
    
    avg_cycle = round(sum(cycle_lengths) / len(cycle_lengths)) if cycle_lengths else None
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1*cm, leftMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#ec4899'), spaceAfter=20)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#be185d'), spaceBefore=15, spaceAfter=10)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=11, spaceAfter=5)
    
    elements = []
    
    elements.append(Paragraph("EVARA - Women's Health Report", title_style))
    elements.append(Paragraph(f"Patient: {user.name}", normal_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%d %b %Y, %I:%M %p')}", normal_style))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("Menstrual Cycle Summary", heading_style))
    summary_data = [
        ["Total Periods Tracked:", str(len(period_logs))],
        ["Average Cycle Length:", f"{avg_cycle} days" if avg_cycle else "Calculating..."],
        ["Cycle Regularity:", "Regular" if cycle_lengths and max(cycle_lengths) - min(cycle_lengths) <= 7 else "Irregular" if cycle_lengths else "N/A"],
    ]
    
    if period_logs:
        last_period = period_logs[0]
        summary_data.append(["Last Period Start:", last_period.get('start_date', 'N/A')])
        if avg_cycle:
            try:
                next_predicted = datetime.strptime(last_period['start_date'], "%Y-%m-%d") + timedelta(days=avg_cycle)
                summary_data.append(["Next Period (Predicted):", next_predicted.strftime('%d %b %Y')])
            except:
                pass
    
    summary_table = Table(summary_data, colWidths=[5*cm, 6*cm])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#be185d')),
    ]))
    elements.append(summary_table)
    
    if period_logs:
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("Period History (Last 12 Cycles)", heading_style))
        
        history_data = [["Start Date", "End Date", "Duration", "Flow", "Symptoms"]]
        for log in period_logs[:12]:
            start = log.get('start_date', 'N/A')
            end = log.get('end_date', '-')
            duration = '-'
            if start != 'N/A' and end and end != '-':
                try:
                    d = (datetime.strptime(end, "%Y-%m-%d") - datetime.strptime(start, "%Y-%m-%d")).days + 1
                    duration = f"{d} days"
                except:
                    pass
            symptoms = ", ".join(log.get('symptoms', [])[:2]) or "-"
            history_data.append([start, end or '-', duration, log.get('flow', '-'), symptoms[:20]])
        
        history_table = Table(history_data, colWidths=[2.5*cm, 2.5*cm, 2*cm, 2*cm, 4.5*cm])
        history_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ec4899')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (3, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(history_table)
    
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("━" * 50, normal_style))
    elements.append(Paragraph("Generated by Nevika Cura - Evara Women's Wellness", ParagraphStyle('Footer', fontSize=9, textColor=colors.grey)))
    elements.append(Paragraph("This report is for informational purposes only. Please consult your doctor for medical advice.", ParagraphStyle('Footer', fontSize=8, textColor=colors.grey)))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"evara_report_{user.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============ SUBSCRIPTION ============

@router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available Evara subscription plans"""
    plans = []
    for plan_id, plan_data in EVARA_SUBSCRIPTION_PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan_data["name"],
            "amount": plan_data["amount"],
            "currency": plan_data["currency"],
            "duration_days": plan_data["duration_days"],
            "formatted_price": f"₹{int(plan_data['amount'])}" if plan_data["currency"] == "inr" else f"${plan_data['amount']}"
        })
    return {"plans": plans}


@router.post("/subscription/checkout")
async def create_subscription_checkout(request: SubscriptionCheckoutRequest, http_request: Request, user = Depends(lambda: get_current_user)):
    """Create a Stripe checkout session for Evara subscription"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if request.plan_id not in EVARA_SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    plan = EVARA_SUBSCRIPTION_PLANS[request.plan_id]
    
    try:
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        origin_url = request.origin_url.rstrip('/')
        success_url = f"{origin_url}/evara?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/evara?payment=cancelled"
        
        checkout_request = CheckoutSessionRequest(
            amount=plan["amount"],
            currency=plan["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user.id,
                "user_email": user.email,
                "plan_id": request.plan_id,
                "plan_name": plan["name"],
                "duration_days": str(plan["duration_days"])
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "user_email": user.email,
            "session_id": session.session_id,
            "plan_id": request.plan_id,
            "plan_name": plan["name"],
            "amount": plan["amount"],
            "currency": plan["currency"],
            "duration_days": plan["duration_days"],
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.get("/subscription/status/{session_id}")
async def get_subscription_status(session_id: str, http_request: Request):
    """Check payment status and update subscription"""
    try:
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        status_response = await stripe_checkout.get_session_status(session_id)
        
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        
        if not transaction:
            return {"status": "unknown", "message": "Transaction not found"}
        
        if status_response.payment_status == "paid" and transaction.get("payment_status") == "pending":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            subscription_end = datetime.now(timezone.utc) + timedelta(days=transaction.get("duration_days", 30))
            await db.users.update_one(
                {"id": transaction["user_id"]},
                {"$set": {
                    "evara_subscription": {
                        "active": True,
                        "plan_id": transaction["plan_id"],
                        "plan_name": transaction["plan_name"],
                        "start_date": datetime.now(timezone.utc).isoformat(),
                        "end_date": subscription_end.isoformat()
                    }
                }}
            )
        
        return {
            "status": status_response.payment_status,
            "plan_name": transaction.get("plan_name"),
            "amount": transaction.get("amount"),
            "currency": transaction.get("currency")
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")


@router.get("/subscription/user")
async def get_user_subscription(user = Depends(lambda: get_current_user)):
    """Get current user's Evara subscription status"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0, "evara_subscription": 1})
    
    if not user_doc or not user_doc.get("evara_subscription"):
        return {
            "has_subscription": False,
            "subscription": None
        }
    
    subscription = user_doc["evara_subscription"]
    
    end_date = datetime.fromisoformat(subscription.get("end_date", "2000-01-01"))
    is_active = subscription.get("active", False) and end_date > datetime.now(timezone.utc)
    
    return {
        "has_subscription": is_active,
        "subscription": {
            "plan_id": subscription.get("plan_id"),
            "plan_name": subscription.get("plan_name"),
            "start_date": subscription.get("start_date"),
            "end_date": subscription.get("end_date"),
            "days_remaining": max(0, (end_date - datetime.now(timezone.utc)).days) if is_active else 0
        }
    }
