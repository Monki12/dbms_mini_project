import logging
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
import oracledb

from app.config import settings
from app.repositories import auth as repo
from app.exceptions import ClinicAuthError

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    @staticmethod
    def authenticate(db: oracledb.Connection, username: str, password: str) -> dict:
        user = repo.get_user_by_username(db, username)
        
        # Guard clause mitigating timing attacks uniformly
        if not user or not pwd_context.verify(password, user['hashed_password']):
            raise ClinicAuthError("Incorrect username or password.")
        
        access = AuthService.create_token(user, settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh = AuthService.create_token(user, settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60)
        return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

    @staticmethod
    def create_token(user: dict, expires_delta_minutes: int) -> str:
        expire = datetime.utcnow() + timedelta(minutes=expires_delta_minutes)
        to_encode = {
            "sub": str(user['user_id']),
            "role": user['role'],
            "linked_entity_id": user['linked_entity_id'],
            "exp": expire
        }
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def refresh_access_token(refresh_token: str) -> str:
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            # Spin a new temporary access utilizing the secure long-lived rotation
            fresh_access = AuthService.create_token({
                "user_id": payload.get("sub"),
                "role": payload.get("role"),
                "linked_entity_id": payload.get("linked_entity_id")
            }, settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            return fresh_access
        except Exception:
            raise ClinicAuthError("Invalid or completely expired refresh token context.")

    @staticmethod
    def logout(db: oracledb.Connection, token: str):
        # We explicitly rely on the middleware dependencies pulling the current specific active token 
        repo.store_token_blacklist(db, token)
        logger.info("Successfully invalidated JWT payload.")
