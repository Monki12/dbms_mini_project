from fastapi import APIRouter, Depends, HTTPException, Query
import oracledb
from pydantic import BaseModel, Field
from typing import List, Optional

from app.database import get_db, execute_query
from app.dependencies import get_current_user
from app.exceptions import format_envelope

router = APIRouter(tags=["Doctor Portal"])

class ConsultationCreate(BaseModel):
    chief_complaint: str = Field(..., max_length=1000)
    diagnosis: str = Field(..., max_length=1000)
    treatment_notes: str = Field(..., max_length=2000)

class PrescriptionItem(BaseModel):
    medication_name: str = Field(..., max_length=255)
    dosage: str = Field(..., max_length=100)
    frequency: str = Field(..., max_length=100)
    duration: str = Field(..., max_length=100)
    quantity: int = Field(..., ge=1)

class PrescriptionCreate(BaseModel):
    items: List[PrescriptionItem] = Field(..., min_length=1)

@router.get("/appointments")
def get_doctor_appointments(current_user: dict = Depends(get_current_user(["DOCTOR"])), db: oracledb.Connection = Depends(get_db)):
    # VPD handles scoping automatically. We just read all appointments.
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT a.appointment_id, a.patient_id, a.doctor_id,
                   a.appt_date, a.slot_start, a.status, a.reason_for_visit,
                   p.full_name as patient_name, p.phone_number, p.gender, p.dob
            FROM APPOINTMENT a
            JOIN PATIENT p ON a.patient_id = p.patient_id
            ORDER BY a.appt_date ASC, a.slot_start ASC
        """)
        columns = [col[0].lower() for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

    return format_envelope(True, data=rows)

@router.get("/patients")
def get_treated_patients(current_user: dict = Depends(get_current_user(["DOCTOR"])), db: oracledb.Connection = Depends(get_db)):
    # Query distinct patients bounded by the doctor's scoped appointments.
    # Because APPOINTMENT has VPD tied to DOCTOR context, the JOIN intrinsically filters PATIENT!
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT DISTINCT p.patient_id, p.full_name, p.dob, p.gender, p.blood_group, p.phone_number
            FROM PATIENT p
            JOIN APPOINTMENT a ON p.patient_id = a.patient_id
        """)
        columns = [col[0].lower() for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
    return format_envelope(True, data=rows)

@router.post("/appointments/{appointment_id}/consultation")
def create_consultation(appointment_id: int, data: ConsultationCreate, current_user: dict = Depends(get_current_user(["DOCTOR"])), db: oracledb.Connection = Depends(get_db)):
    doc_id = current_user['linked_entity_id']
    username = current_user.get('username', f"DOC_{doc_id}")
    
    with db.cursor() as cursor:
        # Verify appointment exists and belongs to doctor (VPD enforces this natively if we SELECT)
        cursor.execute("SELECT patient_id FROM APPOINTMENT WHERE appointment_id = :1", [appointment_id])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Appointment securely unavailable or not found.")
            
        patient_id = row[0]
        
        # Insert Consultation
        try:
            sql = """
                INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, created_by)
                VALUES (:1, :2, :3, :4, :5)
                RETURNING consultation_id INTO :6
            """
            cid_var = cursor.var(int)
            cursor.execute(sql, [appointment_id, data.chief_complaint, data.diagnosis, data.treatment_notes, username, cid_var])
            db.commit()
            return format_envelope(True, {"consultation_id": cid_var.getvalue()[0]})
        except oracledb.IntegrityError:
            db.rollback()
            raise HTTPException(400, "Consultation already exists for this appointment.")


@router.post("/appointments/{appointment_id}/prescription")
def create_prescription(appointment_id: int, data: PrescriptionCreate, current_user: dict = Depends(get_current_user(["DOCTOR"])), db: oracledb.Connection = Depends(get_db)):
    doc_id = current_user['linked_entity_id']
    username = current_user.get('username', f"DOC_{doc_id}")
    
    with db.cursor() as cursor:
        # Find consultation for this appointment
        cursor.execute("""
            SELECT c.consultation_id
            FROM CONSULTATION c
            WHERE c.appointment_id = :1
        """, [appointment_id])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "No consultation found for this appointment. Complete the consultation first.")
            
        consultation_id = row[0]

        # Insert prescription header
        sql_rx = """
            INSERT INTO PRESCRIPTION (consultation_id, created_by)
            VALUES (:1, :2)
            RETURNING prescription_id INTO :3
        """
        rx_var = cursor.var(int)
        cursor.execute(sql_rx, [consultation_id, username, rx_var])
        presc_id = rx_var.getvalue()[0]
        
        # Insert Items globally isolated
        for item in data.items:
            cursor.execute("""
                INSERT INTO PRESCRIPTION_ITEM 
                (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
                VALUES (:1, :2, :3, :4, :5, :6, :7)
            """, [presc_id, item.medication_name, item.dosage, item.frequency, item.duration, item.quantity, username])
            
        db.commit()
        return format_envelope(True, {"prescription_id": presc_id, "status": "Prescription saved."})


@router.patch("/appointments/{appointment_id}/complete")
def complete_appointment(
    appointment_id: int,
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db),
):
    with db.cursor() as cursor:
        cursor.execute("""
            UPDATE APPOINTMENT
            SET status = 'COMPLETED', updated_at = SYSTIMESTAMP
            WHERE appointment_id = :1 AND status = 'SCHEDULED'
        """, [appointment_id])
        if cursor.rowcount == 0:
            raise HTTPException(404, "Appointment not found or already completed.")
        db.commit()
    return format_envelope(True, data={"appointment_id": appointment_id, "status": "COMPLETED"})


# ── Doctor Leave ───────────────────────────────────────────────

class LeaveCreate(BaseModel):
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    reason: Optional[str] = Field(default=None, max_length=500)


@router.get("/leave")
def get_my_leave(
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db),
):
    doc_id = current_user["linked_entity_id"]
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT leave_id, start_ts, end_ts, reason, approved, created_at
            FROM DOCTOR_LEAVE
            WHERE doctor_id = :1
            ORDER BY start_ts DESC
        """, [doc_id])
        cols = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)


@router.post("/leave")
def request_leave(
    data: LeaveCreate,
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db),
):
    doc_id = current_user["linked_entity_id"]
    username = current_user.get("username", f"DOC_{doc_id}")
    with db.cursor() as cursor:
        leave_id_var = cursor.var(int)
        cursor.execute("""
            INSERT INTO DOCTOR_LEAVE (doctor_id, start_ts, end_ts, reason, approved, created_by)
            VALUES (:1,
                   TO_TIMESTAMP(:2 || ' 00:00:00','YYYY-MM-DD HH24:MI:SS'),
                   TO_TIMESTAMP(:3 || ' 23:59:59','YYYY-MM-DD HH24:MI:SS'),
                   :4, 1, :5)
            RETURNING leave_id INTO :6
        """, [doc_id, data.start_date, data.end_date, data.reason, username, leave_id_var])
        db.commit()
    return format_envelope(True, data={"leave_id": leave_id_var.getvalue()[0]})
