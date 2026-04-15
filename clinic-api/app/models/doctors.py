from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class DoctorBase(BaseModel):
    employee_id: str = Field(..., max_length=50)
    full_name: str = Field(..., max_length=255)
    specialisation: str = Field(..., max_length=255)
    qualification: str = Field(..., max_length=255)
    years_of_experience: int = Field(..., ge=0)
    department_id: int
    contact: str = Field(..., max_length=50)
    email: EmailStr
    consultation_fee: float = Field(..., ge=0)

class DoctorCreate(DoctorBase):
    pass

class DoctorUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=255)
    specialisation: Optional[str] = Field(default=None, max_length=255)
    qualification: Optional[str] = Field(default=None, max_length=255)
    years_of_experience: Optional[int] = Field(default=None, ge=0)
    department_id: Optional[int] = None
    contact: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = None
    consultation_fee: Optional[float] = Field(default=None, ge=0)

class DoctorResponse(DoctorBase):
    doctor_id: int
    created_at: datetime
    updated_at: datetime
    is_deleted: int
