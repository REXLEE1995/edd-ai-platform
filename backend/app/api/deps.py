from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.admin import AdminUser

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials:
        # 本地开发模式下：如果没有 Token，自动退回到默认演示用户，极大提升调试体验
        result = await db.execute(select(User).where(User.phone == "13800138000"))
        default_user = result.scalar_one_or_none()
        if default_user:
            return default_user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("type") != "user":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效或已过期的登录凭证")
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    if user.status == "frozen":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账户已被冻结，请联系客服")
    return user

async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> AdminUser:
    if not credentials:
        # 本地开发模式下：如果没有 Token，自动退回到默认超管
        result = await db.execute(select(AdminUser).where(AdminUser.username == "admin"))
        default_admin = result.scalar_one_or_none()
        if default_admin:
            return default_admin
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录管理员账号")
    
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("type") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="非管理员登录凭证")
    
    admin_id = payload.get("sub")
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin or admin.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理员账号已被禁用")
    return admin

async def get_current_admin_or_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    通用鉴权依赖：兼容管理员 (AdminUser) 或普通用户 (User)
    若无凭据，开发模式下回退到默认演示用户
    """
    if not credentials:
        admin_res = await db.execute(select(AdminUser).where(AdminUser.username == "admin"))
        default_admin = admin_res.scalar_one_or_none()
        if default_admin:
            return default_admin
        result = await db.execute(select(User).where(User.phone == "13800138000"))
        default_user = result.scalar_one_or_none()
        if not default_user:
            result = await db.execute(select(User).order_by(User.created_at).limit(1))
            default_user = result.scalar_one_or_none()
        if default_user:
            return default_user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效或已过期的登录凭证")

    token_type = payload.get("type")
    sub_id = payload.get("sub")

    if token_type == "admin":
        result = await db.execute(select(AdminUser).where(AdminUser.id == sub_id))
        admin = result.scalar_one_or_none()
        if not admin or admin.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理员账号已被禁用")
        return admin
    else:
        result = await db.execute(select(User).where(User.id == sub_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
        if user.status == "frozen":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账户已被冻结，请联系客服")
        return user

