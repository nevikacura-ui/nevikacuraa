"""
Lab Report Viewer & Trends API
View lab results with historical trend tracking
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import random

router = APIRouter(prefix="/lab-reports", tags=["Lab Reports"])

db = None

def set_db(database):
    global db
    db = database

# Normal ranges for common tests
NORMAL_RANGES = {
    "hemoglobin": {"unit": "g/dL", "male": {"min": 13.5, "max": 17.5}, "female": {"min": 12.0, "max": 15.5}},
    "wbc": {"unit": "cells/mcL", "min": 4500, "max": 11000},
    "rbc": {"unit": "million/mcL", "male": {"min": 4.7, "max": 6.1}, "female": {"min": 4.2, "max": 5.4}},
    "platelets": {"unit": "per mcL", "min": 150000, "max": 400000},
    "blood_sugar_fasting": {"unit": "mg/dL", "min": 70, "max": 100},
    "blood_sugar_pp": {"unit": "mg/dL", "min": 70, "max": 140},
    "hba1c": {"unit": "%", "min": 4.0, "max": 5.7},
    "cholesterol_total": {"unit": "mg/dL", "min": 0, "max": 200},
    "hdl": {"unit": "mg/dL", "min": 40, "max": 60},
    "ldl": {"unit": "mg/dL", "min": 0, "max": 100},
    "triglycerides": {"unit": "mg/dL", "min": 0, "max": 150},
    "creatinine": {"unit": "mg/dL", "min": 0.7, "max": 1.3},
    "urea": {"unit": "mg/dL", "min": 7, "max": 20},
    "uric_acid": {"unit": "mg/dL", "male": {"min": 3.4, "max": 7.0}, "female": {"min": 2.4, "max": 6.0}},
    "tsh": {"unit": "mIU/L", "min": 0.4, "max": 4.0},
    "t3": {"unit": "ng/dL", "min": 80, "max": 200},
    "t4": {"unit": "mcg/dL", "min": 5.0, "max": 12.0},
    "vitamin_d": {"unit": "ng/mL", "min": 30, "max": 100},
    "vitamin_b12": {"unit": "pg/mL", "min": 200, "max": 900},
    "iron": {"unit": "mcg/dL", "min": 60, "max": 170},
    "calcium": {"unit": "mg/dL", "min": 8.5, "max": 10.5},
    "sgpt": {"unit": "U/L", "min": 7, "max": 56},
    "sgot": {"unit": "U/L", "min": 10, "max": 40},
    "bilirubin": {"unit": "mg/dL", "min": 0.1, "max": 1.2},
}

# Test categories
TEST_CATEGORIES = {
    "blood_count": {"name": "Complete Blood Count", "tests": ["hemoglobin", "wbc", "rbc", "platelets"]},
    "diabetes": {"name": "Diabetes Panel", "tests": ["blood_sugar_fasting", "blood_sugar_pp", "hba1c"]},
    "lipid": {"name": "Lipid Profile", "tests": ["cholesterol_total", "hdl", "ldl", "triglycerides"]},
    "kidney": {"name": "Kidney Function", "tests": ["creatinine", "urea", "uric_acid"]},
    "thyroid": {"name": "Thyroid Panel", "tests": ["tsh", "t3", "t4"]},
    "vitamins": {"name": "Vitamins & Minerals", "tests": ["vitamin_d", "vitamin_b12", "iron", "calcium"]},
    "liver": {"name": "Liver Function", "tests": ["sgpt", "sgot", "bilirubin"]},
}


def get_status(value, test_key, gender="male"):
    """Determine if a value is normal, borderline, or abnormal"""
    ranges = NORMAL_RANGES.get(test_key, {})
    if gender in ranges:
        r = ranges[gender]
    else:
        r = ranges
    mn = r.get("min", 0)
    mx = r.get("max", 999999)
    if mn <= value <= mx:
        return "normal"
    border = (mx - mn) * 0.15
    if (mn - border) <= value <= (mx + border):
        return "borderline"
    return "abnormal"


@router.get("/categories")
async def get_test_categories():
    """Get test categories and normal ranges"""
    return {
        "categories": TEST_CATEGORIES,
        "normal_ranges": {k: {kk: vv for kk, vv in v.items() if kk != "male" and kk != "female"} for k, v in NORMAL_RANGES.items()}
    }


@router.get("/patient/{phone}")
async def get_patient_reports(phone: str):
    """Get all lab reports for a patient"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    reports = await db.lab_reports.find(
        {"phone": phone}, {"_id": 0}
    ).sort("date", -1).limit(50).to_list(50)

    if not reports:
        # Return demo data for testing
        reports = _generate_demo_reports(phone)

    return {"reports": reports, "total": len(reports)}


