import oracledb
from app.utils.pagination import paginate_query

def create_patient_and_record(conn: oracledb.Connection, patient_data: dict, record_data: dict, created_by: str) -> int:
    """Inserts a new persistent patient bounding the generic medical record directly in the identical transaction context."""
    with conn.cursor() as cursor:
        pat_id_var = cursor.var(int)
        
        sql = """
            INSERT INTO PATIENT (
                full_name, dob, gender, blood_group, contact_number, email, address,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                insurance_provider, insurance_policy_number, created_by
            ) VALUES (
                :full_name, :dob, :gender, :blood_group, :contact_number, :email, :address,
                :emergency_contact_name, :emergency_contact_phone, :emergency_contact_relation,
                :insurance_provider, :insurance_policy_number, :created_by
            ) RETURNING patient_id INTO :out_id
        """
        params = dict(patient_data)
        params['created_by'] = created_by
        params['out_id'] = pat_id_var
        
        cursor.execute(sql, params)
        patient_id = pat_id_var.getvalue()[0]
        
        sql_med = """
            INSERT INTO MEDICAL_RECORD (
                patient_id, allergies, chronic_conditions, surgical_history, family_history, vaccination_records, created_by
            ) VALUES (
                :patient_id, :allergies, :chronic_conditions, :surgical_history, :family_history, :vaccination_records, :created_by
            )
        """
        med_params = dict(record_data)
        med_params['patient_id'] = patient_id
        med_params['created_by'] = created_by
        
        cursor.execute(sql_med, med_params)
        return patient_id

def get_patients_paginated(conn: oracledb.Connection, name: str, blood_group: str, gender: str, insurance: str, page: int, limit: int) -> dict:
    base_sql = "SELECT * FROM PATIENT WHERE is_deleted = 0"
    params = {}
    
    if name:
        base_sql += " AND UPPER(full_name) LIKE '%' || UPPER(:name) || '%'"
        params['name'] = name
    if blood_group:
        base_sql += " AND blood_group = :bg"
        params['bg'] = blood_group
    if gender:
        base_sql += " AND UPPER(gender) = UPPER(:gender)"
        params['gender'] = gender
    if insurance:
        base_sql += " AND UPPER(insurance_provider) LIKE '%' || UPPER(:ins) || '%'"
        params['ins'] = insurance
        
    base_sql += " ORDER BY created_at DESC"
    return paginate_query(conn, base_sql, params, page, limit)

def get_patient_detail(conn: oracledb.Connection, patient_id: int) -> dict:
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM PATIENT WHERE patient_id = :1 AND is_deleted = 0", [patient_id])
        if not cursor.description:
            return None
            
        cols = [c[0].lower() for c in cursor.description]
        row = cursor.fetchone()
        
        if row:
            patient = dict(zip(cols, row))
            # Pull parallel linked record
            cursor.execute("SELECT allergies, chronic_conditions, surgical_history, family_history, vaccination_records FROM MEDICAL_RECORD WHERE patient_id = :1 AND is_deleted = 0", [patient_id])
            if cursor.description:
                med_cols = [c[0].lower() for c in cursor.description]
                med_row = cursor.fetchone()
                patient['medical_record'] = dict(zip(med_cols, med_row)) if med_row else None
            return patient
    return None

def update_patient(conn: oracledb.Connection, patient_id: int, data: dict, updated_by: str) -> bool:
    if not data:
        return True
    with conn.cursor() as cursor:
        sets = ", ".join([f"{k} = :{k}" for k in data.keys()])
        sql = f"UPDATE PATIENT SET {sets}, updated_at = SYSTIMESTAMP WHERE patient_id = :pid AND is_deleted = 0"
        params = dict(data)
        params['pid'] = patient_id
        cursor.execute(sql, params)
        return cursor.rowcount > 0

def update_medical_record(conn: oracledb.Connection, patient_id: int, data: dict, updated_by: str) -> bool:
    if not data:
        return True
    with conn.cursor() as cursor:
        sets = ", ".join([f"{k} = :{k}" for k in data.keys()])
        sql = f"UPDATE MEDICAL_RECORD SET {sets}, updated_at = SYSTIMESTAMP WHERE patient_id = :pid AND is_deleted = 0"
        params = dict(data)
        params['pid'] = patient_id
        cursor.execute(sql, params)
        return cursor.rowcount > 0

def soft_delete_patient(conn: oracledb.Connection, patient_id: int) -> bool:
    with conn.cursor() as cursor:
        cursor.execute("UPDATE PATIENT SET is_deleted = 1, updated_at = SYSTIMESTAMP WHERE patient_id = :1", [patient_id])
        return cursor.rowcount > 0
        
def get_patient_appointments(conn: oracledb.Connection, patient_id: int, page: int, limit: int) -> dict:
    base_sql = "SELECT * FROM APPOINTMENT WHERE patient_id = :pid AND is_deleted = 0 ORDER BY appt_date DESC"
    return paginate_query(conn, base_sql, {'pid': patient_id}, page, limit)
    
def get_patient_prescriptions(conn: oracledb.Connection, patient_id: int, page: int, limit: int) -> dict:
    base_sql = """
        SELECT p.* 
        FROM PRESCRIPTION p
        JOIN CONSULTATION c ON p.consultation_id = c.consultation_id
        JOIN APPOINTMENT a ON c.appointment_id = a.appointment_id
        WHERE a.patient_id = :pid AND p.is_deleted = 0
        ORDER BY p.created_at DESC
    """
    return paginate_query(conn, base_sql, {'pid': patient_id}, page, limit)
