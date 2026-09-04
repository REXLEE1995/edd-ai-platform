# -*- coding: utf-8 -*-
"""
尽调报告专属 AI 智能流式问答与历史会话 API
"""

import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.report import XYZPReport
from app.models.report_chat_message import ReportChatMessage
from app.schemas.chat import ChatStreamRequest, ChatMessageOut
from app.core.prompts import QueryType, build_kb_messages
from app.services.ai_service import AIService
from app.api.deps import get_current_user

logger = logging.getLogger("xyzp.report_chat")

router = APIRouter(prefix="/reports", tags=["报告AI问答与会话"])

def _extract_report_kb_context(report: XYZPReport) -> str:
    """
    当请求未携带自定义底稿时，从报告资产及微风企底稿库中自动聚合知识库上下文
    """
    parts = [
        f"目标尽调企业：{report.company_name} (统一社会信用代码: {report.credit_code})",
        f"法定代表人：{report.legal_person or '未记载'}",
        f"风控评级：{report.risk_level} (综合量化评分: {report.score} 分)",
        f"AI 测算建议授信区间：{report.suggested_quota_min} ~ {report.suggested_quota_max} 万元",
    ]
    if report.summary_ai_comment:
        parts.append(f"【AI风控综述与研判依据】：\n{report.summary_ai_comment}")

    if report.content_json and isinstance(report.content_json, dict):
        basic = report.content_json.get("basic_info", {})
        if basic:
            parts.append(
                f"【工商照面底盘】：注册资本 {basic.get('reg_capital', '--')}，实缴资本 {basic.get('paid_capital', '--')}，"
                f"成立日期 {basic.get('establish_date', '--')}，行业分类 {basic.get('industry', '--')}。"
            )
        tax = report.content_json.get("tax_info", {})
        if tax:
            parts.append(
                f"【涉税与金税开票】：纳税评级 {tax.get('tax_rating', '--')} 级，近36个月开票总额 {tax.get('annual_vat_sales', '--')}，"
                f"发票有效率 {tax.get('valid_ratio', '--')}，红冲废票率 {tax.get('cancel_ratio', '极低')}。"
            )
        risk = report.content_json.get("risk_radar", {})
        if risk:
            parts.append(
                f"【司法合规与征信雷达】：失信被执行人记录 {risk.get('dishonest_count', 0)} 条，严重违法失信 {risk.get('serious_illegal', '无')}，"
                f"行政处罚 {risk.get('penalty_count', 0)} 次，近3个月金融机构征信查询 {risk.get('query_count_3m', 0)} 次。"
            )

    if report.raw_sources_json and isinstance(report.raw_sources_json, dict):
        raw_snippet = json.dumps(report.raw_sources_json, ensure_ascii=False)
        parts.append(f"【原始金税与征信申报底稿切片】：\n{raw_snippet[:2000]}")

    return "\n\n".join(parts)


