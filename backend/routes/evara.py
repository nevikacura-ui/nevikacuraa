"""
Evara - Women's Wellness & Care Module
All Evara-related routes for period tracking, pregnancy, subscriptions, etc.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

# Import from main server (these will be available when imported)
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evara", tags=["Evara"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]

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

class EvaraReminder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str
    title: str
    message: str
    scheduled_date: str
    scheduled_time: str
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    is_active: bool = True
    last_sent: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# ============ EVARA PROGRAM DEFINITIONS ============

EVARA_PROGRAMS = {
    "menstrual_health": {
        "name": "Menstrual Health & Period Tracking",
        "description": "Track your cycle, understand your body, and manage PMS effectively",
        "age_range": [15, 50],
        "features": ["Period tracking", "PMS education", "Symptom logging", "Cycle predictions"]
    },
    "pcos_hormonal": {
        "name": "PCOS & Hormonal Balance Program",
        "description": "Comprehensive support for managing PCOS and hormonal health",
        "age_range": [18, 45],
        "conditions": ["PCOS"],
        "features": ["Symptom tracking", "Diet plans", "Exercise guidance", "Progress monitoring"]
    },
    "pregnancy_support": {
        "name": "Pregnancy Education & Support",
        "description": "Your companion through the beautiful journey of pregnancy",
        "pregnancy_status": ["yes", "planning"],
        "features": ["Week-by-week guidance", "Antenatal education", "Danger sign alerts", "Nutrition tips"]
    },
    "menopause_care": {
        "name": "Menopause & Perimenopause Care",
        "description": "Navigate this transition with confidence and support",
        "menstrual_status": ["menopausal"],
        "age_range": [40, 65],
        "features": ["Symptom management", "Bone health", "Mental wellbeing", "Lifestyle guidance"]
    },
    "wellness_community": {
        "name": "Women's Health Community",
        "description": "A safe space to learn, share, and grow together",
        "age_range": [15, 65],
        "features": ["Educational content", "Monthly live sessions", "Peer support", "Expert Q&A"]
    }
}

# ============ PREGNANCY WEEKLY CONTENT ============

PREGNANCY_WEEKLY_CONTENT = {
    1: {"title": "Week 1", "baby": "Conception hasn't occurred yet. Your body is preparing for ovulation.", "mom": "Track your cycle and take prenatal vitamins with folic acid.", "size": "N/A", "tip": "Start taking 400mcg folic acid daily."},
    2: {"title": "Week 2", "baby": "Ovulation occurs. The egg is released and may be fertilized.", "mom": "This is your fertile window. Optimal time for conception.", "size": "N/A", "tip": "Stay relaxed and maintain a healthy lifestyle."},
    3: {"title": "Week 3", "baby": "Fertilization! The sperm meets the egg. Cell division begins.", "mom": "You may not feel different yet. The fertilized egg travels to the uterus.", "size": "Poppy seed", "tip": "Avoid alcohol, smoking, and limit caffeine."},
    4: {"title": "Week 4", "baby": "Implantation occurs. The embryo attaches to the uterine wall.", "mom": "You might miss your period. Some women experience light spotting.", "size": "Poppy seed", "tip": "Take a pregnancy test if your period is late."},
    5: {"title": "Week 5", "baby": "Heart begins to form and will start beating soon. Neural tube developing.", "mom": "Morning sickness may begin. Breast tenderness and fatigue common.", "size": "Sesame seed", "tip": "Eat small, frequent meals to combat nausea."},
    6: {"title": "Week 6", "baby": "Heartbeat can be detected on ultrasound! Facial features forming.", "mom": "Increased urination, mood swings, and food aversions.", "size": "Lentil", "tip": "Schedule your first prenatal appointment."},
    7: {"title": "Week 7", "baby": "Arms and legs are forming. Brain growing rapidly.", "mom": "Nausea may peak. Skin changes possible.", "size": "Blueberry", "tip": "Stay hydrated and get plenty of rest."},
    8: {"title": "Week 8", "baby": "All major organs are forming. Baby is now called a fetus.", "mom": "Uterus is growing. Clothes may feel tighter.", "size": "Raspberry", "tip": "Avoid hot tubs and saunas."},
    9: {"title": "Week 9", "baby": "Baby can move, though you can't feel it yet. Tiny muscles forming.", "mom": "Fatigue may increase. Hormones stabilizing.", "size": "Cherry", "tip": "Consider announcing to close family."},
    10: {"title": "Week 10", "baby": "Vital organs are fully formed and starting to function.", "mom": "Belly may start showing slightly. Round ligament pain possible.", "size": "Strawberry", "tip": "Start thinking about maternity clothes."},
    11: {"title": "Week 11", "baby": "Baby's bones are hardening. Fingers and toes separating.", "mom": "Hair and nails may grow faster. Mood improving.", "size": "Fig", "tip": "Maintain regular gentle exercise."},
    12: {"title": "Week 12", "baby": "Reflexes developing. Baby can open and close fingers.", "mom": "Risk of miscarriage decreases significantly. Energy returning.", "size": "Lime", "tip": "Safe to share pregnancy news more widely!"},
    13: {"title": "Week 13 - Second Trimester!", "baby": "Fingerprints forming. Vocal cords developing.", "mom": "Welcome to the second trimester! Energy often increases.", "size": "Peach", "tip": "Many women feel their best in this trimester."},
    14: {"title": "Week 14", "baby": "Baby can make facial expressions. Kidneys producing urine.", "mom": "Appetite may increase. Less nausea for most.", "size": "Lemon", "tip": "Eat iron-rich foods to prevent anemia."},
    15: {"title": "Week 15", "baby": "Baby is practicing breathing movements with amniotic fluid.", "mom": "Nasal congestion common. Skin changes (linea nigra) may appear.", "size": "Apple", "tip": "Use a humidifier for congestion relief."},
    16: {"title": "Week 16", "baby": "Baby can hear sounds! Eyes are moving.", "mom": "You might feel first movements (quickening) - like flutters!", "size": "Avocado", "tip": "Talk or sing to your baby."},
    17: {"title": "Week 17", "baby": "Fat starting to form under skin. Sweat glands developing.", "mom": "Weight gain becoming noticeable. Back pain may start.", "size": "Pomegranate", "tip": "Practice good posture and wear supportive shoes."},
    18: {"title": "Week 18", "baby": "Baby can yawn and hiccup! Ears are in final position.", "mom": "Feeling hungrier. Sleep position adjustments needed.", "size": "Sweet potato", "tip": "Start sleeping on your side."},
    19: {"title": "Week 19", "baby": "Protective coating (vernix) forms on skin.", "mom": "Round ligament pain common. Dizziness possible.", "size": "Mango", "tip": "Rise slowly from sitting or lying down."},
    20: {"title": "Week 20 - Halfway There!", "baby": "Anatomy scan ultrasound! Can find out baby's sex.", "mom": "Belly is clearly visible. May feel baby's sleep/wake cycles.", "size": "Banana", "tip": "Celebrate this milestone!"},
    21: {"title": "Week 21", "baby": "Eyebrows and eyelids fully formed. Baby moving more.", "mom": "Varicose veins may appear. Leg cramps possible.", "size": "Carrot", "tip": "Elevate feet when resting."},
    22: {"title": "Week 22", "baby": "Sense of touch developing. Baby can feel the umbilical cord.", "mom": "Stretch marks may appear. Belly button may pop out.", "size": "Papaya", "tip": "Moisturize belly to help with itching."},
    23: {"title": "Week 23", "baby": "Baby can hear your heartbeat and voice clearly.", "mom": "Braxton Hicks contractions may start (practice contractions).", "size": "Grapefruit", "tip": "Learn the difference between Braxton Hicks and real labor."},
    24: {"title": "Week 24 - Viability!", "baby": "Lungs developing. Baby is now viable outside womb with medical help.", "mom": "Glucose screening test usually done now.", "size": "Cantaloupe", "tip": "Take the glucose test to check for gestational diabetes."},
    25: {"title": "Week 25", "baby": "Baby responds to familiar voices. Hair growing.", "mom": "Hemorrhoids and constipation common. Heartburn may worsen.", "size": "Cauliflower", "tip": "Eat fiber-rich foods and stay hydrated."},
    26: {"title": "Week 26", "baby": "Eyes opening! Baby can see light filtering through.", "mom": "Trouble sleeping. Swelling in feet and ankles.", "size": "Lettuce head", "tip": "Use pillows for support while sleeping."},
    27: {"title": "Week 27", "baby": "Baby practicing breathing movements regularly.", "mom": "End of second trimester approaching. Possible leg cramps.", "size": "Rutabaga", "tip": "Stretch calves before bed."},
    28: {"title": "Week 28 - Third Trimester!", "baby": "Eyes can blink. Baby dreaming during REM sleep.", "mom": "Third trimester begins! More frequent prenatal visits.", "size": "Eggplant", "tip": "Start counting baby kicks daily."},
    29: {"title": "Week 29", "baby": "Muscles and lungs maturing. Baby very active.", "mom": "Shortness of breath as uterus presses on diaphragm.", "size": "Butternut squash", "tip": "Practice relaxation breathing techniques."},
    30: {"title": "Week 30", "baby": "Brain growing rapidly. Baby can regulate own temperature.", "mom": "Heartburn and indigestion common. Mood swings may return.", "size": "Cabbage", "tip": "Eat smaller meals more frequently."},
    31: {"title": "Week 31", "baby": "All five senses are working! Baby getting into position.", "mom": "Frequent urination increases. Trouble getting comfortable.", "size": "Coconut", "tip": "Do pelvic floor exercises (Kegels)."},
    32: {"title": "Week 32", "baby": "Fingernails and toenails fully formed.", "mom": "Braxton Hicks more frequent. Baby shower time!", "size": "Squash", "tip": "Pack your hospital bag."},
    33: {"title": "Week 33", "baby": "Bones hardening (except skull for birth). Less room to move.", "mom": "Waddling gait common. Back pain may increase.", "size": "Pineapple", "tip": "Prenatal massage can help with discomfort."},
    34: {"title": "Week 34", "baby": "Vernix coating thickening. Lungs almost mature.", "mom": "Fatigue returning. Nesting instinct may kick in.", "size": "Cantaloupe", "tip": "Prepare baby's nursery and supplies."},
    35: {"title": "Week 35", "baby": "Baby gaining about half a pound per week now.", "mom": "Pelvic pressure increasing. Baby may 'drop' soon.", "size": "Honeydew melon", "tip": "Review your birth plan with your doctor."},
    36: {"title": "Week 36", "baby": "Baby is considered early term. Most organs fully mature.", "mom": "More pelvic exams. Watch for labor signs.", "size": "Romaine lettuce", "tip": "Know the signs of labor."},
    37: {"title": "Week 37 - Full Term!", "baby": "Baby is full term! Ready for life outside.", "mom": "May lose mucus plug. More Braxton Hicks.", "size": "Winter melon", "tip": "Rest when you can!"},
    38: {"title": "Week 38", "baby": "Organs fully ready. Baby practicing sucking.", "mom": "Cervix may begin dilating. Increased discharge.", "size": "Leek", "tip": "Stay close to home and hospital."},
    39: {"title": "Week 39", "baby": "Brain still developing rapidly. Full-term and ready!", "mom": "May feel more emotional. Water could break anytime.", "size": "Watermelon", "tip": "Trust your body - it knows what to do."},
    40: {"title": "Week 40 - Due Date!", "baby": "Baby is fully developed and ready to meet you!", "mom": "Due date! Only 5% of babies arrive exactly on this day.", "size": "Small pumpkin", "tip": "Stay patient - baby will come when ready!"},
    41: {"title": "Week 41", "baby": "Still growing! May need induction discussion.", "mom": "Doctor will monitor closely. Induction may be discussed.", "size": "Pumpkin", "tip": "Try natural induction methods with doctor approval."},
    42: {"title": "Week 42", "baby": "Post-term. Induction usually recommended.", "mom": "Close monitoring essential. Birth likely imminent.", "size": "Pumpkin", "tip": "Trust your medical team."}
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

# ============ LIVE SESSIONS ============

LIVE_SESSIONS = [
    {
        "id": "period_health_101",
        "title": "Period Health 101",
        "description": "Understanding your menstrual cycle and managing period symptoms",
        "host": "Dr. Priya Sharma, Gynecologist",
        "duration": "45 minutes",
        "topics": ["Cycle phases", "PMS management", "When to see a doctor"],
        "type": "recorded"
    },
    {
        "id": "pcos_lifestyle",
        "title": "Living Well with PCOS",
        "description": "Diet, exercise, and lifestyle tips for managing PCOS",
        "host": "Dr. Neha Patel, Endocrinologist",
        "duration": "60 minutes",
        "topics": ["PCOS diet", "Exercise routines", "Hormonal balance"],
        "type": "recorded"
    },
    {
        "id": "pregnancy_nutrition",
        "title": "Nutrition During Pregnancy",
        "description": "What to eat and avoid for a healthy pregnancy",
        "host": "Dietitian Anjali Mehta",
        "duration": "50 minutes",
        "topics": ["Essential nutrients", "Foods to avoid", "Meal planning"],
        "type": "recorded"
    },
    {
        "id": "breastfeeding_basics",
        "title": "Breastfeeding Basics",
        "description": "Getting started with breastfeeding and overcoming challenges",
        "host": "Lactation Consultant Meera Joshi",
        "duration": "55 minutes",
        "topics": ["Latching techniques", "Common problems", "Pumping tips"],
        "type": "recorded"
    },
    {
        "id": "menopause_wellness",
        "title": "Thriving Through Menopause",
        "description": "Managing menopause symptoms and maintaining wellness",
        "host": "Dr. Sunita Rao, Women's Health Specialist",
        "duration": "50 minutes",
        "topics": ["Symptom management", "HRT options", "Bone health"],
        "type": "recorded"
    },
    {
        "id": "mental_wellness",
        "title": "Mental Health for Women",
        "description": "Addressing anxiety, depression, and emotional wellbeing",
        "host": "Psychologist Dr. Kavita Singh",
        "duration": "45 minutes",
        "topics": ["Stress management", "Self-care practices", "When to seek help"],
        "type": "recorded"
    }
]

# ============ EVARA SYSTEM MESSAGE FOR AI ============

EVARA_SYSTEM_MESSAGE = """You are Evara, a compassionate and knowledgeable women's health AI companion by Nevika Cura.

