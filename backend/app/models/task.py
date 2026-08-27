import uuid
from typing import Optional
from sqlalchemy import String, Integer, JSON, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class DDTask(Base, TimestampMixin):
    """
    进行中与历史尽调任务表（生命周期过程态）
    """
    __tablename__ = "dd_tasks"
    __table_args__ = {"comment": "AI尽调任务表（记录授权状态、清洗步骤与实时思考流日志）"}

    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4()),
        comment="任务唯一主键 ID"
    )
    task_no: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        comment="任务全局业务单号 (如 TSK202608250001)"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        index=True, 
        nullable=False,
        comment="发起任务的用户 UID"
    )
    
    # 目标企业
    company_name: Mapped[str] = mapped_column(
        String(200), 
        index=True, 
        nullable=False,
        comment="目标尽调企业全称"
    )
    credit_code: Mapped[str] = mapped_column(
        String(50), 
        index=True, 
        nullable=False,
        comment="目标企业统一社会信用代码 (18位)"
    )
    legal_person: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="目标企业法定代表人姓名"
    )
    
    # 配置
    scene: Mapped[str] = mapped_column(
        String(50), 
        default="bank_credit", 
        nullable=False,
        comment="尽调场景模板: bank_credit(银行信贷审批) / supply_chain(供应链客户准入) / risk_scan(工商风险速查)"
    )
    dimensions: Mapped[Optional[list]] = mapped_column(
        JSON, 
        default=list, 
        nullable=True,
        comment="勾选的分析研判维度列表 JSON (如 [\"工商司法\", \"税务真实性\", \"多头借贷\", \"资产抵质押\"])"
    )
    auth_mode: Mapped[str] = mapped_column(
        String(30), 
        default="weifengqi_qr", 
        nullable=False,
        comment="微风企授权模式: weifengqi_qr(生成法人授权二维码) / public_only(仅公开工商数据)"
    )
    
    # 任务状态
    status: Mapped[str] = mapped_column(
        String(30), 
        default="waiting_auth", 
        index=True, 
        nullable=False,
        comment="任务生命周期状态: waiting_auth(等待法人授权) / pulling_data(拉取数据中) / ai_analyzing(AI大模型推理中) / completed(已完成) / failed(异常终止) / cancelled(已取消)"
    )
    auth_status: Mapped[str] = mapped_column(
        String(30), 
        default="pending", 
        nullable=False,
        comment="微风企法人授权状态: pending(待签署) / authorized(已授权签署) / expired(已超时)"
    )
    auth_qrcode_url: Mapped[Optional[str]] = mapped_column(
        String(500), 
        nullable=True,
        comment="微风企法人授权专属二维码图片 URL"
    )
    auth_link: Mapped[Optional[str]] = mapped_column(
        String(500), 
        nullable=True,
        comment="微风企法人授权专属移动端 H5 链接"
    )
    
    # AI 实时思考日志列表
    thinking_logs: Mapped[Optional[list]] = mapped_column(
        JSON, 
        default=list, 
        nullable=True,
        comment="AI 智能体实时思考流日志列表 JSON ([{\"time\": \"10:30\", \"content\": \"完成清洗...\"}])"
    )
    
    # 关联生成的报告
    report_id: Mapped[Optional[str]] = mapped_column(
        String(36), 
        nullable=True,
        comment="生成完毕后关联的终态报告资产 ID (DDReport.id)"
    )
    risk_level: Mapped[Optional[str]] = mapped_column(
        String(20), 
        nullable=True,
        comment="最终综合研判风控评级: green(建议准入) / yellow(审慎关注) / red(一票否决)"
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True,
        comment="若任务异常终止时的错误原因详情"
    )
    completed_at: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        comment="任务完成归档时间戳字符串"
    )
