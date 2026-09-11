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
from app.models.task import XYZPTask
from app.models.report import XYZPReport
from app.models.order import Order
from app.models.file_record import TaskFile
from app.models.third_party_api import SysThirdPartyApi
from app.models.report_share import ReportShare
from app.models.sms_log import SMSLog
from app.models.report_chat_message import ReportChatMessage
from app.models.system_setting import SystemSetting

# 确保 SQLite 本地数据目录存在并使用绝对路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "xyzp_v6.db")

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
    if "mysql" in db_url:
        engine_kwargs["connect_args"] = {"init_command": "SET time_zone = '+08:00'"}


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
        
        # 数据库字段自愈与升级补齐 (SQLite 逻辑)
        if "sqlite" in db_url:
            try:
                res = await conn.execute(text("PRAGMA table_info(xyzp_reports)"))
                cols = [row[1] for row in res.fetchall()]
                if "expired_at" not in cols:
                    await conn.execute(text("ALTER TABLE xyzp_reports ADD COLUMN expired_at DATETIME"))
                if "is_read" not in cols:
                    await conn.execute(text("ALTER TABLE xyzp_reports ADD COLUMN is_read BOOLEAN DEFAULT 0"))
                if "read_at" not in cols:
                    await conn.execute(text("ALTER TABLE xyzp_reports ADD COLUMN read_at DATETIME"))
            except Exception as e:
                print(f"[DB Auto-Migration SQLite] migration note: {e}")

    # MySQL 字段升级与自愈 (需独立 AUTOCOMMIT 连接防止 DDL 隐式提交打破事务状态)
    if "mysql" in db_url:
        try:
            async with engine.connect() as conn:
                await conn.execution_options(isolation_level="AUTOCOMMIT")
                await conn.execute(text("ALTER TABLE xyzp_tasks MODIFY COLUMN auth_link LONGTEXT COMMENT '微风企法人授权专属移动端 H5 链接'"))
                await conn.execute(text("ALTER TABLE xyzp_tasks MODIFY COLUMN auth_qrcode_url LONGTEXT COMMENT '微风企法人授权专属二维码图片 URL'"))
                await conn.execute(text("ALTER TABLE xyzp_tasks MODIFY COLUMN wfq_pdf_url LONGTEXT COMMENT '微风企返回的原始远程报告 PDF 下载地址'"))
                await conn.execute(text("ALTER TABLE xyzp_tasks MODIFY COLUMN error_message LONGTEXT COMMENT '若任务异常终止时的错误原因详情'"))
                try:
                    await conn.execute(text("ALTER TABLE xyzp_reports ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '用户是否已查阅该报告'"))
                except Exception:
                    pass
                try:
                    await conn.execute(text("ALTER TABLE xyzp_reports ADD COLUMN read_at DATETIME COMMENT '用户首次查阅时间'"))
                except Exception:
                    pass
        except Exception as e:
            print(f"[DB Auto-Migration MySQL] migration note: {e}")
    
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

        # 1.2 检查并初始化系统全局配置表 (SystemSetting -> ai_config)
        res_cfg = await session.execute(select(SystemSetting).where(SystemSetting.key == "ai_config"))
        ai_setting = res_cfg.scalar_one_or_none()
        if not ai_setting:
            legacy_json_path = os.path.join(DATA_DIR, "ai_settings.json")
            initial_val = {
                "llm_provider": getattr(settings, "LLM_PROVIDER", "newapi"),
                "new_api_base_url": getattr(settings, "NEW_API_BASE_URL", "http://192.168.110.234:3000/v1"),
                "new_api_key": getattr(settings, "NEW_API_KEY", ""),
                "new_api_model": getattr(settings, "NEW_API_MODEL", "xyzp-ai"),
                "temperature": 0.3,
                "timeout_seconds": getattr(settings, "NEW_API_TIMEOUT_SECONDS", 60),
                "is_enabled": True,
                "last_test_at": None,
                "last_test_status": None,
                "last_test_latency_ms": None,
                "last_test_msg": None,
            }
            if os.path.exists(legacy_json_path):
                try:
                    import json
                    with open(legacy_json_path, 'r', encoding='utf-8') as f:
                        saved_json = json.load(f)
                        initial_val.update(saved_json)
                except Exception as e:
                    print(f"[DB Init] Note reading legacy ai_settings.json: {e}")
            
            new_setting = SystemSetting(
                key="ai_config",
                value=initial_val,
                description="全局 AI 模型网关与调度配置"
            )
            session.add(new_setting)
            await session.commit()
            print(">>> [DB Init] 预置系统全局配置表 system_settings (ai_config)！")

        # 1.3 检查并初始化平台全局业务规则 (SystemSetting -> business_config)
        res_biz = await session.execute(select(SystemSetting).where(SystemSetting.key == "business_config"))
        biz_setting = res_biz.scalar_one_or_none()
        if not biz_setting:
            default_biz_config = {
                "default_gift_quota": 1,          # 新用户注册赠送额度 (次)
                "report_price_yuan": 99.0,        # 尽调报告单价 (元)
                "report_cache_days": 30,          # 尽调报告数据缓存与有效期 (天)
                "enable_public_query": True,      # 是否允许直接查询公开工商数据
                "sms_mock_mode": True,            # 短信服务是否走模拟验证码 (123456)
            }
            new_biz_setting = SystemSetting(
                key="business_config",
                value=default_biz_config,
                description="系统平台业务与运营规则配置 (注册赠送、报告计费、缓存策略等)"
            )
            session.add(new_biz_setting)
            await session.commit()
            print(">>> [DB Init] 预置系统全局业务配置表 system_settings (business_config)！")

