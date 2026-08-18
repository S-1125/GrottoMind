"""
LLM 统一适配器模块 — 问窟 GrottoMind
支持 DeepSeek 官方 API (DeepSeek-V3 / DeepSeek-R1) 及任何 OpenAI 兼容中转站
提供流式对话、思维链解析、结构化 JSON 生成与本地/云端 Embedding 接入
"""

import os
import sys
import json
import logging
from typing import AsyncGenerator, Optional, Dict, Any, List
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI

SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

logger = logging.getLogger("llm_adapter")
logging.basicConfig(level=logging.INFO)

# ==============================================================================
# 配置参数提取
# ==============================================================================
LLM_API_BASE = (
    os.environ.get("LLM_API_BASE")
    or os.environ.get("OPENAI_BASE_URL")
    or "https://api.deepseek.com"
).rstrip("/")

LLM_API_KEY = (
    os.environ.get("LLM_API_KEY")
    or os.environ.get("DEEPSEEK_API_KEY")
    or os.environ.get("OPENAI_API_KEY")
    or ""
)

LLM_MODEL = os.environ.get("LLM_MODEL") or "deepseek-v4-flash"
LLM_REASONING_MODEL = os.environ.get("LLM_REASONING_MODEL") or "deepseek-v4-pro"

# Embedding 向量模型配置
EMBEDDING_API_BASE = (
    os.environ.get("EMBEDDING_API_BASE")
    or LLM_API_BASE
).rstrip("/")

EMBEDDING_API_KEY = (
    os.environ.get("EMBEDDING_API_KEY")
    or LLM_API_KEY
)

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL") or "text-embedding-3-small"
EMBEDDING_MODE = os.environ.get("EMBEDDING_MODE") or "auto"  # auto | local_bge | api

# 全局客户端缓存
_async_client: Optional[AsyncOpenAI] = None
_sync_client: Optional[OpenAI] = None
_local_embed_model = None


def get_async_client() -> AsyncOpenAI:
    """获取或初始化全局异步 OpenAI 兼容客户端"""
    global _async_client
    if _async_client is None:
        _async_client = AsyncOpenAI(
            api_key=LLM_API_KEY or "dummy-key",
            base_url=LLM_API_BASE,
            timeout=120.0,
        )
    return _async_client


def get_sync_client() -> OpenAI:
    """获取或初始化全局同步 OpenAI 兼容客户端"""
    global _sync_client
    if _sync_client is None:
        _sync_client = OpenAI(
            api_key=LLM_API_KEY or "dummy-key",
            base_url=LLM_API_BASE,
            timeout=120.0,
        )
    return _sync_client


os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
LOCAL_MODEL_CACHE = os.path.join(SERVER_DIR, ".model_cache")
os.makedirs(LOCAL_MODEL_CACHE, exist_ok=True)


def get_local_embed_model():
    """获取或初始化本地轻量级 BGE-small-zh Embedding 模型"""
    global _local_embed_model
    if _local_embed_model is None:
        try:
            from fastembed import TextEmbedding
            logger.info(f"初始化本地 FastEmbed BAAI/bge-small-zh-v1.5 模型 (缓存路径: {LOCAL_MODEL_CACHE})...")
            _local_embed_model = TextEmbedding(
                model_name="BAAI/bge-small-zh-v1.5",
                cache_dir=LOCAL_MODEL_CACHE,
            )
        except Exception as e:
            logger.warning(f"无法初始化本地 fastembed 模型: {e}")
    return _local_embed_model


