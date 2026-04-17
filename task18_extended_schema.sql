-- =============================================================
-- TASK 18: EXTENDED CLINICAL SCHEMA
-- =============================================================
-- Adds real-world clinical data management:
--   1. APPOINTMENT.department_id  (missing column, backfilled)
--   2. LAB_TEST_CATALOGUE         (20 tests offered by clinic)
--   3. LAB_ORDER                  (doctor orders test per consultation)
--   4. LAB_RESULT                 (result uploaded against order)
--   5. VITAL_SIGNS                (BP, temp, weight etc per consultation)
--   6. PHARMACY_ITEM              (medicine stock with pricing)
--   7. DISPENSING                 (medicines dispensed per prescription)
--   8. Extended VPD policies for all new tables
--   9. Seed data: lab catalogue + pharmacy inventory
--
-- Run as CLINIC_ADMIN on XEPDB1:
--   sqlplus clinic_admin/YourPassword@localhost:1521/XEPDB1
--   @task18_extended_schema.sql
-- =============================================================

-- Disable SQL*Plus variable substitution to prevent & in strings causing prompts
SET DEFINE OFF

-- =============================================================
-- SECTION 1: ADD DEPARTMENT_ID TO APPOINTMENT
-- =============================================================
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE APPOINTMENT ADD department_id NUMBER(10)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1430 THEN RAISE; END IF; -- column already exists
END;
/

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE APPOINTMENT ADD CONSTRAINT FK_APPT_DEPT
    FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2264 AND SQLCODE != -2261 THEN RAISE; END IF;
END;
/

-- Backfill department_id from doctor for existing appointment rows
UPDATE APPOINTMENT a
SET department_id = (SELECT d.department_id FROM DOCTOR d WHERE d.doctor_id = a.doctor_id)
WHERE department_id IS NULL;
COMMIT;

-- =============================================================
-- SECTION 2: LAB_TEST_CATALOGUE
-- Tests available at the clinic with pricing and turnaround times
-- =============================================================
CREATE TABLE LAB_TEST_CATALOGUE (
    lab_test_id      NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
    test_name        VARCHAR2(255) NOT NULL,
    test_code        VARCHAR2(50)  NOT NULL,
    category         VARCHAR2(50)  NOT NULL,
    description      VARCHAR2(1000),
    price            NUMBER(10,2)  NOT NULL,
    turnaround_hours NUMBER(5)     DEFAULT 24 NOT NULL,
    is_active        NUMBER(1)     DEFAULT 1 NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by       VARCHAR2(100) NOT NULL,
    is_deleted       NUMBER(1)     DEFAULT 0 NOT NULL,
    row_version      NUMBER        DEFAULT 1 NOT NULL,
    CONSTRAINT PK_LAB_TEST_CAT   PRIMARY KEY (lab_test_id),
    CONSTRAINT UQ_LAB_TEST_CODE  UNIQUE (test_code),
    CONSTRAINT CK_LTC_PRICE      CHECK (price >= 0),
    CONSTRAINT CK_LTC_ACTIVE     CHECK (is_active IN (0,1)),
    CONSTRAINT CK_LTC_DELETED    CHECK (is_deleted IN (0,1)),
    CONSTRAINT CK_LTC_CATEGORY   CHECK (category IN (
        'HAEMATOLOGY','BIOCHEMISTRY','MICROBIOLOGY','RADIOLOGY',
        'CARDIOLOGY','PATHOLOGY','IMMUNOLOGY','OTHER'
    ))
);

COMMENT ON TABLE LAB_TEST_CATALOGUE IS 'Master list of diagnostic tests and imaging services offered by the clinic.';

