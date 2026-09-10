import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Body, Path
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.admin import AdminUser
from app.models.third_party_api import SysThirdPartyApi
from app.models.system_setting import SystemSetting
from app.api.deps import get_current_admin
from app.core.ai_config import load_ai_config, save_ai_config, test_ai_connectivity, get_active_ai_config
from app.core.sms_config import get_active_sms_config, save_sms_config

logger = logging.getLogger("xyzp.admin.settings")

router = APIRouter(prefix="/settings", tags=["系统管理与运营配置"])

def mask_api_key(key: str) -> str:
    if not key:
        return ""
    key = key.strip()
    if len(key) <= 8:
        return "••••••••"
    return f"{key[:6]}••••••••{key[-4:]}"

def sanitize_auth_params(params: Optional[dict]) -> dict:
    if not params:
        return {}
    sanitized = {}
    for k, v in params.items():
        if isinstance(v, str) and any(s in k.lower() for s in ["token", "secret", "key", "pwd", "password"]):
            sanitized[k] = mask_api_key(v)
        else:
            sanitized[k] = v
    return sanitized


# ==============================================================================
# 1. AI 网关与模型调度配置 (单一真理源 .env 模式 + 实时诊断探针)
# ==============================================================================

class AISettingsUpdatePayload(BaseModel):
    llm_provider: Optional[str] = Field("newapi", description="AI 提供商/模式")
    new_api_base_url: Optional[str] = Field("http://127.0.0.1:3000/v1", description="API 基础端点 URL")
    new_api_key: Optional[str] = Field(None, description="API Token 密钥 (留空或掩码则保持不变)")
    new_api_model: Optional[str] = Field("xyzp-ai", description="业务统一调用代号 (由 New API 网关重定向至真实模型)")
    temperature: Optional[float] = Field(0.3, ge=0.0, le=2.0, description="采样温度")
    timeout_seconds: Optional[int] = Field(60, ge=5, le=300, description="超时时间(秒)")
    is_enabled: Optional[bool] = Field(True, description="是否启用 AI 网关")

