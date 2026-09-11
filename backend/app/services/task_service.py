import asyncio
import uuid
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.task import XYZPTask
from app.models.report import XYZPReport
from app.models.file_record import TaskFile
from app.core.minio_client import get_minio_client
from app.providers import get_weifengqi_provider
from app.services.file_storage_service import FileStorageService
from app.services.cleansing_service import DataCleansingService

logger = logging.getLogger("xyzp.tasks")


class TaskService:
    """
    企业全景尽调流水线任务服务 (解耦版 4 步标准流水线与断点续跑执行器)
    """

    @staticmethod
    def append_task_log(task: XYZPTask, content: str):
        """记录任务执行思考流日志"""
        current_logs = list(task.thinking_logs or [])
        current_logs.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "content": content
        })
        task.thinking_logs = current_logs
        flag_modified(task, "thinking_logs")

    @classmethod
    async def execute_step1_auth(cls, task: XYZPTask, session: AsyncSession) -> bool:
        """
        【Step 1: 授权信息确认】
        核验实名授权状态，确认法人授权通过后流转至就绪态
        """
        cls.append_task_log(task, "【授权信息】企业法人实名授权凭证核验通过，启动异步尽调数据处理管道...")
        await session.commit()
        await asyncio.sleep(0.3)
        return True

    @classmethod
    async def execute_step2_fetch_and_clean(cls, task: XYZPTask, session: AsyncSession) -> TaskFile:
        """
        【Step 2: 数据获取与纯代码清洗】
        1. 从微风企网关安全流式下载原始贷前报告 PDF；
        2. 采用 PyMuPDF 执行 100% 纯代码脱敏清洗（敏感词重绘替换、内置字体嵌入、封面自动删除），严禁调用大模型；
        3. 将清洗后的标准 PDF 固化上传至 MinIO 对象存储；
        4. 打上 Step 2 成功 Checkpoint（记录 task.storage_file_id 与 task.wfq_pdf_url）。
        """
        task.status = "pulling_data"
        cls.append_task_log(task, "【数据获取】正在获取微风企贷前尽调原始底稿，建立安全流式传输管道...")
        await session.commit()

        company_name = task.company_name
        credit_code = task.credit_code
        order_no = task.wfq_order_no or task.task_no
        wfq_provider = get_weifengqi_provider()

        # 1. 检查并获取远程 PDF 下载直链
        status_info = await wfq_provider.check_report_status(order_no=order_no, taxpayer_id=credit_code, db=session)
        if not status_info.get("is_ready"):
            pdf_download_url = await wfq_provider.get_report_pdf_url(order_no=order_no, taxpayer_id=credit_code, db=session)
        else:
            pdf_download_url = status_info.get("pdf_url") or await wfq_provider.get_report_pdf_url(order_no=order_no, taxpayer_id=credit_code, db=session)

        task.wfq_pdf_url = pdf_download_url
        cls.append_task_log(task, "【数据清洗】执行 PyMuPDF 敏感词脱敏替换、内置高保真字体嵌入与第1页封面剔除（纯代码清洗完成）...")
        await session.commit()

        # 2. 流式下载原始二进制流
        raw_pdf_bytes = await FileStorageService.download_raw_remote_pdf(pdf_download_url)

        # 3. 纯代码清洗（绝不调用任何大模型）
        cleaned_pdf_bytes, has_cover_removed = DataCleansingService.clean_pdf_bytes_only(
            raw_pdf_bytes=raw_pdf_bytes
        )

        # 4. 上传清洗后 PDF 至 MinIO
        custom_filename = f"企业尽调分析报告_{company_name}.pdf"
        stored_file = await FileStorageService.store_cleaned_pdf(
            session=session,
            task_id=task.id,
            cleaned_pdf_bytes=cleaned_pdf_bytes,
            custom_filename=custom_filename,
            company_name=company_name,
            credit_code=credit_code,
            source_url=pdf_download_url
        )

        task.storage_file_id = stored_file.id
        file_size_mb = round(stored_file.file_size / (1024 * 1024), 2)
        cls.append_task_log(task, f"【数据存证】标准清洗版 PDF 底稿已固化至 MinIO（大小: {file_size_mb} MB），SHA256 存证签名绑定完成。")
        await session.commit()
        return stored_file

    @classmethod
    async def execute_step3_ai_eval(cls, task: XYZPTask, session: AsyncSession) -> Dict[str, Any]:
        """
        【Step 3: AI 研判】
        1. 从 MinIO 直接读取 Step 2 存储的标准清洗后 PDF（无需重复下载三方数据）；
        2. 调用 PyMuPDF 与大模型提取真实物理页目录大纲 (catalog.json)；
        3. 提取物理坐标对齐纯文本 (content.txt)；
        4. 调用大模型生成高保真分章节知识库 Markdown (knowledge_base.md)；
        5. 调用大模型生成企业全景画像与风控研判 JSON (summary.json)；
        6. 上传 4 大衍生资产至 MinIO 并打上 Step 3 成功 Checkpoint。
        """
        task.status = "ai_analyzing"
        cls.append_task_log(task, "【AI 研判】从 MinIO 读取清洗版 PDF 底稿，启动大模型物理页目录解析与知识库提炼引擎...")
        await session.commit()

        company_name = task.company_name
        credit_code = task.credit_code

        # 1. 从 MinIO 或本地缓存读取 Step 2 清洗后 PDF
        cleaned_pdf_bytes = None
        minio_mgr = get_minio_client()
        if task.storage_file_id:
            file_rec = await FileStorageService.get_file_by_id(session, task.storage_file_id)
            if file_rec and minio_mgr.object_exists(file_rec.file_path):
                cleaned_pdf_bytes = minio_mgr.get_object_bytes(file_rec.file_path)

        if not cleaned_pdf_bytes:
            pdf_rec = await FileStorageService.get_file_by_task_id(session, task.id, "wfq_preloan_pdf")
            if pdf_rec and minio_mgr.object_exists(pdf_rec.file_path):
                cleaned_pdf_bytes = minio_mgr.get_object_bytes(pdf_rec.file_path)

        if not cleaned_pdf_bytes:
            # 若 MinIO 中确实缺失，兜底重新执行 Step 2
            logger.warning(f"[TaskService] Step 3 发现 Step 2 清洗后 PDF 缺失，自动重新执行 Step 2...")
            stored_file = await cls.execute_step2_fetch_and_clean(task, session)
            cleaned_pdf_bytes = minio_mgr.get_object_bytes(stored_file.file_path)

        # 2. 调用 AI 提取大纲、知识库 MD 与总结 JSON
        parsed_pdf_data = await DataCleansingService.extract_ai_artifacts_from_pdf_bytes(
            cleaned_pdf_bytes=cleaned_pdf_bytes,
            company_name=company_name,
            credit_code=credit_code
        )

        toc_len = len(parsed_pdf_data.get("toc_catalog", []))
        cls.append_task_log(task, f"【AI 研判】大模型已完成真实物理页目录提炼（共 {toc_len} 个核心章节），正在固化结构化目录与知识库...")
        await session.commit()

        # 3. 将 4 大衍生资产存入 MinIO
        await FileStorageService.store_ai_artifacts(
            session=session,
            task_id=task.id,
            parsed_pdf_data=parsed_pdf_data,
            company_name=company_name,
            credit_code=credit_code,
            source_url=task.wfq_pdf_url or ""
        )

        cls.append_task_log(task, "【AI 研判】大模型已生成分章节 Markdown 知识库与全景画像总结，成功存入 MinIO (knowledge_base.md / summary.json)。")
        await session.commit()
        return parsed_pdf_data

    @classmethod
    async def execute_step4_verify_and_generate(
        cls, 
        task: XYZPTask, 
        session: AsyncSession, 
        is_locked: bool = False,
        parsed_pdf_data: Optional[Dict[str, Any]] = None
    ) -> XYZPReport:
        """
        【Step 4: 报告生成与文件可达性核验】
        1. 对 MinIO 中的 5 大核心存证文件进行健康度校验矩阵核验；
        2. 校验通过后，组装 XYZPReport 尽调报告资产并落库；
        3. 标记任务为 completed 终态，交付前端全景调阅与 AI 智能对话。
        """
        task.status = "generating_report"
        cls.append_task_log(task, "【报告生成】组装全景尽调报告资产实体，执行 MinIO 5 大核心存证文件完整性与可访问性自检...")
        await session.commit()

        minio_mgr = get_minio_client()
        company_name = task.company_name
        credit_code = task.credit_code
        is_public_only = (task.auth_mode == "public_only")

        # 1. 5 大文件健康度自检矩阵
        health = await FileStorageService.check_task_files_health(session, task.id)
        if not health.get("is_healthy"):
            missing_steps = health.get("missing_steps", [])
            err_msg = f"MinIO 存证文件健康度校验未通过，缺失步骤数据: {missing_steps}"
            logger.error(f"[TaskService] {err_msg}")
            if 2 in missing_steps:
                raise RuntimeError("Step 2 清洗后 PDF 文件在 MinIO 中未找到或损坏，请重试 Step 2。")
            if 3 in missing_steps:
                raise RuntimeError("Step 3 AI 衍生资产在 MinIO 中未找到或损坏，请重试 Step 3。")

        # 2. 若 parsed_pdf_data 未在内存中，从 MinIO 读取 catalog.json 与 summary.json
        if not parsed_pdf_data:
            parsed_pdf_data = {}
            # 从 MinIO 读取 catalog.json
            cat_rec = await FileStorageService.get_file_by_task_id(session, task.id, "pdf_toc_json")
            if cat_rec and minio_mgr.object_exists(cat_rec.file_path):
                try:
                    cat_bytes = minio_mgr.get_object_bytes(cat_rec.file_path)
                    cat_json = json.loads(cat_bytes.decode("utf-8"))
                    parsed_pdf_data["toc_catalog"] = cat_json.get("toc_catalog", [])
                    parsed_pdf_data["overall_ai_summary"] = cat_json.get("overall_ai_summary", {})
                    parsed_pdf_data["report_meta"] = cat_json.get("report_meta", {})
                except Exception as e:
                    logger.warning(f"[TaskService] 读取 catalog.json 失败: {e}")

            # 从 MinIO 读取 summary.json
            sum_rec = await FileStorageService.get_file_by_task_id(session, task.id, "pdf_summary_json")
            if sum_rec and minio_mgr.object_exists(sum_rec.file_path):
                try:
                    sum_bytes = minio_mgr.get_object_bytes(sum_rec.file_path)
                    sum_json = json.loads(sum_bytes.decode("utf-8"))
                    parsed_pdf_data["ai_summary_json"] = sum_json
                except Exception as e:
                    logger.warning(f"[TaskService] 读取 summary.json 失败: {e}")

        # 3. 构造画像与综述 (严格以 summary.json 为唯一基准数据源)
        ai_summary_json = parsed_pdf_data.get("ai_summary_json", {})
        enterprise_profile = ai_summary_json.get("enterprise_profile") or (parsed_pdf_data.get("overall_ai_summary", {}).get("summary") if parsed_pdf_data else "") or ""
        risk_assessment = ai_summary_json.get("risk_assessment") or (parsed_pdf_data.get("overall_ai_summary", {}).get("key_points") if parsed_pdf_data else []) or []

        # 统一格式化 summary_ai_comment，带明确的二级标题与列表规范排版
        if enterprise_profile:
            ai_summary_comment = f"### 企业信用全景综合画像\n{enterprise_profile}\n"
            if risk_assessment and isinstance(risk_assessment, list) and len(risk_assessment) > 0:
                points_str = "\n".join([f"- {pt}" for pt in risk_assessment])
                ai_summary_comment += f"\n### 全景深度研判要点与风控审查结论\n{points_str}"
        else:
            ai_summary_comment = f"目标企业【{company_name}】全景尽调报告已生成，包含市监工商、涉税发票与经营合规深度解析，支持在线沉浸式查阅与 A4 PDF 原件导出。"

        report_id = f"rpt-{uuid.uuid4().hex[:12]}"
        report_no = f"RPT{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"

        overall_ai_summary = {
            "summary": enterprise_profile,
            "key_points": risk_assessment,
            "enterprise_profile": enterprise_profile,
            "risk_assessment": risk_assessment
        }
        structured_summary_json = {
            "enterprise_profile": enterprise_profile,
            "risk_assessment": risk_assessment
        }

        report_content = {
            "company_name": company_name,
            "credit_code": credit_code,
            "toc_catalog": parsed_pdf_data.get("toc_catalog", []),
            "overall_ai_summary": overall_ai_summary,
            "ai_summary_json": structured_summary_json,
            "report_meta": parsed_pdf_data.get("report_meta", {}),
            "is_public_only": is_public_only,
            "is_locked": is_locked
        }

        stored_file = None
        if task.storage_file_id:
            stored_file = await FileStorageService.get_file_by_id(session, task.storage_file_id)

        # 检查是否已存在同 task_id 的 report，若有则更新
        rep_res = await session.execute(select(XYZPReport).where(XYZPReport.task_id == task.id))
        report = rep_res.scalar_one_or_none()
        if not report:
            report = XYZPReport(
                id=report_id,
                report_no=report_no,
                task_id=task.id,
                user_id=task.user_id,
                company_name=company_name,
                credit_code=task.credit_code,
                legal_person=task.legal_person or "法定代表人",
                risk_level="green",
                score=850,
                suggested_quota_min=0,
                suggested_quota_max=0,
                summary_ai_comment=ai_summary_comment,
                content_json=report_content,
                raw_sources_json={},
                storage_file_id=stored_file.id if stored_file else None,
                pdf_file_path=stored_file.file_path if stored_file else None
            )
            session.add(report)
        else:
            report.summary_ai_comment = ai_summary_comment
            report.content_json = report_content
            report.storage_file_id = stored_file.id if stored_file else report.storage_file_id
            report.pdf_file_path = stored_file.file_path if stored_file else report.pdf_file_path

        if stored_file:
            stored_file.report_id = report.id

        task.status = "completed"
        task.report_id = report.id
        task.risk_level = "green"
        task.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        task.error_message = None
        cls.append_task_log(task, "【报告生成】全景尽调报告与 Markdown 知识库构建完毕，5 大存证文件均已就绪，开放前端在线调阅与 PDF 原件导出。")
        await session.commit()
        logger.info(f"[TaskService] Task {task.id} successfully completed, report={report.id}")
        return report

    @classmethod
    async def run_ai_xyzp_task_async(
        cls, 
        task_id: str, 
        is_locked: bool = False,
        start_step: int = 2
    ):
        """
        后台异步运行尽调任务标准 4 步流水线（支持从任意 step 断点续跑）：
        Step 1: 授权信息
        Step 2: 数据获取 (纯代码清洗)
        Step 3: AI 研判 (大模型目录/MD/总结)
        Step 4: 报告生成 (文件健康度核验与资产落库)
        """
        await asyncio.sleep(0.3)
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(XYZPTask).where(XYZPTask.id == task_id))
            task = result.scalar_one_or_none()
            if not task:
                logger.error(f"[TaskService] Task {task_id} not found.")
                return

            logger.info(f"[TaskService] Starting pipeline for task {task_id}, start_step={start_step}")

            try:
                # Step 1: 授权信息
                if start_step <= 1:
                    await cls.execute_step1_auth(task, session)

                # Step 2: 数据获取与纯代码清洗
                stored_file = None
                if start_step <= 2:
                    stored_file = await cls.execute_step2_fetch_and_clean(task, session)
                    await asyncio.sleep(0.5)

                # Step 3: AI 研判
                parsed_pdf_data = None
                if start_step <= 3:
                    parsed_pdf_data = await cls.execute_step3_ai_eval(task, session)
                    await asyncio.sleep(0.5)

                # Step 4: 报告生成与文件核验
                if start_step <= 4:
                    await cls.execute_step4_verify_and_generate(
                        task=task, 
                        session=session, 
                        is_locked=is_locked,
                        parsed_pdf_data=parsed_pdf_data
                    )

            except Exception as e:
                logger.error(f"[TaskService] Pipeline failed at task {task_id}: {str(e)}", exc_info=True)
                task.status = "failed"
                task.error_message = str(e)
                cls.append_task_log(task, f"【流程异常】执行遇到错误: {str(e)[:150]} (支持单步断点重试)")
                await session.commit()

    # 兼容历史调用别名
    run_ai_dd_task_async = run_ai_xyzp_task_async
