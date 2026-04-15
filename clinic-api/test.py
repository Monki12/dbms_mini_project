import requests

try:
    print(requests.post("http://localhost:8000/api/patient/auth/request-otp", json={"phone_number": "9876543210"}, timeout=5).text)
except Exception as e:
    print("Error:", e)