# ==============================================================================
# 流式对话生成（支持 DeepSeek-R1 reasoning_content 与正文解耦）
# ==============================================================================
async def stream_chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.6,
    max_tokens: int = 4096,
) -> AsyncGenerator[Dict[str, Any], None]:
    """异步流式对话生成器。
    
    Yields:
        dict: 事件字典，格式如下：
            - {"type": "thinking", "delta": "..."} : DeepSeek-R1 思考链片段
            - {"type": "text", "delta": "..."}     : 正式回答文本片段
            - {"type": "error", "error": "..."}    : 异常错误信息
    """
    target_model = model or LLM_MODEL
    client = get_async_client()

    if not LLM_API_KEY:
        yield {
            "type": "error",
            "error": "未配置 LLM_API_KEY 或 DEEPSEEK_API_KEY，请在 .env 中设置。"
        }
        return

    try:
        response = await client.chat.completions.create(
            model=target_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in response:
            if not chunk.choices:
                continue
            
            delta = chunk.choices[0].delta

            # 1. 捕获 DeepSeek-R1 的思考过程 (reasoning_content)
            reasoning_delta = getattr(delta, "reasoning_content", None)
            if reasoning_delta:
                yield {"type": "thinking", "delta": reasoning_delta}

            # 2. 捕获常规回答文本 (content)
            content_delta = getattr(delta, "content", None)
            if content_delta:
                yield {"type": "text", "delta": content_delta}

    except Exception as e:
        logger.error(f"流式调用大模型异常: {e}", exc_info=True)
        yield {"type": "error", "error": str(e)}


# ==============================================================================
# 结构化 JSON 文本生成（用于色彩记忆卡片、快速问答）
# ==============================================================================
async def generate_json(
    prompt: str,
    system_prompt: str = "你是一个专业的人工智能助理，必须返回严格合法的 JSON 对象。",
    model: Optional[str] = None,
    temperature: float = 0.3,
) -> Dict[str, Any]:
    """生成结构化 JSON 对象。
    
    具备 Markdown 代码块清洗与 JSON 容错解析能力。
    """
    target_model = model or LLM_MODEL
    client = get_async_client()

    if not LLM_API_KEY:
        raise ValueError("未配置 LLM_API_KEY")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    try:
        response = await client.chat.completions.create(
            model=target_model,
            messages=messages,
            temperature=temperature,
            stream=False,
        )
        raw_text = response.choices[0].message.content or "{}"
        
        # 清洗可能存在的 ```json ... ``` 标记
        clean_text = raw_text.strip()
        if clean_text.startswith("```"):
            lines = clean_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            clean_text = "\n".join(lines).strip()

        return json.loads(clean_text)

    except json.JSONDecodeError:
        logger.warning(f"JSON 解析失败，返回原始文本封装: {raw_text}")
        return {"raw_response": raw_text}
    except Exception as e:
        logger.error(f"生成 JSON 发生异常: {e}")
        raise e


# ==============================================================================
# 文本向量 Embedding 生成（双轨容灾：优先本地 BGE，回退/支持 API）
# ==============================================================================
def get_embeddings(texts: List[str]) -> List[List[float]]:
    """批量获取文本向量（同步接口，适配 LightRAG 与 ChromaDB）"""
    if not texts:
        return []

    # 1. 优先使用本地 FastEmbed (0成本、极速、无网络依赖)
    if EMBEDDING_MODE in ("auto", "local_bge"):
        local_model = get_local_embed_model()
        if local_model is not None:
            try:
                embeddings = list(local_model.embed(texts))
                return [list(map(float, emb)) for emb in embeddings]
            except Exception as e:
                logger.warning(f"本地 FastEmbed 提取向量失败，尝试切换 API 模式: {e}")

    # 2. 回退到外部 OpenAI 兼容 Embedding API
    # 过滤掉 DeepSeek 官方域名（DeepSeek 官方不提供 /embeddings 接口）
    if "api.deepseek.com" in EMBEDDING_API_BASE:
        logger.info("ℹ️ 当前大模型为 DeepSeek（官方不提供 Embedding 向量接口），使用本地模型或关键词混合检索。")
        return []

    try:
        client = OpenAI(
            api_key=EMBEDDING_API_KEY or "dummy-key",
            base_url=EMBEDDING_API_BASE,
            timeout=60.0,
        )
        response = client.embeddings.create(
            input=texts,
            model=EMBEDDING_MODEL,
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        logger.warning(f"调用 Embedding API 失败: {e}")
        return []
