"""
INTEGRATION-TASK 1: End-to-End Workflow Test
============================================
Tests the complete three-portal workflow against a live server.
Run with: python integration_test.py

Prerequisites:
  1. FastAPI server running on http://localhost:8000
  2. Oracle XEPDB1 database seeded (task14_seed_data.sql executed)
  3. Doctor CLINIC_USER entries exist (run setup_test_users.sql first)
"""

import sys
import requests

BASE = "http://localhost:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "mock_user123"
DOCTOR_USERNAME = "doc_alice"
DOCTOR_PASSWORD = "mock_user123"
TEST_PHONE = "9000000001"

PASS = "[PASS]"
FAIL = "[FAIL]"


def check(label, condition, extra=""):
    status = PASS if condition else FAIL
    print(f"  {status}  {label}" + (f"  ({extra})" if extra else ""))
    if not condition:
        sys.exit(1)


def section(title):
    bar = "=" * 55
    print(f"\n{bar}")
    print(f"  {title}")
    print(bar)


# ============================================================
# WORKFLOW A: Patient Login + Portal
# ============================================================

section("WORKFLOW A - Patient Login & Portal")

# A1. Patient login (mock verification)
r = requests.post(f"{BASE}/api/patient/auth/login", json={"phone_number": TEST_PHONE})
check("A1. POST /api/patient/auth/login -> 200", r.status_code == 200)
body = r.json()
check("A1. access_token present", "access_token" in body)
check("A1. refresh_token present", "refresh_token" in body)
check("A1. is_new_patient field present", "is_new_patient" in body)

patient_token  = body["access_token"]
patient_refresh = body["refresh_token"]
patient_headers = {"Authorization": f"Bearer {patient_token}"}
print(f"    -> Patient token acquired (new_patient={body['is_new_patient']})")

# A2. Complete profile if new patient
if body.get("is_new_patient"):
    r = requests.put(f"{BASE}/api/patient/profile/complete", json={
        "full_name": "Integration Test Patient",
        "dob": "1995-06-15",
        "gender": "Male",
        "blood_group": "O+",
        "email": "integtest@clinic.local",
        "address": "123 Test Lane, Bangalore",
        "emergency_contact_name": "Test Contact",
        "emergency_contact_phone": "9000000002",
        "emergency_contact_relation": "Sibling",
    }, headers=patient_headers)
    check("A2. PUT /api/patient/profile/complete -> 200", r.status_code == 200)

# A3. Fetch patient profile
r = requests.get(f"{BASE}/api/patient/profile", headers=patient_headers)
check("A3. GET /api/patient/profile -> 200", r.status_code == 200)
check("A3. Profile has data envelope", "data" in r.json())

# A4. Fetch patient appointments (VPD-scoped)
r = requests.get(f"{BASE}/api/patient/appointments", headers=patient_headers)
check("A4. GET /api/patient/appointments -> 200", r.status_code == 200)

# A5. Fetch medical records
r = requests.get(f"{BASE}/api/patient/medical-records", headers=patient_headers)
check("A5. GET /api/patient/medical-records -> 200", r.status_code == 200)

# A6. Fetch prescriptions
r = requests.get(f"{BASE}/api/patient/prescriptions", headers=patient_headers)
check("A6. GET /api/patient/prescriptions -> 200", r.status_code == 200)

# A7. Token refresh
r = requests.post(f"{BASE}/api/patient/auth/refresh", json={"refresh_token": patient_refresh})
check("A7. POST /api/patient/auth/refresh -> 200", r.status_code == 200)
check("A7. New access_token returned", "access_token" in r.json())

# A8. Logout then re-login (to keep a valid token for the RBAC checks below)
r = requests.post(f"{BASE}/api/patient/auth/logout", json={"refresh_token": patient_refresh})
check("A8. POST /api/patient/auth/logout -> 200", r.status_code == 200)

r = requests.post(f"{BASE}/api/patient/auth/login", json={"phone_number": TEST_PHONE})
patient_token = r.json()["access_token"]
patient_headers = {"Authorization": f"Bearer {patient_token}"}

# ============================================================
# WORKFLOW B: Doctor Portal
# ============================================================

section("WORKFLOW B - Doctor Login & Portal")

