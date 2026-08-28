import uuid
from typing import Optional
from sqlalchemy import String, Integer, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class SysThirdPartyApi(Base, TimestampMixin):
    """
    三方数据接口字典表 (动态维护三方接口端点、认证配置与生命周期模式)
    """
    __tablename__ = "sys_third_party_apis"
    __table_args__ = {"comment": "三方数据源与外部接口字典配置表"}

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="主键 ID"
    )
    api_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
        comment="接口全局唯一代码 (如 WFQ_AUTH, WFQ_REPORT_STATUS, WFQ_REPORT_PDF_URL, IC_ENTERPRISE, RISK_RADAR)"
    )
    api_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="接口名称 (如 微风企获取授权链接接口)"
    )
    provider_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="所属服务商/供应商 (如 weifengqi / enterprise_ic / risk_radar)"
    )
    call_mode: Mapped[str] = mapped_column(
        String(30),
        default="mock",
        nullable=False,
        comment="调用模式: mock(本地模拟网关) / http(真实网络请求)"
    )
    endpoint_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="接口请求端点完整 URL"
    )
    http_method: Mapped[str] = mapped_column(
        String(10),
        default="POST",
        nullable=False,
        comment="HTTP 请求方式: GET / POST"
    )
    lifecycle_type: Mapped[str] = mapped_column(
        String(30),
        default="interactive_interrupt",
        nullable=False,
        comment="取数生命周期类型: direct_fetch(直接一次性拉取) / interactive_interrupt(断层中断-需要用户授权)"
    )
    auth_params: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
        comment="认证与固定参数 (token, appKey, appSecret, prodId 等)"
    )
    timeout_seconds: Mapped[int] = mapped_column(
        Integer,
        default=15,
        nullable=False,
        comment="超时时间 (秒)"
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否启用状态"
    )
    remark: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="备注说明"
    )
