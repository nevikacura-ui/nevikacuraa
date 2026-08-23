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
CLINICS = {
    "Pushpa Clinic": {
        "doctors": ["Dr. Vikas Jha"],
        "address": "Pushpa Clinic, Naigaon East",
        "map_link": "https://maps.app.goo.gl/LfFoHwVzvMEQ1Qzt9",
    },
    "Amnion Clinic": {
        "doctors": ["Dr. Neha Patel"],
        "address": "Amnion Clinic, Naigaon",
        "map_link": "https://maps.app.goo.gl/aBr4jwCv3b6874vi8",
    },
}

# ── Doctor schedule ───────────────────────────────────────────────
DOCTOR_SCHEDULE = {
    "Dr. Vikas Jha": {
        "Pushpa Clinic": {
            "days": [0, 2, 4],
            "evening": {"start": "18:00", "end": "22:00"},
        },
        "Amnion Clinic": {
            "days": [0, 1, 2, 3, 4, 5],
            "morning": {"start": "11:00", "end": "14:00"},
            "evening": {"start": "18:00", "end": "22:00", "days": [1, 3, 5]},
        },
    },
    "Dr. Neha Patel": {
        "Pushpa Clinic": {
            "days": [0, 1, 2, 3, 4, 5],
            "morning": {"start": "11:00", "end": "14:00"},
            "evening": {"start": "18:00", "end": "22:00", "days": [1, 3, 5]},
        },
        "Amnion Clinic": {
            "days": [0, 2, 4],
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
