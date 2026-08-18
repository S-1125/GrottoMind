"""
LLM 统一适配器模块 — 问窟 GrottoMind (NVIDIA NIM & DeepSeek 双模支持)
支持 NVIDIA NIM (MiniMax-M3 / DeepSeek-R1) 及 DeepSeek 官方 / OpenAI 兼容端点
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
# 配置参数提取 (自动探测 NVIDIA NIM / MiniMax / DeepSeek)
# ==============================================================================
raw_key = (
    os.environ.get("NVIDIA_API_KEY")
    or os.environ.get("LLM_API_KEY")
    or os.environ.get("DEEPSEEK_API_KEY")
    or os.environ.get("OPENAI_API_KEY")
    or ""
)

is_nvidia = raw_key.startswith("nvapi-")

default_base = "https://integrate.api.nvidia.com/v1" if is_nvidia else "https://api.deepseek.com"
default_model = "minimaxai/minimax-m3" if is_nvidia else "deepseek-chat"
default_reasoning = "minimaxai/minimax-m3" if is_nvidia else "deepseek-reasoner"

LLM_API_BASE = (
    os.environ.get("LLM_API_BASE")
    or os.environ.get("OPENAI_BASE_URL")
    or default_base
).rstrip("/")

LLM_API_KEY = raw_key

LLM_MODEL = os.environ.get("LLM_MODEL") or default_model
LLM_REASONING_MODEL = os.environ.get("LLM_REASONING_MODEL") or default_reasoning

logger.info(f"LLM 适配层已初始化: 基础端点={LLM_API_BASE}, 模型={LLM_MODEL}")

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


async def stream_chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    use_reasoning: bool = False,
    temperature: float = 0.6,
    max_tokens: int = 4096,
) -> AsyncGenerator[Dict[str, Any], None]:
    """统一异步流式对话补全"""
    client = get_async_client()
    target_model = model or (LLM_REASONING_MODEL if use_reasoning else LLM_MODEL)

    extra_kwargs = {}
    if not target_model.startswith("deepseek-reasoner"):
        extra_kwargs["temperature"] = temperature

    try:
        response = await client.chat.completions.create(
            model=target_model,
            messages=messages,
            stream=True,
            max_tokens=max_tokens,
            **extra_kwargs,
        )

        async for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta

            # 1. 尝试提取思考过程 (Reasoning Content)
            reasoning_delta = getattr(delta, "reasoning_content", None)
            if reasoning_delta:
                yield {"type": "thinking", "delta": reasoning_delta}

            # 2. 提取正式回答文本
            content_delta = getattr(delta, "content", None)
            if content_delta:
                yield {"type": "text", "delta": content_delta}

    except Exception as e:
        logger.error(f"调用 LLM 接口失败: {e}", exc_info=True)
        yield {"type": "error", "error": f"大模型服务暂时不可用: {str(e)}"}


async def generate_json(
    prompt: str,
    system_prompt: str = "你是一个专业结构化数据提取助理，必须仅输出合法的 JSON 对象，不包含任何 Markdown 代码块标签。",
    model: Optional[str] = None,
    temperature: float = 0.1,
) -> Optional[Dict[str, Any]]:
    """生成结构化 JSON 输出"""
    client = get_async_client()
    target_model = model or LLM_MODEL

    try:
        response = await client.chat.completions.create(
            model=target_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"} if not target_model.startswith("deepseek-reasoner") else None,
            temperature=temperature,
            max_tokens=2048,
        )

        content = response.choices[0].message.content or ""
        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        return json.loads(cleaned.strip())
    except Exception as e:
        logger.error(f"JSON 结构化生成失败: {e}", exc_info=True)
        return None
