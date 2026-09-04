from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.user import User
from app.models.task import XYZPTask
from app.models.quota import QuotaTransaction
from app.models.order import Order
from app.models.admin import AdminUser
from app.api.deps import get_current_admin

router = APIRouter(prefix="/dashboard", tags=["运营数据大盘"])

@router.get("/metrics")
async def get_dashboard_metrics(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    运营管理后台核心指标总览
    """
    # 用户总数
    user_count_res = await db.execute(select(func.count(User.id)))
    total_users = user_count_res.scalar() or 0

    # 尽调任务总数与已完成数
    task_count_res = await db.execute(select(func.count(XYZPTask.id)))
    total_tasks = task_count_res.scalar() or 0

    completed_tasks_res = await db.execute(select(func.count(XYZPTask.id)).where(XYZPTask.status == "completed"))
    completed_tasks = completed_tasks_res.scalar() or 0

    # 平台总充值收入
    revenue_res = await db.execute(select(func.sum(Order.amount)).where(Order.status == "paid"))
    total_revenue = revenue_res.scalar() or 0.0

    # 平台总剩余可用额度
    quota_res = await db.execute(select(func.sum(User.balance_quota)))
    total_balance_quota = quota_res.scalar() or 0

    # 累计已消耗点数
    consumed_res = await db.execute(select(func.sum(User.total_consumed_quota)))
    total_consumed_quota = consumed_res.scalar() or 0

    return {
        "code": 0,
        "data": {
            "total_users": total_users,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "total_revenue": total_revenue,
            "total_balance_quota": total_balance_quota,
            "total_consumed_quota": total_consumed_quota
        }
    }
