import uuid
from typing import Optional
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class AdminUser(Base, TimestampMixin):
    """
    管理后台管理员与角色权限表
    """
    __tablename__ = "admin_users"
    __table_args__ = {"comment": "管理后台管理员账号与RBAC角色权限表"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="管理员唯一标识 UID"
    )
    username: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="管理员登录账号（如 admin, operation）"
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), 
        nullable=False,
        comment="管理员密码哈希值（PBKDF2-HMAC-SHA256）"
    )
    real_name: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="管理员真实姓名/工号显示名"
    )
    role: Mapped[str] = mapped_column(
        String(30), 
        default="operation", 
        nullable=False,
        comment="角色权限: super_admin(超级管理员) / operation(运营主管) / support(客服) / finance(财务)"
    )
    status: Mapped[str] = mapped_column(
        String(20), 
        default="active", 
        nullable=False,
        comment="账号状态: active(正常启用) / disabled(已禁用)"
    )
    last_login_at: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="最后一次登录时间戳字符串"
    )
