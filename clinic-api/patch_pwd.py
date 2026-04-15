import oracledb

conn = oracledb.connect(user='clinic_admin', password='StrongPass#2024', dsn='localhost:1521/XEPDB1')
c = conn.cursor()
hashed = "$2b$12$bhOxQOJFr1gcrA6nh1zJcu8xMYJ3VMj6yp/QME6NGj6twEhhCAyOu"
c.execute("UPDATE CLINIC_USER SET hashed_password = :1 WHERE username = 'admin'", [hashed])
conn.commit()
print("Password updated successfully")
