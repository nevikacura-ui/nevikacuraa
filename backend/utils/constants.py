"""
Shared constants and Pydantic models used across multiple route files.
Extracted from server.py for cleaner imports.
"""
import os
from typing import Optional, List
from pydantic import BaseModel, EmailStr

# Admin Configuration
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'nevikacura2026')

STAFF_ROLES = {
    "super_admin": "Super Admin - Full Access (Owner)",
    "doctor": "Doctor - Multi-Clinic Access",
    "doctor_pushpa": "Doctor - Pushpa Clinic (Legacy)",
    "doctor_amnion": "Doctor - Amnion Clinic (Legacy)",
    "clinic_staff_pushpa": "Clinic Staff - Pushpa Clinic",
    "clinic_staff_amnion": "Clinic Staff - Amnion Clinic",
    "pharmacy_staff": "Pharmacy Staff - Orange Pharmacy",
    "diagnostics_staff": "Diagnostics Staff - Proton Diagnostics"
}

CLINICS = {
    "Pushpa Clinic": ["Dr. Neha Patel", "Dr. Vikas Jha"]
}

DOCTOR_CLINICS = {
    "Dr. Neha Patel": ["Pushpa Clinic"],
    "Dr. Vikas Jha": ["Pushpa Clinic"]
}

APPOINTMENT_STATUSES = ["Booked", "In Clinic", "Completed", "Cancelled", "No Show"]
APPOINTMENT_TYPES = ["NORMAL", "EMERGENCY"]
MAX_EMERGENCY_PER_DOCTOR_PER_DAY = 10
PHARMACY_STATUSES = ["Order Booked", "Packing", "Out for Delivery", "Delivered"]
DIAGNOSTIC_STATUSES = ["Test Booked", "Sample Collected", "In Process", "Reports Generated"]
SERVICE_TYPES = ["BLOOD_TEST", "SONOGRAPHY", "ECG"]
SERVICE_STATUSES = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED"]


# ============ Pydantic Models ============

class AdminLogin(BaseModel):
    password: str

class StaffCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str
    doctor_name: Optional[str] = None
    clinic: Optional[str] = None

class StaffLogin(BaseModel):
    username: str
    password: str

class WalkInAppointment(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str

class AppointmentStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class StaffOrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class StaffDiagnosticOrderCreate(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    age: Optional[str] = None
    sex: Optional[str] = None
    tests: List[str]
    notes: Optional[str] = None

class EmergencyAppointment(BaseModel):
    doctor: str
    clinic: str
    date: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None

class AddServiceRequest(BaseModel):
    service_type: str
    service_details: Optional[str] = None
    specific_tests: Optional[List[str]] = None

class ServiceStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class GuestUser(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
