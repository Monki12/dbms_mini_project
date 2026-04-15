from app.repositories import patients as repo
from app.exceptions import ClinicNotFoundError, ClinicAuthError
from app.models.patients import PatientCreate, PatientUpdate, MedicalRecordUpdate
import oracledb

class PatientService:
    @staticmethod
    def create_patient(db: oracledb.Connection, data: PatientCreate, created_by: str) -> int:
        pat_dict = data.model_dump(exclude={'allergies', 'chronic_conditions', 'surgical_history', 'family_history', 'vaccination_records'})
        med_dict = data.model_dump(include={'allergies', 'chronic_conditions', 'surgical_history', 'family_history', 'vaccination_records'})
        return repo.create_patient_and_record(db, pat_dict, med_dict, created_by)

    @staticmethod
    def get_list(db: oracledb.Connection, name, blood_group, gender, insurance, page, limit):
        return repo.get_patients_paginated(db, name, blood_group, gender, insurance, page, limit)
        
    @staticmethod
    def get_detail(db: oracledb.Connection, patient_id: int):
        patient = repo.get_patient_detail(db, patient_id)
        if not patient:
            raise ClinicNotFoundError(f"Patient ID {patient_id} not globally found or disabled.")
        return patient

    @staticmethod
    def update_patient(db: oracledb.Connection, patient_id: int, data: PatientUpdate, updated_by: str):
        success = repo.update_patient(db, patient_id, data.model_dump(exclude_unset=True), updated_by)
        if not success:
            raise ClinicNotFoundError("Patient context isolated/not found.")
            
    @staticmethod
    def update_medical_record(db: oracledb.Connection, patient_id: int, data: MedicalRecordUpdate, updated_by: str):
        success = repo.update_medical_record(db, patient_id, data.model_dump(exclude_unset=True), updated_by)
        if not success:
            raise ClinicNotFoundError("Attached patient medical record context isolated/not found.")
            
    @staticmethod
    def delete_patient(db: oracledb.Connection, patient_id: int, role: str):
        if role != 'ADMIN':
            raise ClinicAuthError("Deletion overrides strictly require ADMIN elevated properties.")
        success = repo.soft_delete_patient(db, patient_id)
        if not success:
            raise ClinicNotFoundError("Patient context isolated/not found.")

    @staticmethod
    def get_appointments(db: oracledb.Connection, patient_id: int, page: int, limit: int):
        return repo.get_patient_appointments(db, patient_id, page, limit)
        
    @staticmethod
    def get_prescriptions(db: oracledb.Connection, patient_id: int, page: int, limit: int):
        return repo.get_patient_prescriptions(db, patient_id, page, limit)
