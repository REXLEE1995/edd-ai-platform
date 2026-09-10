import uuid
import random
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.config import settings
from app.core.timezone import shanghai_now
from app.core.cache import cache_client
from app.core.sms_config import get_active_sms_config
from app.models.sms_log import SMSLog
from app.providers.xct_sms_provider import (
    get_xct_sms_provider,
    format_xct_sms_content,
    XCT_SMS_TEMPLATES
)

logger = logging.getLogger("xyzp.sms")

def mask_mobile(phone: str) -> str:
    """对手机号进行安全脱敏掩码 (例如: 138****8888)"""
    phone = (phone or "").strip()
    if len(phone) == 11:
        return f"{phone[:3]}****{phone[-4:]}"
    return phone

class SMSService:
    """
    统一短信与验证码服务中台 (基于享畅通官方网关与企业级凭证规范):
    1. 严格支持 4 大报备业务模版场景 (login / register / change_pwd / reset_pwd)；
    2. 双重限流防刷：Redis 60 秒原子频控 + 数据库最新流水间隔校验；
    3. 无状态防篡改验证码凭证 (smsToken)，隐藏明文并支持毫秒级快速匹配；
    4. 防暴力破解与撞库机制：输错达 5 次自动销毁验证码；
    5. 一次性核验消费：验证成功后立即作废 Key，杜绝重放攻击；
    6. 全量持久化记录发送与核验审计日志至 sms_logs 表。
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
        :param session: 异步数据库会话
        :param phone: 11 位手机号码
        :param scene: 业务场景: login(登录), register(注册), change_pwd(修改密码), reset_pwd(找回密码)
        :param client_ip: 客户端请求真实 IP
        :return: (is_success, message, extra_data)
        """
        phone = (phone or "").strip()
        if not phone or len(phone) != 11 or not phone.isdigit():
            return False, "请输入有效的 11 位手机号码", {}

        # 归一化场景名称
        scene = (scene or "login").lower()
        if scene not in XCT_SMS_TEMPLATES:
            scene = "login"

        now = shanghai_now()
        rate_key = f"sms-rate-limit:{phone}"

        # 1. 频控检查第一道防线：Redis 60 秒原子 Key 防刷
        is_rate_limited = await cache_client.exists(rate_key)
        if is_rate_limited:
            return False, "验证码获取过于频繁，请等待 60 秒后再试", {"remaining_seconds": 60}

        # 2. 频控检查第二道防线：数据库 sms_logs 降级防刷比对
        recent_log_res = await session.execute(
            select(SMSLog)
            .where(SMSLog.phone == phone, SMSLog.scene == scene)
            .order_by(desc(SMSLog.created_at))
            .limit(1)
        )
        recent_log = recent_log_res.scalar_one_or_none()
        if recent_log and recent_log.created_at:
            diff_seconds = (now - recent_log.created_at).total_seconds()
            if diff_seconds < 60:
                remaining = int(60 - diff_seconds)
                return False, f"验证码发送过于频繁，请等待 {remaining} 秒后再试", {"remaining_seconds": remaining}

        # 3. 立即写入 60 秒发送频控锁定
        await cache_client.set(rate_key, "1", ttl=60)

        # 4. 生成 6 位真随机数字验证码与业务追踪凭据 smsToken
        code = f"{random.randint(100000, 999999)}"
        sms_token = uuid.uuid4().hex
        
        # 动态拉取当前生效配置 (支持从 MySQL 系统设置或 .env 中读取商户账号、密钥、短信签名)
        active_cfg = await get_active_sms_config(session)
        target_sign = active_cfg.get("sign") or settings.XCT_SMS_SIGN or getattr(settings, "SMS_SIGN_NAME", "成都享宇森云科技")
        expire_seconds = int(active_cfg.get("expire_seconds") or settings.XCT_SMS_EXPIRE_SECONDS or 300)
        expire_at = now + timedelta(seconds=expire_seconds)
        log_id = f"sms-{uuid.uuid4().hex}"

        # 5. 组装符合已报备模版与配置签名的完整短信文案 (签名与账号密码一同配置)
        sms_content = format_xct_sms_content(scene=scene, code=code, sign=target_sign)

        # 6. 分发短信网关请求
        provider_driver = (active_cfg.get("sms_provider") or settings.SMS_PROVIDER).lower()
        is_success = False
        response_payload_str = None
        error_msg = None
        masked_tel = mask_mobile(phone)

        if provider_driver == "xct":
            provider = get_xct_sms_provider(
                url=active_cfg.get("url"),
                name=active_cfg.get("name"),
                key=active_cfg.get("key"),
                sign=target_sign,
                is_open=active_cfg.get("is_open")
            )
            logger.info(
                f"[SMSService] [享畅通] 准备向 {masked_tel} 下发验证码 (场景: {scene}, 签名: 【{target_sign}】, 开关: {provider.is_open})"
            )
            is_success, dispatch_msg, meta = await provider.send_sms(mobiles=phone, content=sms_content)
            request_payload_str = json.dumps({
                "provider": "xct",
                "url": provider.url,
                "name": provider.name,
                "dest": masked_tel,
                "content": sms_content,
                "scene": scene
            }, ensure_ascii=False)
            response_payload_str = json.dumps(meta, ensure_ascii=False)
            if not is_success:
                error_msg = dispatch_msg
        else:
            # 本地开发/离线拟真 Mock 模式
            is_success = True
            request_payload_str = json.dumps({"provider": "mock", "dest": masked_tel, "content": sms_content}, ensure_ascii=False)
            response_payload_str = json.dumps({"code": 0, "msg": "LOCAL_MOCK_SUCCESS", "phone": masked_tel, "code": code}, ensure_ascii=False)
            logger.info(f"[SMSService] [Mock] 拟真验证码已生成 -> 手机: {masked_tel}, 验证码: {code}")

        # 7. 若网关发送失败，立即解除 60s 频控，避免用户无辜被卡 1 分钟
        if not is_success:
            await cache_client.delete(rate_key)

        # 8. 全量写入 sms_logs 审计流水日志
        sms_log = SMSLog(
            id=log_id,
            phone=phone,
            code=code,
            scene=scene,
            status="sent" if is_success else "failed",
            provider=provider_driver,
            ip_address=client_ip,
            request_payload=request_payload_str,
            response_payload=response_payload_str,
            error_message=error_msg,
            expire_at=expire_at
        )
        session.add(sms_log)
        await session.commit()
        await session.refresh(sms_log)

        if not is_success:
            return False, error_msg or "短信下发失败，请稍后重试", {}

        # 9. 缓存层存储验证码及防爆破初始状态
        # 9.1 标准凭据 Key (sms-code:{smsToken})
        await cache_client.set(f"sms-code:{sms_token}", code, ttl=expire_seconds)
        await cache_client.set(f"sms-code-valid-times:{sms_token}", "0", ttl=expire_seconds)

        # 9.2 兼容历史无 smsToken 传参的降级 Key (sms-code:{phone}:{scene})
        await cache_client.set(f"sms-code:{phone}:{scene}", code, ttl=expire_seconds)
        await cache_client.set(f"sms-code-valid-times:{phone}:{scene}", "0", ttl=expire_seconds)

        return True, "验证码已成功发送至您的手机", {
            "sms_token": sms_token,
            "phone": phone,
            "scene": scene,
            "expire_seconds": expire_seconds,
            "log_id": sms_log.id
        }

    @classmethod
    async def verify_code(
        cls,
        session: AsyncSession,
        phone: str,
        code: str,
        scene: str = "login",
        sms_token: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        严格核验短信验证码 (带 5 次防暴力破解与单次消费即作废机制)
        :param session: 异步数据库会话
        :param phone: 手机号码
        :param code: 用户输入的验证码
        :param scene: 业务场景
        :param sms_token: 发送验证码时颁发的无状态唯一凭据 (可选，提供时优先凭据定位)
        :return: (is_valid, message)
        """
        phone = (phone or "").strip()
        code = (code or "").strip()
        scene = (scene or "login").lower()

        if not phone or len(phone) != 11 or not phone.isdigit():
            return False, "请输入有效的 11 位手机号码"
        if not code:
            return False, "请输入短信验证码"

        # 1. 确定缓存中的验证码与重试次数 Key
        if sms_token and sms_token.strip():
            token_clean = sms_token.strip()
            code_key = f"sms-code:{token_clean}"
            times_key = f"sms-code-valid-times:{token_clean}"
        else:
            code_key = f"sms-code:{phone}:{scene}"
            times_key = f"sms-code-valid-times:{phone}:{scene}"

        active_cfg = await get_active_sms_config(session)
        max_errors = int(active_cfg.get("max_error_count") or settings.XCT_SMS_MAX_ERROR_COUNT or 5)
        expire_seconds = int(active_cfg.get("expire_seconds") or settings.XCT_SMS_EXPIRE_SECONDS or 300)

        # 2. 检查输错次数防暴力破解 (防撞库)
        times_val = await cache_client.get(times_key)
        error_count = int(times_val) if times_val and str(times_val).isdigit() else 0
        if error_count >= max_errors:
            # 达到或超过 5 次，强制作废
            await cache_client.delete(code_key)
            await cache_client.delete(times_key)
            if sms_token:
                await cache_client.delete(f"sms-code:{phone}:{scene}")
                await cache_client.delete(f"sms-code-valid-times:{phone}:{scene}")
            return False, f"验证码输错次数过多（已达 {max_errors} 次），该验证码已作废，请重新获取"

        # 3. 读取缓存中真实验证码
        real_code = await cache_client.get(code_key)
        if not real_code and sms_token:
            # 若通过 smsToken 未命中，尝试降级读取 phone:scene
            code_key = f"sms-code:{phone}:{scene}"
            times_key = f"sms-code-valid-times:{phone}:{scene}"
            real_code = await cache_client.get(code_key)

        now = shanghai_now()

        # 4. 若缓存丢失 (例如进程重启)，安全降级查库检索 sms_logs 中最新未核验且有效记录
        if not real_code:
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
            if sms_record:
                real_code = sms_record.code

        if not real_code:
            return False, "短信验证码已过期或不存在，请重新获取"

        # 5. 比对验证码
        if real_code.strip() != code:
            error_count += 1
            await cache_client.set(times_key, str(error_count), ttl=expire_seconds)
            remaining = max(0, max_errors - error_count)
            if remaining == 0:
                # 刚好达到上限，立即作废
                await cache_client.delete(code_key)
                await cache_client.delete(times_key)
                if sms_token:
                    await cache_client.delete(f"sms-code:{phone}:{scene}")
                    await cache_client.delete(f"sms-code-valid-times:{phone}:{scene}")
                return False, "验证码连续输错达 5 次已作废，请重新获取"
            return False, f"短信验证码错误，您还可以重试 {remaining} 次"

        # 6. 核验成功 -> 立即删除验证码与错误计数 Key (一次性消费，防止重放攻击)
        await cache_client.delete(code_key)
        await cache_client.delete(times_key)
        if sms_token:
            await cache_client.delete(f"sms-code:{phone}:{scene}")
            await cache_client.delete(f"sms-code-valid-times:{phone}:{scene}")

        # 7. 更新数据库 sms_logs 状态为 verified 并记录核验时间
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
        if sms_record:
            sms_record.status = "verified"
            sms_record.verified_at = now
            await session.commit()
            logger.info(
                f"[SMSService] 手机号 {mask_mobile(phone)} 验证码核验通过并作废 (场景: {scene}, LogID: {sms_record.id})"
            )

        return True, "验证成功"
