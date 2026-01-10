"""
Nevika Cura - Pydantic Schemas
All data models for the healthcare application
"""

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


# ============ USER MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GuestUser(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None


# ============ APPOINTMENT MODELS ============

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    status: str = "pending"
    appointment_type: Optional[str] = None  # 'EMERGENCY' or None for normal
    booking_type: Optional[str] = None  # 'walk_in', 'online', etc.
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AppointmentCreate(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None


# ============ DIAGNOSTIC ORDER MODELS ============

class DiagnosticOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    tests: List[str]
    prescription_url: Optional[str] = None
    preferred_date: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    clinic_name: Optional[str] = None  # For service-linked orders
    doctor_name: Optional[str] = None  # For service-linked orders
    status: str = "pending"
    report_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DiagnosticOrderCreate(BaseModel):
    tests: List[str]
    prescription_url: Optional[str] = None
    preferred_date: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None


# ============ PHARMACY ORDER MODELS ============

class PharmacyOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    status: str = "pending"
    bill_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PharmacyOrderCreate(BaseModel):
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None


# ============ OTP MODELS ============

class OTPRequest(BaseModel):
    phone: str
    service: str  # 'diagyn', 'proton', 'pharmacy'


class OTPVerify(BaseModel):
    phone: str
    otp: str
    service: str


# ============ STAFF MODELS ============

class StaffLogin(BaseModel):
    username: str
    password: str


class WalkInAppointment(BaseModel):
    doctor: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    clinic: Optional[str] = None


class EmergencyAppointment(BaseModel):
    doctor: str
    patient_name: str
    patient_phone: str
    clinic: Optional[str] = None
    notes: Optional[str] = None


# ============ ORDER STATUS MODELS ============

class PharmacyOrderStatusUpdate(BaseModel):
    status: str
    bill_url: Optional[str] = None


class DiagnosticOrderStatusUpdate(BaseModel):
    status: str
    report_url: Optional[str] = None


class StaffOrderStatusUpdate(BaseModel):
    status: str
