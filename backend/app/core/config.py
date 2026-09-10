import os
from typing import List
from pydantic_settings import BaseSettings

db_path_str = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'xyzp_v6.db')).replace('\\', '/')

class Settings(BaseSettings):
    PROJECT_NAME: str = "享宇AI智评"
    VERSION: str = "2.2.0"
    API_V1_STR: str = "/api/v1"
    API_ADMIN_STR: str = "/api/admin"

    # 全局业务时区配置
    TIMEZONE: str = "Asia/Shanghai"

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

    # 4. 短信网关发送服务 (SMS Gateway API - 手机号登录/注册/改密/找回密码)
    # 提供商可选: "xct" (享畅通官方网关) | "generic_http" (通用HTTP网关) | "mock" (本地开发挡板)
    SMS_PROVIDER: str = "xct"
    SMS_MODE: str = "mock"  # 保持历史兼容: "mock" | "http"
    SMS_GATEWAY_URL: str = "https://api.sms-gateway.com/v1/send"
    SMS_ACCOUNT: str = ""           # 短信平台账号 / AppKey
    SMS_PASSWORD: str = ""          # 短信平台密码 / AppSecret
    SMS_SIGN_NAME: str = "成都享宇森云科技" # 短信签名 (与商户账号密码统一配置，可随需调整)
    SMS_TEMPLATE_CODE: str = ""     # 短信模版ID (如适用)
    SMS_CODE_EXPIRE_SECONDS: int = 300  # 验证码有效期 (秒，默认 5 分钟)

    # 4.1 享畅通专用短信网关配置 (XCT SMS)
    XCT_SMS_URL: str = "http://api.xct.com/sms/send"
    XCT_SMS_NAME: str = ""           # 享畅通商户账号 (与密钥、签名一同配置)
    XCT_SMS_KEY: str = ""            # 享畅通商户密码/密钥 (与账号、签名一同配置)
    XCT_SMS_SIGN: str = "成都享宇森云科技" # 享畅通短信签名 (与商户账号密码统一配置，支持热更新)
    XCT_SMS_IS_OPEN: bool = False    # 短信发送开关 (开发/测试环境默认为 False 开启挡板保护，生产设置为 True)
    XCT_SMS_MAX_ERROR_COUNT: int = 5 # 验证码最大输错容忍次数 (连续输错5次强制作废防撞库爆破)
    XCT_SMS_EXPIRE_SECONDS: int = 300 # 验证码有效时间 (秒)

    # ==========================================
    # LLM 智能体与 New-API Token 池网关配置
    # ==========================================
    LLM_PROVIDER: str = "newapi"  # "mock" | "newapi" | "openai" | "deepseek"
    NEW_API_BASE_URL: str = "http://127.0.0.1:3000/v1"
    NEW_API_KEY: str = ""
    NEW_API_MODEL: str = "xyzp-ai"
    NEW_API_TIMEOUT_SECONDS: int = 60
    
    # 兼容通用 OpenAI 变量
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: str = "http://127.0.0.1:3000/v1"

    # 运行环境模式: "development" | "production" | "testing"
    ENVIRONMENT: str = "production"

    # 是否允许模拟支付接口 (生产环境必须为 False)
    ALLOW_MOCK_PAY: bool = False

    # Security
    SECRET_KEY: str = "xyzp-ai-platform-super-secure-local-dev-jwt-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 4320

    # ==========================================
    # 字体库路径配置 (脱敏与 PDF 处理独立字体)
    # ==========================================
    FONTS_DIR: str = ""
    PDF_FONTS_DIR: str = ""

    # ==========================================
    # MinIO 对象存储配置
    # ==========================================
    MINIO_ENDPOINT: str = "127.0.0.1:9000"
    MINIO_ACCESS_KEY: str = "admin"
    MINIO_SECRET_KEY: str = "admin123456"
    MINIO_BUCKET_NAME: str = "my-files"
    MINIO_SECURE: bool = False

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://192.168.110.234:5173,http://192.168.110.234:8000"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        try:
            from app.core.network import get_server_real_lan_ip
            lan_ip = get_server_real_lan_ip()
            for p in [5173, 8000, 3000]:
                target = f"http://{lan_ip}:{p}"
                if target not in origins:
                    origins.append(target)
        except Exception:
            pass
        return origins

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        extra = "allow"

settings = Settings()

if settings.ENVIRONMENT == "production" and "super-secure-local-dev" in settings.SECRET_KEY:
    import logging
    logging.getLogger("xyzp.config").warning(
        "⚠️ [安全风险警告] 当前处于生产模式 (ENVIRONMENT=production)，但仍在使用默认测试 JWT SECRET_KEY！"
        "请立即在生产环境 .env 中配置高强度独立随机密钥以确保 Token 安全。"
    )
