# -*- coding: utf-8 -*-
"""
全局统一时区工具 (Asia/Shanghai, UTC+8)
解决系统在各平台、各数据库间时间慢8小时或时区混淆问题
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")

def shanghai_now(naive: bool = True) -> datetime:
    """
    获取中国标准时间 (Asia/Shanghai, UTC+8) 当前时间
    :param naive: 是否返回无时区信息的 datetime (适用于 MySQL/SQLite DATETIME 字段)
    """
    now = datetime.now(SHANGHAI_TZ)
    return now.replace(tzinfo=None) if naive else now

def format_shanghai_datetime(dt: Optional[datetime] = None, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    格式化为标准东八区日期时间字符串 (如 2026-09-03 10:30:00)
    """
    target = dt or shanghai_now()
    return target.strftime(fmt)

def format_shanghai_iso(dt: Optional[datetime] = None) -> str:
    """
    格式化为 ISO 8601 规范字符串 (明确包含 +08:00 时区偏移，保障前端 Date 正确解析)
    如: 2026-09-03T10:30:00+08:00
    """
    target = dt or shanghai_now(naive=False)
    if target.tzinfo is None:
        target = target.replace(tzinfo=SHANGHAI_TZ)
    return target.isoformat()
