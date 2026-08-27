from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.models.order import Order
from app.models.admin import AdminUser
from app.api.deps import get_current_admin

router = APIRouter(prefix="/orders", tags=["后台订单与财务管理"])

@router.get("/list")
async def get_admin_orders(
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    全量支付订单列表
    """
    query = select(Order)
    if status:
        query = query.where(Order.status == status)
    if keyword:
        query = query.where((Order.order_no.contains(keyword)) | (Order.user_phone.contains(keyword)))
    
    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    query = query.order_by(desc(Order.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    orders = result.scalars().all()

    items = []
    for o in orders:
        items.append({
            "id": o.id,
            "order_no": o.order_no,
            "user_id": o.user_id,
            "user_phone": o.user_phone,
            "package_name": o.package_name,
            "amount": o.amount,
            "quota_points": o.quota_points,
            "pay_type": o.pay_type,
            "status": o.status,
            "paid_at": o.paid_at,
            "created_at": o.created_at.strftime("%Y-%m-%d %H:%M:%S") if o.created_at else ""
        })

    return {
        "code": 0,
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }
    }