@router.post("/{report_id}/chat/stream")
async def report_chat_stream(
    report_id: str,
    req: ChatStreamRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    针对指定尽调报告发起 AI 流式问答 (Server-Sent Events)
    - 支持两种模式:
      1. CATALOG_SPECIFIC: 目录定向回答 (用户点击目录，限定章节范围，层级标题输出，严格不超出章节)
      2. DEFAULT: 常规对话总结 (自由业务咨询，基于全局知识库底稿列表与表格输出)
    - 所有模式均无条件执行【核心纪律】:
      - 严格基于知识库，不联网，不外借
      - 未收录信息直接回复“未找到相关内容”
      - 严禁任何推荐问题或猜你想问
      - 强制规范 Markdown 输出 (标题、列表、表格、加粗、行尾来源标注)
    - 自动持久化保存本次提问与 AI 完整回答，下次进入报告可直接查看
    """
    # 1. 权限与报告校验
    result = await db.execute(select(XYZPReport).where(XYZPReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="指定的尽调报告资产不存在")
    
    # 租户隔离校验
    if report.user_id != user.id and getattr(user, "role", "") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该报告的对话资产")

    # 2. 提取或注入知识库内容
    kb_context = req.kb_content.strip() if req.kb_content and req.kb_content.strip() else _extract_report_kb_context(report)

    # 3. 提问立即持久化入库 (User 消息)
    user_msg = ReportChatMessage(
        report_id=report_id,
        user_id=user.id,
        role="user",
        query_type=req.query_type.value,
        catalog_key=req.catalog_key,
        catalog_name=req.catalog_name,
        content=req.content.strip(),
        tokens_used=len(req.content) // 2
    )
    db.add(user_msg)
    await db.commit()

    # 4. 组装规范 Prompt Messages
    messages = build_kb_messages(
        query_type=req.query_type,
        user_query=req.content,
        kb_content=kb_context,
        catalog_name=req.catalog_name,
        history=[{"role": h.role, "content": h.content} for h in req.history] if req.history else None
    )

    # 5. 构造 SSE 流式输出生成器并在完成/中断后落库 Assistant 消息
    async def sse_generator():
        full_assistant_reply: List[str] = []
        user_id_val = user.id
        report_id_val = report_id
        q_type_val = req.query_type.value
        cat_key_val = req.catalog_key
        cat_name_val = req.catalog_name

        async def is_disconnected():
            return await request.is_disconnected()

        try:
            async for delta in AIService.stream_chat_completion(
                messages=messages,
                temperature=0.1,  # 严格事实模式，严禁自由发挥
                max_tokens=2500,
                stop_check_fn=is_disconnected
            ):
                full_assistant_reply.append(delta)
                payload = json.dumps({"delta": delta, "status": "generating"}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

            # 正常输出完成
            yield f"data: {json.dumps({'status': 'done'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"[ReportChat] Error during streaming: {e}")
            err_payload = json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False)
            yield f"data: {err_payload}\n\n"

        finally:
            # 6. 流结束或异常中断后，持久化完整回答到数据库
            complete_text = "".join(full_assistant_reply).strip()
            if complete_text:
                try:
                    async with AsyncSessionLocal() as session:
                        ai_msg = ReportChatMessage(
                            report_id=report_id_val,
                            user_id=user_id_val,
                            role="assistant",
                            query_type=q_type_val,
                            catalog_key=cat_key_val,
                            catalog_name=cat_name_val,
                            content=complete_text,
                            tokens_used=len(complete_text) // 2
                        )
                        session.add(ai_msg)
                        await session.commit()
                        logger.info(f"[ReportChat] Persisted AI message ({len(complete_text)} chars) for report {report_id_val}")
                except Exception as db_err:
                    logger.error(f"[ReportChat] Failed to persist AI message: {db_err}")

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8"
        }
    )


@router.get("/{report_id}/chat/history")
async def get_report_chat_history(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取指定报告的全部历史对话记录 (按时间先后顺序升序展示)
    用户下次进入该报告时调用此接口，恢复对话现场
    """
    # 1. 验证报告是否存在
    result_rep = await db.execute(select(XYZPReport).where(XYZPReport.id == report_id))
    report = result_rep.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="指定的尽调报告资产不存在")

    # 2. 查询该用户在该报告下的所有对话记录
    stmt = (
        select(ReportChatMessage)
        .where(
            ReportChatMessage.report_id == report_id,
            ReportChatMessage.user_id == user.id
        )
        .order_by(ReportChatMessage.created_at.asc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    data = []
    for m in records:
        data.append({
            "id": m.id,
            "report_id": m.report_id,
            "role": m.role,
            "query_type": m.query_type,
            "catalog_key": m.catalog_key,
            "catalog_name": m.catalog_name,
            "content": m.content,
            "tokens_used": m.tokens_used,
            "created_at": m.created_at.strftime("%Y-%m-%d %H:%M:%S") if m.created_at else None
        })

    return {
        "code": 200,
        "message": "success",
        "data": data,
        "total": len(data)
    }


@router.delete("/{report_id}/chat/history")
async def clear_report_chat_history(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    清空当前用户在该报告下的所有对话历史记录
    """
    stmt = delete(ReportChatMessage).where(
        ReportChatMessage.report_id == report_id,
        ReportChatMessage.user_id == user.id
    )
    await db.execute(stmt)
    await db.commit()

    return {
        "code": 200,
        "message": "该报告的对话记录已成功清空"
    }
