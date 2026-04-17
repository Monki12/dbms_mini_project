-- =============================================================
-- TASK 19: CLINICAL EXTENSIONS
-- New tables: PATIENT_FAMILY_LINK, DOCTOR_LEAVE,
--             EMERGENCY_REQUEST, DOCTOR_NOTIFICATION,
--             PATIENT_NOTIFICATION
-- New triggers: leave-block-booking, emergency-fanout,
--               cancel-voids-invoice, lab-result-notify
-- =============================================================
SET DEFINE OFF

-- =============================================================
-- SECTION 1: PATIENT_FAMILY_LINK
-- Links two existing patients with a relationship label
-- =============================================================
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE PATIENT_FAMILY_LINK (
      link_id              NUMBER(10)   GENERATED ALWAYS AS IDENTITY,
      patient_id           NUMBER(10)   NOT NULL,
      relative_patient_id  NUMBER(10)   NOT NULL,
      relation_type        VARCHAR2(50) NOT NULL,
      created_at           TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      created_by           VARCHAR2(100) NOT NULL,
      CONSTRAINT PK_FAM_LINK     PRIMARY KEY (link_id),
      CONSTRAINT FK_FL_PATIENT   FOREIGN KEY (patient_id)          REFERENCES PATIENT(patient_id),
      CONSTRAINT FK_FL_RELATIVE  FOREIGN KEY (relative_patient_id) REFERENCES PATIENT(patient_id),
      CONSTRAINT UQ_FAM_LINK     UNIQUE (patient_id, relative_patient_id),
      CONSTRAINT CK_FL_RELATION  CHECK (relation_type IN (
          ''SPOUSE'',''PARENT'',''CHILD'',''SIBLING'',''GUARDIAN'',''OTHER''
      )),
      CONSTRAINT CK_FL_SELF      CHECK (patient_id != relative_patient_id)
    )';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- =============================================================
-- SECTION 2: DOCTOR_LEAVE
-- Doctor declares unavailable windows; booking trigger uses this
-- =============================================================
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE DOCTOR_LEAVE (
      leave_id    NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
      doctor_id   NUMBER(10)    NOT NULL,
      start_ts    TIMESTAMP     NOT NULL,
      end_ts      TIMESTAMP     NOT NULL,
      reason      VARCHAR2(500),
      approved    NUMBER(1)     DEFAULT 1 NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      created_by  VARCHAR2(100) NOT NULL,
      CONSTRAINT PK_DOCTOR_LEAVE   PRIMARY KEY (leave_id),
      CONSTRAINT FK_DL_DOCTOR      FOREIGN KEY (doctor_id) REFERENCES DOCTOR(doctor_id),
      CONSTRAINT CK_DL_DATES       CHECK (end_ts > start_ts),
      CONSTRAINT CK_DL_APPROVED    CHECK (approved IN (0,1))
    )';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- =============================================================
-- SECTION 3: EMERGENCY_REQUEST
-- Patient-raised emergencies; admins see and assign a doctor
-- =============================================================
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE EMERGENCY_REQUEST (
      request_id      NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
      patient_id      NUMBER(10)    NOT NULL,
      severity        VARCHAR2(10)  DEFAULT ''MODERATE'' NOT NULL,
      location_text   VARCHAR2(500),
      description     VARCHAR2(1000),
      status          VARCHAR2(10)  DEFAULT ''OPEN'' NOT NULL,
      assigned_doctor_id NUMBER(10),
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      resolved_at     TIMESTAMP WITH TIME ZONE,
      created_by      VARCHAR2(100) NOT NULL,
      CONSTRAINT PK_EMERGENCY      PRIMARY KEY (request_id),
      CONSTRAINT FK_ER_PATIENT     FOREIGN KEY (patient_id)          REFERENCES PATIENT(patient_id),
      CONSTRAINT FK_ER_DOCTOR      FOREIGN KEY (assigned_doctor_id)  REFERENCES DOCTOR(doctor_id) ON DELETE SET NULL,
      CONSTRAINT CK_ER_SEVERITY    CHECK (severity IN (''LOW'',''MODERATE'',''HIGH'',''CRITICAL'')),
      CONSTRAINT CK_ER_STATUS      CHECK (status IN (''OPEN'',''ASSIGNED'',''RESOLVED''))
    )';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- =============================================================
