from app.core.config import settings
from app.providers.weifengqi_provider import WeifengqiProvider
from app.providers.ic_provider import ICDataProvider
from app.providers.risk_provider import RiskRadarProvider

def get_weifengqi_provider() -> WeifengqiProvider:
    """
    获取微风企数据接口提供者实例
    """
    return WeifengqiProvider(
        mode=settings.WEIFENGQI_MODE,
        base_url=settings.WEIFENGQI_BASE_URL,
        app_key=settings.WEIFENGQI_APP_KEY,
        app_secret=settings.WEIFENGQI_APP_SECRET,
        timeout=settings.WEIFENGQI_TIMEOUT_SECONDS
    )

def get_ic_provider() -> ICDataProvider:
    """
    获取企业工商数据接口提供者实例
    """
    return ICDataProvider(
        mode=settings.IC_DATA_MODE,
        base_url=settings.IC_DATA_BASE_URL,
        app_key=settings.IC_DATA_APP_KEY,
        app_secret=settings.IC_DATA_APP_SECRET,
        timeout=settings.IC_DATA_TIMEOUT_SECONDS
    )

def get_risk_provider() -> RiskRadarProvider:
    """
    获取企业经营风险数据接口提供者实例
    """
    return RiskRadarProvider(
        mode=settings.RISK_DATA_MODE,
        base_url=settings.RISK_DATA_BASE_URL,
        app_key=settings.RISK_DATA_APP_KEY,
        app_secret=settings.RISK_DATA_APP_SECRET,
        timeout=settings.RISK_DATA_TIMEOUT_SECONDS
    )

from app.providers.xct_sms_provider import XctSmsProvider, get_xct_sms_provider

__all__ = [
    "WeifengqiProvider",
    "ICDataProvider",
    "RiskRadarProvider",
    "XctSmsProvider",
    "get_weifengqi_provider",
    "get_ic_provider",
    "get_risk_provider",
    "get_xct_sms_provider"
]

