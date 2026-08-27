import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
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
async def get_quota_summary(user: User = Depends(get_current_user)):
    """
    获取当前用户额度概览
    """
    return {
        "code": 0,
        "data": {
            "balance_quota": user.balance_quota,
            "total_recharge_quota": user.total_recharge_quota,
            "total_consumed_quota": user.total_consumed_quota,
            "total_gifted_quota": user.total_gifted_quota
        }
    }

@router.post("/orders/create")
async def create_recharge_order(
    req: CreateOrderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建额度充值订单（返回聚合支付二维码与支付单号）
    """
    pkg = next((p for p in RECHARGE_PACKAGES if p["id"] == req.package_id), None)
    if not pkg:
        raise HTTPException(status_code=400, detail="套餐不存在")
    
    order_id = f"ord-{uuid.uuid4().hex[:12]}"
    order_no = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
    
    order = Order(
        id=order_id,
        order_no=order_no,
        user_id=user.id,
        user_phone=user.phone,
        package_id=pkg["id"],
        package_name=pkg["name"],
        amount=pkg["price"],
        quota_points=pkg["quota_points"],
        pay_type=req.pay_type,
        status="pending"
    )
    db.add(order)
    await db.commit()

    return {
        "code": 0,
        "message": "订单创建成功",
        "data": {
            "order_id": order.id,
            "order_no": order.order_no,
            "amount": order.amount,
            "quota_points": order.quota_points,
            "package_name": order.package_name,
            "pay_qrcode_url": f"https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=mock_pay_{order.order_no}"
        }
    }

@router.post("/orders/{order_id}/mock-pay")
async def mock_pay_success(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    本地开发快速模拟支付成功，即刻自动加额并记入流水
    """
    result = await db.execute(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status == "paid":
        return {"code": 0, "message": "订单已支付，请勿重复支付"}
    
    order.status = "paid"
    order.paid_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    order.third_trade_no = f"WX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

    # 增加用户额度
    result_user = await db.execute(select(User).where(User.id == user.id).with_for_update())
    user_db = result_user.scalar_one_or_none()
    
    before_balance = user_db.balance_quota
    user_db.balance_quota += order.quota_points
    user_db.total_recharge_quota += order.quota_points
    after_balance = user_db.balance_quota

    # 记录流水
    tx = QuotaTransaction(
        tx_no=f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
        user_id=user_db.id,
        user_phone=user_db.phone,
        user_company=user_db.company_name,
        change_type="recharge",
        amount=order.quota_points,
        balance_before=before_balance,
        balance_after=after_balance,
        ref_type="order",
        ref_id=order.order_no,
        operator_type="user",
        operator_name="微信/支付宝线上支付",
        remark=f"在线充值【{order.package_name}】增加 {order.quota_points} 次"
    )
    db.add(tx)
    await db.commit()

    return {
        "code": 0,
        "message": f"支付成功，已成功增加 {order.quota_points} 次额度！",
        "data": {
            "current_balance": after_balance
        }
    }

@router.get("/transactions")
async def get_my_transactions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    获取我的额度消费与充值明细流水
    """
    result = await db.execute(
        select(QuotaTransaction).where(QuotaTransaction.user_id == user.id).order_by(desc(QuotaTransaction.created_at)).limit(100)
    )
    txs = result.scalars().all()
    data = []
    for t in txs:
        data.append({
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
    return {"code": 0, "data": data}
