from app.repositories import appointments as appt_repo
from app.repositories import prescriptions as pres_repo
from app.repositories import billing as bill_repo
from app.exceptions import ClinicNotFoundError, ClinicValidationError, ClinicConflictError
import oracledb
import re

class AppointmentService:
    @staticmethod
    def book(db: oracledb.Connection, data: dict, created_by: str):
        try:
            pid, msg = appt_repo.book_appointment(db, data, created_by)
            if 'ERROR' in msg or pid is None:
                raise ClinicConflictError(msg)
            return pid, msg
        except oracledb.DatabaseError as e:
            # Rebounding standard Double-Booking Oracle trigger (-20001) seamlessly
            err_msg = str(e)
            if 'ORA-20001' in err_msg:
                extracted = re.search(r'ORA-20001: (.*?) ORA', err_msg)
                raise ClinicConflictError(extracted.group(1) if extracted else "Double booking detected.")
            raise ClinicValidationError(err_msg)

    @staticmethod
    def complete(db: oracledb.Connection, app_id: int, data: dict, user: str):
        try:
            appt_repo.complete_appointment(db, app_id, data, user)
        except oracledb.DatabaseError as e:
            err_msg = str(e)
            if 'ORA-20003' in err_msg:
                extracted = re.search(r'ORA-20003: (.*?) ORA', err_msg)
                raise ClinicConflictError(extracted.group(1) if extracted else "Status transition strictly forbidden.")
            raise ClinicValidationError("Failed to complete appointment internally.")

class PrescriptionService:
    @staticmethod
    def create(db: oracledb.Connection, payload: dict, items: list, created_by: str):
        return pres_repo.create_prescription(db, payload['consultation_id'], items, created_by)

    @staticmethod
    def get_detail(db: oracledb.Connection, pres_id: int):
        pres = pres_repo.get_prescription_detail(db, pres_id)
        if not pres:
            raise ClinicNotFoundError("Prescription unretrievable.")
        return pres

class BillingService:
    @staticmethod
    def pay(db: oracledb.Connection, billing_id: int, amount: float, mode: str):
        try:
            success = bill_repo.pay_bill(db, billing_id, amount, mode)
            if not success:
                raise ClinicNotFoundError("Billing record structurally unavailable.")
        except oracledb.DatabaseError as e:
             # Mapping bounds checks triggered strictly via Oracle Validation bounds inside `BILLING`
             err_msg = str(e)
             if 'ORA-20002' in err_msg:
                 extracted = re.search(r'ORA-20002: (.*?) ORA', err_msg)
                 raise ClinicConflictError(extracted.group(1) if extracted else "Amount paid exceeds total constraint ceiling.")
             raise ClinicValidationError("Payment structurally declined.")
