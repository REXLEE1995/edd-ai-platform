import uuid
import random
import json
import logging
import httpx
from datetime import datetime, timedelta
from app.core.timezone import shanghai_now
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.config import settings
from app.models.sms_log import SMSLog

logger = logging.getLogger("xyzp.sms")

class SMSService:
    """
    统一短信服务中台：
    1. 支持配置化的三方短信网关 HTTP 调用 (账号、密码、网关地址、签名、模版均已抽离配置)；
    2. 支持本地开发 / 测试拟真 Mock 模式；
    3. 全量记录发送与核验存证日志至 sms_logs 表；
    4. 内置 60 秒防刷频控与 5 分钟有效期动态校验。
    """

    @classmethod
    async def send_verification_code(
        cls,
        session: AsyncSession,
        phone: str,
        scene: str = "login",
        client_ip: Optional[str] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        发送短信验证码并记录流水至 sms_logs 表
        """
        phone = (phone or "").strip()
        if not phone or len(phone) != 11 or not phone.isdigit():
            return False, "请输入有效的 11 位手机号码", {}

        now = shanghai_now()

        # 1. 频控检查：60 秒内同一手机号防重复发送
        recent_log_res = await session.execute(
            select(SMSLog)
            .where(SMSLog.phone == phone, SMSLog.scene == scene)
            .order_by(desc(SMSLog.created_at))
            .limit(1)
        )
        recent_log = recent_log_res.scalar_one_or_none()
        if recent_log:
            diff_seconds = (now - recent_log.created_at).total_seconds()
            if diff_seconds < 60:
                remaining = int(60 - diff_seconds)
                return False, f"验证码发送过于频繁，请等待 {remaining} 秒后再试", {"remaining_seconds": remaining}

        # 2. 生成真实 6 位随机数字验证码 (100000 ~ 999999)
        code = f"{random.randint(100000, 999999)}"

        expire_at = now + timedelta(seconds=settings.SMS_CODE_EXPIRE_SECONDS)
        log_id = f"sms-{uuid.uuid4().hex}"
        
        # 组装短信模版内容
        sign_prefix = f"【{settings.SMS_SIGN_NAME}】" if not settings.SMS_SIGN_NAME.startswith("【") else settings.SMS_SIGN_NAME
        sms_content = f"{sign_prefix}您的验证码为：{code}，{settings.SMS_CODE_EXPIRE_SECONDS // 60}分钟内有效。如非本人操作请忽略。"

        request_payload_dict = {
            "account": settings.SMS_ACCOUNT,
            "password": settings.SMS_PASSWORD,
            "mobile": phone,
            "phone": phone,
            "sign_name": settings.SMS_SIGN_NAME,
            "template_code": settings.SMS_TEMPLATE_CODE,
            "params": {"code": code},
            "code": code,
            "content": sms_content,
            "msg": sms_content
        }
        request_payload_str = json.dumps(request_payload_dict, ensure_ascii=False)
        response_payload_str = None
        error_msg = None
        is_success = False

        # 3. 三方短信平台调用
        if settings.SMS_MODE == "http" and settings.SMS_GATEWAY_URL:
            logger.info(f"[SMSService] [HTTP] 正在调用三方短信网关: {settings.SMS_GATEWAY_URL} 向手机号 {phone} 发送随机验证码 {code}")
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    # 标准 HTTP POST 提交 JSON 报文
                    http_res = await client.post(
                        settings.SMS_GATEWAY_URL,
                        json=request_payload_dict,
                        headers={"Content-Type": "application/json; charset=utf-8"}
                    )
                    response_payload_str = http_res.text
                    if http_res.status_code == 200:
                        is_success = True
                        logger.info(f"[SMSService] 三方短信网关下发成功 -> 手机号: {phone}, 网关响应: {response_payload_str}")
                    else:
                        error_msg = f"三方短信网关返回异常 HTTP {http_res.status_code}: {response_payload_str}"
                        logger.error(f"[SMSService] 短信下发失败: {error_msg}")
            except Exception as e:
                error_msg = f"调用三方短信接口网络异常: {str(e)}"
                response_payload_str = str(e)
                logger.error(f"[SMSService] 三方短信网关调用异常: {e}")
        else:
            # 本地拟真模式 (生成真实随机码并记录控制台)
            is_success = True
            response_payload_str = json.dumps({"code": 0, "msg": "LOCAL_RANDOM_SMS_GENERATED", "phone": phone, "random_code": code}, ensure_ascii=False)
            logger.info(f"[SMSService] [Local] 真实随机短信验证码已生成 -> 手机号: {phone}, 验证码: {code} (5分钟有效)")

        # 4. 存入 sms_logs 数据库存证表
        sms_log = SMSLog(
            id=log_id,
            phone=phone,
            code=code,
            scene=scene,
            status="sent" if is_success else "failed",
            provider=settings.SMS_MODE,
            ip_address=client_ip,
            request_payload=request_payload_str,
            response_payload=response_payload_str,
            error_message=error_msg,
            expire_at=expire_at
        )
        session.add(sms_log)
        await session.commit()
        await session.refresh(sms_log)

        if is_success:
            return True, "验证码已成功发送至您的手机", {
                "log_id": sms_log.id,
                "phone": phone,
                "expire_seconds": settings.SMS_CODE_EXPIRE_SECONDS
            }
        else:
            return False, error_msg or "短信发送失败，请稍后重试", {}

    @classmethod
    async def verify_code(
        cls,
        session: AsyncSession,
        phone: str,
        code: str,
        scene: str = "login"
    ) -> Tuple[bool, str]:
        """
        严格核验短信验证码：
        1. 查库检索 sms_logs 中该手机号未核验且在有效期内的最新流水；
        2. 严格核验真实随机验证码；
        3. 核验通过后将记录标记为 verified 并记录核验时间戳。
        """
        phone = (phone or "").strip()
        code = (code or "").strip()

        if not phone or len(phone) != 11:
            return False, "请输入有效的 11 位手机号码"
        if not code:
            return False, "请输入短信验证码"

        now = shanghai_now()

        # 查库检索最新一条未核验且未失效的验证码
        result = await session.execute(
            select(SMSLog)
            .where(
                SMSLog.phone == phone,
                SMSLog.scene == scene,
                SMSLog.status == "sent",
                SMSLog.expire_at >= now
            )
            .order_by(desc(SMSLog.created_at))
            .limit(1)
        )
        sms_record = result.scalar_one_or_none()

        # 匹配真实下发的随机验证码
        if sms_record and sms_record.code == code:
            sms_record.status = "verified"
            sms_record.verified_at = now
            await session.commit()
            logger.info(f"[SMSService] 手机号 {phone} 真实随机验证码 {code} 成功核验通过 (LogID: {sms_record.id})")
            return True, "验证成功"

        if sms_record:
            return False, "短信验证码错误，请输入手机收到的最新验证码"
        else:
            return False, "验证码已失效或尚未获取，请重新点击获取验证码"
