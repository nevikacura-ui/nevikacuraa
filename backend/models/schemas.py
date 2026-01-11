"""
Nevika Cura - Pydantic Models/Schemas
All data models for the application
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, EmailStr


# ============ User Models ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Optional[EmailStr] = None
    phone: str
    name: str
    loyalty_points: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GuestUser(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None


# ============ Appointment Models ============

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
    booking_type: str = "online"  # online, walk_in, emergency
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AppointmentCreate(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None


class WalkInAppointment(BaseModel):
    doctor: str
    clinic: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    date: Optional[str] = None


class EmergencyAppointment(BaseModel):
    doctor: str
    clinic: str
    patient_name: str
    patient_phone: str
    reason: Optional[str] = None


class AppointmentFeedback(BaseModel):
    rating: int  # 1-5 stars
    comment: Optional[str] = None


# ============ Diagnostic Models ============

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


class StaffDiagnosticOrderCreate(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    tests: List[str]
    preferred_date: str
    appointment_id: Optional[str] = None  # Link to appointment if add-on


# ============ Pharmacy Models ============

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
    points_used: int = 0
    discount_amount: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PharmacyOrderCreate(BaseModel):
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    points_used: Optional[int] = 0


# ============ OTP Models ============

class OTPRequest(BaseModel):
    phone: str
    service: str  # 'diagyn', 'proton', 'pharmacy'


class OTPVerify(BaseModel):
    phone: str
    otp: str
    service: str


class AuthOTPRequest(BaseModel):
    phone: str


class AuthOTPVerify(BaseModel):
    phone: str
    otp: str


class RegisterWithOTP(BaseModel):
    phone: str
    name: str
    email: Optional[EmailStr] = None
    verification_token: str


class LoginWithOTP(BaseModel):
    phone: str
    verification_token: str


# ============ Guest Session Models ============

class GuestSession(BaseModel):
    phone: str


# ============ Push Notification Models ============

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict
    user_id: Optional[str] = None


class PushNotificationPayload(BaseModel):
    title: str
    body: str
    url: Optional[str] = "/"
    tag: Optional[str] = None


# ============ Staff Models ============

class StaffCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str
    doctor_name: Optional[str] = None
    clinic: Optional[str] = None
    email: Optional[EmailStr] = None


class StaffLogin(BaseModel):
    username: str
    password: str


class StaffOrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


# ============ Service/Add-on Models ============

class AddServiceRequest(BaseModel):
    service_type: str  # 'blood_test', 'sonography', 'ecg'
    tests: Optional[List[str]] = None  # For blood tests
    notes: Optional[str] = None


class ServiceStatusUpdate(BaseModel):
    status: str  # pending, sample_collected, in_progress, completed
    result_notes: Optional[str] = None


# ============ Loyalty Points Models ============

class LoyaltyPointsAdd(BaseModel):
    phone: str
    points: int
    reason: Optional[str] = None


class LoyaltyPointsSubtract(BaseModel):
    phone: str
    points: int
    reason: Optional[str] = None


# ============ Patient Profile Models ============

class PatientProfile(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None


# ============ Admin Models ============

class AdminLogin(BaseModel):
    password: str


class AppointmentCancelRequest(BaseModel):
    doctor: str
    date: str
    reason: str


class SendCredentialsRequest(BaseModel):
    email: EmailStr
    staff_name: str
    username: str
    password: str
    role: str
