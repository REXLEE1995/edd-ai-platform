import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("edd.providers")

class BaseProvider:
    """
    第三方外部数据源抽象基类 (Base Third-Party Data Provider)
    定义统一的模式开关、HTTP请求客户端包装、超时重试与异常降级策略
    """
    def __init__(self, mode: str = "mock", base_url: str = "", app_key: str = "", app_secret: str = "", timeout: int = 15):
        self.mode = mode.lower().strip()
        self.base_url = base_url.rstrip("/")
        self.app_key = app_key
        self.app_secret = app_secret
        self.timeout = timeout

    @property
    def is_mock_mode(self) -> bool:
        return self.mode == "mock" or not self.app_key

    async def _post_json(self, endpoint: str, payload: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        发起异步 POST JSON 请求（生产 HTTP 真实接口调用通道）
        """
        if self.is_mock_mode:
            raise RuntimeError("当前处于 MOCK 模式，请勿直接调用 _post_json")

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        req_headers = {
            "Content-Type": "application/json",
            "X-App-Key": self.app_key,
            "X-Timestamp": "",  # 可在各子类具体签名逻辑中补充
            **(headers or {})
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info(f"[3rd-Party HTTP POST] Requesting {url} with key {self.app_key[:4]}***")
                response = await client.post(url, json=payload, headers=req_headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            logger.error(f"[3rd-Party HTTP Error] Request failed for {url}: {str(exc)}")
            raise

    async def _get_json(self, endpoint: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        发起异步 GET 请求
        """
        if self.is_mock_mode:
            raise RuntimeError("当前处于 MOCK 模式，请勿直接调用 _get_json")

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        req_headers = {
            "Accept": "application/json",
            "X-App-Key": self.app_key,
            **(headers or {})
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info(f"[3rd-Party HTTP GET] Requesting {url}")
                response = await client.get(url, params=params, headers=req_headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            logger.error(f"[3rd-Party HTTP Error] Request failed for {url}: {str(exc)}")
            raise
