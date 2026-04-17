from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import oracledb

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import format_envelope

router = APIRouter(tags=["Vitals"])


class VitalsCreate(BaseModel):
    consultation_id: int
    bp_systolic: Optional[int] = Field(default=None, ge=40, le=300)
    bp_diastolic: Optional[int] = Field(default=None, ge=20, le=200)
    heart_rate: Optional[int] = Field(default=None, ge=0, le=300)
    temperature: Optional[float] = Field(default=None, ge=30.0, le=45.0)
    weight_kg: Optional[float] = Field(default=None, ge=0.5, le=500.0)
    height_cm: Optional[float] = Field(default=None, ge=20.0, le=250.0)
    spo2: Optional[int] = Field(default=None, ge=0, le=100)
    respiratory_rate: Optional[int] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=500)


@router.post("/vitals")
def record_vitals(
    data: VitalsCreate,
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Record vital signs for a consultation. One set per consultation."""
    doc_id = current_user["linked_entity_id"]
    username = current_user.get("username", f"DOC_{doc_id}")

    with db.cursor() as cursor:
        # Verify consultation exists; get patient_id via APPOINTMENT join (CONSULTATION has no patient_id column)
        cursor.execute("""
            SELECT a.patient_id
            FROM CONSULTATION c
            JOIN APPOINTMENT a ON c.appointment_id = a.appointment_id
            WHERE c.consultation_id = :1
        """, [data.consultation_id])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Consultation not found or not accessible.")
        patient_id = row[0]

        vital_id_var = cursor.var(int)
        try:
            cursor.execute("""
                INSERT INTO VITAL_SIGNS (
                    consultation_id, patient_id,
                    bp_systolic, bp_diastolic, heart_rate,
                    temperature, weight_kg, height_cm, spo2,
                    respiratory_rate, notes,
                    recorded_by, created_by
                ) VALUES (
                    :cid, :pid,
                    :bp_sys, :bp_dia, :hr,
                    :temp, :wt, :ht, :spo2,
                    :rr, :notes,
                    :recorded_by, :created_by
                ) RETURNING vital_id INTO :vid
            """, {
                "cid": data.consultation_id,
                "pid": patient_id,
                "bp_sys": data.bp_systolic,
                "bp_dia": data.bp_diastolic,
                "hr": data.heart_rate,
                "temp": data.temperature,
                "wt": data.weight_kg,
                "ht": data.height_cm,
                "spo2": data.spo2,
                "rr": data.respiratory_rate,
                "notes": data.notes,
                "recorded_by": username,
                "created_by": username,
                "vid": vital_id_var,
            })
            db.commit()
        except oracledb.IntegrityError:
            db.rollback()
            raise HTTPException(409, "Vitals already recorded for this consultation.")

    return format_envelope(True, data={"vital_id": vital_id_var.getvalue()[0]})


@router.get("/vitals/consultation/{consultation_id}")
def get_vitals(
    consultation_id: int,
    current_user: dict = Depends(get_current_user(["DOCTOR", "PATIENT"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Fetch vitals for a consultation (VPD scoped for both roles)."""
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT vital_id, bp_systolic, bp_diastolic, heart_rate,
                   temperature, weight_kg, height_cm, spo2, respiratory_rate,
                   notes, recorded_by, recorded_at
            FROM VITAL_SIGNS
            WHERE consultation_id = :1 AND is_deleted = 0
        """, [consultation_id])
        row = cursor.fetchone()
        if not row:
            return format_envelope(True, data=None)
        columns = [c[0].lower() for c in cursor.description]
        return format_envelope(True, data=dict(zip(columns, row)))


@router.get("/vitals/patient/history")
def get_patient_vitals_history(
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Patient sees their full vitals history across all visits."""
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT vs.vital_id, vs.bp_systolic, vs.bp_diastolic,
                   vs.heart_rate, vs.temperature, vs.weight_kg, vs.height_cm,
                   vs.spo2, vs.respiratory_rate, vs.recorded_at,
                   a.appt_date, d.full_name AS doctor_name
            FROM VITAL_SIGNS vs
            JOIN CONSULTATION c ON vs.consultation_id = c.consultation_id
            JOIN APPOINTMENT a ON c.appointment_id = a.appointment_id
            JOIN DOCTOR d ON a.doctor_id = d.doctor_id
            WHERE vs.is_deleted = 0
            ORDER BY vs.recorded_at DESC
        """)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)