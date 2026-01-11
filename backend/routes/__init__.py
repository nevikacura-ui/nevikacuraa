"""
Nevika Cura - Routes Package
All API route modules
"""

from .auth import router as auth_router
from .appointments import router as appointments_router
from .pharmacy import router as pharmacy_router
from .diagnostics import router as diagnostics_router
from .admin import router as admin_router
from .staff import router as staff_router
from .push import router as push_router

__all__ = [
    "auth_router",
    "appointments_router", 
    "pharmacy_router",
    "diagnostics_router",
    "admin_router",
    "staff_router",
    "push_router"
]