-- =============================================================
-- SECTION 3: LAB_ORDER
-- Doctor orders a test for a patient within a consultation
-- =============================================================
CREATE TABLE LAB_ORDER (
    lab_order_id          NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
    consultation_id       NUMBER(10)    NOT NULL,
    patient_id            NUMBER(10)    NOT NULL,
    lab_test_id           NUMBER(10)    NOT NULL,
    ordered_by_doctor_id  NUMBER(10)    NOT NULL,
    status                VARCHAR2(20)  DEFAULT 'PENDING' NOT NULL,
    priority              VARCHAR2(10)  DEFAULT 'ROUTINE' NOT NULL,
    clinical_notes        VARCHAR2(1000),
    ordered_at            TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    expected_at           TIMESTAMP WITH TIME ZONE,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by            VARCHAR2(100) NOT NULL,
    is_deleted            NUMBER(1)     DEFAULT 0 NOT NULL,
    row_version           NUMBER        DEFAULT 1 NOT NULL,
    CONSTRAINT PK_LAB_ORDER       PRIMARY KEY (lab_order_id),
    CONSTRAINT FK_LO_CONSULT      FOREIGN KEY (consultation_id)      REFERENCES CONSULTATION(consultation_id),
    CONSTRAINT FK_LO_PATIENT      FOREIGN KEY (patient_id)           REFERENCES PATIENT(patient_id),
    CONSTRAINT FK_LO_LAB_TEST     FOREIGN KEY (lab_test_id)          REFERENCES LAB_TEST_CATALOGUE(lab_test_id),
    CONSTRAINT FK_LO_DOCTOR       FOREIGN KEY (ordered_by_doctor_id) REFERENCES DOCTOR(doctor_id),
    CONSTRAINT CK_LO_STATUS       CHECK (status   IN ('PENDING','SAMPLE_COLLECTED','IN_PROGRESS','COMPLETED','CANCELLED')),
    CONSTRAINT CK_LO_PRIORITY     CHECK (priority IN ('ROUTINE','URGENT','STAT')),
    CONSTRAINT CK_LO_DELETED      CHECK (is_deleted IN (0,1))
);

COMMENT ON TABLE LAB_ORDER IS 'Test orders raised by a doctor during a consultation. Status progresses from PENDING to COMPLETED.';

-- =============================================================
-- SECTION 4: LAB_RESULT
-- Result uploaded by lab staff against a completed order
-- =============================================================
CREATE TABLE LAB_RESULT (
    result_id               NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
    lab_order_id            NUMBER(10)    NOT NULL,
    result_text             CLOB,
    result_summary          VARCHAR2(2000),
    is_abnormal             NUMBER(1)     DEFAULT 0 NOT NULL,
    reviewed_by_doctor_id   NUMBER(10),
    reviewed_at             TIMESTAMP WITH TIME ZONE,
    uploaded_by             VARCHAR2(100) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by              VARCHAR2(100) NOT NULL,
    is_deleted              NUMBER(1)     DEFAULT 0 NOT NULL,
    row_version             NUMBER        DEFAULT 1 NOT NULL,
    CONSTRAINT PK_LAB_RESULT       PRIMARY KEY (result_id),
    CONSTRAINT FK_LR_LAB_ORDER     FOREIGN KEY (lab_order_id)          REFERENCES LAB_ORDER(lab_order_id),
    CONSTRAINT FK_LR_DOCTOR        FOREIGN KEY (reviewed_by_doctor_id) REFERENCES DOCTOR(doctor_id) ON DELETE SET NULL,
    CONSTRAINT UQ_LR_ORDER         UNIQUE (lab_order_id),
    CONSTRAINT CK_LR_ABNORMAL      CHECK (is_abnormal IN (0,1)),
    CONSTRAINT CK_LR_DELETED       CHECK (is_deleted IN (0,1))
);

COMMENT ON TABLE LAB_RESULT IS 'One result row per lab order. Abnormal flag enables priority surfacing in doctor and patient portals.';

