from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import oracledb

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import format_envelope

router = APIRouter(tags=["Notifications"])


# ── Doctor notifications ───────────────────────────────────────

@router.get("/doctor/notifications")
def get_doctor_notifications(
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db),
):
    doc_id = current_user["linked_entity_id"]
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT notif_id, message, notif_type, ref_id, read_flag, created_at
            FROM DOCTOR_NOTIFICATION
            WHERE doctor_id = :1
            ORDER BY created_at DESC
            FETCH FIRST 50 ROWS ONLY
        """, [doc_id])
        cols = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

        cursor.execute(
            "SELECT COUNT(*) FROM DOCTOR_NOTIFICATION WHERE doctor_id = :1 AND read_flag='N'",
            [doc_id]
        )
        unread = cursor.fetchone()[0]

    return format_envelope(True, data={"notifications": rows, "unread_count": unread})


@router.patch("/doctor/notifications/{notif_id}/read")
def mark_doctor_notification_read(
    notif_id: int,
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db),
):
    doc_id = current_user["linked_entity_id"]
    with db.cursor() as cursor:
        cursor.execute("""
            UPDATE DOCTOR_NOTIFICATION SET read_flag='Y'
            WHERE notif_id = :1 AND doctor_id = :2
        """, [notif_id, doc_id])
        if cursor.rowcount == 0:
            raise HTTPException(404, "Notification not found.")
        db.commit()
    return format_envelope(True, data={"notif_id": notif_id})


@router.patch("/doctor/notifications/read-all")
def mark_all_doctor_notifications_read(
    current_user: dict = Depends(get_current_user(["DOCTOR"])),
    db: oracledb.Connection = Depends(get_db),
):
    doc_id = current_user["linked_entity_id"]
    with db.cursor() as cursor:
        cursor.execute(
            "UPDATE DOCTOR_NOTIFICATION SET read_flag='Y' WHERE doctor_id = :1 AND read_flag='N'",
            [doc_id]
        )
        db.commit()
    return format_envelope(True, data={"marked": True})


# ── Patient notifications ──────────────────────────────────────

@router.get("/patient/notifications")
def get_patient_notifications(
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db),
):
    pid = current_user["linked_entity_id"]
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT notif_id, message, notif_type, ref_id, read_flag, created_at
            FROM PATIENT_NOTIFICATION
            WHERE patient_id = :1
            ORDER BY created_at DESC
            FETCH FIRST 50 ROWS ONLY
        """, [pid])
        cols = [c[0].lower() for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

        cursor.execute(
            "SELECT COUNT(*) FROM PATIENT_NOTIFICATION WHERE patient_id = :1 AND read_flag='N'",
            [pid]
        )
        unread = cursor.fetchone()[0]

    return format_envelope(True, data={"notifications": rows, "unread_count": unread})


@router.patch("/patient/notifications/read-all")
def mark_all_patient_notifications_read(
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db),
):
    pid = current_user["linked_entity_id"]
    with db.cursor() as cursor:
        cursor.execute(
            "UPDATE PATIENT_NOTIFICATION SET read_flag='Y' WHERE patient_id = :1 AND read_flag='N'",
            [pid]
        )
        db.commit()
    return format_envelope(True, data={"marked": True})
