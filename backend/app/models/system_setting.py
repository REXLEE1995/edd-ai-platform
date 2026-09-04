from typing import Optional, Dict, Any
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class SystemSetting(Base, TimestampMixin):
    """
    系统全局动态业务配置表 (Key-Value 存储，支持运营热更新与多副本同步)
    """
    __tablename__ = "system_settings"
    __table_args__ = {"comment": "系统全局动态业务配置表"}

    key: Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
        comment="配置键名 (如 ai_config, sms_config, billing_config 等)"
    )
    value: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="配置内容 (结构化 JSON 字典)"
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="配置项中文说明"
    )
