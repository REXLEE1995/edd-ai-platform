import math
import uuid
from datetime import datetime
from app.core.timezone import shanghai_now
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.quota import QuotaTransaction
from app.mock.mock_data import RECHARGE_PACKAGES
from app.schemas.billing import CreateOrderRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/billing", tags=["充值与账务"])

@router.get("/packages")
async def get_recharge_packages():
    """
    获取额度充值加油包列表
    """
    return {"code": 0, "data": RECHARGE_PACKAGES}

@router.get("/summary")
async def get_billing_summary(user: User = Depends(get_current_user)):
    """
    获取当前用户账务概览 (当前额度、累计充值、累计消耗、累计赠送)
    """
    return {
        "code": 0,
        "data": {
            "balance_quota": user.balance_quota,
            "total_recharge_quota": user.total_recharge_quota,
            "total_consumed_quota": user.total_consumed_quota,
            "total_gifted_quota": user.total_gifted_quota,
            "is_enterprise_certified": bool(user.credit_code),
            "company_name": user.company_name
        }
    }

@router.post("/orders/create")
async def create_recharge_order(
    req: CreateOrderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建额度充值订单
    """
    pkg = next((p for p in RECHARGE_PACKAGES if p["id"] == req.package_id), None)
    if not pkg:
        raise HTTPException(status_code=400, detail="所选充值套餐不存在")

    order_no = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
    quota_pts = pkg.get("quota_points") or pkg.get("quota_count", 1)
    order = Order(
        id=str(uuid.uuid4()),
        order_no=order_no,
        user_id=user.id,
        user_phone=user.phone,
        package_id=pkg["id"],
        package_name=pkg["name"],
        amount=pkg["price"],
        quota_points=quota_pts,
        pay_type=req.pay_type,
        status="pending"
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # 模拟支付二维码与支付参数
    qr_img = f"https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=weixin%3A%2F%2Fwxpay%2Fbizpayurl%3Fpr%3DMOCK_{order.order_no}"
    return {
        "code": 0,
        "message": "充值订单创建成功",
        "data": {
            "order_id": order.id,
            "order_no": order.order_no,
            "amount": order.amount,
            "quota_points": order.quota_points,
            "pay_type": order.pay_type,
            "package_name": order.package_name,
            "pay_qrcode_url": qr_img,
            "qrcode_url": qr_img,
            "pay_url": f"https://openapi.alipay.com/gateway.do?out_trade_no={order.order_no}" if req.pay_type == "alipay" else None,
            "created_at": order.created_at.strftime("%Y-%m-%d %H:%M:%S") if order.created_at else ""
        }
    }

@router.post("/orders/{order_id}/mock-pay")
async def mock_pay_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    本地开发 / 演示沙箱模拟支付成功回调与即时入账 (生产环境默认禁用)
    """
    if not settings.ALLOW_MOCK_PAY and settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403,
            detail="生产安全拦截：线上生产环境已停用模拟支付通道。请通过微信/支付宝正式网关完成支付。"
        )

    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status == "paid":
        return {"code": 0, "message": "该订单已完成支付，无需重复入账", "data": {"balance_quota": user.balance_quota}}

    order.status = "paid"
    order.paid_at = shanghai_now()

    # 额度入账
    balance_before = user.balance_quota
    user.balance_quota += order.quota_points
    user.total_recharge_quota += order.quota_points
    balance_after = user.balance_quota

    # 记录流水台账
    tx = QuotaTransaction(
        tx_no=f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
        user_id=user.id,
        user_phone=user.phone,
        user_company=user.company_name,
        change_type="recharge",
        amount=order.quota_points,
        balance_before=balance_before,
        balance_after=balance_after,
        ref_type="order",
        ref_id=order.order_no,
        operator_type="user",
        operator_name=user.phone,
        remark=f"在线充值【{order.package_name}】入账"
    )
    db.add(tx)
    await db.commit()
    await db.refresh(user)

    return {
        "code": 0,
        "message": f"支付成功！已为您充值 {order.quota_points} 次尽调额度，当前结余 {user.balance_quota} 次",
        "data": {
            "order_no": order.order_no,
            "status": "paid",
            "recharge_quota": order.quota_points,
            "balance_quota": user.balance_quota
        }
    }

@router.get("/transactions")
async def get_my_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    change_type: Optional[str] = None,
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    获取我的额度消费与充值明细流水（支持分页）
    """
    query = select(QuotaTransaction).where(QuotaTransaction.user_id == user.id)
    if change_type:
        query = query.where(QuotaTransaction.change_type == change_type)

    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    paged_query = query.order_by(desc(QuotaTransaction.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(paged_query)
    txs = result.scalars().all()

    items = []
    for t in txs:
        items.append({
            "id": t.id,
            "tx_no": t.tx_no,
            "change_type": t.change_type,
            "amount": t.amount,
            "balance_before": t.balance_before,
            "balance_after": t.balance_after,
            "ref_type": t.ref_type,
            "ref_id": t.ref_id,
            "operator_name": t.operator_name,
            "remark": t.remark,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else ""
        })

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return {
        "code": 0,
        "data": items,
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }
