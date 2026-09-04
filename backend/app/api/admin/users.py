from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.task import XYZPTask
from app.models.quota import QuotaTransaction
from app.models.admin import AdminUser
from app.models.audit import AdminAuditLog
from app.schemas.user import UserStatusUpdateRequest, UserTagsUpdateRequest, UserResetPasswordRequest
from app.api.deps import get_current_admin

router = APIRouter(prefix="/users", tags=["后台注册用户管理"])

@router.get("/list")
async def get_admin_user_list(
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    用户列表与多维检索（手机号/企业主体/状态）
    """
    query = select(User)
    if keyword:
        query = query.where(
            (User.phone.contains(keyword)) | 
            (User.company_name.contains(keyword)) | 
            (User.id.contains(keyword))
        )
    if status:
        query = query.where(User.status == status)
    
    # 统计总数
    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    # 分页查询
    query = query.order_by(desc(User.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    items = []
    for u in users:
        items.append({
            "id": u.id,
            "phone": u.phone,
            "company_name": u.company_name,
            "credit_code": u.credit_code,
            "balance_quota": u.balance_quota,
            "total_recharge_quota": u.total_recharge_quota,
            "total_consumed_quota": u.total_consumed_quota,
            "total_gifted_quota": u.total_gifted_quota,
            "status": u.status,
            "tags": u.tags or [],
            "remark": u.remark,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else ""
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

@router.get("/{user_id}/detail")
async def get_admin_user_detail(
    user_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    用户 360° 详情全景画像：基本信息、额度资产、历史尽调任务、最近调额流水
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 获取该用户的尽调任务历史
    tasks_res = await db.execute(
        select(XYZPTask).where(XYZPTask.user_id == user.id).order_by(desc(XYZPTask.created_at)).limit(20)
    )
    tasks = tasks_res.scalars().all()
    task_items = [{
        "id": t.id,
        "task_no": t.task_no,
        "company_name": t.company_name,
        "credit_code": t.credit_code,
        "status": t.status,
        "risk_level": t.risk_level,
        "report_id": t.report_id,
        "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
        "completed_at": t.completed_at
    } for t in tasks]

    # 获取该用户的最近 10 条额度流水
    txs_res = await db.execute(
        select(QuotaTransaction).where(QuotaTransaction.user_id == user.id).order_by(desc(QuotaTransaction.created_at)).limit(10)
    )
    txs = txs_res.scalars().all()
    tx_items = [{
        "id": tx.id,
        "tx_no": tx.tx_no,
        "change_type": tx.change_type,
        "amount": tx.amount,
        "balance_before": tx.balance_before,
        "balance_after": tx.balance_after,
        "operator_name": tx.operator_name,
        "remark": tx.remark,
        "created_at": tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else ""
    } for tx in txs]

    return {
        "code": 0,
        "data": {
            "profile": {
                "id": user.id,
                "phone": user.phone,
                "company_name": user.company_name,
                "credit_code": user.credit_code,
                "balance_quota": user.balance_quota,
                "total_recharge_quota": user.total_recharge_quota,
                "total_consumed_quota": user.total_consumed_quota,
                "total_gifted_quota": user.total_gifted_quota,
                "status": user.status,
                "tags": user.tags or [],
                "remark": user.remark,
                "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else ""
            },
            "tasks": task_items,
            "recent_transactions": tx_items
        }
    }

@router.post("/{user_id}/status")
async def update_user_status(
    user_id: str,
    req: UserStatusUpdateRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    修改用户状态（冻结/解冻）
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    old_status = user.status
    user.status = req.status
    if req.remark:
        user.remark = req.remark
    
    # 记录审计日志
    audit = AdminAuditLog(
        admin_id=admin.id,
        admin_name=admin.real_name,
        module="users",
        action="update_status",
        target_id=user.id,
        target_name=user.phone,
        details={"before": old_status, "after": req.status, "remark": req.remark}
    )
    db.add(audit)
    await db.commit()
    return {"code": 0, "message": f"用户状态已成功更新为【{req.status}】"}

@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    req: UserResetPasswordRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    重置用户密码
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.hashed_password = get_password_hash(req.new_password)
    
    # 记录审计
    audit = AdminAuditLog(
        admin_id=admin.id,
        admin_name=admin.real_name,
        module="users",
        action="reset_password",
        target_id=user.id,
        target_name=user.phone
    )
    db.add(audit)
    await db.commit()
    return {"code": 0, "message": f"密码已重置为: {req.new_password}"}
