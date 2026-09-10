from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, Index, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin
from app.core.timezone import shanghai_now

class SMSLog(Base, TimestampMixin):
    """
    短信验证码发送与核验流水日志表 (sms_logs)
    用于记录验证码生成、短信内容、是否发送成功、备注(失败原因/三方真实原因/挡板拦截)、请求时间、响应时间、耗时及核验存证
    """
    __tablename__ = "sms_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="短信日志流水唯一ID (UUID)")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True, comment="接收手机号 (11位大陆手机号)")
    code: Mapped[str] = mapped_column(String(10), nullable=False, comment="6位数字验证码")
    scene: Mapped[str] = mapped_column(String(32), default="login", comment="业务场景 (login: 注册/登录, auth: 授权核身, bind: 换绑, register: 注册, change_pwd: 改密, reset_pwd: 找回密码)")
    status: Mapped[str] = mapped_column(String(20), default="sent", index=True, comment="状态 (sent: 已发送未核验, verified: 已核验成功, failed: 发送失败, expired: 已过期)")
    is_success: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否发送成功 (True: 成功/挡板成功, False: 失败)")
    provider: Mapped[str] = mapped_column(String(32), default="mock", comment="短信通道提供方 (xct / mock / generic_http)")
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="客户端发起 IP 地址 (用于频控防刷)")
    
    # 完整短信内容与审计备注
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="短信完整发送内容 (包含【签名】与报备模版)")
    remark: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注 (失败原因、三方的真实原因 或 挡板拦截说明)")
    
    # 请求时间、响应时间与耗时
    request_time: Mapped[datetime] = mapped_column(DateTime, default=shanghai_now, comment="请求发起时间")
    response_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="三方网关/挡板响应时间")
    use_time_ms: Mapped[int] = mapped_column(Integer, default=0, comment="调用耗时(毫秒)")

    # 三方网关原始请求与响应报文存证
    request_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="发送给三方短信网关的请求报文")
    response_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="三方短信网关返回的响应报文")
    error_message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="发送或校验失败错误信息")

    expire_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, comment="验证码失效时间戳")
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="验证码成功核验时间戳")

    __table_args__ = (
        Index("ix_sms_logs_phone_scene_status", "phone", "scene", "status"),
        Index("ix_sms_logs_request_time", "request_time"),
        {"comment": "短信验证码发送与核验存证流水表"}
    )
