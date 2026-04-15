from fastapi import APIRouter, Depends
import oracledb

from app.models.prescriptions import PrescriptionCreate
from app.services.transactional import PrescriptionService
from app.dependencies import get_current_user
from app.database import get_db
from app.exceptions import format_envelope

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

@router.post("")
async def create_prescription(data: PrescriptionCreate, current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    pres_id = PrescriptionService.create(db, data.model_dump(exclude={'items'}), data.model_dump()['items'], current_user.get('username'))
    return format_envelope(True, data={"prescription_id": pres_id})

@router.get("/{pres_id}")
async def get_prescription(pres_id: int, current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    res = PrescriptionService.get_detail(db, pres_id)
    return format_envelope(True, data=res)
