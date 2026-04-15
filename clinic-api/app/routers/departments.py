from fastapi import APIRouter, Depends
import oracledb

from app.models.departments import DepartmentCreate, DepartmentUpdate
from app.services.departments import DepartmentService
from app.dependencies import get_current_user
from app.database import get_db
from app.exceptions import format_envelope

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.post("")
async def create_department(data: DepartmentCreate, current_user: dict = Depends(get_current_user(['ADMIN'])), db: oracledb.Connection = Depends(get_db)):
    dept_id = DepartmentService.create(db, data, current_user.get('username'))
    return format_envelope(True, data={"department_id": dept_id})

@router.get("")
async def list_departments(db: oracledb.Connection = Depends(get_db)):
    data = DepartmentService.get_all(db)
    return format_envelope(True, data=data)

@router.put("/{dept_id}")
async def update_department(dept_id: int, data: DepartmentUpdate, current_user: dict = Depends(get_current_user(['ADMIN'])), db: oracledb.Connection = Depends(get_db)):
    DepartmentService.update(db, dept_id, data, current_user.get('username'))
    return format_envelope(True, data={"status": "Updated explicitly."})
