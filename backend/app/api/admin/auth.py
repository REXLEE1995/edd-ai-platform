from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, decode_access_token
from app.models.admin import AdminUser
from app.schemas.auth import AdminLoginRequest, TokenResponse, AdminInfoSchema
from app.api.deps import get_current_admin, security

router = APIRouter(prefix="/auth", tags=["后台管理员认证"])

@router.post("/login", response_model=TokenResponse)
async def admin_login(req: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    管理员账号密码登录
    """
    result = await db.execute(select(AdminUser).where(AdminUser.username == req.username))
    admin = result.scalar_one_or_none()
    if not admin or not verify_password(req.password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    
    if admin.status != "active":
        raise HTTPException(status_code=403, detail="该管理员账号已被禁用")
    
    token = create_access_token(subject=admin.id, token_type="admin")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": admin.id,
            "username": admin.username,
            "real_name": admin.real_name,
            "role": admin.role,
            "status": admin.status
        }
    }

@router.get("/me", response_model=AdminInfoSchema)
async def get_admin_profile(admin: AdminUser = Depends(get_current_admin)):
    """
    获取当前登录管理员信息
    """
    return AdminInfoSchema(
        id=admin.id,
        username=admin.username,
        real_name=admin.real_name,
        role=admin.role,
        status=admin.status
    )

@router.post("/logout")
async def admin_logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    管理员退出登录接口 (支持安全登出与清理前端凭证)
    """
    username = None
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and payload.get("type") == "admin":
            admin_id = payload.get("sub")
            result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
            admin = result.scalar_one_or_none()
            if admin:
                username = admin.username

    return {
        "code": 0,
        "message": "已成功退出管理员登录",
        "data": {
            "username": username or "admin"
        }
    }
