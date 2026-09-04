"""
DiaGyn Staff Portal — Shared state, constants, and configuration.
All mutable globals are set from server.py via the set_* functions in __init__.py.
"""

from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

# ── Mutable state (injected from server.py) ──────────────────────
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_whatsapp_notification = None
appointment_ws_manager = None

# ── IST offset ───────────────────────────────────────────────────
IST_OFFSET = timedelta(hours=5, minutes=30)

# ── Clinic configuration ─────────────────────────────────────────
# Amnion Clinic has been merged into Pushpa Clinic — Pushpa now handles
# all appointments for both doctors (Sep 2026).
CLINICS = {
    "Pushpa Clinic": {
        "doctors": ["Dr. Vikas Jha", "Dr. Neha Patel"],
        "address": "Pushpa Clinic, Naigaon East",
        "map_link": "https://maps.app.goo.gl/LfFoHwVzvMEQ1Qzt9",
    },
}

# ── Doctor schedule ───────────────────────────────────────────────
# Pushpa Clinic: 11:30 AM - 6:00 PM and 6:00 PM - 10:00 PM, Monday to Saturday, for both doctors.
DOCTOR_SCHEDULE = {
    "Dr. Vikas Jha": {
        "Pushpa Clinic": {
            "days": [0, 1, 2, 3, 4, 5],
            "morning": {"start": "11:30", "end": "18:00"},
            "evening": {"start": "18:00", "end": "22:00"},
        },
    },
    "Dr. Neha Patel": {
        "Pushpa Clinic": {
            "days": [0, 1, 2, 3, 4, 5],
            "morning": {"start": "11:30", "end": "18:00"},
            "evening": {"start": "18:00", "end": "22:00"},
        },
    },
}

# ── Fee codes ─────────────────────────────────────────────────────
FEE_CODES = {
    "Dr. Vikas Jha": {
        "NF": {"label": "No Fee (Follow-up)", "amount": 0},
        "G1": {"label": "General - New", "amount": 150},
        "G2": {"label": "General - Follow-up", "amount": 100},
        "D1": {"label": "Diabetes - New", "amount": 500},
        "D2": {"label": "Diabetes - Review", "amount": 400},
        "D3": {"label": "Diabetes - Follow-up", "amount": 300},
        "S1": {"label": "Speciality - New", "amount": 300},
        "S2": {"label": "Speciality - Follow-up", "amount": 200},
        "O1": {"label": "OBGYN - New", "amount": 500},
        "O2": {"label": "OBGYN - Review", "amount": 400},
        "O3": {"label": "OBGYN - Follow-up", "amount": 300},
    },
    "Dr. Neha Patel": {
        "NF": {"label": "No Fee", "amount": 0},
        "G1": {"label": "General - New", "amount": 150},
        "G2": {"label": "General - Follow-up", "amount": 100},
        "S1": {"label": "Speciality - New", "amount": 300},
        "S2": {"label": "Speciality - Follow-up", "amount": 200},
        "O1": {"label": "OBGYN - New", "amount": 500},
        "O2": {"label": "OBGYN - Review", "amount": 400},
        "O3": {"label": "OBGYN - Follow-up", "amount": 300},
    },
}

SCAN_FEES = {
    "ES": {"label": "Early Scan", "amount": 1000},
    "NT": {"label": "NT Scan", "amount": 1200},
    "GS": {"label": "Growth Scan", "amount": 1500},
    "FL": {"label": "Follicular", "amount": 200},
    "UP": {"label": "USG Pelvis", "amount": 1000},
    "UT": {"label": "UpT", "amount": 100},
}

# ── Google review links ──────────────────────────────────────────
GOOGLE_REVIEW_LINKS = {
    "Pushpa Clinic": "https://g.page/r/CZBa3QPJ_1lXECI/review",
    "Amnion Clinic": "https://g.page/r/CZyZHBaBV8i_EBI/review",
    "DiaGyn Healthcare": "https://g.page/r/CZBa3QPJ_1lXECI/review",
}
