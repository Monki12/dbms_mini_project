from pydantic import BaseModel, constr

class OtpRequest(BaseModel):
    phone_number: constr(min_length=10, max_length=10, pattern=r'^\d{10}$')

class OtpVerify(BaseModel):
    phone_number: constr(min_length=10, max_length=10, pattern=r'^\d{10}$')
    otp_code: constr(min_length=6, max_length=6, pattern=r'^\d{6}$')

class RefreshTokenRequest(BaseModel):
    refresh_token: str
