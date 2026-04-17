from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
import oracledb

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import format_envelope

router = APIRouter(tags=["Pharmacy"])


class DispenseItem(BaseModel):
    item_id: int
    quantity_dispensed: int = Field(..., ge=1)
    notes: Optional[str] = Field(default=None, max_length=500)


class DispenseRequest(BaseModel):
    prescription_id: int
    items: List[DispenseItem] = Field(..., min_length=1)


# ── Pharmacy catalogue (doctors + admins + patients can browse) ─

@router.get("/pharmacy/items")
def get_pharmacy_items(
    category: Optional[str] = None,
    search: Optional[str] = Query(default=None, max_length=100),
    current_user: dict = Depends(get_current_user(["DOCTOR", "ADMIN", "PATIENT"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Browse available pharmacy stock."""
    with db.cursor() as cursor:
        sql = """
            SELECT item_id, medicine_name, generic_name, manufacturer,
                   category, unit_price, stock_quantity, reorder_level,
                   expiry_date, batch_number
            FROM PHARMACY_ITEM
            WHERE is_active = 1 AND is_deleted = 0
        """
        params = {}
        if category:
            sql += " AND category = :category"
            params["category"] = category.upper()
        if search:
            sql += " AND (UPPER(medicine_name) LIKE :search OR UPPER(generic_name) LIKE :search)"
            params["search"] = f"%{search.upper()}%"
        sql += " ORDER BY medicine_name"
        cursor.execute(sql, params)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]

    # Flag low-stock items for admin awareness
    for row in rows:
        row["low_stock"] = (row["stock_quantity"] or 0) <= (row["reorder_level"] or 0)

    return format_envelope(True, data=rows)


@router.get("/pharmacy/items/{item_id}")
def get_pharmacy_item(
    item_id: int,
    current_user: dict = Depends(get_current_user(["DOCTOR", "ADMIN"])),
    db: oracledb.Connection = Depends(get_db)
):
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT item_id, medicine_name, generic_name, manufacturer,
                   category, unit_price, stock_quantity, reorder_level,
                   expiry_date, batch_number, is_active
            FROM PHARMACY_ITEM
            WHERE item_id = :1 AND is_deleted = 0
        """, [item_id])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Pharmacy item not found.")
        columns = [c[0].lower() for c in cursor.description]
    return format_envelope(True, data=dict(zip(columns, row)))


# ── Admin: dispense medicines against a prescription ──────────

@router.post("/pharmacy/dispense")
def dispense_medicines(
    data: DispenseRequest,
    current_user: dict = Depends(get_current_user(["ADMIN"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Dispense medicines from pharmacy against a prescription."""
    username = current_user.get("username", "ADMIN")

    with db.cursor() as cursor:
        # Verify prescription exists
        cursor.execute(
            "SELECT consultation_id FROM PRESCRIPTION WHERE prescription_id = :1 AND is_deleted = 0",
            [data.prescription_id]
        )
        presc_row = cursor.fetchone()
        if not presc_row:
            raise HTTPException(404, "Prescription not found.")

        # Get patient_id from consultation -> appointment
        cursor.execute("""
            SELECT a.patient_id FROM CONSULTATION c
            JOIN APPOINTMENT a ON c.appointment_id = a.appointment_id
            WHERE c.consultation_id = :1
        """, [presc_row[0]])
        appt_row = cursor.fetchone()
        if not appt_row:
            raise HTTPException(404, "Could not resolve patient for this prescription.")
        patient_id = appt_row[0]

        dispensed_ids = []
        for item in data.items:
            # Check stock
            cursor.execute(
                "SELECT unit_price, stock_quantity FROM PHARMACY_ITEM WHERE item_id = :1 AND is_active = 1 AND is_deleted = 0",
                [item.item_id]
            )
            stock_row = cursor.fetchone()
            if not stock_row:
                raise HTTPException(404, f"Pharmacy item {item.item_id} not found.")
            unit_price, stock_qty = stock_row
            if stock_qty < item.quantity_dispensed:
                raise HTTPException(409, f"Insufficient stock for item {item.item_id}. Available: {stock_qty}")

            disp_id_var = cursor.var(int)
            cursor.execute("""
                INSERT INTO DISPENSING (
                    prescription_id, patient_id, item_id,
                    quantity_dispensed, unit_price,
                    dispensed_by, created_by, notes
                ) VALUES (
                    :presc_id, :patient_id, :item_id,
                    :qty, :price,
                    :dispensed_by, :created_by, :notes
                ) RETURNING dispensing_id INTO :did
            """, {
                "presc_id": data.prescription_id,
                "patient_id": patient_id,
                "item_id": item.item_id,
                "qty": item.quantity_dispensed,
                "price": unit_price,
                "dispensed_by": username,
                "created_by": username,
                "notes": item.notes,
                "did": disp_id_var,
            })
            dispensed_ids.append(disp_id_var.getvalue()[0])
            # Stock deduction happens via trigger trg_dispensing_deduct_stock

        db.commit()

    return format_envelope(True, data={
        "prescription_id": data.prescription_id,
        "dispensed_count": len(dispensed_ids),
        "dispensing_ids": dispensed_ids
    })


# ── Patient: view their dispensing history ─────────────────────

@router.get("/pharmacy/my-dispensing")
def get_patient_dispensing(
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Patient sees medicines they have received from the pharmacy (VPD scoped)."""
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT d.dispensing_id, d.dispensed_at,
                   d.quantity_dispensed, d.unit_price,
                   d.quantity_dispensed * d.unit_price AS total_price,
                   pi.medicine_name, pi.generic_name, pi.category,
                   d.prescription_id
            FROM DISPENSING d
            JOIN PHARMACY_ITEM pi ON d.item_id = pi.item_id
            WHERE d.is_deleted = 0
            ORDER BY d.dispensed_at DESC
        """)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)


# ── Admin: low-stock alert ─────────────────────────────────────

@router.get("/pharmacy/low-stock")
def get_low_stock(
    current_user: dict = Depends(get_current_user(["ADMIN"])),
    db: oracledb.Connection = Depends(get_db)
):
    """Items at or below reorder level."""
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT item_id, medicine_name, category,
                   stock_quantity, reorder_level, expiry_date
            FROM PHARMACY_ITEM
            WHERE is_active = 1 AND is_deleted = 0
              AND stock_quantity <= reorder_level
            ORDER BY stock_quantity ASC
        """)
        columns = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
    return format_envelope(True, data=rows)