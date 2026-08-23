"""
DiaGyn Staff Portal — Pydantic request models.
"""

from pydantic import BaseModel
from typing import List, Optional


class PatientLookup(BaseModel):
    mobile: str


class PatientRegister(BaseModel):
    name: str
    mobile: str
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None


class AppointmentBook(BaseModel):
    clinic: str
    doctor: str
    date: str
    time: Optional[str] = None
    patient_name: str
    patient_mobile: str
    patient_id: Optional[str] = None
    appointment_type: str = "SCHEDULED"
    notes: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: str
    fee_code: Optional[str] = None
    scan_codes: Optional[List[str]] = []
    total_amount: Optional[float] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class DoctorChargesRequest(BaseModel):
    fee_code: str
    scan_codes: Optional[List[str]] = []


class BookingCodeCheckIn(BaseModel):
    booking_code: str
    clinic: str = "Pushpa Clinic"


class DoctorFeeCollection(BaseModel):
    appointment_id: str
    fee_code: str
    scan_codes: Optional[List[str]] = []
    total_amount: float
    payment_method: str
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    send_receipt_whatsapp: bool = True


class BillingUpdate(BaseModel):
    fee_code: str
    scan_codes: Optional[List[str]] = []
    total_amount: Optional[float] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class BillingCloseRequest(BaseModel):
    appointment_id: str
    final_amount: float
    fee_code: Optional[str] = None
    scan_codes: Optional[List[str]] = []
    payment_method: Optional[str] = None
    medicine_amount: Optional[float] = 0
    misc_amount: Optional[float] = 0
    notes: Optional[str] = None


class PaymentCompleteRequest(BaseModel):
    order_id: str
