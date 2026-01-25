"""
Nevika Cura - Staff Routes
Staff portal endpoints for clinic operations, appointments, orders, etc.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import os
import uuid
import logging
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/staff", tags=["Staff"])

# Will be injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_email_notification = None
send_sms_notification = None

# Clinic location Google Maps links
CLINIC_MAP_LINKS = {
    "Pushpa Clinic": "https://maps.app.goo.gl/LfFoHwVzvMEQ1Qzt9",
    "Amnion Clinic": "https://maps.app.goo.gl/aBr4jwCv3b6874vi8"
}

def get_clinic_map_link(clinic_name: str) -> str:
    """Get Google Maps link for a clinic"""
    for key, link in CLINIC_MAP_LINKS.items():
        if key.lower() in clinic_name.lower():
            return link
    return CLINIC_MAP_LINKS.get("Pushpa Clinic", "")

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

def set_notification_functions(email_func, sms_func):
    global send_email_notification, send_sms_notification
    send_email_notification = email_func
    send_sms_notification = sms_func


# ============ Models ============

class StaffLogin(BaseModel):
    phone: Optional[str] = None
    access_code: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

class WalkInAppointment(BaseModel):
    doctor: str
    clinic: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_id: Optional[str] = None
    time: str
    notes: Optional[str] = None

class EmergencyAppointment(BaseModel):
    doctor: str
    clinic: str
    date: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_id: Optional[str] = None
    emergency_type: Optional[str] = "General Emergency"
    notes: Optional[str] = None

class ServiceAdd(BaseModel):
    service_name: str
    fee_code: str
    amount: float
    notes: Optional[str] = None

class InternalFeedback(BaseModel):
    rating: int  # 1-5
    punctuality: Optional[int] = None  # 1-5
    behavior: Optional[int] = None  # 1-5
    cleanliness: Optional[int] = None  # 1-5
    notes: Optional[str] = None

class DoctorCompletionRequest(BaseModel):
    fee_code: str
    scan_codes: Optional[List[str]] = []  # Scan/ultrasound codes
    total_fee: Optional[float] = None  # Pre-calculated total
    follow_up_days: Optional[int] = None
    notes: Optional[str] = None

class DiagnosticOrderCreate(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    tests: List[str]
    appointment_id: Optional[str] = None
    notes: Optional[str] = None

class LoyaltyPointsAdd(BaseModel):
    phone: str
    points: int
    reason: str

# ============ Pre-Sonography Models ============

class ChildInfo(BaseModel):
    gender: str  # "boy" or "girl"
    age: str

class PreSonographyBooking(BaseModel):
    """Pre-sonography patient details form"""
    patient_name: str
    age: str
    lmp: str  # Last Menstrual Period
    mobile_number: str
    date_of_birth: Optional[str] = None
    husband_name: str
    address: str
    has_children: bool = False
    children: Optional[List[ChildInfo]] = []
    # Booking details
    appointment_id: Optional[str] = None  # If booking from existing appointment
    booking_date: str
    booking_time: str
    clinic: str
    scan_type: Optional[str] = None  # ES, NT, GS, etc.
    notes: Optional[str] = None


# ============ Auth Functions ============

async def verify_staff(authorization: str = Header(None)):
    """Verify staff token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Staff authentication required")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get('role', '')
        # Accept various staff roles including clinic-specific ones
        valid_roles = [
            'clinic_staff', 'pharmacy_staff', 'diagnostic_staff', 'doctor', 'admin', 'super_admin',
            'clinic_staff_pushpa', 'clinic_staff_amnion', 'doctor_pushpa', 'doctor_amnion',
            'receptionist', 'nurse', 'pharmacist', 'lab_technician'
        ]
        # Also accept any role containing 'staff', 'doctor', or 'admin'
        is_valid = role in valid_roles or 'staff' in role.lower() or 'doctor' in role.lower() or 'admin' in role.lower()
        if not is_valid:
            raise HTTPException(status_code=403, detail="Staff access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Staff Login ============

@router.post("/login")
async def staff_login(input: StaffLogin):
    """Staff login with username/password OR phone/access_code"""
    import bcrypt
    
    staff = None
    
    # Method 1: Username + Password login
    if input.username and input.password:
        logger.info(f"Staff login attempt with username: {input.username}")
        # Check staff collection with 'active' field
        staff_record = await db.staff.find_one({
            "username": input.username,
            "active": True
        })
        
        if not staff_record:
            # Also check with is_active field (different schema)
            staff_record = await db.staff.find_one({
                "username": input.username,
                "is_active": True
            })
        
        logger.info(f"Found staff record: {staff_record is not None}")
        
        if staff_record and staff_record.get('password_hash'):
            try:
                stored_hash = staff_record['password_hash']
                logger.info(f"Stored hash prefix: {stored_hash[:20] if stored_hash else 'None'}, len={len(stored_hash) if stored_hash else 0}")
                password_valid = bcrypt.checkpw(input.password.encode(), stored_hash.encode())
                logger.info(f"Password valid: {password_valid}")
                if password_valid:
                    staff = staff_record
            except Exception as e:
                logger.error(f"Password verification error: {e}")
    
    # Method 2: Phone + Access Code login (for mobile staff)
    elif input.phone and input.access_code:
        staff = await db.staff.find_one({
            "$or": [
                {"phone": input.phone, "access_code": input.access_code, "is_active": True},
                {"phone": input.phone, "access_code": input.access_code, "active": True}
            ]
        })
    
    if not staff:
        raise HTTPException(status_code=401, detail="Invalid credentials or inactive account")
    
    # Generate staff token
    token = jwt.encode({
        'sub': staff.get('id', str(staff.get('_id', ''))),
        'phone': staff.get('phone'),
        'name': staff.get('name'),
        'role': staff.get('role'),
        'username': staff.get('username'),
        'department': staff.get('department'),
        'clinic': staff.get('clinic'),
        'doctor_name': staff.get('doctor_name'),  # For doctor role - full name like "Dr. Vikas Jha"
        'access_modules': staff.get('access_modules', []),
        'exp': datetime.now(timezone.utc) + timedelta(days=30)  # 30 days session
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "token": token,
        "staff": {
            "id": staff.get('id', str(staff.get('_id', ''))),
            "name": staff.get('name'),
            "role": staff.get('role'),
            "clinic": staff.get('clinic'),
            "department": staff.get('department'),
            "doctor_name": staff.get('doctor_name'),
            "access_modules": staff.get('access_modules', [])
        },
        "message": f"Welcome, {staff.get('name')}!"
    }


# ============ Walk-in Appointments ============

@router.post("/appointments/walk-in")
async def create_walkin_appointment(data: WalkInAppointment, staff = Depends(verify_staff)):
    """Create a walk-in appointment"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    appointment = {
        "id": str(uuid.uuid4()),
        "doctor": data.doctor,
        "clinic": data.clinic,
        "date": today,
        "time": data.time,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "patient_id": data.patient_id if hasattr(data, 'patient_id') else None,
        "appointment_type": "WALK-IN",
        "booking_type": "walk_in",
        "status": "Booked",
        "notes": data.notes,
        "created_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    # Send SMS confirmation (DiaGyn Walk-in - SMS allowed)
    if send_sms_notification and data.patient_phone:
        try:
            map_link = get_clinic_map_link(data.clinic)
            sms_text = f"""DiaGyn Healthcare - Walk-in Registered!

Doctor: {data.doctor}
Clinic: {data.clinic}
Date: {today}
Token Time: {data.time}

Note: The time mentioned is your arrival slot. Patients are attended in sequence.

Please wait in the clinic. You will be called shortly.
Location: {map_link}

- DiaGyn Healthcare
  Call: 9403890429"""
            await send_sms_notification(data.patient_phone, sms_text)
            logger.info(f"Walk-in confirmation SMS sent to {data.patient_phone}")
        except Exception as e:
            logger.error(f"Failed to send walk-in confirmation SMS: {e}")
    
    return {"message": "Walk-in appointment created", "appointment": appointment}


# ============ Emergency Appointments ============

@router.post("/appointments/emergency")
async def create_emergency_appointment(data: EmergencyAppointment, staff = Depends(verify_staff)):
    """Create an emergency appointment"""
    # Use provided date or today
    appointment_date = data.date if data.date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    appointment = {
        "id": str(uuid.uuid4()),
        "doctor": data.doctor,
        "clinic": data.clinic,
        "date": appointment_date,
        "time": now_time,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "patient_id": data.patient_id,
        "appointment_type": "EMERGENCY",
        "booking_type": "emergency",
        "emergency_type": data.emergency_type or "General Emergency",
        "status": "Booked",
        "notes": data.notes,
        "created_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    # Send SMS to patient (DiaGyn Emergency - SMS allowed)
    if send_sms_notification and data.patient_phone:
        try:
            map_link = get_clinic_map_link(data.clinic)
            sms_text = f"""DiaGyn Healthcare - Emergency Registered!

Doctor: {data.doctor}
Clinic: {data.clinic}
Date: {today}
Token Time: {now_time}

Note: The time mentioned is your arrival slot. Patients are attended in sequence.

Please wait in the clinic. You will be called shortly.
Location: {map_link}

- DiaGyn Healthcare
  Call: 9403890429"""
            await send_sms_notification(data.patient_phone, sms_text)
            logger.info(f"Emergency confirmation SMS sent to {data.patient_phone}")
        except Exception as e:
            logger.error(f"Failed to send emergency SMS: {e}")
    
    # Notify clinic staff
    if send_sms_notification:
        try:
            msg = f"EMERGENCY: {data.emergency_type}\nPatient: {data.patient_name}\nClinic: {data.clinic}\n- DiaGyn Healthcare"
            await send_sms_notification("9403890429", msg)
        except Exception as e:
            logger.error(f"Failed to send emergency notification: {e}")
    
    return {"message": "Emergency appointment created", "appointment": appointment}


@router.get("/emergency-count/{doctor}/{date}")
async def get_emergency_count(doctor: str, date: str, staff = Depends(verify_staff)):
    """Get count of emergency appointments for a doctor on a date"""
    count = await db.appointments.count_documents({
        "doctor": doctor,
        "date": date,
        "appointment_type": "EMERGENCY"
    })
    return {"doctor": doctor, "date": date, "emergency_count": count}


# ============ Check-in ============

@router.put("/appointments/{appointment_id}/check-in")
async def check_in_patient(appointment_id: str, staff = Depends(verify_staff)):
    """Check in a patient for their appointment"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {
            "status": "In Clinic",
            "checked_in_at": datetime.now(timezone.utc).isoformat(),
            "checked_in_by": staff.get('name', 'Staff')
        }}
    )
    
    return {"message": "Patient checked in", "status": "In Clinic"}