-- =============================================================
-- SECTION 5: VITAL_SIGNS
-- Recorded once per consultation before the doctor sees the patient
-- =============================================================
CREATE TABLE VITAL_SIGNS (
    vital_id           NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
    consultation_id    NUMBER(10)    NOT NULL,
    patient_id         NUMBER(10)    NOT NULL,
    bp_systolic        NUMBER(3),
    bp_diastolic       NUMBER(3),
    heart_rate         NUMBER(3),
    temperature        NUMBER(4,1),
    weight_kg          NUMBER(5,2),
    height_cm          NUMBER(5,2),
    spo2               NUMBER(3),
    respiratory_rate   NUMBER(3),
    recorded_by        VARCHAR2(100) NOT NULL,
    recorded_at        TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    notes              VARCHAR2(500),
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by         VARCHAR2(100) NOT NULL,
    is_deleted         NUMBER(1)     DEFAULT 0 NOT NULL,
    row_version        NUMBER        DEFAULT 1 NOT NULL,
    CONSTRAINT PK_VITAL_SIGNS     PRIMARY KEY (vital_id),
    CONSTRAINT FK_VS_CONSULT      FOREIGN KEY (consultation_id) REFERENCES CONSULTATION(consultation_id),
    CONSTRAINT FK_VS_PATIENT      FOREIGN KEY (patient_id)      REFERENCES PATIENT(patient_id),
    CONSTRAINT UQ_VS_CONSULT      UNIQUE (consultation_id),
    CONSTRAINT CK_VS_SPO2         CHECK (spo2 IS NULL OR spo2 BETWEEN 0 AND 100),
    CONSTRAINT CK_VS_HR           CHECK (heart_rate IS NULL OR heart_rate BETWEEN 0 AND 300),
    CONSTRAINT CK_VS_DELETED      CHECK (is_deleted IN (0,1))
);

COMMENT ON TABLE VITAL_SIGNS IS 'Pre-consultation vitals: BP, pulse, temperature, SpO2, weight, height. One set per consultation.';

-- =============================================================
-- SECTION 6: PHARMACY_ITEM
-- Medicine stock held by the clinic pharmacy
-- =============================================================
CREATE TABLE PHARMACY_ITEM (
    item_id          NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
    medicine_name    VARCHAR2(255) NOT NULL,
    generic_name     VARCHAR2(255),
    manufacturer     VARCHAR2(255),
    category         VARCHAR2(20)  NOT NULL,
    unit_price       NUMBER(10,2)  NOT NULL,
    stock_quantity   NUMBER(10)    DEFAULT 0 NOT NULL,
    reorder_level    NUMBER(10)    DEFAULT 10 NOT NULL,
    expiry_date      DATE,
    batch_number     VARCHAR2(100),
    is_active        NUMBER(1)     DEFAULT 1 NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by       VARCHAR2(100) NOT NULL,
    is_deleted       NUMBER(1)     DEFAULT 0 NOT NULL,
    row_version      NUMBER        DEFAULT 1 NOT NULL,
    CONSTRAINT PK_PHARMACY_ITEM   PRIMARY KEY (item_id),
    CONSTRAINT CK_PI_CATEGORY     CHECK (category IN ('TABLET','CAPSULE','SYRUP','INJECTION','TOPICAL','DROPS','INHALER','OTHER')),
    CONSTRAINT CK_PI_PRICE        CHECK (unit_price >= 0),
    CONSTRAINT CK_PI_STOCK        CHECK (stock_quantity >= 0),
    CONSTRAINT CK_PI_ACTIVE       CHECK (is_active IN (0,1)),
    CONSTRAINT CK_PI_DELETED      CHECK (is_deleted IN (0,1))
);

COMMENT ON TABLE PHARMACY_ITEM IS 'Clinic pharmacy inventory. Stock depletes on DISPENSING insert via trigger.';

-- =============================================================
-- SECTION 7: DISPENSING
-- Medicines actually handed to patient against a prescription
-- =============================================================
CREATE TABLE DISPENSING (
    dispensing_id      NUMBER(10)    GENERATED ALWAYS AS IDENTITY,
    prescription_id    NUMBER(10)    NOT NULL,
    patient_id         NUMBER(10)    NOT NULL,
    item_id            NUMBER(10)    NOT NULL,
    quantity_dispensed NUMBER(10)    NOT NULL,
    unit_price         NUMBER(10,2)  NOT NULL,
    dispensed_by       VARCHAR2(100) NOT NULL,
    dispensed_at       TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    notes              VARCHAR2(500),
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by         VARCHAR2(100) NOT NULL,
    is_deleted         NUMBER(1)     DEFAULT 0 NOT NULL,
    row_version        NUMBER        DEFAULT 1 NOT NULL,
    CONSTRAINT PK_DISPENSING       PRIMARY KEY (dispensing_id),
    CONSTRAINT FK_DISP_PRESC       FOREIGN KEY (prescription_id) REFERENCES PRESCRIPTION(prescription_id),
    CONSTRAINT FK_DISP_PATIENT     FOREIGN KEY (patient_id)      REFERENCES PATIENT(patient_id),
    CONSTRAINT FK_DISP_ITEM        FOREIGN KEY (item_id)         REFERENCES PHARMACY_ITEM(item_id),
    CONSTRAINT CK_DISP_QTY        CHECK (quantity_dispensed > 0),
    CONSTRAINT CK_DISP_PRICE      CHECK (unit_price >= 0),
    CONSTRAINT CK_DISP_DELETED    CHECK (is_deleted IN (0,1))
);