class AITestPayload(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None

@router.get("/ai")
async def get_ai_settings(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前系统 AI 网关与 Token 路由配置 (支持数据库热更新与 .env 回退)
    """
    cfg = await get_active_ai_config(db)
    raw_key = cfg.get("new_api_key", "")
    
    return {
        "code": 0,
        "data": {
            "llm_provider": cfg.get("llm_provider", "newapi"),
            "new_api_base_url": cfg.get("new_api_base_url", "http://127.0.0.1:3000/v1"),
            "new_api_key_masked": mask_api_key(raw_key),
            "has_key": bool(raw_key and raw_key.strip() and raw_key != "sk-your-new-api-master-token"),
            "new_api_model": cfg.get("new_api_model", "xyzp-ai"),
            "temperature": cfg.get("temperature", 0.3),
            "timeout_seconds": cfg.get("timeout_seconds", 60),
            "is_enabled": cfg.get("is_enabled", True),
            "last_test_at": cfg.get("last_test_at"),
            "last_test_status": cfg.get("last_test_status"),
            "last_test_latency_ms": cfg.get("last_test_latency_ms"),
            "last_test_msg": cfg.get("last_test_msg"),
        }
    }

@router.post("/ai")
async def update_ai_settings(
    payload: AISettingsUpdatePayload,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    保存/热更新大模型配置至数据库 system_settings
    """
    update_data = {
        "llm_provider": payload.llm_provider,
        "new_api_base_url": payload.new_api_base_url,
        "new_api_model": payload.new_api_model,
        "temperature": payload.temperature,
        "timeout_seconds": payload.timeout_seconds,
        "is_enabled": payload.is_enabled,
    }
    if payload.new_api_key is not None and "••••" not in payload.new_api_key and payload.new_api_key.strip() != "":
        update_data["new_api_key"] = payload.new_api_key.strip()

    updated_cfg = await save_ai_config(db, update_data)
    raw_key = updated_cfg.get("new_api_key", "")

    return {
        "code": 0,
        "message": "AI 大模型配置已成功保存并实时生效！",
        "data": {
            "llm_provider": updated_cfg.get("llm_provider"),
            "new_api_base_url": updated_cfg.get("new_api_base_url"),
            "new_api_key_masked": mask_api_key(raw_key),
            "has_key": bool(raw_key and raw_key.strip()),
            "new_api_model": updated_cfg.get("new_api_model"),
            "temperature": updated_cfg.get("temperature"),
            "timeout_seconds": updated_cfg.get("timeout_seconds"),
            "is_enabled": updated_cfg.get("is_enabled")
        }
    }

@router.post("/ai/test")
async def test_ai_settings(
    payload: Optional[AITestPayload] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    测试 AI 网关连通性与模型可用性探针
    """
    p_base_url = payload.base_url if payload else None
    p_api_key = payload.api_key if payload else None
    p_model = payload.model if payload else None
    p_provider = payload.provider if payload else None

    # 如果传入的 api_key 包含掩码，自动采用已保存的 key
    if p_api_key and "••••" in p_api_key:
        p_api_key = None

    result = await test_ai_connectivity(
        base_url=p_base_url,
        api_key=p_api_key,
        model=p_model,
        provider=p_provider,
        db=db
    )

    return {
        "code": 0 if result.get("success") else 1,
        "message": "连通性测试通过" if result.get("success") else result.get("error", "连通性测试未通过"),
        "data": result
    }


# ==============================================================================
# 2. 三方数据源接口管理 (MySQL sys_third_party_apis 动态字典与热切换)
# ==============================================================================

class ThirdPartyApiUpdatePayload(BaseModel):
    call_mode: Optional[str] = Field(None, description="调用模式: mock / http")
    endpoint_url: Optional[str] = Field(None, description="接口端点 URL")
    timeout_seconds: Optional[int] = Field(None, ge=1, le=120, description="超时时间 (秒)")
    is_enabled: Optional[bool] = Field(None, description="是否启用状态")
    remark: Optional[str] = Field(None, description="备注说明")
    auth_params: Optional[Dict[str, Any]] = Field(None, description="认证或固定参数")

@router.get("/apis")
async def list_third_party_apis(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    获取系统中所有已注册的三方外部数据源与接口列表
    """
    result = await db.execute(select(SysThirdPartyApi).order_by(SysThirdPartyApi.provider_name, SysThirdPartyApi.api_code))
    records = result.scalars().all()

    items = []
    for r in records:
        items.append({
            "id": r.id,
            "api_code": r.api_code,
            "api_name": r.api_name,
            "provider_name": r.provider_name,
            "call_mode": r.call_mode,
            "endpoint_url": r.endpoint_url,
            "http_method": r.http_method,
            "lifecycle_type": r.lifecycle_type,
            "auth_params_masked": sanitize_auth_params(r.auth_params),
            "timeout_seconds": r.timeout_seconds,
            "is_enabled": r.is_enabled,
            "remark": r.remark,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None,
            "updated_at": r.updated_at.strftime("%Y-%m-%d %H:%M:%S") if r.updated_at else None
        })

    return {
        "code": 0,
        "data": items,
        "total": len(items)
    }

@router.put("/apis/{api_code}")
async def update_third_party_api(
    api_code: str = Path(..., description="接口全局唯一代码，例如 WFQ_AUTH, IC_ENTERPRISE, RISK_RADAR"),
    payload: ThirdPartyApiUpdatePayload = Body(...),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    修改指定三方接口的调用模式 (mock/http)、端点 URL、超时与启停状态 (动态即时生效)
    """
    result = await db.execute(select(SysThirdPartyApi).where(SysThirdPartyApi.api_code == api_code))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到代码为 '{api_code}' 的三方数据接口")

    if payload.call_mode is not None:
        mode_clean = payload.call_mode.lower().strip()
        if mode_clean not in ["mock", "http"]:
            raise HTTPException(status_code=400, detail="调用模式仅支持 'mock' 或 'http'")
        record.call_mode = mode_clean

    if payload.endpoint_url is not None:
        record.endpoint_url = payload.endpoint_url.strip()

    if payload.timeout_seconds is not None:
        record.timeout_seconds = payload.timeout_seconds

    if payload.is_enabled is not None:
        record.is_enabled = payload.is_enabled

    if payload.remark is not None:
        record.remark = payload.remark

    if payload.auth_params is not None:
        # 保留未修改的掩码字段
        current_params = record.auth_params or {}
        new_params = dict(current_params)
        for k, v in payload.auth_params.items():
            if isinstance(v, str) and "••••" in v:
                continue
            new_params[k] = v
        record.auth_params = new_params

    await db.commit()
    await db.refresh(record)
    logger.info(f"[Admin Settings] 三方接口 '{api_code}' 配置已更新: mode={record.call_mode}, enabled={record.is_enabled}")

    return {
        "code": 0,
        "message": f"三方接口 '{record.api_name}' 配置已成功更新并即时生效",
        "data": {
            "api_code": record.api_code,
            "api_name": record.api_name,
            "provider_name": record.provider_name,
            "call_mode": record.call_mode,
            "endpoint_url": record.endpoint_url,
            "is_enabled": record.is_enabled,
            "timeout_seconds": record.timeout_seconds,
            "updated_at": record.updated_at.strftime("%Y-%m-%d %H:%M:%S") if record.updated_at else None
        }
    }

@router.post("/apis/{api_code}/toggle-mode")
async def toggle_api_mode(
    api_code: str = Path(...),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    一键快速切换接口调用模式 (mock <-> http)
    """
    result = await db.execute(select(SysThirdPartyApi).where(SysThirdPartyApi.api_code == api_code))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到代码为 '{api_code}' 的三方数据接口")

    record.call_mode = "http" if record.call_mode == "mock" else "mock"
    await db.commit()
    await db.refresh(record)

    logger.info(f"[Admin Settings] 三方接口 '{api_code}' 模式已快速切换为: {record.call_mode}")
    return {
        "code": 0,
        "message": f"接口 '{record.api_name}' 已成功切换为 【{'真实 HTTP 网络调用' if record.call_mode == 'http' else '本地 Mock 仿真'}】 模式",
        "data": {
            "api_code": record.api_code,
            "call_mode": record.call_mode,
            "is_enabled": record.is_enabled
        }
    }

@router.post("/apis/{api_code}/toggle-status")
async def toggle_api_status(
    api_code: str = Path(...),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    一键快速启用或禁用三方接口
    """
    result = await db.execute(select(SysThirdPartyApi).where(SysThirdPartyApi.api_code == api_code))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到代码为 '{api_code}' 的三方数据接口")

    record.is_enabled = not record.is_enabled
    await db.commit()
    await db.refresh(record)

    logger.info(f"[Admin Settings] 三方接口 '{api_code}' 启用状态已切换为: {record.is_enabled}")
    return {
        "code": 0,
        "message": f"接口 '{record.api_name}' 已 {'启用' if record.is_enabled else '禁用'}",
        "data": {
            "api_code": record.api_code,
            "is_enabled": record.is_enabled,
            "call_mode": record.call_mode
        }
    }


# ==============================================================================
# 3. 平台业务运营规则配置 (MySQL system_settings -> key="business_config")
# ==============================================================================

class BusinessConfigPayload(BaseModel):
    default_gift_quota: Optional[int] = Field(None, ge=0, le=100, description="新用户首次登录注册赠送免费体验额度 (次)")
    report_price_yuan: Optional[float] = Field(None, ge=0.0, le=10000.0, description="单次全景尽调报告标准单价 (元)")
    report_cache_days: Optional[int] = Field(None, ge=1, le=365, description="尽调报告数据快照及缓存有效期 (天)")
    enable_public_query: Optional[bool] = Field(None, description="是否开放企业公开工商数据免授权直接查询")
    sms_mock_mode: Optional[bool] = Field(None, description="短信服务是否走内置模拟验证码 (123456)")

DEFAULT_BUSINESS_CONFIG = {
    "default_gift_quota": 1,
    "report_price_yuan": 99.0,
    "report_cache_days": 30,
    "enable_public_query": True,
    "sms_mock_mode": True
}

@router.get("/business")
async def get_business_settings(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    获取平台全局业务运营规则 (注册赠送、报告定价、缓存有效期等)
    """
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "business_config"))
    setting = result.scalar_one_or_none()
    
    val = dict(DEFAULT_BUSINESS_CONFIG)
    if setting and isinstance(setting.value, dict):
        val.update(setting.value)

    return {
        "code": 0,
        "data": val
    }

@router.post("/business")
@router.put("/business")
async def update_business_settings(
    payload: BusinessConfigPayload,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    修改平台业务与运营规则 (写入 MySQL system_settings，立即热生效)
    """
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "business_config"))
    setting = result.scalar_one_or_none()

    current_val = dict(DEFAULT_BUSINESS_CONFIG)
    if setting and isinstance(setting.value, dict):
        current_val.update(setting.value)

    payload_dict = payload.model_dump(exclude_unset=True)
    current_val.update(payload_dict)

    if not setting:
        setting = SystemSetting(
            key="business_config",
            value=current_val,
            description="系统平台业务与运营规则配置 (注册赠送、报告计费、缓存策略等)"
        )
        db.add(setting)
    else:
        setting.value = current_val

    await db.commit()
    logger.info(f"[Admin Settings] 平台业务运营规则已更新: {current_val}")

    return {
        "code": 0,
        "message": "平台业务规则已更新并即刻生效",
        "data": current_val
    }


# ==============================================================================
# 4. 系统运行状态与配置全景概览 (Overview Dashboard)
# ==============================================================================

@router.get("/overview")
async def get_system_overview(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    系统管理与运营配置全景看板概览
    """
    # 1. AI 探针状态
    ai_cfg = load_ai_config()
    raw_key = ai_cfg.get("new_api_key", "")
    ai_summary = {
        "llm_provider": ai_cfg.get("llm_provider", "newapi"),
        "base_url": ai_cfg.get("new_api_base_url", "http://127.0.0.1:3000/v1"),
        "model": ai_cfg.get("new_api_model", "xyzp-ai"),
        "has_key": bool(raw_key and raw_key.strip() and raw_key != "sk-your-new-api-master-token"),
        "last_test_status": ai_cfg.get("last_test_status"),
        "last_test_latency_ms": ai_cfg.get("last_test_latency_ms"),
        "last_test_at": ai_cfg.get("last_test_at"),
    }

    # 2. 三方数据源状态汇总
    apis_result = await db.execute(select(SysThirdPartyApi))
    apis = apis_result.scalars().all()
    http_count = sum(1 for a in apis if a.call_mode == "http" and a.is_enabled)
    mock_count = sum(1 for a in apis if a.call_mode == "mock" and a.is_enabled)
    disabled_count = sum(1 for a in apis if not a.is_enabled)
    
    # 3. 业务配置快照
    biz_result = await db.execute(select(SystemSetting).where(SystemSetting.key == "business_config"))
    biz_setting = biz_result.scalar_one_or_none()
    biz_val = dict(DEFAULT_BUSINESS_CONFIG)
    if biz_setting and isinstance(biz_setting.value, dict):
        biz_val.update(biz_setting.value)

    return {
        "code": 0,
        "data": {
            "ai_gateway": ai_summary,
            "third_party_apis": {
                "total": len(apis),
                "http_active": http_count,
                "mock_active": mock_count,
                "disabled": disabled_count,
                "providers": [
                    {
                        "api_code": a.api_code,
                        "api_name": a.api_name,
                        "provider_name": a.provider_name,
                        "call_mode": a.call_mode,
                        "is_enabled": a.is_enabled
                    }
                    for a in apis
                ]
            },
            "business_rules": biz_val,
            "sms_gateway": {
                "provider": (await get_active_sms_config(db)).get("sms_provider", settings.SMS_PROVIDER),
                "sign": (await get_active_sms_config(db)).get("sign", settings.XCT_SMS_SIGN),
                "is_open": (await get_active_sms_config(db)).get("is_open", settings.XCT_SMS_IS_OPEN),
                "configured": bool((await get_active_sms_config(db)).get("name") and (await get_active_sms_config(db)).get("key"))
            },
            "version": settings.VERSION,
            "project_name": settings.PROJECT_NAME
        }
    }


# ==============================================================================
# 5. 享畅通短信网关配置与连通性测试 (SMS XCT Gateway Settings & Test)
# ==============================================================================

class SMSConfigUpdatePayload(BaseModel):
    sms_provider: Optional[str] = Field("xct", description="短信服务商: xct / mock")
    url: Optional[str] = Field(None, description="短信网关 URL")
    name: Optional[str] = Field(None, description="享畅通商户账号 (name)")
    key: Optional[str] = Field(None, description="享畅通商户密码/密钥 (key, 留空或掩码则保持不变)")
    sign: Optional[str] = Field(None, description="短信签名 (与商户账号密码统一配置，如: 成都享宇森云科技)")
    is_open: Optional[bool] = Field(None, description="是否开启真实短信发送")
    max_error_count: Optional[int] = Field(None, ge=1, le=20, description="最大输错容忍次数")
    expire_seconds: Optional[int] = Field(None, ge=60, le=1800, description="验证码有效时长 (秒)")

class SMSTestPayload(BaseModel):
    phone: str = Field(..., description="接收测试短信的 11 位手机号码")
    scene: Optional[str] = Field("login", description="业务场景: login, register, change_pwd, reset_pwd")

@router.get("/sms")
async def get_sms_settings(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    获取短信网关当前生效配置 (商户账号、密码、短信签名与发送状态)
    """
    from app.core.sms_config import get_active_sms_config
    from app.providers.xct_sms_provider import XCT_SMS_TEMPLATES

    cfg = await get_active_sms_config(db)
    raw_key = cfg.get("key") or ""
    return {
        "code": 0,
        "data": {
            "sms_provider": cfg.get("sms_provider", "xct"),
            "url": cfg.get("url", "http://api.xct.com/sms/send"),
            "name": cfg.get("name", ""),
            "key_masked": mask_api_key(raw_key),
            "has_key": bool(raw_key and raw_key.strip()),
            "sign": cfg.get("sign", "成都享宇森云科技"),
            "is_open": cfg.get("is_open", False),
            "max_error_count": cfg.get("max_error_count", 5),
            "expire_seconds": cfg.get("expire_seconds", 300),
            "available_templates": list(XCT_SMS_TEMPLATES.keys())
        }
    }

@router.post("/sms")
@router.put("/sms")
async def update_sms_settings(
    payload: SMSConfigUpdatePayload,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    统一保存/热更新短信网关配置 (商户账号、商户密码/密钥、短信签名、网关URL及开关)
    """
    from app.core.sms_config import save_sms_config
    from app.providers.xct_sms_provider import XCT_SMS_TEMPLATES

    update_dict = payload.model_dump(exclude_unset=True)
    updated_cfg = await save_sms_config(db, update_dict)
    raw_key = updated_cfg.get("key") or ""

    logger.info(
        f"[Admin Settings] 短信网关配置已更新 -> 账号: {updated_cfg.get('name')}, 签名: 【{updated_cfg.get('sign')}】, 开关: {updated_cfg.get('is_open')}"
    )

    return {
        "code": 0,
        "message": "短信配置 (商户账号、密码、短信签名) 已成功保存并即刻热生效",
        "data": {
            "sms_provider": updated_cfg.get("sms_provider"),
            "url": updated_cfg.get("url"),
            "name": updated_cfg.get("name"),
            "key_masked": mask_api_key(raw_key),
            "has_key": bool(raw_key and raw_key.strip()),
            "sign": updated_cfg.get("sign"),
            "is_open": updated_cfg.get("is_open"),
            "max_error_count": updated_cfg.get("max_error_count"),
            "expire_seconds": updated_cfg.get("expire_seconds"),
            "available_templates": list(XCT_SMS_TEMPLATES.keys())
        }
    }

@router.post("/sms/test")
async def test_sms_gateway(
    payload: SMSTestPayload,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    测试短信网关连通性与模版组装 (管理后台探针)
    """
    from app.services.sms_service import SMSService
    ok, msg, data = await SMSService.send_verification_code(
        session=db,
        phone=payload.phone,
        scene=payload.scene or "login",
        client_ip="ADMIN_CONSOLE"
    )
    return {
        "code": 0 if ok else 1,
        "message": msg,
        "data": data
    }

@router.get("/sms/logs")
async def list_sms_logs(
    page: int = 1,
    page_size: int = 20,
    phone: Optional[str] = None,
    scene: Optional[str] = None,
    status: Optional[str] = None,
    is_success: Optional[bool] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    获取短信验证码全量发送与核验审计日志 (支持手机号检索、场景过滤、成功/失败状态与分页)
    """
    from sqlalchemy import desc, func
    from app.models.sms_log import SMSLog
    from app.services.sms_service import mask_mobile

    query = select(SMSLog)
    count_query = select(func.count(SMSLog.id))

    if phone and phone.strip():
        phone_clean = phone.strip()
        query = query.where(SMSLog.phone.like(f"%{phone_clean}%"))
        count_query = count_query.where(SMSLog.phone.like(f"%{phone_clean}%"))

    if scene and scene.strip() and scene.strip() != "all":
        query = query.where(SMSLog.scene == scene.strip())
        count_query = count_query.where(SMSLog.scene == scene.strip())

    if status and status.strip() and status.strip() != "all":
        query = query.where(SMSLog.status == status.strip())
        count_query = count_query.where(SMSLog.status == status.strip())

    if is_success is not None:
        query = query.where(SMSLog.is_success == is_success)
        count_query = count_query.where(SMSLog.is_success == is_success)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    offset = (page - 1) * page_size

    # 优先按请求发起时间 request_time 倒序排列
    query = query.order_by(desc(SMSLog.request_time), desc(SMSLog.created_at)).offset(offset).limit(page_size)
    result = await db.execute(query)
    records = result.scalars().all()

    scene_names = {
        "login": "登录核验",
        "register": "新用户注册",
        "change_pwd": "修改密码",
        "reset_pwd": "找回密码",
        "auth": "授权核身",
        "bind": "手机换绑"
    }

    items = []
    for r in records:
        req_t = r.request_time or r.created_at
        items.append({
            "id": r.id,
            "phone": r.phone,
            "phone_masked": mask_mobile(r.phone),
            "code": r.code,
            "scene": r.scene,
            "scene_name": scene_names.get(r.scene, r.scene),
            "status": r.status,
            "is_success": bool(r.is_success),
            "provider": r.provider,
            "content": r.content or f"【成都享宇森云科技】验证码：{r.code} (历史存证)",
            "remark": r.remark or (r.error_message if not r.is_success else "发送成功"),
            "request_time": req_t.strftime("%Y-%m-%d %H:%M:%S") if req_t else None,
            "response_time": r.response_time.strftime("%Y-%m-%d %H:%M:%S") if r.response_time else None,
            "use_time_ms": r.use_time_ms or 0,
            "ip_address": r.ip_address,
            "error_message": r.error_message,
            "expire_at": r.expire_at.strftime("%Y-%m-%d %H:%M:%S") if r.expire_at else None,
            "verified_at": r.verified_at.strftime("%Y-%m-%d %H:%M:%S") if r.verified_at else None,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None,
        })

    return {
        "code": 0,
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }
    }

