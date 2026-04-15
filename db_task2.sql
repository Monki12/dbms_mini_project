CREATE OR REPLACE CONTEXT clinic_ctx USING clinic_ctx_pkg;
/

CREATE OR REPLACE PACKAGE clinic_ctx_pkg AS
  PROCEDURE set_patient_id(p_patient_id IN NUMBER);
  PROCEDURE set_doctor_id(p_doctor_id IN NUMBER);
  PROCEDURE set_role(p_role IN VARCHAR2);
  PROCEDURE clear_context;
END clinic_ctx_pkg;
/

CREATE OR REPLACE PACKAGE BODY clinic_ctx_pkg AS
  PROCEDURE set_patient_id(p_patient_id IN NUMBER) IS
  BEGIN
    DBMS_SESSION.SET_CONTEXT('clinic_ctx','patient_id',p_patient_id);
  END;
  PROCEDURE set_doctor_id(p_doctor_id IN NUMBER) IS
  BEGIN
    DBMS_SESSION.SET_CONTEXT('clinic_ctx','doctor_id',p_doctor_id);
  END;
  PROCEDURE set_role(p_role IN VARCHAR2) IS
  BEGIN
    DBMS_SESSION.SET_CONTEXT('clinic_ctx','role',p_role);
  END;
  PROCEDURE clear_context IS
  BEGIN
    DBMS_SESSION.CLEAR_CONTEXT('clinic_ctx',NULL,'patient_id');
    DBMS_SESSION.CLEAR_CONTEXT('clinic_ctx',NULL,'doctor_id');
    DBMS_SESSION.CLEAR_CONTEXT('clinic_ctx',NULL,'role');
  END;
END clinic_ctx_pkg;
/

CREATE OR REPLACE FUNCTION vpd_patient_filter(
  schema_name IN VARCHAR2,
  table_name  IN VARCHAR2
) RETURN VARCHAR2 AS
  v_role       VARCHAR2(20);
  v_patient_id VARCHAR2(20);
  v_doctor_id  VARCHAR2(20);
BEGIN
  v_role       := SYS_CONTEXT('clinic_ctx','role');
  v_patient_id := SYS_CONTEXT('clinic_ctx','patient_id');
  v_doctor_id  := SYS_CONTEXT('clinic_ctx','doctor_id');
  
  IF v_role = 'ADMIN' THEN RETURN ''; END IF;
  
  IF v_role = 'DOCTOR' THEN
    IF table_name = 'APPOINTMENT' THEN
      RETURN 'doctor_id = ' || v_doctor_id;
    END IF;
    IF table_name IN ('CONSULTATION','BILLING') THEN
      RETURN 'appointment_id IN (SELECT appointment_id FROM appointment WHERE doctor_id = ' || v_doctor_id || ')';
    END IF;
    RETURN '';
  END IF;
  
  IF v_role = 'PATIENT' THEN
    IF table_name = 'APPOINTMENT' THEN
      RETURN 'patient_id = ' || v_patient_id;
    END IF;
    IF table_name = 'BILLING' THEN
      RETURN 'appointment_id IN (SELECT appointment_id FROM appointment WHERE patient_id = ' || v_patient_id || ')';
    END IF;
    IF table_name = 'MEDICAL_RECORD' THEN
      RETURN 'patient_id = ' || v_patient_id;
    END IF;
    IF table_name = 'CONSULTATION' THEN
      RETURN 'appointment_id IN (SELECT appointment_id FROM appointment WHERE patient_id = ' || v_patient_id || ')';
    END IF;
    IF table_name = 'PRESCRIPTION' THEN
      RETURN 'consultation_id IN (SELECT consultation_id FROM consultation WHERE appointment_id IN (SELECT appointment_id FROM appointment WHERE patient_id = ' || v_patient_id || '))';
    END IF;
  END IF;
  
  RETURN '1=0';
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(object_schema=>'CLINIC_ADMIN',object_name=>'APPOINTMENT',
    policy_name=>'pol_appt',function_schema=>'CLINIC_ADMIN',
    policy_function=>'vpd_patient_filter',statement_types=>'SELECT,UPDATE,DELETE');
  DBMS_RLS.ADD_POLICY(object_schema=>'CLINIC_ADMIN',object_name=>'BILLING',
    policy_name=>'pol_billing',function_schema=>'CLINIC_ADMIN',
    policy_function=>'vpd_patient_filter',statement_types=>'SELECT,UPDATE,DELETE');
  DBMS_RLS.ADD_POLICY(object_schema=>'CLINIC_ADMIN',object_name=>'MEDICAL_RECORD',
    policy_name=>'pol_medrec',function_schema=>'CLINIC_ADMIN',
    policy_function=>'vpd_patient_filter',statement_types=>'SELECT,UPDATE,DELETE');
  DBMS_RLS.ADD_POLICY(object_schema=>'CLINIC_ADMIN',object_name=>'CONSULTATION',
    policy_name=>'pol_consult',function_schema=>'CLINIC_ADMIN',
    policy_function=>'vpd_patient_filter',statement_types=>'SELECT,UPDATE,DELETE');
  DBMS_RLS.ADD_POLICY(object_schema=>'CLINIC_ADMIN',object_name=>'PRESCRIPTION',
    policy_name=>'pol_presc',function_schema=>'CLINIC_ADMIN',
    policy_function=>'vpd_patient_filter',statement_types=>'SELECT,UPDATE,DELETE');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -28101 THEN -- policy already exists
      RAISE;
    END IF;
END;
/

EXIT;