@router.get("/report/{report_id}")
async def get_report_detail(report_id: str):
    """Get detailed lab report"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    report = await db.lab_reports.find_one({"report_id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/trends/{phone}/{test_key}")
async def get_test_trends(phone: str, test_key: str, months: int = 12):
    """Get historical trend for a specific test"""
    if db is None:
        return {"trends": _generate_demo_trends(test_key, months)}

    reports = await db.lab_reports.find(
        {"phone": phone, f"results.{test_key}": {"$exists": True}},
        {"_id": 0, "date": 1, f"results.{test_key}": 1, "report_id": 1}
    ).sort("date", -1).limit(months).to_list(months)

    if not reports:
        return {"trends": _generate_demo_trends(test_key, months)}

    trends = []
    for r in reversed(reports):
        val = r.get("results", {}).get(test_key)
        if val is not None:
            trends.append({"date": r["date"], "value": val, "report_id": r.get("report_id")})

    ranges = NORMAL_RANGES.get(test_key, {})
    return {
        "test_key": test_key,
        "unit": ranges.get("unit", ""),
        "normal_range": {"min": ranges.get("min", 0), "max": ranges.get("max", 0)},
        "trends": trends
    }


@router.get("/summary/{phone}")
async def get_health_summary(phone: str):
    """Get overall health summary from latest reports"""
    if db is None:
        return _generate_demo_summary(phone)

    latest = await db.lab_reports.find(
        {"phone": phone}, {"_id": 0}
    ).sort("date", -1).limit(1).to_list(1)

    if not latest:
        return _generate_demo_summary(phone)

    report = latest[0]
    results = report.get("results", {})
    summary = {"normal": 0, "borderline": 0, "abnormal": 0, "details": []}

    for test_key, value in results.items():
        if test_key in NORMAL_RANGES:
            status = get_status(value, test_key)
            summary[status] += 1
            summary["details"].append({
                "test": test_key,
                "value": value,
                "unit": NORMAL_RANGES[test_key].get("unit", ""),
                "status": status
            })

    total = summary["normal"] + summary["borderline"] + summary["abnormal"]
    summary["score"] = round((summary["normal"] / max(total, 1)) * 100) if total > 0 else 0
    summary["date"] = report.get("date", "")
    return summary


def _generate_demo_reports(phone):
    """Generate demo lab reports for testing"""
    reports = []
    now = datetime.now(timezone.utc)
    for i in range(6):
        date = (now - timedelta(days=i * 60)).strftime("%Y-%m-%d")
        report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"
        results = {
            "hemoglobin": round(random.uniform(11.5, 16.0), 1),
            "wbc": random.randint(4000, 12000),
            "platelets": random.randint(140000, 420000),
            "blood_sugar_fasting": random.randint(65, 130),
            "hba1c": round(random.uniform(4.5, 7.5), 1),
            "cholesterol_total": random.randint(150, 260),
            "hdl": random.randint(30, 70),
            "ldl": random.randint(70, 160),
            "creatinine": round(random.uniform(0.6, 1.5), 1),
            "tsh": round(random.uniform(0.3, 6.0), 2),
            "vitamin_d": round(random.uniform(15, 60), 1),
            "vitamin_b12": random.randint(150, 800),
            "sgpt": random.randint(10, 65),
        }
        reports.append({
            "report_id": report_id,
            "phone": phone,
            "date": date,
            "lab": "Mango Labs - Proton Diagnostics",
            "type": "Full Body Checkup",
            "results": results,
            "status": "completed",
            "doctor_notes": "Follow up in 3 months" if i == 0 else None
        })
    return reports


def _generate_demo_trends(test_key, months):
    """Generate demo trend data"""
    now = datetime.now(timezone.utc)
    ranges = NORMAL_RANGES.get(test_key, {"min": 50, "max": 100})
    mn = ranges.get("min", 50)
    mx = ranges.get("max", 100)
    mid = (mn + mx) / 2
    spread = (mx - mn) * 0.4

    trends = []
    for i in range(min(months, 6)):
        date = (now - timedelta(days=i * 60)).strftime("%Y-%m-%d")
        value = round(mid + random.uniform(-spread, spread), 1)
        trends.append({"date": date, "value": value})
    return list(reversed(trends))


def _generate_demo_summary(phone):
    """Generate demo health summary"""
    return {
        "score": 78,
        "normal": 9,
        "borderline": 2,
        "abnormal": 1,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "details": [
            {"test": "hemoglobin", "value": 14.2, "unit": "g/dL", "status": "normal"},
            {"test": "blood_sugar_fasting", "value": 95, "unit": "mg/dL", "status": "normal"},
            {"test": "hba1c", "value": 5.4, "unit": "%", "status": "normal"},
            {"test": "cholesterol_total", "value": 210, "unit": "mg/dL", "status": "borderline"},
            {"test": "vitamin_d", "value": 22, "unit": "ng/mL", "status": "abnormal"},
            {"test": "tsh", "value": 3.2, "unit": "mIU/L", "status": "normal"},
        ]
    }