Your expertise covers:
- Menstrual health and period tracking
- PCOS and hormonal health management
- Pregnancy education and support
- Menopause and perimenopause care
- General women's wellness

Guidelines:
1. Be warm, supportive, and non-judgmental
2. Provide evidence-based health information
3. Always recommend consulting healthcare professionals for medical concerns
4. Never diagnose or prescribe medications
5. Be sensitive to cultural considerations
6. Respect privacy and confidentiality
7. Use simple, understandable language
8. Encourage healthy lifestyle choices

Remember: You're a supportive companion, not a replacement for medical care."""

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

# AI Chat initialization
from emergentintegrations.llm.chat import LlmChat, UserMessage

evara_chats = {}

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

# ============ AUTH HELPERS (imported from server) ============
# These will be injected when the router is included

async def get_current_user_optional(authorization: str = Header(None)):
    """Get current user if authenticated, else return None"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    import jwt
    JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
    
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

# SMS helper (simplified - actual implementation in server.py)
async def send_sms_notification(to_number: str, message: str):
    """Send SMS notification - delegated to server.py implementation"""
    # This is a stub - actual SMS sending happens in server.py
    logger.info(f"SMS to {to_number}: {message[:50]}...")
    return {"success": True}

# ============ EVARA ROUTES ============

@router.post("/onboarding")
async def evara_onboarding(data: EvaraOnboarding, user = Depends(get_current_user_optional)):
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
        profile = await db.evara_profiles.find_one({"user_id": user_id}, {"_id": 0})
    else:
        assigned_programs = assign_evara_programs(data.model_dump())
        profile = EvaraProfile(
            user_id=user_id,
            assigned_programs=assigned_programs,
            **data.model_dump()
        ).model_dump()
        profile["created_at"] = profile["created_at"].isoformat()
        profile["updated_at"] = profile["updated_at"].isoformat()
        await db.evara_profiles.insert_one(profile)
        if "_id" in profile:
            del profile["_id"]
    
    program_details = [
        {**EVARA_PROGRAMS[p], "id": p}
        for p in assigned_programs if p in EVARA_PROGRAMS
    ]
    
    return {
        "success": True,
        "profile": {k: v for k, v in profile.items() if k != "_id"},
        "assigned_programs": program_details,
        "message": "Welcome to Evara! Based on your profile, we've personalized your wellness journey."
    }

@router.get("/profile")
async def get_evara_profile(user = Depends(get_current_user_optional)):
    """Get user's Evara profile"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to access your Evara profile")
    
    profile = await db.evara_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        return {"has_profile": False, "message": "Please complete onboarding first"}
    
    program_details = [
        {**EVARA_PROGRAMS[p], "id": p}
        for p in profile.get("assigned_programs", []) if p in EVARA_PROGRAMS
    ]
    
    return {
        "has_profile": True,
        "profile": profile,
        "programs": program_details
    }

