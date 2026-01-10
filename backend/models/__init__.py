# Nevika Cura - Models
# This module contains Pydantic models for the application

from .schemas import (
    User, UserCreate, UserLogin, GuestUser,
    Appointment, AppointmentCreate,
    DiagnosticOrder, DiagnosticOrderCreate,
    PharmacyOrder, PharmacyOrderCreate,
    OTPRequest, OTPVerify
)

__all__ = [
    'User', 'UserCreate', 'UserLogin', 'GuestUser',
    'Appointment', 'AppointmentCreate',
    'DiagnosticOrder', 'DiagnosticOrderCreate',
    'PharmacyOrder', 'PharmacyOrderCreate',
    'OTPRequest', 'OTPVerify'
]
