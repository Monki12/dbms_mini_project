from pydantic import BaseModel, Field

class PayBillingRequest(BaseModel):
    amount_paid: float = Field(..., gt=0)
    payment_mode: str = Field(..., description="CASH, CARD, UPI, INSURANCE")
