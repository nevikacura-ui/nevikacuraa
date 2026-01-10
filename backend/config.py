"""
Nevika Cura - Configuration
Application constants, clinic data, inventory, and settings
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ============ ENVIRONMENT VARIABLES ============

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "nevikacura")
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")
JWT_ALGORITHM = "HS256"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "nevikacura2026")


# ============ WHATSAPP NUMBERS ============

DOCTOR_WHATSAPP_NUMBERS = {
    "Dr. Neha Patel": "9000000001",
    "Dr. Vikas Jha": "9000000002",
}

SIGNUP_WHATSAPP_NUMBER = "9000000003"
PHARMACY_WHATSAPP_NUMBER = "9000000004"
DIAGNOSTICS_WHATSAPP_NUMBER = "9000000005"


# ============ CLINIC CONFIGURATION ============

CLINICS = {
    "Pushpa Clinic": ["Dr. Neha Patel", "Dr. Vikas Jha"],
    "Amnion Clinic": ["Dr. Vikas Jha", "Dr. Neha Patel"]
}

# Doctor-to-Clinics mapping (which clinics each doctor works at)
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


# ============ APPOINTMENT STATUSES ============

APPOINTMENT_STATUSES = ["pending", "Booked", "In Clinic", "Completed", "Cancelled", "No Show"]
ACTIVE_STATUSES = ["pending", "Booked", "In Clinic", "Completed"]  # Used for slot blocking

DIAGNOSTIC_STATUSES = ["Test Booked", "Sample Collected", "Processing", "Report Ready", "Delivered"]
PHARMACY_STATUSES = ["Order Received", "Preparing", "Ready for Pickup", "Out for Delivery", "Delivered"]


# ============ EMAIL CONFIGURATION ============

EMAIL_FROM = "Nevika Cura <noreply@resend.dev>"
EMAIL_ADMIN = "admin@nevikacura.com"


# ============ FILE UPLOAD PATHS ============

UPLOAD_DIR = "/app/backend/uploads"
REPORTS_DIR = f"{UPLOAD_DIR}/reports"
BILLS_DIR = f"{UPLOAD_DIR}/bills"
PRESCRIPTIONS_DIR = f"{UPLOAD_DIR}/prescriptions"
