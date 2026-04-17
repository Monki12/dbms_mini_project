from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import oracledb

from app.database import get_db, execute_query
from app.dependencies import get_current_user
from app.models.patients import PatientUpdate, PatientProfileComplete
from app.services.patients import PatientService
from app.exceptions import format_envelope

router = APIRouter(tags=["Patient Portal"])

@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    patient = PatientService.get_detail(db, pid)
    return format_envelope(True, data=patient)

@router.put("/profile/complete")
def complete_profile(data: PatientProfileComplete, current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    # If contact_number not supplied, reuse the phone_number already on the stub row
    update_dict = data.model_dump(exclude_unset=False)
    if not update_dict.get("contact_number"):
        with db.cursor() as cursor:
            cursor.execute("SELECT phone_number FROM PATIENT WHERE patient_id = :1", [pid])
            row = cursor.fetchone()
            update_dict["contact_number"] = row[0] if row else "0000000000"
    with db.cursor() as cursor:
        cursor.execute(
            """UPDATE PATIENT SET
                full_name = :full_name,
                dob = TO_DATE(:dob, 'YYYY-MM-DD'),
                gender = :gender,
                blood_group = :blood_group,
                contact_number = :contact_number,
                email = :email,
                address = :address,
                emergency_contact_name = :emergency_contact_name,
                emergency_contact_phone = :emergency_contact_phone,
                emergency_contact_relation = :emergency_contact_relation,
                is_active = 1,
                updated_at = SYSTIMESTAMP
            WHERE patient_id = :patient_id""",
            {
                "full_name": update_dict["full_name"],
                "dob": str(update_dict["dob"]),
                "gender": update_dict["gender"],
                "blood_group": update_dict["blood_group"],
                "contact_number": update_dict["contact_number"],
                "email": update_dict.get("email") or (str(pid) + "@clinic.local"),
                "address": update_dict["address"],
                "emergency_contact_name": update_dict["emergency_contact_name"],
                "emergency_contact_phone": update_dict["emergency_contact_phone"],
                "emergency_contact_relation": update_dict["emergency_contact_relation"],
                "patient_id": pid,
            }
        )
        db.commit()
    return format_envelope(True, data={"status": "Profile completed successfully."})

@router.get("/appointments")
def get_appointments(current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    with db.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT a.appointment_id, a.appt_date, a.slot_start, a.status, a.reason_for_visit,
                       d.full_name AS doctor_name, d.specialty,
                       dep.name AS department_name
                FROM APPOINTMENT a
                LEFT JOIN DOCTOR d ON a.doctor_id = d.doctor_id
                LEFT JOIN DEPARTMENT dep ON a.department_id = dep.department_id
                WHERE a.patient_id = :pid AND a.is_deleted = 0
                ORDER BY a.appt_date DESC, a.slot_start DESC
            """, {"pid": pid})
        except oracledb.DatabaseError:
            # reason_for_visit column may not exist yet — use fallback
            cursor.execute("""
                SELECT a.appointment_id, a.appt_date, a.slot_start, a.status,
                       NULL AS reason_for_visit,
                       d.full_name AS doctor_name, d.specialty,
                       dep.name AS department_name
                FROM APPOINTMENT a
                LEFT JOIN DOCTOR d ON a.doctor_id = d.doctor_id
                LEFT JOIN DEPARTMENT dep ON a.department_id = dep.department_id
                WHERE a.patient_id = :pid AND a.is_deleted = 0
                ORDER BY a.appt_date DESC, a.slot_start DESC
            """, {"pid": pid})
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)


class AppointmentBook(BaseModel):
    doctor_id: int
    appt_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    slot_start: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    reason_for_visit: Optional[str] = Field(default=None, max_length=500)


@router.get("/doctors")
def list_doctors(current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    """Available doctors for patient appointment booking."""
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT d.doctor_id, d.full_name, d.specialty, d.qualification, d.experience_years,
                   dep.name AS department_name, dep.department_id
            FROM DOCTOR d
            JOIN DEPARTMENT dep ON d.department_id = dep.department_id
            WHERE d.is_deleted = 0
            ORDER BY dep.name, d.full_name
        """)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)


@router.post("/appointments")
def book_appointment(
    data: AppointmentBook,
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db)
):
    pid = current_user['linked_entity_id']
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT department_id FROM DOCTOR WHERE doctor_id = :1 AND is_deleted = 0",
            [data.doctor_id]
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Doctor not found.")
        dept_id = row[0]

        slot_ts = f"{data.appt_date} {data.slot_start}:00"
        appt_id_var = cursor.var(int)
        cursor.execute("""
            INSERT INTO APPOINTMENT (patient_id, doctor_id, department_id, appt_date, slot_start, status, reason_for_visit, created_by)
            VALUES (
                :pid, :did, :dept,
                TO_DATE(:adate, 'YYYY-MM-DD'),
                TO_TIMESTAMP(:slot_ts, 'YYYY-MM-DD HH24:MI:SS'),
                'SCHEDULED', :reason, :created_by
            ) RETURNING appointment_id INTO :aid
        """, {
            "pid": pid,
            "did": data.doctor_id,
            "dept": dept_id,
            "adate": data.appt_date,
            "slot_ts": slot_ts,
            "reason": data.reason_for_visit,
            "created_by": f"PATIENT_{pid}",
            "aid": appt_id_var,
        })
        db.commit()
    return format_envelope(True, data={"appointment_id": appt_id_var.getvalue()[0]})

@router.get("/medical-records")
def get_medical_records(current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    patient = PatientService.get_detail(db, pid)
    return format_envelope(True, data=patient.get("medical_record", {}))

@router.get("/prescriptions")
def get_prescriptions(current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT p.prescription_id, p.created_at, p.consultation_id,
                   pi.item_id, pi.medication_name, pi.dosage,
                   pi.frequency, pi.duration, pi.quantity,
                   d.full_name AS doctor_name, a.appt_date
            FROM PRESCRIPTION p
            JOIN CONSULTATION c ON p.consultation_id = c.consultation_id
            JOIN APPOINTMENT a ON c.appointment_id = a.appointment_id
            JOIN DOCTOR d ON a.doctor_id = d.doctor_id
            LEFT JOIN PRESCRIPTION_ITEM pi
                   ON p.prescription_id = pi.prescription_id AND pi.is_deleted = 0
            WHERE a.patient_id = :pid AND p.is_deleted = 0
            ORDER BY p.created_at DESC, pi.item_id
        """, {"pid": pid})
        columns = [c[0].lower() for c in cursor.description]
        raw = [dict(zip(columns, r)) for r in cursor.fetchall()]

    grouped: dict = {}
    for row in raw:
        key = row['prescription_id']
        if key not in grouped:
            grouped[key] = {
                'prescription_id': row['prescription_id'],
                'consultation_id': row['consultation_id'],
                'created_at': row['created_at'],
                'doctor_name': row['doctor_name'],
                'appt_date': row['appt_date'],
                'items': [],
            }
        if row.get('item_id') is not None:
            grouped[key]['items'].append({
                'medication_name': row['medication_name'],
                'dosage': row['dosage'],
                'frequency': row['frequency'],
                'duration': row['duration'],
                'quantity': row['quantity'],
            })

    return format_envelope(True, data=list(grouped.values()))
