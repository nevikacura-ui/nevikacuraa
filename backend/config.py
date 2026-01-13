"""
Nevika Cura - Configuration
Application constants, clinic data, and settings
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ============ ENVIRONMENT VARIABLES ============

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "nevikacura")
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")
JWT_ALGORITHM = "HS256"

# Email Configuration
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
NOTIFICATION_EMAIL = os.environ.get("NOTIFICATION_EMAIL", "nevikacura@gmail.com")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "Nevika Cura <onboarding@resend.dev>")

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")
TWILIO_WHATSAPP_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "")
TWILIO_VERIFY_SERVICE_SID = os.environ.get("TWILIO_VERIFY_SERVICE_SID", "")

# VAPID Configuration for Web Push
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "nevikacura@gmail.com")

# Google Drive Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_DRIVE_REDIRECT_URI = os.environ.get("GOOGLE_DRIVE_REDIRECT_URI", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://medcare-connect-12.preview.emergentagent.com")

# Admin Configuration
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "nevikacura2026")
SIGNUP_WHATSAPP_NUMBER = os.environ.get("SIGNUP_WHATSAPP_NUMBER", "9833188288")


# ============ WHATSAPP NUMBERS ============

DOCTOR_WHATSAPP_NUMBERS = {
    "Dr. Neha Patel": "917045266466",
    "Dr. Vikas Jha": "919930266466",
}


# ============ CLINIC CONFIGURATION ============

CLINICS = {
    "Pushpa Clinic": ["Dr. Neha Patel", "Dr. Vikas Jha"],
    "Amnion Clinic": ["Dr. Vikas Jha", "Dr. Neha Patel"]
}

# Doctor-to-Clinics mapping
DOCTOR_CLINICS = {
    "Dr. Neha Patel": ["Pushpa Clinic", "Amnion Clinic"],
    "Dr. Vikas Jha": ["Pushpa Clinic", "Amnion Clinic"]
}

# Doctor schedules per clinic
DOCTOR_SCHEDULES = {
    "Dr. Neha Patel": {
        "Pushpa Clinic": {
            "days": ["Monday", "Wednesday", "Friday", "Saturday"],
            "time": "10:00-14:00"
        },
        "Amnion Clinic": {
            "days": ["Tuesday", "Thursday"],
            "time": "16:00-20:00"
        }
    },
    "Dr. Vikas Jha": {
        "Pushpa Clinic": {
            "days": ["Monday", "Tuesday", "Thursday", "Saturday"],
            "time": "16:00-20:00"
        },
        "Amnion Clinic": {
            "days": ["Wednesday", "Friday"],
            "time": "10:00-14:00"
        }
    }
}


# ============ STAFF ROLES ============

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


# ============ STATUS CONFIGURATIONS ============

# Appointment Statuses
APPOINTMENT_STATUSES = ["Booked", "In Clinic", "Completed", "Cancelled", "No Show"]
ACTIVE_STATUSES = ["pending", "Booked", "In Clinic", "Completed"]

# Appointment Types
APPOINTMENT_TYPES = ["NORMAL", "EMERGENCY"]
MAX_EMERGENCY_PER_DOCTOR_PER_DAY = 10

# Pharmacy Order Statuses
PHARMACY_STATUSES = ["Order Booked", "Packing", "Out for Delivery", "Delivered"]

# Diagnostic Order Statuses
DIAGNOSTIC_STATUSES = ["Test Booked", "Sample Collected", "In Process", "Reports Generated"]

# Add-on Service Types
SERVICE_TYPES = ["BLOOD_TEST", "SONOGRAPHY", "ECG"]
SERVICE_STATUSES = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED"]


# ============ FILE UPLOAD PATHS ============

UPLOAD_DIR = "/app/backend/uploads"
REPORTS_DIR = f"{UPLOAD_DIR}/reports"
BILLS_DIR = f"{UPLOAD_DIR}/bills"
PRESCRIPTIONS_DIR = f"{UPLOAD_DIR}/prescriptions"
