-- TASK 8: TRIGGER: PREVENT DOUBLE-BOOKING
-- Handles mutating-table anomalies safely.

CREATE OR REPLACE TRIGGER TRG_NO_DOUBLE_BOOKING
FOR INSERT OR UPDATE ON APPOINTMENT
COMPOUND TRIGGER
    
    -- Structure to cache rows during the BEFORE EACH ROW phase
    TYPE t_appt_rec IS RECORD (
        doctor_id APPOINTMENT.doctor_id%TYPE,
        appt_date APPOINTMENT.appt_date%TYPE,
        slot_start APPOINTMENT.slot_start%TYPE
    );
    TYPE t_appt_list IS TABLE OF t_appt_rec INDEX BY PLS_INTEGER;
    
    v_new_appts t_appt_list;
    v_idx PLS_INTEGER := 0;

    BEFORE STATEMENT IS BEGIN
        -- Reset context
        v_idx := 0;
        v_new_appts.DELETE;
    END BEFORE STATEMENT;

    BEFORE EACH ROW IS BEGIN
        -- We only care about ensuringSCHEDULED appointments do not overlap
        IF :NEW.status = 'SCHEDULED' THEN
            v_idx := v_idx + 1;
            v_new_appts(v_idx).doctor_id := :NEW.doctor_id;
            v_new_appts(v_idx).appt_date := :NEW.appt_date;
            v_new_appts(v_idx).slot_start := :NEW.slot_start;
        END IF;
    END BEFORE EACH ROW;

    AFTER STATEMENT IS
        v_count PLS_INTEGER;
        v_doc_name VARCHAR2(255);
    BEGIN
        -- For every recorded SCHEDULED appointment, verify the total existing block
        FOR i IN 1 .. v_idx LOOP
            SELECT COUNT(*) INTO v_count
            FROM APPOINTMENT
            WHERE doctor_id = v_new_appts(i).doctor_id
              AND appt_date = v_new_appts(i).appt_date
              AND slot_start = v_new_appts(i).slot_start
              AND status = 'SCHEDULED';
              
            -- Because the AFTER STATEMENT fires after DML execution, the current row counts as 1.
            -- If v_count > 1, there is a true double booking overlapping interval.
            IF v_count > 1 THEN
                -- Retrieve specific doctor name for clear error message
                SELECT full_name INTO v_doc_name 
                FROM DOCTOR 
                WHERE doctor_id = v_new_appts(i).doctor_id;
                
                RAISE_APPLICATION_ERROR(-20001, 
                    'Double booking detected! Doctor ' || v_doc_name || 
                    ' already has a SCHEDULED appointment on ' || TO_CHAR(v_new_appts(i).appt_date, 'YYYY-MM-DD') || 
                    ' at ' || TO_CHAR(v_new_appts(i).slot_start, 'HH24:MI') || '.');
            END IF;
        END LOOP;
    END AFTER STATEMENT;
END TRG_NO_DOUBLE_BOOKING;
/

-- ======================================================================
-- TEST CASES FOR TASK 8
-- ======================================================================
/*
-- First appointment completes cleanly
INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, created_by)
VALUES (1, 2, DATE '2030-01-01', TIMESTAMP '2030-01-01 09:00:00', 'SCHEDULED', 'SYS');

-- Second appointment attempts to double book the same doctor, date, and slot
INSERT INTO APPOINTMENT (patient_id, doctor_id, appt_date, slot_start, status, created_by)
VALUES (2, 2, DATE '2030-01-01', TIMESTAMP '2030-01-01 09:00:00', 'SCHEDULED', 'SYS');
-- OUTCOME: ORA-20001 Double booking detected! -> Successfully blocks overlapping
*/
