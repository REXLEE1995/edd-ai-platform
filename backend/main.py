import os
import sys
import asyncio

if sys.platform == "win32":
    # 修复 Windows 下 Python 3.8+ 默认 ProactorEventLoop 搭配 asyncmy/MySQL 在处理大包数据时的 BufferError 异常
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import logging
from logging.handlers import TimedRotatingFileHandler
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db

# -------------------------------------------------------------
# 全局日志格式与输出级别配置 (控制台实时输出 + 生产文件每日轮转切割)
# -------------------------------------------------------------
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(log_dir, exist_ok=True)
log_file_path = os.path.join(log_dir, "xyzp.log")

log_formatter = logging.Formatter(
    fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_formatter)

file_handler = TimedRotatingFileHandler(
    filename=log_file_path,
    when="midnight",
    interval=1,
    backupCount=30,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)

logging.basicConfig(
    level=logging.INFO,
    handlers=[console_handler, file_handler]
)
for logger_name in ["xyzp", "xyzp.cleansing", "xyzp.storage", "xyzp.tasks", "xyzp.weifengqi", "xyzp.providers", "app"]:
    logging.getLogger(logger_name).setLevel(logging.INFO)

logger = logging.getLogger("xyzp.server")

# 前台 SaaS 路由
from app.api.v1.auth import router as v1_auth_router
from app.api.v1.search import router as v1_search_router
from app.api.v1.tasks import router as v1_tasks_router
from app.api.v1.reports import router as v1_reports_router
from app.api.v1.report_chat import router as v1_report_chat_router
from app.api.v1.billing import router as v1_billing_router
from app.api.v1.shares import router as v1_shares_router

# 后台 Admin 路由
from app.api.admin.auth import router as admin_auth_router
from app.api.admin.dashboard import router as admin_dashboard_router
from app.api.admin.users import router as admin_users_router
from app.api.admin.quota import router as admin_quota_router
from app.api.admin.orders import router as admin_orders_router
from app.api.admin.settings import router as admin_settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时自动初始化数据库表结构与预置系统数据
    logger.info(f"🚀 正在以 [{settings.ENVIRONMENT.upper()}] 模式启动尽调平台后端服务...")
    await init_db()
    # 自动热加载持久化的大模型配置
    try:
        from app.core.database import AsyncSessionLocal
        from app.core.ai_config import get_active_ai_config
        async with AsyncSessionLocal() as session:
            active_cfg = await get_active_ai_config(session)
            logger.info(f"🤖 AI 模型网关已热加载生效: Provider={active_cfg.get('llm_provider')}, Model={active_cfg.get('new_api_model')}, URL={active_cfg.get('new_api_base_url')}")
    except Exception as e:
        logger.warning(f"[lifespan] AI 配置热加载警告: {e}")
    logger.info("✅ 尽调平台后端服务启动就绪，数据清洗中台与 MinIO 存证引擎已待命！")
    yield
    logger.info("🛑 尽调平台后端服务已安全关闭。")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="享宇AI智评 - 企业尽调商业 SaaS 及后台运营管理系统 API",
    lifespan=lifespan
)

# -------------------------------------------------------------
# 跨域安全策略 (CORS Policy)
# 生产模式严格遵循白名单域名，开发模式兼顾局域网/本地调试
# -------------------------------------------------------------
if settings.ENVIRONMENT == "development":
    logger.info("[CORS] 当前为开发环境，开启全量局域网跨域匹配。")
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    logger.info(f"[CORS] 当前为生产环境，严格启用跨域白名单: {settings.cors_origins_list}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

import time
from fastapi import Request

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = round((time.time() - start_time) * 1000, 1)
    path = request.url.path
    if not path.endswith("/health") and not path.endswith("/auth/me"):
        logger.info(f"[HTTP] [{request.method}] {path} -> HTTP {response.status_code} ({process_time}ms)")
    return response

# 注册前台 SaaS 业务路由
app.include_router(v1_auth_router, prefix="/api/v1")
app.include_router(v1_search_router, prefix="/api/v1")
app.include_router(v1_tasks_router, prefix="/api/v1")
app.include_router(v1_reports_router, prefix="/api/v1")
app.include_router(v1_report_chat_router, prefix="/api/v1")
app.include_router(v1_billing_router, prefix="/api/v1")
app.include_router(v1_shares_router, prefix="/api/v1")

# 注册后台 Admin 管理路由
app.include_router(admin_auth_router, prefix="/api/admin")
app.include_router(admin_dashboard_router, prefix="/api/admin")
app.include_router(admin_users_router, prefix="/api/admin")
app.include_router(admin_quota_router, prefix="/api/admin")
app.include_router(admin_orders_router, prefix="/api/admin")
app.include_router(admin_settings_router, prefix="/api/admin")

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "admin_docs_url": "/docs"
    }

@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": settings.VERSION,
        "providers": {
            "weifengqi": settings.WEIFENGQI_MODE,
            "ic": settings.IC_DATA_MODE,
            "risk": settings.RISK_DATA_MODE
        }
    }

@app.get("/s/{short_code}")
@app.get("/api/s/{short_code}")
@app.get("/api/v1/s/{short_code}")
async def redirect_short_link(short_code: str):
    """
    自研本地短链重定向服务 (302 自动跳转至微风企 H5 授权超长地址)
    解决超长 URL 导致二维码密密麻麻的问题，提供极简大方块二维码与秒级识别率
    """
    from fastapi.responses import RedirectResponse, HTMLResponse
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.task import XYZPTask

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(XYZPTask).where(XYZPTask.short_code == short_code))
        task = result.scalar_one_or_none()
        if task and task.auth_link:
            return RedirectResponse(url=task.auth_link, status_code=302)
    
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head><meta charset="utf-8"><title>授权链接已失效</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#f8fafc;">
            <div style="text-align:center;padding:40px;background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                <h2 style="color:#ef4444;margin-bottom:10px;">⚠️ 授权链接不存在或已失效</h2>
                <p style="color:#64748b;font-size:14px;">请重新在尽调中心生成新的企业授权二维码。</p>
            </div>
        </body>
        </html>
        """,
        status_code=404
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
