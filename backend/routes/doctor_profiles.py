"""
Doctor Profiles & Ratings Module
- Doctor qualifications, specializations
- Patient reviews and ratings
- Search and filter doctors
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/doctors", tags=["Doctor Profiles"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Doctor Profiles (can be moved to DB later)
DOCTOR_PROFILES = [
    {
        "id": "dr-neha-patel",
        "name": "Dr. Neha Patel",
        "slug": "dr-neha-patel",
        "specialization": "Obstetrics & Gynecology",
        "qualification": "MBBS, MS (OBG), DNB",
        "experience_years": 15,
        "clinic": "DiaGyn Healthcare - Pushpa Clinic",
        "clinic_address": "Kalyan West, Mumbai",
        "consultation_fee": 500,
        "about": "Dr. Neha Patel is a senior consultant in Obstetrics & Gynecology with over 15 years of experience. She specializes in high-risk pregnancies, infertility treatments, and laparoscopic surgeries.",
        "specialties": ["High-Risk Pregnancy", "Infertility", "Laparoscopic Surgery", "PCOS Management"],
        "education": [
            {"degree": "MBBS", "institution": "Grant Medical College, Mumbai", "year": 2005},
            {"degree": "MS (OBG)", "institution": "KEM Hospital, Mumbai", "year": 2009},
            {"degree": "DNB", "institution": "National Board of Examinations", "year": 2010}
        ],
        "languages": ["English", "Hindi", "Marathi"],
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "timings": "11:00 AM - 2:00 PM, 6:00 PM - 9:00 PM",
        "rating": 4.8,
        "total_reviews": 156,
        "patients_treated": 5000,
        "image_url": None,
        "featured": True
    },
    {
        "id": "dr-vikas-jha",
        "name": "Dr. Vikas Jha",
        "slug": "dr-vikas-jha",
        "specialization": "Obstetrics & Gynecology",
        "qualification": "MBBS, DGO, FICOG",
        "experience_years": 12,
        "clinic": "DiaGyn Healthcare - Amnion Clinic",
        "clinic_address": "Dombivli East, Mumbai",
        "consultation_fee": 400,
        "about": "Dr. Vikas Jha is an experienced gynecologist specializing in normal and cesarean deliveries, menstrual disorders, and preventive women's healthcare.",
        "specialties": ["Normal Delivery", "C-Section", "Menstrual Disorders", "Contraception Counseling"],
        "education": [
            {"degree": "MBBS", "institution": "Mumbai University", "year": 2008},
            {"degree": "DGO", "institution": "JJ Hospital, Mumbai", "year": 2012},
            {"degree": "FICOG", "institution": "FOGSI", "year": 2015}
        ],
        "languages": ["English", "Hindi", "Gujarati"],
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "timings": "10:00 AM - 1:00 PM, 5:00 PM - 8:00 PM",
        "rating": 4.6,
        "total_reviews": 98,
        "patients_treated": 3500,
        "image_url": None,
        "featured": True
    }
]

# Models
class ReviewInput(BaseModel):
    doctor_id: str
    user_id: str
    rating: int  # 1-5
    title: Optional[str] = None
    comment: Optional[str] = None
    visit_type: Optional[str] = None  # consultation, delivery, surgery, etc.

# ==================== ENDPOINTS ====================

@router.get("/all")
async def get_all_doctors(
    specialization: Optional[str] = None,
    clinic: Optional[str] = None,
    min_rating: Optional[float] = None
):
    """Get all doctors with optional filters"""
    doctors = DOCTOR_PROFILES
    
    if specialization:
        doctors = [d for d in doctors if specialization.lower() in d["specialization"].lower()]
    
    if clinic:
        doctors = [d for d in doctors if clinic.lower() in d["clinic"].lower()]
    
    if min_rating:
        doctors = [d for d in doctors if d["rating"] >= min_rating]
    
    # Return summary view
    return {
        "doctors": [{
            "id": d["id"],
            "name": d["name"],
            "specialization": d["specialization"],
            "qualification": d["qualification"],
            "experience_years": d["experience_years"],
            "clinic": d["clinic"],
            "consultation_fee": d["consultation_fee"],
            "rating": d["rating"],
            "total_reviews": d["total_reviews"],
            "featured": d.get("featured", False)
        } for d in doctors]
    }

@router.get("/featured")
async def get_featured_doctors():
    """Get featured doctors for homepage"""
    featured = [d for d in DOCTOR_PROFILES if d.get("featured")]
    return {"doctors": featured}

@router.get("/availability")
async def get_weekly_availability(days: int = 7):
    """Get weekly doctor availability for next N days"""
    from datetime import timedelta
    
    # Doctor schedules - matching clinic hours
    DOCTOR_SCHEDULES = {
        "Dr. Neha Patel": {
            "pushpa": [
                {"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "time": "11:00-14:00", "session": "morning"},
                {"days": ["Tuesday", "Thursday", "Saturday"], "time": "18:00-22:00", "session": "evening"}
            ],
            "amnion": [
                {"days": ["Monday", "Wednesday", "Friday"], "time": "18:00-22:00", "session": "evening"}
            ]
        },
        "Dr. Vikas Jha": {
            "pushpa": [
                {"days": ["Monday", "Wednesday", "Friday"], "time": "18:00-22:00", "session": "evening"}
            ],
            "amnion": [
                {"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "time": "11:00-14:00", "session": "morning"},
                {"days": ["Tuesday", "Thursday", "Saturday"], "time": "18:00-22:00", "session": "evening"}
            ]
        }
    }
    
    availability = []
    today = datetime.now(timezone.utc)
    
    for i in range(days):
        date = today + timedelta(days=i)
        day_name = date.strftime("%A")
        date_str = date.strftime("%Y-%m-%d")
        
        day_availability = {
            "date": date_str,
            "day": day_name,
            "doctors": []
        }
        
        for doctor_name, clinics in DOCTOR_SCHEDULES.items():
            doctor_info = {
                "name": doctor_name,
                "clinics": []
            }
            
            for clinic_id, schedules in clinics.items():
                clinic_name = "Pushpa Clinic" if clinic_id == "pushpa" else "Amnion Clinic"
                sessions = []
                
                for schedule in schedules:
                    if day_name in schedule["days"]:
                        sessions.append({
                            "session": schedule["session"],
                            "time": schedule["time"]
                        })
                
                if sessions:
                    doctor_info["clinics"].append({
                        "id": clinic_id,
                        "name": clinic_name,
                        "sessions": sessions
                    })
            
            if doctor_info["clinics"]:
                day_availability["doctors"].append(doctor_info)
        
        availability.append(day_availability)
    
    return {"availability": availability}

@router.get("/{doctor_id}")
async def get_doctor_profile(doctor_id: str):
    """Get detailed doctor profile"""
    db = get_db()
    
    doctor = next((d for d in DOCTOR_PROFILES if d["id"] == doctor_id), None)
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Get recent reviews from DB
    reviews = await db.doctor_reviews.find(
        {"doctor_id": doctor_id, "status": "approved"},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    doctor["recent_reviews"] = reviews
    
    return doctor

@router.post("/review")
async def add_review(review: ReviewInput):
    """Add a review for a doctor"""
    db = get_db()
    
    # Validate rating
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if doctor exists
    doctor = next((d for d in DOCTOR_PROFILES if d["id"] == review.doctor_id), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check if user has already reviewed this doctor
    existing = await db.doctor_reviews.find_one({
        "doctor_id": review.doctor_id,
        "user_id": review.user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this doctor")
    
    # Get user name
    user = await db.users.find_one({"id": review.user_id}, {"_id": 0, "name": 1})
    user_name = user.get("name", "Anonymous") if user else "Anonymous"
    
    # Anonymize name
    if len(user_name) > 2:
        parts = user_name.split()
        anon_parts = [f"{p[0]}{'*' * (len(p)-2)}{p[-1]}" if len(p) > 2 else p for p in parts]
        user_name = " ".join(anon_parts)
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "doctor_id": review.doctor_id,
        "user_id": review.user_id,
        "user_name": user_name,
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "visit_type": review.visit_type,
        "status": "approved",  # In production, might need moderation
        "helpful_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.doctor_reviews.insert_one(review_doc)
    
    # Update doctor's average rating (in real app, this would recalculate)
    
    return {"message": "Review submitted successfully!", "review_id": review_doc["id"]}

@router.get("/reviews/{doctor_id}")
async def get_doctor_reviews(doctor_id: str, page: int = 1, limit: int = 10):
    """Get all reviews for a doctor"""
    db = get_db()
    
    skip = (page - 1) * limit
    
    reviews = await db.doctor_reviews.find(
        {"doctor_id": doctor_id, "status": "approved"},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.doctor_reviews.count_documents({
        "doctor_id": doctor_id,
        "status": "approved"
    })
    
    # Calculate rating distribution
    pipeline = [
        {"$match": {"doctor_id": doctor_id, "status": "approved"}},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
    ]
    rating_dist_raw = await db.doctor_reviews.aggregate(pipeline).to_list(5)
    rating_distribution = {str(i): 0 for i in range(1, 6)}
    for item in rating_dist_raw:
        rating_distribution[str(item["_id"])] = item["count"]
    
    return {
        "reviews": reviews,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "rating_distribution": rating_distribution
    }

@router.post("/reviews/{review_id}/helpful")
async def mark_review_helpful(review_id: str, user_id: str):
    """Mark a review as helpful"""
    db = get_db()
    
    # Check if already marked
    existing = await db.review_helpful.find_one({
        "review_id": review_id,
        "user_id": user_id
    })
    
    if existing:
        return {"message": "Already marked as helpful"}
    
    await db.review_helpful.insert_one({
        "review_id": review_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.doctor_reviews.update_one(
        {"id": review_id},
        {"$inc": {"helpful_count": 1}}
    )
    
    return {"message": "Marked as helpful"}

@router.get("/search")
async def search_doctors(query: str, limit: int = 10):
    """Search doctors by name, specialization, or clinic"""
    query_lower = query.lower()
    
    results = []
    for doctor in DOCTOR_PROFILES:
        score = 0
        if query_lower in doctor["name"].lower():
            score += 3
        if query_lower in doctor["specialization"].lower():
            score += 2
        if query_lower in doctor["clinic"].lower():
            score += 1
        if any(query_lower in s.lower() for s in doctor.get("specialties", [])):
            score += 2
        
        if score > 0:
            results.append({**doctor, "_score": score})
    
    # Sort by score
    results.sort(key=lambda x: x["_score"], reverse=True)
    
    # Remove score and limit
    for r in results:
        del r["_score"]
    
    return {"doctors": results[:limit], "total": len(results)}
