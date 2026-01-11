"""
Nevika Cura - Appointment Routes
Patient-facing appointment booking endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

router = APIRouter(tags=["Appointments"])

# Note: This file is prepared for future migration
# Currently, all routes remain in server.py for stability
# To migrate: Move route handlers here and import in server.py

# Endpoints to migrate:
# - POST /appointments - Create appointment
# - GET /appointments - Get user appointments  
# - GET /appointments/booked-slots - Get booked slots
# - POST /feedback/{token} - Submit appointment feedback
