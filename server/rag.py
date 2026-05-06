"""
RAG 模块 — 基于 ChromaDB 的向量检索
使用 Gemini Embedding API（云端调用）代替本地 sentence-transformers，
大幅降低内存占用，适配低配容器部署环境。

模型：gemini-embedding-001
- 支持批量输入（每次最多 2048 tokens/条，可传入多条文本）
- 支持 task_type 优化检索质量
- 索引文档用 RETRIEVAL_DOCUMENT，搜索查询用 RETRIEVAL_QUERY
"""

import os
import json
import time
import chromadb
from google import genai
from google.genai import types
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KNOWLEDGE_DIR = os.path.join(SCRIPT_DIR, "knowledge")
CHROMA_DB_DIR = os.path.join(SCRIPT_DIR, "chroma_db")
COLLECTION_NAME = "qixia_literature"

# Gemini Embedding 模型标识
EMBEDDING_MODEL_NAME = "gemini-embedding-001"
MODEL_VERSION_FILE = os.path.join(CHROMA_DB_DIR, ".model_version")

# 初始化 Gemini 客户端
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# 初始化 ChromaDB 客户端
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)


def _get_embeddings(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """调用 Gemini Embedding API 获取文本向量。

    Args:
        texts: 待嵌入的文本列表
        task_type: 任务类型，索引文档用 RETRIEVAL_DOCUMENT，搜索查询用 RETRIEVAL_QUERY
    
    gemini-embedding-001 支持批量输入，每次可传入多条文本，返回各自独立的嵌入向量。
    """
    all_embeddings = []
    batch_size = 50

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        # 带智能重试的 API 调用（最多重试 5 次，遇到速率限制自动等待）
        for attempt in range(5):
            try:
                result = gemini_client.models.embed_content(
                    model=EMBEDDING_MODEL_NAME,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type,
                        output_dimensionality=768
                    )
                )
                batch_embeddings = [e.values for e in result.embeddings]
                all_embeddings.extend(batch_embeddings)
                break
            except Exception as e:
                error_str = str(e)
                # 解析 API 建议的等待时间（如 "Please retry in 35.267807746s"）
                import re
                retry_match = re.search(r'retry in (\d+(?:\.\d+)?)s', error_str)
                if '429' in error_str and retry_match:
                    wait_time = int(float(retry_match.group(1))) + 2  # 多等 2 秒留余量
                    print(f"   ⏳ 触发速率限制（第{attempt+1}次），等待 {wait_time} 秒后继续...")
                    time.sleep(wait_time)
                elif attempt < 4:
                    wait_time = min(2 ** attempt, 30)
                    print(f"   ⚠️ Embedding API 调用失败（第{attempt+1}次），{wait_time}秒后重试... 错误: {e}")
                    time.sleep(wait_time)
                else:
                    print(f"   ❌ Embedding API 调用彻底失败: {e}")
                    raise

        # 批次之间等待 2 秒，避免触发速率限制
        if i + batch_size < len(texts):
            time.sleep(2)

    return all_embeddings


# 检查 Embedding 模型是否变更，如果变更则清除旧索引
def _check_model_version():
    """检测 Embedding 模型版本，如果与上次不同则清除旧向量索引"""
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)
    if os.path.exists(MODEL_VERSION_FILE):
        with open(MODEL_VERSION_FILE, "r") as f:
            saved_model = f.read().strip()
        if saved_model == EMBEDDING_MODEL_NAME:
            return  # 模型未变更，跳过
        print(f"⚠️  Embedding 模型已从 '{saved_model}' 变更为 '{EMBEDDING_MODEL_NAME}'")
        print("   正在清除旧向量索引...")
        try:
            chroma_client.delete_collection(COLLECTION_NAME)
            print("   旧索引已清除，将在启动时自动重建。")
        except Exception:
            pass
    # 写入当前模型版本
    with open(MODEL_VERSION_FILE, "w") as f:
        f.write(EMBEDDING_MODEL_NAME)

_check_model_version()

# 获取或创建 collection
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)

print(f"✅ Embedding 模型：{EMBEDDING_MODEL_NAME}（云端 API，零本地内存占用）")

# 文本分割器
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    is_separator_regex=False,
)


def build_index():
    """读取知识库文本，分块后插入 ChromaDB 向量数据库。"""
    meta_path = os.path.join(KNOWLEDGE_DIR, "metadata.json")
    if not os.path.exists(meta_path):
        print("metadata.json not found. Run notebooklm_sync.py first.")
        return

    with open(meta_path, "r", encoding="utf-8") as f:
        metadata_list = json.load(f)

    docs = []
    metadatas = []
    ids = []

    print(f"📦 正在索引 {len(metadata_list)} 篇文献...")

    for meta in metadata_list:
        file_path = os.path.join(KNOWLEDGE_DIR, meta["filename"])
        if not os.path.exists(file_path):
            continue

        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            continue

        # 将文本分块
        chunks = text_splitter.split_text(text)

        for i, chunk in enumerate(chunks):
            chunk_id = f"{meta['id']}_chunk_{i}"
            docs.append(chunk)
            metadatas.append({
                "source_id": meta["id"],
                "title": meta["title"],
                "chunk_index": i
            })
            ids.append(chunk_id)

    if not docs:
        print("未找到需要索引的文档。")
        return

    print(f"   总分块数: {len(docs)}")
    print("   正在调用 Gemini Embedding API 计算向量并写入 ChromaDB...")

    # 分批计算嵌入并插入（使用 RETRIEVAL_DOCUMENT 任务类型优化文档索引）
    batch_size = 50
    for i in range(0, len(docs), batch_size):
        batch_docs = docs[i:i+batch_size]
        batch_ids = ids[i:i+batch_size]
        batch_metadatas = metadatas[i:i+batch_size]

        # 调用 Gemini API，指定 RETRIEVAL_DOCUMENT 任务类型
        embeddings = _get_embeddings(batch_docs, task_type="RETRIEVAL_DOCUMENT")

        collection.add(
            ids=batch_ids,
            embeddings=embeddings,
            metadatas=batch_metadatas,
            documents=batch_docs
        )
        print(f"   已插入批次 {i//batch_size + 1}/{(len(docs)-1)//batch_size + 1}")

    print("✅ 索引构建完成。")


def search(query: str, top_k: int = 5, max_distance: float = 1.2):
    """搜索向量数据库，返回最相关的文本片段。

    Args:
        query: 用户查询文本
        top_k: 返回的最大结果数
        max_distance: 余弦距离阈值，超过此值的结果视为不相关并过滤掉
                      (cosine distance: 0 = 完全相同, 2 = 完全相反)
    """
    # 调用 Gemini API，指定 RETRIEVAL_QUERY 任务类型（专为搜索查询优化）
    query_embedding = _get_embeddings([query], task_type="RETRIEVAL_QUERY")

    # 查询 ChromaDB（同时返回距离分数用于过滤）
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )

    # 格式化并过滤结果
    if not results["documents"] or not results["documents"][0]:
        return []

    formatted_results = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        # 过滤掉相关度过低的结果
        if dist > max_distance:
            continue
        formatted_results.append({
            "text": doc,
            "title": meta["title"],
            "source_id": meta["source_id"],
            "distance": round(dist, 4)
        })

    return formatted_results


if __name__ == "__main__":
    # 作为独立脚本运行时，重建索引
    build_index()
