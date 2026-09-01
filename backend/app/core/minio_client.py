import io
import os
import logging
import urllib.parse
from datetime import timedelta
from typing import Optional, BinaryIO, Generator, Any, Dict, List
import urllib3
from minio import Minio
from minio.error import S3Error
from app.core.config import settings

logger = logging.getLogger("edd.minio")

class MinioClientManager:
    """
    MinIO 对象存储统一客户端管理器 (Singleton Manager)
    封装对象存储连接池、Bucket 自动管理、流式上传/下载与预签名直链生成。
    """
    _instance: Optional["MinioClientManager"] = None
    _client: Optional[Minio] = None
    _bucket_name: str = "my-files"
    _active_endpoint: str = ""

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MinioClientManager, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        """初始化 MinIO 客户端连接 (支持高可用与本地自适应探测)"""
        raw_endpoint = settings.MINIO_ENDPOINT.strip()
        secure = settings.MINIO_SECURE

        if raw_endpoint.startswith("http://"):
            raw_endpoint = raw_endpoint.replace("http://", "")
            secure = False
        elif raw_endpoint.startswith("https://"):
            raw_endpoint = raw_endpoint.replace("https://", "")
            secure = True

        raw_endpoint = raw_endpoint.rstrip("/")
        self._bucket_name = settings.MINIO_BUCKET_NAME or "my-files"

        # 候选 endpoint 列表
        endpoints_to_try = [raw_endpoint, "127.0.0.1:9000", "localhost:9000", "192.168.110.234:9000"]
        chosen_client = None
        chosen_endpoint = raw_endpoint

        for ep in endpoints_to_try:
            if not ep:
                continue
            try:
                # 使用自定义短超时的 HTTP 客户端快速校验实际 MinIO API 连通性
                http_client = urllib3.PoolManager(
                    timeout=urllib3.Timeout(connect=1.0, read=2.0),
                    retries=urllib3.Retry(total=1)
                )
                test_client = Minio(
                    endpoint=ep,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=secure,
                    http_client=http_client
                )
                # 尝试轻量列出 bucket 校验鉴权与连通
                test_client.list_buckets()
                chosen_endpoint = ep
                # 正式客户端创建（使用快速超时连接池，防止阻塞事件循环）
                chosen_client = Minio(
                    endpoint=ep,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=secure,
                    http_client=http_client
                )
                break
            except Exception:
                continue

        if not chosen_client:
            chosen_endpoint = raw_endpoint or "127.0.0.1:9000"
            fallback_http_client = urllib3.PoolManager(
                timeout=urllib3.Timeout(connect=1.0, read=2.0),
                retries=urllib3.Retry(total=1)
            )
            chosen_client = Minio(
                endpoint=chosen_endpoint,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=secure,
                http_client=fallback_http_client
            )

        self._active_endpoint = chosen_endpoint
        self._client = chosen_client
        logger.info(f"[MinIO] Successfully connected to MinIO server on {self._active_endpoint} (Bucket: {self._bucket_name})")
        self.ensure_bucket_exists(self._bucket_name)

    @property
    def client(self) -> Minio:
        if self._client is None:
            self._init_client()
        return self._client

    @property
    def default_bucket(self) -> str:
        return self._bucket_name

    @property
    def active_endpoint(self) -> str:
        return self._active_endpoint

    def ensure_bucket_exists(self, bucket_name: Optional[str] = None) -> bool:
        """检查指定 Bucket 是否存在，若不存在则自动创建"""
        target_bucket = bucket_name or self._bucket_name
        try:
            if not self.client.bucket_exists(target_bucket):
                logger.info(f"[MinIO] Bucket '{target_bucket}' does not exist, creating it automatically...")
                self.client.make_bucket(target_bucket)
                logger.info(f"[MinIO] Bucket '{target_bucket}' created successfully.")
            return True
        except Exception as e:
            logger.warning(f"[MinIO] Failed to check/create bucket '{target_bucket}': {e}")
            return False

    def upload_bytes(
        self,
        data: bytes,
        object_name: str,
        bucket_name: Optional[str] = None,
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """
        以二进制字节直接上传到 MinIO
        """
        target_bucket = bucket_name or self._bucket_name
        self.ensure_bucket_exists(target_bucket)
        
        data_stream = io.BytesIO(data)
        data_len = len(data)

        try:
            result = self.client.put_object(
                bucket_name=target_bucket,
                object_name=object_name,
                data=data_stream,
                length=data_len,
                content_type=content_type
            )
            logger.info(f"[MinIO] Uploaded bytes to '{target_bucket}/{object_name}' (size: {data_len} bytes, etag: {result.etag})")
            return {
                "bucket": target_bucket,
                "object_name": object_name,
                "etag": result.etag,
                "size": data_len,
                "content_type": content_type
            }
        except Exception as e:
            logger.error(f"[MinIO] Failed to upload bytes to '{target_bucket}/{object_name}': {e}")
            raise

    def upload_stream(
        self,
        stream: BinaryIO,
        length: int,
        object_name: str,
        bucket_name: Optional[str] = None,
        content_type: str = "application/pdf",
        part_size: int = 10 * 1024 * 1024
    ) -> Dict[str, Any]:
        """
        流式上传大文件至 MinIO (支持内存流分块上传)
        """
        target_bucket = bucket_name or self._bucket_name
        self.ensure_bucket_exists(target_bucket)

        try:
            result = self.client.put_object(
                bucket_name=target_bucket,
                object_name=object_name,
                data=stream,
                length=length if length > 0 else -1,
                part_size=part_size if length <= 0 else 0,
                content_type=content_type
            )
            logger.info(f"[MinIO] Stream uploaded to '{target_bucket}/{object_name}' (etag: {result.etag})")
            return {
                "bucket": target_bucket,
                "object_name": object_name,
                "etag": result.etag,
                "size": length,
                "content_type": content_type
            }
        except Exception as e:
            logger.error(f"[MinIO] Failed to stream upload to '{target_bucket}/{object_name}': {e}")
            raise

    def upload_file(
        self,
        file_path: str,
        object_name: str,
        bucket_name: Optional[str] = None,
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """
        将本地物理文件上传到 MinIO
        """
        target_bucket = bucket_name or self._bucket_name
        self.ensure_bucket_exists(target_bucket)

        try:
            result = self.client.fput_object(
                bucket_name=target_bucket,
                object_name=object_name,
                file_path=file_path,
                content_type=content_type
            )
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            logger.info(f"[MinIO] File '{file_path}' uploaded to '{target_bucket}/{object_name}' (size: {file_size} bytes)")
            return {
                "bucket": target_bucket,
                "object_name": object_name,
                "etag": result.etag,
                "size": file_size,
                "content_type": content_type
            }
        except Exception as e:
            logger.error(f"[MinIO] Failed to fput_object '{file_path}' to '{target_bucket}/{object_name}': {e}")
            raise

    def get_object_stream(self, object_name: str, bucket_name: Optional[str] = None):
        """
        从 MinIO 获取对象的流式响应对象 (可在 FastAPI 中作为 StreamingResponse 流式输出)
        """
        target_bucket = bucket_name or self._bucket_name
        try:
            response = self.client.get_object(bucket_name=target_bucket, object_name=object_name)
            return response
        except Exception as e:
            logger.error(f"[MinIO] Failed to get object stream for '{target_bucket}/{object_name}': {e}")
            raise

    def get_object_bytes(self, object_name: str, bucket_name: Optional[str] = None) -> bytes:
        """
        从 MinIO 读取对象的全量字节
        """
        response = None
        try:
            response = self.get_object_stream(object_name, bucket_name)
            return response.read()
        finally:
            if response:
                response.close()
                response.release_conn()

    def get_presigned_url(
        self,
        object_name: str,
        bucket_name: Optional[str] = None,
        expires_seconds: int = 3600
    ) -> str:
        """
        生成带时效签名的 MinIO 对象外链直链下载 URL
        """
        target_bucket = bucket_name or self._bucket_name
        try:
            url = self.client.presigned_get_object(
                bucket_name=target_bucket,
                object_name=object_name,
                expires=timedelta(seconds=expires_seconds)
            )
            return url
        except Exception as e:
            logger.error(f"[MinIO] Failed to generate presigned URL for '{target_bucket}/{object_name}': {e}")
            return ""

    def stat_object(self, object_name: str, bucket_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        获取 MinIO 中对象的元数据信息
        """
        target_bucket = bucket_name or self._bucket_name
        try:
            stat = self.client.stat_object(bucket_name=target_bucket, object_name=object_name)
            return {
                "bucket": stat.bucket_name,
                "object_name": stat.object_name,
                "size": stat.size,
                "etag": stat.etag,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified
            }
        except S3Error as e:
            if e.code == "NoSuchKey":
                return None
            logger.warning(f"[MinIO] S3Error during stat_object on '{target_bucket}/{object_name}': {e}")
            return None
        except Exception as e:
            logger.warning(f"[MinIO] Error during stat_object on '{target_bucket}/{object_name}': {e}")
            return None

    def object_exists(self, object_name: str, bucket_name: Optional[str] = None) -> bool:
        """判断 MinIO 中某个对象是否存在"""
        return self.stat_object(object_name, bucket_name) is not None

    def delete_object(self, object_name: str, bucket_name: Optional[str] = None) -> bool:
        """删除 MinIO 中的指定对象"""
        target_bucket = bucket_name or self._bucket_name
        try:
            self.client.remove_object(bucket_name=target_bucket, object_name=object_name)
            logger.info(f"[MinIO] Removed object '{target_bucket}/{object_name}'")
            return True
        except Exception as e:
            logger.error(f"[MinIO] Failed to remove object '{target_bucket}/{object_name}': {e}")
            return False

# 单例提供函数
_minio_manager_instance: Optional[MinioClientManager] = None

def get_minio_client() -> MinioClientManager:
    global _minio_manager_instance
    if _minio_manager_instance is None:
        _minio_manager_instance = MinioClientManager()
    return _minio_manager_instance
