import asyncio
import uuid
import urllib.parse
from datetime import datetime
from typing import Optional, Dict, Any
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

router = APIRouter(prefix="/tasks", tags=["尽调任务"])

class WfqCallbackRequest(BaseModel):
    orderNo: Optional[str] = None
    taxpayerId: Optional[str] = None
    status: Optional[str] = "SUCCESS"
    authResult: Optional[str] = "SUCCESS"
    sign: Optional[str] = None

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
    1. 额度校验与扣减；
    2. 调用微风企授权链接获取接口 (POST /model/wfq/auth)，获取专属 H5 授权地址与订单号；
    3. 生成专属法人实名授权二维码并反显至任务；
    4. 任务状态初始化为 waiting_auth (等待法人授权)。
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
    
    # 构造系统回调地址
    base_url = str(request.base_url).rstrip("/")
    callback_url = f"{base_url}/api/v1/tasks/callback/wfq"

    # 调用微风企 Provider 获取第一步的专属授权链接
    wfq_provider = get_weifengqi_provider()
    auth_res = await wfq_provider.get_auth_link(
        company_name=req.company_name,
        taxpayer_id=req.credit_code,
        cb_url=callback_url,
        order_no=f"wfq_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}",
        db=db
    )

    auth_h5_url = auth_res.get("auth_url")
    wfq_order_no = auth_res.get("order_no")
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
                "content": f"尽调任务已创建，已生成极简短码 ({short_code}) 与微风企专属授权链接 (单号: {wfq_order_no})，请法定代表人打开 H5 页面或扫码完成实名数据授权。"
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

@router.get("/callback/wfq", response_class=HTMLResponse)
async def weifengqi_auth_callback_get(
    background_tasks: BackgroundTasks,
    orderNo: Optional[str] = Query(None),
    order_no: Optional[str] = Query(None),
    message: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    requestNo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    微风企企业实名授权 H5 完成后 H5 自动页面重定向跳转的 GET 入口
    具有防重用与首次授权时间记录机制：
    - 首次访问回调：固化记录首次授权完成时间戳，启动后台研判流水线，返显授权完成成功页面；
    - 再次访问回调：校验发现已授权完成，返回【授权链接已失效 / 已使用】提示页面。
    """
    target_order = orderNo or order_no
    
    task = None
    if target_order:
        result = await db.execute(
            select(DDTask).where((DDTask.wfq_order_no == target_order) | (DDTask.task_no == target_order))
        )
        task = result.scalar_one_or_none()

    if not task:
        result_pending = await db.execute(
            select(DDTask)
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result_pending.scalar_one_or_none()

    company_name = task.company_name if task else "目标企业"
    credit_code = task.credit_code if task else "已核验"

    # 判断是否为第二次/重复回调
    is_already_authorized = False
    if task and (task.auth_status == "authorized" or hasattr(task, 'authorized_at') and task.authorized_at):
        is_already_authorized = True

    if task and not is_already_authorized:
        # ===== 首次回调授权处理 =====
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        task.authorized_at = now_str
        task.auth_status = "authorized"
        task.status = "pulling_data"
        task.thinking_logs = task.thinking_logs or []
        task.thinking_logs.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "content": f"收到微风企 H5 授权回调通知，企业法人已成功完成实名授权！AI 全景尽调流水线已自动启动..."
        })
        await db.commit()

        # 触发后台 Worker
        background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, False)

        first_auth_time = now_str
    else:
        # ===== 重复/后续回调：取记录的第一次授权完成时间 =====
        first_auth_time = (task.authorized_at if task and hasattr(task, 'authorized_at') and task.authorized_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # 如果是重复二次回调/已使用过的链接：渲染【授权链接已失效】页面
    if is_already_authorized:
        html_expired_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>授权链接已失效 - 享宇智评 AI 尽调平台</title>
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
    .info-value {{ color: #0f172a; font-weight: 700; font-family: monospace; word-break: break-all; }}
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
    <h1>该授权链接已失效</h1>
    <p class="desc">该企业数据授权链接已被使用或已处理完成，无需重复授权。页面已自动失效。</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">授权企业主体：</span>
        <span class="info-value">{company_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">统一社会代码：</span>
        <span class="info-value">{credit_code}</span>
      </div>
      <div class="info-row">
        <span class="info-label">首次授权完成时间：</span>
        <span class="info-value">{first_auth_time}</span>
      </div>
      <div class="info-row">
        <span class="info-label">授权链接状态：</span>
        <span class="badge">已失效 (不可重复访问)</span>
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
    .info-label {{ color: #64748b; font-weight: 500; }}
    .info-value {{ color: #0f172a; font-weight: 700; font-family: monospace; word-break: break-all; }}
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
    <p class="desc">系统已成功接收到您的实名数据授权，后台 AI 全景尽调研判流水线已自动启动。</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">授权企业主体：</span>
        <span class="info-value">{company_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">统一社会代码：</span>
        <span class="info-value">{credit_code}</span>
      </div>
      <div class="info-row">
        <span class="info-label">授权完成时间：</span>
        <span class="info-value">{first_auth_time}</span>
      </div>
    </div>

    <button onclick="if(window.opener){{try{{window.opener.location.reload();}}catch(e){{}}}} window.close();" class="btn">完成并关闭此页面</button>
    <div class="footer">EDD AI Platform · 享宇智评企业全景尽调平台</div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html_success_content, status_code=200)

@router.post("/callback/wfq")
async def weifengqi_auth_callback_post(
    cb_data: WfqCallbackRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    微风企企业实名授权 Webhook 异步 POST 通知回调入口
    """
    target_order = cb_data.orderNo or cb_data.order_no
    task = None
    if target_order:
        result = await db.execute(
            select(DDTask).where((DDTask.wfq_order_no == target_order) | (DDTask.task_no == target_order))
        )
        task = result.scalar_one_or_none()

    if not task:
        result_pending = await db.execute(
            select(DDTask)
            .where(DDTask.status == "waiting_auth")
            .order_by(desc(DDTask.created_at))
            .limit(1)
        )
        task = result_pending.scalar_one_or_none()
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
            "content": f"收到微风企 Webhook 授权回调通知，企业法人已完成实名授权！启动尽调研判流水线..."
        })
        await db.commit()

        # 触发后台 Worker
        background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, False)

    return {"code": 0, "message": "微风企授权回调处理成功", "data": {"task_id": task.id, "status": task.status}}

@router.post("/{task_id}/authorize")
async def simulate_authorize_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    模拟企业法人完成微风企金税授权（或前端测试便捷通道），触发后台全流程流水线
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
        "content": f"微风企企业法人实名授权已确认 (单号: {task.wfq_order_no or task.task_no})，启动报告查询、PDF拉取与多源清洗流水线！"
    })
    await db.commit()

    is_locked = (user.balance_quota <= 0)
    background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, is_locked)

    return {
        "code": 0,
        "message": "已完成微风企授权，AI 研判与数据拉取流水线已启动",
        "data": {"task_id": task.id, "status": task.status}
    }

@router.get("/list")
async def get_my_tasks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取我的尽调任务列表（支持按时间倒序）
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
