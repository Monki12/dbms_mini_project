from fastapi import Request, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class ClinicBaseError(Exception):
    def __init__(self, message: str):
        self.message = message

class ClinicNotFoundError(ClinicBaseError): pass
class ClinicConflictError(ClinicBaseError): pass
class ClinicValidationError(ClinicBaseError): pass
class ClinicDBError(ClinicBaseError): pass
class ClinicAuthError(ClinicBaseError): pass
class ClinicForbiddenError(ClinicBaseError): pass

def format_envelope(success: bool, data=None, error=None, meta=None) -> dict:
    return {
        "success": success,
        "data": data,
        "error": error,
        "meta": meta
    }

async def global_exception_handler(request: Request, exc: Exception):
    """Fallback wildcard Exception trapping middleware"""
    req_id = getattr(request.state, "request_id", "Unknown")
    logger.error(f"Req [{req_id}] Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_envelope(False, error="Internal Server Error")
    )

async def clinic_exception_handler(request: Request, exc: ClinicBaseError):
    req_id = getattr(request.state, "request_id", "Unknown")
    
    if isinstance(exc, ClinicNotFoundError):
        code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ClinicConflictError):
        code = status.HTTP_409_CONFLICT
    elif isinstance(exc, ClinicValidationError):
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
    elif isinstance(exc, ClinicForbiddenError):
        code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, ClinicAuthError):
        code = status.HTTP_401_UNAUTHORIZED
    else:
        code = status.HTTP_400_BAD_REQUEST

    logger.warning(f"Req [{req_id}] Handled Clinic Exception ({code}): {exc.message}")
    return JSONResponse(
        status_code=code,
        content=format_envelope(False, error=exc.message)
    )
