"""
LightRAG 知识图谱检索增强引擎 — 问窟 GrottoMind
基于香港大学 HKUDS/LightRAG 框架
结合本地 BGE 向量模型与 DeepSeek-V4-Flash 实现实体-关系图谱抽取与多模式 (Local/Global/Hybrid) 检索
"""

import os
import sys
import json
import asyncio
import logging
from typing import Optional, List, Dict, Any

# 确保项目根目录与 server 目录均在 sys.path 中
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
for p in [PROJECT_ROOT, SERVER_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from lightrag import LightRAG, QueryParam
from lightrag.utils import EmbeddingFunc
try:
    from server.llm_adapter import (
        get_async_client,
        get_embeddings,
        LLM_MODEL,
        LLM_API_BASE,
        LLM_API_KEY,
    )
except ImportError:
    from llm_adapter import (
        get_async_client,
        get_embeddings,
        LLM_MODEL,
        LLM_API_BASE,
        LLM_API_KEY,
    )

logger = logging.getLogger("lightrag_engine")
logging.basicConfig(level=logging.INFO)

WORKING_DIR = os.path.join(SERVER_DIR, "lightrag_storage")
KNOWLEDGE_DIR = os.path.join(SERVER_DIR, "knowledge")
os.makedirs(WORKING_DIR, exist_ok=True)


# ==============================================================================
# LightRAG LLM & Embedding 回调函数适配
# ==============================================================================
async def deepseek_complete_func(
    prompt: str,
    system_prompt: Optional[str] = None,
    history_messages: Optional[List[Dict[str, str]]] = None,
    **kwargs,
) -> str:
    """LightRAG 专用的异步 LLM 抽取与总结回调函数（使用 deepseek-v4-flash）"""
    client = get_async_client()
    messages: List[Dict[str, str]] = []
    
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    if history_messages:
        messages.extend(history_messages)
        
    messages.append({"role": "user", "content": prompt})

    try:
        response = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=kwargs.get("temperature", 0.3),
            max_tokens=kwargs.get("max_tokens", 2048),
            stream=False,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"LightRAG LLM 调用异常: {e}")
        raise e


async def bge_embedding_func(texts: List[str]) -> List[List[float]]:
    """LightRAG 专用的异步 Embedding 向量回调函数（使用本地 BGE-small-zh 512维）"""
    # 在异步线程池中运行本地 embedding
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, get_embeddings, texts)


# ==============================================================================
# LightRAG 引擎单例管理
# ==============================================================================
_rag_instance: Optional[LightRAG] = None


def get_lightrag_instance() -> LightRAG:
    """初始化或获取全局 LightRAG 单例"""
    global _rag_instance
    if _rag_instance is None:
        logger.info(f"初始化 LightRAG 引擎 (工作目录: {WORKING_DIR})...")
        _rag_instance = LightRAG(
            working_dir=WORKING_DIR,
            llm_model_func=deepseek_complete_func,
            llm_model_name=LLM_MODEL,
            embedding_func=EmbeddingFunc(
                embedding_dim=512,  # BGE-small-zh 维度
                max_token_size=512,
                func=bge_embedding_func,
            ),
            cosine_better_than_threshold=0.2,
        )
    return _rag_instance


# ==============================================================================
# 图谱索引构建与查询对外接口
# ==============================================================================
async def build_lightrag_index():
    """读取 server/knowledge 目录下的学术文献，抽取实体关系并构建知识图谱"""
    rag = get_lightrag_instance()
    meta_path = os.path.join(KNOWLEDGE_DIR, "metadata.json")
    if not os.path.exists(meta_path):
        logger.warning("未找到 metadata.json")
        return

    with open(meta_path, "r", encoding="utf-8") as f:
        metadata_list = json.load(f)

    logger.info(f"正在向 LightRAG 插入 {len(metadata_list)} 篇学术文献...")

    for i, meta in enumerate(metadata_list):
        file_path = os.path.join(KNOWLEDGE_DIR, meta["filename"])
        if not os.path.exists(file_path):
            continue

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        if not content.strip():
            continue

        doc_header = f"【文献标题】{meta['title']}\n【文献来源】{meta.get('author', '学术档案')}\n\n"
        full_text = doc_header + content

        logger.info(f"[{i+1}/{len(metadata_list)}] 正在处理并抽取实体图谱: {meta['title']}...")
        try:
            await rag.ainsert(full_text)
        except Exception as e:
            logger.error(f"处理文献 '{meta['title']}' 失败: {e}")

    logger.info("✅ LightRAG 知识图谱索引构建全部完成！")


async def query_knowledge_graph(query_text: str, mode: str = "hybrid") -> str:
    """查询知识图谱。
    
    Args:
        query_text: 用户问题
        mode: 检索模式 - 'naive' (纯向量), 'local' (局部实体), 'global' (全局概念), 'hybrid' (混合模式)
    """
    rag = get_lightrag_instance()
    try:
        param = QueryParam(mode=mode)
        result = await rag.aquery(query_text, param=param)
        return str(result)
    except Exception as e:
        logger.error(f"查询 LightRAG 异常: {e}")
        return ""


if __name__ == "__main__":
    # 独立运行脚本时执行图谱索引
    asyncio.run(build_lightrag_index())
