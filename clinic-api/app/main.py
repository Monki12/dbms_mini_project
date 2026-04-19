import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db_pool, close_db_pool
from app.exceptions import (
    ClinicBaseError, 
    clinic_exception_handler, 
    global_exception_handler,
    format_envelope
)

# 1. Custom JSON String Formatter for logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(name)s - ReqId:%(request_id)s - %(message)s'
)
# Note: Further strict JSON output config usually lives in logging configuration files (or natively via pythonjsonlogger)

# 2. Lifespan (Startup/Shutdown hooks)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup -> Ignite Oracle connection pool
    init_db_pool()
    yield
    # Shutdown -> Dismantle Oracle pool securely
    close_db_pool()

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

def create_app() -> FastAPI:
    app = FastAPI(
        title="Production Clinic Management System API",
        description="Oracle DB powered FastApi backend.",
        version="1.0.0",
        lifespan=lifespan
    )

    # 3. Apply Rate Limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # 4. CORS Integration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 5. Bind request_id attribution globally via bare middleware
    @app.middleware("http")
    async def append_request_id_middleware(request: Request, call_next):
        req_id = str(uuid.uuid4())
        request.state.request_id = req_id
        
        # Inject context filter hack for logging formatting implicitly
        old_factory = logging.getLogRecordFactory()
        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.request_id = req_id
            return record
        logging.setLogRecordFactory(record_factory)

        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response

    # 6. Bind exception hooks establishing standardized Envelope responses
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(ClinicBaseError, clinic_exception_handler)

    @app.get("/health", tags=["System"])
    async def healthcheck():
        return format_envelope(success=True, data={"status": "online"})

    from app.routers import (
        patients, doctors, appointments, departments, auth,
        billing, prescriptions, patient_auth, patient_portal, doctor_portal, admin_portal,
        lab, vitals, pharmacy, notifications, emergency, suggest_doctor
    )
    app.include_router(auth.router)
    app.include_router(patients.router)
    app.include_router(doctors.router)
    app.include_router(departments.router)
    app.include_router(appointments.router)
    app.include_router(prescriptions.router)
    app.include_router(billing.router)

    # V2: Patient Portal Scoped Auth Mount
    app.include_router(patient_auth.router, prefix="/api/patient/auth")
    app.include_router(patient_portal.router, prefix="/api/patient")
    app.include_router(doctor_portal.router, prefix="/api/doctor")
    app.include_router(admin_portal.router, prefix="/api/admin")

    # V3: Extended clinical services
    app.include_router(lab.router,           prefix="/api")
    app.include_router(vitals.router,        prefix="/api")
    app.include_router(pharmacy.router,      prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.include_router(emergency.router,     prefix="/api")
    app.include_router(suggest_doctor.router, prefix="/api")
    
    return app

app = create_app()