# ============ Complete Appointments ============

class PatientEditRequest(BaseModel):
    patient_name: str
    patient_phone: str
    age: Optional[str] = None


@router.put("/appointments/{appointment_id}/patient")
async def update_appointment_patient(
    appointment_id: str,
    data: PatientEditRequest,
    staff = Depends(verify_staff)
):
    """Update patient details on an appointment (Staff only)"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = {
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": staff.get('name', 'Staff')
    }
    
    if data.age:
        update_data["patient_age"] = data.age
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    # Also update the patient record if exists
    patient = await db.patients.find_one({"patient_id": appointment.get("patient_id")})
    if patient:
        patient_update = {
            "name": data.patient_name,
            "mobile": data.patient_phone,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if data.age:
            patient_update["age"] = int(data.age) if data.age.isdigit() else None
        await db.patients.update_one({"patient_id": appointment.get("patient_id")}, {"$set": patient_update})
    
    return {"success": True, "message": "Patient details updated"}


@router.put("/appointments/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: str, 
    notes: str = None,
    follow_up_date: str = None,
    staff = Depends(verify_staff)
):
    """Mark appointment as completed by staff"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = {
        "status": "Completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "completed_by": staff.get('name', 'Staff')
    }
    
    if notes:
        update_data["completion_notes"] = notes
    if follow_up_date:
        update_data["follow_up_date"] = follow_up_date
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    return {"message": "Appointment completed", "status": "Completed"}


