-- TASK 13: ORACLE DATA VIEWS 
-- Maps dense relational matrices into intuitive queryable outputs.

CREATE OR REPLACE VIEW V_PATIENT_SUMMARY AS
SELECT 
    p.patient_id, 
    p.full_name, 
    TRUNC(MONTHS_BETWEEN(SYSDATE, p.dob) / 12) AS age, 
    p.blood_group, 
    (SELECT MAX(appt_date) FROM APPOINTMENT WHERE patient_id = p.patient_id AND status = 'COMPLETED') AS last_appointment_date,
    (SELECT COUNT(*) FROM APPOINTMENT WHERE patient_id = p.patient_id AND status = 'COMPLETED') AS total_visits,
    (SELECT SUM(total_amount - amount_paid) FROM BILLING b JOIN APPOINTMENT a ON b.appointment_id = a.appointment_id WHERE a.patient_id = p.patient_id) AS outstanding_balance
FROM PATIENT p
WHERE p.is_deleted = 0;

CREATE OR REPLACE VIEW V_DOCTOR_SCHEDULE_TODAY AS
SELECT 
    d.doctor_id,
    d.full_name AS doctor_name,
    dept.name AS dept_name,
    a.slot_start,
    p.full_name AS patient_name,
    a.status AS appointment_status
FROM APPOINTMENT a
JOIN DOCTOR d ON a.doctor_id = d.doctor_id
JOIN DEPARTMENT dept ON d.department_id = dept.department_id
JOIN PATIENT p ON a.patient_id = p.patient_id
WHERE TRUNC(a.appt_date) = TRUNC(SYSDATE)
  AND a.is_deleted = 0;

CREATE OR REPLACE VIEW V_BILLING_OUTSTANDING AS
SELECT 
    b.billing_id,
    p.full_name AS patient_name,
    d.full_name AS doctor_name,
    a.appt_date,
    b.consultation_fee,
    b.additional_charges,
    b.discount_pct,
    b.total_amount,
    b.amount_paid,
    b.payment_status
FROM BILLING b
JOIN APPOINTMENT a ON b.appointment_id = a.appointment_id
JOIN PATIENT p ON a.patient_id = p.patient_id
JOIN DOCTOR d ON a.doctor_id = d.doctor_id
WHERE b.payment_status IN ('PENDING', 'PARTIAL')
  AND b.is_deleted = 0
ORDER BY a.appt_date ASC;

-- ======================================================================
-- MATERIALIZED VIEW: V_DEPT_REVENUE
-- Recompiled natively to securely aggregate dense monthly totals.
-- ======================================================================

CREATE MATERIALIZED VIEW V_DEPT_REVENUE
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND
AS
SELECT 
    d.department_id,
    d.name AS dept_name,
    TRUNC(a.appt_date, 'MM') AS revenue_month,
    SUM(b.total_amount) AS total_billed,
    SUM(b.amount_paid) AS total_collected,
    (SUM(b.amount_paid) / NULLIF(SUM(b.total_amount), 0)) * 100 AS collection_rate_pct
FROM DEPARTMENT d
JOIN DOCTOR doc ON d.department_id = doc.department_id
JOIN APPOINTMENT a ON doc.doctor_id = a.doctor_id
JOIN BILLING b ON a.appointment_id = b.appointment_id
WHERE a.status = 'COMPLETED'
GROUP BY d.department_id, d.name, TRUNC(a.appt_date, 'MM');

-- Example of manual execution constraint to refresh the analytical datastore:
-- EXEC DBMS_MVIEW.REFRESH('V_DEPT_REVENUE', 'C');
