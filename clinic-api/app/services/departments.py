from app.repositories import departments as repo
from app.exceptions import ClinicNotFoundError
from app.models.departments import DepartmentCreate, DepartmentUpdate
import oracledb

class DepartmentService:
    @staticmethod
    def create(db: oracledb.Connection, data: DepartmentCreate, created_by: str):
        return repo.create_department(db, data.model_dump(), created_by)

    @staticmethod
    def get_all(db: oracledb.Connection):
        return repo.get_departments(db)

    @staticmethod
    def update(db: oracledb.Connection, dept_id: int, data: DepartmentUpdate, updated_by: str):
        success = repo.update_department(db, dept_id, data.model_dump(exclude_unset=True), updated_by)
        if not success:
            raise ClinicNotFoundError("Department mapping not found.")
