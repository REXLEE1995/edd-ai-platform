import os
import uuid
import hashlib
import logging
from datetime import datetime
from typing import Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.file_record import TaskFile

logger = logging.getLogger("edd.storage")

# 文件持久化根存储目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_ROOT = os.path.join(BASE_DIR, "data", "storage", "reports")
os.makedirs(STORAGE_ROOT, exist_ok=True)

class FileStorageService:
    """
    尽调平台统一文件存储与存证服务 (File Storage & Evidence Service)
    支持从微风企等三方接口拉取 PDF 流并落盘、SHA-256防篡改存证与元数据登记。
    """

    @classmethod
    def get_storage_dir(cls) -> str:
        os.makedirs(STORAGE_ROOT, exist_ok=True)
        return STORAGE_ROOT

    @classmethod
    async def download_and_store_remote_file(
        cls,
        session: AsyncSession,
        remote_url: str,
        task_id: str,
        report_id: Optional[str] = None,
        file_type: str = "wfq_preloan_pdf",
        custom_filename: Optional[str] = None
    ) -> TaskFile:
        """
        从远程 URL (如微风企 Mock 服务) 异步流式下载文件并落盘，自动计算哈希并落库
        """
        cls.get_storage_dir()
        
        # 1. 确定文件名与保存路径
        timestamp_str = datetime.now().strftime("%Y%m%d%H%M%S")
        clean_filename = custom_filename or os.path.basename(remote_url.split("?")[0]) or f"report_{task_id}.pdf"
        if not clean_filename.endswith(".pdf") and file_type == "wfq_preloan_pdf":
            clean_filename += ".pdf"
        
        disk_filename = f"{task_id}_{timestamp_str}_{clean_filename}"
        disk_filepath = os.path.join(STORAGE_ROOT, disk_filename)

        logger.info(f"[FileStorageService] Starting stream download from {remote_url} -> {disk_filepath}")

        # 2. 流式下载并增量计算 SHA-256
        sha256 = hashlib.sha256()
        file_size = 0

        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                async with client.stream("GET", remote_url) as response:
                    if response.status_code != 200:
                        raise RuntimeError(f"Download remote file failed with HTTP status {response.status_code}: {remote_url}")
                    
                    with open(disk_filepath, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=65536):
                            if chunk:
                                f.write(chunk)
                                sha256.update(chunk)
                                file_size += len(chunk)
        except Exception as e:
            logger.error(f"[FileStorageService] Failed to download remote file: {str(e)}")
            if os.path.exists(disk_filepath):
                try:
                    os.remove(disk_filepath)
                except Exception:
                    pass
            raise

        file_hash = sha256.hexdigest()
        logger.info(f"[FileStorageService] Successfully stored {clean_filename}, size={file_size} bytes, sha256={file_hash}")

        # 3. 创建 TaskFile 元数据存证记录
        file_record = TaskFile(
            id=str(uuid.uuid4()),
            task_id=task_id,
            report_id=report_id,
            file_type=file_type,
            filename=clean_filename,
            file_path=disk_filepath,
            file_size=file_size,
            file_hash=file_hash,
            mime_type="application/pdf",
            source_url=remote_url,
            status="stored"
        )
        session.add(file_record)
        await session.commit()
        await session.refresh(file_record)

        return file_record

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
