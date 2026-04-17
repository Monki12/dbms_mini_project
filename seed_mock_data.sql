-- =============================================================
-- MOCK DATA SEED (v2)
-- Realistic Indian names — wipes all clinical data first.
-- Run as clinic_admin on XEPDB1:
--   sqlplus clinic_admin/YourPassword@localhost:1521/XEPDB1
--   @seed_mock_data.sql
--
-- CREDENTIALS AFTER RUN:
--   Admin  : username=admin        password=mock_user123
--   Doctor : username=dr_sharma    password=mock_user123
--   Doctor : username=dr_patel     password=mock_user123
--   Doctor : username=dr_nair      password=mock_user123
--   Patient: Login via phone at /patient/login  (no password)
--     Amit Joshi       → 9876501001
--     Preethi Krishnan → 9876501002
--     Mohammed Rafi    → 9876501003
--     Deepa Sharma     → 9876501004
--     Rohit Verma      → 9876501005
--     Lakshmi Devi     → 9876501006
--     Suresh Gupta     → 9876501007
--     Ananya Singh     → 9876501008
-- =============================================================

SET DEFINE OFF
SET FEEDBACK ON

-- =============================================================
-- SECTION 0: SET ADMIN CONTEXT (bypasses VPD 1=0 for direct SQL*Plus)
-- Without this, DELETE on APPOINTMENT/CONSULTATION/etc. deletes 0 rows
-- because vpd_patient_filter returns '1=0' when no context is set.
-- =============================================================
BEGIN
    clinic_ctx_pkg.set_role('ADMIN');
END;
/

-- =============================================================
-- SECTION 1: WIPE ALL DATA (child → parent order)
-- =============================================================
DECLARE
BEGIN
    -- Extended clinical tables
    DELETE FROM DISPENSING;
    DELETE FROM LAB_RESULT;
    DELETE FROM LAB_ORDER;
    DELETE FROM VITAL_SIGNS;
    -- Core transactional tables
    DELETE FROM PRESCRIPTION_ITEM;
    DELETE FROM PRESCRIPTION;
    DELETE FROM CONSULTATION;
    DELETE FROM BILLING;
    DELETE FROM APPOINTMENT;
    -- Patient session / OTP
    DELETE FROM PATIENT_SESSION;
    DELETE FROM PATIENT_OTP;
    DELETE FROM TOKEN_BLACKLIST;
    -- Auth users
    DELETE FROM CLINIC_USER;
    -- Patient records
    DELETE FROM MEDICAL_RECORD;
    DELETE FROM PATIENT;
    -- Staff
    DELETE FROM STAFF;
    -- Doctors (clear head before deleting doctors)
    UPDATE DEPARTMENT SET head_doctor_id = NULL;
    DELETE FROM DOCTOR;
    -- Departments
    DELETE FROM DEPARTMENT;
    -- Audit log
    DELETE FROM AUDIT_LOG;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('All tables cleared.');
END;
/

-- =============================================================
-- SECTION 2: DEPARTMENTS, DOCTORS, PATIENTS, AUTH USERS
-- =============================================================
DECLARE
    -- Department IDs
    v_dept_cardio   NUMBER;
    v_dept_ortho    NUMBER;
    v_dept_general  NUMBER;
    v_dept_neuro    NUMBER;

    -- Doctor IDs
    v_doc1 NUMBER; -- Dr. Rajesh Sharma   (Cardiology)    → dr_sharma
    v_doc2 NUMBER; -- Dr. Priya Mehta     (Cardiology)
    v_doc3 NUMBER; -- Dr. Arjun Patel     (Orthopaedics)  → dr_patel
    v_doc4 NUMBER; -- Dr. Sunita Reddy    (Orthopaedics)
    v_doc5 NUMBER; -- Dr. Vikram Nair     (General Med)   → dr_nair
    v_doc6 NUMBER; -- Dr. Kavitha Iyer    (General Med)

    -- Patient IDs
    v_pat1  NUMBER; -- Amit Joshi          9876501001
    v_pat2  NUMBER; -- Preethi Krishnan    9876501002
    v_pat3  NUMBER; -- Mohammed Rafi       9876501003
    v_pat4  NUMBER; -- Deepa Sharma        9876501004
    v_pat5  NUMBER; -- Rohit Verma         9876501005
    v_pat6  NUMBER; -- Lakshmi Devi        9876501006
    v_pat7  NUMBER; -- Suresh Gupta        9876501007
    v_pat8  NUMBER; -- Ananya Singh        9876501008

    -- Appointment IDs
    v_app1  NUMBER; v_app2  NUMBER; v_app3  NUMBER; v_app4  NUMBER;
    v_app5  NUMBER; v_app6  NUMBER; v_app7  NUMBER; v_app8  NUMBER;
    v_app9  NUMBER; v_app10 NUMBER; v_app11 NUMBER; v_app12 NUMBER;
    v_app13 NUMBER; v_app14 NUMBER; v_app15 NUMBER;

    -- Consultation IDs
    v_cons1 NUMBER; v_cons2 NUMBER; v_cons3 NUMBER; v_cons4 NUMBER;
    v_cons5 NUMBER; v_cons6 NUMBER; v_cons7 NUMBER; v_cons8 NUMBER;
    v_cons9 NUMBER;

    -- Prescription IDs
    v_presc1 NUMBER; v_presc2 NUMBER; v_presc3 NUMBER;
    v_presc4 NUMBER; v_presc5 NUMBER;

    -- Lab order IDs
    v_lab1 NUMBER; v_lab2 NUMBER; v_lab3 NUMBER; v_lab4 NUMBER;
    v_lab5 NUMBER; v_lab6 NUMBER;

    -- Lab test IDs (fetch from catalogue)
    v_test_cbc    NUMBER; v_test_ecg NUMBER; v_test_lipid NUMBER;
    v_test_lft    NUMBER; v_test_hba1c NUMBER; v_test_vitd NUMBER;
    v_test_xray   NUMBER; v_test_echo NUMBER;

    -- bcrypt hash for mock_user123
    v_hash VARCHAR2(255) := '$2b$12$zV7ZuHu7tLkIoa8SpJvKJe2WLNxkF3FF4SI/MeRcnBAEgsDn5KNly';

