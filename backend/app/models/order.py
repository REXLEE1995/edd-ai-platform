import uuid
from typing import Optional
from sqlalchemy import String, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class Order(Base, TimestampMixin):
    """
    额度加油包充值订单表
    """
    __tablename__ = "orders"
    __table_args__ = {"comment": "额度充值订单表（微信/支付宝线上支付与线下对公记录）"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="订单唯一主键 ID"
    )
    order_no: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="平台订单业务单号 (如 ORD202608250001)"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="下单用户 UID"
    )
    user_phone: Mapped[str] = mapped_column(
        String(20), 
        nullable=False,
        comment="下单用户手机号"
    )
    
    package_id: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="购买套餐 ID (如 pack_single, pack_10, pack_50)"
    )
    package_name: Mapped[str] = mapped_column(
        String(100), 
        nullable=False,
        comment="套餐显示名称 (如 标准加油包 10次)"
    )
    amount: Mapped[float] = mapped_column(
        Float, 
        nullable=False,
        comment="实际应付金额 (元，如 880.00)"
    )
    quota_points: Mapped[int] = mapped_column(
        Integer, 
        nullable=False,
        comment="购买充值的尽调额度点数 (次，如 10)"
    )
    
    pay_type: Mapped[str] = mapped_column(
        String(20), 
        default="wechat", 
        nullable=False,
        comment="支付渠道: wechat(微信扫码支付) / alipay(支付宝) / offline(对公转账)"
    )
    status: Mapped[str] = mapped_column(
        String(20), 
        default="pending", 
        nullable=False,
        comment="支付状态: pending(待支付) / paid(已支付) / cancelled(已取消) / refunded(已退款)"
    )
    third_trade_no: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        comment="第三方支付网关流水号 (微信/支付宝交易单号)"
    )
    paid_at: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="支付成功完成时间戳字符串"
    )

class Invoice(Base, TimestampMixin):
    """
    用户增值税发票开具申请表
    """
    __tablename__ = "invoices"
    __table_args__ = {"comment": "增值税普通发票与专用发票开具申请表"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="发票申请主键 ID"
    )
    invoice_no: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="发票业务申请单号"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="申请用户 UID"
    )
    order_id: Mapped[str] = mapped_column(
        String(36), 
        nullable=False,
        comment="关联的充值支付订单 ID"
    )
    
    title: Mapped[str] = mapped_column(
        String(200), 
        nullable=False,
        comment="发票抬头（企业全称或个人姓名）"
    )
    tax_number: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="纳税人识别号/统一社会信用代码"
    )
    amount: Mapped[float] = mapped_column(
        Float, 
        nullable=False,
        comment="开票金额 (元)"
    )
    invoice_type: Mapped[str] = mapped_column(
        String(20), 
        default="vat_normal", 
        nullable=False,
        comment="发票类型: vat_normal(增值税电子普票) / vat_special(增值税专用发票)"
    )
    email: Mapped[str] = mapped_column(
        String(100), 
        nullable=False,
        comment="接收电子发票 PDF 的邮箱地址"
    )
    status: Mapped[str] = mapped_column(
        String(20), 
        default="pending", 
        nullable=False,
        comment="开票状态: pending(待开票) / issued(已开具并发送) / rejected(已驳回)"
    )
    pdf_url: Mapped[Optional[str]] = mapped_column(
        String(500), 
        nullable=True,
        comment="开具成功的电子发票 PDF 下载地址"
    )