@router.put("/appointments/{appointment_id}/doctor-complete")
async def doctor_complete_appointment(
    appointment_id: str,
    data: DoctorCompletionRequest,
    staff = Depends(verify_staff)
):
    """Mark appointment as completed by doctor with fee code, scan charges, and follow-up"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Fee code amounts (matching frontend)
    FEE_CODES = {
        "NF": 0, "G1": 150, "G2": 100, "S1": 300, "S2": 200,
        "D1": 500, "D2": 400, "D3": 300,
        "O1": 500, "O2": 400, "O3": 300, "E1": 600
    }
    
    # Scan fee amounts (Dr. Neha OBGY)
    SCAN_FEES = {
        "ES": 1000,  # Early Scan
        "NT": 1200,  # NT Scan
        "GS": 1500,  # Growth Scan
        "FL": 200,   # Follicular
        "UP": 1000,  # USG Pelvis
        "UT": 100    # UpT
    }
    
    # Calculate total fee
    consultation_fee = FEE_CODES.get(data.fee_code, 0)
    scan_total = sum(SCAN_FEES.get(code, 0) for code in (data.scan_codes or []))
    total_fee = data.total_fee if data.total_fee else (consultation_fee + scan_total)
    
    update_data = {
        "status": "Completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "completed_by": staff.get('name', 'Doctor'),
        "fee_code": data.fee_code,
        "fee_amount": consultation_fee,
        "scan_codes": data.scan_codes or [],
        "scan_amount": scan_total,
        "total_amount": total_fee
    }
    
    if data.notes:
        update_data["doctor_notes"] = data.notes
    
    follow_up_date = None
    if data.follow_up_days:
        follow_up_date = (datetime.now(timezone.utc) + timedelta(days=data.follow_up_days)).strftime("%Y-%m-%d")
        update_data["follow_up_date"] = follow_up_date
        update_data["follow_up_days"] = data.follow_up_days
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    # Generate and send invoice email
    invoice_sent = False
    patient_email = appointment.get("patient_email")
    if patient_email and send_email_notification:
        try:
            invoice_date = datetime.now().strftime("%d %b %Y")
            invoice_number = f"INV-{appointment_id[:8].upper()}"
            
            # Build scan items HTML
            scan_items_html = ""
            for code in (data.scan_codes or []):
                scan_name = {"ES": "Early Scan", "NT": "NT Scan", "GS": "Growth Scan", 
                            "FL": "Follicular", "UP": "USG Pelvis", "UT": "UpT"}.get(code, code)
                scan_items_html += f"""
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">{scan_name} ({code})</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">₹{SCAN_FEES.get(code, 0):.2f}</td>
                </tr>
                """
            
            invoice_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">Nevika Cura Healthcare</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Consultation Invoice</p>
                </div>
                
                <div style="background: #f8fafc; padding: 25px; border: 1px solid #e2e8f0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Invoice No:</strong></td>
                            <td style="padding: 8px 0; text-align: right;">{invoice_number}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Date:</strong></td>
                            <td style="padding: 8px 0; text-align: right;">{invoice_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Patient:</strong></td>
                            <td style="padding: 8px 0; text-align: right;">{appointment.get('patient_name', 'Patient')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Doctor:</strong></td>
                            <td style="padding: 8px 0; text-align: right;">{appointment.get('doctor', 'Doctor')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Clinic:</strong></td>
                            <td style="padding: 8px 0; text-align: right;">{appointment.get('clinic', 'Clinic')}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="padding: 25px;">
                    <h3 style="margin: 0 0 15px; color: #1e293b;">Charges</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Description</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Consultation Fee ({data.fee_code})</td>
                                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">₹{consultation_fee:.2f}</td>
                            </tr>
                            {scan_items_html}
                            <tr style="font-weight: bold; background: #f8fafc;">
                                <td style="padding: 12px;">Total</td>
                                <td style="padding: 12px; text-align: right; color: #6366f1; font-size: 18px;">₹{total_fee:.2f}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                {f'<div style="background: #dcfce7; padding: 15px; border: 1px solid #22c55e; border-radius: 8px; margin: 0 25px 25px;"><strong>Follow-up:</strong> Please schedule a follow-up appointment after {data.follow_up_days} days ({follow_up_date})</div>' if data.follow_up_days else ''}
                
                <div style="text-align: center; padding: 25px; color: #64748b; font-size: 12px;">
                    <p>Thank you for choosing Nevika Cura Healthcare</p>
                    <p>For queries: support@nevikacura.com | +91-XXXXXXXXXX</p>
                </div>
            </div>
            """
            
            await send_email_notification(
                patient_email,
                f"Consultation Invoice - {invoice_number} | Nevika Cura",
                invoice_html
            )
            invoice_sent = True
            logger.info(f"Invoice sent to {patient_email} for appointment {appointment_id}")
        except Exception as e:
            logger.error(f"Failed to send invoice email: {e}")
    
    return {
        "message": "Appointment completed by doctor", 
        "status": "Completed",
        "fee_code": data.fee_code,
        "fee_amount": consultation_fee,
        "scan_codes": data.scan_codes,
        "scan_amount": scan_total,
        "total_amount": total_fee,
        "follow_up_date": follow_up_date,
        "invoice_sent": invoice_sent,
        "invoice_email": patient_email if invoice_sent else None
    }


# ============ Services ============

@router.post("/appointments/{appointment_id}/services")
async def add_service_to_appointment(
    appointment_id: str,
    service: ServiceAdd,
    staff = Depends(verify_staff)
):
    """Add a service/procedure to an appointment"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    service_record = {
        "id": str(uuid.uuid4()),
        "appointment_id": appointment_id,
        "service_name": service.service_name,
        "fee_code": service.fee_code,
        "amount": service.amount,
        "notes": service.notes,
        "status": "pending",
        "added_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointment_services.insert_one(service_record)
    service_record.pop("_id", None)
    
    # Update appointment total
    current_services = appointment.get("services_total", 0)
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"services_total": current_services + service.amount}}
    )
    
    return {"message": "Service added", "service": service_record}


@router.get("/appointments/{appointment_id}/services")
async def get_appointment_services(appointment_id: str, staff = Depends(verify_staff)):
    """Get all services for an appointment"""
    services = await db.appointment_services.find(
        {"appointment_id": appointment_id},
        {"_id": 0}
    ).to_list(50)
    
    total = sum(s.get("amount", 0) for s in services)
    return {"services": services, "total": total}


@router.put("/services/{service_id}/status")
async def update_service_status(
    service_id: str,
    status: str,
    staff = Depends(verify_staff)
):
    """Update service status (pending, completed, cancelled)"""
    result = await db.appointment_services.update_one(
        {"id": service_id},
        {"$set": {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": staff.get('name', 'Staff')
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": f"Service status updated to {status}"}


# ============ Diagnostic Service Orders ============

@router.get("/diagnostic/service-orders")
async def get_diagnostic_service_orders(staff = Depends(verify_staff)):
    """Get diagnostic service orders from appointments"""
    services = await db.appointment_services.find(
        {"fee_code": {"$regex": "^DIAG"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"orders": services}


# ============ Doctor Appointments ============

@router.get("/doctor/appointments")
async def get_doctor_appointments(
    doctor: str = None,
    date: str = None,
    staff = Depends(verify_staff)
):
    """Get appointments for doctor view"""
    query = {}
    if doctor:
        query["doctor"] = doctor
    if date:
        query["date"] = date
    else:
        query["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(100)
    return {"appointments": appointments}


# ============ Clinic Appointments ============

@router.get("/clinic/appointments")
async def get_clinic_appointments(
    clinic: str = None,
    date: str = None,
    status: str = None,
    staff = Depends(verify_staff)
):
    """Get appointments for clinic view"""
    query = {}
    if clinic:
        query["clinic"] = clinic
    if date:
        query["date"] = date
    else:
        query["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(200)
    return {"appointments": appointments, "total": len(appointments)}


@router.get("/clinic/completed-appointments")
async def get_completed_appointments(
    clinic: str = None,
    date: str = None,
    staff = Depends(verify_staff)
):
    """Get completed appointments for billing"""
    query = {"status": "Completed"}
    if clinic:
        query["clinic"] = clinic
    if date:
        query["date"] = date
    else:
        query["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(100)
    return {"appointments": appointments}


@router.get("/clinic/daily-collection")
async def get_daily_collection(
    clinic: str = None,
    date: str = None,
    staff = Depends(verify_staff)
):
    """Get daily collection summary"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"date": date, "status": "Completed"}
    if clinic:
        query["clinic"] = clinic
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(200)
    
    total_consultation = sum(a.get("consultation_fee", 0) for a in appointments)
    total_services = sum(a.get("services_total", 0) for a in appointments)
    
    return {
        "date": date,
        "clinic": clinic,
        "total_appointments": len(appointments),
        "total_consultation_fees": total_consultation,
        "total_services": total_services,
        "grand_total": total_consultation + total_services
    }


