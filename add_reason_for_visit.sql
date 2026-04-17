-- Migration: add reason_for_visit to APPOINTMENT table
-- Run once: sqlplus clinic_admin/YourPassword@localhost:1521/XEPDB1 @add_reason_for_visit.sql

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE APPOINTMENT ADD reason_for_visit VARCHAR2(500)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1430 THEN RAISE; END IF;
    DBMS_OUTPUT.PUT_LINE('Column reason_for_visit already exists — skipping.');
END;
/

COMMIT;
SELECT 'reason_for_visit column ready.' AS status FROM DUAL;
