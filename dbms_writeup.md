# Clinic Management System — DBMS Mini-Project Writeup

**Subject:** Database Management Systems (S26 — Semester 6)  
**Project:** Clinic Management System  
**Stack:** Oracle 19c · FastAPI (Python) · React + TypeScript  
**Student:** bt23cse012@students.vnit.ac.in

---

## 1. Project Overview

The Clinic Management System is a three-portal web application that models the complete lifecycle of a patient's interaction with a clinic — from registration and appointment booking through consultation, lab testing, pharmacy dispensing, and billing. The system uses Oracle's **Virtual Private Database (VPD)** to enforce row-level security so that doctors see only their own patients, patients see only their own records, and only the administrator has unrestricted access.

---

## 2. Entity List

### 2.1 Core Entities

| # | Entity | Description |
|---|--------|-------------|
| 1 | **DEPARTMENT** | Clinical divisions (Cardiology, Orthopaedics, etc.) with an optional head-of-department doctor |
| 2 | **DOCTOR** | Clinical staff: qualifications, specialisation, consultation fee, and department assignment |
| 3 | **STAFF** | Non-clinical personnel (receptionist, nurse, lab tech, pharmacist) |
| 4 | **PATIENT** | Demographic and contact details; one-to-one link with MEDICAL_RECORD |
| 5 | **MEDICAL_RECORD** | Long-term health summary: allergies, chronic conditions, surgical history, family history |
| 6 | **CLINIC_USER** | Authentication table; a user record exists for every portal login, linked to the corresponding DOCTOR or PATIENT row via `linked_entity_id` |
| 7 | **TOKEN_BLACKLIST** | Revoked JWTs; prevents re-use of tokens after logout |

### 2.2 Transactional Entities

| # | Entity | Description |
|---|--------|-------------|
| 8 | **APPOINTMENT** | A 30-minute consultation slot between one patient and one doctor; auto-creates a BILLING row on insert |
| 9 | **CONSULTATION** | Doctor's clinical notes (chief complaint, diagnosis, treatment notes) — one per appointment |
| 10 | **PRESCRIPTION** | Header for medication orders tied to one consultation |
| 11 | **PRESCRIPTION_ITEM** | Individual medication line items: dosage, frequency, duration, quantity |
| 12 | **BILLING** | Financial ledger; `total_amount` is a **virtual (computed) column** = `(fee + extra) × (1 − discount%) × (1 + 18% GST)` |
| 13 | **AUDIT_LOG** | Immutable DML audit trail storing old/new values as JSON CLOBs |

### 2.3 Extended Clinical Entities (Task 18)

| # | Entity | Description |
|---|--------|-------------|
| 14 | **LAB_TEST_CATALOGUE** | Master list of 20 diagnostic tests with pricing and turnaround times |
| 15 | **LAB_ORDER** | Doctor raises a test request within a consultation; status progresses PENDING → COMPLETED |
| 16 | **LAB_RESULT** | Result uploaded per order; `is_abnormal` flag surfaces priority items |
| 17 | **VITAL_SIGNS** | Pre-consultation vitals: BP (systolic/diastolic), heart rate, temperature, SpO₂, weight, height — one set per consultation |
| 18 | **PHARMACY_ITEM** | Clinic drug inventory with batch number, expiry, reorder threshold |
| 19 | **DISPENSING** | Medicines actually dispensed from pharmacy per prescription; triggers stock deduction |

### 2.4 Task 19 Entities

| # | Entity | Description |
|---|--------|-------------|
| 20 | **PATIENT_FAMILY_LINK** | Bidirectional family relationships between two patient records (SPOUSE, PARENT, CHILD, SIBLING, GUARDIAN) |
| 21 | **DOCTOR_LEAVE** | Doctor's unavailability windows; a booking trigger rejects appointments that overlap an approved leave window |
| 22 | **EMERGENCY_REQUEST** | Patient-raised emergency with severity (LOW/MODERATE/HIGH/CRITICAL), location, and description; admin assigns a doctor |
| 23 | **DOCTOR_NOTIFICATION** | In-app alerts sent to doctors (appointment cancellations, critical emergencies) |
| 24 | **PATIENT_NOTIFICATION** | In-app alerts sent to patients (lab results ready, appointment changes) |

---

## 3. Relationships

