from pydantic import BaseModel, Field
from typing import List

class PrescriptionItemBase(BaseModel):
    medication_name: str = Field(..., max_length=255)
    dosage: str = Field(..., max_length=100)
    frequency: str = Field(..., max_length=100)
    duration: str = Field(..., max_length=100)
    quantity: int = Field(..., ge=1)

class PrescriptionCreate(BaseModel):
    consultation_id: int
    items: List[PrescriptionItemBase] = Field(..., min_length=1)
