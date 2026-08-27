import asyncio
import uuid
import logging
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.task import DDTask
from app.models.report import DDReport
from app.providers import get_weifengqi_provider, get_ic_provider, get_risk_provider
from app.services.cleansing_service import DataCleansingService

logger = logging.getLogger("edd.tasks")

class TaskService:
    @staticmethod
    async def run_ai_dd_task_async(task_id: str, is_locked: bool = False):
        """
        后台异步运行尽调任务流水线：
        1. 并行调用三方数据接口 (享宇金税数据中台、企业工商、企业经营风险)；
        2. 若为仅公开数据模式 (public_only)，跳过享宇金税数据中台税务拉取；
        3. 触发数据清洗与风控特征计算管道 (DataCleansingService)；
        4. 若为 0 额度试用模式 (is_locked=True)，生成带遮罩锁定的报告。
        """
        await asyncio.sleep(0.5)
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(DDTask).where(DDTask.id == task_id))
            task = result.scalar_one_or_none()
            if not task:
                return

            company_name = task.company_name
            credit_code = task.credit_code
            is_public_only = (task.auth_mode == "public_only")

            # 初始化三方数据适配器
            wfq_provider = get_weifengqi_provider()
            ic_provider = get_ic_provider()
            risk_provider = get_risk_provider()

            # -------------------------------------------------------------
            # Step 1: 调用三方接口 2 - 企业工商数据接口
            # -------------------------------------------------------------
            task.status = "pulling_data"
            task.thinking_logs = task.thinking_logs or []
            task.thinking_logs.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "content": f"【三方接口2·企业工商】已发起请求 -> 获取照面信息、股东股权出资穿透、主要董监高与历史变更轨迹。"
            })
            await session.commit()

            raw_ic = await ic_provider.fetch_ic_full_profile(credit_code, company_name)
            await asyncio.sleep(1.0)

            # -------------------------------------------------------------
            # Step 2: 调用三方接口 1 - 享宇金税数据中台数据接口 (若公开模式则跳过)
            # -------------------------------------------------------------
            if not is_public_only:
                task.thinking_logs.append({
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "content": f"【金税中台·全税种发票】企业授权校验通过 -> 享宇引擎深度聚合近36个月增值税申报矩阵、销项发票流水与生产要素拟合度。"
                })
                await session.commit()
                raw_weifengqi = await wfq_provider.fetch_tax_data(credit_code, company_name)
            else:
                task.thinking_logs.append({
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "content": f"【公开数据模式】免企业法人金税授权，直接基于工商与司法合规中台数据执行初审研判。"
                })
                await session.commit()
                raw_weifengqi = {}

            await asyncio.sleep(1.0)

            # -------------------------------------------------------------
            # Step 3: 调用三方接口 3 - 企业经营风险数据接口
            # -------------------------------------------------------------
            task.thinking_logs.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "content": f"【三方接口3·经营风险雷达】启动全网排查 -> 扫描司法裁判、失信一票否决、行政处罚与合规监管底稿。"
            })
            await session.commit()

            raw_risk = await risk_provider.fetch_risk_profile(credit_code, company_name)
            await asyncio.sleep(1.0)

            # -------------------------------------------------------------
            # Step 4: 触发联合数据清洗与特征融合 Pipeline
            # -------------------------------------------------------------
            task.status = "ai_analyzing"
            task.thinking_logs.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "content": f"【数据清洗中台】联合清洗多源数据：执行最高准据原则、司法红黄牌排查与 5 维风控特征工程推理。"
            })
            await session.commit()

            (
                report_content, 
                raw_sources, 
                risk_level, 
                score, 
                quota_min, 
                quota_max, 
                ai_summary
            ) = DataCleansingService.clean_and_synthesize(raw_weifengqi, raw_ic, raw_risk)

            report_content["is_public_only"] = is_public_only
            report_content["is_locked"] = is_locked

            await asyncio.sleep(1.0)

            # -------------------------------------------------------------
            # Step 5: 生成终态报告资产落库
            # -------------------------------------------------------------
            report_id = f"rpt-{uuid.uuid4().hex[:12]}"
            report_no = f"RPT{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"

            report = DDReport(
                id=report_id,
                report_no=report_no,
                task_id=task.id,
                user_id=task.user_id,
                company_name=company_name,
                credit_code=task.credit_code,
                legal_person=task.legal_person or raw_ic.get("basic_info", {}).get("legal_person", ""),
                risk_level=risk_level,
                score=score,
                suggested_quota_min=quota_min,
                suggested_quota_max=quota_max,
                summary_ai_comment=ai_summary,
                content_json=report_content,
                raw_sources_json=raw_sources
            )
            session.add(report)

            task.status = "completed"
            task.report_id = report_id
            task.risk_level = risk_level
            task.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            task.thinking_logs.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "content": f"AI 智能体完成研判：{report_content['score_card']['risk_title']} (评分: {score}分)，存证底稿已归档。" + ("【已添加AI研判遮罩，充值后可解锁】" if is_locked else "")
            })
            await session.commit()
            logger.info(f"[TaskService] Task {task_id} successfully finished and generated report {report_id}")
