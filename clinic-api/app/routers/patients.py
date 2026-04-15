from fastapi import APIRouter, Depends, Query
import oracledb

from app.models.patients import PatientCreate, PatientUpdate, MedicalRecordUpdate
from app.services.patients import PatientService
from app.dependencies import get_current_user
from app.database import get_db
from app.exceptions import format_envelope

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("")
async def create_patient(
    data: PatientCreate, 
    current_user: dict = Depends(get_current_user()), 
    db: oracledb.Connection = Depends(get_db)
):
    pid = PatientService.create_patient(db, data, current_user.get('username', 'SYSTEM'))
    return format_envelope(True, data={"patient_id": pid})

@router.get("")
async def list_patients(
    name: str = Query(None),
    blood_group: str = Query(None),
    gender: str = Query(None),
    insurance_provider: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user()),
    db: oracledb.Connection = Depends(get_db)
):
    res = PatientService.get_list(db, name, blood_group, gender, insurance_provider, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])

@router.get("/{patient_id}")
async def get_patient(
    patient_id: int, 
    current_user: dict = Depends(get_current_user()), 
    db: oracledb.Connection = Depends(get_db)
):
    data = PatientService.get_detail(db, patient_id)
    return format_envelope(True, data=data)

@router.put("/{patient_id}")
async def update_patient(
    patient_id: int, 
    data: PatientUpdate, 
    current_user: dict = Depends(get_current_user()), 
    db: oracledb.Connection = Depends(get_db)
):
    PatientService.update_patient(db, patient_id, data, current_user.get('username', 'SYSTEM'))
    return format_envelope(True, data={"status": "Successfully mutated patient bindings."})

@router.patch("/{patient_id}/medical-record")
async def update_medical_record(
    patient_id: int, 
    data: MedicalRecordUpdate, 
    current_user: dict = Depends(get_current_user()), 
    db: oracledb.Connection = Depends(get_db)
):
    PatientService.update_medical_record(db, patient_id, data, current_user.get('username', 'SYSTEM'))
    return format_envelope(True, data={"status": "Successfully amended attached clinical records."})

@router.get("/{patient_id}/appointments")
async def get_patient_appointments(
    patient_id: int, 
    page: int = Query(1, ge=1), 
    limit: int = Query(20, le=100), 
    current_user: dict = Depends(get_current_user()), 
    db: oracledb.Connection = Depends(get_db)
):
    res = PatientService.get_appointments(db, patient_id, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])

@router.get("/{patient_id}/prescriptions")
async def get_patient_prescriptions(
    patient_id: int, 
    page: int = Query(1, ge=1), 
    limit: int = Query(20, le=100), 
    current_user: dict = Depends(get_current_user()), 
    db: oracledb.Connection = Depends(get_db)
):
    res = PatientService.get_prescriptions(db, patient_id, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])

@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: int, 
    current_user: dict = Depends(get_current_user(['ADMIN'])), 
    db: oracledb.Connection = Depends(get_db)
):
    # Only ADM explicitly allowed
    PatientService.delete_patient(db, patient_id, current_user.get('role'))
    return format_envelope(True, data={"status": "Patient globally tagged as effectively deleted."})
