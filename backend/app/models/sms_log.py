from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class SMSLog(Base, TimestampMixin):
    """
    短信验证码发送与核验流水日志表 (sms_logs)
    用于记录验证码生成、三方网关调用入参出参、防刷频控及核验状态存证
    """
    __tablename__ = "sms_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="短信日志流水唯一ID (UUID)")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True, comment="接收手机号 (11位大陆手机号)")
    code: Mapped[str] = mapped_column(String(10), nullable=False, comment="6位数字验证码")
    scene: Mapped[str] = mapped_column(String(32), default="login", comment="业务场景 (login: 注册/登录, auth: 授权核身, bind: 换绑)")
    status: Mapped[str] = mapped_column(String(20), default="sent", index=True, comment="状态 (sent: 已发送未核验, verified: 已核验成功, failed: 发送失败, expired: 已过期)")
    provider: Mapped[str] = mapped_column(String(32), default="mock", comment="短信通道提供方 (mock / http / aliyun / tencent / weifengqi)")
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="客户端发起 IP 地址 (用于频控防刷)")
    
    # 三方网关请求与响应报文存证
    request_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="发送给三方短信网关的请求报文")
    response_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="三方短信网关返回的响应报文")
    error_message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="发送或校验失败错误信息")

    expire_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, comment="验证码失效时间戳")
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="验证码成功核验时间戳")

    __table_args__ = (
        Index("ix_sms_logs_phone_scene_status", "phone", "scene", "status"),
        {"comment": "短信验证码发送与核验存证流水表"}
    )