@router.get("/programs")
async def get_evara_programs():
    """Get all available Evara programs"""
    return {
        "programs": [
            {**v, "id": k} for k, v in EVARA_PROGRAMS.items()
        ]
    }

@router.get("/program/{program_id}/content")
async def get_program_content(program_id: str, user = Depends(get_current_user_optional)):
    """Get AI-generated content for a specific program"""
    if program_id not in EVARA_PROGRAMS:
        raise HTTPException(status_code=404, detail="Program not found")
    
    program = EVARA_PROGRAMS[program_id]
    
    try:
        chat = await get_evara_chat(f"content_{program_id}", "")
        prompt = f"""Generate helpful educational content for the "{program['name']}" program. 
        Include:
        1. Overview (2-3 sentences)
        2. Key tips (5 bullet points)
        3. Daily wellness suggestion
        4. A motivational message
        
        Keep it warm, supportive, and educational. Format as JSON with keys: overview, tips, daily_tip, motivation"""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        import json
        try:
            content = json.loads(response)
        except:
            content = {
                "overview": response[:200] if len(response) > 200 else response,
                "tips": ["Stay hydrated", "Get enough sleep", "Exercise regularly", "Eat nutritious food", "Practice self-care"],
                "daily_tip": "Take a moment today to appreciate your body and all it does for you.",
                "motivation": "Every step you take towards wellness is a step towards a healthier, happier you!"
            }
        
        return {
            "program": program,
            "content": content
        }
    except Exception as e:
        logger.error(f"Error generating content: {e}")
        return {
            "program": program,
            "content": {
                "overview": program["description"],
                "tips": program["features"],
                "daily_tip": "Take care of yourself today - you deserve it!",
                "motivation": "Your wellness journey is unique and beautiful. Keep going!"
            }
        }

