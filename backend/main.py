import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db

# -------------------------------------------------------------
# 全局日志格式与输出级别配置 (终端高可读性彩色化实时输出)
# -------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
for logger_name in ["edd", "edd.cleansing", "edd.storage", "edd.task", "edd.weifengqi", "app"]:
    logging.getLogger(logger_name).setLevel(logging.INFO)

logger = logging.getLogger("edd.server")

# 前台 SaaS 路由
from app.api.v1.auth import router as v1_auth_router
from app.api.v1.search import router as v1_search_router
from app.api.v1.tasks import router as v1_tasks_router
from app.api.v1.reports import router as v1_reports_router
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
    # 启动时自动初始化本地 SQLite 数据库与预置初始数据
    logger.info("🚀 正在初始化本地 SQLite 数据库与预置系统数据...")
    await init_db()
    logger.info("✅ 尽调平台后端服务启动就绪，数据清洗中台与 MinIO 存证引擎已待命！")
    yield
    logger.info("🛑 尽调平台后端服务已安全关闭。")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="享宇AI智评 - 企业尽调商业 SaaS 及后台运营管理系统 API",
    lifespan=lifespan
)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 本地开发全放行
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
async def redirect_short_link(short_code: str):
    """
    自研本地短链重定向服务 (302 自动跳转至微风企 H5 授权超长地址)
    解决超长 URL 导致二维码密密麻麻的问题，提供极简大方块二维码与秒级识别率
    """
    from fastapi.responses import RedirectResponse, HTMLResponse
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.task import DDTask

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DDTask).where(DDTask.short_code == short_code))
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
