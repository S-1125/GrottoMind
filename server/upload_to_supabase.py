"""
并发批量上传 server/static/images/ 到 Supabase Storage
使用 10 个并发线程加速上传
"""

import os
import sys
import subprocess
import mimetypes
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# ————————————————————————————————————————————
# 配置
# ————————————————————————————————————————————
SUPABASE_URL = "https://fgzjdxriyrnoibwmglih.supabase.co"
BUCKET_NAME = "literature-images"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnempkeHJpeXJub2lid21nbGloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk5NzUxMiwiZXhwIjoyMDkzNTczNTEyfQ.5OoHwxON7X1wiidjON3HqnjaE0OMf3tWhZ1rslLBp5c"

STATIC_IMAGES_DIR = os.path.join(os.path.dirname(__file__), "static", "images")
UPLOAD_URL = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}"

# 并发数
MAX_WORKERS = 10

# 线程安全计数器
lock = threading.Lock()
counter = {"success": 0, "failed": 0, "done": 0}


def get_mime_type(filepath: str) -> str:
    mime, _ = mimetypes.guess_type(filepath)
    return mime or "application/octet-stream"


def upload_file(local_path: str, remote_path: str, total: int) -> bool:
    """使用 curl 上传单个文件"""
    mime_type = get_mime_type(local_path)
    url = f"{UPLOAD_URL}/{remote_path}"

    try:
        result = subprocess.run(
            [
                "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                "-X", "POST",
                "-H", f"Authorization: Bearer {SERVICE_ROLE_KEY}",
                "-H", f"Content-Type: {mime_type}",
                "-H", "x-upsert: true",
                "--data-binary", f"@{local_path}",
                "--connect-timeout", "10",
                "--max-time", "30",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        ok = result.stdout.strip() == "200"
    except Exception:
        ok = False

    with lock:
        counter["done"] += 1
        if ok:
            counter["success"] += 1
        else:
            counter["failed"] += 1
        done = counter["done"]
        s = counter["success"]
        f = counter["failed"]
        pct = done * 100 // total
        print(f"\r  [{done}/{total}] {pct}%  ✅ {s}  ❌ {f}", end="", flush=True)

    return ok


def main():
    if not os.path.isdir(STATIC_IMAGES_DIR):
        print(f"❌ 目录不存在: {STATIC_IMAGES_DIR}")
        sys.exit(1)

    # 收集所有文件
    files_to_upload = []
    for root, dirs, files in os.walk(STATIC_IMAGES_DIR):
        for filename in files:
            if filename.startswith("."):
                continue
            local_path = os.path.join(root, filename)
            relative_path = os.path.relpath(local_path, STATIC_IMAGES_DIR)
            files_to_upload.append((local_path, relative_path))

    total = len(files_to_upload)
    print(f"📦 共 {total} 个文件 → Supabase Storage ({MAX_WORKERS} 并发)")
    print(f"   {SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/")
    print()

    start_time = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(upload_file, lp, rp, total): rp
            for lp, rp in files_to_upload
        }
        failed_files = []
        for future in as_completed(futures):
            if not future.result():
                failed_files.append(futures[future])

    elapsed = time.time() - start_time
    print(f"\n\n🎉 完成！耗时 {elapsed:.0f}s ({elapsed/60:.1f} min)")
    print(f"   成功: {counter['success']}  失败: {counter['failed']}  共: {total}")

    if failed_files:
        print(f"\n⚠️  失败文件（前 10 个）:")
        for f in failed_files[:10]:
            print(f"   - {f}")
        print("   可重新运行此脚本（已启用 upsert 覆盖模式）")


if __name__ == "__main__":
    main()