-- SECTION 4: DOCTOR_NOTIFICATION
-- In-app alerts for doctors (lab results, emergencies, cancellations)
-- =============================================================
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE DOCTOR_NOTIFICATION (
      notif_id    NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
      doctor_id   NUMBER(10)    NOT NULL,
      message     VARCHAR2(1000) NOT NULL,
      notif_type  VARCHAR2(20)  DEFAULT ''INFO'' NOT NULL,
      ref_id      NUMBER(10),
      read_flag   CHAR(1)       DEFAULT ''N'' NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT PK_DOC_NOTIF    PRIMARY KEY (notif_id),
      CONSTRAINT FK_DN_DOCTOR    FOREIGN KEY (doctor_id) REFERENCES DOCTOR(doctor_id),
      CONSTRAINT CK_DN_READ      CHECK (read_flag IN (''Y'',''N'')),
      CONSTRAINT CK_DN_TYPE      CHECK (notif_type IN (''EMERGENCY'',''LAB_READY'',''CANCELLATION'',''INFO''))
    )';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- =============================================================
-- SECTION 5: PATIENT_NOTIFICATION
-- In-app alerts for patients (lab results ready, appointment reminders)
-- =============================================================
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE PATIENT_NOTIFICATION (
      notif_id    NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
      patient_id  NUMBER(10)    NOT NULL,
      message     VARCHAR2(1000) NOT NULL,
      notif_type  VARCHAR2(20)  DEFAULT ''INFO'' NOT NULL,
      ref_id      NUMBER(10),
      read_flag   CHAR(1)       DEFAULT ''N'' NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT PK_PAT_NOTIF    PRIMARY KEY (notif_id),
      CONSTRAINT FK_PN_PATIENT   FOREIGN KEY (patient_id) REFERENCES PATIENT(patient_id),
      CONSTRAINT CK_PN_READ      CHECK (read_flag IN (''Y'',''N'')),
      CONSTRAINT CK_PN_TYPE      CHECK (notif_type IN (''LAB_READY'',''APPOINTMENT'',''CANCELLATION'',''INFO''))
    )';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- =============================================================
-- SECTION 6: TRIGGER — BLOCK BOOKING DURING DOCTOR LEAVE
-- BEFORE INSERT on APPOINTMENT; raises -20010 if slot is inside
-- any approved DOCTOR_LEAVE window for that doctor
-- =============================================================
CREATE OR REPLACE TRIGGER trg_doctor_leave_block_booking
BEFORE INSERT ON APPOINTMENT
FOR EACH ROW
DECLARE
  v_count  NUMBER;
  v_name   VARCHAR2(255);
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM   DOCTOR_LEAVE
  WHERE  doctor_id = :NEW.doctor_id
    AND  approved  = 1
    AND  :NEW.slot_start BETWEEN start_ts AND end_ts;

  IF v_count > 0 THEN
    SELECT full_name INTO v_name FROM DOCTOR WHERE doctor_id = :NEW.doctor_id;
    RAISE_APPLICATION_ERROR(-20010,
      'Dr. ' || v_name || ' is on approved leave during this time slot. Please choose another slot or doctor.');
  END IF;
END trg_doctor_leave_block_booking;
/

-- =============================================================
-- SECTION 7: TRIGGER — EMERGENCY FANOUT TO DOCTOR NOTIFICATIONS
-- AFTER INSERT on EMERGENCY_REQUEST; notifies every doctor in the
-- relevant department (or ALL doctors if severity = CRITICAL)
-- =============================================================
CREATE OR REPLACE TRIGGER trg_emergency_fanout
AFTER INSERT ON EMERGENCY_REQUEST
FOR EACH ROW
DECLARE
  v_patient_name VARCHAR2(255);
  v_msg          VARCHAR2(1000);
