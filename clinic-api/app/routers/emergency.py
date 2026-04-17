from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import oracledb

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import format_envelope

router = APIRouter(tags=["Emergency"])


class EmergencyCreate(BaseModel):
    severity: str = Field(default="HIGH", pattern="^(LOW|MODERATE|HIGH|CRITICAL)$")
    location_text: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=1000)


@router.post("/patient/emergency")
def raise_emergency(
    data: EmergencyCreate,
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db),
):
    pid = current_user["linked_entity_id"]
    with db.cursor() as cursor:
        req_id_var = cursor.var(int)
        cursor.execute("""
            INSERT INTO EMERGENCY_REQUEST
              (patient_id, severity, location_text, description, status, created_by)
            VALUES (:1, :2, :3, :4, 'OPEN', :5)
            RETURNING request_id INTO :6
        """, [pid, data.severity, data.location_text, data.description,
              f"PATIENT_{pid}", req_id_var])
        db.commit()
    return format_envelope(True, data={"request_id": req_id_var.getvalue()[0]})


# ── Admin: emergency queue ─────────────────────────────────────

@router.get("/admin/emergency-queue")
def get_emergency_queue(
    current_user: dict = Depends(get_current_user(["ADMIN"])),
    db: oracledb.Connection = Depends(get_db),
):
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT er.request_id, er.severity, er.status,
                   er.location_text, er.description, er.created_at,
                   p.full_name AS patient_name, p.phone_number,
                   d.full_name AS assigned_doctor_name
            FROM EMERGENCY_REQUEST er
            JOIN PATIENT p ON er.patient_id = p.patient_id
            LEFT JOIN DOCTOR d ON er.assigned_doctor_id = d.doctor_id
            ORDER BY
              CASE er.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2
                               WHEN 'MODERATE' THEN 3 ELSE 4 END,
              er.created_at ASC
        """)
        cols = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)


@router.patch("/admin/emergency/{request_id}/assign")
def assign_emergency(
    request_id: int,
    doctor_id: int,
    current_user: dict = Depends(get_current_user(["ADMIN"])),
    db: oracledb.Connection = Depends(get_db),
):
    with db.cursor() as cursor:
        cursor.execute("""
            UPDATE EMERGENCY_REQUEST
            SET assigned_doctor_id = :1, status = 'ASSIGNED'
            WHERE request_id = :2 AND status = 'OPEN'
        """, [doctor_id, request_id])
        if cursor.rowcount == 0:
            raise HTTPException(404, "Request not found or already assigned.")
        db.commit()
    return format_envelope(True, data={"request_id": request_id, "status": "ASSIGNED"})


@router.patch("/admin/emergency/{request_id}/resolve")
def resolve_emergency(
    request_id: int,
    current_user: dict = Depends(get_current_user(["ADMIN"])),
    db: oracledb.Connection = Depends(get_db),
):
    with db.cursor() as cursor:
        cursor.execute("""
            UPDATE EMERGENCY_REQUEST
            SET status = 'RESOLVED', resolved_at = SYSTIMESTAMP
            WHERE request_id = :1
        """, [request_id])
        if cursor.rowcount == 0:
            raise HTTPException(404, "Request not found.")
        db.commit()
    return format_envelope(True, data={"request_id": request_id, "status": "RESOLVED"})
