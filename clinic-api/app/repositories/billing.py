import oracledb
from app.utils.pagination import paginate_query

def get_billing_paginated(conn: oracledb.Connection, page, limit):
    # Exposing the automatically computed virtual generation 'total_amount' alongside persistent boundaries.
    base_sql = "SELECT billing_id, appointment_id, consultation_fee, additional_charges, total_amount, amount_paid, payment_status, payment_mode, created_at FROM BILLING WHERE is_deleted = 0 ORDER BY created_at DESC"
    return paginate_query(conn, base_sql, {}, page, limit)

def pay_bill(conn: oracledb.Connection, billing_id: int, amount: float, mode: str):
    """
    Executes boundary-checked updates tracking progressive partial to fully PAID statuses 
    (Managed completely via Task 10's Database Triggers organically ensuring Data integrity decoupled from App Logic).
    """
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE BILLING 
            SET amount_paid = amount_paid + :1, payment_mode = :2, updated_at = SYSTIMESTAMP 
            WHERE billing_id = :3 AND is_deleted = 0
        """, [amount, mode, billing_id])
        return cursor.rowcount > 0

def get_department_revenue_report(conn: oracledb.Connection):
    """Refreshes Native Oracle MV implicitly returning materialized metric views."""
    with conn.cursor() as cursor:
        cursor.execute("BEGIN DBMS_MVIEW.REFRESH('V_DEPT_REVENUE', 'C'); END;")
        cursor.execute("SELECT * FROM V_DEPT_REVENUE ORDER BY revenue_month DESC, dept_name")
        if cursor.description:
            return [dict(zip([c[0].lower() for c in cursor.description], row)) for row in cursor.fetchall()]
        return []
