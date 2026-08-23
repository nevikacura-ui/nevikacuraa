"""
Family Health Vault — Enhanced health records per family member.
Stores medical history, allergies, conditions, and documents per member.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/family-vault", tags=["Family Health Vault"])

db = None

def set_db(database):
    global db
    db = database


class HealthRecord(BaseModel):
    member_id: str
    record_type: str  # allergy, condition, medication, surgery, note
    title: str
    details: Optional[str] = None
    date: Optional[str] = None
    severity: Optional[str] = None  # mild, moderate, severe
    active: bool = True

class MemberVaultResponse(BaseModel):
    member_id: str
    records: list
    allergies: list
    conditions: list
    medications: list


@router.post("/records")
async def add_health_record(record: HealthRecord):
    """Add a health record for a family member"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    doc = {
        "id": str(uuid.uuid4()),
        **record.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.family_health_records.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "record": doc}


@router.get("/records/{member_id}")
async def get_member_records(member_id: str):
    """Get all health records for a family member"""
    if db is None:
        return MemberVaultResponse(member_id=member_id, records=[], allergies=[], conditions=[], medications=[])

    records = await db.family_health_records.find(
        {"member_id": member_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    allergies = [r for r in records if r.get("record_type") == "allergy"]
    conditions = [r for r in records if r.get("record_type") == "condition"]
    medications = [r for r in records if r.get("record_type") == "medication"]

    return MemberVaultResponse(
        member_id=member_id,
        records=records,
        allergies=allergies,
        conditions=conditions,
        medications=medications
    )


@router.delete("/records/{record_id}")
async def delete_health_record(record_id: str):
    """Delete a health record"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    result = await db.family_health_records.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"success": True, "message": "Record deleted"}


# Organ-to-test mapping for the 3D organ viewer
ORGAN_TEST_MAP = {
    "brain": {
        "label": "Brain & Nervous System",
        "tests": ["MRI Brain", "CT Scan Head", "EEG", "Vitamin B12"],
        "conditions": ["Migraine", "Epilepsy", "Neuropathy"]
    },
    "eyes": {
        "label": "Eyes",
        "tests": ["Eye Pressure Test", "Fundoscopy", "Visual Acuity"],
        "conditions": ["Diabetic Retinopathy", "Glaucoma", "Cataract"]
    },
    "thyroid": {
        "label": "Thyroid",
        "tests": ["TSH", "T3", "T4", "Free T3", "Free T4", "Thyroid Antibodies"],
        "conditions": ["Hypothyroidism", "Hyperthyroidism", "Goiter"]
    },
    "heart": {
        "label": "Heart & Cardiovascular",
        "tests": ["ECG", "2D Echo", "Lipid Profile", "Troponin", "BNP", "Stress Test"],
        "conditions": ["Hypertension", "Coronary Disease", "Heart Failure"]
    },
    "lungs": {
        "label": "Lungs & Respiratory",
        "tests": ["Chest X-Ray", "PFT", "CT Chest", "Sputum Culture", "SpO2"],
        "conditions": ["Asthma", "COPD", "Pneumonia", "TB"]
    },
    "liver": {
        "label": "Liver",
        "tests": ["LFT", "SGPT/ALT", "SGOT/AST", "Bilirubin", "Albumin", "GGT", "Ultrasound Abdomen"],
        "conditions": ["Fatty Liver", "Hepatitis", "Cirrhosis", "Jaundice"]
    },
    "stomach": {
        "label": "Stomach & GI",
        "tests": ["Stool Test", "H. Pylori", "Endoscopy", "Ultrasound Abdomen"],
        "conditions": ["Gastritis", "GERD", "Ulcer", "IBS"]
    },
    "kidneys": {
        "label": "Kidneys",
        "tests": ["KFT", "Creatinine", "BUN", "Urine Routine", "eGFR", "Uric Acid", "Ultrasound KUB"],
        "conditions": ["Kidney Stones", "UTI", "CKD", "Nephritis"]
    },
    "pancreas": {
        "label": "Pancreas",
        "tests": ["Blood Sugar Fasting", "PP Sugar", "HbA1c", "Insulin", "C-Peptide", "Amylase", "Lipase"],
        "conditions": ["Diabetes Type 1", "Diabetes Type 2", "Pancreatitis"]
    },
    "bones": {
        "label": "Bones & Joints",
        "tests": ["Calcium", "Vitamin D", "Phosphorus", "ALP", "DEXA Scan", "X-Ray", "RA Factor", "CRP"],
        "conditions": ["Osteoporosis", "Arthritis", "Vitamin D Deficiency"]
    },
    "blood": {
        "label": "Blood",
        "tests": ["CBC", "Hemoglobin", "ESR", "Platelet Count", "Iron", "Ferritin", "Peripheral Smear"],
        "conditions": ["Anemia", "Thalassemia", "Dengue", "Malaria"]
    },
    "reproductive": {
        "label": "Reproductive Health",
        "tests": ["FSH", "LH", "Estrogen", "Progesterone", "AMH", "Prolactin", "Testosterone", "PSA", "Pap Smear"],
        "conditions": ["PCOS", "Endometriosis", "Infertility"]
    }
}


@router.get("/organ-map")
async def get_organ_test_map():
    """Get the organ-to-test mapping for the 3D body viewer"""
    return {"organs": ORGAN_TEST_MAP}