```
DEPARTMENT ─── (1:N) ─── DOCTOR           (a department has many doctors)
DEPARTMENT ─── (0:1) ─── DOCTOR           (a department may have one head doctor — self-referencing via head_doctor_id)
DEPARTMENT ─── (1:N) ─── STAFF            (support staff belong to a department)

DOCTOR     ─── (1:N) ─── APPOINTMENT      (a doctor handles many appointments)
PATIENT    ─── (1:N) ─── APPOINTMENT      (a patient books many appointments)
DEPARTMENT ─── (1:N) ─── APPOINTMENT      (appointments are categorised by department)

APPOINTMENT ── (1:1) ─── BILLING          (each appointment generates exactly one invoice)
APPOINTMENT ── (1:1) ─── CONSULTATION     (at most one clinical note per appointment)

CONSULTATION ─ (1:1) ─── PRESCRIPTION     (at most one prescription per consultation)
PRESCRIPTION ─ (1:N) ─── PRESCRIPTION_ITEM (a prescription has one or more medication lines)

CONSULTATION ─ (1:N) ─── LAB_ORDER       (multiple tests can be ordered per consultation)
LAB_ORDER   ── (1:1) ─── LAB_RESULT      (one result upload per order)
CONSULTATION ─ (1:1) ─── VITAL_SIGNS     (one vitals set per consultation)

PRESCRIPTION ─ (1:N) ─── DISPENSING      (multiple items dispensed per prescription)
PHARMACY_ITEM ─(1:N) ─── DISPENSING      (an item can be dispensed many times)

PATIENT    ─── (1:1) ─── MEDICAL_RECORD  (one permanent health summary per patient)
PATIENT    ─── (M:N) ─── PATIENT         (via PATIENT_FAMILY_LINK: family relationships)

DOCTOR     ─── (1:N) ─── DOCTOR_LEAVE    (a doctor may declare multiple leave windows)
PATIENT    ─── (1:N) ─── EMERGENCY_REQUEST
DOCTOR     ─── (1:N) ─── DOCTOR_NOTIFICATION
PATIENT    ─── (1:N) ─── PATIENT_NOTIFICATION

CLINIC_USER ── (0:1) ─── DOCTOR / PATIENT (via linked_entity_id — polymorphic reference)
```

---

## 4. Functional Dependencies (FDs)

For each table the primary key is **underlined**.

### DEPARTMENT
- **department_id** → name, description, location, head_doctor_id
- name → department_id *(candidate key: department name is unique)*

### DOCTOR
- **doctor_id** → employee_id, full_name, specialisation, qualification, years_of_experience, contact, email, consultation_fee, department_id
- employee_id → doctor_id *(candidate key)*
- email → doctor_id *(candidate key)*

### PATIENT
- **patient_id** → full_name, dob, gender, blood_group, contact_number, email, address, emergency_contact_*, insurance_*
- email → patient_id *(candidate key)*

### MEDICAL_RECORD
- **record_id** → patient_id, allergies, chronic_conditions, surgical_history, family_history, vaccination_records
- patient_id → record_id *(candidate key — one record per patient)*

### APPOINTMENT
- **appointment_id** → patient_id, doctor_id, department_id, appt_date, slot_start, status
- (doctor_id, appt_date, slot_start) → appointment_id *(candidate key — unique slot per doctor)*

### CONSULTATION
- **consultation_id** → appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date
- appointment_id → consultation_id *(candidate key — one consultation per appointment)*

### PRESCRIPTION
- **prescription_id** → consultation_id
- consultation_id → prescription_id *(candidate key — one prescription per consultation)*

### PRESCRIPTION_ITEM
- **item_id** → prescription_id, medication_name, dosage, frequency, duration, quantity

### BILLING
- **billing_id** → appointment_id, consultation_fee, additional_charges, discount_pct, tax_pct, total_amount, amount_paid, payment_mode, payment_status
- appointment_id → billing_id *(candidate key)*
- {consultation_fee, additional_charges, discount_pct, tax_pct} → total_amount *(derived; implemented as virtual column)*

### LAB_ORDER
- **lab_order_id** → consultation_id, patient_id, lab_test_id, ordered_by_doctor_id, status, priority, clinical_notes

### LAB_RESULT
- **result_id** → lab_order_id, result_text, result_summary, is_abnormal, reviewed_by_doctor_id
- lab_order_id → result_id *(candidate key)*

### VITAL_SIGNS
- **vital_id** → consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate, temperature, weight_kg, height_cm, spo2, respiratory_rate, notes
- consultation_id → vital_id *(candidate key)*

