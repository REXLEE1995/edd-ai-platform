import asyncio
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.user import User
from app.models.task import DDTask
from app.schemas.task import TaskCreateRequest, TaskSummaryResponse
from app.services.quota_service import QuotaService
from app.services.task_service import TaskService
from app.api.deps import get_current_user

router = APIRouter(prefix="/tasks", tags=["尽调任务"])

@router.post("/create")
async def create_dd_task(
    req: TaskCreateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    一键发起尽调任务：
    - 若额度充足 (balance_quota >= 1)，自动扣减 1 次额度并生成全量解锁报告；
    - 若额度不足 (balance_quota == 0)，依然允许发起体验（免费公开工商司法初审，AI 核心深度研判部分加遮罩保护，充值后可随时一键解锁）。
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
    
    auth_code = f"WFQ-{uuid.uuid4().hex[:8].upper()}"
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
        auth_qrcode_url=f"https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https://edd.ai/auth/{auth_code}",
        auth_link=f"https://edd.ai/auth/{auth_code}",
        thinking_logs=[
            {"time": datetime.now().strftime("%H:%M:%S"), "content": "企业尽调任务已创建，请法定代表人使用微信扫码完成实名数据授权。"}
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
            "status": task.status,
            "auth_qrcode_url": task.auth_qrcode_url,
            "auth_link": task.auth_link
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
    模拟企业法人完成享宇金税数据中台授权，触发后台异步分析研判
    """
    result = await db.execute(select(DDTask).where(DDTask.id == task_id, DDTask.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task.auth_status = "authorized"
    task.status = "pulling_data"
    task.thinking_logs = task.thinking_logs or []
    task.thinking_logs.append({
        "time": datetime.now().strftime("%H:%M:%S"),
        "content": "收到享宇金税数据中台授权回调通知，企业法人已成功签署授权！"
    })
    await db.commit()

    is_locked = (user.balance_quota <= 0)
    background_tasks.add_task(TaskService.run_ai_dd_task_async, task.id, is_locked)

    return {
        "code": 0,
        "message": "已完成享宇金税数据中台授权，AI 研判工作流已启动",
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
            "thinking_logs": t.thinking_logs,
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
            "thinking_logs": t.thinking_logs or [],
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else ""
        }
    }
