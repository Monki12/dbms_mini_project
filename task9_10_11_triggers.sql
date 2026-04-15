-- TASKS 9, 10, 11: Transactional Automation and Auditing Triggers

-- ======================================================================
-- TASK 9: TRIGGER: AUTOMATE BILLING RECORD CREATION
-- ======================================================================
CREATE OR REPLACE TRIGGER TRG_CREATE_BILLING
AFTER INSERT ON APPOINTMENT
FOR EACH ROW
WHEN (NEW.status = 'SCHEDULED')
DECLARE
    v_consultation_fee DOCTOR.consultation_fee%TYPE;
    v_doctor_exists NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_doctor_exists FROM DOCTOR WHERE doctor_id = :NEW.doctor_id;
    
    IF v_doctor_exists = 1 THEN
        SELECT consultation_fee INTO v_consultation_fee FROM DOCTOR WHERE doctor_id = :NEW.doctor_id;
        
        INSERT INTO BILLING (
            appointment_id, 
            consultation_fee, 
            additional_charges, 
            discount_pct, 
            tax_pct, 
            amount_paid, 
            payment_status, 
            created_by
        ) VALUES (
            :NEW.appointment_id, 
            v_consultation_fee, 
            0, -- additional_charges
            0, -- discount_pct
            18.00, -- tax_pct (GST constant)
            0, -- amount_paid
            'PENDING', 
            :NEW.created_by
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Safely ignore billing execution fail so appointment creation does not cascade fail entirely 
        NULL;
END TRG_CREATE_BILLING;
/

-- ======================================================================
-- TASK 10: TRIGGER: PAYMENT STATUS AUTOMATION
-- ======================================================================
CREATE OR REPLACE TRIGGER TRG_BILLING_STATUS
BEFORE UPDATE ON BILLING
FOR EACH ROW
BEGIN
    -- Evaluate manual logic breaking boundary invariants
    IF :NEW.amount_paid > :NEW.total_amount THEN
        RAISE_APPLICATION_ERROR(-20002, 'Amount paid (' || :NEW.amount_paid || ') cannot exceed the total computed amount (' || :NEW.total_amount || ').');
    END IF;

    -- Automate workflow state transitions
    IF :NEW.amount_paid = :NEW.total_amount THEN
        :NEW.payment_status := 'PAID';
    ELSIF :NEW.amount_paid > 0 AND :NEW.amount_paid < :NEW.total_amount THEN
        :NEW.payment_status := 'PARTIAL';
    ELSIF :NEW.amount_paid = 0 THEN
        :NEW.payment_status := 'PENDING';
    END IF;
END TRG_BILLING_STATUS;
/

-- ======================================================================
-- TASK 11: TRIGGER: AUDIT LOG (Standardized via Native JSON formatting)
-- ======================================================================

CREATE OR REPLACE TRIGGER TRG_AUDIT_PATIENT
AFTER INSERT OR UPDATE OR DELETE ON PATIENT
FOR EACH ROW
DECLARE
    v_op VARCHAR2(10);
    v_old_json CLOB;
    v_new_json CLOB;
    v_record_id NUMBER(10);
BEGIN
    IF INSERTING THEN v_op := 'INSERT'; v_record_id := :NEW.patient_id; END IF;
    IF UPDATING THEN v_op := 'UPDATE'; v_record_id := :NEW.patient_id; END IF;
    IF DELETING THEN v_op := 'DELETE'; v_record_id := :OLD.patient_id; END IF;

    IF INSERTING OR UPDATING THEN
        SELECT JSON_OBJECT('full_name' VALUE :NEW.full_name, 'contact_number' VALUE :NEW.contact_number) INTO v_new_json FROM DUAL;
    END IF;
    IF UPDATING OR DELETING THEN
        SELECT JSON_OBJECT('full_name' VALUE :OLD.full_name, 'contact_number' VALUE :OLD.contact_number) INTO v_old_json FROM DUAL;
    END IF;

    INSERT INTO AUDIT_LOG (table_name, operation, record_id, old_values, new_values, changed_by)
    VALUES ('PATIENT', v_op, v_record_id, v_old_json, v_new_json, SYS_CONTEXT('USERENV', 'SESSION_USER'));
END TRG_AUDIT_PATIENT;
/

CREATE OR REPLACE TRIGGER TRG_AUDIT_DOCTOR
AFTER INSERT OR UPDATE OR DELETE ON DOCTOR
FOR EACH ROW
DECLARE
    v_op VARCHAR2(10);
    v_old_json CLOB; v_new_json CLOB;
    v_record_id NUMBER(10);
BEGIN
    IF INSERTING THEN v_op := 'INSERT'; v_record_id := :NEW.doctor_id; END IF;
    IF UPDATING THEN v_op := 'UPDATE'; v_record_id := :NEW.doctor_id; END IF;
    IF DELETING THEN v_op := 'DELETE'; v_record_id := :OLD.doctor_id; END IF;

    IF INSERTING OR UPDATING THEN SELECT JSON_OBJECT('full_name' VALUE :NEW.full_name, 'consultation_fee' VALUE :NEW.consultation_fee) INTO v_new_json FROM DUAL; END IF;
    IF UPDATING OR DELETING THEN SELECT JSON_OBJECT('full_name' VALUE :OLD.full_name, 'consultation_fee' VALUE :OLD.consultation_fee) INTO v_old_json FROM DUAL; END IF;

    INSERT INTO AUDIT_LOG (table_name, operation, record_id, old_values, new_values, changed_by) VALUES ('DOCTOR', v_op, v_record_id, v_old_json, v_new_json, SYS_CONTEXT('USERENV', 'SESSION_USER'));
END TRG_AUDIT_DOCTOR;
/

CREATE OR REPLACE TRIGGER TRG_AUDIT_APPOINTMENT
AFTER INSERT OR UPDATE OR DELETE ON APPOINTMENT
FOR EACH ROW
DECLARE
    v_op VARCHAR2(10);
    v_old_json CLOB; v_new_json CLOB;
    v_record_id NUMBER(10);
BEGIN
    IF INSERTING THEN v_op := 'INSERT'; v_record_id := :NEW.appointment_id; END IF;
    IF UPDATING THEN v_op := 'UPDATE'; v_record_id := :NEW.appointment_id; END IF;
    IF DELETING THEN v_op := 'DELETE'; v_record_id := :OLD.appointment_id; END IF;

    IF INSERTING OR UPDATING THEN SELECT JSON_OBJECT('status' VALUE :NEW.status, 'doctor_id' VALUE :NEW.doctor_id) INTO v_new_json FROM DUAL; END IF;
    IF UPDATING OR DELETING THEN SELECT JSON_OBJECT('status' VALUE :OLD.status, 'doctor_id' VALUE :OLD.doctor_id) INTO v_old_json FROM DUAL; END IF;

    INSERT INTO AUDIT_LOG (table_name, operation, record_id, old_values, new_values, changed_by) VALUES ('APPOINTMENT', v_op, v_record_id, v_old_json, v_new_json, SYS_CONTEXT('USERENV', 'SESSION_USER'));
END TRG_AUDIT_APPOINTMENT;
/

CREATE OR REPLACE TRIGGER TRG_AUDIT_BILLING
AFTER INSERT OR UPDATE OR DELETE ON BILLING
FOR EACH ROW
DECLARE
    v_op VARCHAR2(10);
    v_old_json CLOB; v_new_json CLOB;
    v_record_id NUMBER(10);
BEGIN
    IF INSERTING THEN v_op := 'INSERT'; v_record_id := :NEW.billing_id; END IF;
    IF UPDATING THEN v_op := 'UPDATE'; v_record_id := :NEW.billing_id; END IF;
    IF DELETING THEN v_op := 'DELETE'; v_record_id := :OLD.billing_id; END IF;

    IF INSERTING OR UPDATING THEN SELECT JSON_OBJECT('payment_status' VALUE :NEW.payment_status, 'amount_paid' VALUE :NEW.amount_paid) INTO v_new_json FROM DUAL; END IF;
    IF UPDATING OR DELETING THEN SELECT JSON_OBJECT('payment_status' VALUE :OLD.payment_status, 'amount_paid' VALUE :OLD.amount_paid) INTO v_old_json FROM DUAL; END IF;

    INSERT INTO AUDIT_LOG (table_name, operation, record_id, old_values, new_values, changed_by) VALUES ('BILLING', v_op, v_record_id, v_old_json, v_new_json, SYS_CONTEXT('USERENV', 'SESSION_USER'));
END TRG_AUDIT_BILLING;
/

CREATE OR REPLACE TRIGGER TRG_AUDIT_PRESCRIPTION
AFTER INSERT OR UPDATE OR DELETE ON PRESCRIPTION
FOR EACH ROW
DECLARE
    v_op VARCHAR2(10);
    v_old_json CLOB; v_new_json CLOB;
    v_record_id NUMBER(10);
BEGIN
    IF INSERTING THEN v_op := 'INSERT'; v_record_id := :NEW.prescription_id; END IF;
    IF UPDATING THEN v_op := 'UPDATE'; v_record_id := :NEW.prescription_id; END IF;
    IF DELETING THEN v_op := 'DELETE'; v_record_id := :OLD.prescription_id; END IF;

    IF INSERTING OR UPDATING THEN SELECT JSON_OBJECT('consultation_id' VALUE :NEW.consultation_id) INTO v_new_json FROM DUAL; END IF;
    IF UPDATING OR DELETING THEN SELECT JSON_OBJECT('consultation_id' VALUE :OLD.consultation_id) INTO v_old_json FROM DUAL; END IF;

    INSERT INTO AUDIT_LOG (table_name, operation, record_id, old_values, new_values, changed_by) VALUES ('PRESCRIPTION', v_op, v_record_id, v_old_json, v_new_json, SYS_CONTEXT('USERENV', 'SESSION_USER'));
END TRG_AUDIT_PRESCRIPTION;
/
