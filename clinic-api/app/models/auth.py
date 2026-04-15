from pydantic import BaseModel, Field
from typing import Optional

class LoginRequest(BaseModel):
    username: str = Field(..., description="Employee ID, or direct username.")
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserProfile(BaseModel):
    user_id: int
    username: str
    role: str
    linked_entity_id: Optional[int]
    is_active: int
