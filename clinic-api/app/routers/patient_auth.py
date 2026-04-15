import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
import oracledb

from app.database import get_db
from app.models.patient_auth import OtpRequest, RefreshTokenRequest
from app.services.auth import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Patient Auth"])


@router.post("/login")
def patient_login(data: OtpRequest, db: oracledb.Connection = Depends(get_db)):
    """
    Mock-verified patient login.
    Accepts a phone number, finds or creates the patient stub, and issues a JWT.
    No OTP code is required — the form submission itself acts as verification.
    """
    phone = data.phone_number

    with db.cursor() as cursor:
        # Find existing patient
        cursor.execute(
            "SELECT patient_id, is_active FROM PATIENT WHERE phone_number = :1", [phone]
        )
        row = cursor.fetchone()

        if not row:
            # Create a stub patient — phone-based email satisfies UQ_PATIENT_EMAIL
            pending_email = phone + "@clinic.local"
            pid_var = cursor.var(int)
            cursor.execute(
                """
                INSERT INTO PATIENT (
                    full_name, dob, gender, blood_group, email, address,
                    emergency_contact_name, emergency_contact_phone,
                    emergency_contact_relation, contact_number, phone_number,
                    created_by, is_active, otp_verified
                ) VALUES (
                    'Pending', SYSDATE, 'Other', 'Unknown', :email, 'Pending',
                    'Pending', '0000000000', 'None',
                    :phone, :phone, 'SYSTEM', 0, 0
                ) RETURNING patient_id INTO :pid
                """,
                {"email": pending_email, "phone": phone, "pid": pid_var},
            )
            patient_id = pid_var.getvalue()[0]
            is_active = 0
            db.commit()
        else:
            patient_id, is_active = row

    # Issue JWT
    user_dict = {
        "user_id": patient_id,
        "role": "PATIENT",
        "linked_entity_id": patient_id,
    }
    access_token = AuthService.create_token(user_dict, 1440)  # 24 h for demo

    # Issue refresh token via PATIENT_SESSION
    refresh_token = str(uuid.uuid4())
    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO PATIENT_SESSION (patient_id, refresh_token, expires_at)
            VALUES (:1, :2, SYSTIMESTAMP + INTERVAL '30' DAY)
            """,
            [patient_id, refresh_token],
        )
        db.commit()

    return {
        "success": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "is_new_patient": (is_active == 0),
        "patient_id": patient_id,
    }


@router.post("/refresh")
def refresh_token(data: RefreshTokenRequest, db: oracledb.Connection = Depends(get_db)):
    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT patient_id,
                   CASE WHEN SYSTIMESTAMP > expires_at THEN 1 ELSE 0 END as is_expired
            FROM PATIENT_SESSION
            WHERE refresh_token = :1 AND is_revoked = 0
            """,
            [data.refresh_token],
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        patient_id, is_expired = row
        if is_expired == 1:
            raise HTTPException(status_code=401, detail="Refresh token expired")

    access_token = AuthService.create_token(
        {"user_id": patient_id, "role": "PATIENT", "linked_entity_id": patient_id}, 1440
    )
    return {"access_token": access_token}


@router.post("/logout")
def logout(data: RefreshTokenRequest, db: oracledb.Connection = Depends(get_db)):
    with db.cursor() as cursor:
        cursor.execute(
            "UPDATE PATIENT_SESSION SET is_revoked = 1 WHERE refresh_token = :1",
            [data.refresh_token],
        )
        db.commit()
    return {"success": True}
