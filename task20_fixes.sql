-- =============================================================
-- TASK 20: TARGETED FIXES
-- 1. Phone-number 10-digit CHECK on PATIENT
-- 2. Appointment date-range trigger (no past, max 30 days ahead)
-- 3. Replace status-blind UQ_APPOINTMENT_SLOT with a partial
--    function-based index that allows CANCELLED slots to be rebooked
-- 4. Strip "Dr. " prefix from DOCTOR.full_name (stored in seed)
-- =============================================================
-- Idempotent: each block is wrapped in EXCEPTION WHEN OTHERS so
-- re-running on a DB where the change already exists is a no-op.
-- =============================================================

SET DEFINE OFF

-- =============================================================
-- SECTION 1: PHONE-NUMBER 10-DIGIT CHECK ON PATIENT
-- Applies to phone_number (OTP login) and contact_number (profile)
-- =============================================================

-- Drop old loose phone constraint if it somehow already exists
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE PATIENT DROP CONSTRAINT chk_patient_phone_10digits';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE PATIENT DROP CONSTRAINT chk_patient_contact_10digits';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- Add strict 10-digit constraint on phone_number (OTP login phone)
BEGIN
  EXECUTE IMMEDIATE q'[ALTER TABLE PATIENT ADD CONSTRAINT chk_patient_phone_10digits
    CHECK (phone_number IS NULL OR REGEXP_LIKE(phone_number, '^[0-9]{10}$'))]';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -2264 THEN RAISE; END IF; -- -2264 = constraint already exists
END;
/

-- Add strict 10-digit constraint on contact_number (profile registration)
BEGIN
  EXECUTE IMMEDIATE q'[ALTER TABLE PATIENT ADD CONSTRAINT chk_patient_contact_10digits
    CHECK (contact_number IS NULL OR REGEXP_LIKE(contact_number, '^[0-9]{10}$'))]';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -2264 THEN RAISE; END IF;
END;
/

-- =============================================================
-- SECTION 2: APPOINTMENT DATE-RANGE TRIGGER
-- Blocks past dates and bookings > 30 days ahead.
-- Oracle CHECK cannot reference SYSDATE, so this lives in a trigger.
-- =============================================================
CREATE OR REPLACE TRIGGER trg_appt_date_range
BEFORE INSERT OR UPDATE OF appt_date ON APPOINTMENT
FOR EACH ROW
BEGIN
  IF :NEW.appt_date < TRUNC(SYSDATE) THEN
    RAISE_APPLICATION_ERROR(-20021, 'Appointment date cannot be in the past.');
  END IF;
  IF :NEW.appt_date > TRUNC(SYSDATE) + 30 THEN
    RAISE_APPLICATION_ERROR(-20022,
      'Appointments can only be booked up to 30 days in advance.');
  END IF;
END;
/

-- =============================================================
-- SECTION 3: REPLACE STATUS-BLIND UNIQUE CONSTRAINT
-- The original UQ_APPOINTMENT_SLOT (task6) blocks rebooking a
-- CANCELLED slot because it applies to all rows regardless of status.
-- We drop it and replace with a function-based partial index:
--   - CANCELLED rows → all three CASE expressions return NULL →
--     Oracle does NOT create an index entry (all-NULL composite) →
--     cancelled rows never collide with anything.
--   - Non-CANCELLED rows → index entries ARE created using the
--     actual (doctor_id, appt_date, slot_start) values → duplicates
--     collide and raise ORA-00001 (belt-and-braces alongside the trigger).
-- =============================================================

-- Drop the old unique constraint
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE APPOINTMENT DROP CONSTRAINT UQ_APPOINTMENT_SLOT';
EXCEPTION WHEN OTHERS THEN NULL; -- already dropped or never existed
END;
/

-- Drop the new index if it somehow already exists (idempotency)
BEGIN
  EXECUTE IMMEDIATE 'DROP INDEX ux_appt_doctor_slot_active';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

CREATE UNIQUE INDEX ux_appt_doctor_slot_active
  ON APPOINTMENT (
    CASE WHEN status != 'CANCELLED' THEN doctor_id   END,
    CASE WHEN status != 'CANCELLED' THEN appt_date   END,
    CASE WHEN status != 'CANCELLED' THEN slot_start  END
  );

-- =============================================================
-- SECTION 4: STRIP "Dr. " PREFIX FROM DOCTOR.full_name
-- The seed data stored names WITH the prefix (e.g. 'Dr. Rajesh Sharma').
-- All UI render sites already prepend "Dr. " in JSX, causing double-prefix.
-- Fix once at the DB layer; UI code stays unchanged.
-- =============================================================
UPDATE DOCTOR
SET full_name = REGEXP_REPLACE(full_name, '^(Dr\.?\s+)+', '', 1, 0, 'i')
WHERE REGEXP_LIKE(full_name, '^Dr\.?\s+', 'i');
COMMIT;

-- =============================================================
-- VERIFICATION
-- =============================================================
SELECT constraint_name, search_condition
FROM user_constraints
WHERE table_name = 'PATIENT'
  AND constraint_name IN ('CHK_PATIENT_PHONE_10DIGITS', 'CHK_PATIENT_CONTACT_10DIGITS');

SELECT trigger_name, status
FROM user_triggers
WHERE trigger_name IN ('TRG_APPT_DATE_RANGE', 'TRG_NO_DOUBLE_BOOKING');

SELECT index_name, uniqueness
FROM user_indexes
WHERE index_name = 'UX_APPT_DOCTOR_SLOT_ACTIVE';

SELECT full_name FROM DOCTOR ORDER BY doctor_id;
-- Expected: names WITHOUT "Dr. " prefix
