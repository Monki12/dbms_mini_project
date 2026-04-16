-- =============================================================
-- SETUP: Test CLINIC_USER accounts for Integration Tests
-- =============================================================
-- Run this script ONCE after the seed data (task14_seed_data.sql)
-- to create staff logins for Doctor Portal integration testing.
--
-- All users have password: mock_user123
-- Hash: $2b$12$3MPGvH0vhglqEwBPUD9Wh.ysD4Vbndi3vCrRBh2mBc.IdQLR9NIVS
-- (bcrypt of 'password', matching the admin seed in task17_auth_ddl.sql)
--
-- To regenerate the hash for a different password:
--   python -c "from passlib.context import CryptContext; \
--              c=CryptContext(schemes=['bcrypt']); print(c.hash('yourpassword'))"
-- =============================================================

DECLARE
    v_hash VARCHAR2(255) := '$2b$12$3MPGvH0vhglqEwBPUD9Wh.ysD4Vbndi3vCrRBh2mBc.IdQLR9NIVS';
    -- Resolve actual doctor_ids from seed data
    v_doc1_id NUMBER;
    v_doc2_id NUMBER;
    v_doc3_id NUMBER;
BEGIN
    -- Fetch doctor IDs inserted by task14_seed_data.sql (by employee_id)
    SELECT doctor_id INTO v_doc1_id FROM DOCTOR WHERE employee_id = 'EMP_01';
    SELECT doctor_id INTO v_doc2_id FROM DOCTOR WHERE employee_id = 'EMP_02';
    SELECT doctor_id INTO v_doc3_id FROM DOCTOR WHERE employee_id = 'EMP_03';

    -- Delete old test users safely if they exist
    DELETE FROM CLINIC_USER WHERE username IN ('doc_alice', 'doc_bob', 'doc_charlie');

    -- Doctor 1: Dr. Alice Cardiac (Cardiology)
    INSERT INTO CLINIC_USER (username, hashed_password, role, linked_entity_id, is_active)
    VALUES ('doc_alice', v_hash, 'DOCTOR', v_doc1_id, 1);

    -- Doctor 2: Dr. Bob Bones (Orthopaedics)
    INSERT INTO CLINIC_USER (username, hashed_password, role, linked_entity_id, is_active)
    VALUES ('doc_bob', v_hash, 'DOCTOR', v_doc2_id, 1);

    -- Doctor 3: Dr. Charlie Med (General Medicine — has seed appointments via task14)
    INSERT INTO CLINIC_USER (username, hashed_password, role, linked_entity_id, is_active)
    VALUES ('doc_charlie', v_hash, 'DOCTOR', v_doc3_id, 1);

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('✓ Test users created successfully:');
    DBMS_OUTPUT.PUT_LINE('  doc_alice  → DOCTOR (EMP_01, id=' || v_doc1_id || ')');
    DBMS_OUTPUT.PUT_LINE('  doc_bob    → DOCTOR (EMP_02, id=' || v_doc2_id || ')');
    DBMS_OUTPUT.PUT_LINE('  doc_charlie→ DOCTOR (EMP_03, id=' || v_doc3_id || ')');
    DBMS_OUTPUT.PUT_LINE('  All passwords: password');

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('ERROR: Doctor records not found. Run task14_seed_data.sql first.');
        ROLLBACK;
    WHEN DUP_VAL_ON_INDEX THEN
        DBMS_OUTPUT.PUT_LINE('INFO: Some users already exist (ignored).');
        COMMIT;
END;
/

-- Verify
SELECT user_id, username, role, linked_entity_id, is_active
FROM CLINIC_USER
ORDER BY user_id;