BEGIN
  SELECT NVL(full_name, 'Patient') INTO v_patient_name
  FROM   PATIENT WHERE patient_id = :NEW.patient_id;

  v_msg := 'EMERGENCY [' || :NEW.severity || ']: ' || v_patient_name ||
           CASE WHEN :NEW.location_text IS NOT NULL
                THEN ' at ' || :NEW.location_text ELSE '' END ||
           '. Request #' || :NEW.request_id;

  IF :NEW.severity = 'CRITICAL' THEN
    -- Notify every active doctor in the clinic
    INSERT INTO DOCTOR_NOTIFICATION (doctor_id, message, notif_type, ref_id, created_by)
    SELECT doctor_id, v_msg, 'EMERGENCY', :NEW.request_id, 'SYSTEM'
    FROM   DOCTOR WHERE is_deleted = 0;
  ELSE
    -- Notify doctors in the department that covers general emergencies
    -- (use department 1 as fallback if no specific mapping exists)
    INSERT INTO DOCTOR_NOTIFICATION (doctor_id, message, notif_type, ref_id, created_by)
    SELECT d.doctor_id, v_msg, 'EMERGENCY', :NEW.request_id, 'SYSTEM'
    FROM   DOCTOR d
    WHERE  d.is_deleted = 0
      AND  d.department_id = (
             SELECT MIN(department_id) FROM DEPARTMENT WHERE is_deleted = 0
           );
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL; -- never block the emergency insert
END trg_emergency_fanout;
/

-- =============================================================
-- SECTION 8: TRIGGER — CANCELLATION VOIDS INVOICE
-- AFTER UPDATE OF status ON APPOINTMENT; sets BILLING.payment_status
-- to 'VOID' when appointment is cancelled (adds VOID to check constraint)
-- =============================================================

-- Extend BILLING.payment_status constraint to allow 'VOID'
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE BILLING DROP CONSTRAINT CK_BILLING_PAY_STATUS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE BILLING ADD CONSTRAINT CK_BILLING_PAY_STATUS
    CHECK (payment_status IN (''PENDING'',''PARTIAL'',''PAID'',''WAIVED'',''REFUNDED'',''VOID''))';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

CREATE OR REPLACE TRIGGER trg_cancel_voids_invoice
AFTER UPDATE OF status ON APPOINTMENT
FOR EACH ROW
WHEN (NEW.status = 'CANCELLED')
BEGIN
  UPDATE BILLING
  SET    payment_status = 'VOID',
         updated_at     = SYSTIMESTAMP
  WHERE  appointment_id = :NEW.appointment_id
    AND  payment_status NOT IN ('PAID','REFUNDED');
EXCEPTION
  WHEN OTHERS THEN NULL;
END trg_cancel_voids_invoice;
/

-- Also send cancellation notification to the doctor
CREATE OR REPLACE TRIGGER trg_cancel_notify_doctor
AFTER UPDATE OF status ON APPOINTMENT
FOR EACH ROW
WHEN (NEW.status = 'CANCELLED')
DECLARE
  v_patient_name VARCHAR2(255);
BEGIN
  SELECT NVL(full_name,'Patient') INTO v_patient_name
  FROM   PATIENT WHERE patient_id = :NEW.patient_id;

  INSERT INTO DOCTOR_NOTIFICATION (doctor_id, message, notif_type, ref_id, created_by)
  VALUES (:NEW.doctor_id,
          'Appointment #' || :NEW.appointment_id || ' with ' || v_patient_name ||
          ' on ' || TO_CHAR(:NEW.appt_date,'DD-Mon-YYYY') || ' was cancelled.',
          'CANCELLATION', :NEW.appointment_id, 'SYSTEM');
EXCEPTION
  WHEN OTHERS THEN NULL;
END trg_cancel_notify_doctor;
/

