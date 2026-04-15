from fastapi import APIRouter, Depends, Query
import oracledb
import datetime

from app.models.doctors import DoctorCreate, DoctorUpdate
from app.services.doctors import DoctorService
from app.dependencies import get_current_user
from app.database import get_db
from app.exceptions import format_envelope

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.post("")
async def create_doctor(data: DoctorCreate, current_user: dict = Depends(get_current_user(['ADMIN'])), db: oracledb.Connection = Depends(get_db)):
    doc_id = DoctorService.create(db, data, current_user.get('username'))
    return format_envelope(True, data={"doctor_id": doc_id})

@router.get("")
async def list_doctors(
    name: str = Query(None),
    specialisation: str = Query(None),
    min_exp: int = Query(None, ge=0),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user()),
    db: oracledb.Connection = Depends(get_db)
):
    res = DoctorService.get_list(db, name, specialisation, min_exp, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])

@router.get("/{doc_id}")
async def get_doctor_detail(doc_id: int, current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    return format_envelope(True, data=DoctorService.get_detail(db, doc_id))

@router.put("/{doc_id}")
async def update_doctor(doc_id: int, data: DoctorUpdate, current_user: dict = Depends(get_current_user(['ADMIN'])), db: oracledb.Connection = Depends(get_db)):
    DoctorService.update(db, doc_id, data, current_user.get('username'))
    return format_envelope(True, data={"status": "updated cleanly"})

@router.delete("/{doc_id}")
async def delete_doctor(doc_id: int, current_user: dict = Depends(get_current_user(['ADMIN'])), db: oracledb.Connection = Depends(get_db)):
    DoctorService.delete(db, doc_id, current_user.get('role'))
    return format_envelope(True, data={"status": "Disabled natively"})

@router.get("/{doc_id}/availability")
async def check_availability(doc_id: int, date: datetime.date = Query(...), current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    slots = DoctorService.get_availability(db, doc_id, date)
    return format_envelope(True, data={"date": str(date), "available_slots": slots})
