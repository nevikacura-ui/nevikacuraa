"""
Face Recognition Attendance API
Uses face descriptors from face-api.js for biometric authentication
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import numpy as np
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

db = None

def set_db(database):
    global db
    db = database

# Pydantic models
class FaceRegistrationRequest(BaseModel):
    staff_id: str
    staff_name: str
    clinic: str
    face_descriptor: List[float]

class FaceVerificationRequest(BaseModel):
    face_descriptor: List[float]
    clinic: str
    action_type: str = "check_in"  # check_in or check_out

# Euclidean distance threshold for face matching
# Lower = stricter matching, Higher = more lenient
FACE_MATCH_THRESHOLD = 0.6

def calculate_euclidean_distance(descriptor1: List[float], descriptor2: List[float]) -> float:
    """Calculate Euclidean distance between two face descriptors."""
    arr1 = np.array(descriptor1, dtype=np.float64)
    arr2 = np.array(descriptor2, dtype=np.float64)
    return float(np.linalg.norm(arr1 - arr2))

def calculate_confidence(distance: float) -> float:
    """Convert distance to confidence percentage (0-100)."""
    if distance >= FACE_MATCH_THRESHOLD:
        return 0.0
    # Convert: 0 distance = 100% confidence, threshold distance = 0% confidence
    confidence = (1 - (distance / FACE_MATCH_THRESHOLD)) * 100
    return max(0.0, min(100.0, confidence))

@router.post("/register")
async def register_face(request: FaceRegistrationRequest):
    """Register a staff member's face for biometric attendance."""
    try:
        if not request.staff_id or not request.staff_name:
            raise HTTPException(status_code=400, detail="Staff ID and name are required")
        
        if not request.face_descriptor or len(request.face_descriptor) != 128:
            raise HTTPException(status_code=400, detail="Invalid face descriptor (must be 128 values)")
        
        # Check if staff already registered
        existing = await db.face_biometric_staff.find_one({
            "staff_id": request.staff_id,
            "clinic": request.clinic
        })
        
        staff_data = {
            "staff_id": request.staff_id,
            "staff_name": request.staff_name,
            "clinic": request.clinic,
            "face_descriptor": request.face_descriptor,
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        
        if existing:
            # Update existing registration
            await db.face_biometric_staff.update_one(
                {"_id": existing["_id"]},
                {"$set": staff_data}
            )
            logger.info(f"Updated face registration for {request.staff_name}")
        else:
            # New registration
            await db.face_biometric_staff.insert_one(staff_data)
            logger.info(f"New face registration for {request.staff_name}")
        
        return {
            "success": True,
            "message": f"Face registered for {request.staff_name}",
            "staff_id": request.staff_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/verify")
async def verify_face(request: FaceVerificationRequest):
    """Verify a face and record attendance."""
    try:
        if not request.face_descriptor or len(request.face_descriptor) != 128:
            raise HTTPException(status_code=400, detail="Invalid face descriptor")
        
        # Get all registered staff for this clinic
        registered_staff = await db.face_biometric_staff.find({
            "clinic": request.clinic,
            "is_active": True
        }).to_list(length=None)
        
        if not registered_staff:
            return {
                "verified": False,
                "message": "No registered staff found for this clinic"
            }
        
        # Find best match
        best_match = None
        best_distance = float('inf')
        
        for staff in registered_staff:
            stored_descriptor = staff.get("face_descriptor", [])
            if len(stored_descriptor) != 128:
                continue
            
            distance = calculate_euclidean_distance(
                request.face_descriptor, 
                stored_descriptor
            )
            
            if distance < best_distance:
                best_distance = distance
                best_match = staff
        
        # Check if match is within threshold
        if best_distance < FACE_MATCH_THRESHOLD and best_match:
            confidence = calculate_confidence(best_distance)
            
            # Record attendance
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            current_time = datetime.now(timezone.utc).strftime("%H:%M:%S")
            
            # Check for existing attendance record today
            existing_attendance = await db.face_attendance.find_one({
                "staff_id": best_match["staff_id"],
                "clinic": request.clinic,
                "date": today
            })
            
            if request.action_type == "check_in":
                if existing_attendance and existing_attendance.get("check_in"):
                    return {
                        "verified": True,
                        "staff_name": best_match["staff_name"],
                        "staff_id": best_match["staff_id"],
                        "message": f"Already checked in at {existing_attendance['check_in']}",
                        "confidence": confidence,
                        "action": "already_checked_in"
                    }
                
                if existing_attendance:
                    await db.face_attendance.update_one(
                        {"_id": existing_attendance["_id"]},
                        {"$set": {"check_in": current_time}}
                    )
                else:
                    await db.face_attendance.insert_one({
                        "staff_id": best_match["staff_id"],
                        "staff_name": best_match["staff_name"],
                        "clinic": request.clinic,
                        "date": today,
                        "check_in": current_time,
                        "check_out": None,
                        "confidence": confidence,
                        "verified_at": datetime.now(timezone.utc).isoformat()
                    })
                
                return {
                    "verified": True,
                    "staff_name": best_match["staff_name"],
                    "staff_id": best_match["staff_id"],
                    "message": f"Check-in successful at {current_time}",
                    "confidence": confidence,
                    "action": "check_in"
                }
            
            elif request.action_type == "check_out":
                if not existing_attendance or not existing_attendance.get("check_in"):
                    return {
                        "verified": True,
                        "staff_name": best_match["staff_name"],
                        "staff_id": best_match["staff_id"],
                        "message": "Please check-in first",
                        "confidence": confidence,
                        "action": "not_checked_in"
                    }
                
                if existing_attendance.get("check_out"):
                    return {
                        "verified": True,
                        "staff_name": best_match["staff_name"],
                        "staff_id": best_match["staff_id"],
                        "message": f"Already checked out at {existing_attendance['check_out']}",
                        "confidence": confidence,
                        "action": "already_checked_out"
                    }
                
                await db.face_attendance.update_one(
                    {"_id": existing_attendance["_id"]},
                    {"$set": {"check_out": current_time}}
                )
                
                return {
                    "verified": True,
                    "staff_name": best_match["staff_name"],
                    "staff_id": best_match["staff_id"],
                    "message": f"Check-out successful at {current_time}",
                    "confidence": confidence,
                    "action": "check_out"
                }
        
        # No match found
        return {
            "verified": False,
            "message": "Face not recognized. Please register first.",
            "distance": best_distance if best_distance != float('inf') else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Verification failed")

@router.get("/daily-report")
async def get_daily_report(clinic: str, date: Optional[str] = None):
    """Get daily attendance report for a clinic."""
    try:
        if not date:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        attendance = await db.face_attendance.find({
            "clinic": clinic,
            "date": date
        }).to_list(length=None)
        
        # Remove MongoDB _id
        for record in attendance:
            record.pop("_id", None)
        
        return {
            "success": True,
            "clinic": clinic,
            "date": date,
            "total": len(attendance),
            "attendance": attendance
        }
        
    except Exception as e:
        logger.error(f"Error getting daily report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get report")

@router.get("/registered-staff")
async def get_registered_staff(clinic: str):
    """Get list of registered staff for a clinic."""
    try:
        staff = await db.face_biometric_staff.find({
            "clinic": clinic,
            "is_active": True
        }, {"_id": 0, "face_descriptor": 0}).to_list(length=None)
        
        return {
            "success": True,
            "clinic": clinic,
            "total": len(staff),
            "staff": staff
        }
        
    except Exception as e:
        logger.error(f"Error getting registered staff: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get staff list")

@router.delete("/unregister/{staff_id}")
async def unregister_staff(staff_id: str, clinic: str):
    """Unregister a staff member's face."""
    try:
        result = await db.face_biometric_staff.update_one(
            {"staff_id": staff_id, "clinic": clinic},
            {"$set": {"is_active": False}}
        )
        
        if result.modified_count > 0:
            return {"success": True, "message": f"Staff {staff_id} unregistered"}
        else:
            raise HTTPException(status_code=404, detail="Staff not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unregistering staff: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unregister")
