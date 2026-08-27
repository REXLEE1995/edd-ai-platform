from typing import Optional, List
from pydantic import BaseModel

class UserFilterQuery(BaseModel):
    keyword: Optional[str] = None # 手机号/企业名称/UID
    status: Optional[str] = None # active / frozen
    min_quota: Optional[int] = None
    max_quota: Optional[int] = None
    page: int = 1
    page_size: int = 10

class UserStatusUpdateRequest(BaseModel):
    status: str # active / frozen
    remark: Optional[str] = None

class UserTagsUpdateRequest(BaseModel):
    tags: List[str]

class UserResetPasswordRequest(BaseModel):
    new_password: Optional[str] = "123456"
