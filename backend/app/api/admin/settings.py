import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from app.models.admin import AdminUser
from app.api.deps import get_current_admin
from app.core.ai_config import load_ai_config, save_ai_config, test_ai_connectivity

logger = logging.getLogger("edd.admin.settings")

router = APIRouter(prefix="/settings", tags=["系统与AI模型配置"])

def mask_api_key(key: str) -> str:
    if not key:
        return ""
    key = key.strip()
    if len(key) <= 8:
        return "••••••••"
    return f"{key[:6]}••••••••{key[-4:]}"

class AISettingsUpdatePayload(BaseModel):
    llm_provider: Optional[str] = Field("newapi", description="AI 提供商/模式")
    new_api_base_url: Optional[str] = Field("http://127.0.0.1:3000/v1", description="API 基础端点 URL")
    new_api_key: Optional[str] = Field(None, description="API Token 密钥 (留空或掩码则保持不变)")
    new_api_model: Optional[str] = Field("deepseek-chat", description="默认调用模型")
    temperature: Optional[float] = Field(0.3, ge=0.0, le=2.0, description="采样温度")
    timeout_seconds: Optional[int] = Field(60, ge=5, le=300, description="超时时间(秒)")
    is_enabled: Optional[bool] = Field(True, description="是否启用 AI 网关")

class AITestPayload(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None

@router.get("/ai")
async def get_ai_settings(admin: AdminUser = Depends(get_current_admin)):
    """
    获取当前系统 AI 网关与 Token 路由配置
    """
    cfg = load_ai_config()
    raw_key = cfg.get("new_api_key", "")
    
    return {
        "code": 0,
        "data": {
            "llm_provider": cfg.get("llm_provider", "newapi"),
            "new_api_base_url": cfg.get("new_api_base_url", "http://127.0.0.1:3000/v1"),
            "new_api_key_masked": mask_api_key(raw_key),
            "has_key": bool(raw_key and raw_key.strip() and raw_key != "sk-your-new-api-master-token"),
            "new_api_model": cfg.get("new_api_model", "deepseek-chat"),
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
    admin: AdminUser = Depends(get_current_admin)
):
    """
    保存并更新 AI 网关与 Token 路由配置 (即时生效)
    """
    current = load_ai_config()
    updates: Dict[str, Any] = {
        "llm_provider": payload.llm_provider,
        "new_api_base_url": (payload.new_api_base_url or "").strip().rstrip("/"),
        "new_api_model": payload.new_api_model,
        "temperature": payload.temperature,
        "timeout_seconds": payload.timeout_seconds,
        "is_enabled": payload.is_enabled
    }

    # 仅在提供了真实新 key 且非掩码时更新 Key
    if payload.new_api_key and "••••" not in payload.new_api_key and payload.new_api_key.strip():
        updates["new_api_key"] = payload.new_api_key.strip()

    saved_cfg = save_ai_config(updates)
    raw_key = saved_cfg.get("new_api_key", "")

    return {
        "code": 0,
        "message": "AI 网关与 Token 配置已成功更新并持久化",
        "data": {
            "llm_provider": saved_cfg.get("llm_provider"),
            "new_api_base_url": saved_cfg.get("new_api_base_url"),
            "new_api_key_masked": mask_api_key(raw_key),
            "has_key": bool(raw_key and raw_key.strip()),
            "new_api_model": saved_cfg.get("new_api_model"),
            "temperature": saved_cfg.get("temperature"),
            "timeout_seconds": saved_cfg.get("timeout_seconds"),
            "is_enabled": saved_cfg.get("is_enabled")
        }
    }

@router.post("/ai/test")
async def test_ai_settings(
    payload: Optional[AITestPayload] = None,
    admin: AdminUser = Depends(get_current_admin)
):
    """
    测试 AI 网关连通性与模型可用性
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
        provider=p_provider
    )

    return {
        "code": 0 if result.get("success") else 1,
        "message": "连通性测试通过" if result.get("success") else "连通性测试未通过",
        "data": result
    }
