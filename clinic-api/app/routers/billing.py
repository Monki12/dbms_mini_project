from fastapi import APIRouter, Depends, Query
import oracledb

from app.models.billing import PayBillingRequest
from app.services.transactional import BillingService
from app.repositories import billing as repo
from app.dependencies import get_current_user
from app.database import get_db
from app.exceptions import format_envelope

router = APIRouter(prefix="/billing", tags=["Billing"])

@router.get("")
async def list_billing(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user()),
    db: oracledb.Connection = Depends(get_db)
):
    res = repo.get_billing_paginated(db, page, limit)
    return format_envelope(True, data=res["data"], meta=res["meta"])

@router.post("/{billing_id}/pay")
async def pay_bill(billing_id: int, data: PayBillingRequest, current_user: dict = Depends(get_current_user()), db: oracledb.Connection = Depends(get_db)):
    BillingService.pay(db, billing_id, data.amount_paid, data.payment_mode)
    return format_envelope(True, data={"status": "Payment successfully allocated securely via bounds."})

@router.get("/report")
async def get_report(current_user: dict = Depends(get_current_user(['ADMIN'])), db: oracledb.Connection = Depends(get_db)):
    """Yields direct aggregations consumed off the natively updated materialized infrastructure bounds."""
    data = repo.get_department_revenue_report(db)
    return format_envelope(True, data=data)
