import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
import logging
from app.core.security import create_access_token, get_password_hash, verify_password, decode_access_token
from app.models.user import User
from app.models.quota import QuotaTransaction
from app.models.system_setting import SystemSetting
from app.services.sms_service import SMSService

logger = logging.getLogger("xyzp.auth")
from app.schemas.auth import (
    LoginWithPhoneRequest, 
    RegisterWithPhoneRequest,
    ResetPasswordRequest,
    TokenResponse, 
    UserInfoSchema, 
    ProfileUpdateRequest,
    ChangePasswordRequest
)
from app.api.deps import get_current_user, security

router = APIRouter(prefix="/auth", tags=["用户认证与个人中心"])

class SendSMSRequest(BaseModel):
    phone: str
    scene: Optional[str] = "login" # 业务场景: login(登录), register(注册), change_pwd(修改密码), reset_pwd(找回密码)

@router.post("/send-code")
async def send_sms_code(
    req: SendSMSRequest, 
    request: Request, 
    db: AsyncSession = Depends(get_db)
):
    """
    发送短信验证码统一网关接口：
    1. 支持享畅通 4 套过审模版动态匹配 (login / register / change_pwd / reset_pwd)；
    2. 返回无状态业务防刷凭证 sms_token；
    3. 全量流水存证入库 (sms_logs)。
    """
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else None)
    ok, msg, data = await SMSService.send_verification_code(
        session=db,
        phone=req.phone,
        scene=req.scene or "login",
        client_ip=client_ip
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"code": 0, "message": msg, "data": data}

@router.post("/login", response_model=TokenResponse)
async def login_with_phone(req: LoginWithPhoneRequest, db: AsyncSession = Depends(get_db)):
    """
    手机号 + 验证码 登录通道 (支持场景: login)：
    1. 严格核验短信验证码与防刷防重放凭据 (sms_token)；
    2. 兼容历史无 sms_token 的直接校验；
    3. 新手机号自动免注册初始化账号并赠送体验额度；
    4. 核验通过后验证码单次消费立即作废。
    """
    phone = req.phone.strip()
    code = (req.code or "").strip()

    # 调用短信中台核验验证码 (场景: login)
    is_valid, verify_msg = await SMSService.verify_code(
        session=db,
        phone=phone,
        code=code,
        scene="login",
        sms_token=req.sms_token
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=verify_msg)

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    
    is_new_user = False
    gift_quota = 1
    if not user:
        is_new_user = True
        # 动态从系统业务配置表读取新用户首次登录赠送额度 (支持运营在管理后台随时调配)
        try:
            biz_cfg_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "business_config"))
            biz_setting = biz_cfg_res.scalar_one_or_none()
            if biz_setting and isinstance(biz_setting.value, dict):
                gift_quota = int(biz_setting.value.get("default_gift_quota", 1))
        except Exception as e:
            logger.warning(f"[Auth] 读取 business_config 失败，采用默认赠送 1 次: {e}")

        user = User(
            id=f"user-{uuid.uuid4().hex[:12]}",
            phone=phone,
            hashed_password=get_password_hash(req.password or "123456"),
            company_name=f"企业用户_{phone[-4:]}",
            balance_quota=gift_quota,
            total_recharge_quota=0,
            total_consumed_quota=0,
            total_gifted_quota=gift_quota,
            status="active",
            tags=["新注册用户", "赠送体验"] if gift_quota > 0 else ["新注册用户"]
        )
        db.add(user)
        
        # 若运营配置赠送额度大于 0，则记录赠送额度流水
        if gift_quota > 0:
            tx = QuotaTransaction(
                tx_no=f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
                user_id=user.id,
                user_phone=user.phone,
                user_company=user.company_name,
                change_type="gift",
                amount=gift_quota,
                balance_before=0,
                balance_after=gift_quota,
                ref_type="system",
                ref_id="REG_GIFT",
                operator_type="system",
                operator_name="SYSTEM",
                remark=f"新用户首次登录系统赠送 {gift_quota} 次免费体验额度"
            )
            db.add(tx)
        await db.commit()
        await db.refresh(user)
    else:
        if user.status == "frozen":
            raise HTTPException(status_code=403, detail="该账户已被冻结，请联系平台客服解冻")

    token = create_access_token(subject=user.id, token_type="user")
    success_msg = f"注册并登录成功！已为您赠送 {gift_quota} 次免费尽调额度" if (is_new_user and gift_quota > 0) else ("注册并登录成功！" if is_new_user else "登录成功，欢迎回到工作台！")

    return {
        "access_token": token,
        "token_type": "bearer",
        "is_new_user": is_new_user,
        "message": success_msg,
        "user": {
            "id": user.id,
            "phone": user.phone,
            "company_name": user.company_name,
            "balance_quota": user.balance_quota,
            "total_recharge_quota": user.total_recharge_quota,
            "total_consumed_quota": user.total_consumed_quota,
            "total_gifted_quota": user.total_gifted_quota,
            "status": user.status,
            "tags": user.tags or []
        }
    }

