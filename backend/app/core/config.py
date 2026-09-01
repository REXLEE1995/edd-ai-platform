import os
from typing import List
from pydantic_settings import BaseSettings

db_path_str = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'edd_v6.db')).replace('\\', '/')

class Settings(BaseSettings):
    PROJECT_NAME: str = "享宇AI智评"
    VERSION: str = "2.1.0"
    API_V1_STR: str = "/api/v1"
    API_ADMIN_STR: str = "/api/admin"

    # 公网/局域网真实服务 IP 或域名 (用于短链生成、二维码、对外分享和微风企授权回调，如 http://192.168.110.234:8000)
    PUBLIC_BASE_URL: str = ""

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{db_path_str}"
    DB_ECHO: bool = False

    # Cache
    CACHE_DRIVER: str = "memory"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ==========================================
    # 三方数据源接口配置 (Three Independent 3rd-Party APIs)
    # 模式可选: "mock" (本地多场景拟真) | "http" (真实三方接口发起网络调用)
    # ==========================================
    
    # 1. 微风企数据接口 (Weifengqi API - 授权、状态、PDF与税务底稿)
    WEIFENGQI_MODE: str = "mock"
    WEIFENGQI_BASE_URL: str = "http://127.0.0.1:8010"
    WEIFENGQI_APP_KEY: str = ""
    WEIFENGQI_APP_SECRET: str = ""
    WEIFENGQI_TIMEOUT_SECONDS: int = 15

    # 2. 企业工商数据接口 (Enterprise IC API - 照面信息、股东穿透、董监高、历史变更、分支投资)
    IC_DATA_MODE: str = "mock"
    IC_DATA_BASE_URL: str = "https://api.enterprise-data.com/ic/v1"
    IC_DATA_APP_KEY: str = ""
    IC_DATA_APP_SECRET: str = ""
    IC_DATA_TIMEOUT_SECONDS: int = 15

    # 3. 企业经营风险数据接口 (Enterprise Operational & Legal Risk API - 司法涉诉、失信黑名单、经营异常、多头借贷雷达)
    RISK_DATA_MODE: str = "mock"
    RISK_DATA_BASE_URL: str = "https://api.risk-radar.com/v1"
    RISK_DATA_APP_KEY: str = ""
    RISK_DATA_APP_SECRET: str = ""
    RISK_DATA_TIMEOUT_SECONDS: int = 15

    # ==========================================
    # LLM 智能体与 New-API Token 池网关配置
    # ==========================================
    LLM_PROVIDER: str = "newapi"  # "mock" | "newapi" | "openai" | "deepseek"
    NEW_API_BASE_URL: str = "http://127.0.0.1:3000/v1"
    NEW_API_KEY: str = "sk-newapi-master-key"
    NEW_API_MODEL: str = "deepseek-chat"
    NEW_API_TIMEOUT_SECONDS: int = 60
    
    # 兼容通用 OpenAI 变量
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: str = "http://127.0.0.1:3000/v1"

    # Security
    SECRET_KEY: str = "edd-ai-platform-super-secure-local-dev-jwt-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 4320

    # ==========================================
    # MinIO 对象存储配置
    # ==========================================
    MINIO_ENDPOINT: str = "127.0.0.1:9000"
    MINIO_ACCESS_KEY: str = "admin"
    MINIO_SECRET_KEY: str = "admin123456"
    MINIO_BUCKET_NAME: str = "my-files"
    MINIO_SECURE: bool = False

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
