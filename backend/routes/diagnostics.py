"""
Nevika Cura - Diagnostics Routes
Patient-facing diagnostic test booking endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

router = APIRouter(tags=["Diagnostics"])

# Note: This file is prepared for future migration
# Currently, all routes remain in server.py for stability

# Endpoints to migrate:
# - POST /diagnostics - Create diagnostic order
# - GET /diagnostics - Get user orders
# - GET /diagnostic-tests - Get available tests
# - GET /orders/diagnostic/{id}/track - Track order
