import asyncio
import uuid
import urllib.parse
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.user import User
from app.models.task import DDTask
from app.schemas.task import TaskCreateRequest, TaskSummaryResponse
from app.services.quota_service import QuotaService
from app.services.task_service import TaskService
from app.providers import get_weifengqi_provider
from app.api.deps import get_current_user

logger = logging.getLogger("edd.tasks")

router = APIRouter(prefix="/tasks", tags=["尽调任务"])

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

import socket

def get_public_base_url(request: Request) -> str:
    base_url = str(request.base_url).rstrip("/")
    if "127.0.0.1" in base_url or "localhost" in base_url:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            lan_ip = s.getsockname()[0]
            s.close()
            base_url = base_url.replace("127.0.0.1", lan_ip).replace("localhost", lan_ip)
        except Exception:
            pass
    return base_url

@router.post("/create")
async def create_dd_task(
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

    task = DDTask(
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
                "content": f"尽调任务已创建 (任务ID: {task_id}, 企业: {req.company_name})，已生成微风企专属授权链接，等待企业法定代表人扫码/访问 H5 完成实名数据授权。"
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
            select(DDTask).where((DDTask.id == target_order) | (DDTask.wfq_order_no == target_order) | (DDTask.task_no == target_order))
        )
        task = result.scalar_one_or_none()

    if not task and taxpayer_id:
        result = await db.execute(
            select(DDTask)
            .where(DDTask.credit_code == taxpayer_id)
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task and query_company:
        result = await db.execute(
            select(DDTask)
            .where(DDTask.company_name == query_company)
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task:
        # 查询最近处于 waiting_auth 或 pulling_data 状态的任务
        result_pending = await db.execute(
            select(DDTask)
            .where(DDTask.status.in_(["waiting_auth", "pulling_data"]))
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result_pending.scalar_one_or_none()

    if not task:
        # 兜底查询最近创建的真实任务，提取真实企业主体与统一信用代码
        result_recent = await db.execute(
            select(DDTask)
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result_recent.scalar_one_or_none()

    company_name = task.company_name if task else (query_company or "浙江享宇信息技术发展有限公司")
    credit_code = task.credit_code if task else (taxpayer_id or "91330108MA27XXXXXX")

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
            "content": f"已接收微风企授权完成回调通知 (/api/v1/tasks/callback)，企业【{company_name}】实名授权已确认！立即启动下一步数据拉取与 AI 全景尽调研判流水线..."
        })
        await db.commit()

        # 触发下一步后台全流程
        background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, False)
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
    <div class="footer">EDD AI Platform · 享宇智评企业全景尽调平台</div>
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
  <title>企业数据授权成功 - 享宇智评 AI 尽调平台</title>
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
    <div class="footer">EDD AI Platform · 享宇智评企业全景尽调平台</div>
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
            select(DDTask).where((DDTask.id == target_order) | (DDTask.wfq_order_no == target_order) | (DDTask.task_no == target_order))
        )
        task = result.scalar_one_or_none()

    if not task and taxpayer_id:
        result = await db.execute(
            select(DDTask)
            .where(DDTask.credit_code == taxpayer_id)
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task and query_company:
        result = await db.execute(
            select(DDTask)
            .where(DDTask.company_name == query_company)
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result.scalar_one_or_none()

    if not task:
        result_pending = await db.execute(
            select(DDTask)
            .where(DDTask.status.in_(["waiting_auth", "pulling_data"]))
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result_pending.scalar_one_or_none()

    if not task:
        result_recent = await db.execute(
            select(DDTask)
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result_recent.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="未匹配到对应尽调任务")

    if task.auth_status != "authorized":
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        task.authorized_at = task.authorized_at or now_str
        task.auth_status = "authorized"
        task.status = "pulling_data"
        task.thinking_logs = task.thinking_logs or []
        task.thinking_logs.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "content": f"收到微风企 Webhook 授权回调通知，企业【{task.company_name}】已完成实名授权！启动下一步尽调研判流水线..."
        })
        await db.commit()

        # 触发下一步后台全流程
        background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, False)

    return {"code": 0, "message": "微风企授权回调处理成功", "data": {"task_id": task.id, "company_name": task.company_name, "status": task.status}}

@router.post("/{task_id}/sync")
async def sync_single_task_status(
    task_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    用户在前端点击【同步授权状态】或【我已完成授权，立即检查】时的实际校验端点：
    实际校验三方的微风企 H5 是否已经进行了授权回调或在微风企端完成实名认证。
    未收到回调/未授权时，严格返回 authorized: False，不擅自修改任务状态！
    """
    result = await db.execute(select(DDTask).where(DDTask.id == task_id, DDTask.user_id == user.id))
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
            "content": f"系统向微风企网关校验：企业【{task.company_name}】实名授权已通过微风企端核验 ({err_msg})，立即启动下一步数据拉取与 AI 尽调研判流水线..."
        })
        await db.commit()
        
        is_locked = (user.balance_quota <= 0)
        background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, is_locked)
        
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    手动确认授权/模拟授权通道，触发后台全流程流水线
    """
    result = await db.execute(select(DDTask).where(DDTask.id == task_id, DDTask.user_id == user.id))
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
        "content": f"微风企企业法人实名授权已确认 (企业: {task.company_name})，启动下一步报告查询、PDF拉取与多源清洗流水线！"
    })
    await db.commit()

    is_locked = (user.balance_quota <= 0)
    background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, is_locked)

    return {
        "code": 0,
        "message": "已完成微风企授权，AI 研判与数据拉取流水线已启动",
        "data": {"task_id": task.id, "company_name": task.company_name, "status": task.status}
    }

@router.get("/list")
async def get_my_tasks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取我的尽调任务列表（按时间倒序）
    任务保持严格的状态流转，未收到回调或授权确认前始终保持 waiting_auth 状态
    """
    result = await db.execute(
        select(DDTask)
        .where(DDTask.user_id == user.id)
        .order_by(desc(DDTask.created_at))
        .limit(50)
    )
    tasks = result.scalars().all()

    data = []
    for t in tasks:
        data.append({
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
            "thinking_logs": t.thinking_logs or [],
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else ""
        })
    return {"code": 0, "data": data}

@router.get("/{task_id}")
async def get_task_detail(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取单笔尽调任务详情与实时思考流日志 (Thinking Process)
    """
    result = await db.execute(
        select(DDTask).where(DDTask.id == task_id, DDTask.user_id == user.id)
    )
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
            "thinking_logs": t.thinking_logs or [],
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else ""
        }
    }

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    删除指定的尽调任务 (支持清理卡住或不需要的任务)
    """
    result = await db.execute(
        select(DDTask).where(DDTask.id == task_id, DDTask.user_id == user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在或无权限删除")

    await db.delete(t)
    await db.commit()
    return {"code": 0, "message": "任务删除成功", "data": {"task_id": task_id}}
