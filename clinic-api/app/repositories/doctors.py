import oracledb
from app.utils.pagination import paginate_query
import datetime

def create_doctor(conn: oracledb.Connection, data: dict, created_by: str) -> int:
    with conn.cursor() as cursor:
        out_id = cursor.var(int)
        sql = """
            INSERT INTO DOCTOR (
                employee_id, full_name, specialisation, qualification, years_of_experience,
                department_id, contact, email, consultation_fee, created_by
            ) VALUES (
                :employee_id, :full_name, :specialisation, :qualification, :years_of_experience,
                :department_id, :contact, :email, :consultation_fee, :created_by
            ) RETURNING doctor_id INTO :out_id
        """
        params = dict(data)
        params['created_by'] = created_by
        params['out_id'] = out_id
        cursor.execute(sql, params)
        return out_id.getvalue()[0]

def get_doctors_paginated(conn: oracledb.Connection, name: str, specialisation: str, min_exp: int, page: int, limit: int):
    base_sql = "SELECT * FROM DOCTOR WHERE is_deleted = 0"
    params = {}
    if name:
        base_sql += " AND UPPER(full_name) LIKE '%' || UPPER(:name) || '%'"
        params['name'] = name
    if specialisation:
        base_sql += " AND UPPER(specialisation) = UPPER(:spec)"
        params['spec'] = specialisation
    if min_exp is not None:
        base_sql += " AND years_of_experience >= :min_exp"
        params['min_exp'] = min_exp
        
    return paginate_query(conn, base_sql, params, page, limit)

def soft_delete_doctor(conn: oracledb.Connection, doctor_id: int):
    with conn.cursor() as cursor:
        cursor.execute("UPDATE DOCTOR SET is_deleted = 1, updated_at = SYSTIMESTAMP WHERE doctor_id = :1", [doctor_id])
        return cursor.rowcount > 0

def update_doctor(conn: oracledb.Connection, doc_id: int, data: dict, updated_by: str):
    if not data: return True
    with conn.cursor() as cursor:
        sets = ", ".join([f"{k} = :{k}" for k in data.keys()])
        sql = f"UPDATE DOCTOR SET {sets}, updated_at = SYSTIMESTAMP WHERE doctor_id = :id AND is_deleted = 0"
        params = dict(data)
        params['id'] = doc_id
        cursor.execute(sql, params)
        return cursor.rowcount > 0

def get_doctor_detail(conn: oracledb.Connection, doc_id: int):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM DOCTOR WHERE doctor_id = :1 AND is_deleted = 0", [doc_id])
        if cursor.description:
            cols = [col[0].lower() for col in cursor.description]
            row = cursor.fetchone()
            if row:
                return dict(zip(cols, row))
        return None

def get_availability(conn: oracledb.Connection, doctor_id: int, query_date: datetime.date):
    """Binds directly to Oracle PL/SQL Function outputting a dynamically composed SYS_REFCURSOR"""
    with conn.cursor() as cursor:
        # callfunc abstracts the type bindings cleanly 
        ref_cursor = cursor.callfunc('get_doctor_availability', oracledb.CURSOR, [doctor_id, query_date])
        rows = ref_cursor.fetchall()
        # Mapping strict time blocks
        return [row[0].strftime("%H:%M:%S") for row in rows]
