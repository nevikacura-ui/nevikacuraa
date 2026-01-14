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
    time: str
    notes: Optional[str] = None

class EmergencyAppointment(BaseModel):
    doctor: str
    clinic: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    emergency_type: str
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
        'access_modules': staff.get('access_modules', []),
        'exp': datetime.now(timezone.utc) + timedelta(hours=12)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "token": token,
        "staff": {
            "id": staff.get('id', str(staff.get('_id', ''))),
            "name": staff.get('name'),
            "role": staff.get('role'),
            "clinic": staff.get('clinic'),
            "department": staff.get('department'),
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
        "appointment_type": "WALK-IN",
        "status": "In Clinic",
        "notes": data.notes,
        "created_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    return {"message": "Walk-in appointment created", "appointment": appointment}


# ============ Emergency Appointments ============

@router.post("/appointments/emergency")
async def create_emergency_appointment(data: EmergencyAppointment, staff = Depends(verify_staff)):
    """Create an emergency appointment"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    appointment = {
        "id": str(uuid.uuid4()),
        "doctor": data.doctor,
        "clinic": data.clinic,
        "date": today,
        "time": now_time,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "appointment_type": "EMERGENCY",
        "emergency_type": data.emergency_type,
        "status": "In Clinic",
        "notes": data.notes,
        "created_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    # Notify doctor if SMS is available
    if send_sms_notification:
        try:
            msg = f"EMERGENCY: {data.emergency_type}\nPatient: {data.patient_name}\nClinic: {data.clinic}\n- Nevika Cura Staff"
            # Send to clinic staff number
            await send_sms_notification("9833188288", msg)
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
    diagnosis: str = None,
    prescription: str = None,
    follow_up_days: int = None,
    consultation_fee: float = None,
    staff = Depends(verify_staff)
):
    """Mark appointment as completed by doctor with medical notes and send invoice"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = {
        "status": "Completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "completed_by": staff.get('name', 'Doctor')
    }
    
    if diagnosis:
        update_data["diagnosis"] = diagnosis
    if prescription:
        update_data["prescription"] = prescription
    if consultation_fee:
        update_data["consultation_fee"] = consultation_fee
    if follow_up_days:
        follow_up_date = (datetime.now(timezone.utc) + timedelta(days=follow_up_days)).strftime("%Y-%m-%d")
        update_data["follow_up_date"] = follow_up_date
        update_data["follow_up_days"] = follow_up_days
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    # Generate and send invoice email
    invoice_sent = False
    patient_email = appointment.get("patient_email")
    if patient_email and send_email_notification:
        try:
            invoice_date = datetime.now().strftime("%d %b %Y")
            invoice_number = f"INV-{appointment_id[:8].upper()}"
            fee = consultation_fee or appointment.get("consultation_fee", 500)
            
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
                
                <div style="background: white; padding: 25px; border: 1px solid #e2e8f0; border-top: none;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Description</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Consultation Fee</td>
                                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">₹{fee:.2f}</td>
                            </tr>
                            <tr style="font-weight: bold; background: #f8fafc;">
                                <td style="padding: 12px;">Total</td>
                                <td style="padding: 12px; text-align: right; color: #6366f1;">₹{fee:.2f}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                {f'<div style="background: #fef3c7; padding: 15px; border: 1px solid #f59e0b; border-radius: 8px; margin-top: 20px;"><strong>Diagnosis:</strong> {diagnosis}</div>' if diagnosis else ''}
                
                {f'<div style="background: #dbeafe; padding: 15px; border: 1px solid #3b82f6; border-radius: 8px; margin-top: 15px;"><strong>Prescription:</strong><br>{prescription}</div>' if prescription else ''}
                
                {f'<div style="background: #dcfce7; padding: 15px; border: 1px solid #22c55e; border-radius: 8px; margin-top: 15px;"><strong>Follow-up:</strong> Please schedule a follow-up appointment after {follow_up_days} days ({follow_up_date})</div>' if follow_up_days else ''}
                
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
