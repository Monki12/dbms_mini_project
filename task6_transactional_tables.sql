-- TASK 6: DDL SCRIPT - TRANSACTIONAL TABLES
-- Target: Oracle 19c+

CREATE TABLE APPOINTMENT (
    appointment_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    patient_id NUMBER(10) NOT NULL,
    doctor_id NUMBER(10) NOT NULL,
    appt_date DATE NOT NULL,
    slot_start TIMESTAMP NOT NULL,
    status VARCHAR2(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_APPOINTMENT PRIMARY KEY (appointment_id),
    CONSTRAINT FK_APPT_PATIENT FOREIGN KEY (patient_id) REFERENCES PATIENT(patient_id),
    CONSTRAINT FK_APPT_DOCTOR FOREIGN KEY (doctor_id) REFERENCES DOCTOR(doctor_id),
    CONSTRAINT UQ_APPOINTMENT_SLOT UNIQUE (doctor_id, appt_date, slot_start),
    CONSTRAINT CK_APPT_STATUS CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    CONSTRAINT CK_APPT_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE APPOINTMENT IS 'Schedules a 30-minute consultation slot between a given patient and doctor.';

CREATE TABLE CONSULTATION (
    consultation_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    appointment_id NUMBER(10) NOT NULL,
    chief_complaint VARCHAR2(1000) NOT NULL,
    diagnosis VARCHAR2(1000) NOT NULL,
    treatment_notes VARCHAR2(2000) NOT NULL,
    follow_up_date DATE,
    referring_doctor_id NUMBER(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_CONSULTATION PRIMARY KEY (consultation_id),
    CONSTRAINT FK_CONS_APPT FOREIGN KEY (appointment_id) REFERENCES APPOINTMENT(appointment_id),
    CONSTRAINT FK_CONS_REF_DOC FOREIGN KEY (referring_doctor_id) REFERENCES DOCTOR(doctor_id) ON DELETE SET NULL,
    CONSTRAINT UQ_CONSULTATION_APPT UNIQUE (appointment_id),
    CONSTRAINT CK_CONS_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE CONSULTATION IS 'Clinical notes recorded by a doctor, instantiated when an appointment concludes.';

CREATE TABLE PRESCRIPTION (
    prescription_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    consultation_id NUMBER(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_PRESCRIPTION PRIMARY KEY (prescription_id),
    CONSTRAINT FK_PRES_CONS FOREIGN KEY (consultation_id) REFERENCES CONSULTATION(consultation_id),
    CONSTRAINT UQ_PRESCRIPTION_CONS UNIQUE (consultation_id),
    CONSTRAINT CK_PRES_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE PRESCRIPTION IS 'Header entity linking a specific consultation to medication directives.';

CREATE TABLE PRESCRIPTION_ITEM (
    item_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    prescription_id NUMBER(10) NOT NULL,
    medication_name VARCHAR2(255) NOT NULL,
    dosage VARCHAR2(100) NOT NULL,
    frequency VARCHAR2(100) NOT NULL,
    duration VARCHAR2(100) NOT NULL,
    special_instructions VARCHAR2(1000),
    quantity NUMBER(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_PRESCRIPTION_ITEM PRIMARY KEY (item_id),
    CONSTRAINT FK_PRES_ITEM_PRES FOREIGN KEY (prescription_id) REFERENCES PRESCRIPTION(prescription_id),
    CONSTRAINT CK_PRES_ITEM_QTY CHECK (quantity > 0),
    CONSTRAINT CK_PRES_ITEM_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE PRESCRIPTION_ITEM IS 'Specific order parameters for a distinct medication under a single prescription.';

CREATE TABLE BILLING (
    billing_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    appointment_id NUMBER(10) NOT NULL,
    consultation_fee NUMBER(10,2) NOT NULL,
    additional_charges NUMBER(10,2) DEFAULT 0,
    additional_charges_reason VARCHAR2(1000),
    discount_pct NUMBER(5,2) DEFAULT 0,
    tax_pct NUMBER(5,2) DEFAULT 18.00 NOT NULL,
    total_amount NUMBER(10,2) GENERATED ALWAYS AS (
        (consultation_fee + COALESCE(additional_charges, 0)) 
        * (1 - (COALESCE(discount_pct, 0) / 100)) 
        * (1 + (tax_pct / 100))
    ) VIRTUAL,
    amount_paid NUMBER(10,2) DEFAULT 0 NOT NULL,
    payment_mode VARCHAR2(20),
    payment_status VARCHAR2(20) DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    created_by VARCHAR2(100) NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    row_version NUMBER DEFAULT 1 NOT NULL,
    CONSTRAINT PK_BILLING PRIMARY KEY (billing_id),
    CONSTRAINT FK_BILLING_APPT FOREIGN KEY (appointment_id) REFERENCES APPOINTMENT(appointment_id),
    CONSTRAINT UQ_BILLING_APPT UNIQUE (appointment_id),
    CONSTRAINT CK_BILLING_PAY_MODE CHECK (payment_mode IN ('CASH', 'CARD', 'UPI', 'INSURANCE', 'ONLINE') OR payment_mode IS NULL),
    CONSTRAINT CK_BILLING_PAY_STATUS CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID', 'WAIVED', 'REFUNDED')),
    CONSTRAINT CK_BILLING_DISCOUNT CHECK (discount_pct >= 0 AND discount_pct <= 100),
    CONSTRAINT CK_BILLING_TAX CHECK (tax_pct = 18.00),
    CONSTRAINT CK_BILLING_PAID CHECK (amount_paid >= 0),
    CONSTRAINT CK_BILLING_IS_DELETED CHECK (is_deleted IN (0, 1))
);

COMMENT ON TABLE BILLING IS 'Financial ledger tracking consultation fees, extra debits, tax, and settlement.';
COMMENT ON COLUMN BILLING.total_amount IS 'Virtual column computing the exact owed amount.';

CREATE TABLE AUDIT_LOG (
    log_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    table_name VARCHAR2(100) NOT NULL,
    operation VARCHAR2(10) NOT NULL,
    record_id NUMBER(10) NOT NULL,
    old_values CLOB,
    new_values CLOB,
    changed_by VARCHAR2(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_AUDIT_LOG PRIMARY KEY (log_id),
    CONSTRAINT CK_AUDIT_OP CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

COMMENT ON TABLE AUDIT_LOG IS 'Immutable ledger capturing DML operations stored as JSON BLOBs.';