COMMENT ON TABLE DISPENSING IS 'Records each medicine dispensed from pharmacy per prescription. Drives stock deduction.';

-- =============================================================
-- SECTION 8: TRIGGER — DEDUCT STOCK ON DISPENSING
-- =============================================================
CREATE OR REPLACE TRIGGER trg_dispensing_deduct_stock
AFTER INSERT ON DISPENSING
FOR EACH ROW
BEGIN
    UPDATE PHARMACY_ITEM
    SET stock_quantity = stock_quantity - :NEW.quantity_dispensed,
        updated_at     = SYSTIMESTAMP
    WHERE item_id = :NEW.item_id;
END;
/

-- =============================================================
-- SECTION 9: INDEXES
-- =============================================================
CREATE INDEX idx_lab_order_patient  ON LAB_ORDER(patient_id);
CREATE INDEX idx_lab_order_doctor   ON LAB_ORDER(ordered_by_doctor_id);
CREATE INDEX idx_lab_order_consult  ON LAB_ORDER(consultation_id);
CREATE INDEX idx_lab_order_status   ON LAB_ORDER(status);
CREATE INDEX idx_vital_patient      ON VITAL_SIGNS(patient_id);
CREATE INDEX idx_dispensing_patient ON DISPENSING(patient_id);
CREATE INDEX idx_dispensing_presc   ON DISPENSING(prescription_id);
CREATE INDEX idx_pharmacy_active    ON PHARMACY_ITEM(is_active, is_deleted);
CREATE INDEX idx_appt_dept          ON APPOINTMENT(department_id);

-- =============================================================
-- SECTION 10: EXTEND VPD FUNCTION FOR NEW TABLES
-- Replaces the existing vpd_patient_filter in db_task2.sql
-- =============================================================
CREATE OR REPLACE FUNCTION vpd_patient_filter(
    schema_name IN VARCHAR2,
    table_name  IN VARCHAR2
) RETURN VARCHAR2 AS
    v_role       VARCHAR2(20);
    v_patient_id VARCHAR2(20);
    v_doctor_id  VARCHAR2(20);
