"""
学术文献 RAG 检索增强引擎 — 问窟 GrottoMind
基于 ChromaDB + BGE-small-zh 向量模型
支持精确行号与字符偏移记录，实现文献段落像素级锚点定位
"""

import os
import sys
import json
import re
import logging
import chromadb
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 确保项目根目录与 server 目录均在 sys.path 中
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
for p in [PROJECT_ROOT, SERVER_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

try:
    from server.llm_adapter import get_embeddings
except ImportError:
    from llm_adapter import get_embeddings

logger = logging.getLogger("rag_engine")
logging.basicConfig(level=logging.INFO)

KNOWLEDGE_DIR = os.path.join(SERVER_DIR, "knowledge")
CHROMA_DIR = os.path.join(SERVER_DIR, "chroma_db")
COLLECTION_NAME = "qixia_literature_v2"

# 初始化本地持久化 Chroma 客户端
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

# 获取或创建 collection
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)

# 文本切分器：根据段落、换行与标点智能切分
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=450,
    chunk_overlap=50,
    length_function=len,
    is_separator_regex=False,
)


def find_chunk_line(full_text: str, chunk_text: str) -> int:
    """计算切片文本在全文中的绝对起始行号 (1-based)"""
    idx = -1
    # 尝试不同长度的前缀匹配
    for prefix_len in [60, 40, 25, 15]:
        if len(chunk_text) >= prefix_len:
            sub = chunk_text[:prefix_len]
            idx = full_text.find(sub)
            if idx != -1:
                break

    if idx == -1:
        return 1
    return full_text[:idx].count("\n") + 1


def build_index():
    """读取知识库文本，切分并精准计算行号与元数据，写入 ChromaDB"""
    meta_path = os.path.join(KNOWLEDGE_DIR, "metadata.json")
    if not os.path.exists(meta_path):
        logger.warning("未找到 metadata.json")
        return

    with open(meta_path, "r", encoding="utf-8") as f:
        metadata_list = json.load(f)

    docs: List[str] = []
    metadatas: List[Dict[str, Any]] = []
    ids: List[str] = []

    logger.info(f"正在索引 {len(metadata_list)} 篇学术文献并提取精准行号...")

    for meta in metadata_list:
        file_path = os.path.join(KNOWLEDGE_DIR, meta["filename"])
        if not os.path.exists(file_path):
            continue

        with open(file_path, "r", encoding="utf-8") as f:
            full_text = f.read()

        # 读取可能存在的预缓存摘要
        summary_path = os.path.join(KNOWLEDGE_DIR, meta["filename"].replace(".txt", "_summary.json"))
        summary_text = ""
        keywords_text = ""
        if os.path.exists(summary_path):
            try:
                with open(summary_path, "r", encoding="utf-8") as sf:
                    s_data = json.load(sf)
                    summary_text = s_data.get("summary", "")
                    keywords_text = "、".join(s_data.get("keywords", []))
            except Exception:
                pass

        # 过滤掉纯图片语法后的可读文本
        pure_readable_text = re.sub(r'!\[.*?\]\(.*?\)', '', full_text).strip()

        # 1. 如果有充足的学术正文文本，执行语义分块
        if len(pure_readable_text) > 100:
            chunks = text_splitter.split_text(full_text)
            for i, chunk in enumerate(chunks):
                chunk_id = f"{meta['id']}_chunk_{i}"
                start_line = find_chunk_line(full_text, chunk)

                docs.append(chunk)
                metadatas.append({
                    "source_id": meta["id"],
                    "title": meta["title"],
                    "filename": meta["filename"],
                    "chunk_index": i,
                    "start_line": start_line,
                })
                ids.append(chunk_id)

        # 2. 针对扫描件、影印卷宗或补充文献，建立结构化高维学术导读与图录检索块
        if summary_text:
            dense_knowledge_chunk = f"【文献考据专卷】《{meta['title']}》\n" \
                                    f"核心学术内容：{summary_text}\n" \
                                    f"考据关键词：{keywords_text}\n" \
                                    f"归档形态：{'原始影印扫描档案' if len(pure_readable_text) <= 100 else '学术全文数字化卷宗'}"
            
            chunk_id = f"{meta['id']}_summary_dense"
            docs.append(dense_knowledge_chunk)
            metadatas.append({
                "source_id": meta["id"],
                "title": meta["title"],
                "filename": meta["filename"],
                "chunk_index": 0,
                "start_line": 1,
            })
            ids.append(chunk_id)

    if not docs:
        logger.info("未找到需要索引的文档内容。")
        return

    logger.info(f"总分块数: {len(docs)}，正在提取向量并插入 ChromaDB...")

    # 清理旧数据以保证新元数据完整
    try:
        chroma_client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    new_collection = chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    batch_size = 64
    for i in range(0, len(docs), batch_size):
        batch_docs = docs[i:i + batch_size]
        batch_ids = ids[i:i + batch_size]
        batch_metas = metadatas[i:i + batch_size]

        embeddings = get_embeddings(batch_docs)
        new_collection.add(
            ids=batch_ids,
            embeddings=embeddings,
            metadatas=batch_metas,
            documents=batch_docs
        )
        logger.info(f"已处理分块: {min(i + batch_size, len(docs))}/{len(docs)}")

    logger.info(f"✅ ChromaDB 索引重构完毕，当前总条数: {new_collection.count()}")


def search(query: str, top_k: int = 4, max_distance: float = 0.85) -> List[Dict[str, Any]]:
    """根据查询词搜索最相关的学术文献片段，返回标题、精准行号与文本"""
    if not query.strip():
        return []

    try:
        active_col = chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
        query_embedding = get_embeddings([query])[0]
        results = active_col.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        logger.error(f"ChromaDB 查询异常: {e}")
        return []

    if not results or not results["documents"] or not results["documents"][0]:
        return []

    matched = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        if dist <= max_distance:
            matched.append({
                "title": meta.get("title", "未知文献"),
                "filename": meta.get("filename", ""),
                "start_line": meta.get("start_line", 1),
                "text": doc,
                "distance": dist
            })

    return matched


if __name__ == "__main__":
    build_index()
