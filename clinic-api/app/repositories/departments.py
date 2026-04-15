import oracledb

def create_department(conn: oracledb.Connection, data: dict, created_by: str) -> int:
    with conn.cursor() as cursor:
        out_id = cursor.var(int)
        sql = """
            INSERT INTO DEPARTMENT (name, description, location, head_doctor_id, created_by)
            VALUES (:name, :description, :location, :head_doctor_id, :created_by)
            RETURNING department_id INTO :out_id
        """
        params = dict(data)
        params['created_by'] = created_by
        params['out_id'] = out_id
        cursor.execute(sql, params)
        return out_id.getvalue()[0]

def get_departments(conn: oracledb.Connection):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM DEPARTMENT ORDER BY name")
        if cursor.description:
            cols = [col[0].lower() for col in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]
        return []

def update_department(conn: oracledb.Connection, dept_id: int, data: dict, updated_by: str):
    if not data: return True
    with conn.cursor() as cursor:
        sets = ", ".join([f"{k} = :{k}" for k in data.keys()])
        sql = f"UPDATE DEPARTMENT SET {sets}, updated_at = SYSTIMESTAMP WHERE department_id = :id"
        params = dict(data)
        params['id'] = dept_id
        cursor.execute(sql, params)
        return cursor.rowcount > 0
