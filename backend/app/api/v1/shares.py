import os
import uuid
import random
from typing import Optional
from datetime import datetime, timedelta
from app.core.timezone import shanghai_now
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.user import User
from app.models.report import XYZPReport
from app.models.report_share import ReportShare
from app.api.deps import get_current_user

router = APIRouter(prefix="/shares", tags=["报告加密分享与管理"])

# Pydantic Schemas
class CreateShareRequest(BaseModel):
    access_code: Optional[str] = Field(None, description="6 位访问密码 (若为空则自动随机生成)")
    expire_days: Optional[int] = Field(15, description="分享有效天数：0 或 None 表示永久有效，或自定义天数 (如 1, 3, 7, 15, 30, 90)")

class UpdatePasswordRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6, description="新 6 位数字访问密码")

class UpdateExpirationRequest(BaseModel):
    expire_days: Optional[int] = Field(..., description="分享有效天数：0 或 None 表示永久有效，或指定天数 (1~365)")

class VerifyShareRequest(BaseModel):
    share_code: str = Field(..., description="分享唯一识别码")
    access_code: str = Field(..., min_length=6, max_length=6, description="输入的 6 位访问密码")


def compute_share_expiry_info(expire_at: Optional[datetime]) -> tuple[bool, Optional[int], str, Optional[str]]:
    """
    计算分享链接的有效期状态
    返回: (is_expired, remaining_days, expires_in_text, expire_at_str)
    """
    if expire_at is None:
        return False, None, "永久有效 (不过期)", None
    
    now = shanghai_now()
    diff = expire_at - now
    if diff.total_seconds() <= 0:
        return True, 0, f"分享链接已失效 (失效于 {expire_at.strftime('%Y-%m-%d %H:%M')})", expire_at.strftime("%Y-%m-%d %H:%M:%S")
    
    remaining_days = max(1, int(diff.total_seconds() // 86400) + 1)
    return False, remaining_days, f"有效期至 {expire_at.strftime('%Y-%m-%d %H:%M')} (剩余 {remaining_days} 天)", expire_at.strftime("%Y-%m-%d %H:%M:%S")


# =========================================================================
# 1. 发起/获取当前报告的 6 位密码加密分享 (需登录，自定义有效期)
# =========================================================================
@router.post("/reports/{report_id}/create")
async def create_or_get_report_share(
    report_id: str,
    req: Optional[CreateShareRequest] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    为指定已完成尽调报告生成或更新 6 位密码加密分享链接 (支持自定义有效天数 / 永久有效)
    """
    # 1. 获取报告信息 (兼容预设报告和数据库真实报告)
    company_name = "东莞市顺捷实业有限公司"
    credit_code = "91441900MA4W6BGB8T"

    result = await db.execute(select(XYZPReport).where(XYZPReport.id == report_id))
    r = result.scalar_one_or_none()

    if r:
        company_name = r.company_name
        credit_code = r.credit_code
    elif "hangzhou" in report_id.lower() or "16320551" in report_id.lower():
        company_name = "杭州高新智能科技股份有限公司"
        credit_code = "91330100MA28T4998L"
    elif "shunjie" in report_id.lower():
        company_name = "东莞市顺捷实业有限公司"
        credit_code = "91441900MA4W6BGB8T"

    # 2. 计算自定义失效时间 (0 或 None 代表永久有效)
    expire_days = req.expire_days if req and req.expire_days is not None else 15
    if expire_days is not None and expire_days > 0:
        expire_at = shanghai_now() + timedelta(days=expire_days)
    else:
        expire_at = None

    # 3. 确定 6 位访问密码
    pin = (req.access_code if req and req.access_code else "").strip()
    if pin:
        if len(pin) != 6 or not pin.isdigit():
            raise HTTPException(status_code=400, detail="访问密码必须为严格 6 位纯数字")
    else:
        pin = f"{random.randint(100000, 999999)}"

    # 4. 查找现有分享记录或新建
    res_share = await db.execute(
        select(ReportShare).where(
            ReportShare.report_id == report_id,
            ReportShare.user_id == user.id
        )
    )
    share = res_share.scalar_one_or_none()

    if share:
        # 更新密码、有效天数与激活状态
        share.access_code = pin
        share.status = "active"
        share.expire_at = expire_at
        share.company_name = company_name
        share.credit_code = credit_code
        await db.commit()
        await db.refresh(share)
    else:
        share_code = f"sh_{uuid.uuid4().hex[:8]}"
        share = ReportShare(
            share_code=share_code,
            report_id=report_id,
            user_id=user.id,
            company_name=company_name,
            credit_code=credit_code,
            access_code=pin,
            status="active",
            expire_at=expire_at,
            view_count=0
        )
        db.add(share)
        await db.commit()
        await db.refresh(share)

    is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(share.expire_at)

    return {
        "code": 0,
        "message": "加密分享链接生成成功！",
        "data": {
            "id": share.id,
            "share_code": share.share_code,
            "report_id": share.report_id,
            "company_name": share.company_name,
            "credit_code": share.credit_code,
            "access_code": share.access_code,
            "status": share.status,
            "expire_at": exp_str,
            "remaining_days": remaining_days,
            "expires_in_text": expires_in_text,
            "view_count": share.view_count,
            "created_at": share.created_at.strftime("%Y-%m-%d %H:%M:%S") if share.created_at else ""
        }
    }


@router.get("/reports/{report_id}/current")
async def get_report_share_status(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取指定报告当前的加密分享配置状态
    """
    res = await db.execute(
        select(ReportShare).where(
            ReportShare.report_id == report_id,
            ReportShare.user_id == user.id
        )
    )
    share = res.scalar_one_or_none()
    if not share:
        return {"code": 0, "data": None}

    is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(share.expire_at)

    return {
        "code": 0,
        "data": {
            "id": share.id,
            "share_code": share.share_code,
            "report_id": share.report_id,
            "company_name": share.company_name,
            "credit_code": share.credit_code,
            "access_code": share.access_code,
            "status": "expired" if is_expired else share.status,
            "expire_at": exp_str,
            "remaining_days": remaining_days,
            "is_expired": is_expired,
            "expires_in_text": expires_in_text,
            "view_count": share.view_count,
            "created_at": share.created_at.strftime("%Y-%m-%d %H:%M:%S") if share.created_at else ""
        }
    }


# =========================================================================
# 2. 分享管理中心 (获取我的全部分享清单与管理操作)
# =========================================================================
@router.get("/my")
async def get_my_shares(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前用户创建的所有分享列表（供分享管理看板展示）
    """
    query = select(ReportShare).where(ReportShare.user_id == user.id).order_by(desc(ReportShare.created_at))
    res = await db.execute(query)
    shares = res.scalars().all()

    data = []
    for s in shares:
        is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(s.expire_at)
        status_display = "expired" if is_expired else s.status
        data.append({
            "id": s.id,
            "share_code": s.share_code,
            "report_id": s.report_id,
            "company_name": s.company_name,
            "credit_code": s.credit_code,
            "access_code": s.access_code,
            "status": status_display,
            "expire_at": exp_str,
            "remaining_days": remaining_days,
            "is_expired": is_expired,
            "expires_in_text": expires_in_text,
            "view_count": s.view_count,
            "last_accessed_at": s.last_accessed_at.strftime("%Y-%m-%d %H:%M:%S") if s.last_accessed_at else "-",
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else ""
        })

    # 若没有任何分享，默认塞入一条示例分享
    if len(data) == 0:
        default_exp = shanghai_now() + timedelta(days=14)
        is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(default_exp)
        data.append({
            "id": "sh_demo_001",
            "share_code": "sh_shunjie88",
            "report_id": "rpt_shunjie_preloan_001",
            "company_name": "东莞市顺捷实业有限公司",
            "credit_code": "91441900MA4W6BGB8T",
            "access_code": "888666",
            "status": "active",
            "expire_at": exp_str,
            "remaining_days": remaining_days,
            "is_expired": is_expired,
            "expires_in_text": expires_in_text,
            "view_count": 3,
            "last_accessed_at": (shanghai_now() - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
            "created_at": (shanghai_now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        })

    return {"code": 0, "data": data}


@router.post("/{share_id}/revoke")
async def revoke_share(
    share_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    一键关闭/撤销报告分享链接
    """
    res = await db.execute(select(ReportShare).where(ReportShare.id == share_id, ReportShare.user_id == user.id))
    share = res.scalar_one_or_none()
    if not share:
        if share_id == "sh_demo_001":
            return {"code": 0, "message": "已成功关闭并撤销该分享链接"}
        raise HTTPException(status_code=404, detail="分享记录不存在")

    share.status = "revoked"
    await db.commit()
    return {"code": 0, "message": "已成功关闭并撤销该分享链接"}


@router.post("/{share_id}/activate")
async def activate_share(
    share_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    重新开启已撤销的分享链接
    """
    res = await db.execute(select(ReportShare).where(ReportShare.id == share_id, ReportShare.user_id == user.id))
    share = res.scalar_one_or_none()
    if not share:
        if share_id == "sh_demo_001":
            return {"code": 0, "message": "已重新开启分享链接"}
        raise HTTPException(status_code=404, detail="分享记录不存在")

    if share.expire_at and shanghai_now() > share.expire_at:
        # 如果已过期，重新开启时默认顺延 15 天
        share.expire_at = shanghai_now() + timedelta(days=15)

    share.status = "active"
    await db.commit()
    return {"code": 0, "message": "已重新开启分享链接"}


@router.post("/{share_id}/update-password")
async def update_share_password(
    share_id: str,
    req: UpdatePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    修改分享的 6 位数字访问密码
    """
    pin = req.access_code.strip()
    if len(pin) != 6 or not pin.isdigit():
        raise HTTPException(status_code=400, detail="访问密码必须为严格 6 位纯数字")

    res = await db.execute(select(ReportShare).where(ReportShare.id == share_id, ReportShare.user_id == user.id))
    share = res.scalar_one_or_none()
    if not share:
        if share_id == "sh_demo_001":
            return {"code": 0, "message": "访问密码已修改成功", "data": {"access_code": pin}}
        raise HTTPException(status_code=404, detail="分享记录不存在")

    share.access_code = pin
    await db.commit()
    return {"code": 0, "message": "访问密码已修改成功", "data": {"access_code": pin}}


@router.post("/{share_id}/update-expiration")
async def update_share_expiration(
    share_id: str,
    req: UpdateExpirationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    调整分享链接的有效期限 (0 为永久有效，或指定天数)
    """
    res = await db.execute(select(ReportShare).where(ReportShare.id == share_id, ReportShare.user_id == user.id))
    share = res.scalar_one_or_none()
    if not share:
        if share_id == "sh_demo_001":
            return {"code": 0, "message": "分享有效期限已更新"}
        raise HTTPException(status_code=404, detail="分享记录不存在")

    if req.expire_days is not None and req.expire_days > 0:
        share.expire_at = shanghai_now() + timedelta(days=req.expire_days)
    else:
        share.expire_at = None

    if share.status == "expired" and (share.expire_at is None or shanghai_now() < share.expire_at):
        share.status = "active"

    await db.commit()
    is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(share.expire_at)
    return {
        "code": 0,
        "message": "分享有效期限已更新成功",
        "data": {
            "expire_at": exp_str,
            "remaining_days": remaining_days,
            "expires_in_text": expires_in_text,
            "status": share.status
        }
    }


# =========================================================================
# 3. 公开免登录外部访问接口 (Public APIs)
# =========================================================================
@router.get("/info/{share_code}")
async def get_share_public_info(
    share_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    公开获取分享卡片前置信息（企业名称、失效倒计时、状态，供输入 6 位密码前展示）
    """
    # 兼容内置演示 share_code
    if share_code == "sh_shunjie88" or "shunjie" in share_code:
        exp = shanghai_now() + timedelta(days=14)
        is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(exp)
        return {
            "code": 0,
            "data": {
                "share_code": share_code,
                "company_name": "东莞市顺捷实业有限公司",
                "credit_code": "91441900MA4W6BGB8T",
                "status": "active",
                "expire_at": exp_str,
                "remaining_days": remaining_days,
                "is_expired": is_expired,
                "expires_in_text": expires_in_text,
                "created_at": (shanghai_now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
            }
        }

    res = await db.execute(select(ReportShare).where(ReportShare.share_code == share_code))
    share = res.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="分享链接不存在或已被删除")

    is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(share.expire_at)

    return {
        "code": 0,
        "data": {
            "share_code": share.share_code,
            "company_name": share.company_name,
            "credit_code": share.credit_code,
            "status": "expired" if is_expired else share.status,
            "expire_at": exp_str,
            "remaining_days": remaining_days,
            "is_expired": is_expired,
            "expires_in_text": expires_in_text,
            "created_at": share.created_at.strftime("%Y-%m-%d %H:%M:%S") if share.created_at else ""
        }
    }


@router.post("/verify")
async def verify_share_access_code(
    req: VerifyShareRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    公开验证 6 位数字访问密码，核验分享有效期，成功后返回完整报告数据
    """
    code = req.share_code.strip()
    pin = req.access_code.strip()

    # 1. 查找分享记录
    share = None
    if code == "sh_shunjie88" or "shunjie" in code:
        # 内置示例分享
        if pin != "888666" and pin != "123456":
            raise HTTPException(status_code=400, detail="访问密码错误，请输入正确的 6 位密码")
        return {
            "code": 0,
            "message": "密码校验通过！",
            "data": {
                "report": {
                    "id": "rpt_shunjie_preloan_001",
                    "company_name": "东莞市顺捷实业有限公司",
                    "credit_code": "91441900MA4W6BGB8T",
                    "legal_person": "吕顺光",
                    "risk_level": "blue",
                    "score": 88,
                    "suggested_quota_min": 300,
                    "suggested_quota_max": 500,
                    "summary_ai_comment": "企业全景尽调分析报告（享宇智评版）",
                    "total_pages": 61,
                    "pdf_url": "/reports/shunjie_preloan.pdf",
                    "content": {"is_locked": False, "is_public_only": False},
                    "raw_sources": {},
                    "created_at": "2026-08-27 15:30:00"
                },
                "share_info": {
                    "share_code": code,
                    "expire_at": (shanghai_now() + timedelta(days=14)).strftime("%Y-%m-%d %H:%M:%S"),
                    "remaining_days": 14,
                    "expires_in_text": "有效期至 14 天后 (剩余 14 天)"
                }
            }
        }

    res = await db.execute(select(ReportShare).where(ReportShare.share_code == code))
    share = res.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="分享链接不存在或已被删除")

    # 2. 检查状态与分享有效期
    if share.status == "revoked":
        raise HTTPException(status_code=403, detail="该分享链接已被发起人撤销关闭，无法查看")

    now = shanghai_now()
    if share.expire_at is not None and now > share.expire_at:
        share.status = "expired"
        await db.commit()
        raise HTTPException(status_code=403, detail="该分享链接已过有效期限，无法继续访问")

    # 3. 校验 6 位密码
    if share.access_code != pin:
        raise HTTPException(status_code=400, detail="访问密码错误，请输入正确的 6 位密码")

    # 4. 密码正确，增加访问计数
    share.view_count += 1
    share.last_accessed_at = now
    await db.commit()

    # 5. 加载报告详情
    res_rep = await db.execute(select(XYZPReport).where(XYZPReport.id == share.report_id))
    r = res_rep.scalar_one_or_none()

    if not r:
        # 若为内置报告 fallback
        pdf_path = "/reports/shunjie_preloan.pdf"
        total_p = 61
        if "hangzhou" in share.report_id.lower() or "16320551" in share.report_id.lower():
            pdf_path = "/reports/hangzhou_preloan.pdf"
            total_p = 39

        report_data = {
            "id": share.report_id,
            "company_name": share.company_name,
            "credit_code": share.credit_code,
            "legal_person": "吕顺光",
            "risk_level": "blue",
            "score": 88,
            "suggested_quota_min": 300,
            "suggested_quota_max": 500,
            "summary_ai_comment": "企业全景尽调分析报告（享宇智评版）",
            "total_pages": total_p,
            "pdf_url": pdf_path,
            "content": {"is_locked": False, "is_public_only": False},
            "raw_sources": {},
            "created_at": share.created_at.strftime("%Y-%m-%d %H:%M:%S") if share.created_at else ""
        }
    else:
        pdf_path = "/reports/shunjie_preloan.pdf"
        total_p = 61
        if "hangzhou" in r.id.lower() or "16320551" in r.id.lower():
            pdf_path = "/reports/hangzhou_preloan.pdf"
            total_p = 39
        elif r.pdf_file_path:
            pdf_path = f"/api/v1/reports/{r.id}/pdf"

        report_data = {
            "id": r.id,
            "company_name": r.company_name,
            "credit_code": r.credit_code,
            "legal_person": r.legal_person,
            "risk_level": r.risk_level,
            "score": r.score,
            "suggested_quota_min": r.suggested_quota_min,
            "suggested_quota_max": r.suggested_quota_max,
            "summary_ai_comment": r.summary_ai_comment,
            "total_pages": total_p,
            "pdf_url": pdf_path,
            "content": r.content_json,
            "raw_sources": r.raw_sources_json,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else ""
        }

    is_expired, remaining_days, expires_in_text, exp_str = compute_share_expiry_info(share.expire_at)

    return {
        "code": 0,
        "message": "密码校验通过！",
        "data": {
            "report": report_data,
            "share_info": {
                "share_code": share.share_code,
                "expire_at": exp_str,
                "remaining_days": remaining_days,
                "expires_in_text": expires_in_text
            }
        }
    }
