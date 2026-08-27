import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.models.quota import QuotaTransaction
from app.schemas.auth import (
    LoginWithPhoneRequest, 
    TokenResponse, 
    UserInfoSchema, 
    ProfileUpdateRequest,
    ChangePasswordRequest
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["用户认证与个人中心"])

@router.post("/send-code")
async def send_sms_code(phone: str):
    """
    模拟发送短信验证码 (本地开发模式固定返回 123456)
    """
    return {"code": 0, "message": "验证码已发送", "data": {"code": "123456"}}

@router.post("/login", response_model=TokenResponse)
async def login_with_phone(req: LoginWithPhoneRequest, db: AsyncSession = Depends(get_db)):
    """
    手机号免密/密码登录，若用户不存在则自动注册并赠送 2 次额度
    """
    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()
    
    if not user:
        # 自动注册新用户
        user = User(
            id=f"user-{uuid.uuid4().hex[:12]}",
            phone=req.phone,
            hashed_password=get_password_hash(req.password or "123456"),
            company_name=f"企业用户_{req.phone[-4:]}",
            balance_quota=2, # 注册即送 2 次
            total_recharge_quota=0,
            total_consumed_quota=0,
            total_gifted_quota=2,
            status="active",
            tags=["新注册用户"]
        )
        db.add(user)
        
        # 记录注册赠送流水
        tx = QuotaTransaction(
            tx_no=f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            user_id=user.id,
            user_phone=user.phone,
            user_company=user.company_name,
            change_type="gift",
            amount=2,
            balance_before=0,
            balance_after=2,
            ref_type="system",
            ref_id="REG_GIFT",
            operator_type="system",
            operator_name="SYSTEM",
            remark="新用户注册系统赠送体验额度"
        )
        db.add(tx)
        await db.commit()
        await db.refresh(user)
    else:
        if user.status == "frozen":
            raise HTTPException(status_code=403, detail="该账户已被冻结，请联系客服")

    token = create_access_token(subject=user.id, token_type="user")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "phone": user.phone,
            "company_name": user.company_name,
            "balance_quota": user.balance_quota,
            "total_recharge_quota": user.total_recharge_quota,
            "total_consumed_quota": user.total_consumed_quota,
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
    修改用户登录密码
    """
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码长度不能少于6位")
    
    if req.old_password and user.hashed_password:
        if not verify_password(req.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="原密码不正确")
    
    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"code": 0, "message": "密码修改成功，请牢记新密码"}
