from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appt_date: date
    slot_start: str = Field(..., description="HH:MM:SS format mapped securely to TIMESTAMP in Oracle")

class AppointmentComplete(BaseModel):
    complaint: str = Field(..., max_length=1000)
    diagnosis: str = Field(..., max_length=1000)
    treatment_notes: str = Field(..., max_length=2000)
    follow_up_date: Optional[date] = None

class AppointmentStatusUpdate(BaseModel):
    status: str = Field(..., description="Must be CANCELLED or SCHEDULED")