-- =============================================================
-- SECTION 9: TRIGGER — LAB RESULT READY → PATIENT NOTIFICATION
-- AFTER INSERT on LAB_RESULT; inserts a PATIENT_NOTIFICATION
-- =============================================================
CREATE OR REPLACE TRIGGER trg_lab_result_notify
AFTER INSERT ON LAB_RESULT
FOR EACH ROW
DECLARE
  v_patient_id NUMBER(10);
  v_test_name  VARCHAR2(255);
BEGIN
  SELECT lo.patient_id, ltc.test_name
  INTO   v_patient_id, v_test_name
  FROM   LAB_ORDER lo
  JOIN   LAB_TEST_CATALOGUE ltc ON lo.lab_test_id = ltc.lab_test_id
  WHERE  lo.lab_order_id = :NEW.lab_order_id;

  INSERT INTO PATIENT_NOTIFICATION (patient_id, message, notif_type, ref_id, created_by)
  VALUES (v_patient_id,
          'Your ' || v_test_name || ' result is ready.' ||
          CASE WHEN :NEW.is_abnormal = 1 THEN ' (Abnormal — please consult your doctor)' ELSE '' END,
          'LAB_READY', :NEW.result_id, 'SYSTEM');
EXCEPTION
  WHEN OTHERS THEN NULL;
END trg_lab_result_notify;
/

-- =============================================================
-- SECTION 10: SEED DATA
-- =============================================================
-- Seed uses the first available patient/doctor IDs from the DB

DECLARE
  v_p1 NUMBER; v_p2 NUMBER; v_p3 NUMBER;
  v_d1 NUMBER; v_d2 NUMBER; v_d3 NUMBER;