@router.post("/chat")
async def evara_chat(data: EvaraChatMessage, user = Depends(get_current_user_optional)):
    """Chat with Evara AI wellness companion"""
    user_id = user["id"] if user else "guest"
    session_id = data.session_id or f"evara_{user_id}_{datetime.now().strftime('%Y%m%d')}"
    
    user_context = ""
    if user:
        profile = await db.evara_profiles.find_one({"user_id": user["id"]})
        if profile:
            user_context = f"Age: {profile.get('age')}, Pregnancy status: {profile.get('pregnancy_status')}, Menstrual status: {profile.get('menstrual_status')}"
    
    try:
        chat = await get_evara_chat(session_id, user_context)
        response = await chat.send_message(UserMessage(text=data.message))
        
        chat_record = {
            "user_id": user_id,
            "session_id": session_id,
            "user_message": data.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.evara_chats.insert_one(chat_record)
        
        return {
            "response": response,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Evara chat error: {e}")
        return {
            "response": "I'm here to help with your wellness journey. For personalized medical advice, please consult with a healthcare professional. How can I support you today?",
            "session_id": session_id,
            "error": True
        }

@router.get("/chat/history")
async def get_evara_chat_history(user = Depends(get_current_user_optional)):
    """Get user's chat history with Evara"""
    if not user:
        return {"history": []}
    
    history = await db.evara_chats.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("created_at", -1)]).limit(50).to_list(50)
    
    return {"history": history}

