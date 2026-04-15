import requests

BASE_URL = "http://localhost:8000/api/patient"

# Re-authenticate to get a token
r_req = requests.post(f"{BASE_URL}/auth/request-otp", json={"phone_number": "9876543210"})
r_ver = requests.post(f"{BASE_URL}/auth/verify-otp", json={"phone_number": "9876543210", "otp_code": "123456"})
token = r_ver.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

endpoints = [
    "/profile",
    "/appointments",
    "/medical-records",
    "/prescriptions"
]

for ep in endpoints:
    url = f"{BASE_URL}{ep}"
    print(f"Testing {url} ...")
    resp = requests.get(url, headers=headers)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200
    print("Response JSON format ok: ", "data" in resp.json())
    
print("ALL BE-2 CHECKS PASSED")
