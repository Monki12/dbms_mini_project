SET PAGESIZE 100
SET LINESIZE 200
COLUMN object_name FORMAT A20
COLUMN policy_name FORMAT A20
COLUMN enable FORMAT A10

SELECT object_name, policy_name, enable 
FROM all_policies 
WHERE object_owner = 'CLINIC_ADMIN';

EXEC clinic_ctx_pkg.set_role('PATIENT');
EXEC clinic_ctx_pkg.set_patient_id(1);
SELECT COUNT(*) AS patient_1_appts FROM appointment;

EXEC clinic_ctx_pkg.set_role('ADMIN');
SELECT COUNT(*) AS admin_appts FROM appointment;
EXIT;