### BILLING — transitive FD note
```
billing_id → appointment_id → (patient_id, doctor_id)
```
The billing row does NOT store patient_id or doctor_id directly; those are reached via APPOINTMENT. This avoids a transitive dependency in BILLING itself.

---

## 5. Normalisation

### 5.1 First Normal Form (1NF)

**Definition:** Every attribute must be atomic (no repeating groups or set-valued attributes); each row is uniquely identifiable.

**How this schema satisfies 1NF:**

- All columns hold single atomic values. Multi-valued data (e.g., prescription medications) is split into separate rows in PRESCRIPTION_ITEM rather than a comma-separated string.
- Allergies and chronic conditions are stored as free-text VARCHAR2 strings in MEDICAL_RECORD rather than as a list — while this is a pragmatic choice, each cell still holds a single value.
- Every table has a surrogate primary key (`GENERATED ALWAYS AS IDENTITY`), guaranteeing row uniqueness.
- No repeating groups: APPOINTMENT does not embed doctor or patient data; BILLING does not embed a list of charges; PRESCRIPTION does not embed medication names.

**Example of 1NF violation avoided:**

A naive design might store prescriptions as:
```
APPOINTMENT(appt_id, patient, doctor, medications_csv)
```
This violates 1NF. Instead we use:
```
APPOINTMENT → CONSULTATION → PRESCRIPTION → PRESCRIPTION_ITEM (one row per drug)
```

### 5.2 Second Normal Form (2NF)

**Definition:** The relation is in 1NF and every non-key attribute is fully functionally dependent on the *entire* primary key (no partial dependencies; applies only to composite PKs).

**All tables in this schema use single-attribute surrogate PKs**, so partial dependency is structurally impossible. There are no composite primary keys.

However, a partial-dependency scenario was explicitly avoided in PRESCRIPTION_ITEM:

**Potential violation (not implemented):**
```
PRESCRIPTION_ITEM(prescription_id, medication_name, dosage, frequency, duration, unit_price)
-- If we made (prescription_id, medication_name) the PK:
-- unit_price might depend only on medication_name (not the whole composite key) → partial dependency
```

**Resolution:** `item_id` is the surrogate PK, and unit price is not stored here at all — the pharmacy catalogue (PHARMACY_ITEM) holds pricing. This keeps PRESCRIPTION_ITEM in 2NF with no anomalies.

### 5.3 Third Normal Form (3NF)

**Definition:** The relation is in 2NF and every non-key attribute is non-transitively dependent on the primary key (no non-key attribute determines another non-key attribute).

**Key design decisions that achieve 3NF:**

**1. BILLING — consultation_fee is not derived from doctor**

A transitive dependency would arise if:
```
billing_id → doctor_id → consultation_fee
```
Since the doctor's fee can change over time, the fee is **snapshotted** into BILLING.consultation_fee at the time of booking (by `TRG_CREATE_BILLING`). This breaks the transitive chain and preserves historical accuracy.

**2. APPOINTMENT — department_id is not derived only from doctor_id**

Although `doctor_id → department_id` holds as a fact, APPOINTMENT explicitly stores `department_id` because:
- Appointments can exist without a doctor (referral/walk-in path)
- The VPD filter needs `department_id` at query time without joining DOCTOR

This is a deliberate **denormalization for performance** and is documented in comments. A stricter 3NF schema would remove `department_id` from APPOINTMENT and derive it via JOIN.

**3. CONSULTATION — patient_id not stored**

CONSULTATION does not store `patient_id` even though `appointment_id → patient_id`. Storing it would create a transitive dependency:
```
consultation_id → appointment_id → patient_id  (transitive)
```
This is correctly resolved by joining: `CONSULTATION → APPOINTMENT` to reach the patient.

**4. LAB_ORDER — patient_id denormalisation**

LAB_ORDER *does* store `patient_id` even though `consultation_id → appointment_id → patient_id`. This is a conscious 3NF violation for:
- VPD filter efficiency (avoids a two-level join in the policy function)
- Fast patient-scoped queries in the lab portal

This is explicitly documented in `task18_extended_schema.sql` comments.

**Summary table:**

