from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import date, datetime

class MedicalRecordBase(BaseModel):
    allergies: Optional[str] = Field(default=None, max_length=1000)
    chronic_conditions: Optional[str] = Field(default=None, max_length=1000)
    surgical_history: Optional[str] = Field(default=None, max_length=1000)
    family_history: Optional[str] = Field(default=None, max_length=1000)
    vaccination_records: Optional[str] = Field(default=None, max_length=1000)

class PatientBase(BaseModel):
    full_name: str = Field(..., max_length=255)
    dob: date
    gender: str = Field(..., max_length=20)
    blood_group: str = Field(..., max_length=10)
    contact_number: str = Field(..., max_length=50)
    email: EmailStr
    address: str = Field(..., max_length=500)
    emergency_contact_name: str = Field(..., max_length=255)
    emergency_contact_phone: str = Field(..., max_length=50)
    emergency_contact_relation: str = Field(..., max_length=100)
    insurance_provider: Optional[str] = Field(default=None, max_length=255)
    insurance_policy_number: Optional[str] = Field(default=None, max_length=255)

    @field_validator('dob')
    @classmethod
    def dob_must_be_past(cls, v: date):
        if v >= date.today():
            raise ValueError("Patient DOB must be strictly in the past.")
        return v

    @field_validator('contact_number', 'emergency_contact_phone')
    @classmethod
    def phone_format(cls, v: str):
        cleaned = v.strip()
        if not (cleaned.isdigit() and len(cleaned) == 10):
            raise ValueError('Phone must be exactly 10 digits (numbers only, no spaces or dashes).')
        return cleaned

class PatientCreate(PatientBase, MedicalRecordBase):
    pass

class PatientUpdate(PatientBase):
    pass

class PatientProfileComplete(BaseModel):
    """Used by PUT /api/patient/profile/complete — contact_number and email are optional
    because contact_number was already stored as phone on stub creation."""
    full_name: str = Field(..., max_length=255)
    dob: date
    gender: str = Field(..., max_length=20)
    blood_group: str = Field(..., max_length=10)
    contact_number: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=254)
    address: str = Field(..., max_length=500)
    emergency_contact_name: str = Field(..., max_length=255)
    emergency_contact_phone: str = Field(..., max_length=50)
    emergency_contact_relation: str = Field(..., max_length=100)
    insurance_provider: Optional[str] = Field(default=None, max_length=255)
    insurance_policy_number: Optional[str] = Field(default=None, max_length=255)

    @field_validator('dob')
    @classmethod
    def dob_must_be_past(cls, v: date):
        if v >= date.today():
            raise ValueError("Date of birth must be in the past.")
        return v

    @field_validator('contact_number', 'emergency_contact_phone')
    @classmethod
    def phone_format_profile(cls, v):
        if v is None:
            return v
        cleaned = str(v).strip()
        if cleaned and not (cleaned.isdigit() and len(cleaned) == 10):
            raise ValueError('Phone must be exactly 10 digits (numbers only, no spaces or dashes).')
        return cleaned or None

class MedicalRecordUpdate(MedicalRecordBase):
    pass

class PatientResponse(PatientBase):
    patient_id: int
    created_at: datetime
    updated_at: datetime
    is_deleted: int

class PatientDetailResponse(PatientResponse):
    medical_record: Optional[MedicalRecordBase] = None
