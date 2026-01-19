"""
Patient Registration System
- Auto-generate unique Patient ID (NC-YYYY-XXXXX)
- Basic details: Name, Mobile, Age, Gender
- Staff registration (Walk-in & Emergency)
- Lookup by mobile number
- Patient history (appointments, pharmacy, diagnostics)
- Patient portal access
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import jwt

router = APIRouter(prefix="/patients", tags=["Patients"])

# Will be set by server.py
db = None
JWT_SECRET = None

def set_db(database):
    global db
    db = database

def set_jwt_config(secret):
    global JWT_SECRET
    JWT_SECRET = secret


# ============================================
# MODELS
# ============================================

class PatientRegistration(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    mobile: str = Field(..., min_length=10, max_length=15)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
    registered_by: Optional[str] = None  # Staff ID who registered
    registration_type: Optional[str] = "walk-in"  # walk-in, emergency, online

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[List[str]] = None
    existing_conditions: Optional[List[str]] = None

class PatientResponse(BaseModel):
    patient_id: str
    name: str
    mobile: str
    age: Optional[int] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    registered_at: str
    registration_type: str
    total_visits: int = 0


# ============================================
# HELPER FUNCTIONS
# ============================================

async def generate_patient_id() -> str:
    """Generate unique patient ID in format NC-YYYY-XXXXX"""
    year = datetime.now().year
    
    # Get the last patient ID for this year
    last_patient = await db.patients.find_one(
        {"patient_id": {"$regex": f"^NC-{year}-"}},
        sort=[("patient_id", -1)]
    )
    
    if last_patient:
        # Extract the number and increment
        last_num = int(last_patient["patient_id"].split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"NC-{year}-{new_num:05d}"


async def verify_staff_token(authorization: str = Header(None)):
    """Verify staff JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============================================
# PATIENT REGISTRATION ENDPOINTS
# ============================================

