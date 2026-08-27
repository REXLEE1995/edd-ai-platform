import uuid
from typing import Optional
from sqlalchemy import String, Integer, DateTime, func, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class QuotaTransaction(Base, TimestampMixin):
    """
    全生命周期额度流水明细表 (只追加不可修改，财务对账核心凭证)
    """
    __tablename__ = "quota_transactions"
    __table_args__ = {"comment": "全生命周期额度变动流水台账表（不可篡改，支持财务对账）"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="流水唯一主键 ID"
    )
    tx_no: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="全局唯一流水业务单号 (如 QTX202608250001)"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="关联用户 UID"
    )
    user_phone: Mapped[str] = mapped_column(
        String(20), 
        index=True, 
        nullable=False,
        comment="用户手机号（冗余字段便于快速检索）"
    )
    user_company: Mapped[Optional[str]] = mapped_column(
        String(200), 
        nullable=True,
        comment="用户企业主体名称"
    )
    
    # 变动类型
    change_type: Mapped[str] = mapped_column(
        String(30), 
        index=True, 
        nullable=False,
        comment="变动业务类型: consume(尽调扣除) / recharge(线上充值) / gift(系统赠送) / refund(失败返还) / manual_add(线下对公调额) / manual_sub(人工核减)"
    )
    amount: Mapped[int] = mapped_column(
        Integer, 
        nullable=False,
        comment="变动点数 (增加为正数如+10，扣除为负数如-1)"
    )
    balance_before: Mapped[int] = mapped_column(
        Integer, 
        nullable=False,
        comment="变动前账户基准余额 (次)"
    )
    balance_after: Mapped[int] = mapped_column(
        Integer, 
        nullable=False,
        comment="变动后账户最终余额 (次)"
    )
    
    # 关联单据
    ref_type: Mapped[str] = mapped_column(
        String(30), 
        default="task", 
        nullable=False,
        comment="关联业务单据类型: task(尽调任务) / order(充值订单) / adjust(调额工单) / system(系统事件)"
    )
    ref_id: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        comment="关联业务源单据编号 (如任务ID、订单号、对公工单号)"
    )
    
    # 操作人
    operator_type: Mapped[str] = mapped_column(
        String(20), 
        default="system", 
        nullable=False,
        comment="操作主体类型: system(系统自动) / user(用户自助) / admin(管理员操作)"
    )
    operator_id: Mapped[Optional[str]] = mapped_column(
        String(36), 
        nullable=True,
        comment="操作人唯一 ID (管理员 UID 或 用户 UID)"
    )
    operator_name: Mapped[Optional[str]] = mapped_column(
        String(50), 
        default="SYSTEM", 
        nullable=True,
        comment="操作人名称/渠道显示名 (如: SYSTEM、微信扫码、Admin-张运营)"
    )
    
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="触发操作时的客户端 IP 地址"
    )
    remark: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True,
        comment="流水详细备注说明与凭证摘要"
    )

class QuotaAdjustRecord(Base, TimestampMixin):
    """
    管理员人工调额审核工单与凭据记录表
    """
    __tablename__ = "quota_adjust_records"
    __table_args__ = {"comment": "管理员人工调额工单与凭证审计表"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="调额工单主键 ID"
    )
    adjust_no: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="调额工单编号 (如 ADJ202608250001)"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="被调额的目标用户 UID"
    )
    admin_id: Mapped[str] = mapped_column(
        String(36), 
        nullable=False,
        comment="经办管理员 UID"
    )
    admin_name: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="经办管理员姓名"
    )
    
    adjust_type: Mapped[str] = mapped_column(
        String(20), 
        nullable=False,
        comment="调额方式: add(增加) / sub(核减) / set(重置为指定值)"
    )
    adjust_amount: Mapped[int] = mapped_column(
        Integer, 
        nullable=False,
        comment="本次调额变动数值 (点数)"
    )
    
    # 原因分类
    reason_category: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="调额原因分类: offline_payment(线下对公打款) / business_gift(商务大客户赠送) / customer_compensation(客诉补偿) / manual_correction(误操作核减) / internal_test(内部测试)"
    )
    proof_no: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        comment="关联银行打款流水号/合同编号/工单号凭证"
    )
    proof_image_url: Mapped[Optional[str]] = mapped_column(
        String(500), 
        nullable=True,
        comment="上传的打款水单凭证截图附件 URL"
    )
    remark: Mapped[str] = mapped_column(
        Text, 
        nullable=False,
        comment="调额详细背景说明（不少于5字）"
    )