| Table | 1NF | 2NF | 3NF | Notes |
|-------|-----|-----|-----|-------|
| DEPARTMENT | ✓ | ✓ | ✓ | |
| DOCTOR | ✓ | ✓ | ✓ | |
| STAFF | ✓ | ✓ | ✓ | |
| PATIENT | ✓ | ✓ | ✓ | |
| MEDICAL_RECORD | ✓ | ✓ | ✓ | |
| APPOINTMENT | ✓ | ✓ | ✓* | `department_id` is a documented denorm |
| CONSULTATION | ✓ | ✓ | ✓ | |
| PRESCRIPTION | ✓ | ✓ | ✓ | |
| PRESCRIPTION_ITEM | ✓ | ✓ | ✓ | |
| BILLING | ✓ | ✓ | ✓ | fee snapshotted at booking time |
| LAB_ORDER | ✓ | ✓ | ✓* | `patient_id` denorm for VPD |
| LAB_RESULT | ✓ | ✓ | ✓ | |
| VITAL_SIGNS | ✓ | ✓ | ✓* | `patient_id` denorm for VPD |
| PHARMACY_ITEM | ✓ | ✓ | ✓ | |
| DISPENSING | ✓ | ✓ | ✓* | `patient_id` denorm for VPD |
| CLINIC_USER | ✓ | ✓ | ✓ | |

### 5.4 BCNF Notes

**Definition:** The relation is in 3NF and for every non-trivial FD X → Y, X is a superkey.

The schema is mostly in BCNF. The one exception worth noting:

**APPOINTMENT — slot uniqueness**

APPOINTMENT has two candidate keys:
1. `appointment_id` (surrogate PK)
2. `(doctor_id, appt_date, slot_start)` (business key — enforced by `UQ_APPOINTMENT_SLOT`)

Consider the FD:
```
(doctor_id, appt_date, slot_start) → appointment_id
```
Both sides are superkeys, so this is BCNF-compliant.

However, `appointment_id → appt_date` and `appointment_id → doctor_id` are also valid. Since `appointment_id` is a superkey, no BCNF violation occurs.

**BILLING.tax_pct**

`tax_pct` is constrained to always equal 18.00 (`CK_BILLING_TAX`). This means:
```
tax_pct = 18.00  (constant — not a dependency on any key)
```
Strictly, this is a domain constraint, not an FD. No BCNF violation.

---

## 6. Trigger Catalogue

| Trigger | Event | Purpose |
|---------|-------|---------|
| `TRG_CREATE_BILLING` | AFTER INSERT on APPOINTMENT | Auto-creates a BILLING row with snapshotted consultation fee and GST = 18% |
| `TRG_BILLING_STATUS` | BEFORE UPDATE on BILLING | Automatically sets `payment_status` to PENDING / PARTIAL / PAID based on `amount_paid` vs `total_amount` |
| `TRG_AUDIT_PATIENT` | AFTER INSERT/UPDATE/DELETE on PATIENT | Writes JSON old/new value diff into AUDIT_LOG |
| `trg_dispensing_deduct_stock` | AFTER INSERT on DISPENSING | Decrements `PHARMACY_ITEM.stock_quantity` by `quantity_dispensed` |
| `trg_doctor_leave_block_booking` | BEFORE INSERT on APPOINTMENT | Raises ORA-20010 if the appointment slot falls within an approved DOCTOR_LEAVE window |
| `trg_emergency_fanout` | AFTER INSERT on EMERGENCY_REQUEST | Notifies all doctors for CRITICAL severity; notifies the assigned department's doctors otherwise |
| `trg_cancel_voids_invoice` | AFTER UPDATE on APPOINTMENT | Sets BILLING.payment_status = 'VOID' when appointment is cancelled |
| `trg_cancel_notify_doctor` | AFTER UPDATE on APPOINTMENT | Inserts a CANCELLATION notification into DOCTOR_NOTIFICATION when appointment cancelled |
| `trg_lab_result_notify` | AFTER INSERT on LAB_RESULT | Inserts a LAB_READY notification into PATIENT_NOTIFICATION |

---

## 7. View and Materialized View Catalogue

| View | Type | Description |
|------|------|-------------|
| `V_PATIENT_SUMMARY` | Regular view | Patient ID, name, age, blood group, last appointment date, total visits, outstanding balance |
| `V_DOCTOR_SCHEDULE_TODAY` | Regular view | All today's slots for all doctors with patient name and status |
| `V_BILLING_OUTSTANDING` | Regular view | Unpaid and partially-paid invoices with full patient and doctor details |
| `V_DEPT_REVENUE` | **Materialized view** | Per-department monthly revenue: total billed, total collected, collection rate %; refreshed on demand via `DBMS_MVIEW.REFRESH` |