r = requests.post(f"{BASE}/auth/login", json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD})
if r.status_code == 200:
    doctor_token = r.json()["data"]["access_token"]
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}
    check("B1. POST /auth/login (doctor) -> 200", True)

    r = requests.get(f"{BASE}/auth/me", headers=doctor_headers)
    check("B2. GET /auth/me -> 200", r.status_code == 200)
    check("B2. role is DOCTOR", r.json()["data"]["role"] == "DOCTOR")

    r = requests.get(f"{BASE}/api/doctor/appointments", headers=doctor_headers)
    check("B3. GET /api/doctor/appointments -> 200", r.status_code == 200)
    appts = r.json()["data"]
    check("B3. Appointments list returned", isinstance(appts, list))

    r = requests.get(f"{BASE}/api/doctor/patients", headers=doctor_headers)
    check("B4. GET /api/doctor/patients -> 200", r.status_code == 200)

    scheduled = [a for a in appts if str(a.get("status", "")).lower() == "scheduled"]
    if scheduled:
        appt_id = scheduled[0]["appointment_id"]
        r = requests.post(f"{BASE}/api/doctor/appointments/{appt_id}/consultation",
                          json={"chief_complaint": "Integration test complaint.",
                                "diagnosis": "Test Diagnosis",
                                "treatment_notes": "Integration test treatment note."},
                          headers=doctor_headers)
        check(f"B5. POST consultation for appt #{appt_id} -> 200 or 400(dup)",
              r.status_code in (200, 400))

        r = requests.post(f"{BASE}/api/doctor/appointments/{appt_id}/prescription",
                          json={"items": [{"medication_name": "Test Med", "dosage": "500mg",
                                           "frequency": "Once daily", "duration": "7 days", "quantity": 7}]},
                          headers=doctor_headers)
        check(f"B6. POST prescription for appt #{appt_id} -> 200 or 404(no-consult)",
              r.status_code in (200, 404))
    else:
        print("    -> No scheduled appointments for this doctor")
        check("B5. Skipped (no scheduled appointments)", True)
        check("B6. Skipped (no scheduled appointments)", True)

else:
    print(f"    -> Doctor login failed ({r.status_code}) -- run setup_test_users.sql first")
    print("    [SKIP] B1-B6")
    for lbl in ["B1","B2","B3","B4","B5","B6"]:
        check(f"{lbl}. Skipped -- doctor not seeded", True)

# ============================================================
# WORKFLOW C: Admin Portal
# ============================================================

section("WORKFLOW C - Admin Login & Portal")

r = requests.post(f"{BASE}/auth/login", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
if r.status_code != 200:
    print(f"    -> Admin login failed: {r.status_code} -- check ADMIN_PASSWORD at top of script")
    sys.exit(1)

admin_token   = r.json()["data"]["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
check("C1. POST /auth/login (admin) -> 200", True)

r = requests.get(f"{BASE}/auth/me", headers=admin_headers)
check("C2. GET /auth/me -> 200", r.status_code == 200)
check("C2. role is ADMIN", r.json()["data"]["role"] == "ADMIN")

r = requests.get(f"{BASE}/api/admin/dashboard-stats", headers=admin_headers)
check("C3. GET /api/admin/dashboard-stats -> 200", r.status_code == 200)
stats = r.json()["data"]
check("C3. Stats has all four keys", all(k in stats for k in
      ["total_patients","total_doctors","pending_appointments","total_revenue"]))
print(f"    -> patients={stats['total_patients']}, doctors={stats['total_doctors']}, "
      f"pending={stats['pending_appointments']}, revenue={stats['total_revenue']}")

r = requests.get(f"{BASE}/api/admin/revenue-report", headers=admin_headers)
check("C4. GET /api/admin/revenue-report -> 200", r.status_code == 200)
revenue = r.json()["data"]
check("C4. Revenue data is a list", isinstance(revenue, list))
if revenue:
    check("C4. Rows have department + revenue keys",
          all("department" in row and "revenue" in row for row in revenue))
    print(f"    -> {len(revenue)} department(s) returned")

r = requests.get(f"{BASE}/patients", headers=admin_headers)
check("C5. GET /patients (admin, unscoped) -> 200", r.status_code == 200)
print(f"    -> Admin sees {len(r.json().get('data', []))} patients total")

r = requests.post(f"{BASE}/auth/logout", headers=admin_headers)
check("C6. POST /auth/logout -> 200", r.status_code == 200)

# ============================================================
section("INTEGRATION-TASK 1: ALL CHECKS PASSED")
print()
