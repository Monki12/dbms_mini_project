import pytest
from fastapi import FastAPI, APIRouter, Depends
from fastapi.testclient import TestClient
from jose import jwt
from app.config import settings
from app.dependencies import get_current_user
from app.database import get_db, execute_query, init_db_pool, close_db_pool

app = FastAPI()
router = APIRouter()

@pytest.fixture(autouse=True)
def setup_teardown():
    init_db_pool()
    yield
    close_db_pool()

@router.get("/api/patient/appointments")
async def patient_appointments(
    current_user: dict = Depends(get_current_user(['PATIENT'])),
    db=Depends(get_db)
):
    # Fetch exactly what the DB exposes natively after VPD interception
    rows = execute_query(db, "SELECT patient_id FROM APPOINTMENT")
    return {"appointments": rows}

@router.get("/api/admin/appointments")
async def admin_appointments(
    current_user: dict = Depends(get_current_user(['ADMIN'])),
    db=Depends(get_db)
):
    rows = execute_query(db, "SELECT patient_id FROM APPOINTMENT")
    return {"appointments": rows}

app.include_router(router)
client = TestClient(app)

def create_mock_token(user_id: int, role: str):
    payload = {"sub": str(user_id), "role": role, "linked_entity_id": user_id}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def test_vpd_patient_isolation_1():
    token = create_mock_token(1, "PATIENT")
    response = client.get("/api/patient/appointments", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()["appointments"]
    # Verify all returned rows belong explicitly to patient 1 natively
    for row in data:
        assert row["patient_id"] == 1

def test_vpd_patient_isolation_2():
    token = create_mock_token(2, "PATIENT")
    response = client.get("/api/patient/appointments", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()["appointments"]
    # Assert isolation is complete (Patient 2 exists, but should not see Patient 1's bounds)
    for row in data:
        assert row["patient_id"] == 2
        assert row["patient_id"] != 1

def test_vpd_admin_override():
    patient1_token = create_mock_token(1, "PATIENT")
    patient2_token = create_mock_token(2, "PATIENT")
    
    p1_count = len(client.get("/api/patient/appointments", headers={"Authorization": f"Bearer {patient1_token}"}).json()["appointments"])
    p2_count = len(client.get("/api/patient/appointments", headers={"Authorization": f"Bearer {patient2_token}"}).json()["appointments"])
    
    admin_token = create_mock_token(999, "ADMIN")
    response = client.get("/api/admin/appointments", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    admin_count = len(response.json()["appointments"])
    
    # Assert Admin captures everything (Bypasses VPD via 1=1 or Null filter)
    assert admin_count >= (p1_count + p2_count)
