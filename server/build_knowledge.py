"""
build_knowledge.py
从「色彩复原路径研究」文件夹中的 PDF/DOCX 提取干净文本和图片，
清空旧 knowledge/ 目录后重建知识库，然后重新建立 ChromaDB 向量索引。
"""

import os
import sys
import json
import re
import shutil
import uuid
import fitz          # PyMuPDF
import docx          # python-docx

# ── 路径配置 ──────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR  = os.path.join(SCRIPT_DIR, "..", "色彩复原路径研究")
KNOWLEDGE   = os.path.join(SCRIPT_DIR, "knowledge")
IMAGES_DIR  = os.path.join(SCRIPT_DIR, "static", "images")
CHROMA_DIR  = os.path.join(SCRIPT_DIR, "chroma_db")
META_PATH   = os.path.join(KNOWLEDGE, "metadata.json")

# ── 清空旧数据 ────────────────────────────────────────────────────────
print("🗑  清空旧知识库数据...")
if os.path.exists(KNOWLEDGE):
    shutil.rmtree(KNOWLEDGE)
os.makedirs(KNOWLEDGE, exist_ok=True)

if os.path.exists(IMAGES_DIR):
    shutil.rmtree(IMAGES_DIR)
os.makedirs(IMAGES_DIR, exist_ok=True)

if os.path.exists(CHROMA_DIR):
    shutil.rmtree(CHROMA_DIR)
    print("   ChromaDB 旧索引已清除")

# ── 辅助函数 ──────────────────────────────────────────────────────────
def slugify(name: str) -> str:
    """将文件名中的特殊字符替换为下划线，用作图片目录名"""
    keep = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")
    return "".join(c if c in keep else "_" for c in name)

def extract_pdf(pdf_path: str, stem: str) -> str:
    """
    提取 PDF 文本 + 图片。
    图片存到 static/images/{stem}/ 目录，并在文本中插入相对路径引用。
    返回清洗后的文本内容。
    """
    img_out_dir = os.path.join(IMAGES_DIR, slugify(stem))
    os.makedirs(img_out_dir, exist_ok=True)

    pages_text = []
    img_count = 0

    with fitz.open(pdf_path) as doc:
        total_pages = len(doc)
        for page_num in range(total_pages):
            page = doc[page_num]

            # —— 提取文字 ——
            blocks = page.get_text("blocks")
            cleaned_blocks = []
            for b in blocks:
                # b[6] 是 block_type，0 表示文本
                if b[6] == 0:
                    text_block = b[4].strip()
                    # 去除中文排版中多余的段内换行（如果换行前后不是标点符号则直接拼接）
                    # 简单处理：将换行符替换为空格（对英文），或直接删除（对中文）
                    # 为兼容中英文，将换行符替换为无，但如果前后都是英文，则可能少个空格。
                    # 这里采用更稳妥的做法：先全部保留块级换行，但段落内部去除多余换行
                    # 去除多余的单换行，保留双换行（如果有的话）
                    # 对于中文，换行符可以直接去掉
                    text_block = re.sub(r'([^\x00-\xff])\n([^\x00-\xff])', r'\1\2', text_block) # 中文间换行直接删
                    text_block = re.sub(r'\n', ' ', text_block) # 剩下的换行换成空格
                    if text_block:
                        cleaned_blocks.append(text_block)
            
            text = "\n\n".join(cleaned_blocks)

            # —— 提取图片 ——
            img_refs = []
            for img_idx, img_info in enumerate(page.get_images(full=True)):
                xref = img_info[0]
                try:
                    base_img = doc.extract_image(xref)
                    img_bytes = base_img["image"]
                    ext = base_img["ext"]
                    img_filename = f"p{page_num+1:04d}_i{img_idx+1:02d}.{ext}"
                    img_path = os.path.join(img_out_dir, img_filename)
                    with open(img_path, "wb") as f:
                        f.write(img_bytes)
                    rel_url = f"/static/images/{slugify(stem)}/{img_filename}"
                    img_refs.append(f"\n![图 第{page_num+1}页-{img_idx+1}]({rel_url})\n")
                    img_count += 1
                except Exception:
                    pass

            page_content = text
            if img_refs:
                page_content += "\n" + "".join(img_refs)

            if page_content.strip():
                pages_text.append(page_content)

    print(f"   ✅ {stem}: {total_pages}页, {img_count}张图片")
    return "\n\n".join(pages_text)

def extract_docx(docx_path: str, stem: str) -> str:
    """提取 DOCX 文本（不处理嵌入图片）"""
    doc = docx.Document(docx_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    print(f"   ✅ {stem}: {len(paragraphs)}段落")
    return "\n\n".join(paragraphs)

# ── 遍历源文件夹提取内容 ──────────────────────────────────────────────
print(f"\n📂 扫描源目录：{SOURCE_DIR}")
metadata = []
supported = {".pdf", ".docx"}

for filename in sorted(os.listdir(SOURCE_DIR)):
    if filename.startswith("."):
        continue
    ext = os.path.splitext(filename)[1].lower()
    if ext not in supported:
        continue

    stem = os.path.splitext(filename)[0]
    src_path = os.path.join(SOURCE_DIR, filename)

    print(f"\n📄 处理：{filename}")
    try:
        if ext == ".pdf":
            content = extract_pdf(src_path, stem)
            file_type = "PDF"
        else:
            content = extract_docx(src_path, stem)
            file_type = "DOCX"

        if not content.strip():
            print(f"   ⚠️  {filename} 提取内容为空，跳过")
            continue

        # 保存文本文件
        txt_filename = stem + ".txt"
        txt_path = os.path.join(KNOWLEDGE, txt_filename)
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(content)

        metadata.append({
            "id": str(uuid.uuid4()),
            "title": stem,
            "filename": txt_filename,
            "type": file_type,
            "source": filename,
        })

    except Exception as e:
        print(f"   ❌ {filename} 处理失败：{e}")

# 保存 metadata.json
with open(META_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

print(f"\n✅ 共处理 {len(metadata)} 个文件，已保存至 knowledge/")
print(f"   图片存储路径：{IMAGES_DIR}")

# ── 重建 ChromaDB 向量索引 ────────────────────────────────────────────
print("\n🔄 开始重建 ChromaDB 向量索引...")
try:
    # 将 server 目录加入 path，复用 rag.py 的 sync 逻辑
    sys.path.insert(0, SCRIPT_DIR)
    from rag import build_index
    build_index()
    print("✅ ChromaDB 索引重建完成！")
except Exception as e:
    print(f"⚠️  ChromaDB 重建时出错（可重启服务器后自动完成）：{e}")

print("\n🎉 知识库重建完成！请重启后端服务器。")
