from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import oracledb

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import format_envelope

router = APIRouter(tags=["Lab"])


# ── Pydantic models ────────────────────────────────────────────

class LabOrderCreate(BaseModel):
    consultation_id: int
    lab_test_id: int
    priority: str = Field(default="ROUTINE", pattern="^(ROUTINE|URGENT|STAT)$")
    clinical_notes: Optional[str] = Field(default=None, max_length=1000)


class LabResultUpload(BaseModel):
    result_summary: str = Field(..., max_length=2000)
    result_text: Optional[str] = None
    is_abnormal: int = Field(default=0, ge=0, le=1)


# ── Lab Test Catalogue (public to DOCTOR, ADMIN, PATIENT) ─────

@router.get("/catalogue")
def get_lab_catalogue(
    current_user: dict = Depends(get_current_user(["DOCTOR", "ADMIN", "PATIENT"])),
    db: oracledb.Connection = Depends(get_db)
):
    """All active lab tests available at the clinic."""
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT lab_test_id, test_name, test_code, category,
                   description, price, turnaround_hours
            FROM LAB_TEST_CATALOGUE
            WHERE is_active = 1 AND is_deleted = 0
            ORDER BY category, test_name
        """)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)


# ── Doctor: order a test ───────────────────────────────────────

@router.post("/orders")
def create_lab_order(
    data: LabOrderCreate,
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Doctor orders a lab test during a consultation."""
    doc_id = current_user["linked_entity_id"]
    username = current_user.get("username", f"DOC_{doc_id}")

    with db.cursor() as cursor:
        # Verify consultation exists; get patient_id via APPOINTMENT join (CONSULTATION has no patient_id column)
        cursor.execute("""
            SELECT a.patient_id
            FROM CONSULTATION c
            JOIN APPOINTMENT a ON c.appointment_id = a.appointment_id
            WHERE c.consultation_id = :1
        """, [data.consultation_id])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Consultation not found or not accessible.")
        patient_id = row[0]

        # Verify the lab test exists
        cursor.execute(
            "SELECT turnaround_hours FROM LAB_TEST_CATALOGUE WHERE lab_test_id = :1 AND is_active = 1",
            [data.lab_test_id]
        )
        test_row = cursor.fetchone()
        if not test_row:
            raise HTTPException(404, "Lab test not found in catalogue.")
        turnaround = test_row[0]

        order_id_var = cursor.var(int)
        cursor.execute("""
            INSERT INTO LAB_ORDER (
                consultation_id, patient_id, lab_test_id,
                ordered_by_doctor_id, status, priority, clinical_notes,
                expected_at, created_by
            ) VALUES (
                :consultation_id, :patient_id, :lab_test_id,
                :doctor_id, 'PENDING', :priority, :notes,
                SYSTIMESTAMP + NUMTODSINTERVAL(:turnaround, 'HOUR'), :created_by
            ) RETURNING lab_order_id INTO :oid
        """, {
            "consultation_id": data.consultation_id,
            "patient_id": patient_id,
            "lab_test_id": data.lab_test_id,
            "doctor_id": doc_id,
            "priority": data.priority,
            "notes": data.clinical_notes,
            "turnaround": turnaround,
            "created_by": username,
            "oid": order_id_var,
        })
        db.commit()

    return format_envelope(True, data={"lab_order_id": order_id_var.getvalue()[0]})


@router.get("/orders")
def get_doctor_lab_orders(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db)
):
    """All lab orders placed by this doctor (VPD scoped)."""
    with db.cursor() as cursor:
        sql = """
            SELECT lo.lab_order_id, lo.consultation_id, lo.patient_id,
                   lo.status, lo.priority, lo.clinical_notes,
                   lo.ordered_at, lo.expected_at,
                   ltc.test_name, ltc.test_code, ltc.category, ltc.price,
                   p.full_name AS patient_name
            FROM LAB_ORDER lo
            JOIN LAB_TEST_CATALOGUE ltc ON lo.lab_test_id = ltc.lab_test_id
            JOIN PATIENT p ON lo.patient_id = p.patient_id
            WHERE lo.is_deleted = 0
        """
        params = {}
        if status:
            sql += " AND lo.status = :status"
            params["status"] = status.upper()
        sql += " ORDER BY lo.ordered_at DESC"
        cursor.execute(sql, params)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)


# ── Admin: update order status + upload result ─────────────────

@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status: str,
    current_user: dict = Depends(get_current_user(["ADMIN"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Admin/lab staff progresses order status."""
    valid = {"PENDING", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}
    if status.upper() not in valid:
        raise HTTPException(422, f"Status must be one of: {', '.join(valid)}")

    with db.cursor() as cursor:
        cursor.execute("""
            UPDATE LAB_ORDER
            SET status = :status, updated_at = SYSTIMESTAMP
            WHERE lab_order_id = :oid AND is_deleted = 0
        """, {"status": status.upper(), "oid": order_id})
        if cursor.rowcount == 0:
            raise HTTPException(404, "Lab order not found.")
        db.commit()
    return format_envelope(True, data={"lab_order_id": order_id, "status": status.upper()})


@router.post("/orders/{order_id}/result")
def upload_lab_result(
    order_id: int,
    data: LabResultUpload,
    current_user: dict = Depends(get_current_user(["ADMIN"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Upload result for a completed lab order."""
    username = current_user.get("username", "ADMIN")

    with db.cursor() as cursor:
        # Verify order exists
        cursor.execute(
            "SELECT status FROM LAB_ORDER WHERE lab_order_id = :1 AND is_deleted = 0",
            [order_id]
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Lab order not found.")

        result_id_var = cursor.var(int)
        try:
            cursor.execute("""
                INSERT INTO LAB_RESULT (
                    lab_order_id, result_summary, result_text,
                    is_abnormal, uploaded_by, created_by
                ) VALUES (
                    :oid, :summary, :text, :abnormal, :uploaded_by, :created_by
                ) RETURNING result_id INTO :rid
            """, {
                "oid": order_id,
                "summary": data.result_summary,
                "text": data.result_text,
                "abnormal": data.is_abnormal,
                "uploaded_by": username,
                "created_by": username,
                "rid": result_id_var,
            })
            # Auto-mark order as COMPLETED
            cursor.execute("""
                UPDATE LAB_ORDER SET status = 'COMPLETED', updated_at = SYSTIMESTAMP
                WHERE lab_order_id = :1
            """, [order_id])
            db.commit()
        except oracledb.IntegrityError:
            db.rollback()
            raise HTTPException(409, "Result already uploaded for this order.")

    return format_envelope(True, data={"result_id": result_id_var.getvalue()[0]})


# ── Patient: view their own lab orders + results ───────────────

@router.get("/my-orders")
def get_patient_lab_orders(
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Patient views their own lab orders with results (VPD scoped)."""
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT lo.lab_order_id, lo.status, lo.priority,
                   lo.ordered_at, lo.expected_at,
                   ltc.test_name, ltc.test_code, ltc.category, ltc.price,
                   lr.result_summary, lr.is_abnormal, lr.result_text,
                   d.full_name AS doctor_name
            FROM LAB_ORDER lo
            JOIN LAB_TEST_CATALOGUE ltc ON lo.lab_test_id = ltc.lab_test_id
            JOIN DOCTOR d ON lo.ordered_by_doctor_id = d.doctor_id
            LEFT JOIN LAB_RESULT lr ON lo.lab_order_id = lr.lab_order_id
            WHERE lo.is_deleted = 0
            ORDER BY lo.ordered_at DESC
        """)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)