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
    获取当前登录账号的尽调报告资产库列表：
    - 仅展示当前账号已生成报告的任务资产
    - 按 UTC 时间严格倒序排序 (最新的展示在最前面)
    - 时间字段输出标准 ISO 8601 UTC 格式，供前端按用户本地时区渲染
    """
    query = select(DDReport).where(DDReport.user_id == user.id).order_by(desc(DDReport.created_at))
    if keyword:
        query = query.where(
            (DDReport.company_name.contains(keyword)) | 
            (DDReport.credit_code.contains(keyword)) |
            (DDReport.report_no.contains(keyword))
        )
    if risk_level:
        query = query.where(DDReport.risk_level == risk_level)
    
    result = await db.execute(query.limit(200))
    reports = result.scalars().all()
    
    data = []
    for r in reports:
        # 输出 ISO 8601 UTC 格式字符串 (例如 2026-08-31T06:42:43Z)
        utc_created_at = r.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if r.created_at else ""
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
            "pdf_url": f"/api/v1/reports/{r.id}/pdf",
            "is_locked": bool(r.content_json.get("is_locked", False) if r.content_json else False),
            "is_public_only": bool(r.content_json.get("is_public_only", False) if r.content_json else False),
            "created_at": utc_created_at
        })

    return {"code": 0, "data": data}

@router.get("/{report_id}")
async def get_report_detail(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取单份报告完整内容与 MinIO 真实 PDF 存证流地址（支持三栏阅读器）
    """
    result = await db.execute(
        select(DDReport).where(
            (DDReport.id == report_id) | 
            (DDReport.report_no == report_id) | 
            (DDReport.task_id == report_id)
        )
    )
    r = result.scalar_one_or_none()
    
    if not r:
        raise HTTPException(status_code=404, detail="未查询到该尽调报告资产")
    
    utc_created_at = r.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if r.created_at else ""
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
            "pdf_url": f"/api/v1/reports/{r.id}/pdf",
            "content": r.content_json or {},
            "raw_sources": r.raw_sources_json or {},
            "created_at": utc_created_at
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


import os
import urllib.parse
from fastapi.responses import StreamingResponse
from app.core.minio_client import get_minio_client
from app.services.file_storage_service import FileStorageService

@router.get("/{report_id}/pdf")
async def get_report_pdf_file(
    report_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取或在线预览对应尽调报告的原始高保真 PDF 文件 (从 MinIO 对象存储安全流式调取)
    """
    minio_mgr = get_minio_client()

    # 1. 查询报告记录
    result = await db.execute(
        select(DDReport).where((DDReport.id == report_id) | (DDReport.report_no == report_id))
    )
    r = result.scalar_one_or_none()

    target_object_key = None
    display_filename = f"微风企尽调报告_{report_id}.pdf"

    if r:
        display_filename = f"微风企贷前报告_{r.company_name}.pdf"
        
        # 1.1 优先通过 TaskFile 获取 MinIO 对象
        if r.storage_file_id:
            file_rec = await FileStorageService.get_file_by_id(db, r.storage_file_id)
            if file_rec:
                if minio_mgr.object_exists(file_rec.file_path):
                    target_object_key = file_rec.file_path
                elif os.path.exists(file_rec.file_path):
                    # 自动迁移历史本地物理文件至 MinIO
                    migrated_key = f"reports/migrated/{r.id}_{os.path.basename(file_rec.file_path)}"
                    minio_mgr.upload_file(file_rec.file_path, migrated_key)
                    file_rec.file_path = migrated_key
                    await db.commit()
                    target_object_key = migrated_key

        if not target_object_key and r.task_id:
            file_rec = await FileStorageService.get_file_by_task_id(db, r.task_id)
            if file_rec:
                if minio_mgr.object_exists(file_rec.file_path):
                    target_object_key = file_rec.file_path
                elif os.path.exists(file_rec.file_path):
                    migrated_key = f"reports/migrated/{r.id}_{os.path.basename(file_rec.file_path)}"
                    minio_mgr.upload_file(file_rec.file_path, migrated_key)
                    file_rec.file_path = migrated_key
                    await db.commit()
                    target_object_key = migrated_key

        if not target_object_key and r.pdf_file_path:
            if minio_mgr.object_exists(r.pdf_file_path):
                target_object_key = r.pdf_file_path
            elif os.path.exists(r.pdf_file_path):
                migrated_key = f"reports/migrated/{r.id}_{os.path.basename(r.pdf_file_path)}"
                minio_mgr.upload_file(r.pdf_file_path, migrated_key)
                r.pdf_file_path = migrated_key
                await db.commit()
                target_object_key = migrated_key

    # 2. 兜底策略：检查或自动上传模版样本 PDF 至 MinIO
    if not target_object_key:
        template_key = "templates/sample_report.pdf"
        if not minio_mgr.object_exists(template_key):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            candidates = [
                os.path.join(base_dir, "frontend", "public", "reports", "hangzhou_preloan.pdf"),
                os.path.join(base_dir, "wfqmockserver", "贷前报告样例-享宇智评版.pdf"),
                os.path.join(base_dir, "frontend", "public", "sample_report.pdf"),
            ]
            for c_path in candidates:
                if os.path.exists(c_path):
                    try:
                        minio_mgr.upload_file(c_path, template_key)
                        target_object_key = template_key
                        break
                    except Exception:
                        pass
        else:
            target_object_key = template_key

    # 3. 从 MinIO 提取对象流并通过 StreamingResponse 流式直出
    if target_object_key and minio_mgr.object_exists(target_object_key):
        minio_stream = minio_mgr.get_object_stream(target_object_key)
        encoded_filename = urllib.parse.quote(display_filename)

        def iter_minio_stream():
            try:
                for chunk in minio_stream.stream(32 * 1024):
                    yield chunk
            finally:
                minio_stream.close()
                minio_stream.release_conn()

        return StreamingResponse(
            iter_minio_stream(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=\"{encoded_filename}\"; filename*=UTF-8''{encoded_filename}",
                "Access-Control-Allow-Origin": "*",
                "X-Storage-Engine": "MinIO",
                "X-MinIO-Bucket": minio_mgr.default_bucket,
                "X-MinIO-Object": urllib.parse.quote(target_object_key)
            }
        )

    raise HTTPException(status_code=404, detail="MinIO 对象存储中未检索到报告 PDF 存证文件")
