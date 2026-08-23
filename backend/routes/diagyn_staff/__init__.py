"""
DiaGyn Staff Portal — Package init.

Re-exports the single `router` and all `set_*` helpers so that server.py
and chatbot_api.py continue to import from `routes.diagyn_staff` unchanged.
"""

from fastapi import APIRouter

from . import shared
from .utils import (                       # noqa: F401 — re-exported for chatbot_api.py
    get_slots_for_doctor_clinic_date,
    get_ist_now,
    get_ist_date,
    get_ist_datetime,
    normalize_time_to_24h,
    format_time_for_display,
    generate_time_slots_for_session,
    get_current_ist_session,
    TIME_SLOTS,
)

# Re-export constants used by chatbot_api.py
DOCTOR_SCHEDULE = shared.DOCTOR_SCHEDULE       # noqa: F811
CLINICS = shared.CLINICS                       # noqa: F811
FEE_CODES = shared.FEE_CODES                  # noqa: F811
SCAN_FEES = shared.SCAN_FEES                   # noqa: F811
GOOGLE_REVIEW_LINKS = shared.GOOGLE_REVIEW_LINKS  # noqa: F811

# ── Sub-routers ──────────────────────────────────────────────────
from .patients import router as _patients          # noqa: E402
from .slots import router as _slots                # noqa: E402
from .appointments import router as _appointments  # noqa: E402
from .billing import router as _billing            # noqa: E402
from .summary import router as _summary            # noqa: E402
from .reviews import router as _reviews            # noqa: E402
from .checkin import router as _checkin            # noqa: E402
from .payments import router as _payments          # noqa: E402
from .queue import router as _queue                # noqa: E402

# Main router — same prefix + tags the old monolith had
router = APIRouter(prefix="/diagyn-staff", tags=["DiaGyn Staff Portal"])

router.include_router(_patients)
router.include_router(_slots)
router.include_router(_appointments)
router.include_router(_billing)
router.include_router(_summary)
router.include_router(_reviews)
router.include_router(_checkin)
router.include_router(_payments)
router.include_router(_queue)


# ── Dependency-injection helpers (called from server.py) ─────────

def set_db(database):
    shared.db = database


def set_jwt_config(secret, algorithm="HS256"):
    shared.JWT_SECRET = secret
    shared.JWT_ALGORITHM = algorithm


def set_whatsapp_func(func):
    shared.send_whatsapp_notification = func


def set_appointment_manager(manager):
    shared.appointment_ws_manager = manager
