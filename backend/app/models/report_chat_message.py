import uuid
from typing import Optional
from sqlalchemy import String, Text, Integer, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class ReportChatMessage(Base, TimestampMixin):
    """
    针对指定尽调报告的 AI 交互问答明细表
    """
    __tablename__ = "xyzp_report_chat_messages"
    __table_args__ = (
        Index("idx_report_user_created", "report_id", "user_id", "created_at"),
        {"comment": "针对指定尽调报告的 AI 交互问答明细表"}
    )

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="消息主键 ID"
    )
    report_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("xyzp_reports.id", ondelete="CASCADE"), 
        nullable=False,
        index=True,
        comment="关联的尽调报告 ID"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        nullable=False,
        index=True,
        comment="归属用户 UID (租户/用户数据隔离)"
    )

    role: Mapped[str] = mapped_column(
        String(20), 
        nullable=False, 
        comment="消息角色: 'user'(用户提问) / 'assistant'(AI回答)"
    )
    query_type: Mapped[str] = mapped_column(
        String(30), 
        default="DEFAULT",
        comment="查询类型: 'CATALOG_SPECIFIC'(目录定向) / 'DEFAULT'(自由总结)"
    )
    
    catalog_key: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        comment="点击触发的目录标识 (如: 'section_2_3')"
    )
    catalog_name: Mapped[Optional[str]] = mapped_column(
        String(200), 
        nullable=True,
        comment="章节名称 (用于前端展示回显)"
    )

    content: Mapped[str] = mapped_column(
        Text, 
        nullable=False,
        comment="消息内容 (用户提问文本 或 AI 生成的 Markdown 全文)"
    )
    tokens_used: Mapped[int] = mapped_column(
        Integer, 
        default=0,
        comment="本次交互消耗的 Token 计数 (便于配额审计)"
    )
