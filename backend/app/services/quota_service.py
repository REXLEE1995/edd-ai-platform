import uuid
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.user import User
from app.models.quota import QuotaTransaction, QuotaAdjustRecord

class QuotaService:
    @staticmethod
    async def deduct_quota_for_task(
        session: AsyncSession,
        user_id: str,
        task_id: str,
        company_name: str,
        points: int = 1
    ) -> Tuple[bool, int]:
        """
        发起尽调扣减额度（事务安全）
        """
        result = await session.execute(select(User).where(User.id == user_id).with_for_update())
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        if user.balance_quota < points:
            raise HTTPException(status_code=400, detail=f"当前额度不足（剩余 {user.balance_quota} 次），请先充值")
        
        before_balance = user.balance_quota
        user.balance_quota -= points
        user.total_consumed_quota += points
        after_balance = user.balance_quota
        
        tx_no = f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
        tx = QuotaTransaction(
            tx_no=tx_no,
            user_id=user.id,
            user_phone=user.phone,
            user_company=user.company_name,
            change_type="consume",
            amount=-points,
            balance_before=before_balance,
            balance_after=after_balance,
            ref_type="task",
            ref_id=task_id,
            operator_type="user",
            operator_name="发起尽调",
            remark=f"发起企业【{company_name}】AI尽调研判扣减 {points} 次"
        )
        session.add(tx)
        await session.commit()
        return True, after_balance

    @staticmethod
    async def refund_quota_for_task(
        session: AsyncSession,
        user_id: str,
        task_id: str,
        company_name: str,
        points: int = 1,
        reason: str = "任务异常终止"
    ) -> int:
        """
        尽调失败或异常自动返还额度
        """
        result = await session.execute(select(User).where(User.id == user_id).with_for_update())
        user = result.scalar_one_or_none()
        if not user:
            return 0
        
        before_balance = user.balance_quota
        user.balance_quota += points
        if user.total_consumed_quota >= points:
            user.total_consumed_quota -= points
        after_balance = user.balance_quota
        
        tx_no = f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
        tx = QuotaTransaction(
            tx_no=tx_no,
            user_id=user.id,
            user_phone=user.phone,
            user_company=user.company_name,
            change_type="refund",
            amount=points,
            balance_before=before_balance,
            balance_after=after_balance,
            ref_type="task",
            ref_id=task_id,
            operator_type="system",
            operator_name="SYSTEM",
            remark=f"企业【{company_name}】尽调失败自动返还 {points} 次 ({reason})"
        )
        session.add(tx)
        await session.commit()
        return after_balance

    @staticmethod
    async def manual_adjust_quota(
        session: AsyncSession,
        admin_id: str,
        admin_name: str,
        user_id: str,
        adjust_type: str, # add, sub, set
        amount: int,
        reason_category: str,
        proof_no: Optional[str],
        proof_image_url: Optional[str],
        remark: str
    ) -> Tuple[int, int]:
        """
        管理后台人工精准调额（带凭据与审计流水）
        """
        result = await session.execute(select(User).where(User.id == user_id).with_for_update())
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="目标用户不存在")
        
        before_balance = user.balance_quota
        change_amount = 0
        
        if adjust_type == "add":
            change_amount = amount
            user.balance_quota += amount
            user.total_recharge_quota += amount
            change_type = "manual_add"
        elif adjust_type == "sub":
            if user.balance_quota < amount:
                raise HTTPException(status_code=400, detail=f"扣减数值超出用户当前可用额度（当前仅有 {user.balance_quota} 次）")
            change_amount = -amount
            user.balance_quota -= amount
            change_type = "manual_sub"
        elif adjust_type == "set":
            change_amount = amount - before_balance
            user.balance_quota = amount
            change_type = "manual_add" if change_amount >= 0 else "manual_sub"
        else:
            raise HTTPException(status_code=400, detail="不支持的调额类型")
        
        after_balance = user.balance_quota
        
        # 记录工单
        adjust_no = f"ADJ{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
        adjust_record = QuotaAdjustRecord(
            adjust_no=adjust_no,
            user_id=user.id,
            admin_id=admin_id,
            admin_name=admin_name,
            adjust_type=adjust_type,
            adjust_amount=change_amount,
            reason_category=reason_category,
            proof_no=proof_no,
            proof_image_url=proof_image_url,
            remark=remark
        )
        session.add(adjust_record)
        
        # 记录全局流水
        tx_no = f"QTX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
        tx = QuotaTransaction(
            tx_no=tx_no,
            user_id=user.id,
            user_phone=user.phone,
            user_company=user.company_name,
            change_type=change_type,
            amount=change_amount,
            balance_before=before_balance,
            balance_after=after_balance,
            ref_type="adjust",
            ref_id=adjust_no,
            operator_type="admin",
            operator_id=admin_id,
            operator_name=f"Admin-{admin_name}",
            remark=f"[{reason_category}] {remark}"
        )
        session.add(tx)
        await session.commit()
        return before_balance, after_balance
