"""
DiaGyn Staff Portal — Staff authentication dependency.
"""

from fastapi import Header, HTTPException
import jwt
from . import shared


async def verify_staff(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Staff authentication required")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, shared.JWT_SECRET, algorithms=[shared.JWT_ALGORITHM])
        role = payload.get("role", "")
        valid_roles = [
            "clinic_staff", "clinic_staff_pushpa", "clinic_staff_amnion",
            "doctor", "doctor_pushpa", "doctor_amnion", "diagyn_staff",
            "admin", "super_admin",
        ]
        is_valid = role in valid_roles or "staff" in role.lower() or "doctor" in role.lower()
        if not is_valid:
            raise HTTPException(status_code=403, detail="Staff access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
