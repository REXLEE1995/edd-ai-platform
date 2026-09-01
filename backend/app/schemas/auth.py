from typing import Optional, List
from pydantic import BaseModel

class LoginWithPhoneRequest(BaseModel):
    phone: str
    code: Optional[str] = "123456" # 默认免密测试验证码
    password: Optional[str] = None

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

class AdminInfoSchema(BaseModel):
    id: str
    username: str
    real_name: str
    role: str
    status: str