# ============ REMINDERS ============

@router.post("/reminders")
async def create_evara_reminder(data: EvaraReminderCreate, user = Depends(get_current_user_optional)):
    """Create a wellness reminder"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to set reminders")
    
    reminder = EvaraReminder(
        user_id=user["id"],
        **data.model_dump()
    ).model_dump()
    reminder["created_at"] = reminder["created_at"].isoformat()
    
    await db.evara_reminders.insert_one(reminder)
    if "_id" in reminder: del reminder["_id"]
    
    return {"success": True, "reminder": reminder}

@router.get("/reminders")
async def get_evara_reminders(user = Depends(get_current_user_optional)):
    """Get user's wellness reminders"""
    if not user:
        return {"reminders": []}
    
    reminders = await db.evara_reminders.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    return {"reminders": reminders}

@router.delete("/reminders/{reminder_id}")
async def delete_evara_reminder(reminder_id: str, user = Depends(get_current_user_optional)):
    """Delete a reminder"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login")
    
    result = await db.evara_reminders.delete_one({"id": reminder_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"success": True}

# ============ PERIOD TRACKING ============

@router.post("/period/log")
async def log_period(
    start_date: str,
    end_date: Optional[str] = None,
    flow: str = "medium",
    symptoms: Optional[List[str]] = None,
    notes: Optional[str] = None,
    user = Depends(get_current_user_optional)
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
async def get_period_history(user = Depends(get_current_user_optional)):
    """Get period tracking history"""
    if not user:
        return {"history": [], "predictions": None}
    
    history = await db.evara_period_logs.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("start_date", -1)]).limit(12).to_list(12)
    
    avg_cycle = 28
    if len(history) >= 2:
        cycles = []
        for i in range(len(history) - 1):
            start1 = datetime.strptime(history[i]["start_date"], "%Y-%m-%d")
            start2 = datetime.strptime(history[i+1]["start_date"], "%Y-%m-%d")
            cycles.append((start1 - start2).days)
        avg_cycle = sum(cycles) // len(cycles) if cycles else 28
    
    next_predicted = None
    if history:
        last_start = datetime.strptime(history[0]["start_date"], "%Y-%m-%d")
        next_predicted = (last_start + timedelta(days=avg_cycle)).strftime("%Y-%m-%d")
    
    return {
        "history": history,
        "average_cycle_length": avg_cycle,
        "next_predicted": next_predicted
    }

# ============ PREGNANCY ============

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
        "disclaimer": "These services are coordinated through our partner providers. Evara facilitates booking but does not directly provide medical services."
    }

@router.post("/home-services/request")
async def request_home_service(data: HomeServiceRequest, user = Depends(get_current_user_optional)):
    """Request a home service"""
    if data.service_type not in HOME_SERVICES:
        raise HTTPException(status_code=400, detail="Invalid service type")
    
    service = HOME_SERVICES[data.service_type]
    
    request_record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
        "service_type": data.service_type,
        "service_name": service["name"],
        "preferred_date": data.preferred_date,
        "preferred_time": data.preferred_time,
        "address": data.address,
        "phone": data.phone,
        "notes": data.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evara_service_requests.insert_one(request_record)
    
    try:
        message = f"""Evara - Home Service Request Received!

