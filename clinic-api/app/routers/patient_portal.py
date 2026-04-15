from fastapi import APIRouter, Depends, HTTPException
import oracledb

from app.database import get_db, execute_query
from app.dependencies import get_current_user
from app.models.patients import PatientUpdate
from app.services.patients import PatientService
from app.exceptions import format_envelope

router = APIRouter(tags=["Patient Portal"])

@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    patient = PatientService.get_detail(db, pid)
    return format_envelope(True, data=patient)

@router.put("/profile/complete")
def complete_profile(data: PatientUpdate, current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    # Set is_active = 1
    with db.cursor() as cursor:
        cursor.execute("UPDATE PATIENT SET is_active = 1 WHERE patient_id = :1", [pid])
        db.commit()
    PatientService.update_patient(db, pid, data, "PATIENT_PORTAL")
    return format_envelope(True, data={"status": "Profile completed successfully."})

@router.get("/appointments")
def get_appointments(page: int = 1, limit: int = 20, current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    res = PatientService.get_appointments(db, pid, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])

@router.get("/medical-records")
def get_medical_records(current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    patient = PatientService.get_detail(db, pid)
    return format_envelope(True, data=patient.get("medical_record", {}))

@router.get("/prescriptions")
def get_prescriptions(page: int = 1, limit: int = 20, current_user: dict = Depends(get_current_user(["PATIENT"])), db: oracledb.Connection = Depends(get_db)):
    pid = current_user['linked_entity_id']
    res = PatientService.get_prescriptions(db, pid, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])
