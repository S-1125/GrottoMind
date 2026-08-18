"""
Cloudflare R2 对象存储与 CDN 加速适配器 — 问窟 GrottoMind
基于 AWS S3 兼容 API (boto3)
提供文献图版、多媒体资产的批量上传、链接生成与 CDN 映射能力
"""

import os
import sys
import mimetypes
import logging
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

logger = logging.getLogger("r2_storage")
logging.basicConfig(level=logging.INFO)

# Cloudflare R2 配置
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "grottomind-assets")
R2_CDN_URL = os.environ.get("R2_CDN_URL", "").rstrip("/")


def get_r2_client():
    """初始化 Cloudflare R2 S3 客户端"""
    if not (R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY):
        logger.warning("未检测到完整的 R2 配置 (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)")
        return None

    try:
        import boto3
        from botocore.config import Config

        endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )
        return client
    except ImportError:
        logger.error("请安装 boto3: pip install boto3")
        return None
    except Exception as e:
        logger.error(f"初始化 R2 客户端失败: {e}")
        return None


def upload_file_to_r2(local_path: str, r2_key: str, content_type: Optional[str] = None) -> Optional[str]:
    """上传单个本地文件至 Cloudflare R2 存储桶并返回 CDN 访问 URL"""
    client = get_r2_client()
    if not client:
        logger.error("R2 客户端未就绪，无法上传文件")
        return None

    if not content_type:
        content_type, _ = mimetypes.guess_type(local_path)
        content_type = content_type or "application/octet-stream"

    try:
        with open(local_path, "rb") as f:
            client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=r2_key,
                Body=f,
                ContentType=content_type,
                # 设置强缓存头 (1年) 由 Cloudflare CDN 边缘缓存
                CacheControl="public, max-age=31536000, immutable"
            )
        logger.info(f"✅ 成功上传至 R2: {r2_key}")

        # 若配置了 CDN 域名，则返回 CDN 加速地址
        if R2_CDN_URL:
            return f"{R2_CDN_URL}/{r2_key}"
        return f"https://{R2_BUCKET_NAME}.r2.cloudflarestorage.com/{r2_key}"
    except Exception as e:
        logger.error(f"上传文件至 R2 失败 ({local_path} -> {r2_key}): {e}")
        return None


def batch_upload_directory(local_dir: str, prefix: str = "", max_workers: int = 10):
    """多线程批量上传整个目录到 R2"""
    if not os.path.exists(local_dir):
        logger.warning(f"目录不存在: {local_dir}")
        return

    files_to_upload: List[tuple[str, str]] = []
    for root, _, files in os.walk(local_dir):
        for file in files:
            if file.startswith("."):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, local_dir)
            r2_key = f"{prefix.strip('/')}/{rel_path}" if prefix else rel_path
            files_to_upload.append((full_path, r2_key))

    logger.info(f"准备批量上传 {len(files_to_upload)} 个文件至 R2 (Bucket: {R2_BUCKET_NAME})...")

    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(upload_file_to_r2, local, key): key
            for local, key in files_to_upload
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                res = future.result()
                if res:
                    success_count += 1
            except Exception as e:
                logger.error(f"上传任务异常 ({key}): {e}")

    logger.info(f"🎉 批量上传完成: 成功 {success_count}/{len(files_to_upload)}")


if __name__ == "__main__":
    images_dir = os.path.join(SERVER_DIR, "static", "images")
    if os.path.exists(images_dir) and os.listdir(images_dir):
        batch_upload_directory(images_dir, prefix="literature-images")
    else:
        print("💡 提示: server/static/images 目录为空。当有新素材或图版时，运行此脚本即可一键多线程同步至 Cloudflare R2 并开启 CDN 加速。")
