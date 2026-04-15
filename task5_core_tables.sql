-- TASK 5: DDL SCRIPT - CORE TABLES
-- Target: Oracle 19c+

CREATE TABLE DEPARTMENT (
    department_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    name VARCHAR2(255) NOT NULL,
    description VARCHAR2(1000),
    location VARCHAR2(255) NOT NULL,
    head_doctor_id NUMBER(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_DEPARTMENT PRIMARY KEY (department_id),
    CONSTRAINT UQ_DEPT_NAME UNIQUE (name),
    CONSTRAINT CK_DEPT_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE DEPARTMENT IS 'Represents clinical divisions and tracks the designated head of department.';
COMMENT ON COLUMN DEPARTMENT.department_id IS 'Surrogate primary key';
COMMENT ON COLUMN DEPARTMENT.head_doctor_id IS 'FK to the DOCTOR acting as head (nullable for bootstrap)';

CREATE TABLE DOCTOR (
    doctor_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    employee_id VARCHAR2(100) NOT NULL,
    full_name VARCHAR2(255) NOT NULL,
    specialisation VARCHAR2(255) NOT NULL,
    qualification VARCHAR2(255) NOT NULL,
    years_of_experience NUMBER(3) NOT NULL,
    contact VARCHAR2(50) NOT NULL,
    email VARCHAR2(255) NOT NULL,
    consultation_fee NUMBER(10,2) NOT NULL,
    department_id NUMBER(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_DOCTOR PRIMARY KEY (doctor_id),
    CONSTRAINT UQ_DOCTOR_EMP_ID UNIQUE (employee_id),
    CONSTRAINT UQ_DOCTOR_EMAIL UNIQUE (email),
    CONSTRAINT FK_DOCTOR_DEPT FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id),
    CONSTRAINT CK_DOCTOR_FEE CHECK (consultation_fee >= 0),
    CONSTRAINT CK_DOCTOR_EXP CHECK (years_of_experience >= 0),
    CONSTRAINT CK_DOCTOR_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE DOCTOR IS 'Stores clinical staff profiles, qualifications, and billing configurations.';
COMMENT ON COLUMN DOCTOR.consultation_fee IS 'Base fee charged for consultation';

-- Establish cyclic relationship for Head Doctor now that DOCTOR table exists
ALTER TABLE DEPARTMENT ADD CONSTRAINT FK_DEPT_HEAD_DOC 
    FOREIGN KEY (head_doctor_id) REFERENCES DOCTOR(doctor_id) ON DELETE SET NULL;

CREATE TABLE STAFF (
    staff_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    employee_id VARCHAR2(100) NOT NULL,
    full_name VARCHAR2(255) NOT NULL,
    role VARCHAR2(50) NOT NULL,
    department_id NUMBER(10) NOT NULL,
    contact VARCHAR2(50) NOT NULL,
    email VARCHAR2(255) NOT NULL,
    shift VARCHAR2(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_STAFF PRIMARY KEY (staff_id),
    CONSTRAINT UQ_STAFF_EMP_ID UNIQUE (employee_id),
    CONSTRAINT UQ_STAFF_EMAIL UNIQUE (email),
    CONSTRAINT FK_STAFF_DEPT FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id),
    CONSTRAINT CK_STAFF_ROLE CHECK (role IN ('RECEPTIONIST', 'ADMIN', 'NURSE', 'LAB_TECH', 'PHARMACIST', 'CLEANER', 'SECURITY')),
    CONSTRAINT CK_STAFF_SHIFT CHECK (shift IN ('MORNING', 'AFTERNOON', 'NIGHT')),
    CONSTRAINT CK_STAFF_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE STAFF IS 'Profiles for non-clinical administrative, technical, and supporting personnel.';

CREATE TABLE PATIENT (
    patient_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    full_name VARCHAR2(255) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR2(20) NOT NULL,
    blood_group VARCHAR2(10) NOT NULL,
    contact_number VARCHAR2(50) NOT NULL,
    email VARCHAR2(255) NOT NULL,
    address VARCHAR2(500) NOT NULL,
    emergency_contact_name VARCHAR2(255) NOT NULL,
    emergency_contact_phone VARCHAR2(50) NOT NULL,
    emergency_contact_relation VARCHAR2(100) NOT NULL,
    insurance_provider VARCHAR2(255),
    insurance_policy_number VARCHAR2(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_PATIENT PRIMARY KEY (patient_id),
    CONSTRAINT UQ_PATIENT_EMAIL UNIQUE (email),
    CONSTRAINT CK_PATIENT_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE PATIENT IS 'Core demographic, registration, and contact information for patients.';

CREATE TABLE MEDICAL_RECORD (
    record_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    patient_id NUMBER(10) NOT NULL,
    allergies VARCHAR2(1000),
    chronic_conditions VARCHAR2(1000),
    surgical_history VARCHAR2(1000),
    family_history VARCHAR2(1000),
    vaccination_records VARCHAR2(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_MEDICAL_RECORD PRIMARY KEY (record_id),
    CONSTRAINT FK_MED_REC_PATIENT FOREIGN KEY (patient_id) REFERENCES PATIENT(patient_id),
    CONSTRAINT UQ_MED_REC_PATIENT UNIQUE (patient_id),
    CONSTRAINT CK_MED_REC_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE MEDICAL_RECORD IS 'Stores long-term clinical history assigned permanently to a patient.';