BEGIN
    v_role       := SYS_CONTEXT('clinic_ctx','role');
    v_patient_id := SYS_CONTEXT('clinic_ctx','patient_id');
    v_doctor_id  := SYS_CONTEXT('clinic_ctx','doctor_id');

    -- ADMIN sees everything
    IF v_role = 'ADMIN' THEN RETURN ''; END IF;

    -- ---- DOCTOR FILTERS ----
    IF v_role = 'DOCTOR' THEN
        IF table_name = 'APPOINTMENT' THEN
            RETURN 'doctor_id = ' || v_doctor_id;
        END IF;
        IF table_name IN ('CONSULTATION','BILLING') THEN
            RETURN 'appointment_id IN (SELECT appointment_id FROM appointment WHERE doctor_id = ' || v_doctor_id || ')';
        END IF;
        IF table_name = 'PRESCRIPTION' THEN
            RETURN 'consultation_id IN (SELECT consultation_id FROM consultation WHERE appointment_id IN (SELECT appointment_id FROM appointment WHERE doctor_id = ' || v_doctor_id || '))';
        END IF;
        IF table_name = 'LAB_ORDER' THEN
            RETURN 'ordered_by_doctor_id = ' || v_doctor_id;
        END IF;
        IF table_name = 'LAB_RESULT' THEN
            RETURN 'lab_order_id IN (SELECT lab_order_id FROM lab_order WHERE ordered_by_doctor_id = ' || v_doctor_id || ')';
        END IF;
        IF table_name = 'VITAL_SIGNS' THEN
            RETURN 'consultation_id IN (SELECT consultation_id FROM consultation WHERE appointment_id IN (SELECT appointment_id FROM appointment WHERE doctor_id = ' || v_doctor_id || '))';
        END IF;
        -- DISPENSING: doctor sees medicines dispensed for their patients
        IF table_name = 'DISPENSING' THEN
            RETURN 'prescription_id IN (SELECT p.prescription_id FROM prescription p JOIN consultation c ON p.consultation_id = c.consultation_id JOIN appointment a ON c.appointment_id = a.appointment_id WHERE a.doctor_id = ' || v_doctor_id || ')';
        END IF;
        -- Catalogues (LAB_TEST_CATALOGUE, PHARMACY_ITEM): no filter, doctors see all
        RETURN '';
    END IF;

    -- ---- PATIENT FILTERS ----
    IF v_role = 'PATIENT' THEN
        IF table_name = 'APPOINTMENT' THEN
            RETURN 'patient_id = ' || v_patient_id;
        END IF;
        IF table_name = 'BILLING' THEN
            RETURN 'appointment_id IN (SELECT appointment_id FROM appointment WHERE patient_id = ' || v_patient_id || ')';
        END IF;
        IF table_name = 'MEDICAL_RECORD' THEN
            RETURN 'patient_id = ' || v_patient_id;
        END IF;
        IF table_name = 'CONSULTATION' THEN
            RETURN 'appointment_id IN (SELECT appointment_id FROM appointment WHERE patient_id = ' || v_patient_id || ')';
        END IF;
        IF table_name = 'PRESCRIPTION' THEN
            RETURN 'consultation_id IN (SELECT consultation_id FROM consultation WHERE appointment_id IN (SELECT appointment_id FROM appointment WHERE patient_id = ' || v_patient_id || '))';
        END IF;
        IF table_name = 'LAB_ORDER' THEN
            RETURN 'patient_id = ' || v_patient_id;
        END IF;
        IF table_name = 'LAB_RESULT' THEN
            RETURN 'lab_order_id IN (SELECT lab_order_id FROM lab_order WHERE patient_id = ' || v_patient_id || ')';
        END IF;
        IF table_name = 'VITAL_SIGNS' THEN
            RETURN 'patient_id = ' || v_patient_id;
        END IF;
        IF table_name = 'DISPENSING' THEN
            RETURN 'patient_id = ' || v_patient_id;
        END IF;
    END IF;

    RETURN '1=0';
END;
/

-- =============================================================
-- SECTION 11: ADD VPD POLICIES FOR NEW TABLES
-- =============================================================
BEGIN
    DBMS_RLS.ADD_POLICY(
        object_schema=>'CLINIC_ADMIN', object_name=>'LAB_ORDER',
        policy_name=>'pol_lab_order', function_schema=>'CLINIC_ADMIN',
        policy_function=>'vpd_patient_filter', statement_types=>'SELECT,UPDATE,DELETE');
EXCEPTION WHEN OTHERS THEN
    IF SQLCODE != -28101 THEN RAISE; END IF;
END;
/

BEGIN
    DBMS_RLS.ADD_POLICY(
        object_schema=>'CLINIC_ADMIN', object_name=>'LAB_RESULT',
        policy_name=>'pol_lab_result', function_schema=>'CLINIC_ADMIN',
        policy_function=>'vpd_patient_filter', statement_types=>'SELECT,UPDATE,DELETE');
EXCEPTION WHEN OTHERS THEN
    IF SQLCODE != -28101 THEN RAISE; END IF;
END;
/

BEGIN
    DBMS_RLS.ADD_POLICY(
        object_schema=>'CLINIC_ADMIN', object_name=>'VITAL_SIGNS',
        policy_name=>'pol_vitals', function_schema=>'CLINIC_ADMIN',
        policy_function=>'vpd_patient_filter', statement_types=>'SELECT,UPDATE,DELETE');
EXCEPTION WHEN OTHERS THEN
    IF SQLCODE != -28101 THEN RAISE; END IF;
END;
/

