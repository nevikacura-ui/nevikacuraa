"""
Health Risk Assessment Module
- Diabetes Risk Assessment (FINDRISC based)
- Heart Disease Risk Assessment
- Cancer Screening Eligibility
- Personalized recommendations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/health-assessment", tags=["Health Risk Assessment"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Models
class DiabetesRiskInput(BaseModel):
    age: int
    bmi: float
    waist_circumference: float  # cm
    physical_activity: bool  # At least 30 min daily
    daily_vegetables: bool  # Eat vegetables/fruits daily
    high_bp_medication: bool
    high_blood_glucose_history: bool
    family_diabetes: str  # none, parent_sibling, grandparent_uncle_aunt

class HeartRiskInput(BaseModel):
    age: int
    gender: str  # male, female
    total_cholesterol: Optional[float] = None
    hdl_cholesterol: Optional[float] = None
    systolic_bp: int
    on_bp_treatment: bool
    smoker: bool
    diabetic: bool

class CancerScreeningInput(BaseModel):
    age: int
    gender: str
    smoker: bool
    smoking_years: Optional[int] = 0
    family_cancer_history: List[str] = []  # breast, colon, lung, etc.
    alcohol_regular: bool

# ==================== DIABETES RISK (FINDRISC) ====================

@router.post("/diabetes-risk")
async def assess_diabetes_risk(user_id: str, data: DiabetesRiskInput):
    """
    Assess Type 2 Diabetes risk using FINDRISC questionnaire
    Score: 0-7 (Low), 7-11 (Slightly elevated), 12-14 (Moderate), 15-20 (High), >20 (Very High)
    """
    db = get_db()
    score = 0
    breakdown = []
    
    # Age scoring
    if data.age < 45:
        score += 0
        breakdown.append({"factor": "Age", "value": f"{data.age} years", "points": 0})
    elif data.age <= 54:
        score += 2
        breakdown.append({"factor": "Age", "value": f"{data.age} years", "points": 2})
    elif data.age <= 64:
        score += 3
        breakdown.append({"factor": "Age", "value": f"{data.age} years", "points": 3})
    else:
        score += 4
        breakdown.append({"factor": "Age", "value": f"{data.age} years", "points": 4})
    
    # BMI scoring
    if data.bmi < 25:
        score += 0
        breakdown.append({"factor": "BMI", "value": f"{data.bmi:.1f}", "points": 0})
    elif data.bmi <= 30:
        score += 1
        breakdown.append({"factor": "BMI", "value": f"{data.bmi:.1f} (Overweight)", "points": 1})
    else:
        score += 3
        breakdown.append({"factor": "BMI", "value": f"{data.bmi:.1f} (Obese)", "points": 3})
    
    # Waist circumference (gender-adjusted thresholds for Indians)
    # Using lower thresholds for South Asians
    waist_threshold_1 = 80  # cm (women) or 90 (men) - using average
    waist_threshold_2 = 88  # cm (women) or 102 (men) - using average
    
    if data.waist_circumference < waist_threshold_1:
        score += 0
        breakdown.append({"factor": "Waist Circumference", "value": f"{data.waist_circumference} cm", "points": 0})
    elif data.waist_circumference <= waist_threshold_2:
        score += 3
        breakdown.append({"factor": "Waist Circumference", "value": f"{data.waist_circumference} cm (Elevated)", "points": 3})
    else:
        score += 4
        breakdown.append({"factor": "Waist Circumference", "value": f"{data.waist_circumference} cm (High)", "points": 4})
    
    # Physical activity
    if data.physical_activity:
        score += 0
        breakdown.append({"factor": "Physical Activity", "value": "Active (30+ min/day)", "points": 0})
    else:
        score += 2
        breakdown.append({"factor": "Physical Activity", "value": "Inactive", "points": 2})
    
    # Vegetables/fruits
    if data.daily_vegetables:
        score += 0
        breakdown.append({"factor": "Diet", "value": "Eats vegetables daily", "points": 0})
    else:
        score += 1
        breakdown.append({"factor": "Diet", "value": "Low vegetable intake", "points": 1})
    
    # BP medication
    if data.high_bp_medication:
        score += 2
        breakdown.append({"factor": "BP Medication", "value": "Yes", "points": 2})
    else:
        score += 0
        breakdown.append({"factor": "BP Medication", "value": "No", "points": 0})
    
    # High blood glucose history
    if data.high_blood_glucose_history:
        score += 5
        breakdown.append({"factor": "High Glucose History", "value": "Yes", "points": 5})
    else:
        score += 0
        breakdown.append({"factor": "High Glucose History", "value": "No", "points": 0})
    
    # Family history
    if data.family_diabetes == "parent_sibling":
        score += 5
        breakdown.append({"factor": "Family History", "value": "Parent/Sibling with diabetes", "points": 5})
    elif data.family_diabetes == "grandparent_uncle_aunt":
        score += 3
        breakdown.append({"factor": "Family History", "value": "Grandparent/Uncle/Aunt", "points": 3})
    else:
        score += 0
        breakdown.append({"factor": "Family History", "value": "None", "points": 0})
    
    # Determine risk level
    if score < 7:
        risk_level = "Low"
        risk_color = "green"
        ten_year_risk = "1 in 100"
        message = "Your diabetes risk is low. Maintain a healthy lifestyle."
    elif score <= 11:
        risk_level = "Slightly Elevated"
        risk_color = "yellow"
        ten_year_risk = "1 in 25"
        message = "You have slightly elevated risk. Consider lifestyle modifications."
    elif score <= 14:
        risk_level = "Moderate"
        risk_color = "orange"
        ten_year_risk = "1 in 6"
        message = "Moderate risk detected. Please get a fasting blood sugar test."
    elif score <= 20:
        risk_level = "High"
        risk_color = "red"
        ten_year_risk = "1 in 3"
        message = "High risk! Schedule a diabetes screening test immediately."
    else:
        risk_level = "Very High"
        risk_color = "darkred"
        ten_year_risk = "1 in 2"
        message = "Very high risk! Urgent diabetes screening recommended."
    
    # Generate recommendations
    recommendations = []
    if not data.physical_activity:
        recommendations.append("Start with 30 minutes of walking daily")
    if not data.daily_vegetables:
        recommendations.append("Include vegetables and fruits in every meal")
    if data.bmi >= 25:
        recommendations.append("Work towards achieving healthy BMI (18.5-24.9)")
    if data.waist_circumference > 80:
        recommendations.append("Reduce waist circumference through exercise and diet")
    if score >= 12:
        recommendations.append("Get HbA1c and Fasting Blood Sugar test done")
        recommendations.append("Consult a diabetologist or endocrinologist")
    
    # Save assessment
    assessment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "diabetes_risk",
        "score": score,
        "max_score": 26,
        "risk_level": risk_level,
        "ten_year_risk": ten_year_risk,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.health_assessments.insert_one(assessment)
    
    return {
        "assessment_id": assessment["id"],
        "score": score,
        "max_score": 26,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "ten_year_risk": ten_year_risk,
        "message": message,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "next_steps": [
            {"action": "Book Diabetic Profile Test", "link": "/health-packages"},
            {"action": "Consult Endocrinologist", "link": "/teleconsult"}
        ] if score >= 12 else []
    }

# ==================== HEART DISEASE RISK ====================

@router.post("/heart-risk")
async def assess_heart_risk(user_id: str, data: HeartRiskInput):
    """
    Simplified heart disease risk assessment
    Based on major risk factors
    """
    db = get_db()
    
    risk_points = 0
    breakdown = []
    
    # Age risk
    if data.gender == "male":
        if data.age >= 45:
            risk_points += 1
            breakdown.append({"factor": "Age (Male 45+)", "risk": True})
    else:
        if data.age >= 55:
            risk_points += 1
            breakdown.append({"factor": "Age (Female 55+)", "risk": True})
    
    # Blood pressure
    if data.systolic_bp >= 140 or data.on_bp_treatment:
        risk_points += 1
        breakdown.append({"factor": "High Blood Pressure", "value": f"{data.systolic_bp} mmHg", "risk": True})
    else:
        breakdown.append({"factor": "Blood Pressure", "value": f"{data.systolic_bp} mmHg", "risk": False})
    
    # Cholesterol (if provided)
    if data.total_cholesterol and data.hdl_cholesterol:
        ratio = data.total_cholesterol / data.hdl_cholesterol
        if ratio > 5:
            risk_points += 1
            breakdown.append({"factor": "Cholesterol Ratio", "value": f"{ratio:.1f} (High)", "risk": True})
        else:
            breakdown.append({"factor": "Cholesterol Ratio", "value": f"{ratio:.1f}", "risk": False})
    
    # Smoking
    if data.smoker:
        risk_points += 2
        breakdown.append({"factor": "Smoking", "risk": True})
    
    # Diabetes
    if data.diabetic:
        risk_points += 1
        breakdown.append({"factor": "Diabetes", "risk": True})
    
    # Determine risk level
    if risk_points <= 1:
        risk_level = "Low"
        risk_color = "green"
        message = "Your heart disease risk is low. Keep up the healthy habits!"
    elif risk_points <= 2:
        risk_level = "Moderate"
        risk_color = "yellow"
        message = "Moderate risk. Consider lifestyle modifications and regular monitoring."
    elif risk_points <= 3:
        risk_level = "High"
        risk_color = "orange"
        message = "High risk! Please consult a cardiologist and get a cardiac checkup."
    else:
        risk_level = "Very High"
        risk_color = "red"
        message = "Very high risk! Urgent cardiac evaluation recommended."
    
    # Recommendations
    recommendations = []
    if data.smoker:
        recommendations.append("Quit smoking - this alone can reduce risk by 50%")
    if data.systolic_bp >= 140:
        recommendations.append("Monitor blood pressure daily and consult doctor")
    if data.diabetic:
        recommendations.append("Keep blood sugar well controlled")
    recommendations.append("Exercise for 30 minutes, 5 days a week")
    recommendations.append("Follow a heart-healthy diet (low salt, low fat)")
    
    if risk_points >= 2:
        recommendations.append("Get a Cardiac Health Package done")
    
    # Save assessment
    assessment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "heart_risk",
        "risk_points": risk_points,
        "risk_level": risk_level,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.health_assessments.insert_one(assessment)
    
    return {
        "assessment_id": assessment["id"],
        "risk_points": risk_points,
        "max_points": 6,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "message": message,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "next_steps": [
            {"action": "Book Cardiac Health Package", "link": "/health-packages"},
            {"action": "Consult Cardiologist", "link": "/teleconsult"}
        ] if risk_points >= 2 else []
    }

# ==================== CANCER SCREENING ELIGIBILITY ====================

@router.post("/cancer-screening")
async def assess_cancer_screening(user_id: str, data: CancerScreeningInput):
    """
    Determine cancer screening eligibility based on age, gender, and risk factors
    """
    db = get_db()
    
    screenings = []
    
    # Breast Cancer Screening (Women)
    if data.gender == "female":
        if data.age >= 40:
            screenings.append({
                "type": "Breast Cancer",
                "test": "Mammography",
                "frequency": "Every 1-2 years",
                "urgency": "high" if "breast" in data.family_cancer_history else "normal",
                "note": "Family history increases risk" if "breast" in data.family_cancer_history else None
            })
        if data.age >= 21:
            screenings.append({
                "type": "Cervical Cancer",
                "test": "Pap Smear + HPV Test",
                "frequency": "Every 3 years (21-29), Every 5 years (30-65)",
                "urgency": "normal"
            })
    
    # Colon Cancer Screening (Both genders)
    if data.age >= 45:
        screenings.append({
            "type": "Colorectal Cancer",
            "test": "Colonoscopy or Stool Test",
            "frequency": "Colonoscopy every 10 years or Stool test yearly",
            "urgency": "high" if "colon" in data.family_cancer_history else "normal",
            "note": "Family history - start screening earlier" if "colon" in data.family_cancer_history else None
        })
    
    # Lung Cancer Screening
    if data.smoker and data.smoking_years and data.smoking_years >= 20 and data.age >= 50:
        screenings.append({
            "type": "Lung Cancer",
            "test": "Low-dose CT Scan",
            "frequency": "Yearly",
            "urgency": "high",
            "note": "Heavy smoking history - annual screening recommended"
        })
    
    # Prostate Cancer (Men)
    if data.gender == "male" and data.age >= 50:
        screenings.append({
            "type": "Prostate Cancer",
            "test": "PSA Blood Test + Digital Rectal Exam",
            "frequency": "Discuss with doctor",
            "urgency": "normal"
        })
    
    # Oral Cancer (High risk in India)
    if data.smoker or data.alcohol_regular:
        screenings.append({
            "type": "Oral Cancer",
            "test": "Oral Examination",
            "frequency": "Yearly",
            "urgency": "normal" if not data.smoker else "high",
            "note": "Tobacco/alcohol use increases oral cancer risk"
        })
    
    # General recommendations
    recommendations = [
        "Get regular health checkups annually",
        "Report any unusual symptoms to your doctor",
        "Maintain a healthy lifestyle to reduce cancer risk"
    ]
    
    if data.smoker:
        recommendations.insert(0, "Quit smoking to significantly reduce cancer risk")
    if data.alcohol_regular:
        recommendations.append("Limit alcohol consumption")
    
    # Save assessment
    assessment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "cancer_screening",
        "screenings_recommended": len(screenings),
        "screenings": screenings,
        "recommendations": recommendations,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.health_assessments.insert_one(assessment)
    
    return {
        "assessment_id": assessment["id"],
        "screenings_recommended": len(screenings),
        "screenings": screenings,
        "recommendations": recommendations,
        "message": f"Based on your profile, {len(screenings)} cancer screenings are recommended.",
        "next_steps": [
            {"action": "Book Health Checkup Package", "link": "/health-packages"}
        ] if screenings else []
    }

# ==================== GET PAST ASSESSMENTS ====================

@router.get("/history/{user_id}")
async def get_assessment_history(user_id: str, assessment_type: Optional[str] = None):
    """Get user's past health assessments"""
    db = get_db()
    
    query = {"user_id": user_id}
    if assessment_type:
        query["type"] = assessment_type
    
    assessments = await db.health_assessments.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"assessments": assessments}