BEGIN
  -- Get first 3 patient IDs
  SELECT patient_id INTO v_p1 FROM (SELECT patient_id FROM PATIENT WHERE is_deleted=0 ORDER BY patient_id) WHERE ROWNUM=1;
  SELECT patient_id INTO v_p2 FROM (SELECT patient_id FROM PATIENT WHERE is_deleted=0 ORDER BY patient_id OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY);
  SELECT patient_id INTO v_p3 FROM (SELECT patient_id FROM PATIENT WHERE is_deleted=0 ORDER BY patient_id OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY);
  -- Get first 3 doctor IDs
  SELECT doctor_id INTO v_d1 FROM (SELECT doctor_id FROM DOCTOR WHERE is_deleted=0 ORDER BY doctor_id) WHERE ROWNUM=1;
  SELECT doctor_id INTO v_d2 FROM (SELECT doctor_id FROM DOCTOR WHERE is_deleted=0 ORDER BY doctor_id OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY);
  SELECT doctor_id INTO v_d3 FROM (SELECT doctor_id FROM DOCTOR WHERE is_deleted=0 ORDER BY doctor_id OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY);

  -- PATIENT_FAMILY_LINK: p1 and p2 are spouses; p2 and p3 are parent-child
  INSERT INTO PATIENT_FAMILY_LINK (patient_id, relative_patient_id, relation_type, created_by)
    VALUES (v_p1, v_p2, 'SPOUSE', 'SEED');
  INSERT INTO PATIENT_FAMILY_LINK (patient_id, relative_patient_id, relation_type, created_by)
    VALUES (v_p2, v_p1, 'SPOUSE', 'SEED');
  INSERT INTO PATIENT_FAMILY_LINK (patient_id, relative_patient_id, relation_type, created_by)
    VALUES (v_p2, v_p3, 'CHILD', 'SEED');
  INSERT INTO PATIENT_FAMILY_LINK (patient_id, relative_patient_id, relation_type, created_by)
    VALUES (v_p3, v_p2, 'PARENT', 'SEED');

  -- DOCTOR_LEAVE: d1 on leave tomorrow for a day
  INSERT INTO DOCTOR_LEAVE (doctor_id, start_ts, end_ts, reason, approved, created_by)
    VALUES (v_d1,
            TRUNC(SYSDATE+1) + INTERVAL '8' HOUR,
            TRUNC(SYSDATE+1) + INTERVAL '18' HOUR,
            'Personal leave', 1, 'SEED');
  INSERT INTO DOCTOR_LEAVE (doctor_id, start_ts, end_ts, reason, approved, created_by)
    VALUES (v_d2,
            TRUNC(SYSDATE+7) + INTERVAL '0' HOUR,
            TRUNC(SYSDATE+9) + INTERVAL '23' HOUR,
            'Conference attendance', 1, 'SEED');

  -- EMERGENCY_REQUEST (3 open requests)
  INSERT INTO EMERGENCY_REQUEST (patient_id, severity, location_text, description, status, created_by)
    VALUES (v_p1, 'HIGH', 'OPD Corridor', 'Sudden chest pain, breathlessness', 'OPEN', 'PATIENT');
  INSERT INTO EMERGENCY_REQUEST (patient_id, severity, location_text, description, status, created_by)
    VALUES (v_p2, 'MODERATE', 'Waiting Area', 'Severe headache and vomiting', 'OPEN', 'PATIENT');
  INSERT INTO EMERGENCY_REQUEST (patient_id, severity, location_text, description, status, created_by)
    VALUES (v_p3, 'LOW', 'Pharmacy', 'Allergic reaction to medication', 'RESOLVED', 'PATIENT');

  -- DOCTOR_NOTIFICATION (pre-existing so doctor sees unread on first login)
  INSERT INTO DOCTOR_NOTIFICATION (doctor_id, message, notif_type, read_flag, created_by)
    VALUES (v_d1, 'New emergency request: HIGH severity in OPD Corridor', 'EMERGENCY', 'N', 'SYSTEM');
  INSERT INTO DOCTOR_NOTIFICATION (doctor_id, message, notif_type, read_flag, created_by)
    VALUES (v_d1, 'Lab result ready for patient CBC test', 'LAB_READY', 'N', 'SYSTEM');
  INSERT INTO DOCTOR_NOTIFICATION (doctor_id, message, notif_type, read_flag, created_by)
    VALUES (v_d2, 'Appointment #1 cancelled by patient', 'CANCELLATION', 'Y', 'SYSTEM');
  INSERT INTO DOCTOR_NOTIFICATION (doctor_id, message, notif_type, read_flag, created_by)
    VALUES (v_d3, 'New emergency request: MODERATE severity in Waiting Area', 'EMERGENCY', 'N', 'SYSTEM');

  -- PATIENT_NOTIFICATION
  INSERT INTO PATIENT_NOTIFICATION (patient_id, message, notif_type, read_flag, created_by)
    VALUES (v_p1, 'Your Complete Blood Count result is ready.', 'LAB_READY', 'N', 'SYSTEM');
  INSERT INTO PATIENT_NOTIFICATION (patient_id, message, notif_type, read_flag, created_by)
    VALUES (v_p2, 'Your Lipid Profile result is ready. (Abnormal — please consult your doctor)', 'LAB_READY', 'N', 'SYSTEM');
  INSERT INTO PATIENT_NOTIFICATION (patient_id, message, notif_type, read_flag, created_by)
    VALUES (v_p3, 'Your appointment has been confirmed for tomorrow.', 'APPOINTMENT', 'Y', 'SYSTEM');

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Task 19 seed complete.');
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('Seed failed: ' || SQLERRM);
END;
/

SELECT 'PATIENT_FAMILY_LINK', COUNT(*) FROM PATIENT_FAMILY_LINK UNION ALL
SELECT 'DOCTOR_LEAVE',        COUNT(*) FROM DOCTOR_LEAVE        UNION ALL
SELECT 'EMERGENCY_REQUEST',   COUNT(*) FROM EMERGENCY_REQUEST   UNION ALL
SELECT 'DOCTOR_NOTIFICATION', COUNT(*) FROM DOCTOR_NOTIFICATION UNION ALL
SELECT 'PATIENT_NOTIFICATION',COUNT(*) FROM PATIENT_NOTIFICATION;