@router.post("/register", response_model=TokenResponse)
async def register_with_phone(req: RegisterWithPhoneRequest, db: AsyncSession = Depends(get_db)):
    """
    独立注册通道 (支持场景: register)：
    1. 针对场景 'register' 核验短信验证码；
    2. 若已存在账号则友好提示已注册并直接登录；
    3. 若未注册则初始化账号并发放新手体验额度。
    """
    phone = req.phone.strip()
    code = req.code.strip()

    # 核验场景: register
    is_valid, verify_msg = await SMSService.verify_code(
        session=db,
        phone=phone,
        code=code,
        scene="register",
        sms_token=req.sms_token
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=verify_msg)

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    is_new_user = False
    gift_quota = 1
    if not user:
        is_new_user = True
        try:
            biz_cfg_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "business_config"))
            biz_setting = biz_cfg_res.scalar_one_or_none()
            if biz_setting and isinstance(biz_setting.value, dict):
                gift_quota = int(biz_setting.value.get("default_gift_quota", 1))
        except Exception as e:
            logger.warning(f"[Auth] 读取 business_config 失败: {e}")

        user = User(
            id=f"user-{uuid.uuid4().hex[:12]}",
            phone=phone,
            hashed_password=get_password_hash(req.password or "123456"),
            company_name=req.company_name or f"企业用户_{phone[-4:]}",
            balance_quota=gift_quota,
            total_recharge_quota=0,
            total_consumed_quota=0,
            total_gifted_quota=gift_quota,
            status="active",
            tags=["新注册用户", "赠送体验"] if gift_quota > 0 else ["新注册用户"]
        )
        db.add(user)
        if gift_quota > 0:
            tx = QuotaTransaction(
                tx_no=f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
                user_id=user.id,
                user_phone=user.phone,
                user_company=user.company_name,
                change_type="gift",
                amount=gift_quota,
                balance_before=0,
                balance_after=gift_quota,
                ref_type="system",
                ref_id="REG_GIFT",
                operator_type="system",
                operator_name="SYSTEM",
                remark=f"新用户注册赠送 {gift_quota} 次免费体验额度"
            )
            db.add(tx)
        await db.commit()
        await db.refresh(user)
    else:
        if user.status == "frozen":
            raise HTTPException(status_code=403, detail="该账户已被冻结，请联系客服处理")

    token = create_access_token(subject=user.id, token_type="user")
    return {
        "access_token": token,
        "token_type": "bearer",
        "is_new_user": is_new_user,
        "message": "注册成功并已登录" if is_new_user else "该手机号已注册，已为您完成登录",
        "user": {
            "id": user.id,
            "phone": user.phone,
            "company_name": user.company_name,
            "balance_quota": user.balance_quota,
            "total_recharge_quota": user.total_recharge_quota,
            "total_consumed_quota": user.total_consumed_quota,
            "total_gifted_quota": user.total_gifted_quota,
            "status": user.status,
            "tags": user.tags or []
        }
    }

@router.get("/me", response_model=UserInfoSchema)
async def get_current_user_profile(user: User = Depends(get_current_user)):
    """
    获取当前登录用户画像与剩余额度
    """
    return UserInfoSchema(
        id=user.id,
        phone=user.phone,
        company_name=user.company_name,
        credit_code=user.credit_code,
        balance_quota=user.balance_quota,
        total_recharge_quota=user.total_recharge_quota,
        total_consumed_quota=user.total_consumed_quota,
        total_gifted_quota=user.total_gifted_quota,
        status=user.status,
        tags=user.tags or [],
        created_at=user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else None
    )

@router.post("/profile/update")
async def update_user_profile(
    req: ProfileUpdateRequest, 
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    更新个人中心/企业认证信息
    """
    if req.company_name is not None:
        user.company_name = req.company_name.strip()
    if req.credit_code is not None:
        user.credit_code = req.credit_code.strip()
    
    await db.commit()
    await db.refresh(user)
    return {
        "code": 0,
        "message": "企业资料更新成功",
        "data": {
            "company_name": user.company_name,
            "credit_code": user.credit_code
        }
    }

@router.post("/change-password")
async def change_user_password(
    req: ChangePasswordRequest, 
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    修改密码接口 (支持场景: change_pwd)：
    1. 若提供了短信验证码，走短信核身验证 (scene='change_pwd')；
    2. 若未提供短信验证码，核验原密码 (old_password)；
    3. 重设高强度哈希新密码。
    """
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码长度不能少于6位")

    # 优先支持短信验证码场景
    if req.code:
        is_valid, msg = await SMSService.verify_code(
            session=db,
            phone=user.phone,
            code=req.code,
            scene="change_pwd",
            sms_token=req.sms_token
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)
    elif req.old_password and user.hashed_password:
        if not verify_password(req.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="原密码不正确")
    else:
        raise HTTPException(status_code=400, detail="请提供原密码或短信验证码进行身份核身")

    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"code": 0, "message": "密码修改成功，请牢记新密码"}

@router.post("/reset-password")
async def reset_user_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    找回/重置密码接口 (支持场景: reset_pwd)：
    1. 严格核验手机号接收到的找回密码短信验证码 (scene='reset_pwd')；
    2. 查询手机号对应的注册账户；
    3. 重置新密码并立即生效。
    """
    phone = req.phone.strip()
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码长度不能少于6位")

    # 核验场景: reset_pwd
    is_valid, msg = await SMSService.verify_code(
        session=db,
        phone=phone,
        code=req.code,
        scene="reset_pwd",
        sms_token=req.sms_token
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="该手机号码尚未注册")

    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    logger.info(f"[Auth] 手机号 {phone} 已通过短信验证成功重置登录密码")

    return {"code": 0, "message": "密码重置成功，请使用新密码重新登录"}

@router.post("/logout")
async def user_logout(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    前台用户退出登录接口 (支持安全登出与清理前端凭证)
    """
    phone = None
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and payload.get("type") == "user":
            user_id = payload.get("sub")
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                phone = user.phone

    return {
        "code": 0,
        "message": "已成功退出登录",
        "data": {
            "phone": phone
        }
    }