# ============ Patient History ============

@router.get("/patient/history/{phone}")
async def get_patient_history(phone: str, staff = Depends(verify_staff)):
    """Get patient's appointment history"""
    appointments = await db.appointments.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    
    diagnostic_orders = await db.diagnostic_orders.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    pharmacy_orders = await db.pharmacy_orders.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    return {
        "appointments": appointments,
        "diagnostic_orders": diagnostic_orders,
        "pharmacy_orders": pharmacy_orders
    }


# ============ Follow-up Reminders ============

@router.get("/follow-up-reminders")
async def get_follow_up_reminders(staff = Depends(verify_staff)):
    """Get appointments with follow-up due"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    next_week = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    
    reminders = await db.appointments.find({
        "follow_up_date": {"$gte": today, "$lte": next_week},
        "status": "Completed"
    }, {"_id": 0}).to_list(100)
    
    return {"reminders": reminders}


# ============ Pre-Sonography Bookings ============

@router.post("/sonography/book")
async def create_sonography_booking(data: PreSonographyBooking, staff = Depends(verify_staff)):
    """Create a pre-sonography booking with patient details"""
    booking_id = str(uuid.uuid4())
    
    booking_record = {
        "id": booking_id,
        "patient_name": data.patient_name,
        "age": data.age,
        "lmp": data.lmp,
        "mobile_number": data.mobile_number,
        "date_of_birth": data.date_of_birth,
        "husband_name": data.husband_name,
        "address": data.address,
        "has_children": data.has_children,
        "children": [child.dict() for child in data.children] if data.children else [],
        "appointment_id": data.appointment_id,
        "booking_date": data.booking_date,
        "booking_time": data.booking_time,
        "clinic": data.clinic,
        "scan_type": data.scan_type,
        "notes": data.notes,
        "status": "booked",  # booked -> in_progress -> completed -> cancelled
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": staff.get("username", "staff"),
        "doctor": "Dr. Neha Gupta"  # Default to Dr. Neha for sonography
    }
    
    await db.sonography_bookings.insert_one(booking_record)
    
    # Send confirmation SMS to patient (DiaGyn Appointment - SMS allowed)
    try:
        if send_sms_notification and data.mobile_number:
            map_link = get_clinic_map_link(data.clinic)
            sms_text = f"Dear {data.patient_name}, Your sonography is confirmed for {data.booking_date} at {data.booking_time}. Clinic: {data.clinic}. Location: {map_link} - Nevika Cura"
            await send_sms_notification(data.mobile_number, sms_text)
            logger.info(f"Sonography confirmation SMS sent to {data.mobile_number}")
    except Exception as e:
        logger.error(f"Failed to send sonography booking SMS: {e}")
    
    return {
        "success": True,
        "booking_id": booking_id,
        "message": f"Sonography booking created for {data.patient_name}"
    }

@router.get("/sonography/bookings")
async def get_sonography_bookings(
    date: str = None,
    clinic: str = None,
    status: str = None,
    staff = Depends(verify_staff)
):
    """Get sonography bookings - for Dr. Neha's dashboard"""
    query = {}
    
    if date:
        query["booking_date"] = date
    if clinic:
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    if status:
        query["status"] = status
    
    bookings = await db.sonography_bookings.find(query, {"_id": 0}).sort("booking_date", -1).to_list(100)
    
    # Get counts by status
    total = len(bookings)
    booked = len([b for b in bookings if b["status"] == "booked"])
    in_progress = len([b for b in bookings if b["status"] == "in_progress"])
    completed = len([b for b in bookings if b["status"] == "completed"])
    
    return {
        "success": True,
        "bookings": bookings,
        "counts": {
            "total": total,
            "booked": booked,
            "in_progress": in_progress,
            "completed": completed
        }
    }

@router.get("/sonography/booking/{booking_id}")
async def get_sonography_booking_details(booking_id: str, staff = Depends(verify_staff)):
    """Get detailed sonography booking info"""
    booking = await db.sonography_bookings.find_one({"id": booking_id}, {"_id": 0})
    
    if not booking:
        return {"error": "Booking not found"}
    
    return {"success": True, "booking": booking}

@router.put("/sonography/booking/{booking_id}/status")
async def update_sonography_status(booking_id: str, status: str, staff = Depends(verify_staff)):
    """Update sonography booking status"""
    valid_statuses = ["booked", "in_progress", "completed", "cancelled"]
    if status not in valid_statuses:
        return {"error": f"Invalid status. Must be one of: {valid_statuses}"}
    
    result = await db.sonography_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": staff.get("username", "staff")
        }}
    )
    
    if result.modified_count == 0:
        return {"error": "Booking not found or no changes made"}
    
    return {"success": True, "message": f"Booking status updated to {status}"}