---

## 8. Index Catalogue

| Index | Table | Columns | Rationale |
|-------|-------|---------|-----------|
| `idx_appt_patient` | APPOINTMENT | patient_id | Patient portal appointment queries |
| `idx_appt_doctor` | APPOINTMENT | doctor_id | Doctor portal schedule queries + VPD filter |
| `idx_appt_date` | APPOINTMENT | appt_date | Date-range filters for scheduling |
| `idx_billing_appt` | BILLING | appointment_id | Billing lookup by appointment |
| `idx_lab_order_patient` | LAB_ORDER | patient_id | Patient lab results query |
| `idx_lab_order_doctor` | LAB_ORDER | ordered_by_doctor_id | Doctor's ordered tests |
| `idx_lab_order_consult` | LAB_ORDER | consultation_id | Orders per consultation |
| `idx_lab_order_status` | LAB_ORDER | status | Admin lab management filters |
| `idx_vital_patient` | VITAL_SIGNS | patient_id | Patient vitals history |
| `idx_dispensing_patient` | DISPENSING | patient_id | Pharmacy dispensing per patient |
| `idx_dispensing_presc` | DISPENSING | prescription_id | Dispensing per prescription |
| `idx_pharmacy_active` | PHARMACY_ITEM | is_active, is_deleted | Active stock query |
| `idx_appt_dept` | APPOINTMENT | department_id | Department-based appointment reports |

---

## 9. Virtual Private Database (VPD) Design

Oracle's `DBMS_RLS` (Row-Level Security) is used to enforce **row-level access control** at the database layer — transparent to the application.

### Context Package
```sql
clinic_ctx_pkg.set_role(role)          -- 'ADMIN' | 'DOCTOR' | 'PATIENT'
clinic_ctx_pkg.set_doctor_id(id)       -- called during doctor login
clinic_ctx_pkg.set_patient_id(id)      -- called during patient login
```

### Filter Function: `vpd_patient_filter`

Returns a SQL WHERE clause fragment that Oracle appends to every SELECT/UPDATE/DELETE on protected tables:

| Role | Table | Predicate appended |
|------|-------|--------------------|
| ADMIN | all | *(empty — no restriction)* |
| DOCTOR | APPOINTMENT | `doctor_id = <id>` |
| DOCTOR | CONSULTATION | `appointment_id IN (SELECT … WHERE doctor_id = <id>)` |
| DOCTOR | LAB_ORDER | `ordered_by_doctor_id = <id>` |
| PATIENT | APPOINTMENT | `patient_id = <id>` |
| PATIENT | MEDICAL_RECORD | `patient_id = <id>` |
| PATIENT | CONSULTATION | `appointment_id IN (SELECT … WHERE patient_id = <id>)` |
| PATIENT | LAB_ORDER, VITAL_SIGNS, DISPENSING | `patient_id = <id>` |
| Unknown | all | `1=0` *(no rows visible)* |

### Protected Tables
`APPOINTMENT`, `BILLING`, `CONSULTATION`, `PRESCRIPTION`, `MEDICAL_RECORD`, `LAB_ORDER`, `LAB_RESULT`, `VITAL_SIGNS`, `DISPENSING`

---

## 10. Authentication Architecture

- **Staff (Admin/Doctor):** Username + bcrypt password → JWT access token (30 min) + refresh token (7 days). On login, Oracle session context is set: `set_role('DOCTOR')`, `set_doctor_id(X)`.
- **Patient:** Phone number → OTP (6-digit, TTL 10 min, stored hashed). On verify, context set: `set_role('PATIENT')`, `set_patient_id(X)`.
- **Logout:** Access token added to `TOKEN_BLACKLIST`; middleware rejects blacklisted tokens.
- **VPD context lifetime:** Set per-request in the FastAPI dependency `get_current_user`. Since `Depends(get_db)` reuses the same connection within a request, the context set during authentication is available to all queries in the same request handler.

---

## 11. API Route Summary

