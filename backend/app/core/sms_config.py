from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.system_setting import SystemSetting

def get_default_sms_config() -> Dict[str, Any]:
    return {
        "sms_provider": getattr(settings, "SMS_PROVIDER", "xct"),
        "url": getattr(settings, "XCT_SMS_URL", "http://api.xct.com/sms/send"),
        "name": getattr(settings, "XCT_SMS_NAME", ""),
        "key": getattr(settings, "XCT_SMS_KEY", ""),
        "sign": getattr(settings, "XCT_SMS_SIGN", getattr(settings, "SMS_SIGN_NAME", "成都享宇森云科技")),
        "is_open": getattr(settings, "XCT_SMS_IS_OPEN", False),
        "max_error_count": getattr(settings, "XCT_SMS_MAX_ERROR_COUNT", 5),
        "expire_seconds": getattr(settings, "XCT_SMS_EXPIRE_SECONDS", 300),
    }

async def get_active_sms_config(db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    获取当前生效的短信配置 (商户账号、商户密码/密钥、短信签名、网关URL、开关状态等)
    优先级: 数据库 system_settings(key="sms_config") > 环境变量 (.env)
    """
    cfg = get_default_sms_config()
    if not db:
        return cfg

    try:
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == "sms_config"))
        record = res.scalar_one_or_none()
        if record and isinstance(record.value, dict):
            for k, v in record.value.items():
                if v is not None and str(v).strip() != "":
                    cfg[k] = v
    except Exception:
        pass
    return cfg

async def save_sms_config(db: AsyncSession, new_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    保存/热更新短信配置 (商户账号、商户密码/密钥、短信签名、网关URL等) 至 system_settings
    """
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == "sms_config"))
    record = res.scalar_one_or_none()

    current_val = await get_active_sms_config(db)
    for k, v in new_data.items():
        if v is not None:
            # 掩码防覆盖：如果传入包含掩码的 key，则保留原密钥
            if k == "key" and isinstance(v, str) and "••••" in v:
                continue
            current_val[k] = v

    if not record:
        record = SystemSetting(
            key="sms_config",
            value=current_val,
            description="享畅通短信网关配置 (商户账号、商户密码/密钥、短信签名、网关URL与开关状态)"
        )
        db.add(record)
    else:
        record.value = current_val

    await db.commit()
    await db.refresh(record)
    return current_val
