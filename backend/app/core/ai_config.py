import os
import json
import time
import logging
from typing import Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger("edd.ai.config")

CONFIG_FILE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'ai_settings.json')
)

# 默认全局配置模版
DEFAULT_AI_CONFIG: Dict[str, Any] = {
    "llm_provider": getattr(settings, "LLM_PROVIDER", "newapi"),
    "new_api_base_url": getattr(settings, "NEW_API_BASE_URL", "http://127.0.0.1:3000/v1"),
    "new_api_key": getattr(settings, "NEW_API_KEY", ""),
    "new_api_model": getattr(settings, "NEW_API_MODEL", "deepseek-chat"),
    "temperature": 0.3,
    "timeout_seconds": getattr(settings, "NEW_API_TIMEOUT_SECONDS", 60),
    "is_enabled": True,
    "last_test_at": None,
    "last_test_status": None,
    "last_test_latency_ms": None,
    "last_test_msg": None
}

def load_ai_config() -> Dict[str, Any]:
    """
    动态加载持久化的 AI 模型与 Token 网关配置
    """
    config = dict(DEFAULT_AI_CONFIG)
    try:
        if os.path.exists(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                config.update(saved)
    except Exception as e:
        logger.error(f"[AIConfig] Failed to load ai_settings.json: {e}")
    
    return config

def save_ai_config(new_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    保存并持久化 AI 配置，使全站 AI 服务即时生效
    """
    current = load_ai_config()
    current.update(new_config)
    
    try:
        os.makedirs(os.path.dirname(CONFIG_FILE_PATH), exist_ok=True)
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(current, f, ensure_ascii=False, indent=2)
        logger.info(f"[AIConfig] AI configuration updated and persisted to {CONFIG_FILE_PATH}")
    except Exception as e:
        logger.error(f"[AIConfig] Failed to save ai_settings.json: {e}")
        raise e
        
    return current

async def test_ai_connectivity(
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    provider: Optional[str] = None
) -> Dict[str, Any]:
    """
    对指定的 AI 网关或当前配置发起真实心跳连通性测试
    """
    current = load_ai_config()
    target_base_url = (base_url or current.get("new_api_base_url") or "http://127.0.0.1:3000/v1").rstrip("/")
    target_api_key = api_key if api_key is not None else current.get("new_api_key", "")
    target_model = model or current.get("new_api_model") or "deepseek-chat"
    target_provider = provider or current.get("llm_provider") or "newapi"

    if not target_api_key or target_api_key.strip() == "":
        return {
            "success": False,
            "latency_ms": 0,
            "error": "API Key 不能为空，请先在输入框中填入令牌密钥",
            "model": target_model,
            "base_url": target_base_url
        }

    start_time = time.time()
    try:
        # 创建轻量级临时测试客户端
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
            max_tokens=15,
            temperature=0.1
        )
        
        latency = int((time.time() - start_time) * 1000)
        reply = response.choices[0].message.content if response.choices else "OK"
        
        # 记录测试成功状态
        save_ai_config({
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
        
        # 记录测试失败状态
        save_ai_config({
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