BEGIN
    -- ==========================================================
    -- DEPARTMENTS
    -- ==========================================================
    INSERT INTO DEPARTMENT (name, description, location, created_by)
    VALUES ('Cardiology', 'Cardiac care, ECG, echocardiography and interventional cardiology', 'Floor 3 - Block A', 'SEED')
    RETURNING department_id INTO v_dept_cardio;

    INSERT INTO DEPARTMENT (name, description, location, created_by)
    VALUES ('Orthopaedics', 'Bone, joint and musculoskeletal disorders, fracture management', 'Floor 2 - Block B', 'SEED')
    RETURNING department_id INTO v_dept_ortho;

    INSERT INTO DEPARTMENT (name, description, location, created_by)
    VALUES ('General Medicine', 'Internal medicine, diabetes, hypertension and general consultation', 'Floor 1 - Block A', 'SEED')
    RETURNING department_id INTO v_dept_general;

    INSERT INTO DEPARTMENT (name, description, location, created_by)
    VALUES ('Neurology', 'Brain, spinal cord and peripheral nervous system disorders', 'Floor 4 - Block A', 'SEED')
    RETURNING department_id INTO v_dept_neuro;

    -- ==========================================================
    -- DOCTORS
    -- ==========================================================
    INSERT INTO DOCTOR (employee_id, full_name, specialisation, qualification, years_of_experience, contact, email, consultation_fee, department_id, created_by)
    VALUES ('EMP_D01', 'Dr. Rajesh Sharma', 'Interventional Cardiology', 'MD DM Cardiology', 18, '9820001001', 'rajesh.sharma@clinic.in', 700, v_dept_cardio, 'SEED')
    RETURNING doctor_id INTO v_doc1;

    INSERT INTO DOCTOR (employee_id, full_name, specialisation, qualification, years_of_experience, contact, email, consultation_fee, department_id, created_by)
    VALUES ('EMP_D02', 'Dr. Priya Mehta', 'Clinical Cardiology', 'MD DNB Cardiology', 12, '9820001002', 'priya.mehta@clinic.in', 600, v_dept_cardio, 'SEED')
    RETURNING doctor_id INTO v_doc2;

    INSERT INTO DOCTOR (employee_id, full_name, specialisation, qualification, years_of_experience, contact, email, consultation_fee, department_id, created_by)
    VALUES ('EMP_D03', 'Dr. Arjun Patel', 'Orthopaedic Surgery', 'MS Orthopaedics DNB', 14, '9820001003', 'arjun.patel@clinic.in', 650, v_dept_ortho, 'SEED')
    RETURNING doctor_id INTO v_doc3;

    INSERT INTO DOCTOR (employee_id, full_name, specialisation, qualification, years_of_experience, contact, email, consultation_fee, department_id, created_by)
    VALUES ('EMP_D04', 'Dr. Sunita Reddy', 'Joint Replacement', 'MS Orthopaedics', 9, '9820001004', 'sunita.reddy@clinic.in', 550, v_dept_ortho, 'SEED')
    RETURNING doctor_id INTO v_doc4;

    INSERT INTO DOCTOR (employee_id, full_name, specialisation, qualification, years_of_experience, contact, email, consultation_fee, department_id, created_by)
    VALUES ('EMP_D05', 'Dr. Vikram Nair', 'Internal Medicine', 'MD General Medicine', 22, '9820001005', 'vikram.nair@clinic.in', 450, v_dept_general, 'SEED')
    RETURNING doctor_id INTO v_doc5;

    INSERT INTO DOCTOR (employee_id, full_name, specialisation, qualification, years_of_experience, contact, email, consultation_fee, department_id, created_by)
    VALUES ('EMP_D06', 'Dr. Kavitha Iyer', 'Diabetology', 'MD MRCP', 8, '9820001006', 'kavitha.iyer@clinic.in', 400, v_dept_general, 'SEED')
    RETURNING doctor_id INTO v_doc6;

    -- Set department heads
    UPDATE DEPARTMENT SET head_doctor_id = v_doc1 WHERE department_id = v_dept_cardio;
    UPDATE DEPARTMENT SET head_doctor_id = v_doc3 WHERE department_id = v_dept_ortho;
    UPDATE DEPARTMENT SET head_doctor_id = v_doc5 WHERE department_id = v_dept_general;

    -- ==========================================================
    -- STAFF
    -- ==========================================================
    INSERT INTO STAFF (employee_id, full_name, role, department_id, contact, email, shift, created_by)
    VALUES ('ST_001', 'Ramesh Kulkarni', 'RECEPTIONIST', v_dept_general, '9800111001', 'ramesh.k@clinic.in', 'MORNING', 'SEED');
    INSERT INTO STAFF (employee_id, full_name, role, department_id, contact, email, shift, created_by)
    VALUES ('ST_002', 'Meena Pillai', 'NURSE', v_dept_cardio, '9800111002', 'meena.p@clinic.in', 'MORNING', 'SEED');
    INSERT INTO STAFF (employee_id, full_name, role, department_id, contact, email, shift, created_by)
    VALUES ('ST_003', 'Sanjay Desai', 'LAB_TECH', v_dept_general, '9800111003', 'sanjay.d@clinic.in', 'AFTERNOON', 'SEED');
    INSERT INTO STAFF (employee_id, full_name, role, department_id, contact, email, shift, created_by)
    VALUES ('ST_004', 'Pooja Nambiar', 'PHARMACIST', v_dept_general, '9800111004', 'pooja.n@clinic.in', 'MORNING', 'SEED');

    -- ==========================================================
    -- PATIENTS (is_active=1, otp_verified=1 → fully registered)
    -- ==========================================================
    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Amit Joshi', DATE '1978-03-14', 'MALE', 'B+', '9876501001', '9876501001',
            'amit.joshi@gmail.com', '12, Shastri Nagar, Nagpur, Maharashtra 440001',
            'Sunita Joshi', '9876501100', 'Wife', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat1;

    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Preethi Krishnan', DATE '1990-07-22', 'FEMALE', 'A+', '9876501002', '9876501002',
            'preethi.krishnan@yahoo.in', '5, Gandhi Road, Chennai, Tamil Nadu 600002',
            'Karthik Krishnan', '9876501200', 'Husband', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat2;

    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Mohammed Rafi', DATE '1965-11-05', 'MALE', 'O+', '9876501003', '9876501003',
            'mohammed.rafi@hotmail.com', '78, Banjara Hills, Hyderabad, Telangana 500034',
            'Ayesha Rafi', '9876501300', 'Wife', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat3;

    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Deepa Sharma', DATE '1985-09-18', 'FEMALE', 'AB+', '9876501004', '9876501004',
            'deepa.sharma@gmail.com', '34, Rohini Sector 7, Delhi 110085',
            'Ramesh Sharma', '9876501400', 'Father', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat4;

    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Rohit Verma', DATE '1992-01-30', 'MALE', 'O-', '9876501005', '9876501005',
            'rohit.verma@rediffmail.com', '9, Koramangala 4th Block, Bengaluru 560034',
            'Anita Verma', '9876501500', 'Mother', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat5;

    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Lakshmi Devi', DATE '1955-06-12', 'FEMALE', 'A-', '9876501006', '9876501006',
            'lakshmi.devi@clinic.local', '22, Vastrapur, Ahmedabad, Gujarat 380015',
            'Subramaniam Devi', '9876501600', 'Son', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat6;

    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Suresh Gupta', DATE '1970-04-25', 'MALE', 'B-', '9876501007', '9876501007',
            'suresh.gupta@gmail.com', '45, Hazratganj, Lucknow, UP 226001',
            'Renu Gupta', '9876501700', 'Wife', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat7;

    INSERT INTO PATIENT (full_name, dob, gender, blood_group, contact_number, phone_number, email, address,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                         is_active, otp_verified, created_by)
    VALUES ('Ananya Singh', DATE '2000-12-03', 'FEMALE', 'O+', '9876501008', '9876501008',
            'ananya.singh@outlook.com', '11, Salt Lake, Kolkata, WB 700064',
            'Rajendra Singh', '9876501800', 'Father', 1, 1, 'SEED')
    RETURNING patient_id INTO v_pat8;

    -- Medical Records
    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat1, 'Penicillin', 'Hypertension, Type 2 Diabetes', NULL, 'Father - CAD', 'SEED');

    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat2, NULL, NULL, 'Appendectomy (2018)', 'Mother - Hypothyroidism', 'SEED');

    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat3, 'Sulfa drugs', 'Ischemic Heart Disease, Dyslipidaemia', 'CABG (2019)', 'Father - MI', 'SEED');

    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat4, NULL, 'PCOS, Hypothyroidism', NULL, 'Mother - Diabetes', 'SEED');

    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat5, NULL, NULL, 'ACL repair left knee (2021)', NULL, 'SEED');

    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat6, 'Aspirin', 'Osteoarthritis both knees, Hypertension', 'Right knee replacement (2020)', 'Daughter - Hypertension', 'SEED');

    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat7, NULL, 'Type 2 Diabetes, CKD Stage 2', NULL, 'Brother - Diabetes', 'SEED');

    INSERT INTO MEDICAL_RECORD (patient_id, allergies, chronic_conditions, surgical_history, family_history, created_by)
    VALUES (v_pat8, NULL, 'Migraine', NULL, NULL, 'SEED');

    -- ==========================================================
    -- AUTH USERS
    -- ==========================================================
    -- Admin (re-insert — was deleted above)
    INSERT INTO CLINIC_USER (username, hashed_password, role, is_active)
    VALUES ('admin', v_hash, 'ADMIN', 1);

    -- Doctors (3 login accounts — matching EMP IDs)
    INSERT INTO CLINIC_USER (username, hashed_password, role, linked_entity_id, is_active)
    VALUES ('dr_sharma', v_hash, 'DOCTOR', v_doc1, 1);

    INSERT INTO CLINIC_USER (username, hashed_password, role, linked_entity_id, is_active)
    VALUES ('dr_patel', v_hash, 'DOCTOR', v_doc3, 1);

    INSERT INTO CLINIC_USER (username, hashed_password, role, linked_entity_id, is_active)
    VALUES ('dr_nair', v_hash, 'DOCTOR', v_doc5, 1);

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Departments, doctors, patients, auth users inserted.');

    -- ==========================================================
    -- SECTION 3: APPOINTMENTS
    -- Past (COMPLETED): patient portal shows history
    -- Future/Today (SCHEDULED): doctor portal shows upcoming work
    -- ==========================================================

    -- ── Dr. Rajesh Sharma (v_doc1) ──────────────────────────────
    -- Past completed appointment
    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat1, v_doc1, DATE '2026-04-01', TIMESTAMP '2026-04-01 09:00:00', 'COMPLETED', v_dept_cardio, 'SEED')
    RETURNING appointment_id INTO v_app1;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat3, v_doc1, DATE '2026-04-05', TIMESTAMP '2026-04-05 10:30:00', 'COMPLETED', v_dept_cardio, 'SEED')
    RETURNING appointment_id INTO v_app2;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat6, v_doc1, DATE '2026-04-10', TIMESTAMP '2026-04-10 11:00:00', 'COMPLETED', v_dept_cardio, 'SEED')
    RETURNING appointment_id INTO v_app3;

    -- Future scheduled
    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat2, v_doc1, TRUNC(SYSDATE), TRUNC(SYSDATE) + INTERVAL '9' HOUR, 'SCHEDULED', v_dept_cardio, 'SEED')
    RETURNING appointment_id INTO v_app4;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat7, v_doc1, TRUNC(SYSDATE) + 1, TRUNC(SYSDATE+1) + INTERVAL '10' HOUR, 'SCHEDULED', v_dept_cardio, 'SEED')
    RETURNING appointment_id INTO v_app5;

    -- ── Dr. Arjun Patel (v_doc3) ────────────────────────────────
    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat5, v_doc3, DATE '2026-04-03', TIMESTAMP '2026-04-03 09:30:00', 'COMPLETED', v_dept_ortho, 'SEED')
    RETURNING appointment_id INTO v_app6;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat6, v_doc3, DATE '2026-04-08', TIMESTAMP '2026-04-08 11:30:00', 'COMPLETED', v_dept_ortho, 'SEED')
    RETURNING appointment_id INTO v_app7;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat4, v_doc3, TRUNC(SYSDATE), TRUNC(SYSDATE) + INTERVAL '14' HOUR, 'SCHEDULED', v_dept_ortho, 'SEED')
    RETURNING appointment_id INTO v_app8;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat8, v_doc3, TRUNC(SYSDATE) + 1, TRUNC(SYSDATE+1) + INTERVAL '9' HOUR, 'SCHEDULED', v_dept_ortho, 'SEED')
    RETURNING appointment_id INTO v_app9;

    -- ── Dr. Vikram Nair (v_doc5) ────────────────────────────────
    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat7, v_doc5, DATE '2026-04-02', TIMESTAMP '2026-04-02 09:00:00', 'COMPLETED', v_dept_general, 'SEED')
    RETURNING appointment_id INTO v_app10;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat4, v_doc5, DATE '2026-04-07', TIMESTAMP '2026-04-07 10:00:00', 'COMPLETED', v_dept_general, 'SEED')
    RETURNING appointment_id INTO v_app11;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat2, v_doc5, DATE '2026-04-12', TIMESTAMP '2026-04-12 09:30:00', 'COMPLETED', v_dept_general, 'SEED')
    RETURNING appointment_id INTO v_app12;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat1, v_doc5, TRUNC(SYSDATE), TRUNC(SYSDATE) + INTERVAL '11' HOUR, 'SCHEDULED', v_dept_general, 'SEED')
    RETURNING appointment_id INTO v_app13;

    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat3, v_doc5, TRUNC(SYSDATE) + 1, TRUNC(SYSDATE+1) + INTERVAL '15' HOUR, 'SCHEDULED', v_dept_general, 'SEED')
    RETURNING appointment_id INTO v_app14;

    -- No-show example
    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, department_id, created_by)
    VALUES (v_pat8, v_doc5, DATE '2026-04-09', TIMESTAMP '2026-04-09 09:00:00', 'NO_SHOW', v_dept_general, 'SEED')
    RETURNING appointment_id INTO v_app15;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Appointments inserted.');

    -- ==========================================================
    -- SECTION 4: CONSULTATIONS for COMPLETED appointments
    -- ==========================================================
    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app1, 'Chest tightness and breathlessness on exertion for 2 weeks',
            'Stable Angina Pectoris — CAD',
            'Started on long-acting nitrates. Aspirin 75mg OD. Atorvastatin 40mg at night. Avoid strenuous activity. Follow up in 2 weeks with stress test.',
            DATE '2026-04-15', 'SEED')
    RETURNING consultation_id INTO v_cons1;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app2, 'Palpitations and occasional dizziness for 3 days',
            'Paroxysmal Supraventricular Tachycardia (PSVT)',
            'Holter monitor arranged. Avoid caffeine and tobacco. Metoprolol 25mg BD started. Emergency department visit if episode lasts more than 30 minutes.',
            DATE '2026-04-19', 'SEED')
    RETURNING consultation_id INTO v_cons2;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app3, 'Swelling of feet and ankles, shortness of breath on lying flat',
            'Congestive Heart Failure — NYHA Class II',
            'Furosemide 40mg OD. Salt restriction < 2g/day. Daily weight monitoring. Ramipril 5mg OD. Spironolactone 25mg OD. Refer to cardiac rehab.',
            DATE '2026-04-24', 'SEED')
    RETURNING consultation_id INTO v_cons3;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app6, 'Left knee pain and inability to bear weight after sports injury',
            'ACL Tear Left Knee — Grade III',
            'MRI confirmed complete tear. Referred for arthroscopic surgery. RICE protocol. Diclofenac 50mg BD with meals. Physiotherapy pre-op.',
            DATE '2026-04-17', 'SEED')
    RETURNING consultation_id INTO v_cons4;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app7, 'Right knee pain, difficulty climbing stairs, morning stiffness',
            'Osteoarthritis Right Knee — Grade 3',
            'X-ray confirms moderate joint space narrowing. Calcium + Vit D3. Diclofenac gel topical. Physiotherapy 3x/week. Weight reduction advised. Intra-articular injection if no improvement.',
            DATE '2026-04-22', 'SEED')
    RETURNING consultation_id INTO v_cons5;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app10, 'Increased thirst, frequent urination, fatigue for 1 month',
            'Type 2 Diabetes Mellitus — Newly Diagnosed',
            'FBS 210 mg/dL, HbA1c 9.2%. Started Metformin 500mg BD with meals. Dietary counselling: low GI diet. Daily 30-minute walk. Recheck HbA1c in 3 months.',
            DATE '2026-07-02', 'SEED')
    RETURNING consultation_id INTO v_cons6;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app11, 'Irregular periods, weight gain, excess hair growth',
            'Polycystic Ovarian Syndrome (PCOS)',
            'USG pelvis confirms polycystic ovaries. Started Metformin 500mg OD. Oral contraceptive pill for cycle regulation. Thyroid function normal. Weight management counselling.',
            DATE '2026-05-07', 'SEED')
    RETURNING consultation_id INTO v_cons7;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app12, 'Mild fever, sore throat, runny nose for 4 days',
            'Acute Viral Upper Respiratory Tract Infection',
            'No antibiotics needed. Paracetamol 650mg TDS for fever. Cetirizine 10mg OD for rhinitis. Saline gargles. Plenty of fluids. Rest for 3 days. Return if fever persists beyond 5 days.',
            NULL, 'SEED')
    RETURNING consultation_id INTO v_cons8;

    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (v_app15, 'Routine follow-up — patient did not arrive', 'NO_SHOW', 'Patient did not attend scheduled appointment.', NULL, 'SEED')
    RETURNING consultation_id INTO v_cons9;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Consultations inserted.');

    -- ==========================================================
    -- SECTION 5: PRESCRIPTIONS + ITEMS
    -- ==========================================================
    -- Rx for Amit Joshi (Angina)
    INSERT INTO PRESCRIPTION (consultation_id, created_by) VALUES (v_cons1, 'SEED') RETURNING prescription_id INTO v_presc1;
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc1, 'Aspirin 75mg', '75mg', 'Once daily after breakfast', '30 days', 30, 'SEED');
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc1, 'Atorvastatin 40mg', '40mg', 'Once daily at night', '30 days', 30, 'SEED');
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc1, 'Isosorbide Mononitrate 20mg', '20mg', 'Twice daily', '30 days', 60, 'SEED');

    -- Rx for Mohammed Rafi (PSVT)
    INSERT INTO PRESCRIPTION (consultation_id, created_by) VALUES (v_cons2, 'SEED') RETURNING prescription_id INTO v_presc2;
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc2, 'Metoprolol 25mg', '25mg', 'Twice daily', '30 days', 60, 'SEED');

    -- Rx for Suresh Gupta (T2DM)
    INSERT INTO PRESCRIPTION (consultation_id, created_by) VALUES (v_cons6, 'SEED') RETURNING prescription_id INTO v_presc3;
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc3, 'Metformin 500mg', '500mg', 'Twice daily with meals', '90 days', 180, 'SEED');
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc3, 'Pantoprazole 40mg', '40mg', 'Once daily before breakfast', '30 days', 30, 'SEED');

    -- Rx for Deepa Sharma (PCOS)
    INSERT INTO PRESCRIPTION (consultation_id, created_by) VALUES (v_cons7, 'SEED') RETURNING prescription_id INTO v_presc4;
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc4, 'Metformin 500mg', '500mg', 'Once daily with dinner', '60 days', 60, 'SEED');
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc4, 'Folic Acid 5mg', '5mg', 'Once daily', '60 days', 60, 'SEED');

    -- Rx for Preethi Krishnan (URTI)
    INSERT INTO PRESCRIPTION (consultation_id, created_by) VALUES (v_cons8, 'SEED') RETURNING prescription_id INTO v_presc5;
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc5, 'Paracetamol 650mg', '650mg', 'Three times daily after meals', '5 days', 15, 'SEED');
    INSERT INTO PRESCRIPTION_ITEM (prescription_id, medication_name, dosage, frequency, duration, quantity, created_by)
    VALUES (v_presc5, 'Cetirizine 10mg', '10mg', 'Once daily at bedtime', '5 days', 5, 'SEED');

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Prescriptions and items inserted.');

    -- ==========================================================
    -- SECTION 6: BILLING UPDATES (trigger created rows on APPOINTMENT insert)
    -- Mark completed appointments as PAID
    -- ==========================================================
    UPDATE BILLING SET payment_status = 'PAID', amount_paid = 826, payment_mode = 'UPI'
    WHERE appointment_id = v_app1;   -- 700 * 1.18 = 826

    UPDATE BILLING SET payment_status = 'PAID', amount_paid = 826, payment_mode = 'CARD'
    WHERE appointment_id = v_app2;

    UPDATE BILLING SET payment_status = 'PARTIAL', amount_paid = 400, payment_mode = 'CASH'
    WHERE appointment_id = v_app3;

    UPDATE BILLING SET payment_status = 'PAID', amount_paid = 767, payment_mode = 'ONLINE'
    WHERE appointment_id = v_app6;   -- 650 * 1.18 = 767

    UPDATE BILLING SET payment_status = 'PAID', amount_paid = 767, payment_mode = 'UPI'
    WHERE appointment_id = v_app7;

    UPDATE BILLING SET payment_status = 'PAID', amount_paid = 531, payment_mode = 'CASH'
    WHERE appointment_id = v_app10;  -- 450 * 1.18 = 531

    UPDATE BILLING SET payment_status = 'PAID', amount_paid = 531, payment_mode = 'UPI'
    WHERE appointment_id = v_app11;

    UPDATE BILLING SET payment_status = 'WAIVED', amount_paid = 0, payment_mode = NULL
    WHERE appointment_id = v_app12;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Billing updated.');

    -- ==========================================================
    -- SECTION 7: VITAL SIGNS
    -- ==========================================================
    INSERT INTO VITAL_SIGNS (consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate,
                              temperature, weight_kg, height_cm, spo2, respiratory_rate,
                              recorded_by, created_by)
    VALUES (v_cons1, v_pat1, 148, 92, 88, 37.1, 82, 172, 97, 18, 'dr_sharma', 'SEED');

    INSERT INTO VITAL_SIGNS (consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate,
                              temperature, weight_kg, height_cm, spo2, respiratory_rate,
                              recorded_by, created_by)
    VALUES (v_cons2, v_pat3, 136, 84, 104, 37.0, 76, 170, 98, 20, 'dr_sharma', 'SEED');

    INSERT INTO VITAL_SIGNS (consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate,
                              temperature, weight_kg, height_cm, spo2, respiratory_rate,
                              recorded_by, created_by)
    VALUES (v_cons3, v_pat6, 152, 96, 94, 36.8, 68, 158, 94, 22, 'dr_sharma', 'SEED');

    INSERT INTO VITAL_SIGNS (consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate,
                              temperature, weight_kg, height_cm, spo2, respiratory_rate,
                              recorded_by, created_by)
    VALUES (v_cons4, v_pat5, 118, 74, 76, 36.9, 75, 178, 99, 16, 'dr_patel', 'SEED');

    INSERT INTO VITAL_SIGNS (consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate,
                              temperature, weight_kg, height_cm, spo2, respiratory_rate,
                              recorded_by, created_by)
    VALUES (v_cons6, v_pat7, 134, 86, 82, 37.2, 88, 168, 97, 18, 'dr_nair', 'SEED');

    INSERT INTO VITAL_SIGNS (consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate,
                              temperature, weight_kg, height_cm, spo2, respiratory_rate,
                              recorded_by, created_by)
    VALUES (v_cons7, v_pat4, 112, 70, 78, 36.7, 71, 163, 99, 16, 'dr_nair', 'SEED');

    INSERT INTO VITAL_SIGNS (consultation_id, patient_id, bp_systolic, bp_diastolic, heart_rate,
                              temperature, weight_kg, height_cm, spo2, respiratory_rate,
                              recorded_by, created_by)
    VALUES (v_cons8, v_pat2, 110, 68, 84, 38.3, 58, 162, 98, 20, 'dr_nair', 'SEED');

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Vital signs inserted.');

    -- ==========================================================
    -- SECTION 8: LAB ORDERS + RESULTS
    -- ==========================================================
    -- Fetch lab test IDs from catalogue
    SELECT lab_test_id INTO v_test_cbc   FROM LAB_TEST_CATALOGUE WHERE test_code = 'CBC';
    SELECT lab_test_id INTO v_test_ecg   FROM LAB_TEST_CATALOGUE WHERE test_code = 'ECG';
    SELECT lab_test_id INTO v_test_lipid FROM LAB_TEST_CATALOGUE WHERE test_code = 'LIPID';
    SELECT lab_test_id INTO v_test_lft   FROM LAB_TEST_CATALOGUE WHERE test_code = 'LFT';
    SELECT lab_test_id INTO v_test_hba1c FROM LAB_TEST_CATALOGUE WHERE test_code = 'HBA1C';
    SELECT lab_test_id INTO v_test_vitd  FROM LAB_TEST_CATALOGUE WHERE test_code = 'VITD';
    SELECT lab_test_id INTO v_test_xray  FROM LAB_TEST_CATALOGUE WHERE test_code = 'XRAY-KNEE';
    SELECT lab_test_id INTO v_test_echo  FROM LAB_TEST_CATALOGUE WHERE test_code = 'ECHO';

    -- Amit Joshi — ECG + Lipid Profile (ordered during cardiology consult)
    INSERT INTO LAB_ORDER (consultation_id, patient_id, lab_test_id, ordered_by_doctor_id,
                           status, priority, clinical_notes, expected_at, created_by)
    VALUES (v_cons1, v_pat1, v_test_ecg, v_doc1, 'COMPLETED', 'URGENT',
            'Rule out acute MI. ST changes on bedside ECG.', SYSTIMESTAMP + INTERVAL '1' HOUR, 'SEED')
    RETURNING lab_order_id INTO v_lab1;

    INSERT INTO LAB_ORDER (consultation_id, patient_id, lab_test_id, ordered_by_doctor_id,
                           status, priority, clinical_notes, expected_at, created_by)
    VALUES (v_cons1, v_pat1, v_test_lipid, v_doc1, 'COMPLETED', 'ROUTINE',
            'Baseline lipid profile for statin initiation.', SYSTIMESTAMP + INTERVAL '12' HOUR, 'SEED')
    RETURNING lab_order_id INTO v_lab2;

    -- Lakshmi Devi — Echo (CHF)
    INSERT INTO LAB_ORDER (consultation_id, patient_id, lab_test_id, ordered_by_doctor_id,
                           status, priority, clinical_notes, expected_at, created_by)
    VALUES (v_cons3, v_pat6, v_test_echo, v_doc1, 'COMPLETED', 'URGENT',
            'Assess LV function and ejection fraction in CHF.', SYSTIMESTAMP + INTERVAL '2' HOUR, 'SEED')
    RETURNING lab_order_id INTO v_lab3;

    -- Rohit Verma — X-Ray Knee (ACL)
    INSERT INTO LAB_ORDER (consultation_id, patient_id, lab_test_id, ordered_by_doctor_id,
                           status, priority, clinical_notes, expected_at, created_by)
    VALUES (v_cons4, v_pat5, v_test_xray, v_doc3, 'COMPLETED', 'URGENT',
            'Rule out fracture before MRI. Post-sports injury.', SYSTIMESTAMP + INTERVAL '1' HOUR, 'SEED')
    RETURNING lab_order_id INTO v_lab4;

    -- Suresh Gupta — CBC + HbA1c (Diabetes)
    INSERT INTO LAB_ORDER (consultation_id, patient_id, lab_test_id, ordered_by_doctor_id,
                           status, priority, clinical_notes, expected_at, created_by)
    VALUES (v_cons6, v_pat7, v_test_cbc, v_doc5, 'COMPLETED', 'ROUTINE',
            'Baseline CBC for new diabetes diagnosis.', SYSTIMESTAMP + INTERVAL '6' HOUR, 'SEED')
    RETURNING lab_order_id INTO v_lab5;

    INSERT INTO LAB_ORDER (consultation_id, patient_id, lab_test_id, ordered_by_doctor_id,
                           status, priority, clinical_notes, expected_at, created_by)
    VALUES (v_cons6, v_pat7, v_test_hba1c, v_doc5, 'COMPLETED', 'ROUTINE',
            'HbA1c to confirm diagnosis and set baseline for treatment.', SYSTIMESTAMP + INTERVAL '6' HOUR, 'SEED')
    RETURNING lab_order_id INTO v_lab6;

    COMMIT;

    -- Lab Results
    INSERT INTO LAB_RESULT (lab_order_id, result_summary, result_text, is_abnormal, uploaded_by, created_by)
    VALUES (v_lab1, 'ST depression in leads V4-V6. Sinus tachycardia HR 102 bpm.',
            'Rhythm: Sinus tachycardia. Rate: 102 bpm. ST depression 1.5mm in V4, V5, V6. No acute STEMI pattern. Consistent with demand ischaemia.',
            1, 'admin', 'SEED');

    INSERT INTO LAB_RESULT (lab_order_id, result_summary, result_text, is_abnormal, uploaded_by, created_by)
    VALUES (v_lab2, 'Elevated LDL and total cholesterol. HDL borderline low.',
            'Total Cholesterol: 242 mg/dL (High). LDL: 168 mg/dL (High). HDL: 38 mg/dL (Low). Triglycerides: 185 mg/dL (Borderline). Statin therapy indicated.',
            1, 'admin', 'SEED');

    INSERT INTO LAB_RESULT (lab_order_id, result_summary, result_text, is_abnormal, uploaded_by, created_by)
    VALUES (v_lab3, 'Reduced LVEF at 38%. Dilated left ventricle.',
            'LV end-diastolic diameter: 62mm (dilated). LVEF: 38% (reduced). Moderate mitral regurgitation. IVC plethoric consistent with elevated RA pressure. RV function preserved.',
            1, 'admin', 'SEED');

    INSERT INTO LAB_RESULT (lab_order_id, result_summary, result_text, is_abnormal, uploaded_by, created_by)
    VALUES (v_lab4, 'No fracture seen. Soft tissue swelling noted.',
            'Bones: No acute fracture or dislocation. Soft tissue swelling around the medial aspect of the knee. Joint space appears preserved. Recommend MRI for ligament assessment.',
            0, 'admin', 'SEED');

    INSERT INTO LAB_RESULT (lab_order_id, result_summary, result_text, is_abnormal, uploaded_by, created_by)
    VALUES (v_lab5, 'Haemoglobin slightly low. WBC and platelets normal.',
            'Hb: 11.8 g/dL (low). WBC: 8.2 x10^9/L (normal). Platelets: 210 x10^9/L (normal). MCV: 78fL (microcytic). Iron studies recommended.',
            1, 'admin', 'SEED');

    INSERT INTO LAB_RESULT (lab_order_id, result_summary, result_text, is_abnormal, uploaded_by, created_by)
    VALUES (v_lab6, 'HbA1c significantly elevated — consistent with poorly controlled diabetes.',
            'HbA1c: 9.2% (Target < 7%). Estimated Average Glucose: 216 mg/dL. Indicates poor glycaemic control over past 3 months. Lifestyle modification and Metformin initiated.',
            1, 'admin', 'SEED');

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Lab orders and results inserted.');

    DBMS_OUTPUT.PUT_LINE('==============================================');
    DBMS_OUTPUT.PUT_LINE('SEED COMPLETE. Login credentials:');
    DBMS_OUTPUT.PUT_LINE('  Admin  : admin / mock_user123');
    DBMS_OUTPUT.PUT_LINE('  Doctor : dr_sharma / mock_user123  (Cardiology)');
    DBMS_OUTPUT.PUT_LINE('  Doctor : dr_patel  / mock_user123  (Orthopaedics)');
    DBMS_OUTPUT.PUT_LINE('  Doctor : dr_nair   / mock_user123  (General Med)');
    DBMS_OUTPUT.PUT_LINE('  Patients login via phone at /patient/login:');
    DBMS_OUTPUT.PUT_LINE('    Amit Joshi       9876501001');
    DBMS_OUTPUT.PUT_LINE('    Preethi Krishnan 9876501002');
    DBMS_OUTPUT.PUT_LINE('    Mohammed Rafi    9876501003');
    DBMS_OUTPUT.PUT_LINE('    Deepa Sharma     9876501004');
    DBMS_OUTPUT.PUT_LINE('    Rohit Verma      9876501005');
    DBMS_OUTPUT.PUT_LINE('    Lakshmi Devi     9876501006');
    DBMS_OUTPUT.PUT_LINE('    Suresh Gupta     9876501007');
    DBMS_OUTPUT.PUT_LINE('    Ananya Singh     9876501008');
    DBMS_OUTPUT.PUT_LINE('==============================================');

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        DBMS_OUTPUT.PUT_LINE('ERROR: ' || SQLERRM);
        RAISE;
END;
/

-- Quick verify
SELECT 'DEPARTMENT'   AS tbl, COUNT(*) FROM DEPARTMENT  UNION ALL
SELECT 'DOCTOR',               COUNT(*) FROM DOCTOR      UNION ALL
SELECT 'PATIENT',              COUNT(*) FROM PATIENT     UNION ALL
SELECT 'CLINIC_USER',          COUNT(*) FROM CLINIC_USER UNION ALL
SELECT 'APPOINTMENT',          COUNT(*) FROM APPOINTMENT UNION ALL
SELECT 'CONSULTATION',         COUNT(*) FROM CONSULTATION UNION ALL
SELECT 'PRESCRIPTION',         COUNT(*) FROM PRESCRIPTION UNION ALL
SELECT 'BILLING',              COUNT(*) FROM BILLING     UNION ALL
SELECT 'VITAL_SIGNS',          COUNT(*) FROM VITAL_SIGNS UNION ALL
SELECT 'LAB_ORDER',            COUNT(*) FROM LAB_ORDER   UNION ALL
SELECT 'LAB_RESULT',           COUNT(*) FROM LAB_RESULT;
