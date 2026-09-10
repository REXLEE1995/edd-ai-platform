from typing import Optional, List
from pydantic import BaseModel

class LoginWithPhoneRequest(BaseModel):
    phone: str
    code: Optional[str] = "123456" # 验证码
    sms_token: Optional[str] = None # 享畅通业务防刷防重放凭据
    password: Optional[str] = None

class RegisterWithPhoneRequest(BaseModel):
    phone: str
    code: str
    sms_token: Optional[str] = None
    password: Optional[str] = None
    company_name: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    phone: str
    new_password: str
    code: str
    sms_token: Optional[str] = None

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool = False
    message: Optional[str] = "登录成功"
    user: Optional[dict] = None

class UserInfoSchema(BaseModel):
    id: str
    phone: str
    company_name: Optional[str] = None
    credit_code: Optional[str] = None
    balance_quota: int
    total_recharge_quota: int
    total_consumed_quota: int
    total_gifted_quota: int
    status: str
    tags: Optional[List[str]] = []
    created_at: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    credit_code: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    new_password: str
    code: Optional[str] = None       # 短信验证码 (选填，若填写则进行短信验证)
    sms_token: Optional[str] = None  # 短信凭据

class AdminInfoSchema(BaseModel):
    id: str
    username: str
    real_name: str
    role: str
    status: str