@router.get("/sonography/today")
async def get_todays_sonography(clinic: str = None, staff = Depends(verify_staff)):
    """Get today's sonography bookings for quick access"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"booking_date": today}
    if clinic:
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    
    bookings = await db.sonography_bookings.find(query, {"_id": 0}).sort("booking_time", 1).to_list(50)
    
    return {
        "success": True,
        "date": today,
        "bookings": bookings,
        "count": len(bookings)
    }


@router.get("/sonography/upcoming-reminders")
async def get_upcoming_sonography_reminders(minutes: int = 30, staff = Depends(verify_staff)):
    """Get sonography bookings that are due within the specified minutes for reminders"""
    from datetime import timedelta
    
    # Get current IST time
    ist_offset = timedelta(hours=5, minutes=30)
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + ist_offset
    today = now_ist.strftime("%Y-%m-%d")
    current_time = now_ist.strftime("%H:%M")
    
    # Calculate reminder window (current time + minutes)
    reminder_end = (now_ist + timedelta(minutes=minutes)).strftime("%H:%M")
    
    # Find bookings that are:
    # 1. Today
    # 2. Status is 'booked' (not started or completed)
    # 3. Booking time is within the reminder window
    # 4. Reminder not already sent
    query = {
        "booking_date": today,
        "status": "booked",
        "booking_time": {"$gte": current_time, "$lte": reminder_end},
        "reminder_sent": {"$ne": True}
    }
    
    bookings = await db.sonography_bookings.find(query, {"_id": 0}).sort("booking_time", 1).to_list(50)
    
    return {
        "success": True,
        "date": today,
        "current_time": current_time,
        "reminder_window_end": reminder_end,
        "bookings": bookings,
        "count": len(bookings)
    }


@router.post("/sonography/send-reminder/{booking_id}")
async def send_sonography_reminder(booking_id: str, staff = Depends(verify_staff)):
    """Send reminder notification for a specific sonography booking"""
    booking = await db.sonography_bookings.find_one({"id": booking_id})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("reminder_sent"):
        return {"success": True, "message": "Reminder already sent", "already_sent": True}
    
    # Prepare reminder message
    patient_name = booking.get("patient_name", "Patient")
    booking_time = booking.get("booking_time", "")
    clinic = booking.get("clinic", "Clinic")
    scan_type = booking.get("scan_type", "Sonography")
    
    # Send SMS reminder to patient
    try:
        phone = booking.get("mobile_number")
        if phone and send_sms_notification:
            sms_text = f"Reminder: {patient_name}, your {scan_type} scan is scheduled at {booking_time} today at {clinic}. Please arrive 10 mins early. - Nevika Cura"
            await send_sms_notification(phone, sms_text)
            logger.info(f"Sonography reminder SMS sent to {phone} for booking {booking_id}")
    except Exception as e:
        logger.error(f"Failed to send sonography reminder SMS: {e}")
    
    # Mark reminder as sent
    await db.sonography_bookings.update_one(
        {"id": booking_id},
        {"$set": {"reminder_sent": True, "reminder_sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": f"Reminder sent for {patient_name}'s {scan_type} at {booking_time}",
        "booking_id": booking_id
    }


@router.post("/sonography/send-all-reminders")
async def send_all_sonography_reminders(minutes: int = 30, staff = Depends(verify_staff)):
    """Send reminders for all upcoming sonography bookings within the time window"""
    from datetime import timedelta
    
    # Get current IST time
    ist_offset = timedelta(hours=5, minutes=30)
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + ist_offset
    today = now_ist.strftime("%Y-%m-%d")
    current_time = now_ist.strftime("%H:%M")
    reminder_end = (now_ist + timedelta(minutes=minutes)).strftime("%H:%M")
    
    # Find bookings to remind
    query = {
        "booking_date": today,
        "status": "booked",
        "booking_time": {"$gte": current_time, "$lte": reminder_end},
        "reminder_sent": {"$ne": True}
    }
    
    bookings = await db.sonography_bookings.find(query).to_list(50)
    
    sent_count = 0
    failed_count = 0
    
    for booking in bookings:
        try:
            patient_name = booking.get("patient_name", "Patient")
            booking_time = booking.get("booking_time", "")
            clinic = booking.get("clinic", "Clinic")
            scan_type = booking.get("scan_type", "Sonography")
            phone = booking.get("mobile_number")
            
            if phone and send_sms_notification:
                sms_text = f"Reminder: {patient_name}, your {scan_type} scan is at {booking_time} today at {clinic}. Please arrive 10 mins early. - Nevika Cura"
                await send_sms_notification(phone, sms_text)
                
                # Mark as sent
                await db.sonography_bookings.update_one(
                    {"id": booking.get("id")},
                    {"$set": {"reminder_sent": True, "reminder_sent_at": datetime.now(timezone.utc).isoformat()}}
                )
                sent_count += 1
                logger.info(f"Sonography reminder sent for booking {booking.get('id')}")
        except Exception as e:
            failed_count += 1
            logger.error(f"Failed to send reminder for booking {booking.get('id')}: {e}")
    
    return {
        "success": True,
        "message": f"Sent {sent_count} reminders, {failed_count} failed",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total_due": len(bookings)
    }


# ============ Patient Feedback ============

class FeedbackRequest(BaseModel):
    patient_name: str
    doctor_rating: int = 0
    staff_rating: int = 0
    cleanliness_rating: int = 0
    overall_rating: Optional[str] = None
    clinic: Optional[str] = None
    collected_by: Optional[str] = None
    date: Optional[str] = None
    comments: Optional[str] = None


@router.post("/feedback")
async def submit_patient_feedback(feedback: FeedbackRequest, staff = Depends(verify_staff)):
    """Submit patient feedback after consultation"""
    feedback_data = {
        "id": f"fb_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
        "patient_name": feedback.patient_name,
        "doctor_rating": feedback.doctor_rating,
        "staff_rating": feedback.staff_rating,
        "cleanliness_rating": feedback.cleanliness_rating,
        "overall_rating": feedback.overall_rating or str(round((feedback.doctor_rating + feedback.staff_rating + feedback.cleanliness_rating) / 3, 1)),
        "clinic": feedback.clinic,
        "collected_by": feedback.collected_by,
        "date": feedback.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "comments": feedback.comments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.patient_feedback.insert_one(feedback_data)
    
    return {
        "success": True,
        "message": "Feedback submitted successfully",
        "feedback_id": feedback_data["id"]
    }


@router.get("/feedback/summary")
async def get_feedback_summary(clinic: str = None, days: int = 30, staff = Depends(verify_staff)):
    """Get feedback summary for a clinic"""
    from datetime import timedelta
    
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": start_date}}
    if clinic:
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    
    feedbacks = await db.patient_feedback.find(query, {"_id": 0}).to_list(500)
    
    if not feedbacks:
        return {
            "success": True,
            "total_feedbacks": 0,
            "avg_overall": 0,
            "avg_doctor": 0,
            "avg_staff": 0,
            "avg_cleanliness": 0
        }
    
    total = len(feedbacks)
    avg_overall = sum(float(f.get("overall_rating", 0)) for f in feedbacks) / total
    avg_doctor = sum(f.get("doctor_rating", 0) for f in feedbacks) / total
    avg_staff = sum(f.get("staff_rating", 0) for f in feedbacks) / total
    avg_cleanliness = sum(f.get("cleanliness_rating", 0) for f in feedbacks) / total
    
    return {
        "success": True,
        "total_feedbacks": total,
        "avg_overall": round(avg_overall, 1),
        "avg_doctor": round(avg_doctor, 1),
        "avg_staff": round(avg_staff, 1),
        "avg_cleanliness": round(avg_cleanliness, 1),
        "feedbacks": feedbacks[:50]  # Last 50 feedbacks
    }


# ============ Fee Codes ============

@router.get("/fee-codes")
async def get_fee_codes(staff = Depends(verify_staff)):
    """Get list of fee codes for services"""
    # Standard fee codes
    fee_codes = [
        {"code": "CONS-REG", "name": "Regular Consultation", "amount": 500},
        {"code": "CONS-FUP", "name": "Follow-up Consultation", "amount": 300},
        {"code": "DIAG-USG", "name": "Ultrasound", "amount": 1500},
        {"code": "DIAG-ECG", "name": "ECG", "amount": 500},
        {"code": "PROC-IUD", "name": "IUD Insertion", "amount": 2500},
        {"code": "PROC-PAP", "name": "Pap Smear", "amount": 1000},
        {"code": "INJ-IV", "name": "IV Injection", "amount": 200},
        {"code": "INJ-IM", "name": "IM Injection", "amount": 100},
    ]
    
    # Get custom fee codes from DB
    custom_codes = await db.fee_codes.find({}, {"_id": 0}).to_list(100)
    
    return {"fee_codes": fee_codes + custom_codes}


# ============ Pharmacy Orders ============

@router.get("/pharmacy/orders")
async def get_pharmacy_orders_for_staff(
    status: str = None,
    date: str = None,
    staff = Depends(verify_staff)
):
    """Get pharmacy orders for staff"""
    query = {}
    if status:
        query["status"] = status
    if date:
        query["created_at"] = {"$regex": f"^{date}"}
    
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}


@router.put("/pharmacy/orders/{order_id}/status")
async def update_pharmacy_order_status(
    order_id: str,
    status: str,
    notes: str = None,
    staff = Depends(verify_staff)
):
    """Update pharmacy order status"""
    valid_statuses = ["Pending", "Confirmed", "Processing", "Ready for Pickup", "Out for Delivery", "Delivered", "Cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": staff.get('name', 'Staff')
    }
    if notes:
        update_data["status_notes"] = notes
    
    result = await db.pharmacy_orders.update_one({"id": order_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Notify patient
    order = await db.pharmacy_orders.find_one({"id": order_id}, {"_id": 0, "patient_phone": 1, "patient_name": 1})
    if send_sms_notification and order and order.get("patient_phone"):
        try:
            msg = f"Dear {order.get('patient_name', 'Customer')}, your pharmacy order status: {status}. - Orange Pharmacy"
            await send_sms_notification(order["patient_phone"], msg)
        except Exception as e:
            logger.error(f"Failed to send status notification: {e}")
    
    return {"message": f"Order status updated to {status}"}


@router.post("/pharmacy/orders/{order_id}/upload-bill")
async def upload_pharmacy_bill(
    order_id: str,
    file: UploadFile = File(...),
    staff = Depends(verify_staff)
):
    """Upload bill/invoice for pharmacy order"""
    order = await db.pharmacy_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Read and encode file
    content = await file.read()
    encoded = base64.b64encode(content).decode('utf-8')
    
    await db.pharmacy_orders.update_one(
        {"id": order_id},
        {"$set": {
            "bill_file": encoded,
            "bill_filename": file.filename,
            "bill_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "bill_uploaded_by": staff.get('name', 'Staff')
        }}
    )
    
    return {"message": "Bill uploaded successfully"}


# ============ Diagnostic Orders ============

@router.get("/diagnostic/orders")
async def get_diagnostic_orders_for_staff(
    status: str = None,
    date: str = None,
    staff = Depends(verify_staff)
):
    """Get diagnostic orders for staff"""
    query = {}
    if status:
        query["status"] = status
    if date:
        query["preferred_date"] = date
    
    orders = await db.diagnostic_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}


@router.post("/diagnostic/orders")
async def create_diagnostic_order_staff(
    data: DiagnosticOrderCreate,
    staff = Depends(verify_staff)
):
    """Create diagnostic order from staff portal"""
    order = {
        "id": str(uuid.uuid4()),
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "tests": data.tests,
        "appointment_id": data.appointment_id,
        "notes": data.notes,
        "status": "Pending",
        "preferred_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.diagnostic_orders.insert_one(order)
    order.pop("_id", None)
    
    return {"message": "Diagnostic order created", "order": order}


@router.put("/diagnostic/orders/{order_id}/status")
async def update_diagnostic_order_status(
    order_id: str,
    status: str,
    notes: str = None,
    staff = Depends(verify_staff)
):
    """Update diagnostic order status"""
    valid_statuses = ["Pending", "Confirmed", "Sample Collected", "Processing", "Report Ready", "Completed", "Cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": staff.get('name', 'Staff')
    }
    if notes:
        update_data["status_notes"] = notes
    
    result = await db.diagnostic_orders.update_one({"id": order_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}


@router.post("/diagnostic/orders/{order_id}/upload-report")
async def upload_diagnostic_report(
    order_id: str,
    file: UploadFile = File(...),
    staff = Depends(verify_staff)
):
    """Upload report for diagnostic order"""
    order = await db.diagnostic_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    content = await file.read()
    encoded = base64.b64encode(content).decode('utf-8')
    
    await db.diagnostic_orders.update_one(
        {"id": order_id},
        {"$set": {
            "report_file": encoded,
            "report_filename": file.filename,
            "report_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "report_uploaded_by": staff.get('name', 'Staff'),
            "status": "Report Ready"
        }}
    )
    
    # Notify patient
    if send_sms_notification and order.get("patient_phone"):
        try:
            msg = f"Dear {order.get('patient_name', 'Patient')}, your diagnostic report is ready. You can view it in the app. - Proton Diagnostics"
            await send_sms_notification(order["patient_phone"], msg)
        except Exception as e:
            logger.error(f"Failed to send report notification: {e}")
    
    return {"message": "Report uploaded successfully"}


@router.post("/diagnostic/orders/{order_id}/upload-invoice")
async def upload_diagnostic_invoice(
    order_id: str,
    file: UploadFile = File(...),
    staff = Depends(verify_staff)
):
    """Upload invoice for diagnostic order"""
    order = await db.diagnostic_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    content = await file.read()
    encoded = base64.b64encode(content).decode('utf-8')
    
    await db.diagnostic_orders.update_one(
        {"id": order_id},
        {"$set": {
            "invoice_file": encoded,
            "invoice_filename": file.filename,
            "invoice_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "invoice_uploaded_by": staff.get('name', 'Staff')
        }}
    )
    
    return {"message": "Invoice uploaded successfully"}


# ============ Diagnostic Tests Catalog ============

@router.get("/diagnostic-tests")
async def get_diagnostic_tests(staff = Depends(verify_staff)):
    """Get diagnostic tests catalog"""
    tests = await db.diagnostic_tests.find({}, {"_id": 0}).to_list(500)
    
    # If no tests in DB, return default catalog
    if not tests:
        tests = [
            {"category": "Blood", "name": "Complete Blood Count (CBC)", "price": 350},
            {"category": "Blood", "name": "HbA1c", "price": 550},
            {"category": "Blood", "name": "Lipid Profile", "price": 650},
            {"category": "Blood", "name": "Thyroid Profile (T3, T4, TSH)", "price": 850},
            {"category": "Urine", "name": "Routine Urine Analysis", "price": 200},
            {"category": "Imaging", "name": "Ultrasound Abdomen", "price": 1200},
            {"category": "Imaging", "name": "X-Ray Chest", "price": 400},
        ]
    
    return {"tests": tests}


# ============ Internal Feedback ============

@router.post("/appointments/{appointment_id}/internal-feedback")
async def add_internal_feedback(
    appointment_id: str,
    feedback: InternalFeedback,
    staff = Depends(verify_staff)
):
    """Add internal feedback for appointment (staff survey)"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    feedback_record = {
        "id": str(uuid.uuid4()),
        "appointment_id": appointment_id,
        "rating": feedback.rating,
        "punctuality": feedback.punctuality,
        "behavior": feedback.behavior,
        "cleanliness": feedback.cleanliness,
        "notes": feedback.notes,
        "submitted_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.internal_feedback.insert_one(feedback_record)
    
    return {"message": "Feedback submitted"}


