from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func
from app.core.timezone import shanghai_now

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    """
    通用时间戳混入类，自动记录创建时间与更新时间 (全局统一使用 Asia/Shanghai 东八区时间)
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=shanghai_now, 
        server_default=func.now(),
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=shanghai_now, 
        onupdate=shanghai_now, 
        server_default=func.now(),
        comment="最后更新时间"
    )

