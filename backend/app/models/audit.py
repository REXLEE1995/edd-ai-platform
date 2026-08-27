import uuid
from typing import Optional
from sqlalchemy import String, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class AdminAuditLog(Base, TimestampMixin):
    """
    全站管理后台高危操作审计日志表
    """
    __tablename__ = "admin_audit_logs"
    __table_args__ = {"comment": "全站管理员高危操作审计日志表（防篡改、安全合规追溯）"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="审计日志唯一主键 ID"
    )
    admin_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="操作管理员 UID"
    )
    admin_name: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="操作管理员姓名"
    )
    module: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="功能模块: users(用户管理) / quota(额度管控) / orders(订单审核) / system(系统配置)"
    )
    action: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="执行动作: adjust_quota(人工调额) / freeze_user(冻结用户) / unfreeze_user(解冻用户) / reset_password(重置密码) / export_data(导出报表)"
    )
    target_id: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        comment="受影响目标对象唯一 ID (如目标用户 UID 或 订单单号)"
    )
    target_name: Mapped[Optional[str]] = mapped_column(
        String(200), 
        nullable=True,
        comment="受影响目标对象名称/手机号"
    )
    details: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        default=dict, 
        nullable=True,
        comment="操作详情与变动前后 Diff 镜像 JSON (如 {\"before\": 2, \"after\": 12, \"reason\": \"对公打款\"})"
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="管理员发起操作时的客户端 IP 地址"
    )
