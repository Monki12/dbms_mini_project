import oracledb

def create_prescription(conn: oracledb.Connection, consultation_id: int, items: list, created_by: str) -> int:
    """Isolates atomic insertions combining master record and child items synchronously"""
    with conn.cursor() as cursor:
        out_id = cursor.var(int)
        cursor.execute("INSERT INTO PRESCRIPTION (consultation_id, created_by) VALUES (:1, :2) RETURNING prescription_id INTO :out_id", 
                       [consultation_id, created_by], out_id=out_id)
        pres_id = out_id.getvalue()[0]
        
        for item in items:
            cursor.execute("""
                INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
                VALUES (:1, :2, :3, :4, :5, :6, :7)
            """, [pres_id, item['medication_name'], item['dosage'], item['frequency'], item['duration'], item['quantity'], created_by])
            
        return pres_id

def get_prescription_detail(conn: oracledb.Connection, pres_id: int) -> dict:
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM PRESCRIPTION WHERE prescription_id = :1 AND is_deleted = 0", [pres_id])
        if not cursor.description: return None
        pres = dict(zip([c[0].lower() for c in cursor.description], cursor.fetchone() or []))
        if not pres: return None
        
        cursor.execute("SELECT * FROM PRESCRIPTION_ITEM WHERE prescription_id = :1 AND is_deleted = 0", [pres_id])
        pres['items'] = [dict(zip([c[0].lower() for c in cursor.description], row)) for row in cursor.fetchall()]
        return pres
