from fastapi import APIRouter, Depends, Query
import oracledb

from app.models.appointments import AppointmentCreate, AppointmentComplete, AppointmentStatusUpdate
from app.services.transactional import AppointmentService
from app.repositories import appointments as repo
from app.dependencies import get_current_user
from app.database import get_db
from app.exceptions import format_envelope

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("")
async def book_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    pid, msg = AppointmentService.book(db, data.model_dump(), current_user.get('username'))
    return format_envelope(True, data={"appointment_id": pid, "message": msg})

@router.get("")
async def list_appointments(
    pat_id: int = Query(None),
    doc_id: int = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user()),
    db: oracledb.Connection = Depends(get_db)
):
    res = repo.get_appointments_paginated(db, pat_id, doc_id, status, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])

@router.put("/{app_id}/status")
async def update_status(app_id: int, data: AppointmentStatusUpdate, current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    repo.update_status(db, app_id, data.status)
    return format_envelope(True, data={"status": "Modified cleanly."})

@router.post("/{app_id}/complete")
async def execute_completion(app_id: int, data: AppointmentComplete, current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    AppointmentService.complete(db, app_id, data.model_dump(), current_user.get('username'))
    return format_envelope(True, data={"status": "Appointment finalized. Linked Consultation record actively instantiated natively."})
