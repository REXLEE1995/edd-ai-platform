import uuid
from typing import Optional
from datetime import datetime, timedelta
from app.core.timezone import shanghai_now
from sqlalchemy import String, Integer, JSON, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class XYZPReport(Base, TimestampMixin):
    """
    尽调报告终态资产模型，支持三栏阅读与双向底稿溯源
    """
    __tablename__ = "xyzp_reports"
    __table_args__ = {"comment": "尽调报告终态资产表（存储完整看板内容与微风企底稿溯源库）"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="报告资产主键 ID"
    )
    report_no: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="报告全局业务编号 (如 RPT202608250001)"
    )
    task_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="生成该报告的源尽调任务 ID"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="归属用户 UID"
    )
    
    company_name: Mapped[str] = mapped_column(
        String(200), 
        index=True, 
        nullable=False,
        comment="目标尽调企业全称"
    )
    credit_code: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="目标企业统一社会信用代码"
    )
    legal_person: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="法定代表人"
    )
    
    # 研判评级与结论
    risk_level: Mapped[str] = mapped_column(
        String(20), 
        default="green", 
        nullable=False,
        comment="风控准入评级: green(建议准入) / yellow(审慎关注) / red(一票否决)"
    )
    score: Mapped[int] = mapped_column(
        Integer, 
        default=85, 
        nullable=False,
        comment="综合风控量化评分 (0-100)"
    )
    suggested_quota_min: Mapped[int] = mapped_column(
        Integer, 
        default=300,
        comment="AI 测算建议授信下限额度 (万元)"
    )
    suggested_quota_max: Mapped[int] = mapped_column(
        Integer, 
        default=500,
        comment="AI 测算建议授信上限额度 (万元)"
    )
    summary_ai_comment: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True,
        comment="AI 核心风控综述与研判依据"
    )
    
    # 报告完整 JSON 内容
    content_json: Mapped[dict] = mapped_column(
        JSON, 
        nullable=False,
        comment="报告完整看板 JSON (工商基础面、红黄牌列表、ECharts近24个月税务开票趋势、前五大客户集中度)"
    )
    
    # 双向溯源底稿库
    raw_sources_json: Mapped[dict] = mapped_column(
        JSON, 
        default=dict, 
        nullable=False,
        comment="微风企税务纳税申报表、发票抽样明细与多头借贷征信原始申报底稿溯源库 JSON"
    )

    # 关联物理文件存储
    storage_file_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        comment="关联的文件服务记录 ID (TaskFile.id)"
    )
    pdf_file_path: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="报告 PDF 本地持久化文件路径"
    )

    # 15 天有效期机制
    expired_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="报告失效时间 (自生成起 15 天有效期)"
    )

    @property
    def effective_expired_at(self) -> datetime:
        if self.expired_at:
            return self.expired_at
        base_time = self.created_at or shanghai_now()
        return base_time + timedelta(days=15)

    @property
    def is_expired(self) -> bool:
        return shanghai_now() > self.effective_expired_at

    @property
    def remaining_days(self) -> int:
        now = shanghai_now()
        diff = self.effective_expired_at - now
        if diff.total_seconds() <= 0:
            return 0
        return max(1, int(diff.total_seconds() // 86400) + 1)

# 兼容平滑过渡别名
DDReport = XYZPReport

