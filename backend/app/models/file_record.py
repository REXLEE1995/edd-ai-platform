import uuid
from typing import Optional
from sqlalchemy import String, Integer, BigInteger, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class TaskFile(Base, TimestampMixin):
    """
    尽调任务文件存证与物理存储记录表
    """
    __tablename__ = "xyzp_task_files"
    __table_args__ = {"comment": "任务文件与报告PDF物理存储存证记录表"}

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="文件唯一主键 ID (UUID)"
    )
    task_id: Mapped[str] = mapped_column(
        String(36),
        index=True,
        nullable=False,
        comment="关联的尽调任务 ID"
    )
    report_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        index=True,
        nullable=True,
        comment="关联的尽调报告 ID"
    )
    file_type: Mapped[str] = mapped_column(
        String(50),
        default="wfq_preloan_pdf",
        nullable=False,
        comment="文件业务类型: wfq_preloan_pdf(微风企贷前报告PDF) / audit_proof(存证底稿) / attachment(用户附件)"
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="原始文件名 (如 微风企贷前报告12345678.pdf)"
    )
    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="本地文件存储绝对路径或相对路径"
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
        comment="文件大小 (字节 Bytes)"
    )
    file_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="文件 SHA-256 哈希校验值 (防篡改数字存证)"
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        default="application/pdf",
        nullable=False,
        comment="文件 MIME 类型"
    )
    source_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        comment="下载来源的远程 URL 地址 (如微风企 reportPdfUrl)"
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="stored",
        nullable=False,
        comment="文件状态: stored(已持久化存储) / failed(下载存储失败)"
    )
