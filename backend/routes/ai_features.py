"""
AI-Powered Healthcare Features - Backend Routes
Phase 2 Enhancement Features using LLM Integration
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from utils.sanitize import sanitize_ai_input
import jwt
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/ai", tags=["AI Healthcare Features"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_here')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Database reference
db = None

def set_db(database):
    global db
    db = database

async def get_patient_from_token(authorization: str = Header(None)):
    """Extract patient info from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Smart Schedule Optimizer (#7) ============
class ScheduleRequest(BaseModel):
    doctor_id: Optional[str] = None
    clinic: Optional[str] = None
    preferred_date: Optional[str] = None
    appointment_type: Optional[str] = "consultation"

@router.post("/schedule-optimizer")
async def optimize_schedule(request: ScheduleRequest, patient = Depends(get_patient_from_token)):
    """AI-powered appointment slot recommendations"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    # Get patient history for context
    patient_history = []
    if db is not None:
        patient_data = await db.patients.find_one({"phone": patient_phone})
        if patient_data:
            # Get past appointments
            appointments = await db.appointments.find({
                "patient_phone": patient_phone
            }).sort("date", -1).limit(5).to_list(5)
            patient_history = [
                {"date": a.get("date"), "time": a.get("time"), "type": a.get("appointment_type")}
                for a in appointments
            ]
    
    # Generate AI recommendations
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"schedule-{patient_phone}-{datetime.now().timestamp()}",
            system_message="""You are a healthcare scheduling assistant. Analyze patient preferences and history to suggest optimal appointment times. 
            Consider: morning vs afternoon preferences based on history, avoiding rush hours, spacing follow-ups appropriately.
            Always respond with JSON format containing 'recommendations' array with objects having 'date', 'time', 'reason' fields."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Based on patient appointment history and preferences, suggest 3 optimal appointment slots.

Patient History: {json.dumps(patient_history) if patient_history else 'No previous appointments'}
Preferred Date: {request.preferred_date or 'Flexible'}
Appointment Type: {request.appointment_type}
Clinic: {request.clinic or 'Any'}

Consider typical clinic hours (9 AM - 6 PM), avoid peak times (10-11 AM, 4-5 PM).
Return exactly 3 recommended slots in JSON format."""

        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse AI response
        try:
            # Extract JSON from response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            else:
                json_str = response
            
            ai_result = json.loads(json_str)
            recommendations = ai_result.get("recommendations", [])
        except:
            # Fallback recommendations
            base_date = request.preferred_date or datetime.now().strftime("%Y-%m-%d")
            recommendations = [
                {"date": base_date, "time": "10:00 AM", "reason": "Low wait time expected"},
                {"date": base_date, "time": "2:30 PM", "reason": "Post-lunch slot, typically less crowded"},
                {"date": base_date, "time": "4:00 PM", "reason": "Good for working professionals"}
            ]
        
        return {
            "success": True,
            "recommendations": recommendations,
            "ai_powered": True,
            "disclaimer": "These are AI-suggested times based on historical patterns. Actual availability may vary."
        }
        
    except Exception as e:
        # Fallback without AI
        base_date = request.preferred_date or datetime.now().strftime("%Y-%m-%d")
        return {
            "success": True,
            "recommendations": [
                {"date": base_date, "time": "10:00 AM", "reason": "Morning slot - typically lower wait times"},
                {"date": base_date, "time": "2:30 PM", "reason": "Post-lunch slot"},
                {"date": base_date, "time": "4:00 PM", "reason": "Late afternoon slot"}
            ],
            "ai_powered": False,
            "disclaimer": "Standard time recommendations. AI optimization unavailable."
        }

# ============ Predictive Health Insights (#8) ============
class HealthDataRequest(BaseModel):
    include_vitals: bool = True
    include_lab_results: bool = True
    include_medications: bool = True

@router.post("/health-insights")
async def get_health_insights(request: HealthDataRequest, patient = Depends(get_patient_from_token)):
    """AI-powered health risk predictions and insights"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    # Gather patient health data
    health_data = {
        "vitals": [],
        "lab_results": [],
        "medications": [],
        "conditions": [],
        "age": None,
        "gender": None
    }
    
    if db is not None:
        patient_data = await db.patients.find_one({"phone": patient_phone})
        if patient_data:
            health_data["age"] = patient_data.get("age")
            health_data["gender"] = patient_data.get("gender")
            health_data["conditions"] = patient_data.get("conditions", [])
            
            # Get recent vitals
            vitals = await db.vitals.find({"patient_phone": patient_phone}).sort("date", -1).limit(5).to_list(5)
            health_data["vitals"] = [
                {"date": v.get("date"), "bp": v.get("blood_pressure"), "sugar": v.get("blood_sugar"), "weight": v.get("weight")}
                for v in vitals
            ]
            
            # Get recent lab results
            lab_results = await db.lab_tests.find({"patient_phone": patient_phone, "status": "completed"}).sort("date", -1).limit(5).to_list(5)
            health_data["lab_results"] = [
                {"test": l.get("test_name"), "result": l.get("result"), "date": l.get("date")}
                for l in lab_results
            ]
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights-{patient_phone}-{datetime.now().timestamp()}",
            system_message="""You are a healthcare analytics AI assistant. Analyze patient health data and provide:
            1. Risk assessments (low/medium/high) for common conditions
            2. Actionable health recommendations
            3. Areas needing attention
            
            Be supportive and educational. Always include disclaimer about consulting healthcare providers.
            Respond in JSON with 'risk_factors', 'recommendations', 'areas_of_concern', 'positive_trends' fields."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Analyze this patient's health data and provide insights:

Patient Profile:
- Age: {health_data['age'] or 'Unknown'}
- Gender: {health_data['gender'] or 'Unknown'}
- Known Conditions: {', '.join(health_data['conditions']) if health_data['conditions'] else 'None recorded'}

Recent Vitals: {json.dumps(health_data['vitals']) if health_data['vitals'] else 'No recent vitals'}

Recent Lab Results: {json.dumps(health_data['lab_results']) if health_data['lab_results'] else 'No recent labs'}

Provide health insights in JSON format with risk_factors, recommendations, areas_of_concern, and positive_trends."""

        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse AI response
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            else:
                json_str = response
            insights = json.loads(json_str)
        except:
            insights = {
                "risk_factors": [
                    {"condition": "General Health", "risk": "low", "description": "Maintain regular checkups"}
                ],
                "recommendations": [
                    "Schedule regular health checkups",
                    "Maintain a balanced diet",
                    "Exercise for 30 minutes daily"
                ],
                "areas_of_concern": [],
                "positive_trends": ["Engaged with health tracking"]
            }
        
        return {
            "success": True,
            "insights": insights,
            "ai_powered": True,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "disclaimer": "These insights are AI-generated for informational purposes only. Always consult your healthcare provider for medical decisions."
        }
        
    except Exception as e:
        return {
            "success": True,
            "insights": {
                "risk_factors": [{"condition": "General Health", "risk": "low", "description": "Regular monitoring recommended"}],
                "recommendations": ["Schedule regular checkups", "Track your vitals", "Stay active"],
                "areas_of_concern": [],
                "positive_trends": ["Using health tracking tools"]
            },
            "ai_powered": False,
            "disclaimer": "Standard health recommendations. AI insights unavailable."
        }

# ============ AI Appointment Suggestions (#9) ============
class SymptomInput(BaseModel):
    symptoms: List[str]
    duration: Optional[str] = None
    severity: Optional[str] = "moderate"

@router.post("/appointment-suggestions")
async def get_appointment_suggestions(request: SymptomInput, patient = Depends(get_patient_from_token)):
    """AI-powered specialist recommendations based on symptoms"""
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"suggestions-{datetime.now().timestamp()}",
            system_message="""You are a healthcare triage assistant. Based on symptoms, suggest:
            1. Most appropriate specialist type
            2. Urgency level (routine/soon/urgent/emergency)
            3. Brief explanation
            
            Available specialists at Nevika Cura:
            - General Physician (Dr. Vikas Jha)
            - Diabetologist (Dr. Vikas Jha)
            - OBGYN (Dr. Neha Patel)
            - Pediatrician
            - Dermatologist
            
            Always recommend emergency services for life-threatening symptoms.
            Respond in JSON with 'specialist', 'urgency', 'reason', 'recommended_tests' fields."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Based on these symptoms, suggest the most appropriate specialist and urgency:

Symptoms: {', '.join(sanitize_ai_input(s) for s in request.symptoms)}
Duration: {sanitize_ai_input(request.duration or 'Not specified')}
Severity: {sanitize_ai_input(request.severity)}

Provide recommendation in JSON format."""

        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            else:
                json_str = response
            suggestion = json.loads(json_str)
        except:
            suggestion = {
                "specialist": "General Physician",
                "urgency": "routine",
                "reason": "General consultation recommended for symptom evaluation",
                "recommended_tests": []
            }
        
        # Add available doctor info
        doctors = {
            "General Physician": {"name": "Dr. Vikas Jha", "clinic": "Pushpa Clinic"},
            "Diabetologist": {"name": "Dr. Vikas Jha", "clinic": "Pushpa Clinic"},
            "OBGYN": {"name": "Dr. Neha Patel", "clinic": "Amnion Clinic"}
        }
        
        specialist_type = suggestion.get("specialist", "General Physician")
        if specialist_type in doctors:
            suggestion["doctor"] = doctors[specialist_type]
        
        return {
            "success": True,
            "suggestion": suggestion,
            "ai_powered": True,
            "disclaimer": "This is an AI-assisted suggestion. For emergencies, call 102 immediately. Always seek professional medical advice."
        }
        
    except Exception as e:
        return {
            "success": True,
            "suggestion": {
                "specialist": "General Physician",
                "urgency": "routine",
                "reason": "General consultation recommended",
                "doctor": {"name": "Dr. Vikas Jha", "clinic": "Pushpa Clinic"}
            },
            "ai_powered": False,
            "disclaimer": "Standard recommendation. AI suggestions unavailable."
        }

# ============ Automated Health Reports (#10) ============
@router.get("/health-report")
async def generate_health_report(patient = Depends(get_patient_from_token)):
    """Generate AI-powered comprehensive health report"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    # Gather all patient data
    report_data = {
        "patient": {},
        "appointments": [],
        "prescriptions": [],
        "lab_tests": [],
        "vitals": []
    }
    
    if db is not None:
        patient_data = await db.patients.find_one({"phone": patient_phone}, {"_id": 0})
        if patient_data:
            report_data["patient"] = {
                "name": patient_data.get("name"),
                "age": patient_data.get("age"),
                "gender": patient_data.get("gender"),
                "blood_group": patient_data.get("blood_group")
            }
        
        # Get appointments from last 6 months
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")
        appointments = await db.appointments.find({
            "patient_phone": patient_phone,
            "date": {"$gte": six_months_ago}
        }).to_list(20)
        report_data["appointments"] = [
            {"date": a.get("date"), "doctor": a.get("doctor"), "reason": a.get("reason")}
            for a in appointments
        ]
        
        # Get prescriptions
        prescriptions = await db.prescriptions.find({
            "patient_phone": patient_phone
        }).sort("date", -1).limit(10).to_list(10)
        report_data["prescriptions"] = [
            {"date": p.get("date"), "medicines": p.get("medicines", [])}
            for p in prescriptions
        ]
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"report-{patient_phone}-{datetime.now().timestamp()}",
            system_message="""You are a healthcare report generator. Create a comprehensive, patient-friendly health summary.
            Include: overview, key health metrics, visit history summary, medication summary, and actionable recommendations.
            Use clear, non-technical language. Be encouraging and supportive.
            Respond in JSON with 'summary', 'health_overview', 'visit_summary', 'medication_summary', 'recommendations', 'next_steps' fields."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Generate a comprehensive health report for this patient:

Patient Info: {json.dumps(report_data['patient'])}

Recent Appointments (last 6 months): {json.dumps(report_data['appointments']) if report_data['appointments'] else 'None'}

Current/Recent Prescriptions: {json.dumps(report_data['prescriptions']) if report_data['prescriptions'] else 'None'}

Create a friendly, comprehensive health report in JSON format."""

        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            else:
                json_str = response
            report = json.loads(json_str)
        except:
            report = {
                "summary": "Your health report is being prepared.",
                "health_overview": "Regular health monitoring is key to wellness.",
                "visit_summary": f"{len(report_data['appointments'])} visits in the last 6 months",
                "medication_summary": "Review your prescriptions with your doctor",
                "recommendations": ["Schedule regular checkups", "Maintain medication adherence"],
                "next_steps": ["Book your next appointment", "Update your health profile"]
            }
        
        return {
            "success": True,
            "report": report,
            "patient_info": report_data["patient"],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "ai_powered": True,
            "disclaimer": "This report is AI-generated for informational purposes. Consult your healthcare provider for medical decisions."
        }
        
    except Exception as e:
        return {
            "success": True,
            "report": {
                "summary": "Health report summary",
                "health_overview": "Continue your health journey with regular checkups",
                "recommendations": ["Stay active", "Eat healthy", "Get regular checkups"]
            },
            "patient_info": report_data["patient"],
            "ai_powered": False,
            "disclaimer": "Standard report. AI generation unavailable."
        }


# ===== POST-VISIT CARE RECOMMENDATIONS =====

POST_VISIT_TIPS = {
    "consultation": [
        {"title": "Follow Prescription", "desc": "Take all medicines as prescribed. Don't skip doses even if you feel better."},
        {"title": "Stay Hydrated", "desc": "Drink plenty of water and fluids throughout the day."},
        {"title": "Watch for Symptoms", "desc": "If symptoms worsen or new ones appear, contact the clinic immediately."},
        {"title": "Schedule Follow-up", "desc": "Book your follow-up visit as recommended by your doctor."},
    ],
    "gynecology": [
        {"title": "Rest & Recovery", "desc": "Take adequate rest. Avoid heavy physical activity for the recommended period."},
        {"title": "Medication Adherence", "desc": "Continue prescribed supplements and medications on schedule."},
        {"title": "Dietary Guidelines", "desc": "Follow the dietary recommendations. Include iron-rich foods and calcium."},
        {"title": "Follow-up Visit", "desc": "Schedule your next visit for test results and progress review."},
    ],
    "online": [
        {"title": "Download Prescription", "desc": "Your e-prescription has been shared. Download it from your profile."},
        {"title": "Order Medicines", "desc": "Use Orange Pharmacy to order prescribed medicines with doorstep delivery."},
        {"title": "Monitor Progress", "desc": "Track your symptoms and share updates during your next consultation."},
        {"title": "Reach Out Anytime", "desc": "Message the clinic on WhatsApp if you have any concerns before your next visit."},
    ],
    "default": [
        {"title": "Follow Doctor's Advice", "desc": "Adhere to the treatment plan discussed during your visit."},
        {"title": "Take Medicines on Time", "desc": "Set reminders to take your medications as prescribed."},
        {"title": "Healthy Lifestyle", "desc": "Maintain a balanced diet, adequate sleep, and light exercise."},
        {"title": "Next Appointment", "desc": "Book your follow-up when recommended by the doctor."},
    ],
}

@router.get("/post-visit-care")
async def get_post_visit_care(consultation_type: str = "default"):
    """Get post-visit care recommendations based on consultation type"""
    tips = POST_VISIT_TIPS.get(consultation_type, POST_VISIT_TIPS["default"])
    return {"success": True, "tips": tips, "consultation_type": consultation_type}

@router.get("/post-visit-care/{appointment_id}")
async def get_post_visit_care_for_appointment(appointment_id: str):
    """Get post-visit care for a specific appointment"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    from bson import ObjectId
    try:
        apt = await db.appointments.find_one(
            {"_id": ObjectId(appointment_id)},
            {"_id": 0, "consultation_type": 1, "doctor_name": 1, "status": 1, "date": 1}
        )
    except:
        apt = None
    
    c_type = "default"
    if apt:
        ct = (apt.get("consultation_type") or "").lower()
        if "gyn" in ct: c_type = "gynecology"
        elif "online" in ct: c_type = "online"
        elif "consult" in ct: c_type = "consultation"
    
    tips = POST_VISIT_TIPS.get(c_type, POST_VISIT_TIPS["default"])
    return {"success": True, "tips": tips, "appointment": apt}


def setup_routes(database):
    """Setup routes with database"""
    global db
    db = database
    return router
