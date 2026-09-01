import uuid
import random
import json
import logging
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.config import settings
from app.models.sms_log import SMSLog

logger = logging.getLogger("edd.sms")

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

        now = datetime.utcnow()

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

        # 2. 生成 6 位随机验证码
        if settings.SMS_MODE == "mock":
            code = "123456" # 本地快速调试固定验证码
        else:
            code = f"{random.randint(100000, 999999)}"

        expire_at = now + timedelta(seconds=settings.SMS_CODE_EXPIRE_SECONDS)
        log_id = f"sms-{uuid.uuid4().hex}"
        
        request_payload_dict = {
            "account": settings.SMS_ACCOUNT,
            "mobile": phone,
            "sign": settings.SMS_SIGN_NAME,
            "template_code": settings.SMS_TEMPLATE_CODE,
            "params": {"code": code},
            "content": f"【{settings.SMS_SIGN_NAME}】您的验证码为：{code}，{settings.SMS_CODE_EXPIRE_SECONDS // 60}分钟内有效。请勿泄露给他人。"
        }
        request_payload_str = json.dumps(request_payload_dict, ensure_ascii=False)
        response_payload_str = None
        error_msg = None
        is_success = False

        # 3. 三方短信平台调用
        if settings.SMS_MODE == "http" and settings.SMS_GATEWAY_URL:
            logger.info(f"[SMSService] Calling 3rd-party SMS Gateway: {settings.SMS_GATEWAY_URL} for {phone}")
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    # 按照标准 HTTP POST 传递账号密码与短信内容
                    http_res = await client.post(
                        settings.SMS_GATEWAY_URL,
                        json={
                            "account": settings.SMS_ACCOUNT,
                            "password": settings.SMS_PASSWORD,
                            "mobile": phone,
                            "sign_name": settings.SMS_SIGN_NAME,
                            "template_code": settings.SMS_TEMPLATE_CODE,
                            "code": code,
                            "msg": request_payload_dict["content"]
                        }
                    )
                    response_payload_str = http_res.text
                    if http_res.status_code == 200:
                        is_success = True
                        logger.info(f"[SMSService] 3rd-party SMS sent successfully to {phone}: {response_payload_str}")
                    else:
                        error_msg = f"三方短信网关返回异常 HTTP {http_res.status_code}"
                        logger.error(f"[SMSService] Failed sending SMS: {error_msg}, body: {response_payload_str}")
            except Exception as e:
                error_msg = f"调用三方短信接口网络异常: {str(e)}"
                response_payload_str = str(e)
                logger.error(f"[SMSService] Exception calling SMS gateway: {e}")
        else:
            # Mock 模式：本地直接模拟成功
            is_success = True
            response_payload_str = json.dumps({"code": 0, "msg": "MOCK_SUCCESS", "phone": phone, "test_code": code}, ensure_ascii=False)
            logger.info(f"[SMSService] [Mock] 短信验证码已生成并发送至 {phone}: {code} (5分钟有效)")

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
            return True, "验证码已成功发送", {
                "log_id": sms_log.id,
                "phone": phone,
                "expire_seconds": settings.SMS_CODE_EXPIRE_SECONDS,
                "code": code if settings.SMS_MODE == "mock" else None  # 仅 Mock 模式返回明文 code 便于测试
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
        核验短信验证码：
        1. 优先查库校验 sms_logs 中未核验且在有效期内的记录；
        2. 核验通过后将记录标记为 verified 并记录核验时间戳；
        3. 开发/测试环境下兼容通用测试码 (123456 / 888888 / 666666)。
        """
        phone = (phone or "").strip()
        code = (code or "").strip()

        if not phone or len(phone) != 11:
            return False, "请输入有效的 11 位手机号码"
        if not code:
            return False, "请输入短信验证码"

        now = datetime.utcnow()

        # 查库检索最新一条未核验的验证码
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

        # 1. 匹配数据库真实下发的验证码
        if sms_record and sms_record.code == code:
            sms_record.status = "verified"
            sms_record.verified_at = now
            await session.commit()
            logger.info(f"[SMSService] 手机号 {phone} 验证码 {code} 核验成功 (LogID: {sms_record.id})")
            return True, "验证成功"

        # 2. 模拟/开发环境容错兜底码
        if settings.SMS_MODE == "mock" and code in ["123456", "888888", "666666"]:
            if sms_record:
                sms_record.status = "verified"
                sms_record.verified_at = now
                await session.commit()
            logger.info(f"[SMSService] [Mock] 手机号 {phone} 使用通用测试码 {code} 通过校验")
            return True, "验证成功"

        if sms_record:
            return False, "短信验证码错误，请重新输入"
        else:
            return False, "验证码已过期或不存在，请重新获取"
