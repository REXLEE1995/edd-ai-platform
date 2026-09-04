import time
import logging
from typing import Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger("xyzp.ai.config")

# 内存保留的最新诊断探针状态
_DIAGNOSTIC_STATE: Dict[str, Any] = {
    "last_test_at": None,
    "last_test_status": None,
    "last_test_latency_ms": None,
    "last_test_msg": None
}

def load_ai_config() -> Dict[str, Any]:
    """
    加载当前系统的 AI 网关配置 (以 .env 配置文件为单一真理源)
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

async def save_ai_config(new_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    兼容保存接口：系统已采用 .env 配置文件纳管，仅记录探针诊断结果
    """
    for k in ["last_test_at", "last_test_status", "last_test_latency_ms", "last_test_msg"]:
        if k in new_config:
            _DIAGNOSTIC_STATE[k] = new_config[k]
    return load_ai_config()

async def test_ai_connectivity(
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    provider: Optional[str] = None
) -> Dict[str, Any]:
    """
    核心健康诊断探针：即时测试与 New API 统一网关的网络连通性与响应耗时
    """
    current = load_ai_config()
    target_base_url = (base_url or current.get("new_api_base_url") or "http://192.168.110.234:3000/v1").rstrip("/")
    target_api_key = api_key if api_key is not None else current.get("new_api_key", "")
    target_model = model or current.get("new_api_model") or "xyzp-ai"

    if not target_api_key or target_api_key.strip() == "":
        return {
            "success": False,
            "latency_ms": 0,
            "error": "API Key 不能为空，请检查 .env 中的 NEW_API_KEY 配置",
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
        _DIAGNOSTIC_STATE.update({
            "last_test_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "last_test_status": "success",
            "last_test_latency_ms": latency,
            "last_test_msg": f"连通测试成功 (响应: {reply.strip()[:30]})"
        })
        
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
        
        # 记录异常状态
        _DIAGNOSTIC_STATE.update({
            "last_test_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "last_test_status": "failed",
            "last_test_latency_ms": latency,
            "last_test_msg": f"连通测试失败: {error_msg[:120]}"
        })
        
        return {
            "success": False,
            "latency_ms": latency,
            "error": error_msg,
            "model": target_model,
            "base_url": target_base_url
        }
