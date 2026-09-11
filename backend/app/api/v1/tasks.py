import re
import asyncio
import uuid
import json
import urllib.parse
import logging
import math
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.database import get_db
from app.models.user import User
from app.models.task import XYZPTask, DDTask
from app.models.report import XYZPReport, DDReport
from app.models.file_record import TaskFile
from app.core.minio_client import get_minio_client
from app.schemas.task import TaskCreateRequest, TaskSummaryResponse
from app.services.quota_service import QuotaService
from app.services.task_service import TaskService
from app.providers import get_weifengqi_provider
from app.models.admin import AdminUser
from app.api.deps import get_current_user, get_current_admin_or_user

logger = logging.getLogger("xyzp.tasks")

router = APIRouter(prefix="/tasks", tags=["尽调任务"])

def sanitize_thinking_logs(logs: Optional[list]) -> list:
    """
    清洗并模糊化任务执行思维日志，去除第三方厂商名词（如微风企、New-API等）、内部敏感接口路由和原始错误码，
    对外提供专业、中立、自研的金融级风控引擎进度描述。
    """
    if not logs:
        return []
    
    clean_logs = []
    replacements = [
        (r"【微风企·金税中台】", "【金税涉税数据中台】"),
        (r"【微风企·金税平台】", "【金税涉税数据中台】"),
        (r"微风企·金税中台", "金税涉税数据中台"),
        (r"微风企·金税平台", "金税涉税数据中台"),
        (r"微风企专属授权链接", "专属实名数据授权通道"),
        (r"微风企企业法人实名授权", "企业法定代表人实名数据授权"),
        (r"微风企贷前报告", "企业尽调分析报告"),
        (r"微风企网关", "政企金税通道"),
        (r"微风企端", "权威金税端"),
        (r"微风企", "金税系统"),
        (r"【New-API 智能体网关】", "【AI 深度研判引擎】"),
        (r"New-API 智能体网关", "AI 深度研判引擎"),
        (r"New-API", "AI 深度研判引擎"),
        (r"【三方接口[1-3]?[·:：]?([^】]+)】", r"【\1】"),
        (r"三方接口[1-3]?[·:：]?", ""),
        (r"Token 资源池\s*\(模型:\s*[^)]+\)", "风控大模型集群"),
        (r"MinIO 对象存储", "数字存证保全库"),
        (r"MinIO", "安全存证存储"),
        (r"\(/api/v1/tasks/[^)]+\)", ""),
        (r"http[s]?://[^\s，,。；;]+", "[已建立安全数据管道]"),
        (r"\(errorCode:\s*\d+[^)]*\)", ""),
    ]

    for item in logs:
        if not isinstance(item, dict):
            continue
        content = item.get("content", "")
        for pattern, repl in replacements:
            content = re.sub(pattern, repl, content)
        content = re.sub(r"\s+", " ", content).strip()
        content = re.sub(r"[,，\s]*->\s*", " -> ", content)
        content = re.sub(r"[,，\s]*\(\s*\)", "", content)
        clean_logs.append({
            "time": item.get("time", ""),
            "content": content
        })
    return clean_logs

class WfqCallbackRequest(BaseModel):
    orderNo: Optional[str] = None
    order_no: Optional[str] = None
    orderNum: Optional[str] = None
    taxpayerId: Optional[str] = None
    taxpayer_id: Optional[str] = None
    company_name: Optional[str] = None
    companyName: Optional[str] = None
    status: Optional[str] = "SUCCESS"
    authResult: Optional[str] = "SUCCESS"
    sign: Optional[str] = None

from app.core.network import get_public_base_url