### Patient Portal (`/api/patient/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Own profile |
| PUT | `/profile/complete` | Complete registration |
| GET | `/appointments` | Own appointments |
| POST | `/appointments` | Book appointment |
| PATCH | `/appointments/{id}/cancel` | Cancel scheduled appointment |
| GET | `/doctors` | List available doctors |
| GET | `/medical-records` | Health summary |
| GET | `/consultations` | Full consultation history timeline |
| GET | `/prescriptions` | Prescriptions with items |
| GET | `/notifications` | In-app notifications |
| PATCH | `/notifications/read-all` | Mark all read |
| POST | `/emergency` | Raise emergency request |

### Doctor Portal (`/api/doctor/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/appointments` | VPD-scoped schedule |
| GET | `/patients` | Distinct patients seen |
| POST | `/appointments/{id}/consultation` | Create consultation notes |
| POST | `/appointments/{id}/prescription` | Issue prescription |
| PATCH | `/appointments/{id}/complete` | Mark appointment complete |
| GET | `/leave` | Own leave requests |
| POST | `/leave` | Request leave |
| GET | `/notifications` | In-app notifications |
| PATCH | `/notifications/read-all` | Mark all read |

### Admin Portal (`/api/admin/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard-stats` | KPI cards (patients, appointments, revenue, pending bills) |
| GET | `/revenue-report` | Per-department revenue (refreshes materialized view) |
| GET | `/emergency-queue` | Severity-sorted emergency requests |
| PATCH | `/emergency/{id}/assign` | Assign doctor to emergency |
| PATCH | `/emergency/{id}/resolve` | Resolve emergency |

---

## 12. ER Diagram (Text Representation)

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│  DEPARTMENT │──1:N──│    DOCTOR    │──1:N──│ APPOINTMENT  │
│  (dept_id)  │       │  (doctor_id) │       │  (appt_id)   │
└─────────────┘       └──────────────┘       └──────┬───────┘
       │                      │                      │1:1
      1:N                    1:N              ┌──────┴───────┐
       │               DOCTOR_LEAVE          │   BILLING    │
  ┌────┴───┐                                 │  (total_amt  │
  │ STAFF  │                                 │   virtual)   │
  └────────┘                                 └──────────────┘
                                                     │1:1
┌──────────┐       ┌──────────────┐          ┌───────┴──────┐
│  PATIENT │──1:N──│ APPOINTMENT  │──1:1─────│CONSULTATION  │
│(pat_id)  │       └──────────────┘          └──────┬───────┘
│          │                                        │1:1
│          │──1:1──MEDICAL_RECORD                   ├──── VITAL_SIGNS
│          │                                        │1:1
│          │──1:N──EMERGENCY_REQ                    ├──── PRESCRIPTION ──1:N── PRESCRIPTION_ITEM
│          │                                        │
│          │──1:N──PATIENT_NOTIF                    └──1:N── LAB_ORDER ──1:1── LAB_RESULT
└──────────┘
```

---

## 13. Sample Queries Demonstrating Concepts

### 3NF Query — no transitive resolution needed
```sql
-- Get patient's full consultation history with doctor and department
SELECT c.consultation_id, c.diagnosis, c.chief_complaint,
       a.appt_date, d.full_name AS doctor, dep.name AS department
FROM CONSULTATION c
JOIN APPOINTMENT a  ON c.appointment_id = a.appointment_id
JOIN DOCTOR d       ON a.doctor_id = d.doctor_id
JOIN DEPARTMENT dep ON a.department_id = dep.department_id
WHERE a.patient_id = :pid
ORDER BY a.appt_date DESC;
```

### VPD in action — same query, different session contexts
```sql
-- When run as DOCTOR session (VPD appends: appointment_id IN (...doctor_id=X...))
SELECT * FROM CONSULTATION;   -- returns only this doctor's consultations

-- When run as PATIENT session (VPD appends: appointment_id IN (...patient_id=Y...))
SELECT * FROM CONSULTATION;   -- returns only this patient's consultations

-- When run as ADMIN session (VPD appends nothing)
SELECT * FROM CONSULTATION;   -- returns all rows
```

### Virtual column + trigger interaction
```sql
-- BILLING.total_amount is a virtual column, cannot be inserted directly
-- TRG_BILLING_STATUS reads it and sets payment_status automatically:
UPDATE BILLING SET amount_paid = 590 WHERE billing_id = 1;
-- After trigger: payment_status = 'PAID' if amount_paid = total_amount
--               payment_status = 'PARTIAL' if 0 < amount_paid < total_amount
--               payment_status = 'PENDING' if amount_paid = 0
```

---

*Generated: 2026-04-17*
