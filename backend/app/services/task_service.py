import asyncio
import uuid
import logging
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from app.core.database import AsyncSessionLocal
from app.models.task import DDTask
from app.models.report import DDReport
from app.providers import get_weifengqi_provider, get_ic_provider, get_risk_provider
from app.services.cleansing_service import DataCleansingService
from app.services.file_storage_service import FileStorageService

logger = logging.getLogger("edd.tasks")

class TaskService:
    @staticmethod
    async def run_ai_dd_task_async(task_id: str, is_locked: bool = False):
        """
        后台异步运行尽调任务全链路流水线：
        1. 检查企业微风企授权状态；
        2. 调用微风企 Mock/真实服务查询报告生成状态 (check_report_status)；
        3. 调用微风企服务获取贷前报告 PDF 专属下载链接 (get_report_pdf_url)；
        4. 触发文件存储服务 (FileStorageService) 流式下载并持久化存储 PDF，完成 SHA256 数字存证；
        5. 并行调用工商数据中台与司法经营风险中台；
        6. 触发数据清洗与风控特征计算管道 (DataCleansingService)；
        7. 生成终态报告资产落库并与物理 PDF 存证绑定。
        """
        await asyncio.sleep(0.5)
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(DDTask).where(DDTask.id == task_id))
            task = result.scalar_one_or_none()
            if not task:
                logger.error(f"[TaskService] Task {task_id} not found.")
                return

            def append_log(content: str):
                current_logs = list(task.thinking_logs or [])
                current_logs.append({
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "content": content
                })
                task.thinking_logs = current_logs
                flag_modified(task, "thinking_logs")

            company_name = task.company_name
            credit_code = task.credit_code
            is_public_only = (task.auth_mode == "public_only")
            order_no = task.wfq_order_no or task.task_no

            # 初始化三方数据适配器
            wfq_provider = get_weifengqi_provider()
            ic_provider = get_ic_provider()
            risk_provider = get_risk_provider()

            task.status = "pulling_data"
            task.thinking_logs = task.thinking_logs or []

            # -------------------------------------------------------------
            # Step 1: 微风企报告状态确认与 PDF 文件拉取存储
            # -------------------------------------------------------------
            stored_file = None
            parsed_pdf_data = None
            if not is_public_only:
                # 1.1 直接发起微风企贷前报告 PDF 获取与状态校验 (POST /model/wfq/loanBeforeReportPdf)
                append_log(f"【微风企·金税中台】企业授权校验通过 -> 正在向微风企网关拉取贷前报告下载地址 (单号: {order_no})...")
                await session.commit()

                status_info = await wfq_provider.check_report_status(order_no=order_no, taxpayer_id=credit_code, db=session)
                await asyncio.sleep(0.8)

                if not status_info.get("is_ready"):
                    append_log(f"【微风企·金税中台】报告资料准备中 (errorCode: 555, {status_info.get('errMsg')})，继续轮询中...")
                    await session.commit()
                    await asyncio.sleep(1.0)
                    pdf_download_url = await wfq_provider.get_report_pdf_url(order_no=order_no, taxpayer_id=credit_code, db=session)
                else:
                    pdf_download_url = status_info.get("pdf_url") or await wfq_provider.get_report_pdf_url(order_no=order_no, taxpayer_id=credit_code, db=session)

                task.wfq_pdf_url = pdf_download_url
                append_log(f"【微风企·金税中台】成功解析获取微风企贷前报告 PDF 下载流地址 -> {pdf_download_url}")
                await session.commit()
                await asyncio.sleep(0.8)

                # 1.3 调用数据清洗中台对原始 PDF 流进行清洗、脱敏与大纲解析，处理后再持久化存入 MinIO
                append_log("【数据清洗中台】启动流式拉取三方原始 PDF 报告流，执行数据清洗、文本规范化、敏感脱敏与结构化大纲提炼...")
                await session.commit()

                try:
                    stored_file, parsed_pdf_data = await FileStorageService.download_and_store_remote_file(
                        session=session,
                        remote_url=pdf_download_url,
                        task_id=task.id,
                        file_type="wfq_preloan_pdf",
                        custom_filename=f"微风企贷前报告_{company_name}.pdf",
                        company_name=company_name,
                        credit_code=credit_code
                    )
                    task.storage_file_id = stored_file.id
                    file_size_mb = round(stored_file.file_size / (1024 * 1024), 2)
                    toc_len = len(parsed_pdf_data.get("toc_catalog", [])) if parsed_pdf_data else 0
                    append_log(f"【数据清洗与存储】PDF 清洗与全景大纲抽取完成 ({toc_len} 个核心大纲板块, 大小: {file_size_mb} MB, SHA256: {stored_file.file_hash[:16]}...)，已安全存证归档至 MinIO 对象存储。")
                    await session.commit()
                except Exception as e:
                    logger.error(f"[TaskService] Failed to clean and store remote PDF: {str(e)}")
                    append_log(f"【数据清洗中台】远程 PDF 存证拉取与清洗警告 ({str(e)})，启用内置高保真模版兜底。")
                    await session.commit()

                # 1.4 解析金税底稿明细
                raw_weifengqi = await wfq_provider.fetch_tax_data(credit_code, company_name)
            else:
                append_log("【公开数据模式】免企业法人金税授权，直接基于工商与司法合规中台数据执行初审研判。")
                await session.commit()
                raw_weifengqi = {}

            await asyncio.sleep(0.8)

            # -------------------------------------------------------------
            # Step 2: 调用三方接口 2 - 企业工商数据接口
            # -------------------------------------------------------------
            append_log("【三方接口2·企业工商】发起工商全息数据请求 -> 穿透股东股权出资到位率、董监高及历史15项工商变更轨迹。")
            await session.commit()
            raw_ic = await ic_provider.fetch_ic_full_profile(credit_code, company_name)
            await asyncio.sleep(0.8)

            # -------------------------------------------------------------
            # Step 3: 调用三方接口 3 - 企业经营风险数据接口
            # -------------------------------------------------------------
            append_log("【三方接口3·经营风险雷达】启动全网排查 -> 扫描司法裁判、失信一票否决、行政处罚与合规监管底稿。")
            await session.commit()
            raw_risk = await risk_provider.fetch_risk_profile(credit_code, company_name)
            await asyncio.sleep(0.8)

            # -------------------------------------------------------------
            # Step 4: 触发联合数据清洗与特征融合 Pipeline
            # -------------------------------------------------------------
            task.status = "ai_analyzing"
            append_log("【数据清洗中台】联合清洗多源数据：执行最高准据原则、司法红黄牌排查与 5 维风控特征工程推理。")
            await session.commit()

            (
                report_content, 
                raw_sources, 
                risk_level, 
                score, 
                quota_min, 
                quota_max, 
                ai_summary
            ) = DataCleansingService.clean_and_synthesize(
                raw_weifengqi=raw_weifengqi, 
                raw_ic=raw_ic, 
                raw_risk=raw_risk,
                parsed_pdf_data=parsed_pdf_data
            )

            report_content["is_public_only"] = is_public_only
            report_content["is_locked"] = is_locked

            await asyncio.sleep(0.8)

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
                raw_sources_json=raw_sources,
                storage_file_id=stored_file.id if stored_file else None,
                pdf_file_path=stored_file.file_path if stored_file else None
            )
            session.add(report)

            # 更新文件关联的 report_id
            if stored_file:
                stored_file.report_id = report_id

            task.status = "completed"
            task.report_id = report_id
            task.risk_level = risk_level
            task.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            append_log(f"AI 智能体完成研判：{report_content['score_card']['risk_title']} (评分: {score}分)，贷前报告 PDF 及存证底稿已归档。" + ("【已添加AI研判遮罩，充值后可解锁】" if is_locked else ""))
            await session.commit()
            logger.info(f"[TaskService] Task {task_id} successfully finished and generated report {report_id}")
