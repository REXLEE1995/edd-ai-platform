import uuid
from typing import Optional, List
from sqlalchemy import String, Integer, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class User(Base, TimestampMixin):
    """
    前台注册企业/个人用户表
    """
    __tablename__ = "users"
    __table_args__ = {"comment": "前台注册用户表（包含额度资产、认证企业与状态）"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="用户唯一标识 UID"
    )
    phone: Mapped[str] = mapped_column(
        String(20), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="注册手机号（主登录账号）"
    )
    hashed_password: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True,
        comment="密码哈希值（PBKDF2-HMAC-SHA256）"
    )
    wechat_openid: Mapped[Optional[str]] = mapped_column(
        String(64), 
        unique=True, 
        index=True, 
        nullable=True,
        comment="微信 OpenID（微信扫码授权绑定）"
    )
    wechat_nickname: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        comment="微信昵称"
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(500), 
        nullable=True,
        comment="用户头像图片地址"
    )
    
    # 企业主体信息
    company_name: Mapped[Optional[str]] = mapped_column(
        String(200), 
        nullable=True,
        comment="实名认证/所属企业全称"
    )
    credit_code: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="企业统一社会信用代码 (18位)"
    )
    
    # 额度与资产核心字段 (整数次数)
    balance_quota: Mapped[int] = mapped_column(
        Integer, 
        default=1, 
        nullable=False,
        comment="当前可用尽调额度余额 (次，新用户首次注册登录默认赠送 1 次)"
    )
    total_recharge_quota: Mapped[int] = mapped_column(
        Integer, 
        default=0, 
        nullable=False,
        comment="累计充值额度总点数 (包含线上支付与线下对公转账入账)"
    )
    total_consumed_quota: Mapped[int] = mapped_column(
        Integer, 
        default=0, 
        nullable=False,
        comment="累计已消耗尽调额度点数 (成功生成报告数)"
    )
    total_gifted_quota: Mapped[int] = mapped_column(
        Integer, 
        default=2, 
        nullable=False,
        comment="累计系统赠送额度点数 (注册赠送/活动奖励)"
    )
    
    # 状态与运营标签
    status: Mapped[str] = mapped_column(
        String(20), 
        default="active", 
        nullable=False,
        comment="账号状态: active(正常) / frozen(已冻结，禁止登录和发起尽调)"
    )
    tags: Mapped[Optional[list]] = mapped_column(
        JSON, 
        default=list, 
        nullable=True,
        comment="运营打标列表 JSON (如 [\"VIP客户\", \"金融信贷部\", \"高频客户\"])"
    )
    
    # 注册与登录审计
    register_ip: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="注册时的客户端 IP 地址"
    )
    last_login_ip: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="最后一次登录的客户端 IP 地址"
    )
    last_login_at: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="最后一次登录时间戳字符串"
    )
    remark: Mapped[Optional[str]] = mapped_column(
        String(500), 
        nullable=True,
        comment="运营人员内部跟进备注"
    )
