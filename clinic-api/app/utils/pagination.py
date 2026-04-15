import math
import oracledb

def paginate_query(conn: oracledb.Connection, base_sql: str, params: dict, page: int, limit: int) -> dict:
    """
    Standardizes generic Oracle 12c+ Offset fetch mapping. 
    Accepts arbitrary SQL and correctly binds bounding boxes globally.
    """
    count_sql = f"SELECT COUNT(*) FROM ({base_sql})"
    
    with conn.cursor() as cursor:
        cursor.execute(count_sql, params)
        total = cursor.fetchone()[0]
    
    offset = (page - 1) * limit
    paginated_sql = f"{base_sql} OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"
    
    with conn.cursor() as cursor:
        cursor.execute(paginated_sql, params)
        
        # Construct exact identical dictionary mapping to standardized endpoint shapes
        if cursor.description:
            columns = [col[0].lower() for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        else:
            rows = []
            
    return {
        "data": rows,
        "meta": {
            "page": page,
            "total": total,
            "total_pages": math.ceil(total / limit) if limit > 0 else 1
        }
    }
