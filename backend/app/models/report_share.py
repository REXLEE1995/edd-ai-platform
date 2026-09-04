import uuid
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class ReportShare(Base, TimestampMixin):
    """
    报告加密分享记录表，支持 6 位密码保护、15 天有效期绑定与访问管理
    """
    __tablename__ = "report_shares"
    __table_args__ = {"comment": "报告加密分享记录表（存储 6 位访问密码、15 天有效期与访问计数）"}

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="分享记录主键 ID"
    )
    share_code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        index=True,
        nullable=False,
        comment="对外公开访问的分享唯一代码 (如 sh_9a8b7c6d)"
    )
    report_id: Mapped[str] = mapped_column(
        String(36),
        index=True,
        nullable=False,
        comment="被分享的尽调报告 ID (XYZPReport.id)"
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        index=True,
        nullable=False,
        comment="创建分享的用户 UID"
    )
    company_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="目标尽调企业全称"
    )
    credit_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="目标企业统一社会信用代码"
    )
    access_code: Mapped[str] = mapped_column(
        String(6),
        nullable=False,
        comment="6 位数字访问密码 (PIN)"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        nullable=False,
        comment="分享状态: active(生效中) / revoked(已手动撤销) / expired(已过期)"
    )
    expire_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="分享链接失效时间 (为 None 表示永久有效，或指定天数过期)"
    )
    view_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="累计被外部成功解锁查阅的次数"
    )
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="最近一次被成功解锁的时间"
    )

    @property
    def is_expired(self) -> bool:
        """判断该分享链接是否已过期"""
        if self.expire_at is None:
            return False
        return datetime.now() > self.expire_at

    @property
    def remaining_days(self) -> Optional[int]:
        """计算该分享链接剩余有效天数"""
        if self.expire_at is None:
            return None
        diff = self.expire_at - datetime.now()
        return max(0, diff.days)

    @property
    def expires_in_text(self) -> str:
        """格式化展示分享有效期限文案"""
        if self.expire_at is None:
            return "永久有效 (不过期)"
        if self.is_expired:
            return f"已失效 (失效于 {self.expire_at.strftime('%Y-%m-%d %H:%M')})"
        return f"有效期至 {self.expire_at.strftime('%Y-%m-%d %H:%M')} (剩余 {self.remaining_days} 天)"
