"""
Service Routes - Extracted from server.py
Includes: Service OTP (send/verify/resend), booking code verification,
Google Drive connect/callback, file upload, pharmacy legacy endpoints,
admin test data cleanup.
"""
import os
import io
import uuid
import random
import logging
import jwt
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from pydantic import BaseModel

from utils.auth_utils import (
    User, JWT_SECRET, JWT_ALGORITHM,
    get_current_user, get_current_user_optional, get_db
)

logger = logging.getLogger("server")
router = APIRouter(tags=["Services"])

# In-memory OTP storage for service login
otp_storage = {}

_deps = {}

def set_deps(deps: dict):
    global _deps
    _deps = deps


def generate_otp():
    return str(random.randint(100000, 999999))


# ============ Pydantic Models ============

class OTPRequest(BaseModel):
    phone: str
    service: str

class OTPVerify(BaseModel):
    phone: str
    otp: str
    service: str

class BookingCodeVerifyRequest(BaseModel):
    booking_id: str
    code: str
    verified_by: Optional[str] = None
    verifier_role: Optional[str] = None
    booking_type: Optional[str] = "diagyn"


# ============ OTP Endpoints (WhatsApp OTP via MSG91) ============

@router.post("/otp/send")
async def send_otp(request: OTPRequest):
    """Send OTP for service login via WhatsApp (MSG91)"""
    phone = request.phone.strip().replace("+91", "").replace(" ", "")[-10:]
    service = request.service.lower()

    if not phone or len(phone) != 10:
        raise HTTPException(status_code=400, detail="Invalid phone number. Please enter 10 digits.")

    if service not in ['diagyn', 'proton', 'pharmacy', 'evara', 'glydex', 'alyne']:
        raise HTTPException(status_code=400, detail="Invalid service")

    otp = generate_otp()
    otp_key = f"{phone}_{service}"
    otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }

    msg91_sent = False
    msg91_auth_key = os.getenv("MSG91_AUTH_KEY")
    send_msg91_whatsapp = _deps.get("send_msg91_whatsapp")
    if msg91_auth_key and send_msg91_whatsapp:
        try:
            msg91_response = await send_msg91_whatsapp(
                phone=f"91{phone}",
                template_name="otp_verification",
                variables={"otp": otp}
            )
            if msg91_response:
                msg91_sent = True
                logger.info(f"Service login WhatsApp OTP sent via MSG91 to {phone} ({service})")
        except Exception as e:
            logger.warning(f"MSG91 WhatsApp OTP failed for {phone}: {e}")

    if not msg91_sent:
        raise HTTPException(status_code=503, detail="OTP service unavailable. Please try again later.")

    return {
        "success": True,
        "message": "OTP sent via WhatsApp",
        "expires_in": 300,
        "phone": phone,
        "method": "whatsapp"
    }


@router.post("/otp/verify")
async def verify_otp(request: OTPVerify):
    """Verify OTP for service login"""
    phone = request.phone.strip().replace("+91", "").replace(" ", "")[-10:]
    otp = request.otp.strip()
    service = request.service.lower()

    otp_key = f"{phone}_{service}"

    if otp_key not in otp_storage:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")

    stored_data = otp_storage[otp_key]

    if datetime.now(timezone.utc) > stored_data["expires_at"]:
        del otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")

    if stored_data.get("attempts", 0) >= 3:
        del otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    if stored_data.get("otp") != otp:
        otp_storage[otp_key]["attempts"] = stored_data.get("attempts", 0) + 1
        remaining = 3 - otp_storage[otp_key]["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")

    del otp_storage[otp_key]

    verification_token = jwt.encode({
        'phone': phone,
        'service': service,
        'verified': True,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=30)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    logger.info(f"OTP verified successfully for {phone} ({service})")

    return {
        "success": True,
        "message": "OTP verified successfully",
        "verification_token": verification_token,
        "method": "whatsapp"
    }


@router.post("/otp/resend")
async def resend_otp(request: OTPRequest):
    """Resend OTP to phone number"""
    return await send_otp(request)


# ============ BOOKING ID VERIFICATION ============

@router.post("/booking-code/verify")
async def verify_booking_code_endpoint(request: BookingCodeVerifyRequest):
    """Verify Booking ID for check-in, sample collection, or delivery."""
    from services.booking_otp import verify_booking_code
    db = get_db()

    result = await verify_booking_code(
        db=db,
        booking_id=request.booking_id,
        entered_code=request.code,
        verified_by=request.verified_by,
        verifier_role=request.verifier_role,
        booking_type=request.booking_type or "diagyn"
    )

    return result


# ============ Google Drive Connect/Callback ============

@router.get("/drive/connect")
async def connect_drive(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        from google_auth_oauthlib.flow import Flow
        redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=['https://www.googleapis.com/auth/drive.file'],
            redirect_uri=redirect_uri
        )

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=user.id
        )

        logger.info(f"Drive OAuth initiated for user {user.id}")
        return {"authorization_url": authorization_url}

    except Exception as e:
        logger.error(f"Failed to initiate OAuth: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate OAuth: {str(e)}")


