import os
from fastapi.responses import FileResponse
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.user import User
from app.models.report import DDReport
from app.services.quota_service import QuotaService
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["报告资产"])

@router.get("/list")
async def get_my_reports(
    keyword: Optional[str] = None,
    risk_level: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取我的尽调报告资产列表，支持按企业名和风险评级过滤
    """
    query = select(DDReport).where(DDReport.user_id == user.id).order_by(desc(DDReport.created_at))
    if keyword:
        query = query.where(DDReport.company_name.contains(keyword))
    if risk_level:
        query = query.where(DDReport.risk_level == risk_level)
    
    result = await db.execute(query.limit(100))
    reports = result.scalars().all()
    
    data = []
    for r in reports:
        data.append({
            "id": r.id,
            "report_no": r.report_no,
            "task_id": r.task_id,
            "company_name": r.company_name,
            "credit_code": r.credit_code,
            "legal_person": r.legal_person,
            "risk_level": r.risk_level,
            "score": r.score,
            "suggested_quota_min": r.suggested_quota_min,
            "suggested_quota_max": r.suggested_quota_max,
            "summary_ai_comment": r.summary_ai_comment,
            "is_locked": bool(r.content_json.get("is_locked", False) if r.content_json else False),
            "is_public_only": bool(r.content_json.get("is_public_only", False) if r.content_json else False),
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else ""
        })
    return {"code": 0, "data": data}

@router.get("/{report_id}")
async def get_report_detail(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取单份报告完整内容与双向底稿溯源库（支持三栏阅读器）
    """
    result = await db.execute(select(DDReport).where(DDReport.id == report_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    return {
        "code": 0,
        "data": {
            "id": r.id,
            "report_no": r.report_no,
            "task_id": r.task_id,
            "company_name": r.company_name,
            "credit_code": r.credit_code,
            "legal_person": r.legal_person,
            "risk_level": r.risk_level,
            "score": r.score,
            "suggested_quota_min": r.suggested_quota_min,
            "suggested_quota_max": r.suggested_quota_max,
            "summary_ai_comment": r.summary_ai_comment,
            "content": r.content_json,
            "raw_sources": r.raw_sources_json,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else ""
        }
    }

@router.post("/{report_id}/unlock")
async def unlock_report_with_quota(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    消耗 1 次额度解锁被遮罩的 AI 深度研判报告
    """
    result = await db.execute(select(DDReport).where(DDReport.id == report_id, DDReport.user_id == user.id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    content = dict(r.content_json or {})
    if not content.get("is_locked", False):
        return {"code": 0, "message": "该报告已处于完全解锁状态", "data": {"report_id": r.id, "is_locked": False}}
    
    if user.balance_quota < 1:
        raise HTTPException(status_code=400, detail="当前可用额度不足，请先充值额度包")
    
    # 扣减 1 次额度
    await QuotaService.deduct_quota_for_task(
        session=db,
        user_id=user.id,
        task_id=r.task_id,
        company_name=r.company_name,
        points=1
    )
    
    content["is_locked"] = False
    r.content_json = content
    await db.commit()
    
    return {
        "code": 0,
        "message": "解锁成功！已扣减 1 次尽调额度",
        "data": {"report_id": r.id, "is_locked": False}
    }


@router.get("/{report_id}/pdf")
async def get_report_pdf_file(
    report_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取或在线预览对应尽调报告的原始高保真 PDF 文件
    """
    pdf_sample_path = "/Users/barry/Desktop/Obsidian/XYSY/ai-report/贷前报告样例-新.pdf"
    if os.path.exists(pdf_sample_path):
        return FileResponse(
            pdf_sample_path, 
            media_type="application/pdf", 
            filename=f"享宇智评尽调报告_{report_id}.pdf"
        )
    raise HTTPException(status_code=404, detail="PDF 文件不存在")
