from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.models.quota import QuotaTransaction, QuotaAdjustRecord
from app.models.admin import AdminUser
from app.models.audit import AdminAuditLog
from app.schemas.billing import QuotaAdjustRequest
from app.services.quota_service import QuotaService
from app.api.deps import get_current_admin

router = APIRouter(prefix="/quota", tags=["后台额度管控与流水对账"])

@router.post("/adjust")
async def adjust_user_quota(
    req: QuotaAdjustRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    管理员人工精准调额（增加/扣减/重置），记录审批工单与全局流水
    """
    before, after = await QuotaService.manual_adjust_quota(
        session=db,
        admin_id=admin.id,
        admin_name=admin.real_name,
        user_id=req.user_id,
        adjust_type=req.adjust_type,
        amount=req.amount,
        reason_category=req.reason_category,
        proof_no=req.proof_no,
        proof_image_url=req.proof_image_url,
        remark=req.remark
    )
    
    # 记录高危审计
    audit = AdminAuditLog(
        admin_id=admin.id,
        admin_name=admin.real_name,
        module="quota",
        action="manual_adjust",
        target_id=req.user_id,
        details={
            "adjust_type": req.adjust_type,
            "amount": req.amount,
            "before_balance": before,
            "after_balance": after,
            "reason_category": req.reason_category,
            "proof_no": req.proof_no,
            "remark": req.remark
        }
    )
    db.add(audit)
    await db.commit()

    return {
        "code": 0,
        "message": f"调额成功！用户额度由 {before} 次调整为 {after} 次",
        "data": {
            "before_balance": before,
            "after_balance": after
        }
    }

@router.get("/transactions")
async def get_all_quota_transactions(
    keyword: Optional[str] = None, # 手机号/流水号/企业名
    change_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    全量用户额度流水台账与财务对账列表
    """
    query = select(QuotaTransaction)
    if keyword:
        query = query.where(
            (QuotaTransaction.user_phone.contains(keyword)) |
            (QuotaTransaction.tx_no.contains(keyword)) |
            (QuotaTransaction.user_company.contains(keyword))
        )
    if change_type:
        query = query.where(QuotaTransaction.change_type == change_type)
    
    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    query = query.order_by(desc(QuotaTransaction.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    txs = result.scalars().all()

    items = []
    for t in txs:
        items.append({
            "id": t.id,
            "tx_no": t.tx_no,
            "user_id": t.user_id,
            "user_phone": t.user_phone,
            "user_company": t.user_company,
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

    return {
        "code": 0,
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }
    }
