# Three-Portal Architecture Implementation

This document outlines the sequential plan to transition the existing Clinic Management System into a secure, three-portal architecture with strict role-based access control (RBAC) enforced at the database (Virtual Private Database), backend (FastAPI middleware), and frontend levels.

## User Review Required

> [!WARNING]  
> This plan will fundamentally alter database constraints and modify the way FastAPI connects to Oracle. Existing open connections or unauthenticated sessions might be invalidated. Please review the database tasks to ensure these changes are safe to deploy to the `XEPDB1` instance!

## Execution Rules & Strategy
1. **One Task per Turn**: We will sequentially execute exactly one task at a time.
2. **Mandatory Verification**: Every task includes an explicit `VERIFICATION STEP`. We will run these steps and confirm success before proceeding to the next task.
3. **Escalation Protocol**: If any task fails twice with the same error, we will halt and request manual intervention using the Escalation Template.

---

## Phase 1: Database Security Layer

### DB-TASK 1 — OTP and Session Tables
- Create `PATIENT_OTP` and `PATIENT_SESSION`.
- Alter `PATIENT` to include `phone_number` and `otp_verified`.
- Create corresponding indexes safely via `BEGIN/EXCEPTION` blocks.
- **Verification**: Ensure tables exist in `user_tables`.

### DB-TASK 2 — Virtual Private Database (VPD)
- Create `clinic_ctx` Application Context and `clinic_ctx_pkg` package.
- Formulate `vpd_patient_filter` function to scope rows by `patient_id` and `doctor_id`.
- Apply `DBMS_RLS.ADD_POLICY` on tables: `APPOINTMENT`, `BILLING`, `MEDICAL_RECORD`, `CONSULTATION`, `PRESCRIPTION`.
- **Verification**: Verify policies in `all_policies` and test context scoping manually.

### DB-TASK 3 — FastAPI Context Middleware
- Implement `set_db_context` directly inside Oracle Connection pool checkout logic.
- Ensure all routers correctly pass JWT scoped `role` and `entity_id`.

---

## Phase 2: Backend Role Scoping

### BE-TASK 1 — OTP Auth Endpoints
- Implement `POST /api/patient/auth/request-otp`.
- Implement `POST /api/patient/auth/verify-otp`.
- Setup Token refresh endpoints.

### BE-TASK 2 — Patient Portal Endpoints
- Create patient-specific interfaces relying fully on VPD scoping (no explicit `WHERE` clauses required).

### BE-TASK 3 — Doctor Portal Endpoints
- Implement Doctor schedule isolation, complete consultation endpoints, and prescription mapping wrappers.

### BE-TASK 4 — Admin Portal Endpoints
- Add expansive reporting interfaces for admin dashboard and role management without scope limitations.

---

## Phase 3: Frontend Decomposition

### PT-TASK 1 to PT-6 — Patient Portal (`/clinic-patient`)
Create a new Vite + React + TS project on Port 5173 containing OTP login and appointment booking components.

### DR-TASK 1 to DR-5 — Doctor Portal (`/clinic-doctor`)
Scaffold application on Port 5174 focusing on JWT Auth, day-schedule visualization, and consultation forms.

### AD-TASK 1 to AD-7 — Admin Portal (`/clinic-admin`)
Scaffold application on Port 5175 utilizing Recharts and comprehensive data grid management.

---

## Open Questions
- Shall we begin executing `DB-TASK 1` exactly as instructed?
