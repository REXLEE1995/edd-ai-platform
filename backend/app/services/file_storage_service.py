import os
import uuid
import hashlib
import logging
from datetime import datetime
from typing import Optional, Any, Dict, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.file_record import TaskFile
from app.core.minio_client import get_minio_client

logger = logging.getLogger("edd.storage")

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
        1. 【步骤 1】先流经 DataCleansingService 执行字符替换与数据清洗；
        2. 【步骤 2】对清洗后的文档做全景目录与章节结构化解析 (参考 test/parse_report_catalog.py)；
        3. 【步骤 3】对清洗后的标准 PDF 计算 SHA-256 防篡改存证并上传至 MinIO 对象存储。
        返回: (file_record, parsed_pdf_data)
        """
        from app.services.cleansing_service import DataCleansingService

        minio_mgr = get_minio_client()
        timestamp_str = datetime.now().strftime("%Y%m%d%H%M%S")
        date_folder = datetime.now().strftime("%Y%m%d")

        # 1. 确定清理后的文件名与 MinIO Object Key 路径
        clean_filename = custom_filename or os.path.basename(remote_url.split("?")[0]) or f"report_{task_id}.pdf"
        if not clean_filename.endswith(".pdf") and file_type == "wfq_preloan_pdf":
            clean_filename += ".pdf"
        
        object_name = f"reports/{date_folder}/{task_id}_{timestamp_str}_{clean_filename}"
        logger.info(f"[FileStorageService] Fetching remote stream: {remote_url} -> Data Cleansing (Character Replacement & TOC Parse) -> MinIO: {minio_mgr.default_bucket}/{object_name}")

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

        # 3. 核心步骤 1 & 2：调用数据清洗中台执行字符替换与目录大纲解析
        cleaned_pdf_bytes, parsed_pdf_data = DataCleansingService.clean_and_process_pdf_bytes(
            raw_pdf_bytes=raw_data,
            company_name=company_name,
            credit_code=credit_code,
            replacements=replacements
        )

        # 4. 对清洗后的最终文件计算 SHA-256 存证与大小
        file_size = len(cleaned_pdf_bytes)
        file_hash = hashlib.sha256(cleaned_pdf_bytes).hexdigest()

        # 5. 直传 MinIO 对象存储
        minio_mgr.upload_bytes(
            data=cleaned_pdf_bytes,
            object_name=object_name,
            content_type="application/pdf"
        )
        logger.info(f"[FileStorageService] Cleansed PDF successfully stored to MinIO ({minio_mgr.default_bucket}/{object_name}), size={file_size} bytes, sha256={file_hash}")

        # 6. 创建 TaskFile 元数据存证记录 (file_path 存储 MinIO Object Key)
        file_record = TaskFile(
            id=str(uuid.uuid4()),
            task_id=task_id,
            report_id=report_id,
            file_type=file_type,
            filename=clean_filename,
            file_path=object_name,
            file_size=file_size,
            file_hash=file_hash,
            mime_type="application/pdf",
            source_url=remote_url,
            status="stored"
        )
        session.add(file_record)
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
