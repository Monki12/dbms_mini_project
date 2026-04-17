from fastapi import APIRouter, Depends
import oracledb

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import format_envelope

router = APIRouter(tags=["Admin Portal"])

@router.get("/dashboard-stats")
def get_dashboard_stats(current_user: dict = Depends(get_current_user(["ADMIN"])), db: oracledb.Connection = Depends(get_db)):
    # ADMIN explicitly bypasses VPD because clinic_ctx_pkg.set_role('ADMIN') prevents patient/doctor assignment
    with db.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM PATIENT WHERE is_deleted = 0")
        total_patients = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM DOCTOR WHERE is_deleted = 0")
        total_doctors = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM APPOINTMENT WHERE status = 'SCHEDULED'")
        pending_appointments = cursor.fetchone()[0]

        cursor.execute("SELECT NVL(SUM(amount_paid), 0) FROM BILLING WHERE payment_status IN ('PAID','PARTIAL')")
        total_revenue = cursor.fetchone()[0]
        
    stats = {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "pending_appointments": pending_appointments,
        "total_revenue": total_revenue
    }
    return format_envelope(True, data=stats)

@router.get("/revenue-report")
def get_revenue_report(current_user: dict = Depends(get_current_user(["ADMIN"])), db: oracledb.Connection = Depends(get_db)):
    with db.cursor() as cursor:
        try:
            cursor.execute("BEGIN DBMS_MVIEW.REFRESH('V_DEPT_REVENUE','C'); END;")
        except Exception:
            pass  # mat-view refresh is best-effort

        sql = """
            SELECT d.name AS department_name,
                   NVL(SUM(b.amount_paid), 0) AS total_revenue,
                   NVL(SUM(b.total_amount), 0) AS total_billed,
                   COUNT(DISTINCT b.billing_id) AS invoice_count
            FROM DEPARTMENT d
            LEFT JOIN DOCTOR dr ON d.department_id = dr.department_id AND dr.is_deleted = 0
            LEFT JOIN APPOINTMENT a ON dr.doctor_id = a.doctor_id AND a.is_deleted = 0
            LEFT JOIN BILLING b ON a.appointment_id = b.appointment_id
                AND b.payment_status IN ('PAID','PARTIAL') AND b.is_deleted = 0
            GROUP BY d.name
            ORDER BY total_revenue DESC
        """
        cursor.execute(sql)
        cols = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

    return format_envelope(True, data=rows)
