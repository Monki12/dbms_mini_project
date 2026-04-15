import requests
import json
import time

BASE_URL = "http://localhost:8000/api/patient"

# 1. Request OTP
print("1. Requesting OTP...")
r_req = requests.post(f"{BASE_URL}/auth/request-otp", json={"phone_number": "9876543210"})
print(f"Request OTP Status: {r_req.status_code}")
print(f"Request OTP Response: {r_req.json()}")

assert r_req.status_code == 200

# 2. Verify OTP with wrong code
print("\n2. Verifying OTP with wrong code...")
r_bad = requests.post(f"{BASE_URL}/auth/verify-otp", json={"phone_number": "9876543210", "otp_code": "000000"})
print(f"Verify OTP (Wrong) Status: {r_bad.status_code}")
print(f"Verify OTP (Wrong) Response: {r_bad.json()}")
assert r_bad.status_code == 400
assert "Incorrect OTP" in r_bad.json()["detail"]

# 3. Verify OTP with correct code
print("\n3. Verifying OTP with correct code...")
r_good = requests.post(f"{BASE_URL}/auth/verify-otp", json={"phone_number": "9876543210", "otp_code": "123456"})
print(f"Verify OTP (Good) Status: {r_good.status_code}")
print(f"Verify OTP (Good) Response: {r_good.json()}")
assert r_good.status_code == 200
access_token = r_good.json()["access_token"]
assert access_token is not None

# 4. Use access token
print("\n4. Using access token on authenticated endpoint...")
r_auth = requests.get(f"{BASE_URL}/appointments", headers={"Authorization": f"Bearer {access_token}"})
print(f"Authenticated Request Status: {r_auth.status_code}")
assert r_auth.status_code == 200

# 5. Verify OTP again with same code
print("\n5. Verifying OTP again with same code...")
r_again = requests.post(f"{BASE_URL}/auth/verify-otp", json={"phone_number": "9876543210", "otp_code": "123456"})
print(f"Verify OTP (Again) Status: {r_again.status_code}")
print(f"Verify OTP (Again) Response: {r_again.json()}")
assert r_again.status_code == 400

print("\nALL VERIFICATION CHECKS PASSED!")
