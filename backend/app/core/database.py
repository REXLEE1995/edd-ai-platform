import os
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.base import Base
from app.models.user import User
from app.models.admin import AdminUser
from app.models.quota import QuotaTransaction
from app.models.task import DDTask
from app.models.report import DDReport
from app.models.order import Order
from app.models.file_record import TaskFile
from app.models.third_party_api import SysThirdPartyApi
from app.models.report_share import ReportShare
from app.models.sms_log import SMSLog

# 确保 SQLite 本地数据目录存在并使用绝对路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "edd_v6.db")

db_url = settings.DATABASE_URL

# 创建异步引擎 (自适应适配 SQLite 本地单线程与 MySQL / PostgreSQL 生产级连接池)
engine_kwargs = {
    "echo": settings.DB_ECHO,
    "future": True,
}

if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # 针对 MySQL / PostgreSQL 等生产级关系型数据库的连接池保活配置
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 3600  # 防止 MySQL wait_timeout 超时断连
    engine_kwargs["pool_pre_ping"] = True # 查询前自动探测连接有效性

engine = create_async_engine(
    db_url,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

from sqlalchemy import text

async def init_db():
    """
    初始化数据库表结构与预置种子数据 (仅在首次启动时执行)
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # SQLite 字段动态自愈补齐 (避免模型新增字段但在旧库中未执行 ALTER TABLE)
        if "sqlite" in db_url:
            try:
                res = await conn.execute(text("PRAGMA table_info(dd_reports)"))
                cols = [row[1] for row in res.fetchall()]
                if "expired_at" not in cols:
                    await conn.execute(text("ALTER TABLE dd_reports ADD COLUMN expired_at DATETIME"))
            except Exception as e:
                print(f"[DB Auto-Migration] dd_reports migration note: {e}")
    
    async with AsyncSessionLocal() as session:
        # 1. 检查并创建超管账号
        result = await session.execute(select(AdminUser).where(AdminUser.username == "admin"))
        admin = result.scalar_one_or_none()
        if not admin:
            super_admin = AdminUser(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                real_name="超级管理员",
                role="super_admin",
                status="active"
            )
            op_admin = AdminUser(
                username="operation",
                hashed_password=get_password_hash("admin123"),
                real_name="张运营",
                role="operation",
                status="active"
            )
            session.add_all([super_admin, op_admin])
            await session.commit()
            print(">>> [DB Init] 预置管理后台账号: admin / admin123")

        # 1.1 检查并初始化三方接口字典表 (SysThirdPartyApi)
        res_api = await session.execute(select(SysThirdPartyApi).limit(1))
        if not res_api.scalar_one_or_none():
            default_apis = [
                SysThirdPartyApi(
                    id="api-wfq-auth",
                    api_code="WFQ_AUTH",
                    api_name="微风企获取法人授权链接接口",
                    provider_name="weifengqi",
                    call_mode="http",
                    endpoint_url="https://honeycomb-test.sylinker.com/model/wfq/auth",
                    http_method="POST",
                    lifecycle_type="interactive_interrupt",
                    auth_params={"prodId": "WFQ_AUTH", "token": "J0xmJ1ux1eHrkINt"},
                    timeout_seconds=15,
                    is_enabled=True,
                    remark="获取企业专属 H5 实名数据授权页面 URL 及微风企外部单号"
                ),
                SysThirdPartyApi(
                    id="api-wfq-pdf",
                    api_code="WFQ_REPORT_PDF_URL",
                    api_name="微风企贷前报告 PDF 下载地址获取接口",
                    provider_name="weifengqi",
                    call_mode="http",
                    endpoint_url="https://honeycomb-test.sylinker.com/model/wfq/loanBeforeReportPdf",
                    http_method="POST",
                    lifecycle_type="direct_fetch",
                    auth_params={"prodId": "WFQ_LBRP", "token": "J0xmJ1ux1eHrkINt"},
                    timeout_seconds=15,
                    is_enabled=True,
                    remark="获取微风企高保真 PDF 报告下载地址，通过文件存储服务持久化存证"
                ),
                SysThirdPartyApi(
                    id="api-ic-data",
                    api_code="IC_ENTERPRISE",
                    api_name="企业工商全息数据中台接口",
                    provider_name="enterprise_ic",
                    call_mode="mock",
                    endpoint_url="https://api.enterprise-data.com/ic/v1",
                    http_method="GET",
                    lifecycle_type="direct_fetch",
                    auth_params={"appKey": "your_ic_data_app_key"},
                    timeout_seconds=15,
                    is_enabled=True,
                    remark="获取企业照面、股东股权穿透、董监高与15项变更轨迹"
                ),
                SysThirdPartyApi(
                    id="api-risk-data",
                    api_code="RISK_RADAR",
                    api_name="企业经营与司法合规风险雷达接口",
                    provider_name="risk_radar",
                    call_mode="mock",
                    endpoint_url="https://api.risk-radar.com/v1",
                    http_method="GET",
                    lifecycle_type="direct_fetch",
                    auth_params={"appKey": "your_risk_radar_app_key"},
                    timeout_seconds=15,
                    is_enabled=True,
                    remark="全网排查司法涉诉、失信被执行人黑名单一票否决与行政处罚"
                ),
            ]
            session.add_all(default_apis)
            await session.commit()
            print(">>> [DB Init] 预置三方接口字典表 (微风企授权/状态/PDF、工商中台、风险雷达)！")

        # 2. 检查并创建默认演示前台注册用户
        result_user = await session.execute(select(User).where(User.phone == "13800138000"))
        demo_user = result_user.scalar_one_or_none()
        if not demo_user:
            demo_user = User(
                id="user-demo-001",
                phone="13800138000",
                hashed_password=get_password_hash("123456"),
                company_name="深圳市智汇创新科技有限公司",
                credit_code="91440300MA5EXXXX99",
                balance_quota=12,
                total_recharge_quota=20,
                total_consumed_quota=10,
                total_gifted_quota=1,
                status="active",
                tags=["重点客户", "金融信贷部", "高频使用"]
            )
            user_2 = User(
                id="user-demo-002",
                phone="13988886666",
                hashed_password=get_password_hash("123456"),
                company_name="江苏常欣智能制造有限责任公司",
                credit_code="91320400MA1WXXXX88",
                balance_quota=1,
                total_recharge_quota=0,
                total_consumed_quota=0,
                total_gifted_quota=1,
                status="active",
                tags=["新注册体验"]
            )
            session.add_all([demo_user, user_2])
            await session.commit()

            # 3. 预置额度流水
            tx1 = QuotaTransaction(
                tx_no="QTX202608250001",
                user_id=demo_user.id,
                user_phone=demo_user.phone,
                user_company=demo_user.company_name,
                change_type="gift",
                amount=1,
                balance_before=0,
                balance_after=1,
                ref_type="system",
                ref_id="INIT_GIFT",
                operator_type="system",
                operator_name="SYSTEM",
                remark="个人公安实名认证通过赠送 1 次免费额度"
            )
            tx2 = QuotaTransaction(
                tx_no="QTX202608250002",
                user_id=demo_user.id,
                user_phone=demo_user.phone,
                user_company=demo_user.company_name,
                change_type="recharge",
                amount=10,
                balance_before=1,
                balance_after=11,
                ref_type="order",
                ref_id="ORD202608251001",
                operator_type="user",
                operator_name="微信扫码支付",
                remark="线上购买标准进阶充值包 (10份)"
            )
            tx3 = QuotaTransaction(
                tx_no="QTX202608250003",
                user_id=demo_user.id,
                user_phone=demo_user.phone,
                user_company=demo_user.company_name,
                change_type="manual_add",
                amount=10,
                balance_before=12,
                balance_after=22,
                ref_type="adjust",
                ref_id="ADJ202608250001",
                operator_type="admin",
                operator_name="Admin-张运营",
                remark="线下对公打款入账（招商银行水单：99882312）"
            )
            tx4 = QuotaTransaction(
                tx_no="QTX202608250004",
                user_id=demo_user.id,
                user_phone=demo_user.phone,
                user_company=demo_user.company_name,
                change_type="consume",
                amount=-1,
                balance_before=22,
                balance_after=21,
                ref_type="task",
                ref_id="TSK202608250001",
                operator_type="user",
                operator_name="发起尽调",
                remark="发起【深圳腾讯前海信息技术有限公司】AI尽调扣除"
            )
            session.add_all([tx1, tx2, tx3, tx4])

            # 4. 预置一份高质量演示报告与已完成任务
            report_id = "rpt-demo-001"
            task_demo = DDTask(
                id="task-demo-001",
                task_no="TSK202608250001",
                user_id=demo_user.id,
                company_name="深圳腾讯前海信息技术有限公司",
                credit_code="91440300MA5DQ8888X",
                legal_person="马化腾",
                scene="bank_credit",
                dimensions=["工商司法", "税务真实性", "多头借贷", "资产抵质押"],
                auth_mode="weifengqi_qr",
                status="completed",
                auth_status="authorized",
                report_id=report_id,
                risk_level="green",
                completed_at="2026-08-25 10:45:20",
                thinking_logs=[
                    {"time": "10:43:02", "content": "【金税数据中台·强授权】企业法人三元认证通过，拉取近24个月增值税申报表与进销项开票流水。"},
                    {"time": "10:43:18", "content": "【数据中台·企业工商】工商照面与股东穿透完成：注册资本 10,000 万元，实缴到位率 100%，实际控制人穿透路径清晰。"},
                    {"time": "10:43:45", "content": "【金税合规·智能规则】纳税信用等级 A 级，近24个月开票总额 18,450 万元，同比稳健增长 21.4%，无断票异动。"},
                    {"time": "10:44:12", "content": "【风控雷达·多头征信】近3个月金融机构查询仅 1 次，共债压力低，无行政处罚与司法不良。"},
                    {"time": "10:45:20", "content": "【AI 智能体综合研判】五维量化评分 93 分 (极高信用水平 · 仅供参考)，参考测算额度区间: 800~1200万元，原始存证底稿已归档。"}
                ]
            )
            session.add(task_demo)

            # 通过 DataCleansingService 自动合成全景画像
            from app.providers import get_weifengqi_provider, get_ic_provider, get_risk_provider
            from app.services.cleansing_service import DataCleansingService

            wfq_p = get_weifengqi_provider()
            ic_p = get_ic_provider()
            risk_p = get_risk_provider()

            raw_w = await wfq_p.fetch_tax_data("91440300MA5DQ8888X", "深圳腾讯前海信息技术有限公司")
            raw_i = await ic_p.fetch_ic_full_profile("91440300MA5DQ8888X", "深圳腾讯前海信息技术有限公司")
            raw_r = await risk_p.fetch_risk_profile("91440300MA5DQ8888X", "深圳腾讯前海信息技术有限公司")

            (
                demo_report_content,
                demo_raw_sources,
                r_level,
                r_score,
                q_min,
                q_max,
                ai_sum
            ) = DataCleansingService.clean_and_synthesize(raw_w, raw_i, raw_r)

            demo_report = DDReport(
                id=report_id,
                report_no="RPT202608250001",
                task_id=task_demo.id,
                user_id=demo_user.id,
                company_name=task_demo.company_name,
                credit_code=task_demo.credit_code,
                legal_person=task_demo.legal_person,
                risk_level=r_level,
                score=r_score,
                suggested_quota_min=q_min,
                suggested_quota_max=q_max,
                summary_ai_comment=ai_sum,
                content_json=demo_report_content,
                raw_sources_json=demo_raw_sources
            )
            session.add(demo_report)
            await session.commit()
            print(">>> [DB Init] 预置演示用户 (13800138000/123456)、额度流水及全景尽调报告！")