Service: {service['name']}
Date: {data.preferred_date}
Time: {data.preferred_time}

Our team will contact you within 24 hours to confirm.

- Evara by Nevika Cura
  Call: 9403890429"""
        await send_sms_notification(data.phone, message)
    except Exception as e:
        logger.error(f"Failed to send service request SMS: {e}")
    
    return {
        "success": True,
        "request_id": request_record["id"],
        "message": "Your service request has been received. Our team will contact you within 24 hours.",
        "service": service
    }

@router.get("/home-services/my-requests")
async def get_my_service_requests(user = Depends(get_current_user_optional)):
    """Get user's service requests"""
    if not user:
        return {"requests": []}
    
    requests = await db.evara_service_requests.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("created_at", -1)]).limit(20).to_list(20)
    
    return {"requests": requests}

# ============ COMMUNITY SESSIONS ============

@router.get("/community/sessions")
async def get_community_sessions():
    """Get available community sessions"""
    return {
        "sessions": LIVE_SESSIONS,
        "upcoming_live": {
            "title": "Monthly Q&A with Gynecologist",
            "description": "Submit your questions and get answers from our expert",
            "next_date": "Last Saturday of every month",
            "time": "11:00 AM IST"
        }
    }

@router.post("/community/register/{session_id}")
async def register_for_session(session_id: str, user = Depends(get_current_user_optional)):
    """Register for a community session"""
    session = next((s for s in LIVE_SESSIONS if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    registration = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
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

# ============ WHATSAPP REMINDERS ============

@router.post("/reminders/whatsapp")
async def set_whatsapp_reminder(
    reminder_type: str,
    phone: str,
    user = Depends(get_current_user_optional)
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
        "message": f"{reminder_type.replace('_', ' ').title()} reminders activated via SMS",
        "note": "WhatsApp reminders will be available once WhatsApp Business is configured."
    }