@router.post("/create")
async def create_xyzp_task(
    req: TaskCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    一键发起尽调任务：
    1. 生成系统唯一任务 ID (task_id) 并校验/扣减额度；
    2. 将 task_id 作为 orderNo 传入微风企接口 (POST /model/wfq/auth)，获取专属 H5 授权地址；
    3. 设置系统回调地址为 /api/v1/tasks/callback，显式携带真实企业主体与统一社会代码参数；
    4. 任务状态初始化为 waiting_auth (等待法人通过二维码或链接访问微风企 H5 完成实名授权)。
    """
    task_id = f"task-{uuid.uuid4().hex[:12]}"
    task_no = f"TSK{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
    
    is_locked = False
    if user.balance_quota >= 1:
        # 正常扣减 1 次额度
        await QuotaService.deduct_quota_for_task(
            session=db,
            user_id=user.id,
            task_id=task_id,
            company_name=req.company_name,
            points=1
        )
    else:
        # 0 额度试用模式：标记为锁定遮罩状态
        is_locked = True
    
    # 构造微风企授权完成后的回调地址 (/api/v1/tasks/callback)，将任务唯一 ID、统一代码与企业名显式嵌入 query 参数，确保 H5 重定向时 100% 携带真实企业业务数据
    base_url = get_public_base_url(request)
    encoded_company = urllib.parse.quote(req.company_name)
    encoded_credit = urllib.parse.quote(req.credit_code)
    callback_url = f"{base_url}/api/v1/tasks/callback?orderNo={task_id}&task_id={task_id}&credit_code={encoded_credit}&company_name={encoded_company}"

    # 调用微风企 Provider 获取专属授权链接（以系统唯一 task_id 作为 orderNo）
    wfq_provider = get_weifengqi_provider()
    auth_res = await wfq_provider.get_auth_link(
        company_name=req.company_name,
        taxpayer_id=req.credit_code,
        cb_url=callback_url,
        order_no=task_id,
        db=db
    )

    auth_h5_url = auth_res.get("auth_url")
    wfq_order_no = auth_res.get("order_no") or task_id
    wfq_req_no = auth_res.get("request_no")

    import secrets
    short_code = secrets.token_urlsafe(5).replace("_", "").replace("-", "")[:6].lower()
    short_url = f"{base_url}/s/{short_code}"

    task = XYZPTask(
        id=task_id,
        task_no=task_no,
        user_id=user.id,
        company_name=req.company_name,
        credit_code=req.credit_code,
        legal_person=req.legal_person,
        scene=req.scene or "bank_credit",
        dimensions=req.dimensions or ['工商股权穿透', '经营司法合规', '金税36月申报矩阵', '发票流水与三费真实性', '供应链客商对标', '财报8大动态预警'],
        auth_mode="weifengqi_qr",
        status="waiting_auth",
        auth_status="pending",
        auth_qrcode_url=short_url,
        auth_link=auth_h5_url,
        short_code=short_code,
        short_url=short_url,
        wfq_order_no=wfq_order_no,
        wfq_request_no=wfq_req_no,
        thinking_logs=[
            {
                "time": datetime.now().strftime("%H:%M:%S"),
                "content": f"尽调任务已成功创建 (任务ID: {task_id}, 目标企业: {req.company_name})，已生成专属实名数据授权通道，等待企业法定代表人扫码确认授权。"
            }
        ]
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {
        "code": 0,
        "message": "尽调任务创建成功，等待法定代表人扫码授权",
        "data": {
            "task_id": task.id,
            "task_no": task.task_no,
            "wfq_order_no": task.wfq_order_no,
            "status": task.status,
            "auth_qrcode_url": task.short_url,
            "auth_short_url": task.short_url,
            "auth_link": task.auth_link
        }
    }

@router.get("/callback", response_class=HTMLResponse)
@router.get("/callback/wfq", response_class=HTMLResponse)
async def weifengqi_auth_callback_get(
    request: Request,
    background_tasks: BackgroundTasks,
    orderNo: Optional[str] = Query(None),
    order_no: Optional[str] = Query(None),
    message: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    requestNo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    微风企企业实名授权 H5 完成后自动页面重定向跳转的 GET 回调入口 (/api/v1/tasks/callback)
    精准解析回显真实的【授权企业主体】与【统一社会信用代码】
    """
    params = dict(request.query_params)
    logger.info(f"[WFQ Callback GET] Received H5 callback redirect: {params}")

    target_order = (
        orderNo 
        or order_no 
        or params.get("orderNo") 
        or params.get("order_no") 
        or params.get("task_id")
        or params.get("taskId")
        or params.get("orderNum") 
        or params.get("outOrderNo")
        or params.get("orderId")
    )
    taxpayer_id = (
        params.get("taxpayerId") 
        or params.get("taxpayer_id") 
        or params.get("credit_code") 
        or params.get("creditCode")
    )
    raw_company_param = params.get("company_name") or params.get("companyName")
    query_company = urllib.parse.unquote(raw_company_param) if raw_company_param else None
    if taxpayer_id:
        taxpayer_id = urllib.parse.unquote(taxpayer_id)

    task = None
    if target_order:
        result = await db.execute(
            select(XYZPTask).where((XYZPTask.id == target_order) | (XYZPTask.wfq_order_no == target_order) | (XYZPTask.task_no == target_order))
        )
        task = result.scalar_one_or_none()

    if not task and taxpayer_id:
        result = await db.execute(
            select(XYZPTask)
            .where(XYZPTask.credit_code == taxpayer_id)
            .order_by(desc(XYZPTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task and query_company:
        result = await db.execute(
            select(XYZPTask)
            .where(XYZPTask.company_name == query_company)
            .order_by(desc(XYZPTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task:
        logger.warning(f"[WFQ Callback GET] 未能匹配到有效的尽调任务单号，拒绝非法回调。参数: {params}")
        html_not_found = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>授权任务未找到 - 享宇AI智评</title>
  <style>
    body { background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
    .card { background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; max-width: 440px; }
    h2 { color: #ef4444; margin-bottom: 12px; }
    p { color: #64748b; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚠️ 授权任务不存在或单号无效</h2>
    <p>系统未能匹配到对应的尽调任务单号。为保护多租户企业数据安全，已终止本次授权流程。请返回系统核实二维码或重新发起尽调任务。</p>
  </div>
</body>
</html>"""
        return HTMLResponse(content=html_not_found, status_code=400)

    company_name = task.company_name
    credit_code = task.credit_code

    # 判断是否为第二次/重复回调
    is_already_authorized = False
    if task and (task.auth_status == "authorized" or (hasattr(task, 'authorized_at') and task.authorized_at)):
        is_already_authorized = True

    if task and not is_already_authorized:
        # ===== 首次接收回调：将任务标记为已授权完毕，并触发下一步流水线 =====
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        task.authorized_at = now_str
        task.auth_status = "authorized"
        task.status = "pulling_data"
        task.thinking_logs = task.thinking_logs or []
        task.thinking_logs.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "content": f"企业【{company_name}】法定代表人实名数据授权已确认通过，系统已自动调度多源数据归集与全景尽调研判流水线..."
        })
        await db.commit()

        # 触发下一步后台全流程
        background_tasks.add_task(TaskService.run_ai_xyzp_task_async, task.id, False)
        first_auth_time = now_str
    else:
        first_auth_time = (task.authorized_at if task and hasattr(task, 'authorized_at') and task.authorized_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # 如果是重复二次回调/已使用过的链接：渲染【授权链接已失效】页面
    if is_already_authorized:
        html_expired_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>授权已完成 - 享宇智评 AI 尽调平台</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }}
    body {{ background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); color: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }}
    .card {{ background: #ffffff; border: 1px solid #cbd5e1; border-radius: 0.75rem; width: 100%; max-width: 440px; padding: 2.5rem 2rem; text-align: center; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); }}
    .icon-box {{ width: 72px; height: 72px; background: #fffbeeb0; border: 2px solid #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto; }}
    .icon-box svg {{ width: 38px; height: 38px; color: #d97706; }}
    h1 {{ font-size: 1.375rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.01em; }}
    p.desc {{ font-size: 0.875rem; color: #475569; line-height: 1.6; margin-bottom: 1.5rem; }}
    .info-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.25rem; text-align: left; margin-bottom: 1.75rem; font-size: 0.8125rem; }}
    .info-row {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.625rem; }}
    .info-row:last-child {{ margin-bottom: 0; }}
    .info-label {{ color: #64748b; font-weight: 500; }}
    .info-value {{ color: #0f172a; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; word-break: break-all; text-align: right; }}
    .btn {{ display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 0.875rem 1.5rem; background: #475569; color: #ffffff; font-weight: 700; font-size: 0.875rem; border-radius: 0.375rem; border: none; cursor: pointer; transition: all 0.2s ease; text-decoration: none; box-shadow: 0 4px 12px 0 rgba(71, 85, 105, 0.2); }}
    .btn:hover {{ background: #334155; transform: translateY(-1px); }}
    .footer {{ margin-top: 1.5rem; font-size: 0.75rem; color: #94a3b8; font-weight: 500; }}
    .badge {{ display: inline-block; padding: 0.2rem 0.6rem; border-radius: 0.25rem; background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.75rem; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
    </div>
    <h1>该授权已处理完成</h1>
    <p class="desc">该企业数据授权已被确认并处于 AI 研判处理中，无需重复操作。</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">授权企业主体：</span>
        <span class="info-value">{company_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">统一社会代码：</span>
        <span class="info-value" style="font-family:monospace;">{credit_code}</span>
      </div>
      <div class="info-row">
        <span class="info-label">授权完成时间：</span>
        <span class="info-value" style="font-family:monospace;">{first_auth_time}</span>
      </div>
    </div>

    <button onclick="window.close();" class="btn">关闭此页面</button>
    <div class="footer">享宇AI智评 · 企业全景尽调平台</div>
  </div>
</body>
</html>"""
        return HTMLResponse(content=html_expired_content, status_code=200)

    # 首次成功回调渲染页面
    html_success_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>企业数据授权成功 - 享宇AI智评</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }}
    body {{ background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); color: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }}
    .card {{ background: #ffffff; border: 1px solid #cbd5e1; border-radius: 0.75rem; width: 100%; max-width: 440px; padding: 2.5rem 2rem; text-align: center; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); }}
    .icon-box {{ width: 72px; height: 72px; background: #ecfdf5; border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto; animation: pulse 2s infinite ease-in-out; }}
    .icon-box svg {{ width: 38px; height: 38px; color: #059669; }}
    h1 {{ font-size: 1.375rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.01em; }}
    p.desc {{ font-size: 0.875rem; color: #475569; line-height: 1.6; margin-bottom: 1.5rem; }}
    .info-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.25rem; text-align: left; margin-bottom: 1.75rem; font-size: 0.8125rem; }}
    .info-row {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.625rem; }}
    .info-row:last-child {{ margin-bottom: 0; }}
    .info-label {{ color: #64748b; font-weight: 500; white-space: nowrap; }}
    .info-value {{ color: #0f172a; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; word-break: break-all; text-align: right; }}
    .btn {{ display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 0.875rem 1.5rem; background: #0369a1; color: #ffffff; font-weight: 700; font-size: 0.875rem; border-radius: 0.375rem; border: none; cursor: pointer; transition: all 0.2s ease; text-decoration: none; box-shadow: 0 4px 12px 0 rgba(3, 105, 161, 0.25); }}
    .btn:hover {{ background: #075985; transform: translateY(-1px); }}
    .footer {{ margin-top: 1.5rem; font-size: 0.75rem; color: #94a3b8; font-weight: 500; }}
    @keyframes pulse {{ 0%, 100% {{ transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.3); }} 50% {{ transform: scale(1.05); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }} }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1>企业数据授权已完成</h1>
    <p class="desc">系统已成功接收到微风企实名数据授权回调，后台 AI 全景尽调研判流水线已自动启动。</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">授权企业主体：</span>
        <span class="info-value">{company_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">统一社会代码：</span>
        <span class="info-value" style="font-family:monospace;">{credit_code}</span>
      </div>
      <div class="info-row">
        <span class="info-label">授权完成时间：</span>
        <span class="info-value" style="font-family:monospace;">{first_auth_time}</span>
      </div>
    </div>

    <button onclick="if(window.opener){{try{{window.opener.location.reload();}}catch(e){{}}}} window.close();" class="btn">完成并关闭此页面</button>
    <div class="footer">享宇AI智评 · 企业全景尽调平台</div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html_success_content, status_code=200)

@router.post("/callback")
@router.post("/callback/wfq")
async def weifengqi_auth_callback_post(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    微风企企业实名授权 Webhook 异步 POST 通知回调入口 (/api/v1/tasks/callback)
    """
    try:
        cb_json = await request.json()
    except Exception:
        cb_json = {}
    
    logger.info(f"[WFQ Callback POST] Received webhook payload: {cb_json}")

    target_order = (
        cb_json.get("orderNo") 
        or cb_json.get("order_no") 
        or cb_json.get("task_id")
        or cb_json.get("orderNum") 
        or cb_json.get("outOrderNo")
        or cb_json.get("orderId")
    )
    taxpayer_id = cb_json.get("taxpayerId") or cb_json.get("taxpayer_id") or cb_json.get("credit_code")
    query_company = cb_json.get("company_name") or cb_json.get("companyName")

    task = None
    if target_order:
        result = await db.execute(
            select(XYZPTask).where((XYZPTask.id == target_order) | (XYZPTask.wfq_order_no == target_order) | (XYZPTask.task_no == target_order))
        )
        task = result.scalar_one_or_none()

    if not task and taxpayer_id:
        result = await db.execute(
            select(XYZPTask)
            .where(XYZPTask.credit_code == taxpayer_id)
            .order_by(desc(XYZPTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task and query_company:
        result = await db.execute(
            select(XYZPTask)
            .where(XYZPTask.company_name == query_company)
            .order_by(desc(XYZPTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task:
        logger.warning(f"[WFQ Callback POST] 未匹配到对应尽调任务，拒绝非法 Webhook 触发。Payload: {cb_json}")
        raise HTTPException(status_code=404, detail="未匹配到对应尽调任务单号，拒绝处理")

    if task.auth_status != "authorized":
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        task.authorized_at = task.authorized_at or now_str
        task.auth_status = "authorized"
        task.status = "pulling_data"
        task.thinking_logs = task.thinking_logs or []
        task.thinking_logs.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "content": f"企业【{task.company_name}】实名授权凭证核验通过，启动数据汇聚与智能尽调研判流水线..."
        })
        await db.commit()

        # 触发下一步后台全流程
        background_tasks.add_task(TaskService.run_ai_xyzp_task_async, task.id, False)

    return {"code": 0, "message": "微风企授权回调处理成功", "data": {"task_id": task.id, "company_name": task.company_name, "status": task.status}}

@router.post("/{task_id}/sync")
async def sync_single_task_status(
    task_id: str,
    background_tasks: BackgroundTasks,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    用户在前端点击【同步授权状态】或【我已完成授权，立即检查】时的实际校验端点：
    实际校验三方的微风企 H5 是否已经进行了授权回调或在微风企端完成实名认证。
    未收到回调/未授权时，严格返回 authorized: False，不擅自修改任务状态！
    """
    if isinstance(actor, AdminUser):
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    else:
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id, XYZPTask.user_id == actor.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status == "completed":
        return {
            "code": 0,
            "message": "尽调报告已生成完成",
            "data": {
                "task_id": task.id,
                "company_name": task.company_name,
                "status": task.status,
                "auth_status": task.auth_status,
                "authorized": True,
                "report_id": task.report_id,
                "is_ready": True
            }
        }
    
    # 1. 若本系统已收到微风企 H5 回调 (auth_status 已为 authorized)
    if task.auth_status == "authorized":
        return {
            "code": 0,
            "message": f"企业【{task.company_name}】实名授权已确认！AI 全景尽调研判流水线正在运行中...",
            "data": {
                "task_id": task.id,
                "company_name": task.company_name,
                "status": task.status,
                "auth_status": task.auth_status,
                "authorized": True,
                "is_ready": True
            }
        }
    
    # 2. 若尚未收到回调，向微风企网关进行实际真实状态校验
    wfq_provider = get_weifengqi_provider()
    order_no = task.id
    taxpayer_id = task.credit_code
    
    status_info = await wfq_provider.check_report_status(order_no=order_no, taxpayer_id=taxpayer_id, db=db)
    is_ready = status_info.get("is_ready", False)
    error_code = status_info.get("errorCode", -1)
    err_msg = status_info.get("errMsg", "")
    is_fallback = status_info.get("raw_response", {}).get("fallback", False)

    # 只有当微风企真实接口明确返回 errorCode == 0 (且非 fallback) 或 555 (报告生成中，证明微风企已接收授权) 时，才判定为三方已授权
    if not is_fallback and (is_ready or error_code in [0, 555]):
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        task.authorized_at = task.authorized_at or now_str
        task.auth_status = "authorized"
        task.status = "pulling_data"
        task.thinking_logs = task.thinking_logs or []
        task.thinking_logs.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "content": f"授权凭证有效性校验通过，企业【{task.company_name}】实名认证就绪，已启动多源数据归集与 AI 全景尽调研判流水线..."
        })
        await db.commit()
        
        is_locked = (user.balance_quota <= 0)
        background_tasks.add_task(TaskService.run_ai_xyzp_task_async, task.id, is_locked)
        
        return {
            "code": 0,
            "message": f"微风企校验通过！企业【{task.company_name}】实名授权已确认，AI 全景尽调流水线已启动！",
            "data": {
                "task_id": task.id,
                "company_name": task.company_name,
                "status": "pulling_data",
                "auth_status": "authorized",
                "authorized": True,
                "is_ready": is_ready,
                "wfq_msg": err_msg
            }
        }

    # 3. 未收到三方 H5 回调且微风企网关未检测到授权完成
    return {
        "code": 0,
        "message": "未检测到法人授权完成，请让企业法定代表人在微信端打开授权链接并提交实名认证。",
        "data": {
            "task_id": task.id,
            "company_name": task.company_name,
            "status": task.status,
            "auth_status": task.auth_status,
            "authorized": False,
            "is_ready": False,
            "wfq_msg": err_msg
        }
    }

@router.post("/{task_id}/authorize")
async def simulate_authorize_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    手动确认授权/模拟授权通道，触发后台全流程流水线
    """
    if isinstance(actor, AdminUser):
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    else:
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id, XYZPTask.user_id == actor.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    task.authorized_at = task.authorized_at or now_str
    task.auth_status = "authorized"
    task.status = "pulling_data"
    task.thinking_logs = task.thinking_logs or []
    task.thinking_logs.append({
        "time": datetime.now().strftime("%H:%M:%S"),
        "content": f"企业法人实名数据授权已确认 (企业: {task.company_name})，启动数据归集、底稿拉取与多源清洗流水线！"
    })
    await db.commit()

    task_user_res = await db.execute(select(User).where(User.id == task.user_id))
    task_user = task_user_res.scalar_one_or_none()
    is_locked = (task_user.balance_quota <= 0) if task_user else False
    background_tasks.add_task(TaskService.run_ai_xyzp_task_async, task.id, is_locked)

    return {
        "code": 0,
        "message": "已完成微风企授权，AI 研判与数据拉取流水线已启动",
        "data": {"task_id": task.id, "company_name": task.company_name, "status": task.status}
    }

@router.get("/list")
async def get_my_tasks(
    status: Optional[str] = None,
    exclude_completed: Optional[bool] = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取我的尽调任务列表（支持分页与状态过滤，按时间倒序）
    任务保持严格的状态流转，未收到回调或授权确认前始终保持 waiting_auth 状态
    """
    query = select(XYZPTask).where(XYZPTask.user_id == user.id)
    if status:
        query = query.where(XYZPTask.status == status)
    elif exclude_completed:
        query = query.where(XYZPTask.status != "completed")

    # 统计总数
    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    # 分页查询
    paged_query = query.order_by(desc(XYZPTask.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(paged_query)
    tasks = result.scalars().all()

    items = []
    for t in tasks:
        items.append({
            "id": t.id,
            "task_no": t.task_no,
            "company_name": t.company_name,
            "credit_code": t.credit_code,
            "legal_person": t.legal_person,
            "scene": t.scene,
            "auth_mode": t.auth_mode,
            "status": t.status,
            "auth_status": t.auth_status,
            "report_id": t.report_id,
            "auth_qrcode_url": t.auth_qrcode_url,
            "auth_link": t.auth_link,
            "wfq_order_no": t.wfq_order_no,
            "wfq_pdf_url": t.wfq_pdf_url,
            "storage_file_id": t.storage_file_id,
            "thinking_logs": sanitize_thinking_logs(t.thinking_logs),
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

@router.get("/{task_id}")
async def get_task_detail(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取单笔尽调任务详情与实时思考流日志 (Thinking Process)
    管理员可查看全站任意任务；普通用户仅能查看自己创建的任务
    """
    if isinstance(actor, AdminUser):
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    else:
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id, XYZPTask.user_id == actor.id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "code": 0,
        "data": {
            "id": t.id,
            "task_no": t.task_no,
            "company_name": t.company_name,
            "credit_code": t.credit_code,
            "legal_person": t.legal_person,
            "scene": t.scene,
            "auth_mode": t.auth_mode,
            "status": t.status,
            "auth_status": t.auth_status,
            "report_id": t.report_id,
            "auth_qrcode_url": t.auth_qrcode_url,
            "auth_link": t.auth_link,
            "wfq_order_no": t.wfq_order_no,
            "wfq_pdf_url": t.wfq_pdf_url,
            "storage_file_id": t.storage_file_id,
            "thinking_logs": sanitize_thinking_logs(t.thinking_logs),
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else ""
        }
    }

@router.get("/{task_id}/admin-progress")
async def get_task_admin_progress(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【运营管理后台】获取指定尽调任务的全局监控进度、完整思考流日志及执行详情
    """
    result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        result2 = await db.execute(select(XYZPTask).where(XYZPTask.task_no == task_id))
        task = result2.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail=f"未找到 ID 为 '{task_id}' 的尽调任务")

    user_phone = "13800138000"
    user_result = await db.execute(select(User).where(User.id == task.user_id))
    u = user_result.scalar_one_or_none()
    if u:
        user_phone = u.phone or u.username or user_phone

    step = 1
    percentage = 25
    if task.status in ["waiting_auth", "auth_failed"]:
        step = 1
        percentage = 25
    elif task.status == "pulling_data":
        step = 2
        percentage = 50
    elif task.status == "ai_analyzing":
        step = 3
        percentage = 75
    elif task.status == "completed" or task.report_id:
        step = 4
        percentage = 100
    elif task.status == "failed":
        logs = task.thinking_logs or []
        if any("生成" in str(x) or "研判" in str(x) for x in logs):
            step = 3
            percentage = 75
        elif any("底稿" in str(x) or "清洗" in str(x) or "下载" in str(x) for x in logs):
            step = 2
            percentage = 50
        else:
            step = 1
            percentage = 25

    step_history = [
        {"step": 1, "name": "企业实名授权", "status": "done" if step > 1 or task.auth_status == "authorized" else ("error" if task.status == "failed" and step == 1 else "active")},
        {"step": 2, "name": "涉税底稿拉取与清洗", "status": "done" if step > 2 else ("error" if task.status == "failed" and step == 2 else ("active" if step == 2 else "pending"))},
        {"step": 3, "name": "知识图谱与AI深度研判", "status": "done" if step > 3 else ("error" if task.status == "failed" and step == 3 else ("active" if step == 3 else "pending"))},
        {"step": 4, "name": "尽调全景报告生成", "status": "done" if step >= 4 and task.status == "completed" else ("error" if task.status == "failed" and step == 4 else ("active" if step == 4 else "pending"))},
    ]

    clean_logs = sanitize_thinking_logs(task.thinking_logs)
    raw_logs = task.thinking_logs or []

    data = {
        "id": task.id,
        "task_id": task.id,
        "task_no": task.task_no,
        "user_id": task.user_id,
        "user_phone": user_phone,
        "company_name": task.company_name,
        "credit_code": task.credit_code,
        "legal_person": task.legal_person,
        "scene": task.scene,
        "auth_mode": task.auth_mode,
        "status": task.status,
        "auth_status": task.auth_status,
        "authorized_at": task.authorized_at,
        "step": step,
        "percentage": percentage,
        "step_history": step_history,
        "report_id": task.report_id,
        "risk_level": task.risk_level,
        "error_message": task.error_message or "",
        "auth_link": task.auth_link,
        "auth_qrcode_url": task.auth_qrcode_url,
        "wfq_order_no": task.wfq_order_no,
        "wfq_pdf_url": task.wfq_pdf_url,
        "storage_file_id": task.storage_file_id,
        "thinking_logs": clean_logs,
        "sanitized_logs": clean_logs,
        "raw_thinking_logs": raw_logs,
        "raw_logs": raw_logs,
        "logs": clean_logs,
        "created_at": task.created_at.strftime("%Y-%m-%d %H:%M:%S") if task.created_at else "",
        "updated_at": task.updated_at.strftime("%Y-%m-%d %H:%M:%S") if task.updated_at else ""
    }

    return {
        "code": 0,
        "message": "success",
        "data": data
    }

class TaskRetryRequest(BaseModel):
    step: Optional[int] = None

@router.post("/{task_id}/retry")
@router.post("/{task_id}/retry-analysis")
async def retry_xyzp_task(
    task_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    req_body: Optional[TaskRetryRequest] = None,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【用户端 / 管理后台】统一尽调任务智能断点重试入口 (POST /api/v1/tasks/{task_id}/retry & /retry-analysis)
    
    重试策略：
    - 若指定了 step (1~4)，按指定 step 恢复执行；
    - 若未指定 step：
      1. 若状态为 waiting_auth 或 auth_failed，重新生成专属实名授权链接与二维码 (Step 1)；
      2. 若没有 MinIO 清洗后 PDF 或 Step 2 失败，从 Step 2 (数据获取与纯代码清洗) 重新下载并清洗；
      3. 若 MinIO 中已有清洗后 PDF 但 AI 衍生资产缺失，从 Step 3 (AI 研判) 重新调用大模型解析清洗后 PDF，无需重新下载；
      4. 若 MinIO 5 大文件齐全但报告生成失败，从 Step 4 重新组装报告。
    """
    if isinstance(actor, AdminUser):
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    else:
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id, XYZPTask.user_id == actor.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    target_step = req_body.step if req_body and req_body.step in [1, 2, 3, 4] else None

    # Step 1 智能推断或显式指定
    if target_step == 1 or (target_step is None and (task.status in ["waiting_auth", "auth_failed"] or task.auth_status != "authorized")):
        # 重新生成授权码
        wfq_provider = get_weifengqi_provider()
        public_base_url = get_public_base_url(request)
        encoded_company = urllib.parse.quote(task.company_name)
        encoded_credit = urllib.parse.quote(task.credit_code)
        callback_url = f"{public_base_url}/api/v1/tasks/callback?orderNo={task.id}&task_id={task.id}&credit_code={encoded_credit}&company_name={encoded_company}"

        auth_res = await wfq_provider.get_auth_link(
            company_name=task.company_name,
            taxpayer_id=task.credit_code,
            cb_url=callback_url,
            order_no=task.id,
            db=db
        )
        task.status = "waiting_auth"
        task.auth_status = "pending"
        task.auth_link = auth_res.get("auth_url") or task.auth_link
        task.wfq_order_no = auth_res.get("order_no") or task.wfq_order_no
        task.error_message = None

        TaskService.append_task_log(task, "【重新授权】已重新生成专属实名数据授权通道，等待企业法定代表人扫码授权。")
        await db.commit()

        return {
            "code": 0,
            "message": "已重新生成法人授权链接与二维码",
            "data": {
                "task_id": task.id,
                "step": 1,
                "step_title": "授权信息",
                "status": task.status,
                "auth_status": task.auth_status,
                "auth_qrcode_url": task.short_url or task.auth_qrcode_url,
                "auth_link": task.auth_link
            }
        }

    # Step 2~4 智能推断
    if target_step is None:
        health = await FileStorageService.check_task_files_health(db, task.id)
        if not health.get("has_pdf"):
            target_step = 2
        elif not health.get("has_ai_artifacts"):
            target_step = 3
        else:
            target_step = 4

    step_title_map = {
        2: "数据获取 (纯代码清洗)",
        3: "AI 研判 (知识库与画像生成)",
        4: "报告生成 (文件核验与资产落库)"
    }
    step_title = step_title_map.get(target_step, "AI 研判")

    task.error_message = None
    if target_step == 2:
        task.status = "pulling_data"
    elif target_step == 3:
        task.status = "ai_analyzing"
    elif target_step == 4:
        task.status = "generating_report"

    TaskService.append_task_log(task, f"【断点重试】用户已触发重试操作，将从【{step_title}】节点恢复执行风控流水线...")
    await db.commit()

    task_user_res = await db.execute(select(User).where(User.id == task.user_id))
    task_user = task_user_res.scalar_one_or_none()
    is_locked = (task_user.balance_quota <= 0) if task_user else False

    background_tasks.add_task(TaskService.run_ai_xyzp_task_async, task.id, is_locked, target_step)

    return {
        "code": 0,
        "message": f"任务已重新启动，将从【{step_title}】节点继续执行！",
        "data": {
            "task_id": task.id,
            "step": target_step,
            "step_title": step_title,
            "status": task.status
        }
    }

@router.post("/{task_id}/reauth")
async def reauth_task(
    task_id: str,
    request: Request,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【运营管理/用户端】重新生成尽调法人授权链接与二维码
    """
    if isinstance(actor, AdminUser):
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    else:
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id, XYZPTask.user_id == actor.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    wfq_provider = get_weifengqi_provider()
    public_base_url = get_public_base_url(request)
    encoded_company = urllib.parse.quote(task.company_name)
    encoded_credit = urllib.parse.quote(task.credit_code)
    callback_url = f"{public_base_url}/api/v1/tasks/callback?orderNo={task.id}&task_id={task.id}&credit_code={encoded_credit}&company_name={encoded_company}"

    auth_res = await wfq_provider.get_auth_link(
        company_name=task.company_name,
        taxpayer_id=task.credit_code,
        cb_url=callback_url,
        order_no=task.id,
        db=db
    )

    task.status = "waiting_auth"
    task.auth_status = "pending"
    task.auth_link = auth_res.get("auth_url") or task.auth_link
    task.wfq_order_no = auth_res.get("order_no") or task.wfq_order_no
    task.thinking_logs = task.thinking_logs or []
    task.thinking_logs.append({
        "time": datetime.now().strftime("%H:%M:%S"),
        "content": "管理员已重新发起微风企涉税数据授权通道，生成全新授权二维码及专属移动端链接。"
    })
    await db.commit()

    return {
        "code": 0,
        "message": "已重新生成法人授权链接与二维码",
        "data": {
            "task_id": task.id,
            "status": task.status,
            "auth_status": task.auth_status,
            "auth_qrcode_url": task.short_url or task.auth_qrcode_url,
            "auth_link": task.auth_link
        }
    }

@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【运营管理后台】人工取消尽调任务并退还用户已扣减的尽调额度
    """
    if isinstance(actor, AdminUser):
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    else:
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id, XYZPTask.user_id == actor.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status == "completed":
        raise HTTPException(status_code=400, detail="已完成的尽调报告任务无法取消")

    task.status = "cancelled"
    task.thinking_logs = task.thinking_logs or []
    task.thinking_logs.append({
        "time": datetime.now().strftime("%H:%M:%S"),
        "content": "管理员人工终止当前尽调分析任务，流程已闭环取消，相关额度资产自动回滚退还。"
    })

    await QuotaService.refund_quota_for_task(
        session=db,
        user_id=task.user_id,
        task_id=task.id,
        company_name=task.company_name,
        points=1,
        reason="管理员人工取消尽调任务"
    )

    await db.commit()
    return {
        "code": 0,
        "message": "任务已成功取消，额度已退还用户账户",
        "data": {"task_id": task.id, "status": task.status}
    }

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    删除指定的尽调任务 (支持清理卡住或不需要的任务)
    """
    if isinstance(actor, AdminUser):
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    else:
        result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id, XYZPTask.user_id == actor.id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在或无权限删除")

    await db.delete(t)
    await db.commit()
    return {"code": 0, "message": "任务删除成功", "data": {"task_id": task_id}}

@router.get("/{task_id}/catalog")
async def get_task_catalog(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【前端获取目录数据 API】链路：前端 -> 后端 API -> 从 MinIO 读取 pdf_toc_json 文件 -> 返回给前端
    """
    result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if not isinstance(actor, AdminUser) and task.user_id != actor.id:
        raise HTTPException(status_code=403, detail="无权访问该尽调任务数据")

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
            logger.warning(f"[TasksAPI] 从 MinIO 读取目录 JSON 失败 (task={task_id}): {e}")

    if not catalog_data:
        report_res = await db.execute(select(XYZPReport).where(XYZPReport.task_id == task_id))
        report = report_res.scalar_one_or_none()
        toc = (report.content_json.get("toc_catalog") if report and report.content_json else []) or []
        catalog_data = {
            "task_id": task_id,
            "company_name": task.company_name,
            "credit_code": task.credit_code,
            "toc_catalog": toc,
            "source": "fallback"
        }

    return {
        "code": 0,
        "message": "success",
        "data": catalog_data
    }

@router.get("/{task_id}/content-text")
async def get_task_content_text(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【从 MinIO 读取步骤 3 解析形成的纯文本数据】(full_text_content)
    """
    result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if not isinstance(actor, AdminUser) and task.user_id != actor.id:
        raise HTTPException(status_code=403, detail="无权访问该尽调任务数据")

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

    # 路径推导兜底：若 DB 记录丢失但 MinIO 中实际存有文件
    other_files = await db.execute(
        select(TaskFile).where(TaskFile.task_id == task_id)
    )
    for of in other_files.scalars().all():
        if of.file_path:
            task_dir = "/".join(of.file_path.split("/")[:-1])
            for candidate_name in ["content_text.txt", "pdf_content.txt", "full_text_content.txt"]:
                candidate = f"{task_dir}/{candidate_name}"
                if minio_mgr.object_exists(candidate):
                    raw_bytes = minio_mgr.get_object_bytes(candidate)
                    return Response(content=raw_bytes, media_type="text/plain; charset=utf-8")

    # 兜底降级查报告中的已存信息
    report_res = await db.execute(select(XYZPReport).where(XYZPReport.task_id == task_id))
    report = report_res.scalar_one_or_none()
    if report:
        txt = f"【企业尽调核心信息】\n企业名称：{report.company_name}\n统一社会信用代码：{report.credit_code}\n法定代表人：{report.legal_person or '未记载'}\n风控评级：{report.risk_level}\n综合评分：{report.score}\n建议授信：{report.suggested_quota_min}~{report.suggested_quota_max}万元\n"
        if report.summary_ai_comment:
            txt += f"\n【AI风控研判综述】\n{report.summary_ai_comment}\n"
        return Response(content=txt, media_type="text/plain; charset=utf-8")

    raise HTTPException(status_code=404, detail="未找到该任务的解析文本存证文件")

@router.get("/{task_id}/knowledge-base")
async def get_task_knowledge_base(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【从 MinIO 读取步骤 4 AI 生成的标准 Markdown 知识库文件】(knowledge_base.md)
    """
    result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if not isinstance(actor, AdminUser) and task.user_id != actor.id:
        raise HTTPException(status_code=403, detail="无权访问该尽调任务数据")

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

    # 路径推导兜底：若 DB 记录丢失但 MinIO 中实际存有文件
    other_files = await db.execute(
        select(TaskFile).where(TaskFile.task_id == task_id)
    )
    for of in other_files.scalars().all():
        if of.file_path:
            task_dir = "/".join(of.file_path.split("/")[:-1])
            for candidate_name in ["knowledge_base.md", "pdf_knowledge.md", "knowledge.md"]:
                candidate = f"{task_dir}/{candidate_name}"
                if minio_mgr.object_exists(candidate):
                    raw_bytes = minio_mgr.get_object_bytes(candidate)
                    return Response(content=raw_bytes, media_type="text/markdown; charset=utf-8")

    # 兜底降级查报告中的已存知识库/Markdown数据
    report_res = await db.execute(select(XYZPReport).where(XYZPReport.task_id == task_id))
    report = report_res.scalar_one_or_none()
    if report:
        kb_content = ""
        if isinstance(report.content_json, dict):
            kb_content = report.content_json.get("markdown_knowledge_base") or report.content_json.get("knowledge_base_md") or ""
        if not kb_content:
            kb_content = f"# {report.company_name} 尽调报告知识库\n\n- 统一社会信用代码: {report.credit_code}\n- 法定代表人: {report.legal_person or '未记载'}\n- 风险评级: {report.risk_level}\n- 综合评分: {report.score}\n- 建议授信: {report.suggested_quota_min}~{report.suggested_quota_max} 万元\n\n## AI研判综述\n{report.summary_ai_comment or '暂无'}\n"
        return Response(content=kb_content, media_type="text/markdown; charset=utf-8")

    raise HTTPException(status_code=404, detail="未找到该任务的 AI Markdown 知识库存证文件")

@router.get("/{task_id}/summary")
async def get_task_summary(
    task_id: str,
    actor = Depends(get_current_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """
    【从 MinIO 读取步骤 5 AI 深度总结 JSON 数据】(summary.json)
    返回结构: { "code": 0, "message": "success", "data": { "enterprise_profile": "...", "risk_assessment": [...] } }
    """
    result = await db.execute(select(XYZPTask).where(XYZPTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if not isinstance(actor, AdminUser) and task.user_id != actor.id:
        raise HTTPException(status_code=403, detail="无权访问该尽调任务数据")

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

    # 路径推导兜底：若 DB 记录丢失但 MinIO 中实际存有文件
    other_files = await db.execute(
        select(TaskFile).where(TaskFile.task_id == task_id)
    )
    for of in other_files.scalars().all():
        if of.file_path:
            task_dir = "/".join(of.file_path.split("/")[:-1])
            for candidate_name in ["summary.json", "pdf_summary.json"]:
                candidate = f"{task_dir}/{candidate_name}"
                if minio_mgr.object_exists(candidate):
                    raw_bytes = minio_mgr.get_object_bytes(candidate)
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
    report_res = await db.execute(select(XYZPReport).where(XYZPReport.task_id == task_id))
    report = report_res.scalar_one_or_none()
    if report:
        ov = report.content_json.get("overall_ai_summary") if (report.content_json and isinstance(report.content_json, dict)) else None
        if ov and isinstance(ov, dict):
            return {
                "code": 0,
                "message": "success",
                "data": {
                    "enterprise_profile": ov.get("summary", "") or ov.get("enterprise_profile", ""),
                    "risk_assessment": [kp for kp in (ov.get("key_points") or ov.get("risk_assessment") or [])]
                }
            }
        if report.summary_ai_comment:
            return {
                "code": 0,
                "message": "success",
                "data": {
                    "enterprise_profile": report.summary_ai_comment,
                    "risk_assessment": []
                }
            }

    raise HTTPException(status_code=404, detail="未找到该任务的 AI 总结存证文件")

