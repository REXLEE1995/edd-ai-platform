import os
import uuid
import json
import hashlib
import logging
from datetime import datetime
from typing import Optional, Any, Dict, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.file_record import TaskFile
from app.core.minio_client import get_minio_client

logger = logging.getLogger("xyzp.storage")

class FileStorageService:
    """
    尽调平台统一 MinIO 对象存储与数字存证服务 (MinIO File Storage & Evidence Service)
    所有三方接口拉取的 PDF 报告、底稿均由 MinIO 对象存储统一持久化托管，
    提供 SHA-256 防篡改存证与高速流式分块直出能力，本地磁盘不留存物理文件。
    """

    @classmethod
    async def download_raw_remote_pdf(cls, remote_url: str) -> bytes:
        """
        流式下载远程 PDF 原始二进制数据流
        """
        if not remote_url:
            raise RuntimeError("远程 PDF 下载地址为空，三方云端底稿尚未生成就绪")

        file_bytes_list = []
        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                async with client.stream("GET", remote_url) as response:
                    if response.status_code != 200:
                        raise RuntimeError(f"下载微风企远程底稿失败 (HTTP 状态码 {response.status_code}): {remote_url}")
                    
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        if chunk:
                            file_bytes_list.append(chunk)
        except Exception as e:
            logger.error(f"[FileStorageService] 远程底稿流式下载异常 ({remote_url}): {e}")
            raise RuntimeError(f"微风企原始贷前报告 PDF 下载异常: {str(e)}")

        raw_bytes = b"".join(file_bytes_list)
        if not raw_bytes or len(raw_bytes) < 100:
            raise RuntimeError("微风企原始贷前报告 PDF 内容为空或不完整")

        return raw_bytes

    @classmethod
    async def store_cleaned_pdf(
        cls,
        session: AsyncSession,
        task_id: str,
        cleaned_pdf_bytes: bytes,
        custom_filename: Optional[str] = None,
        company_name: str = "",
        credit_code: str = "",
        source_url: str = "",
        report_id: Optional[str] = None
    ) -> TaskFile:
        """
        【Step 2 专属】将纯代码清洗后的标准 PDF 固化上传至 MinIO，并写入 TaskFile 存证记录
        """
        minio_mgr = get_minio_client()
        date_folder = datetime.now().strftime("%Y%m%d")
        task_dir = f"reports/{date_folder}/{task_id}"

        clean_filename = custom_filename or f"企业尽调分析报告_{company_name or '目标企业'}.pdf"
        if not clean_filename.endswith(".pdf"):
            clean_filename += ".pdf"

        pdf_object_name = f"{task_dir}/{clean_filename}"
        file_size = len(cleaned_pdf_bytes)
        file_hash = hashlib.sha256(cleaned_pdf_bytes).hexdigest()

        minio_mgr.upload_bytes(
            data=cleaned_pdf_bytes,
            object_name=pdf_object_name,
            content_type="application/pdf"
        )
        logger.info(f"[FileStorageService] 【Step 2 存证】Cleaned PDF stored to MinIO ({pdf_object_name}), size={file_size} bytes")

        # 检查是否已存在记录，存在则更新，不存在则创建
        result = await session.execute(
            select(TaskFile).where(TaskFile.task_id == task_id, TaskFile.file_type == "wfq_preloan_pdf")
        )
        file_record = result.scalars().first()
        if not file_record:
            file_record = TaskFile(
                id=str(uuid.uuid4()),
                task_id=task_id,
                report_id=report_id,
                file_type="wfq_preloan_pdf",
                filename=clean_filename,
                file_path=pdf_object_name,
                file_size=file_size,
                file_hash=file_hash,
                mime_type="application/pdf",
                source_url=source_url,
                status="stored"
            )
            session.add(file_record)
        else:
            file_record.filename = clean_filename
            file_record.file_path = pdf_object_name
            file_record.file_size = file_size
            file_record.file_hash = file_hash
            file_record.source_url = source_url or file_record.source_url
            file_record.status = "stored"

        await session.commit()
        await session.refresh(file_record)
        return file_record

    @classmethod
    async def store_ai_artifacts(
        cls,
        session: AsyncSession,
        task_id: str,
        parsed_pdf_data: Dict[str, Any],
        company_name: str = "",
        credit_code: str = "",
        source_url: str = "",
        report_id: Optional[str] = None
    ) -> Dict[str, TaskFile]:
        """
        【Step 3 专属】将 AI 研判生成的 4 大衍生资产 (catalog.json, content.txt, knowledge_base.md, summary.json) 上传至 MinIO
        """
        minio_mgr = get_minio_client()
        date_folder = datetime.now().strftime("%Y%m%d")
        task_dir = f"reports/{date_folder}/{task_id}"

        records = {}

        # 1. catalog.json
        toc_object_name = f"{task_dir}/catalog.json"
        toc_catalog = parsed_pdf_data.get("toc_catalog", [])
        toc_payload = {
            "task_id": task_id,
            "report_id": report_id,
            "company_name": company_name,
            "credit_code": credit_code,
            "toc_catalog": toc_catalog,
            "overall_ai_summary": parsed_pdf_data.get("overall_ai_summary", {}),
            "report_meta": parsed_pdf_data.get("report_meta", {})
        }
        toc_bytes = json.dumps(toc_payload, ensure_ascii=False, indent=2).encode("utf-8")
        minio_mgr.upload_bytes(data=toc_bytes, object_name=toc_object_name, content_type="application/json")
        
        toc_res = await session.execute(select(TaskFile).where(TaskFile.task_id == task_id, TaskFile.file_type == "pdf_toc_json"))
        toc_file = toc_res.scalars().first()
        if not toc_file:
            toc_file = TaskFile(
                id=str(uuid.uuid4()),
                task_id=task_id,
                report_id=report_id,
                file_type="pdf_toc_json",
                filename="catalog.json",
                file_path=toc_object_name,
                file_size=len(toc_bytes),
                file_hash=hashlib.sha256(toc_bytes).hexdigest(),
                mime_type="application/json",
                source_url=source_url,
                status="stored"
            )
            session.add(toc_file)
        else:
            toc_file.file_path = toc_object_name
            toc_file.file_size = len(toc_bytes)
            toc_file.file_hash = hashlib.sha256(toc_bytes).hexdigest()
        records["catalog"] = toc_file

        # 2. content.txt
        text_object_name = f"{task_dir}/content.txt"
        full_text = parsed_pdf_data.get("full_text_content", "")
        text_bytes = full_text.encode("utf-8")
        minio_mgr.upload_bytes(data=text_bytes, object_name=text_object_name, content_type="text/plain; charset=utf-8")

        txt_res = await session.execute(select(TaskFile).where(TaskFile.task_id == task_id, TaskFile.file_type == "pdf_content_txt"))
        txt_file = txt_res.scalars().first()
        if not txt_file:
            txt_file = TaskFile(
                id=str(uuid.uuid4()),
                task_id=task_id,
                report_id=report_id,
                file_type="pdf_content_txt",
                filename="content.txt",
                file_path=text_object_name,
                file_size=len(text_bytes),
                file_hash=hashlib.sha256(text_bytes).hexdigest(),
                mime_type="text/plain",
                source_url=source_url,
                status="stored"
            )
            session.add(txt_file)
        else:
            txt_file.file_path = text_object_name
            txt_file.file_size = len(text_bytes)
            txt_file.file_hash = hashlib.sha256(text_bytes).hexdigest()
        records["content"] = txt_file

        # 3. knowledge_base.md
        md_object_name = f"{task_dir}/knowledge_base.md"
        knowledge_md = parsed_pdf_data.get("knowledge_base_md", "")
        md_bytes = knowledge_md.encode("utf-8")
        minio_mgr.upload_bytes(data=md_bytes, object_name=md_object_name, content_type="text/markdown; charset=utf-8")

        md_res = await session.execute(select(TaskFile).where(TaskFile.task_id == task_id, TaskFile.file_type == "pdf_knowledge_md"))
        md_file = md_res.scalars().first()
        if not md_file:
            md_file = TaskFile(
                id=str(uuid.uuid4()),
                task_id=task_id,
                report_id=report_id,
                file_type="pdf_knowledge_md",
                filename="knowledge_base.md",
                file_path=md_object_name,
                file_size=len(md_bytes),
                file_hash=hashlib.sha256(md_bytes).hexdigest(),
                mime_type="text/markdown",
                source_url=source_url,
                status="stored"
            )
            session.add(md_file)
        else:
            md_file.file_path = md_object_name
            md_file.file_size = len(md_bytes)
            md_file.file_hash = hashlib.sha256(md_bytes).hexdigest()
        records["knowledge_base"] = md_file

        # 4. summary.json
        summary_object_name = f"{task_dir}/summary.json"
        ai_summary_json = parsed_pdf_data.get("ai_summary_json", {})
        summary_bytes = json.dumps(ai_summary_json, ensure_ascii=False, indent=2).encode("utf-8")
        minio_mgr.upload_bytes(data=summary_bytes, object_name=summary_object_name, content_type="application/json; charset=utf-8")

        sum_res = await session.execute(select(TaskFile).where(TaskFile.task_id == task_id, TaskFile.file_type == "pdf_summary_json"))
        sum_file = sum_res.scalars().first()
        if not sum_file:
            sum_file = TaskFile(
                id=str(uuid.uuid4()),
                task_id=task_id,
                report_id=report_id,
                file_type="pdf_summary_json",
                filename="summary.json",
                file_path=summary_object_name,
                file_size=len(summary_bytes),
                file_hash=hashlib.sha256(summary_bytes).hexdigest(),
                mime_type="application/json",
                source_url=source_url,
                status="stored"
            )
            session.add(sum_file)
        else:
            sum_file.file_path = summary_object_name
            sum_file.file_size = len(summary_bytes)
            sum_file.file_hash = hashlib.sha256(summary_bytes).hexdigest()
        records["summary"] = sum_file

        await session.commit()
        for k in records:
            await session.refresh(records[k])

        return records

    @classmethod
    async def check_task_files_health(
        cls,
        session: AsyncSession,
        task_id: str
    ) -> Dict[str, Any]:
        """
        【Step 4 专属】MinIO 5 大存证文件健康度校验矩阵
        核验：
        1. wfq_preloan_pdf (清洗后 PDF 底稿)
        2. pdf_toc_json (catalog.json)
        3. pdf_content_txt (content.txt)
        4. pdf_knowledge_md (knowledge_base.md)
        5. pdf_summary_json (summary.json)
        返回: {
            "is_healthy": bool,
            "has_pdf": bool,
            "has_ai_artifacts": bool,
            "missing_steps": [2, 3],
            "file_details": {...}
        }
        """
        minio_mgr = get_minio_client()
        result = await session.execute(
            select(TaskFile).where(TaskFile.task_id == task_id)
        )
        files = result.scalars().all()
        file_map = {f.file_type: f for f in files}

        status_details = {}
        required_types = {
            "wfq_preloan_pdf": "清洗后标准 PDF 底稿",
            "pdf_toc_json": "真实物理页目录大纲 JSON",
            "pdf_content_txt": "全文对齐纯文本 TXT",
            "pdf_knowledge_md": "Markdown 知识库 MD",
            "pdf_summary_json": "综合画像与风控研判 JSON"
        }

        missing_steps = set()

        # 检查 PDF
        pdf_rec = file_map.get("wfq_preloan_pdf")
        pdf_ok = False
        if pdf_rec and minio_mgr.object_exists(pdf_rec.file_path) and (pdf_rec.file_size or 0) > 1024:
            pdf_ok = True
        if not pdf_ok:
            missing_steps.add(2)
        status_details["pdf"] = {"exists": pdf_ok, "path": pdf_rec.file_path if pdf_rec else None}

        # 检查 AI 衍生资产
        ai_types = ["pdf_toc_json", "pdf_content_txt", "pdf_knowledge_md", "pdf_summary_json"]
        ai_all_ok = True
        for t in ai_types:
            rec = file_map.get(t)
            is_ok = False
            if rec and minio_mgr.object_exists(rec.file_path) and (rec.file_size or 0) > 0:
                is_ok = True
            else:
                ai_all_ok = False
            status_details[t] = {"exists": is_ok, "path": rec.file_path if rec else None}

        if not ai_all_ok:
            missing_steps.add(3)

        is_healthy = (pdf_ok and ai_all_ok)
        return {
            "is_healthy": is_healthy,
            "has_pdf": pdf_ok,
            "has_ai_artifacts": ai_all_ok,
            "missing_steps": sorted(list(missing_steps)),
            "file_details": status_details
        }

    @classmethod
    async def download_and_store_remote_file(
        cls,
        session: AsyncSession,
        remote_url: str,
        task_id: str,
        report_id: Optional[str] = None,
        file_type: str = "wfq_preloan_pdf",
        custom_filename: Optional[str] = None,
        company_name: str = "",
        credit_code: str = "",
        replacements: Optional[Dict[str, str]] = None
    ) -> Tuple[TaskFile, Dict[str, Any]]:
        """
        从远程 URL (如微风企网关/电信云/Mock服务) 异步流式拉取 PDF 并完成全链路清洗存证
        """
        from app.services.cleansing_service import DataCleansingService

        # 1. 流式下载
        raw_data = await cls.download_raw_remote_pdf(remote_url)

        # 2. 纯代码清洗 (Step 2)
        cleaned_pdf_bytes, has_cover_removed = DataCleansingService.clean_pdf_bytes_only(
            raw_pdf_bytes=raw_data,
            replacements=replacements
        )

        # 3. 存入 MinIO 清洗后 PDF (Step 2 存证)
        file_record = await cls.store_cleaned_pdf(
            session=session,
            task_id=task_id,
            cleaned_pdf_bytes=cleaned_pdf_bytes,
            custom_filename=custom_filename,
            company_name=company_name,
            credit_code=credit_code,
            source_url=remote_url,
            report_id=report_id
        )

        # 4. AI 深度解析 (Step 3)
        parsed_pdf_data = await DataCleansingService.extract_ai_artifacts_from_pdf_bytes(
            cleaned_pdf_bytes=cleaned_pdf_bytes,
            company_name=company_name,
            credit_code=credit_code
        )
        parsed_pdf_data["has_cover_removed"] = has_cover_removed

        # 5. 上传 AI 衍生资产至 MinIO (Step 3 存证)
        await cls.store_ai_artifacts(
            session=session,
            task_id=task_id,
            parsed_pdf_data=parsed_pdf_data,
            company_name=company_name,
            credit_code=credit_code,
            source_url=remote_url,
            report_id=report_id
        )

        return file_record, parsed_pdf_data

    @classmethod
    def get_file_stream(cls, object_name_or_record: Any):
        """
        从 MinIO 获取对象数据流 (可直接用于 FastAPI StreamingResponse)
        """
        minio_mgr = get_minio_client()
        object_name = object_name_or_record.file_path if hasattr(object_name_or_record, "file_path") else str(object_name_or_record)
        return minio_mgr.get_object_stream(object_name)

    @classmethod
    def get_file_bytes(cls, object_name_or_record: Any) -> bytes:
        """
        从 MinIO 获取完整二进制数据
        """
        minio_mgr = get_minio_client()
        object_name = object_name_or_record.file_path if hasattr(object_name_or_record, "file_path") else str(object_name_or_record)
        return minio_mgr.get_object_bytes(object_name)

    @classmethod
    def get_presigned_url(cls, object_name_or_record: Any, expires_seconds: int = 3600) -> str:
        """
        生成 MinIO 预签名直链下载地址
        """
        minio_mgr = get_minio_client()
        object_name = object_name_or_record.file_path if hasattr(object_name_or_record, "file_path") else str(object_name_or_record)
        return minio_mgr.get_presigned_url(object_name, expires_seconds=expires_seconds)

    @classmethod
    def upload_local_file_to_minio(cls, local_path: str, object_name: str) -> Dict[str, Any]:
        """
        将本地已有模版或历史文件同步迁移上传至 MinIO
        """
        minio_mgr = get_minio_client()
        return minio_mgr.upload_file(file_path=local_path, object_name=object_name, content_type="application/pdf")

    @classmethod
    async def get_file_by_id(cls, session: AsyncSession, file_id: str) -> Optional[TaskFile]:
        """根据文件 ID 查询存证元数据"""
        result = await session.execute(select(TaskFile).where(TaskFile.id == file_id))
        return result.scalar_one_or_none()

    @classmethod
    async def get_file_by_task_id(
        cls, 
        session: AsyncSession, 
        task_id: str, 
        file_type: str = "wfq_preloan_pdf"
    ) -> Optional[TaskFile]:
        """根据任务 ID 获取对应类型的最新存储文件"""
        result = await session.execute(
            select(TaskFile)
            .where(TaskFile.task_id == task_id, TaskFile.file_type == file_type)
            .order_by(TaskFile.created_at.desc())
        )
        return result.scalars().first()

    @classmethod
    async def get_file_by_report_id(cls, session: AsyncSession, report_id: str) -> Optional[TaskFile]:
        """根据报告 ID 获取关联的 PDF 文件"""
        result = await session.execute(
            select(TaskFile)
            .where(TaskFile.report_id == report_id)
            .order_by(TaskFile.created_at.desc())
        )
        return result.scalars().first()
