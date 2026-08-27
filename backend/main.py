from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db

# 前台 SaaS 路由
from app.api.v1.auth import router as v1_auth_router
from app.api.v1.search import router as v1_search_router
from app.api.v1.tasks import router as v1_tasks_router
from app.api.v1.reports import router as v1_reports_router
from app.api.v1.billing import router as v1_billing_router

# 后台 Admin 路由
from app.api.admin.auth import router as admin_auth_router
from app.api.admin.dashboard import router as admin_dashboard_router
from app.api.admin.users import router as admin_users_router
from app.api.admin.quota import router as admin_quota_router
from app.api.admin.orders import router as admin_orders_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时自动初始化本地 SQLite 数据库与预置初始数据
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="EDD AI Platform - 企业尽调商业 SaaS 及后台运营管理系统 API",
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

# 注册前台 SaaS 业务路由
app.include_router(v1_auth_router, prefix="/api/v1")
app.include_router(v1_search_router, prefix="/api/v1")
app.include_router(v1_tasks_router, prefix="/api/v1")
app.include_router(v1_reports_router, prefix="/api/v1")
app.include_router(v1_billing_router, prefix="/api/v1")

# 注册后台 Admin 管理路由
app.include_router(admin_auth_router, prefix="/api/admin")
app.include_router(admin_dashboard_router, prefix="/api/admin")
app.include_router(admin_users_router, prefix="/api/admin")
app.include_router(admin_quota_router, prefix="/api/admin")
app.include_router(admin_orders_router, prefix="/api/admin")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
