import oracledb
import logging
from typing import AsyncGenerator
from fastapi import Request
from app.config import settings

logger = logging.getLogger(__name__)

# Global connection pool reference
pool = None

def init_db_pool():
    """Initialize robust Oracle Thin Mode connection pool"""
    global pool
    try:
        pool_kwargs = {
            "user": settings.DB_USER,
            "password": settings.DB_PASSWORD,
            "dsn": settings.DB_DSN,
            "min": 2,
            "max": 10,
            "increment": 1
        }
        
        # Oracle intrinsically rejects the native 'sys' account without explicitly elevating modes natively.
        if settings.DB_USER.lower() == 'sys':
            pool_kwargs["mode"] = oracledb.AUTH_MODE_SYSDBA
            
        pool = oracledb.create_pool(**pool_kwargs)
        logger.info("Oracle DB pool initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Oracle DB pool: {e}")
        raise

def close_db_pool():
    """Teardown connections gracefully on Lifespan shutdown"""
    global pool
    if pool:
        pool.close()
        logger.info("Oracle DB pool closed.")

def set_db_context(conn: oracledb.Connection, role: str, entity_id: int):
    """Call after get_db() yields a connection, before any query."""
    with conn.cursor() as cursor:
        cursor.execute("BEGIN clinic_ctx_pkg.set_role(:role); END;", [role])
        if role == 'PATIENT' and entity_id is not None:
            cursor.execute("BEGIN clinic_ctx_pkg.set_patient_id(:id); END;", [entity_id])
        elif role == 'DOCTOR' and entity_id is not None:
            cursor.execute("BEGIN clinic_ctx_pkg.set_doctor_id(:id); END;", [entity_id])

async def get_db() -> AsyncGenerator[oracledb.Connection, None]:
    """
    FastAPI Dependency: Yields a connection from the pool.
    Automatically handles COMMIT on success and ROLLBACK on exception.
    """
    if pool is None:
        raise RuntimeError("Database pool is not initialized")
        
    conn = pool.acquire()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction failed: {e}")
        raise
    finally:
        pool.release(conn)

def execute_query(conn: oracledb.Connection, sql: str, params: dict = None) -> list[dict]:
    """Helper to fetch native dictionary arrays from Oracle"""
    with conn.cursor() as cursor:
        cursor.execute(sql, params or {})
        if cursor.description:
            columns = [col[0].lower() for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        return []

def execute_procedure(conn: oracledb.Connection, proc_name: str, params: list):
    """Helper for executing robust PL/SQL stored procedures"""
    with conn.cursor() as cursor:
        # callproc automatically tracks OUT mapped variables
        return cursor.callproc(proc_name, params)

def health_check(conn: oracledb.Connection) -> bool:
    """Verifies Oracle liveliness"""
    with conn.cursor() as cursor:
        cursor.execute("SELECT 1 FROM DUAL")
        row = cursor.fetchone()
        return bool(row and row[0] == 1)
