-- TASK 12: STORED PROCEDURES AND FUNCTIONS
-- Defines robust PL/SQL API logic for interaction with backend

CREATE OR REPLACE PROCEDURE book_appointment(
    p_patient_id IN NUMBER,
    p_doctor_id IN NUMBER,
    p_date IN DATE,
    p_slot_start IN TIMESTAMP,
    p_booked_by IN VARCHAR2,
    p_appointment_id OUT NUMBER,
    p_status_msg OUT VARCHAR2
) AS 
    v_patient_exists NUMBER;
    v_doctor_exists NUMBER;
    v_doctor_is_deleted NUMBER;
BEGIN
    -- Validate patient existence
    SELECT COUNT(*) INTO v_patient_exists FROM PATIENT WHERE patient_id = p_patient_id AND is_deleted = 0;
    IF v_patient_exists = 0 THEN
        p_status_msg := 'ERROR: Patient does not exist or is marked as deleted.';
        RETURN;
    END IF;

    -- Validate doctor existence
    SELECT COUNT(*) INTO v_doctor_exists FROM DOCTOR WHERE doctor_id = p_doctor_id AND is_deleted = 0;
    IF v_doctor_exists = 0 THEN
        p_status_msg := 'ERROR: Doctor does not exist or is inactive.';
        RETURN;
    END IF;

    -- Proceed to insert. Double-booking TRG error will be raised natively up the stack if it overlaps.
    INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, created_by)
    VALUES (p_patient_id, p_doctor_id, p_date, p_slot_start, 'SCHEDULED', p_booked_by)
    RETURNING appointment_id INTO p_appointment_id;

    p_status_msg := 'SUCCESS: Appointment Booked.';
EXCEPTION 
    WHEN OTHERS THEN
        p_status_msg := 'ERROR: Integration failure -> ' || SQLERRM;
END book_appointment;
/

CREATE OR REPLACE PROCEDURE complete_appointment(
    p_appointment_id IN NUMBER,
    p_complaint IN VARCHAR2,
    p_diagnosis IN VARCHAR2,
    p_treatment_notes IN VARCHAR2,
    p_follow_up_date IN DATE,
    p_completed_by IN VARCHAR2
) AS 
    v_status APPOINTMENT.status%TYPE;
    v_consultation_id NUMBER;
BEGIN
    -- Validate transition rules
    SELECT status INTO v_status FROM APPOINTMENT WHERE appointment_id = p_appointment_id;
    IF v_status != 'SCHEDULED' THEN
        RAISE_APPLICATION_ERROR(-20003, 'Only a SCHEDULED appointment can be concluded.');
    END IF;

    -- Transition state
    UPDATE APPOINTMENT 
    SET status = 'COMPLETED', updated_at = SYSTIMESTAMP 
    WHERE appointment_id = p_appointment_id;

    -- Generate paired consultation record
    INSERT INTO CONSULTATION (appointment_id, chief_complaint, diagnosis, treatment_notes, follow_up_date, created_by)
    VALUES (p_appointment_id, p_complaint, p_diagnosis, p_treatment_notes, p_follow_up_date, p_completed_by);

    COMMIT;
END complete_appointment;
/

CREATE OR REPLACE FUNCTION get_doctor_availability(
    p_doctor_id IN NUMBER,
    p_date IN DATE
) RETURN SYS_REFCURSOR AS 
    v_cursor SYS_REFCURSOR;
BEGIN
    OPEN v_cursor FOR
        WITH AllSlots AS (
            SELECT TO_TIMESTAMP(TO_CHAR(p_date, 'YYYY-MM-DD') || ' 08:00:00', 'YYYY-MM-DD HH24:MI:SS') + (LEVEL-1)*INTERVAL '30' MINUTE AS slot_time
            FROM DUAL 
            CONNECT BY LEVEL <= 24 -- Fills 8 AM through 7:30 PM
        )
        SELECT s.slot_time
        FROM AllSlots s
        WHERE s.slot_time NOT IN (
            SELECT slot_start FROM APPOINTMENT 
            WHERE doctor_id = p_doctor_id 
              AND appt_date = p_date 
              AND status = 'SCHEDULED'
        )
        ORDER BY s.slot_time;
        
    RETURN v_cursor;
END get_doctor_availability;
/

CREATE OR REPLACE FUNCTION calculate_billing_total(
    p_appointment_id IN NUMBER
) RETURN NUMBER AS 
    v_total NUMBER(10,2);
BEGIN
    -- Pull directly from the Virtual generated column maintaining perfect state logic
    SELECT total_amount INTO v_total 
    FROM BILLING 
    WHERE appointment_id = p_appointment_id;
    
    RETURN v_total;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0;
END calculate_billing_total;
/

CREATE OR REPLACE PROCEDURE generate_billing_report(
    p_start_date IN DATE,
    p_end_date IN DATE,
    p_dept_id IN NUMBER DEFAULT NULL
) AS 
    CURSOR c_report IS
        SELECT d.name AS dept_name, b.payment_mode, SUM(b.total_amount) AS billed, SUM(b.amount_paid) AS collected
        FROM BILLING b
        JOIN APPOINTMENT a ON b.appointment_id = a.appointment_id
        JOIN DOCTOR doc ON a.doctor_id = doc.doctor_id
        JOIN DEPARTMENT d ON doc.department_id = d.department_id
        WHERE a.appt_date BETWEEN p_start_date AND p_end_date
          AND (p_dept_id IS NULL OR d.department_id = p_dept_id)
        GROUP BY d.name, b.payment_mode;
    
    v_owed NUMBER := 0;
BEGIN
    DBMS_OUTPUT.PUT_LINE('----------------------------------------------------');
    DBMS_OUTPUT.PUT_LINE('BILLING REVENUE REPORT (' || TO_CHAR(p_start_date, 'DD-MON') || ' to ' || TO_CHAR(p_end_date, 'DD-MON') || ')');
    DBMS_OUTPUT.PUT_LINE('----------------------------------------------------');
    
    FOR r IN c_report LOOP
        v_owed := r.billed - r.collected;
        DBMS_OUTPUT.PUT_LINE('Department: ' || r.dept_name || ' | Mode: ' || NVL(r.payment_mode, 'UNSET'));
        DBMS_OUTPUT.PUT_LINE('   Total Billed: $' || r.billed);
        DBMS_OUTPUT.PUT_LINE('   Total Collected: $' || r.collected);
        DBMS_OUTPUT.PUT_LINE('   Outstanding Deficit: $' || v_owed);
    END LOOP;
END generate_billing_report;
/
