import logging
from typing import List, Callable
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.config import settings
from app.exceptions import ClinicAuthError, ClinicForbiddenError
from app.database import get_db
import oracledb

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(required_roles: List[str] = None) -> Callable:
    """Dependency injecting specific Role-based context while unwrapping OAuth headers."""
    async def role_checker(
        request: Request,
        token: str = Depends(oauth2_scheme),
        db: oracledb.Connection = Depends(get_db)
    ):
        try:
            # 1. Enforce Server-side invalidation synchronously
            with db.cursor() as cursor:
                cursor.execute("SELECT 1 FROM TOKEN_BLACKLIST WHERE token = :1", [token])
                if cursor.fetchone():
                    raise ClinicAuthError("Session securely invalidated. Please log in.")
            
            # 2. Extract JWT Cryptography payload using Pydantic secrets
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("sub")
            role: str = payload.get("role")
            
            if user_id is None or role is None:
                raise ClinicAuthError("Malformed Bearer token structural integrity.")
                
            # 3. RBAC Assessment
            if required_roles and role not in required_roles:
                raise ClinicForbiddenError("Insufficient permissions to access this clinical domain.")

            # 4. Bind resolved identity downstream
            linked_entity = payload.get("linked_entity_id")
            request.state.user = {
                "user_id": int(user_id),
                "role": role,
                "linked_entity_id": linked_entity
            }
            
            # 5. Set Native Database Session Context
            from app.database import set_db_context
            try:
                set_db_context(db, role, linked_entity or int(user_id))
            except Exception as ctx_err:
                logger.error(f"Failed setting native DB context: {ctx_err}")
                raise ClinicAuthError("Database isolation environment failure.")
                
            return request.state.user
            
        except JWTError as e:
            logger.warning(f"JWT Evaluation failed: {e}")
            raise ClinicAuthError("Could not universally validate security credentials.")
            
    return role_checker
