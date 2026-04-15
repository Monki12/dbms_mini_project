from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    location: str = Field(..., max_length=255)
    head_doctor_id: Optional[int] = None

class DepartmentCreate(DepartmentBase):
    pass
    
class DepartmentUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=1000)
    location: Optional[str] = Field(default=None, max_length=255)
    head_doctor_id: Optional[int] = None

class DepartmentResponse(DepartmentBase):
    department_id: int
    created_at: datetime
    updated_at: datetime
