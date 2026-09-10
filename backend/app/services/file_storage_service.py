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
        从远程 URL (如微风企网关/电信云/Mock服务) 异步流式拉取 PDF，
        【核心执行流程】：
        1. 【步骤 1】对三方 PDF 执行字符替换清洗与封面自动判断删除（若第一页有“报告检测时间”等）；
        2. 【步骤 2】对清洗后的文档做全景目录结构化解析 (toc_catalog)；
        3. 【步骤 3】解析 PDF 文件内容，抽取形成全篇纯文本内容 (full_text_content)；
        4. 【MinIO 存证】将步骤 1~3 的所有产物 (PDF 文件、目录 JSON、纯文本 TXT) 上传至 MinIO 对象存储。
        返回: (file_record, parsed_pdf_data)
        """
        from app.services.cleansing_service import DataCleansingService

        minio_mgr = get_minio_client()
        timestamp_str = datetime.now().strftime("%Y%m%d%H%M%S")
        date_folder = datetime.now().strftime("%Y%m%d")

        # 1. 确定 MinIO 对象存储的层级路径架构: reports/{日期}/{任务ID}/
        date_folder = datetime.now().strftime("%Y%m%d")
        task_dir = f"reports/{date_folder}/{task_id}"

        clean_filename = custom_filename or os.path.basename(remote_url.split("?")[0]) or "report.pdf"
        if not clean_filename.endswith(".pdf") and file_type == "wfq_preloan_pdf":
            clean_filename += ".pdf"
        
        pdf_object_name = f"{task_dir}/{clean_filename}"
        toc_object_name = f"{task_dir}/catalog.json"
        text_object_name = f"{task_dir}/content.txt"

        logger.info(f"[FileStorageService] Fetching remote stream: {remote_url} -> Data Cleansing (Step 1~3) -> MinIO Target Directory: {minio_mgr.default_bucket}/{task_dir}/")

        # 2. 流式下载原始二进制流
        file_bytes_list = []
        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                async with client.stream("GET", remote_url) as response:
                    if response.status_code != 200:
                        raise RuntimeError(f"Download remote file failed with HTTP status {response.status_code}: {remote_url}")
                    
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        if chunk:
                            file_bytes_list.append(chunk)
        except Exception as e:
            logger.error(f"[FileStorageService] Failed to stream remote file ({remote_url}): {e}")
            raise

        raw_data = b"".join(file_bytes_list)

        # 3. 核心步骤 1~4：调用数据清洗中台执行字符替换、封面剔除、目录解析、文本提取与 AI Markdown 知识库生成
        cleaned_pdf_bytes, parsed_pdf_data = await DataCleansingService.clean_and_process_pdf_bytes(
            raw_pdf_bytes=raw_data,
            company_name=company_name,
            credit_code=credit_code,
            replacements=replacements
        )

        # =============================================================
        # 步骤 1 产物上传 MinIO (reports/{日期}/{任务ID}/{clean_filename})
        # =============================================================
        file_size = len(cleaned_pdf_bytes)
        file_hash = hashlib.sha256(cleaned_pdf_bytes).hexdigest()
        minio_mgr.upload_bytes(
            data=cleaned_pdf_bytes,
            object_name=pdf_object_name,
            content_type="application/pdf"
        )
        logger.info(f"[FileStorageService] 【步骤 1 产物】Cleaned PDF stored to MinIO ({pdf_object_name}), size={file_size} bytes")

        file_record = TaskFile(
            id=str(uuid.uuid4()),
            task_id=task_id,
            report_id=report_id,
            file_type=file_type,
            filename=clean_filename,
            file_path=pdf_object_name,
            file_size=file_size,
            file_hash=file_hash,
            mime_type="application/pdf",
            source_url=remote_url,
            status="stored"
        )
        session.add(file_record)

        # =============================================================
        # 步骤 2 产物上传 MinIO (reports/{日期}/{任务ID}/catalog.json)
        # =============================================================
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
        minio_mgr.upload_bytes(
            data=toc_bytes,
            object_name=toc_object_name,
            content_type="application/json"
        )
        logger.info(f"[FileStorageService] 【步骤 2 产物】TOC Catalog JSON stored to MinIO ({toc_object_name}), size={len(toc_bytes)} bytes")

        toc_file_record = TaskFile(
            id=str(uuid.uuid4()),
            task_id=task_id,
            report_id=report_id,
            file_type="pdf_toc_json",
            filename="catalog.json",
            file_path=toc_object_name,
            file_size=len(toc_bytes),
            file_hash=hashlib.sha256(toc_bytes).hexdigest(),
            mime_type="application/json",
            source_url=remote_url,
            status="stored"
        )
        session.add(toc_file_record)

        # =============================================================
        # 步骤 3 产物上传 MinIO (reports/{日期}/{任务ID}/content.txt)
        # =============================================================
        full_text = parsed_pdf_data.get("full_text_content", "")
        text_bytes = full_text.encode("utf-8")
        minio_mgr.upload_bytes(
            data=text_bytes,
            object_name=text_object_name,
            content_type="text/plain; charset=utf-8"
        )
        logger.info(f"[FileStorageService] 【步骤 3 产物】PDF Content Text stored to MinIO ({text_object_name}), size={len(text_bytes)} bytes")

        text_file_record = TaskFile(
            id=str(uuid.uuid4()),
            task_id=task_id,
            report_id=report_id,
            file_type="pdf_content_txt",
            filename="content.txt",
            file_path=text_object_name,
            file_size=len(text_bytes),
            file_hash=hashlib.sha256(text_bytes).hexdigest(),
            mime_type="text/plain",
            source_url=remote_url,
            status="stored"
        )
        session.add(text_file_record)

        # =============================================================
        # 步骤 4 产物上传 MinIO (reports/{日期}/{任务ID}/knowledge_base.md)
        # =============================================================
        knowledge_md = parsed_pdf_data.get("knowledge_base_md", "")
        md_bytes = knowledge_md.encode("utf-8")
        md_object_name = f"{task_dir}/knowledge_base.md"
        minio_mgr.upload_bytes(
            data=md_bytes,
            object_name=md_object_name,
            content_type="text/markdown; charset=utf-8"
        )
        logger.info(f"[FileStorageService] 【步骤 4 产物】AI Markdown Knowledge Base stored to MinIO ({md_object_name}), size={len(md_bytes)} bytes")

        md_file_record = TaskFile(
            id=str(uuid.uuid4()),
            task_id=task_id,
            report_id=report_id,
            file_type="pdf_knowledge_md",
            filename="knowledge_base.md",
            file_path=md_object_name,
            file_size=len(md_bytes),
            file_hash=hashlib.sha256(md_bytes).hexdigest(),
            mime_type="text/markdown",
            source_url=remote_url,
            status="stored"
        )
        session.add(md_file_record)
        # =============================================================
        # 步骤 5 产物上传 MinIO (reports/{日期}/{任务ID}/summary.json)
        # =============================================================
        ai_summary_json = parsed_pdf_data.get("ai_summary_json", {})
        summary_bytes = json.dumps(ai_summary_json, ensure_ascii=False, indent=2).encode("utf-8")
        summary_object_name = f"{task_dir}/summary.json"
        minio_mgr.upload_bytes(
            data=summary_bytes,
            object_name=summary_object_name,
            content_type="application/json; charset=utf-8"
        )
        logger.info(f"[FileStorageService] 【步骤 5 产物】AI Summary JSON stored to MinIO ({summary_object_name}), size={len(summary_bytes)} bytes")

        summary_file_record = TaskFile(
            id=str(uuid.uuid4()),
            task_id=task_id,
            report_id=report_id,
            file_type="pdf_summary_json",
            filename="summary.json",
            file_path=summary_object_name,
            file_size=len(summary_bytes),
            file_hash=hashlib.sha256(summary_bytes).hexdigest(),
            mime_type="application/json",
            source_url=remote_url,
            status="stored"
        )
        session.add(summary_file_record)

        await session.commit()
        await session.refresh(file_record)

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