BEGIN
    DBMS_RLS.ADD_POLICY(
        object_schema=>'CLINIC_ADMIN', object_name=>'DISPENSING',
        policy_name=>'pol_dispensing', function_schema=>'CLINIC_ADMIN',
        policy_function=>'vpd_patient_filter', statement_types=>'SELECT,UPDATE,DELETE');
EXCEPTION WHEN OTHERS THEN
    IF SQLCODE != -28101 THEN RAISE; END IF;
END;
/

-- =============================================================
-- SECTION 12: SEED DATA — LAB TEST CATALOGUE (20 tests)
-- =============================================================
INSERT ALL
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Complete Blood Count','CBC','HAEMATOLOGY','Full blood panel: RBC, WBC, platelets, haemoglobin, haematocrit',250,6,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Liver Function Test','LFT','BIOCHEMISTRY','ALT, AST, ALP, bilirubin, albumin, total protein',450,12,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Kidney Function Test','KFT','BIOCHEMISTRY','Creatinine, BUN, uric acid, electrolytes',400,12,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Lipid Profile','LIPID','BIOCHEMISTRY','Total cholesterol, LDL, HDL, triglycerides',350,12,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('HbA1c','HBA1C','BIOCHEMISTRY','Glycated haemoglobin — 3-month average blood glucose',300,6,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Fasting Blood Sugar','FBS','BIOCHEMISTRY','Plasma glucose after 8-hour fast',80,2,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Thyroid Function Test','TFT','BIOCHEMISTRY','TSH, T3, T4 levels',500,24,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Urine Routine & Microscopy','URM','PATHOLOGY','Urine physical, chemical and microscopic examination',120,4,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('ECG','ECG','CARDIOLOGY','12-lead electrocardiogram',200,1,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('2D Echocardiogram','ECHO','CARDIOLOGY','Ultrasound imaging of the heart',1800,2,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Chest X-Ray','CXR','RADIOLOGY','PA view chest radiograph',350,2,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('X-Ray Knee (Bilateral)','XRAY-KNEE','RADIOLOGY','Weight-bearing AP and lateral views bilateral knees',400,2,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('MRI Lumbar Spine','MRI-LS','RADIOLOGY','MRI of lumbar spine with and without contrast',3500,4,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Serum Ferritin','FERRITIN','BIOCHEMISTRY','Iron storage protein — marker for iron deficiency',280,12,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Vitamin D (25-OH)','VITD','BIOCHEMISTRY','Serum 25-hydroxyvitamin D level',600,24,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Blood Culture','BLDCX','MICROBIOLOGY','Aerobic and anaerobic blood culture for bacteraemia',700,48,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Urine Culture & Sensitivity','URICX','MICROBIOLOGY','Mid-stream urine culture with antibiotic sensitivity',350,48,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Dengue NS1 + IgM/IgG','DENGUE','IMMUNOLOGY','Dengue rapid antigen and antibody combo test',600,3,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('COVID-19 RT-PCR','COVPCR','MICROBIOLOGY','SARS-CoV-2 RT-PCR from nasopharyngeal swab',800,6,1,'SYSTEM')
    INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by)
        VALUES ('Holter Monitor (24hr)','HOLTER','CARDIOLOGY','24-hour ambulatory ECG monitoring',2200,24,1,'SYSTEM')
SELECT * FROM DUAL;
COMMIT;

-- =============================================================
-- SECTION 13: SEED DATA — PHARMACY ITEMS (25 medicines)
-- =============================================================
INSERT ALL
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Metformin 500mg','Metformin Hydrochloride','Sun Pharma','TABLET',3.50,500,50,DATE '2026-12-31','MF500-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Metformin 1000mg','Metformin Hydrochloride','Sun Pharma','TABLET',6.00,400,50,DATE '2026-12-31','MF1000-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Glimepiride 2mg','Glimepiride','Cipla','TABLET',8.00,300,30,DATE '2026-11-30','GL2-2024B',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Metoprolol 25mg','Metoprolol Succinate','AstraZeneca','TABLET',7.50,250,30,DATE '2026-10-31','MT25-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Aspirin 75mg','Acetylsalicylic Acid','Bayer','TABLET',2.00,600,100,DATE '2027-03-31','ASP75-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Atorvastatin 40mg','Atorvastatin Calcium','Pfizer','TABLET',12.00,350,50,DATE '2026-09-30','AT40-2024B',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Isosorbide Mononitrate 20mg','Isosorbide Mononitrate','Lupin','TABLET',5.50,200,20,DATE '2026-08-31','ISMN20-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Furosemide 40mg','Furosemide','Cipla','TABLET',4.00,300,30,DATE '2026-12-31','FUR40-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Ramipril 5mg','Ramipril','Sanofi','TABLET',9.00,250,25,DATE '2026-11-30','RAM5-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Spironolactone 25mg','Spironolactone','Pfizer','TABLET',11.00,150,20,DATE '2026-10-31','SP25-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Ferrous Sulfate 150mg','Ferrous Sulfate','Mankind','TABLET',3.00,400,50,DATE '2027-06-30','FES150-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Folic Acid 5mg','Folic Acid','Alkem','TABLET',1.50,500,50,DATE '2027-06-30','FA5-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Diclofenac 50mg','Diclofenac Sodium','Novartis','TABLET',4.50,350,50,DATE '2026-07-31','DIC50-2024B',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Pantoprazole 40mg','Pantoprazole Sodium','Sun Pharma','TABLET',5.00,400,50,DATE '2026-09-30','PAN40-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Calcium + Vit D3','Calcium Carbonate + Cholecalciferol','Pfizer','TABLET',8.50,200,20,DATE '2026-12-31','CAVD-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Pregabalin 75mg','Pregabalin','Pfizer','CAPSULE',18.00,200,20,DATE '2026-10-31','PRG75-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Vildagliptin 50mg','Vildagliptin','Novartis','TABLET',22.00,150,20,DATE '2026-11-30','VIL50-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Cetirizine 10mg','Cetirizine Hydrochloride','Cipla','TABLET',2.50,300,30,DATE '2027-01-31','CET10-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Azithromycin 500mg','Azithromycin','Cipla','TABLET',28.00,120,20,DATE '2026-08-31','AZI500-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Paracetamol 650mg','Paracetamol','GSK','TABLET',2.00,800,100,DATE '2027-03-31','PCM650-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Salbutamol Inhaler 100mcg','Salbutamol Sulphate','GSK','INHALER',185.00,50,10,DATE '2026-06-30','SAL-INH-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Amlodipine 5mg','Amlodipine Besylate','Pfizer','TABLET',6.50,280,30,DATE '2026-12-31','AML5-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Omeprazole 20mg','Omeprazole','AstraZeneca','CAPSULE',4.00,350,50,DATE '2026-10-31','OMP20-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Losartan 50mg','Losartan Potassium','Merck','TABLET',10.00,220,25,DATE '2026-09-30','LOS50-2024A',1,'SYSTEM')
    INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by)
        VALUES ('Insulin Glargine 100IU/ml','Insulin Glargine','Sanofi','INJECTION',650.00,30,5,DATE '2026-04-30','INGLA-2024A',1,'SYSTEM')
SELECT * FROM DUAL;
COMMIT;

-- =============================================================
-- VERIFICATION QUERIES (run after script completes)
-- =============================================================
SELECT 'LAB_TEST_CATALOGUE' AS tbl, COUNT(*) AS rows FROM LAB_TEST_CATALOGUE
UNION ALL SELECT 'PHARMACY_ITEM', COUNT(*) FROM PHARMACY_ITEM
UNION ALL SELECT 'LAB_ORDER',     COUNT(*) FROM LAB_ORDER
UNION ALL SELECT 'LAB_RESULT',    COUNT(*) FROM LAB_RESULT
UNION ALL SELECT 'VITAL_SIGNS',   COUNT(*) FROM VITAL_SIGNS
UNION ALL SELECT 'DISPENSING',    COUNT(*) FROM DISPENSING;

-- Expected: LAB_TEST_CATALOGUE=20, PHARMACY_ITEM=25, rest=0 (empty until patient visits)

SELECT column_name FROM user_tab_columns
WHERE table_name = 'APPOINTMENT' AND column_name = 'DEPARTMENT_ID';
-- Expected: 1 row (confirms column added)