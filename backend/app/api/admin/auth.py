from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.admin import AdminUser
from app.schemas.auth import AdminLoginRequest, TokenResponse, AdminInfoSchema
from app.api.deps import get_current_admin

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