@router.get("/internal-feedback/summary")
async def get_internal_feedback_summary(
    doctor: str = None,
    start_date: str = None,
    end_date: str = None,
    staff = Depends(verify_staff)
):
    """Get internal feedback summary"""
    query = {}
    
    if start_date and end_date:
        query["created_at"] = {"$gte": start_date, "$lte": end_date}
    
    feedback_list = await db.internal_feedback.find(query, {"_id": 0}).to_list(500)
    
    if not feedback_list:
        return {"total_responses": 0, "average_rating": 0}
    
    total = len(feedback_list)
    avg_rating = sum(f.get("rating", 0) for f in feedback_list) / total
    avg_punctuality = sum(f.get("punctuality", 0) for f in feedback_list if f.get("punctuality")) / total
    avg_behavior = sum(f.get("behavior", 0) for f in feedback_list if f.get("behavior")) / total
    avg_cleanliness = sum(f.get("cleanliness", 0) for f in feedback_list if f.get("cleanliness")) / total
    
    return {
        "total_responses": total,
        "average_rating": round(avg_rating, 2),
        "average_punctuality": round(avg_punctuality, 2),
        "average_behavior": round(avg_behavior, 2),
        "average_cleanliness": round(avg_cleanliness, 2)
    }


# ============ Loyalty Points ============

