"""
Token Announcer API
Manages token numbers for patient queue management.
Tokens reset daily. Supports multiple departments.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/tokens", tags=["Token Announcer"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "nevikacura")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
tokens_col = db["tokens"]


class TokenResponse(BaseModel):
    token_number: int
    department: str
    date: str
    updated_at: str


class CallTokenRequest(BaseModel):
    department: Optional[str] = "general"


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_or_create_token(department: str = "general"):
    date = today_str()
    doc = await tokens_col.find_one(
        {"department": department, "date": date},
        {"_id": 0}
    )
    if not doc:
        doc = {
            "department": department,
            "date": date,
            "current_token": 0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await tokens_col.insert_one(doc)
        doc.pop("_id", None)
    return doc


@router.get("/current")
async def get_current_token(department: str = "general"):
    doc = await get_or_create_token(department)
    return {
        "token_number": doc["current_token"],
        "department": department,
        "date": doc["date"],
        "updated_at": doc.get("updated_at", "")
    }


@router.post("/next")
async def call_next_token(req: CallTokenRequest):
    department = req.department or "general"
    date = today_str()

    result = await tokens_col.find_one_and_update(
        {"department": department, "date": date},
        {
            "$inc": {"current_token": 1},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {"department": department, "date": date}
        },
        upsert=True,
        return_document=True
    )

    return {
        "token_number": result["current_token"],
        "department": department,
        "date": date,
        "updated_at": result["updated_at"]
    }


@router.post("/reset")
async def reset_tokens(req: CallTokenRequest):
    department = req.department or "general"
    date = today_str()

    await tokens_col.update_one(
        {"department": department, "date": date},
        {
            "$set": {
                "current_token": 0,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {
        "token_number": 0,
        "department": department,
        "date": date,
        "message": "Tokens reset successfully"
    }


@router.post("/set")
async def set_token(department: str = "general", token_number: int = 0):
    date = today_str()
    await tokens_col.update_one(
        {"department": department, "date": date},
        {
            "$set": {
                "current_token": token_number,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {
        "token_number": token_number,
        "department": department,
        "date": date,
        "message": f"Token set to {token_number}"
    }
