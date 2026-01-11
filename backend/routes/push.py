"""
Nevika Cura - Push Notification Routes
Web push notification endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

router = APIRouter(prefix="/push", tags=["Push Notifications"])

# Note: This file is prepared for future migration
# Currently, all routes remain in server.py for stability

# Endpoints to migrate:
# - GET /push/vapid-public-key - Get VAPID public key
# - POST /push/subscribe - Subscribe to push
# - POST /push/unsubscribe - Unsubscribe from push
# - POST /push/test - Test push notification
