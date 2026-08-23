"""
Smart Cross-Sell Engine
Rules-based recommendation engine that suggests relevant services across
DiaGyn, Mango Labs, and Orange Pharmacy based on patient context.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/cross-sell", tags=["Cross-Sell Engine"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============ Cross-Sell Rules ============

CROSS_SELL_RULES = {
    # DiaGyn triggers
    "diagyn_pregnancy": {
        "trigger_keywords": ["pregnancy", "antenatal", "prenatal", "anc", "obgyn", "ob-gyn", "gynec"],
        "suggestions": [
            {
                "service": "mango",
                "type": "lab_test",
                "title": "ANC Lab Package",
                "description": "Complete Ante Natal Care blood work",
                "price": 1950,
                "priority": 1,
                "cta_route": "/mango?tests=ANC%20(Ante%20Natal%20Profile)&from=crosssell"
            },
            {
                "service": "mango",
                "type": "lab_test",
                "title": "Dual Marker Test",
                "description": "First trimester screening for chromosomal abnormalities",
                "price": 2000,
                "priority": 2,
                "cta_route": "/mango?tests=Dual%20/%20Double%20Marker&from=crosssell"
            },
            {
                "service": "pharmacy",
                "type": "product",
                "title": "Prenatal Vitamins & Supplements",
                "description": "Folic Acid, Iron, Calcium — doctor recommended",
                "price": 350,
                "priority": 3,
                "cta_route": "/pharmacy?category=prenatal&from=crosssell"
            }
        ]
    },
    "diagyn_diabetes": {
        "trigger_keywords": ["diabetes", "sugar", "glucose", "hba1c", "insulin"],
        "suggestions": [
            {
                "service": "mango",
                "type": "lab_test",
                "title": "Diabetes Screening Package",
                "description": "FBS + PPBS + HbA1c + Lipid Profile",
                "price": 600,
                "priority": 1,
                "cta_route": "/mango?tests=Diabetes%20Screening&from=crosssell"
            },
            {
                "service": "pharmacy",
                "type": "product",
                "title": "Glucometer & Strips",
                "description": "Monitor blood sugar at home daily",
                "price": 899,
                "priority": 2,
                "cta_route": "/pharmacy?category=diabetes&from=crosssell"
            }
        ]
    },
    "diagyn_thyroid": {
        "trigger_keywords": ["thyroid", "tsh", "hypothyroid", "hyperthyroid"],
        "suggestions": [
            {
                "service": "mango",
                "type": "lab_test",
                "title": "Thyroid Profile",
                "description": "T3, T4, TSH — Complete thyroid function",
                "price": 550,
                "priority": 1,
                "cta_route": "/mango?tests=Thyroid%20Profile%20-%20Free&from=crosssell"
            }
        ]
    },
    # Mango Labs triggers
    "mango_diabetes": {
        "trigger_keywords": ["hba1c", "fbs", "ppbs", "blood sugar", "diabetes screening", "ogtt", "insulin"],
        "suggestions": [
            {
                "service": "diagyn",
                "type": "consultation",
                "title": "Diabetes Consultation",
                "description": "Discuss your results with our specialist",
                "price": 500,
                "priority": 1,
                "cta_route": "/diagyn?reason=diabetes&from=crosssell"
            },
            {
                "service": "pharmacy",
                "type": "product",
                "title": "Diabetes Care Kit",
                "description": "Glucometer + Sugar-free supplements",
                "price": 999,
                "priority": 2,
                "cta_route": "/pharmacy?category=diabetes&from=crosssell"
            }
        ]
    },
    "mango_anemia": {
        "trigger_keywords": ["cbc", "hemoglobin", "iron", "ferritin", "anemia profile"],
        "suggestions": [
            {
                "service": "pharmacy",
                "type": "product",
                "title": "Iron & Folic Acid Supplements",
                "description": "Doctor-recommended iron supplements",
                "price": 250,
                "priority": 1,
                "cta_route": "/pharmacy?category=supplements&from=crosssell"
            }
        ]
    },
    "mango_thyroid": {
        "trigger_keywords": ["tsh", "t3", "t4", "thyroid"],
        "suggestions": [
            {
                "service": "diagyn",
                "type": "consultation",
                "title": "Thyroid Consultation",
                "description": "Expert review of your thyroid results",
                "price": 500,
                "priority": 1,
                "cta_route": "/diagyn?reason=thyroid&from=crosssell"
            }
        ]
    },
    "mango_vitamin": {
        "trigger_keywords": ["vitamin d", "vitamin b12", "calcium"],
        "suggestions": [
            {
                "service": "pharmacy",
                "type": "product",
                "title": "Vitamin D3 + Calcium Combo",
                "description": "3-month supply at discounted price",
                "price": 599,
                "priority": 1,
                "cta_route": "/pharmacy?category=vitamins&from=crosssell"
            }
        ]
    },
    # Orange Pharmacy triggers
    "pharmacy_diabetes_meds": {
        "trigger_keywords": ["metformin", "glimepiride", "insulin", "gliclazide", "voglibose", "sitagliptin"],
        "suggestions": [
            {
                "service": "mango",
                "type": "lab_test",
                "title": "Diabetes Screening",
                "description": "Due for your quarterly HbA1c check?",
                "price": 600,
                "priority": 1,
                "cta_route": "/mango?tests=Diabetes%20Screening&from=crosssell"
            },
            {
                "service": "diagyn",
                "type": "consultation",
                "title": "Diabetes Follow-up",
                "description": "Review your medication effectiveness",
                "price": 500,
                "priority": 2,
                "cta_route": "/diagyn?reason=diabetes-followup&from=crosssell"
            }
        ]
    },
    "pharmacy_bp_meds": {
        "trigger_keywords": ["amlodipine", "telmisartan", "losartan", "atenolol", "ramipril"],
        "suggestions": [
            {
                "service": "mango",
                "type": "lab_test",
                "title": "Cardiac Risk Profile",
                "description": "Lipid Profile + RFT + Electrolytes",
                "price": 1500,
                "priority": 1,
                "cta_route": "/mango?tests=Cardiac%20Risk%20Profile&from=crosssell"
            }
        ]
    },
    "pharmacy_thyroid_meds": {
        "trigger_keywords": ["thyroxine", "levothyroxine", "eltroxin", "thyronorm"],
        "suggestions": [
            {
                "service": "mango",
                "type": "lab_test",
                "title": "Thyroid Function Test",
                "description": "Due for 6-monthly thyroid check?",
                "price": 550,
                "priority": 1,
                "cta_route": "/mango?tests=Thyroid%20Profile%20-%20Free&from=crosssell"
            }
        ]
    }
}


def match_cross_sell(context_text: str, source_service: str) -> list:
    """Match cross-sell rules based on context text and source service"""
    context_lower = context_text.lower()
    matched = []
    seen_titles = set()

    for rule_id, rule in CROSS_SELL_RULES.items():
        for keyword in rule["trigger_keywords"]:
            if keyword in context_lower:
                for suggestion in rule["suggestions"]:
                    if suggestion["service"] != source_service and suggestion["title"] not in seen_titles:
                        matched.append({**suggestion, "rule_id": rule_id})
                        seen_titles.add(suggestion["title"])
                break

    matched.sort(key=lambda x: x["priority"])
    return matched[:4]


@router.post("/suggestions")
async def get_cross_sell_suggestions(data: dict):
    """Get cross-sell suggestions based on context"""
    context = data.get("context", "")
    source = data.get("source_service", "")
    patient_id = data.get("patient_id", "")

    suggestions = match_cross_sell(context, source)

    if patient_id:
        dismissed = await db.cross_sell_dismissed.find(
            {"patient_id": patient_id},
            {"_id": 0, "suggestion_title": 1}
        ).to_list(100)
        dismissed_titles = {d["suggestion_title"] for d in dismissed}
        suggestions = [s for s in suggestions if s["title"] not in dismissed_titles]

    return {"suggestions": suggestions, "total": len(suggestions)}


@router.post("/track")
async def track_cross_sell_action(data: dict):
    """Track cross-sell impression, click, or dismiss"""
    import uuid
    await db.cross_sell_events.insert_one({
        "id": str(uuid.uuid4()),
        "patient_id": data.get("patient_id", ""),
        "rule_id": data.get("rule_id", ""),
        "suggestion_title": data.get("suggestion_title", ""),
        "action": data.get("action", "shown"),
        "source_service": data.get("source_service", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    if data.get("action") == "dismissed":
        await db.cross_sell_dismissed.update_one(
            {"patient_id": data.get("patient_id", ""), "suggestion_title": data.get("suggestion_title", "")},
            {"$set": {
                "patient_id": data.get("patient_id", ""),
                "suggestion_title": data.get("suggestion_title", ""),
                "dismissed_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

    return {"success": True}


@router.get("/analytics")
async def get_cross_sell_analytics():
    """Get cross-sell performance analytics for staff dashboard"""
    pipeline = [
        {"$group": {
            "_id": "$action",
            "count": {"$sum": 1}
        }}
    ]
    stats = await db.cross_sell_events.aggregate(pipeline).to_list(10)
    stats_dict = {s["_id"]: s["count"] for s in stats}

    shown = stats_dict.get("shown", 0)
    clicked = stats_dict.get("clicked", 0)
    converted = stats_dict.get("converted", 0)

    top_performing = await db.cross_sell_events.aggregate([
        {"$match": {"action": "clicked"}},
        {"$group": {"_id": "$suggestion_title", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
        {"$limit": 5}
    ]).to_list(5)

    return {
        "shown": shown,
        "clicked": clicked,
        "converted": converted,
        "click_rate": round(clicked / max(shown, 1) * 100, 1),
        "conversion_rate": round(converted / max(clicked, 1) * 100, 1),
        "top_performing": [{"title": t["_id"], "clicks": t["clicks"]} for t in top_performing]
    }
