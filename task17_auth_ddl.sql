-- TASK 17: AUTHENTICATION SCHEMA
-- Dedicated structure for API users disjoint from pure clinical entities.

CREATE TABLE CLINIC_USER (
    user_id NUMBER(10) GENERATED ALWAYS AS IDENTITY,
    username VARCHAR2(255) NOT NULL,
    hashed_password VARCHAR2(255) NOT NULL,
    role VARCHAR2(50) NOT NULL,
    linked_entity_id NUMBER(10),
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_CLINIC_USER PRIMARY KEY (user_id),
    CONSTRAINT UQ_CLINIC_USER_NAME UNIQUE (username),
    CONSTRAINT CK_USER_ROLE CHECK (role IN ('ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT'))
);

COMMENT ON TABLE CLINIC_USER IS 'Authentication tracking linking to specific operational domains via linked_entity_id.';

CREATE TABLE TOKEN_BLACKLIST (
    token VARCHAR2(1000) NOT NULL,
    invalidated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_TOKEN_BLACKLIST PRIMARY KEY (token)
);

COMMENT ON TABLE TOKEN_BLACKLIST IS 'Invalidated active JWT tokens upon secure logout operations.';

-- Initial BOOTSTRAP seed user
INSERT INTO CLINIC_USER (username, hashed_password, role, is_active)
VALUES ('admin', '$2b$12$3MPGvH0vhglqEwBPUD9Wh.ysD4Vbndi3vCrRBh2mBc.IdQLR9NIVS', 'ADMIN', 1);
-- (Mock pwd: 'mock_user123')
