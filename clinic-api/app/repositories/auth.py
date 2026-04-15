import oracledb

def get_user_by_username(conn: oracledb.Connection, username: str) -> dict:
    """Fetch structured security rows bypassing the core procedural abstraction safely."""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT user_id, username, hashed_password, role, linked_entity_id, is_active 
            FROM CLINIC_USER 
            WHERE username = :1 AND is_active = 1
        """, [username])
        
        if cursor.description:
            columns = [col[0].lower() for col in cursor.description]
            row = cursor.fetchone()
            return dict(zip(columns, row)) if row else None
        return None

def store_token_blacklist(conn: oracledb.Connection, token: str):
    """Irreversibly sever authentication lifecycles before exp"""
    with conn.cursor() as cursor:
        cursor.execute("INSERT INTO TOKEN_BLACKLIST (token) VALUES (:1)", [token])
