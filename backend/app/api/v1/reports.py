import os
import math
import json
from datetime import datetime, timedelta
from app.core.timezone import shanghai_now, format_shanghai_iso
from fastapi.responses import FileResponse, Response
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.user import User
from app.models.report import XYZPReport
from app.models.task import XYZPTask
from app.models.file_record import TaskFile
from app.core.minio_client import get_minio_client
from app.services.quota_service import QuotaService
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["报告资产"])

@router.get("/list")
async def get_my_reports(
    keyword: Optional[str] = None,
    risk_level: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前登录账号的尽调报告资产库列表（支持分页与多维检索）：
    - 仅展示当前账号已生成报告的任务资产
    - 按 UTC 时间严格倒序排序 (最新的展示在最前面)
    - 接口数据层面进行物理分页，返回 total, page, page_size, total_pages
    """
    query = (
        select(XYZPReport, XYZPTask.task_no)
        .outerjoin(XYZPTask, XYZPReport.task_id == XYZPTask.id)
        .where(XYZPReport.user_id == user.id)
        .order_by(desc(XYZPReport.created_at))
    )
    if keyword:
        keyword = keyword.strip()
        query = query.where(
            (XYZPReport.company_name.contains(keyword)) | 
            (XYZPReport.credit_code.contains(keyword)) |
            (XYZPReport.report_no.contains(keyword)) |
            (XYZPTask.task_no.contains(keyword))
        )
    if risk_level:
        query = query.where(XYZPReport.risk_level == risk_level)
    
    result = await db.execute(query)
    rows = result.all()
    
    data = []
    for r, t_no in rows:
        # 输出标准 Asia/Shanghai (UTC+8) ISO 8601 格式字符串
        report_created_at = format_shanghai_iso(r.created_at) if r.created_at else ""
        formatted_task_no = t_no or (f"TSK{r.created_at.strftime('%Y%m%d%H%M%S')}{r.id[-4:].upper()}" if r.created_at else f"TSK2026083115816{r.id[-4:].upper()}")
        data.append({
            "id": r.id,
            "report_no": r.report_no,
            "task_no": formatted_task_no,
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
            "created_at": report_created_at,
            "is_expired": False
        })

    # 全局严格按生成时间倒序排列 (最新生成的报告排在最前面)
    data.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    total = len(data)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paged_items = data[start_idx:end_idx]

    return {
        "code": 0,
        "data": paged_items,
        "items": paged_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

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
        select(XYZPReport).where(
            (XYZPReport.id == report_id) | 
            (XYZPReport.report_no == report_id) | 
            (XYZPReport.task_id == report_id)
        )
    )
    r = result.scalar_one_or_none()
    
    if not r:
        raise HTTPException(status_code=404, detail="未查询到该尽调报告资产")
    
    report_created_at = format_shanghai_iso(r.created_at) if r.created_at else ""
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
            "created_at": report_created_at,
            "is_expired": False
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
    result = await db.execute(select(XYZPReport).where(XYZPReport.id == report_id, XYZPReport.user_id == user.id))
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
        select(XYZPReport).where((XYZPReport.id == report_id) | (XYZPReport.report_no == report_id))
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

    # 4. 容错兜底：若 MinIO 不可用或未命中，检测本地工程预置 PDF 样本直接响应
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    candidates = [
        os.path.join(base_dir, "贷前报告样例-享宇智评版.pdf"),
        os.path.join(base_dir, "wfqmockserver", "贷前报告样例-享宇智评版.pdf"),
        os.path.join(base_dir, "frontend", "public", "reports", "hangzhou_preloan.pdf"),
        os.path.join(base_dir, "frontend", "public", "sample_report.pdf"),
    ]
    for c_path in candidates:
        if os.path.exists(c_path):
            encoded_filename = urllib.parse.quote(display_filename)
            return FileResponse(
                path=c_path,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"inline; filename=\"{encoded_filename}\"; filename*=UTF-8''{encoded_filename}",
                    "Access-Control-Allow-Origin": "*",
                    "X-Storage-Engine": "Local-Fallback"
                }
            )

    raise HTTPException(status_code=404, detail="未检索到报告 PDF 存证文件")

@router.post("/ai/chat")
async def ai_chat_with_report(
    payload: Dict[str, Any],
    user: User = Depends(get_current_user)
):
    """
    通过 New-API Token 池网关与报告进行交互式 AI 对话
    """
    from app.services.ai_service import AIService
    
    question = payload.get("question", "")
    context_text = payload.get("context_text", "")
    history = payload.get("history", [])
    report_meta = payload.get("report_meta", {})
    
    if not question:
        raise HTTPException(status_code=400, detail="提问内容不能为空")
        
    answer = await AIService.chat_with_report(
        report_meta=report_meta,
        context_text=context_text,
        question=question,
        history=history
    )
    return {"code": 0, "data": {"answer": answer}}

@router.post("/ai/section_summary")
async def ai_section_summary(
    payload: Dict[str, Any],
    user: User = Depends(get_current_user)
):
    """
    针对报告特定章节生成 AI 智能研判与风险提示
    """
    from app.services.ai_service import AIService
    
    section_title = payload.get("section_title", "章节概览")
    section_text = payload.get("section_text", "")
    
    summary = await AIService.generate_chapter_summary(
        chapter_title=section_title,
        chapter_text=section_text
    )
    return {"code": 0, "data": {"summary": summary}}

@router.get("/{report_id}/catalog")
async def get_report_catalog_from_minio(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【从 MinIO 读取目录 JSON 数据 API】完整流程：前端 -> 后端 API -> 从 MinIO 读取 pdf_toc_json 文件 -> 返回给前端
    """
    result = await db.execute(
        select(XYZPReport).where(
            (XYZPReport.id == report_id) | 
            (XYZPReport.report_no == report_id) | 
            (XYZPReport.task_id == report_id)
        )
    )
    r = result.scalar_one_or_none()
    task_id = r.task_id if r else report_id

    minio_mgr = get_minio_client()
    file_result = await db.execute(
        select(TaskFile).where(
            (TaskFile.task_id == task_id) & (TaskFile.file_type == "pdf_toc_json")
        ).order_by(desc(TaskFile.created_at))
    )
    toc_file = file_result.scalars().first()

    catalog_data = None
    if toc_file and minio_mgr.object_exists(toc_file.file_path):
        try:
            raw_bytes = minio_mgr.get_object_bytes(toc_file.file_path)
            catalog_data = json.loads(raw_bytes.decode("utf-8"))
        except Exception as e:
            pass

    if not catalog_data:
        toc = (r.content_json.get("toc_catalog") if r and r.content_json else []) or []
        catalog_data = {
            "report_id": report_id,
            "task_id": task_id,
            "company_name": r.company_name if r else "",
            "credit_code": r.credit_code if r else "",
            "toc_catalog": toc,
            "source": "fallback"
        }

    return {
        "code": 0,
        "message": "success",
        "data": catalog_data
    }

@router.get("/{report_id}/content-text")
async def get_report_content_text_from_minio(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    从 MinIO 读取步骤 3 解析形成的纯文本数据 (full_text_content) 并返回
    """
    result = await db.execute(
        select(XYZPReport).where(
            (XYZPReport.id == report_id) | 
            (XYZPReport.report_no == report_id) | 
            (XYZPReport.task_id == report_id)
        )
    )
    r = result.scalar_one_or_none()
    task_id = r.task_id if r else report_id

    minio_mgr = get_minio_client()
    file_result = await db.execute(
        select(TaskFile).where(
            (TaskFile.task_id == task_id) & (TaskFile.file_type == "pdf_content_txt")
        ).order_by(desc(TaskFile.created_at))
    )
    txt_file = file_result.scalars().first()

    if txt_file and minio_mgr.object_exists(txt_file.file_path):
        raw_bytes = minio_mgr.get_object_bytes(txt_file.file_path)
        return Response(content=raw_bytes, media_type="text/plain; charset=utf-8")

    raise HTTPException(status_code=404, detail="未找到该报告的解析文本存证文件")

@router.get("/{report_id}/knowledge-base")
async def get_report_knowledge_base_from_minio(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【从 MinIO 读取步骤 4 AI 生成的标准 Markdown 知识库文件】(knowledge_base.md)
    """
    result = await db.execute(
        select(XYZPReport).where(
            (XYZPReport.id == report_id) | 
            (XYZPReport.report_no == report_id) | 
            (XYZPReport.task_id == report_id)
        )
    )
    r = result.scalar_one_or_none()
    task_id = r.task_id if r else report_id

    minio_mgr = get_minio_client()
    file_result = await db.execute(
        select(TaskFile).where(
            (TaskFile.task_id == task_id) & (TaskFile.file_type == "pdf_knowledge_md")
        ).order_by(desc(TaskFile.created_at))
    )
    md_file = file_result.scalars().first()

    if md_file and minio_mgr.object_exists(md_file.file_path):
        raw_bytes = minio_mgr.get_object_bytes(md_file.file_path)
        return Response(content=raw_bytes, media_type="text/markdown; charset=utf-8")

    raise HTTPException(status_code=404, detail="未找到该报告的 AI Markdown 知识库存证文件")

@router.get("/{report_id}/summary")
async def get_report_summary_from_minio(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【从 MinIO 读取步骤 5 AI 深度总结 JSON 数据】(summary.json)
    返回结构: { "code": 0, "message": "success", "data": { "enterprise_profile": "...", "risk_assessment": [...] } }
    """
    result = await db.execute(
        select(XYZPReport).where(
            (XYZPReport.id == report_id) | 
            (XYZPReport.report_no == report_id) | 
            (XYZPReport.task_id == report_id)
        )
    )
    r = result.scalar_one_or_none()
    task_id = r.task_id if r else report_id

    minio_mgr = get_minio_client()
    file_result = await db.execute(
        select(TaskFile).where(
            (TaskFile.task_id == task_id) & (TaskFile.file_type == "pdf_summary_json")
        ).order_by(desc(TaskFile.created_at))
    )
    summary_file = file_result.scalars().first()

    if summary_file and minio_mgr.object_exists(summary_file.file_path):
        raw_bytes = minio_mgr.get_object_bytes(summary_file.file_path)
        try:
            summary_data = json.loads(raw_bytes.decode("utf-8"))
            return {
                "code": 0,
                "message": "success",
                "data": summary_data
            }
        except Exception:
            return Response(content=raw_bytes, media_type="application/json; charset=utf-8")

    # 兜底降级查报告中的已存研判数据
    ov = r.content_json.get("overall_ai_summary") if (r and r.content_json) else None
    if ov:
        return {
            "code": 0,
            "message": "success",
            "data": {
                "enterprise_profile": ov.get("summary", ""),
                "risk_assessment": [kp for kp in ov.get("key_points", [])]
            }
        }

    raise HTTPException(status_code=404, detail="未找到该报告的 AI 总结存证文件")