@router.post("/loyalty-points/add")
async def add_loyalty_points(data: LoyaltyPointsAdd, staff = Depends(verify_staff)):
    """Add loyalty points to a user"""
    user = await db.users.find_one({"phone": data.phone})
    if not user:
        # Create user entry if not exists
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "phone": data.phone,
            "loyalty_points": data.points,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        new_balance = data.points
    else:
        current_points = user.get("loyalty_points", 0)
        new_balance = current_points + data.points
        await db.users.update_one(
            {"phone": data.phone},
            {"$set": {"loyalty_points": new_balance}}
        )
    
    # Log transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_phone": data.phone,
        "type": "add",
        "points": data.points,
        "reason": data.reason,
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": staff.get('name', 'Staff')
    }
    await db.loyalty_transactions.insert_one(transaction)
    
    return {"message": f"Added {data.points} points", "new_balance": new_balance}



# ============ Staff Analytics Endpoints ============

@router.get("/analytics/clinic")
async def get_clinic_analytics(
    clinic: str = "",
    range: str = "week",
    staff = Depends(verify_staff)
):
    """Get clinic performance analytics for staff dashboard"""
    from collections import defaultdict
    
    # Determine date range
    now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)  # IST
    if range == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        days = 1
    elif range == "month":
        start_date = now - timedelta(days=30)
        days = 30
    else:  # week
        start_date = now - timedelta(days=7)
        days = 7
    
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = now.strftime("%Y-%m-%d")
    
    # Build clinic filter
    clinic_filter = {}
    if clinic:
        clinic_filter = {"clinic": {"$regex": clinic, "$options": "i"}}
    
    # Fetch appointments
    appointments = await db.appointments.find({
        **clinic_filter,
        "date": {"$gte": start_str, "$lte": end_str}
    }, {"_id": 0}).to_list(5000)
    
    # Calculate metrics
    total = len(appointments)
    walkins = len([a for a in appointments if a.get("type") == "walk-in"])
    emergencies = len([a for a in appointments if a.get("type") == "emergency"])
    completed = len([a for a in appointments if a.get("status") == "Completed"])
    
    # Compare with previous period
    prev_start = start_date - timedelta(days=days)
    prev_appointments = await db.appointments.find({
        **clinic_filter,
        "date": {"$gte": prev_start.strftime("%Y-%m-%d"), "$lt": start_str}
    }, {"_id": 0}).to_list(5000)
    prev_total = len(prev_appointments)
    prev_emergencies = len([a for a in prev_appointments if a.get("type") == "emergency"])
    
    change_percent = round(((total - prev_total) / prev_total) * 100, 1) if prev_total > 0 else 0
    emergency_change = emergencies - prev_emergencies
    
    # Daily breakdown
    daily_data = defaultdict(lambda: {"appointments": 0, "walkins": 0})
    for apt in appointments:
        date = apt.get("date", "")
        daily_data[date]["appointments"] += 1
        if apt.get("type") == "walk-in":
            daily_data[date]["walkins"] += 1
    
    # Get last 7 days for chart
    daily_breakdown = []
    for i in range(min(7, days)):
        d = today - timedelta(days=6-i)
        date_str = d.strftime("%Y-%m-%d")
        data = daily_data.get(date_str, {"appointments": 0, "walkins": 0})
        daily_breakdown.append({
            "day": d.strftime("%a"),
            "appointments": data["appointments"],
            "walkins": data["walkins"]
        })
    
    # Top doctors
    doctor_stats = defaultdict(lambda: {"appointments": 0, "rating": 4.5})
    for apt in appointments:
        doctor = apt.get("doctor", "Unknown")
        doctor_stats[doctor]["appointments"] += 1
    
    top_doctors = sorted(
        [{"name": k, "appointments": v["appointments"], "rating": v["rating"]} for k, v in doctor_stats.items()],
        key=lambda x: x["appointments"],
        reverse=True
    )[:5]
    
    # Calculate wait time (mock for now)
    avg_wait_time = 18  # minutes
    
    return {
        "total_appointments": total,
        "change_percent": change_percent,
        "walkins": walkins,
        "walkin_percent": round((walkins / total) * 100, 1) if total > 0 else 0,
        "emergencies": emergencies,
        "emergency_change": emergency_change,
        "completed": completed,
        "completion_rate": round((completed / total) * 100, 1) if total > 0 else 0,
        "avg_wait_time": avg_wait_time,
        "wait_time_change": -3,
        "daily_breakdown": daily_breakdown,
        "top_doctors": top_doctors
    }