@router.get("/drive/callback")
async def drive_callback(code: str = Query(...), state: str = Query(...)):
    try:
        from google_auth_oauthlib.flow import Flow
        from starlette.responses import RedirectResponse
        db = get_db()
        redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=None,
            redirect_uri=redirect_uri
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        logger.info(f"Drive credentials obtained for user {state}, scopes: {credentials.scopes}")

        required_scopes = {"https://www.googleapis.com/auth/drive.file"}
        granted_scopes = set(credentials.scopes or [])
        if not required_scopes.issubset(granted_scopes):
            missing = required_scopes - granted_scopes
            logger.error(f"Missing required Drive scopes: {missing}")
            raise HTTPException(status_code=400, detail=f"Missing required Drive scopes: {', '.join(missing)}")

        await db.drive_credentials.update_one(
            {"user_id": state},
            {"$set": {
                "user_id": state,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes,
                "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

        logger.info(f"Drive credentials stored for user {state}")

        frontend_url = os.getenv("FRONTEND_URL", os.getenv("REACT_APP_BACKEND_URL", "").replace("/api", ""))
        return RedirectResponse(url=f"{frontend_url}?drive_connected=true")

    except Exception as e:
        logger.error(f"OAuth callback failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")


async def get_drive_service(user_id: str):
    db = get_db()
    creds_doc = await db.drive_credentials.find_one({"user_id": user_id}, {"_id": 0})
    if not creds_doc:
        return None

    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request as GoogleRequest
        from googleapiclient.discovery import build

        creds = Credentials(
            token=creds_doc["access_token"],
            refresh_token=creds_doc.get("refresh_token"),
            token_uri=creds_doc["token_uri"],
            client_id=creds_doc["client_id"],
            client_secret=creds_doc["client_secret"],
            scopes=creds_doc["scopes"]
        )

        if creds.expired and creds.refresh_token:
            logger.info(f"Refreshing expired token for user {user_id}")
            creds.refresh(GoogleRequest())

            await db.drive_credentials.update_one(
                {"user_id": user_id},
                {"$set": {
                    "access_token": creds.token,
                    "expiry": creds.expiry.isoformat() if creds.expiry else None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )

        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        logger.warning(f"Drive service init failed: {e}")
        return None


# ============ File Upload ============

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: Optional[str] = None):
    try:
        if user_id:
            drive_service = await get_drive_service(user_id)
            if drive_service:
                from googleapiclient.http import MediaIoBaseUpload
                file_content = await file.read()
                file_stream = io.BytesIO(file_content)

                file_metadata = {
                    'name': file.filename,
                    'mimeType': file.content_type
                }

                media = MediaIoBaseUpload(file_stream, mimetype=file.content_type, resumable=True)
                uploaded_file = drive_service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id, webViewLink'
                ).execute()

                drive_service.permissions().create(
                    fileId=uploaded_file['id'],
                    body={'type': 'anyone', 'role': 'reader'}
                ).execute()

                file_url = uploaded_file.get('webViewLink', f"https://drive.google.com/file/d/{uploaded_file['id']}/view")
                logger.info(f"File uploaded to Google Drive: {file_url}")
                return {"url": file_url, "file_id": uploaded_file['id']}

        file_content = await file.read()
        encoded_file = f"data:{file.content_type};base64,{io.BytesIO(file_content).read().hex()}"
        logger.info("File stored as base64 (fallback)")
        return {"url": encoded_file, "file_id": None}

    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), type: Optional[str] = "general"):
    """Upload an image and return a data URL"""
    try:
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed")

        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size must be less than 5MB")

        encoded = base64.b64encode(file_content).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{encoded}"

        logger.info(f"Image uploaded: type={type}, size={len(file_content)} bytes")
        return {"url": data_url, "size": len(file_content), "type": type}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


# ============ Pharmacy Legacy Endpoints ============

@router.get("/pharmacy/inventory-legacy")
async def get_pharmacy_inventory_legacy(search: Optional[str] = None, form: Optional[str] = None, limit: int = 5000):
    """Legacy endpoint - use /api/pharmacy/inventory instead with staff auth"""
    MEDICINE_INVENTORY = _deps.get("MEDICINE_INVENTORY", [])
    inventory = MEDICINE_INVENTORY.copy()

    if search:
        search_lower = search.lower()
        inventory = [m for m in inventory if search_lower in m["name"].lower()]

    if form:
        form_lower = form.lower()
        inventory = [m for m in inventory if form_lower in m["form"].lower()]

    limited_inventory = inventory[:limit]
    return {"medicines": limited_inventory, "total": len(inventory), "showing": len(limited_inventory)}


@router.get("/pharmacy/autocomplete")
async def autocomplete_medicine(q: str = "", limit: int = 10):
    """Autocomplete endpoint for medicine search - uses DB"""
    if not q or len(q) < 2:
        return {"suggestions": []}

    db = get_db()
    try:
        results = await db.medicines.find(
            {"name": {"$regex": f"^{q}", "$options": "i"}},
            {"_id": 0, "name": 1, "unit": 1, "manufacturer": 1, "mrp": 1, "category": 1}
        ).sort("name", 1).limit(limit).to_list(limit)

        suggestions = [{"name": r["name"], "form": r.get("unit", "Other"), "manufacturer": r.get("manufacturer", ""), "mrp": r.get("mrp", 0), "category": r.get("category", "")} for r in results]
        return {"suggestions": suggestions}
    except Exception:
        pass

    MEDICINE_INVENTORY = _deps.get("MEDICINE_INVENTORY", [])
    query_lower = q.lower()
    suggestions = []
    for m in MEDICINE_INVENTORY:
        if query_lower in m["name"].lower():
            suggestions.append({"name": m["name"], "form": m["form"]})
            if len(suggestions) >= limit:
                break
    return {"suggestions": suggestions}


@router.get("/pharmacy/forms")
async def get_medicine_forms():
    """Get all unique medicine forms for filtering"""
    db = get_db()
    try:
        forms = await db.medicines.distinct("unit")
        forms = [f for f in forms if f]
        forms.sort()
        return {"forms": forms}
    except Exception:
        MEDICINE_INVENTORY = _deps.get("MEDICINE_INVENTORY", [])
        forms = list(set(m["form"] for m in MEDICINE_INVENTORY))
        forms.sort()
        return {"forms": forms}


# ============ Test Data Cleanup ============

@router.delete("/admin/cleanup-test-data")
async def cleanup_test_data():
    """Delete all test appointments and orders created during software testing."""
    db = get_db()
    results = {"appointments_deleted": 0, "orders_deleted": 0, "details": []}

    test_apt_filter = {
        "$or": [
            {"patient_name": {"$regex": "^TEST_", "$options": "i"}},
            {"patient_name": {"$regex": "Token.?Test", "$options": "i"}},
            {"patient_name": {"$regex": "test.?patient", "$options": "i"}},
        ]
    }
    test_apts = await db.appointments.find(test_apt_filter, {"_id": 0, "patient_name": 1, "date": 1}).to_list(500)
    if test_apts:
        del_result = await db.appointments.delete_many(test_apt_filter)
        results["appointments_deleted"] = del_result.deleted_count
        results["details"].extend([f"Deleted apt: {a.get('patient_name')}" for a in test_apts])

    test_order_filter = {
        "$or": [
            {"customer_name": {"$regex": "^TEST_", "$options": "i"}},
            {"patient_name": {"$regex": "^TEST_", "$options": "i"}},
        ]
    }
    test_orders = await db.pharmacy_orders.find(test_order_filter, {"_id": 0, "customer_name": 1}).to_list(500)
    if test_orders:
        del_result = await db.pharmacy_orders.delete_many(test_order_filter)
        results["orders_deleted"] = del_result.deleted_count

    test_diag_filter = {
        "$or": [
            {"patient_name": {"$regex": "^TEST_", "$options": "i"}},
        ]
    }
    test_diags = await db.diagnostic_orders.find(test_diag_filter, {"_id": 0, "patient_name": 1}).to_list(500)
    if test_diags:
        del_result = await db.diagnostic_orders.delete_many(test_diag_filter)
        results["orders_deleted"] += del_result.deleted_count

    return {
        "status": "success",
        "message": f"Cleaned up {results['appointments_deleted']} test appointments and {results['orders_deleted']} test orders",
        **results
    }
