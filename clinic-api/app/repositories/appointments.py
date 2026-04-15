import oracledb
from app.utils.pagination import paginate_query
import datetime

def book_appointment(conn: oracledb.Connection, data: dict, created_by: str) -> tuple[int, str]:
    with conn.cursor() as cursor:
        app_id_var = cursor.var(int)
        msg_var = cursor.var(str)
        # Resolving string payload seamlessly into Oracle TIMESTAMP mapping limits
        slot_timestamp = datetime.datetime.strptime(f"{data['appt_date']} {data['slot_start']}", "%Y-%m-%d %H:%M:%S")
        
        cursor.callproc('book_appointment', [
            data['patient_id'], data['doctor_id'], data['appt_date'], slot_timestamp, created_by, app_id_var, msg_var
        ])
        # Returns tuple of (ID | NULL, SUCCESS/ERROR message handled by PLSQL block)
        return app_id_var.getvalue(), msg_var.getvalue()

def complete_appointment(conn: oracledb.Connection, app_id: int, data: dict, user: str):
    """Executes boundary mutation completing appointments and generating implicit consultation structures"""
    with conn.cursor() as cursor:
        cursor.callproc('complete_appointment', [
            app_id, data['complaint'], data['diagnosis'], data['treatment_notes'], data.get('follow_up_date'), user
        ])

def get_appointments_paginated(conn: oracledb.Connection, pat_id: int, doc_id: int, status: str, page: int, limit: int):
    base_sql = "SELECT * FROM APPOINTMENT WHERE is_deleted = 0"
    params = {}
    if pat_id:
        base_sql += " AND patient_id = :pat_id"
        params['pat_id'] = pat_id
    if doc_id:
        base_sql += " AND doctor_id = :doc_id"
        params['doc_id'] = doc_id
    if status:
        base_sql += " AND UPPER(status) = UPPER(:status)"
        params['status'] = status
        
    return paginate_query(conn, base_sql, params, page, limit)

def update_status(conn: oracledb.Connection, app_id: int, status: str):
    with conn.cursor() as cursor:
        cursor.execute("UPDATE APPOINTMENT SET status = :1, updated_at = SYSTIMESTAMP WHERE appointment_id = :2 AND is_deleted = 0", [status, app_id])
        return cursor.rowcount > 0
