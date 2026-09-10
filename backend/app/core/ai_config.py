import time
import logging
from typing import Dict, Any, Optional
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.system_setting import SystemSetting

logger = logging.getLogger("xyzp.ai.config")

# 内存保留的最新配置与诊断状态缓存
_ACTIVE_AI_CACHE: Optional[Dict[str, Any]] = None

_DIAGNOSTIC_STATE: Dict[str, Any] = {
    "last_test_at": None,
    "last_test_status": None,
    "last_test_latency_ms": None,
    "last_test_msg": None
}

def get_default_ai_config() -> Dict[str, Any]:
    """
    默认配置：从环境变量与 settings 读取
    """
    return {
        "llm_provider": getattr(settings, "LLM_PROVIDER", "newapi"),
        "new_api_base_url": getattr(settings, "NEW_API_BASE_URL", "http://192.168.110.234:3000/v1"),
        "new_api_key": getattr(settings, "NEW_API_KEY", ""),
        "new_api_model": getattr(settings, "NEW_API_MODEL", "xyzp-ai"),
        "temperature": 0.3,
        "timeout_seconds": getattr(settings, "NEW_API_TIMEOUT_SECONDS", 60),
        "is_enabled": True,
        **_DIAGNOSTIC_STATE
    }

def _sync_read_db_ai_config() -> Optional[Dict[str, Any]]:
    try:
        import sqlite3
        import json
        import os
        from app.core.config import db_path_str
        if os.path.exists(db_path_str):
            conn = sqlite3.connect(db_path_str, timeout=5)
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM system_settings WHERE key = ?", ("ai_config",))
                row = cursor.fetchone()
                if row and row[0]:
                    val = row[0]
                    if isinstance(val, str):
                        return json.loads(val)
                    elif isinstance(val, dict):
                        return val
            finally:
                conn.close()
    except Exception as e:
        logger.debug(f"[ai_config] 同步加载持久层 AI 配置跳过: {e}")
    return None

def load_ai_config() -> Dict[str, Any]:
    """
    同步加载接口 (供 AIService 等快速读取已热加载的配置)
    优先读取内存缓存，冷启动时直读数据库持久化配置
    """
    global _ACTIVE_AI_CACHE
    if _ACTIVE_AI_CACHE is not None:
        return _ACTIVE_AI_CACHE

    cfg = get_default_ai_config()
    db_val = _sync_read_db_ai_config()
    if db_val and isinstance(db_val, dict):
        for k, v in db_val.items():
            if v is not None and str(v).strip() != "":
                cfg[k] = v
        _ACTIVE_AI_CACHE = cfg
        return cfg

    return cfg

async def get_active_ai_config(db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    获取当前生效的 AI 大模型配置
    优先级: 数据库 system_settings(key="ai_config") > 环境变量 (.env)
    """
    global _ACTIVE_AI_CACHE
    cfg = get_default_ai_config()
    if not db:
        if _ACTIVE_AI_CACHE is not None:
            return _ACTIVE_AI_CACHE
        return cfg

    try:
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == "ai_config"))
        record = res.scalar_one_or_none()
        if record and isinstance(record.value, dict):
            for k, v in record.value.items():
                if v is not None and str(v).strip() != "":
                    cfg[k] = v
            # 保留诊断状态
            for dk in ["last_test_at", "last_test_status", "last_test_latency_ms", "last_test_msg"]:
                if record.value.get(dk):
                    cfg[dk] = record.value[dk]
                elif _DIAGNOSTIC_STATE.get(dk):
                    cfg[dk] = _DIAGNOSTIC_STATE[dk]
    except Exception as e:
        logger.warning(f"[ai_config] 读取数据库配置失败，使用默认配置: {e}")

    _ACTIVE_AI_CACHE = cfg
    return cfg

async def save_ai_config(db: AsyncSession, new_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    保存/热更新 AI 大模型配置至数据库 system_settings
    """
    global _ACTIVE_AI_CACHE
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == "ai_config"))
    record = res.scalar_one_or_none()

    current_val = await get_active_ai_config(db)
    for k, v in new_data.items():
        if v is not None:
            # 掩码防覆盖：如果传入包含掩码的 key，则保留原密钥
            if k == "new_api_key" and isinstance(v, str) and ("••••" in v or v.strip() == ""):
                continue
            current_val[k] = v

    if not record:
        record = SystemSetting(
            key="ai_config",
            value=current_val,
            description="全局 AI 模型网关与调度配置"
        )
        db.add(record)
    else:
        record.value = current_val

    await db.commit()
    await db.refresh(record)
    _ACTIVE_AI_CACHE = current_val
    return current_val

async def test_ai_connectivity(
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    provider: Optional[str] = None,
    db: Optional[AsyncSession] = None
) -> Dict[str, Any]:
    """
    核心健康诊断探针：即时测试与 AI 统一网关的网络连通性与响应耗时
    """
    global _ACTIVE_AI_CACHE
    current = await get_active_ai_config(db) if db else load_ai_config()
    target_base_url = (base_url or current.get("new_api_base_url") or "http://192.168.110.234:3000/v1").rstrip("/")
    target_api_key = api_key if (api_key is not None and "••••" not in api_key) else current.get("new_api_key", "")
    target_model = model or current.get("new_api_model") or "xyzp-ai"

    if not target_api_key or target_api_key.strip() == "":
        return {
            "success": False,
            "latency_ms": 0,
            "error": "API Key 令牌不能为空，请填写并保存有效的 API Key",
            "model": target_model,
            "base_url": target_base_url
        }

    start_time = time.time()
    try:
        client = AsyncOpenAI(
            api_key=target_api_key.strip(),
            base_url=target_base_url,
            timeout=15.0
        )
        
        response = await client.chat.completions.create(
            model=target_model,
            messages=[
                {"role": "system", "content": "You are an AI diagnostic probe."},
                {"role": "user", "content": "Ping"}
            ],
            max_tokens=50,
            temperature=0.1
        )
        
        latency = int((time.time() - start_time) * 1000)
        msg = response.choices[0].message if response.choices else None
        reply = (msg.content if msg and msg.content else getattr(msg, "reasoning", None) or "OK") if msg else "OK"
        
        # 记录探针诊断结果
        diag_update = {
            "last_test_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "last_test_status": "success",
            "last_test_latency_ms": latency,
            "last_test_msg": f"连通测试成功 (响应: {reply.strip()[:30]})"
        }
        _DIAGNOSTIC_STATE.update(diag_update)
        if _ACTIVE_AI_CACHE:
            _ACTIVE_AI_CACHE.update(diag_update)
        
        return {
            "success": True,
            "latency_ms": latency,
            "reply": reply.strip(),
            "model": target_model,
            "base_url": target_base_url
        }
        
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        
        diag_update = {
            "last_test_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "last_test_status": "failed",
            "last_test_latency_ms": latency,
            "last_test_msg": f"连通测试失败: {error_msg[:120]}"
        }
        _DIAGNOSTIC_STATE.update(diag_update)
        if _ACTIVE_AI_CACHE:
            _ACTIVE_AI_CACHE.update(diag_update)
        
        return {
            "success": False,
            "latency_ms": latency,
            "error": error_msg,
            "model": target_model,
            "base_url": target_base_url
        }

