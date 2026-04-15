from fastapi import APIRouter, Depends
import oracledb

from app.models.auth import LoginRequest, RefreshRequest, Token, UserProfile
from app.services.auth import AuthService
from app.dependencies import get_current_user, oauth2_scheme
from app.exceptions import format_envelope
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
async def login(req: LoginRequest, db: oracledb.Connection = Depends(get_db)):
    """Accepts pure payload bypassing unscalable Form encodes allowing flexible react consumption."""
    tokens = AuthService.authenticate(db, req.username, req.password)
    return format_envelope(True, data=tokens)

@router.post("/refresh")
async def refresh_token(req: RefreshRequest):
    """Unwraps explicit refresh headers generating native temporary re-verification."""
    new_access = AuthService.refresh_access_token(req.refresh_token)
    return format_envelope(True, data={"access_token": new_access, "token_type": "bearer"})

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme), db: oracledb.Connection = Depends(get_db)):
    """Sever server-associated linkages explicitly mapped inside local blacklist"""
    AuthService.logout(db, token)
    return format_envelope(True, data={"status": "Logged out effectively"})

@router.get("/me")
async def read_active_profile(current_user: dict = Depends(get_current_user())):
    """Decodes live identities without roundtripping unneeded db queries"""
    return format_envelope(True, data=current_user)
