import time
import urllib.parse
import hashlib
import logging
from datetime import datetime
from typing import Tuple, Dict, Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("xyzp.sms.xct")

# -------------------------------------------------------------
# 享畅通已过审的 4 套标准短信文案模版 (严格与报备文字逐字对齐)
# -------------------------------------------------------------
XCT_SMS_TEMPLATES: Dict[str, str] = {
    "login": "您正在进行登录操作，验证码为：{code}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！",
    "register": "您正在进行注册账号操作，验证码为：{code}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！",
    "change_pwd": "您正在进行修改密码操作，验证码为：{code}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！",
    "reset_pwd": "您正在进行找回密码操作，验证码为：{code}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！",
}

def generate_xct_signature(key: str, seed: str) -> str:
    """
    计算享畅通双重 32 位小写 MD5 动态加盐签名:
    1. md5Key = MD5(key).lower()
    2. signKey = MD5(md5Key + seed).lower()
    """
    key_str = key or ""
    seed_str = seed or ""
    first_md5 = hashlib.md5(key_str.encode("utf-8")).hexdigest().lower()
    sign_key = hashlib.md5((first_md5 + seed_str).encode("utf-8")).hexdigest().lower()
    return sign_key

def format_xct_sms_content(scene: str, code: str, sign: Optional[str] = None) -> str:
    """
    拼装符合短信报备规范的完整短信正文 (【签名】+ 模板正文)
    优先采用传入签名或配置中的 XCT_SMS_SIGN / SMS_SIGN_NAME，自动清洗中英文括号防双括号
    """
    target_sign = sign or settings.XCT_SMS_SIGN or getattr(settings, "SMS_SIGN_NAME", "成都享宇森云科技")
    clean_sign = (target_sign or "").strip().lstrip("【").rstrip("】").lstrip("[").rstrip("]")
    if not clean_sign:
        clean_sign = "成都享宇森云科技"
    template = XCT_SMS_TEMPLATES.get(scene, XCT_SMS_TEMPLATES["login"])
    body = template.format(code=code)
    return f"【{clean_sign}】{body}"

class XctSmsProvider:
    """
    享畅通短信网关官方适配器 (XCT SMS Provider)
    实现 HTTP GET 协议通信、动态时间戳盐、双重 MD5 鉴权、URL 转义与开发挡板拦截
    """

    def __init__(
        self,
        url: Optional[str] = None,
        name: Optional[str] = None,
        key: Optional[str] = None,
        sign: Optional[str] = None,
        is_open: Optional[bool] = None,
        timeout: int = 10
    ):
        self.url = (url or settings.XCT_SMS_URL or "http://api.xct.com/sms/send").rstrip("?")
        self.name = name or settings.XCT_SMS_NAME
        self.key = key or settings.XCT_SMS_KEY
        self.sign = sign or settings.XCT_SMS_SIGN or getattr(settings, "SMS_SIGN_NAME", "成都享宇森云科技")
        self.is_open = settings.XCT_SMS_IS_OPEN if is_open is None else is_open
        self.timeout = timeout

    async def send_sms(self, mobiles: str, content: str) -> Tuple[bool, str, Dict[str, Any]]:
        """
        向享畅通短信网关发送短信
        :param mobiles: 手机号码 (支持逗号分隔群发)
        :param content: 完整短信文本 (包含【成都享宇森云科技】签名)
        :return: (is_success, message, extra_meta)
        """
        mobiles = mobiles.strip()
        start_time = time.time()

        # 1. 挡板检查 (开发/测试环境或显式关闭时拦截，不耗费资费)
        if not self.is_open:
            logger.info(
                f"[享畅通短信-挡板拦截] 模拟发送成功 -> 接收号码: {mobiles}, 短信内容: {content}"
            )
            return True, "【挡板模式】模拟发送成功", {
                "is_mock": True,
                "use_time_ms": 1,
                "mobiles": mobiles,
                "content": content
            }

        # 2. 真实发送参数校验
        if not self.name or not self.key:
            err_msg = "享畅通商户账号(name)或密钥(key)未配置，无法向生产网关发起请求"
            logger.error(f"[享畅通短信] {err_msg}")
            return False, err_msg, {"is_mock": False, "error": err_msg}

        try:
            # 3. 生成当前时间戳 seed (yyyyMMddHHmmss)
            seed = datetime.now().strftime("%Y%m%d%H%M%S")

            # 4. 计算双重 MD5 鉴权动态密钥
            sign_key = generate_xct_signature(self.key, seed)

            # 5. URL 编码短信内容 (UTF-8)
            encoded_content = urllib.parse.quote(content, encoding="utf-8")

            # 6. 构造请求完整 URL
            full_url = (
                f"{self.url}?name={self.name}&seed={seed}&key={sign_key}&dest={mobiles}&content={encoded_content}"
            )
            logger.debug(f"[享畅通短信] 发起 HTTP GET 请求 -> name: {self.name}, seed: {seed}, dest: {mobiles}")

            # 7. 异步发起 HTTP GET 请求
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(full_url)
                use_time_ms = int((time.time() - start_time) * 1000)
                resp_text = resp.text

                logger.info(
                    f"[享畅通短信] 网关响应 (HTTP {resp.status_code}, 耗时 {use_time_ms}ms): {resp_text}"
                )

                # 8. 判定结果是否包含 "success"
                if "success" in resp_text.lower():
                    return True, "短信发送成功", {
                        "is_mock": False,
                        "status_code": resp.status_code,
                        "response_payload": resp_text,
                        "use_time_ms": use_time_ms
                    }
                else:
                    return False, f"享畅通网关返回失败: {resp_text}", {
                        "is_mock": False,
                        "status_code": resp.status_code,
                        "response_payload": resp_text,
                        "use_time_ms": use_time_ms
                    }

        except Exception as exc:
            use_time_ms = int((time.time() - start_time) * 1000)
            logger.error(f"[享畅通短信] 发送网络异常: {exc}", exc_info=True)
            return False, f"调用享畅通网关发生网络异常: {str(exc)}", {
                "is_mock": False,
                "error": str(exc),
                "use_time_ms": use_time_ms
            }

def get_xct_sms_provider(
    url: Optional[str] = None,
    name: Optional[str] = None,
    key: Optional[str] = None,
    sign: Optional[str] = None,
    is_open: Optional[bool] = None
) -> XctSmsProvider:
    """
    获取享畅通短信 Provider 单例/实例
    """
    return XctSmsProvider(
        url=url,
        name=name,
        key=key,
        sign=sign,
        is_open=is_open
    )