@router.post("/register")
async def register_patient(patient: PatientRegistration, staff: dict = Depends(verify_staff_token)):
    """
    Register a new patient (Staff only)
    Returns existing patient if mobile already registered
    """
    # Check if patient already exists with this mobile
    existing = await db.patients.find_one({"mobile": patient.mobile})
    
    if existing:
        return {
            "success": True,
            "is_new": False,
            "message": "Patient already registered",
            "patient": {
                "patient_id": existing["patient_id"],
                "name": existing["name"],
                "mobile": existing["mobile"],
                "age": existing.get("age"),
                "gender": existing.get("gender"),
                "registered_at": existing["registered_at"],
                "total_visits": existing.get("total_visits", 0)
            }
        }
    
    # Generate new patient ID
    patient_id = await generate_patient_id()
    
    # Create patient record
    patient_doc = {
        "patient_id": patient_id,
        "name": patient.name,
        "mobile": patient.mobile,
        "age": patient.age,
        "gender": patient.gender,
        "email": None,
        "address": None,
        "blood_group": None,
        "emergency_contact": None,
        "allergies": [],
        "existing_conditions": [],
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "registered_by": staff.get("sub") or staff.get("username"),
        "registered_by_name": staff.get("name"),
        "registration_type": patient.registration_type,
        "total_visits": 1,
        "last_visit": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    
    await db.patients.insert_one(patient_doc)
    
    return {
        "success": True,
        "is_new": True,
        "message": f"Patient registered successfully with ID: {patient_id}",
        "patient": {
            "patient_id": patient_id,
            "name": patient.name,
            "mobile": patient.mobile,
            "age": patient.age,
            "gender": patient.gender,
            "registered_at": patient_doc["registered_at"],
            "total_visits": 1
        }
    }


@router.get("/lookup")
async def lookup_patient(mobile: str):
    """
    Lookup patient by mobile number (Public - for booking flow)
    Returns patient details if found, or indicates new patient
    """
    if len(mobile) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    
    # Clean mobile number (remove +91, spaces, etc.)
    clean_mobile = mobile.replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    
    patient = await db.patients.find_one({
        "$or": [
            {"mobile": clean_mobile},
            {"mobile": f"+91{clean_mobile}"},
            {"mobile": mobile}
        ]
    })
    
    if patient:
        # Get visit count from appointments
        appointment_count = await db.appointments.count_documents({
            "$or": [
                {"patient_phone": clean_mobile},
                {"patient_phone": f"+91{clean_mobile}"},
                {"patient_id": patient["patient_id"]}
            ]
        })
        
        return {
            "found": True,
            "patient": {
                "patient_id": patient["patient_id"],
                "name": patient["name"],
                "mobile": patient["mobile"],
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "email": patient.get("email"),
                "blood_group": patient.get("blood_group"),
                "allergies": patient.get("allergies", []),
                "registered_at": patient["registered_at"],
                "total_visits": appointment_count or patient.get("total_visits", 0)
            }
        }
    
    return {
        "found": False,
        "message": "Patient not registered. Please register first."
    }


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient details by patient ID"""
    patient = await db.patients.find_one({"patient_id": patient_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return {
        "patient_id": patient["patient_id"],
        "name": patient["name"],
        "mobile": patient["mobile"],
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "email": patient.get("email"),
        "address": patient.get("address"),
        "blood_group": patient.get("blood_group"),
        "emergency_contact": patient.get("emergency_contact"),
        "allergies": patient.get("allergies", []),
        "existing_conditions": patient.get("existing_conditions", []),
        "registered_at": patient["registered_at"],
        "registration_type": patient.get("registration_type"),
        "total_visits": patient.get("total_visits", 0)
    }


@router.put("/{patient_id}")
async def update_patient(patient_id: str, update: PatientUpdate, staff: dict = Depends(verify_staff_token)):
    """Update patient details (Staff only)"""
    patient = await db.patients.find_one({"patient_id": patient_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Build update document
    update_doc = {}
    for field, value in update.dict(exclude_unset=True).items():
        if value is not None:
            update_doc[field] = value
    
    if update_doc:
        update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_doc["updated_by"] = staff.get("sub") or staff.get("username")
        
        await db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": update_doc}
        )
    
    return {"success": True, "message": "Patient updated successfully"}


# ============================================
# PATIENT HISTORY ENDPOINTS
# ============================================

@router.get("/{patient_id}/history")
async def get_patient_history(patient_id: str):
    """
    Get complete patient history including:
    - Appointments
    - Pharmacy orders
    - Diagnostic orders
    - Bills
    """
    patient = await db.patients.find_one({"patient_id": patient_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    mobile = patient["mobile"]
    clean_mobile = mobile.replace("+91", "").replace(" ", "")[-10:]
    
    # Fetch appointments
    appointments_cursor = db.appointments.find({
        "$or": [
            {"patient_phone": clean_mobile},
            {"patient_phone": f"+91{clean_mobile}"},
            {"patient_id": patient_id}
        ]
    }).sort("date", -1).limit(50)
    appointments = await appointments_cursor.to_list(length=50)
    
    # Fetch pharmacy orders
    pharmacy_cursor = db.pharmacy_orders.find({
        "$or": [
            {"phone": clean_mobile},
            {"phone": f"+91{clean_mobile}"},
            {"patient_id": patient_id}
        ]
    }).sort("created_at", -1).limit(50)
    pharmacy_orders = await pharmacy_cursor.to_list(length=50)
    
    # Fetch diagnostic orders
    diagnostic_cursor = db.diagnostic_orders.find({
        "$or": [
            {"phone": clean_mobile},
            {"phone": f"+91{clean_mobile}"},
            {"patient_id": patient_id}
        ]
    }).sort("created_at", -1).limit(50)
    diagnostic_orders = await diagnostic_cursor.to_list(length=50)
    
    # Fetch bills
    bills_cursor = db.bills.find({
        "$or": [
            {"patient_phone": clean_mobile},
            {"patient_phone": f"+91{clean_mobile}"},
            {"patient_id": patient_id}
        ]
    }).sort("created_at", -1).limit(50)
    bills = await bills_cursor.to_list(length=50)
    
    # Clean MongoDB _id fields
    def clean_doc(doc):
        doc.pop("_id", None)
        return doc
    
    return {
        "patient_id": patient_id,
        "name": patient["name"],
        "appointments": [clean_doc(a) for a in appointments],
        "pharmacy_orders": [clean_doc(p) for p in pharmacy_orders],
        "diagnostic_orders": [clean_doc(d) for d in diagnostic_orders],
        "bills": [clean_doc(b) for b in bills],
        "summary": {
            "total_appointments": len(appointments),
            "total_pharmacy_orders": len(pharmacy_orders),
            "total_diagnostic_orders": len(diagnostic_orders),
            "total_bills": len(bills)
        }
    }


@router.get("/{patient_id}/appointments")
async def get_patient_appointments(patient_id: str):
    """Get patient's appointment history"""
    patient = await db.patients.find_one({"patient_id": patient_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    mobile = patient["mobile"]
    clean_mobile = mobile.replace("+91", "").replace(" ", "")[-10:]
    
    appointments_cursor = db.appointments.find({
        "$or": [
            {"patient_phone": clean_mobile},
            {"patient_phone": f"+91{clean_mobile}"},
            {"patient_id": patient_id}
        ]
    }).sort("date", -1)
    
    appointments = await appointments_cursor.to_list(length=100)
    
    return {
        "appointments": [{
            "id": str(a.get("_id", "")),
            "doctor": a.get("doctor"),
            "clinic": a.get("clinic"),
            "date": a.get("date"),
            "time": a.get("time"),
            "status": a.get("status"),
            "type": a.get("appointment_type", "consultation"),
            "created_at": a.get("created_at")
        } for a in appointments]
    }


@router.get("/{patient_id}/prescriptions")
async def get_patient_prescriptions(patient_id: str):
    """Get patient's prescriptions"""
    patient = await db.patients.find_one({"patient_id": patient_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Prescriptions might be linked to appointments or pharmacy orders
    mobile = patient["mobile"]
    clean_mobile = mobile.replace("+91", "").replace(" ", "")[-10:]
    
    prescriptions_cursor = db.prescriptions.find({
        "$or": [
            {"patient_phone": clean_mobile},
            {"patient_id": patient_id}
        ]
    }).sort("created_at", -1)
    
    prescriptions = await prescriptions_cursor.to_list(length=100)
    
    return {
        "prescriptions": [{
            "id": str(p.get("_id", "")),
            "doctor": p.get("doctor"),
            "date": p.get("date"),
            "medicines": p.get("medicines", []),
            "diagnosis": p.get("diagnosis"),
            "notes": p.get("notes"),
            "created_at": p.get("created_at")
        } for p in prescriptions]
    }


@router.get("/{patient_id}/lab-reports")
async def get_patient_lab_reports(patient_id: str):
    """Get patient's lab reports"""
    patient = await db.patients.find_one({"patient_id": patient_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    mobile = patient["mobile"]
    clean_mobile = mobile.replace("+91", "").replace(" ", "")[-10:]
    
    # Get diagnostic orders with reports
    reports_cursor = db.diagnostic_orders.find({
        "$or": [
            {"phone": clean_mobile},
            {"patient_id": patient_id}
        ],
        "report_url": {"$exists": True, "$ne": None}
    }).sort("created_at", -1)
    
    reports = await reports_cursor.to_list(length=100)
    
    return {
        "lab_reports": [{
            "id": str(r.get("_id", "")),
            "order_id": r.get("order_id"),
            "tests": r.get("tests", []),
            "status": r.get("status"),
            "report_url": r.get("report_url"),
            "date": r.get("created_at"),
            "clinic": r.get("clinic")
        } for r in reports]
    }


@router.get("/{patient_id}/bills")
async def get_patient_bills(patient_id: str):
    """Get patient's billing history"""
    patient = await db.patients.find_one({"patient_id": patient_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    mobile = patient["mobile"]
    clean_mobile = mobile.replace("+91", "").replace(" ", "")[-10:]
    
    bills_cursor = db.bills.find({
        "$or": [
            {"patient_phone": clean_mobile},
            {"patient_id": patient_id}
        ]
    }).sort("created_at", -1)
    
    bills = await bills_cursor.to_list(length=100)
    
    return {
        "bills": [{
            "id": str(b.get("_id", "")),
            "bill_number": b.get("bill_number"),
            "amount": b.get("amount"),
            "paid": b.get("paid", False),
            "payment_mode": b.get("payment_mode"),
            "items": b.get("items", []),
            "date": b.get("created_at"),
            "clinic": b.get("clinic")
        } for b in bills]
    }


# ============================================
# STAFF SEARCH ENDPOINTS
# ============================================

@router.get("/search/all")
async def search_patients(
    q: str = "",
    limit: int = 20,
    staff: dict = Depends(verify_staff_token)
):
    """Search patients by name, mobile, or patient ID (Staff only)"""
    if not q or len(q) < 2:
        # Return recent patients
        cursor = db.patients.find().sort("registered_at", -1).limit(limit)
        patients = await cursor.to_list(length=limit)
    else:
        # Search by name, mobile, or patient ID
        cursor = db.patients.find({
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"mobile": {"$regex": q}},
                {"patient_id": {"$regex": q, "$options": "i"}}
            ]
        }).limit(limit)
        patients = await cursor.to_list(length=limit)
    
    return {
        "patients": [{
            "patient_id": p["patient_id"],
            "name": p["name"],
            "mobile": p["mobile"],
            "age": p.get("age"),
            "gender": p.get("gender"),
            "registered_at": p["registered_at"],
            "total_visits": p.get("total_visits", 0)
        } for p in patients]
    }


# ============================================
# PATIENT PORTAL LOGIN
# ============================================

@router.post("/portal/send-otp")
async def send_patient_portal_otp(mobile: str):
    """Send OTP for patient portal login"""
    # Clean mobile number
    clean_mobile = mobile.replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    
    # Check if patient exists
    patient = await db.patients.find_one({
        "$or": [
            {"mobile": clean_mobile},
            {"mobile": f"+91{clean_mobile}"}
        ]
    })
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not registered. Please visit the clinic to register.")
    
    # Generate OTP (mock for now)
    import random
    otp = str(random.randint(100000, 999999))
    
    # Store OTP
    await db.patient_otps.update_one(
        {"mobile": clean_mobile},
        {
            "$set": {
                "mobile": clean_mobile,
                "otp": otp,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
            }
        },
        upsert=True
    )
    
    # TODO: Send OTP via SMS
    
    return {
        "success": True,
        "message": "OTP sent successfully",
        "mock_otp": otp  # Remove in production
    }


@router.post("/portal/verify-otp")
async def verify_patient_portal_otp(mobile: str, otp: str):
    """Verify OTP and return patient portal token"""
    clean_mobile = mobile.replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    
    # Check OTP
    otp_record = await db.patient_otps.find_one({"mobile": clean_mobile})
    
    if not otp_record or otp_record["otp"] != otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Check expiry
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=401, detail="OTP expired")
    
    # Get patient
    patient = await db.patients.find_one({
        "$or": [
            {"mobile": clean_mobile},
            {"mobile": f"+91{clean_mobile}"}
        ]
    })
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Generate token
    token = jwt.encode({
        "sub": patient["patient_id"],
        "mobile": clean_mobile,
        "name": patient["name"],
        "type": "patient",
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }, JWT_SECRET, algorithm="HS256")
    
    # Delete used OTP
    await db.patient_otps.delete_one({"mobile": clean_mobile})
    
    # Update last visit
    await db.patients.update_one(
        {"patient_id": patient["patient_id"]},
        {"$set": {"last_portal_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "token": token,
        "patient": {
            "patient_id": patient["patient_id"],
            "name": patient["name"],
            "mobile": patient["mobile"]
        }
    }


@router.get("/portal/me")
async def get_patient_portal_profile(authorization: str = Header(None)):
    """Get logged-in patient's profile"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        if payload.get("type") != "patient":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        patient_id = payload.get("sub")
        patient = await db.patients.find_one({"patient_id": patient_id})
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return {
            "patient_id": patient["patient_id"],
            "name": patient["name"],
            "mobile": patient["mobile"],
            "age": patient.get("age"),
            "gender": patient.get("gender"),
            "email": patient.get("email"),
            "blood_group": patient.get("blood_group"),
            "registered_at": patient["registered_at"]
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
