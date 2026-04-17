-- Emergency fix: restore CLINIC_USER entries so login works.
-- Run: sqlplus clinic_admin/YourPassword@localhost:1521/XEPDB1
--      @fix_login.sql

SET DEFINE OFF

DELETE FROM CLINIC_USER;

INSERT INTO CLINIC_USER (username, hashed_password, role, is_active)
VALUES ('admin', '$2b$12$zV7ZuHu7tLkIoa8SpJvKJe2WLNxkF3FF4SI/MeRcnBAEgsDn5KNly', 'ADMIN', 1);

COMMIT;

SELECT user_id, username, role, is_active FROM CLINIC_USER;
