from app.repositories import doctors as repo
from app.exceptions import ClinicNotFoundError, ClinicAuthError
from app.models.doctors import DoctorCreate, DoctorUpdate
import oracledb
import datetime

class DoctorService:
    @staticmethod
    def create(db: oracledb.Connection, data: DoctorCreate, created_by: str):
        return repo.create_doctor(db, data.model_dump(), created_by)

    @staticmethod
    def get_list(db: oracledb.Connection, name, specialisation, min_exp, page, limit):
        return repo.get_doctors_paginated(db, name, specialisation, min_exp, page, limit)
        
    @staticmethod
    def get_detail(db: oracledb.Connection, doc_id: int):
        doctor = repo.get_doctor_detail(db, doc_id)
        if not doctor:
            raise ClinicNotFoundError("Doctor inactive or not found.")
        return doctor

    @staticmethod
    def update(db: oracledb.Connection, doc_id: int, data: DoctorUpdate, updated_by: str):
        success = repo.update_doctor(db, doc_id, data.model_dump(exclude_unset=True), updated_by)
        if not success:
            raise ClinicNotFoundError("Doctor inactive or not found.")

    @staticmethod
    def delete(db: oracledb.Connection, doc_id: int, role: str):
        if role != 'ADMIN':
            raise ClinicAuthError("Only ADMIN scopes may execute functional deletions mapped on doctors.")
        success = repo.soft_delete_doctor(db, doc_id)
        if not success:
            raise ClinicNotFoundError("Doctor missing")

    @staticmethod
    def get_availability(db: oracledb.Connection, doc_id: int, query_date: datetime.date):
        # Validate existence cleanly
        if not repo.get_doctor_detail(db, doc_id):
            raise ClinicNotFoundError("Invalid context mapping, doctor missing.")
            
        return repo.get_availability(db, doc_id, query_date)