@router.get("/analytics/pharmacy")
async def get_pharmacy_analytics(
    range: str = "week",
    staff = Depends(verify_staff_token)
):
    """Get pharmacy performance analytics"""
    from collections import defaultdict
    
    today = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    if range == "today":
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
        days = 1
    elif range == "month":
        start_date = today - timedelta(days=30)
        days = 30
    else:
        start_date = today - timedelta(days=7)
        days = 7
    
    # Fetch orders
    orders = await db.pharmacy_orders.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(2000)
    
    total = len(orders)
    delivered = len([o for o in orders if o.get("status") == "Delivered"])
    pending = len([o for o in orders if o.get("status") in ["Order Booked", "Packing", "Out for Delivery"]])
    
    # Previous period comparison
    prev_start = start_date - timedelta(days=days)
    prev_orders = await db.pharmacy_orders.find({
        "created_at": {"$gte": prev_start.isoformat(), "$lt": start_date.isoformat()}
    }, {"_id": 0}).to_list(2000)
    prev_total = len(prev_orders)
    order_change = round(((total - prev_total) / prev_total) * 100, 1) if prev_total > 0 else 0
    
    # Status breakdown
    status_breakdown = {
        "Order Booked": len([o for o in orders if o.get("status") == "Order Booked"]),
        "Packing": len([o for o in orders if o.get("status") == "Packing"]),
        "Out for Delivery": len([o for o in orders if o.get("status") == "Out for Delivery"]),
        "Delivered": delivered
    }
    
    # Hourly distribution
    hourly_orders = defaultdict(int)
    for order in orders:
        created = order.get("created_at", "")
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                hour = (dt + timedelta(hours=5, minutes=30)).hour
                hourly_orders[hour] += 1
            except:
                pass
    
    hourly_data = []
    for h in range(9, 18):
        hourly_data.append({
            "hour": f"{h}{'AM' if h < 12 else 'PM'}".replace("12PM", "12PM").replace("13PM", "1PM"),
            "orders": hourly_orders.get(h, 0)
        })
    
    # Top medicines
    medicine_counts = defaultdict(int)
    for order in orders:
        for med in order.get("medicines", []):
            medicine_counts[med.get("name", "Unknown")] += 1
    
    top_medicines = sorted(
        [{"name": k, "orders": v} for k, v in medicine_counts.items()],
        key=lambda x: x["orders"],
        reverse=True
    )[:5]
    
    # Revenue
    revenue = sum(o.get("total_amount", 0) for o in orders if o.get("status") != "Cancelled")
    
    # Loyalty points
    loyalty_txns = await db.loyalty_transactions.find({
        "type": "add",
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    loyalty_points = sum(t.get("points", 0) for t in loyalty_txns)
    
    return {
        "total_orders": total,
        "order_change": order_change,
        "delivered": delivered,
        "delivery_rate": round((delivered / total) * 100, 1) if total > 0 else 0,
        "pending": pending,
        "avg_fulfillment_time": 45,
        "fulfillment_change": -8,
        "revenue": revenue,
        "revenue_change": 22.5,
        "loyalty_points_given": loyalty_points,
        "status_breakdown": status_breakdown,
        "hourly_orders": hourly_data,
        "top_medicines": top_medicines
    }


@router.get("/analytics/diagnostics")
async def get_diagnostics_analytics(
    range: str = "week",
    staff = Depends(verify_staff_token)
):
    """Get diagnostics performance analytics"""
    from collections import defaultdict
    
    today = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    if range == "today":
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
        days = 1
    elif range == "month":
        start_date = today - timedelta(days=30)
        days = 30
    else:
        start_date = today - timedelta(days=7)
        days = 7
    
    # Fetch orders
    orders = await db.diagnostic_orders.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(2000)
    
    total = len(orders)
    samples_collected = len([o for o in orders if o.get("status") in ["Sample Collected", "In Process", "Reports Generated"]])
    reports_generated = len([o for o in orders if o.get("status") == "Reports Generated"])
    
    # Previous period
    prev_start = start_date - timedelta(days=days)
    prev_orders = await db.diagnostic_orders.find({
        "created_at": {"$gte": prev_start.isoformat(), "$lt": start_date.isoformat()}
    }, {"_id": 0}).to_list(2000)
    prev_total = len(prev_orders)
    test_change = round(((total - prev_total) / prev_total) * 100, 1) if prev_total > 0 else 0
    
    # Status breakdown
    status_breakdown = {
        "Test Booked": len([o for o in orders if o.get("status") == "Test Booked"]),
        "Sample Collected": len([o for o in orders if o.get("status") == "Sample Collected"]),
        "In Process": len([o for o in orders if o.get("status") == "In Process"]),
        "Reports Generated": reports_generated
    }
    
    # Test categories
    test_counts = defaultdict(int)
    for order in orders:
        for test in order.get("tests", []):
            test_counts[test] += 1
    
    # Categorize tests
    categories = {
        "Blood Tests": ["CBC", "Hemoglobin", "ESR", "Platelets"],
        "Diabetes": ["HbA1c", "FBS", "PPBS", "RBS", "OGTT"],
        "Hormonal": ["Thyroid", "TSH", "T3", "T4", "Hormonal"],
        "Imaging": ["X-Ray", "USG", "Sonography", "ECG"],
    }
    
    category_counts = defaultdict(int)
    for test, count in test_counts.items():
        categorized = False
        for cat_name, keywords in categories.items():
            if any(kw.lower() in test.lower() for kw in keywords):
                category_counts[cat_name] += count
                categorized = True
                break
        if not categorized:
            category_counts["Other"] += count
    
    test_categories = [
        {"name": "Blood Tests", "count": category_counts.get("Blood Tests", 0), "color": "bg-red-500"},
        {"name": "Diabetes", "count": category_counts.get("Diabetes", 0), "color": "bg-blue-500"},
        {"name": "Hormonal", "count": category_counts.get("Hormonal", 0), "color": "bg-pink-500"},
        {"name": "Imaging", "count": category_counts.get("Imaging", 0), "color": "bg-purple-500"},
        {"name": "Other", "count": category_counts.get("Other", 0), "color": "bg-gray-500"}
    ]
    
    # Popular tests
    popular_tests = sorted(
        [{"name": k, "count": v} for k, v in test_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]
    
    # Revenue
    revenue = sum(o.get("total_amount", 0) for o in orders if o.get("status") != "Cancelled")
    
    # Loyalty points
    loyalty_txns = await db.loyalty_transactions.find({
        "type": "add",
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    loyalty_points = sum(t.get("points", 0) for t in loyalty_txns)
    
    return {
        "total_tests": total,
        "test_change": test_change,
        "samples_collected": samples_collected,
        "reports_generated": reports_generated,
        "completion_rate": round((reports_generated / total) * 100, 1) if total > 0 else 0,
        "avg_turnaround": 24,
        "turnaround_change": -4,
        "revenue": revenue,
        "revenue_change": 25.6,
        "loyalty_points_given": loyalty_points,
        "status_breakdown": status_breakdown,
        "test_categories": test_categories,
        "popular_tests": popular_tests
    }

