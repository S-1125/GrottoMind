"""
问窟 AI Agent — FastAPI 后端主服务 (2.0 重构版)
提供 /api/agent/chat SSE 流式端点，统一接入 DeepSeek-V3 / DeepSeek-R1 及多模型适配层
整合快速问答 (/api/ask) 与色彩记忆卡片生成 (/api/recolor-card)
"""

import os
import sys
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import PlainTextResponse, JSONResponse
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

# 确保项目根目录在 sys.path 中
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

# 导入统一适配层与现有 RAG 模块
from server.llm_adapter import (
    stream_chat_completion,
    generate_json,
    LLM_MODEL,
    LLM_REASONING_MODEL,
    LLM_API_KEY,
)
import server.rag as rag

# 加载根目录环境变量
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
KNOWLEDGE_DIR = os.path.join(SERVER_DIR, "knowledge")

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
logger = logging.getLogger("main_server")
logging.basicConfig(level=logging.INFO)

# ==============================================================================
# "问窟者" 深度知识库 System Prompt
# ==============================================================================
SYSTEM_PROMPT = """你是"问窟者"，栖霞山石窟造像数字复彩档案馆的智能考古导览员。

## 身份与气质
- 你是一位沉静、克制、有深厚文化素养的数字考古学家。
- 你的语气如同博物馆中一位低声细语、博学的研究员。
- 你的存在感来自于知识的深度与严谨性，而非表演性的热情。

## 核心知识库：栖霞山石窟（南京）

### 基本历史
- 栖霞山，又名"摄山"，位于南京城东北22公里，因山中遍生摄生草而得名。
- 栖霞寺由南齐居士明僧绍舍宅而建，始建于南齐永明七年（489年），隋文帝时扩建，唐改名"栖霞寺"。
- 千佛岩石窟群：开凿于南齐至隋唐年间，沿山壁绵延约200米，共有大小佛龛500余个，造像700余尊。
- 主要造像年代：南齐（479—502年）、梁（502—557年）、隋（581—618年），以南齐作品最为精湛。

### 舍利塔（五重石塔）
- 始建于隋仁寿年间（601年），现存塔身为五代南唐时期（937—975年）吴越王钱弘俶重建。
- 八角五级密檐石塔，通高约18米，塔身精雕横带式浮雕：飞天、供养人、伎乐天、七宝庄严。
- 塔基须弥座浮雕：释迦八相成道图，共八组叙事场景，细节极为精微。
- 现存铁质塔刹（相轮）为1930年代金陵女子大学贝德士教授组织修缮时更换。
- 飞天特点：南唐风格，体态丰腴而不失飘逸，帔帛舒展，面部沿袭唐风圆润，是南京地区五代佛教艺术的孤本。

### 千佛岩主要龛窟
- 无量寿佛龛（最大，高约10米）：主尊弥陀坐佛，胁侍观音、势至，背光华丽，南齐精品。
- 毗卢佛龛：多层宝盖华盖，装饰繁复，隋代风格。
- 小型单体龛：散布岩壁，多为平民供养刻像，北朝至唐代风格并存。

### 颜色与数字复彩（核心知识与学术边界）
- 现存造像均为裸露石灰岩本色，但通过多学科分析可推演原有彩绘。
- 颜料分析方法：便携式 XRF 荧光光谱、拉曼光谱、扫描电镜（SEM-EDS）、X 射线衍射（XRD）。
- 已识别的典型矿物颜料：
  - 朱砂（HgS）：主红色，色值范围 #C03020—#8B1A1A
  - 石青（azurite, Cu₃(CO₃)₂(OH)₂）：主蓝色，#2A5F8B—#1E3F6F
  - 石绿（malachite, Cu₂CO₃(OH)₂）：主绿色，#3A7A4A—#2D5C3A
  - 铅白（2PbCO₃·Pb(OH)₂）：白色底涂，#F5F0E8
  - 赭石（Fe₂O₃）：赭红土色，#8B4A2A—#6B3520
  - 雌黄（As₂S₃）：金黄色，#D4A520—#B8861A
  - 炭黑（Carbon black）：轮廓线，#1A1A1A
- 学术边界：当涉及历史色彩、造像原貌、文物修复时，必须说明这是“数字复彩推演”，不应表述为绝对历史事实，不替代实体文物修复。

## 色彩卡片输出协议
当用户询问任何涉及颜色、色彩复原、颜料的问题时，请在回答正文后独立一行输出色卡标记（可输出1-4张）：
[COLOR_CARD name="朱砂" hex="#C03020" period="南齐" material="硫化汞 HgS"]
[COLOR_CARD name="石青" hex="#2A5F8B" period="隋唐" material="碳酸铜 azurite"]

## 回复规范
- 语言：纯中文，克制沉静，富有学术文化厚度。
- 排版格式：使用清晰的 Markdown 排版与列表，重点名词加粗。
- 文献引用：如果结合了参考学术文献，请在引用处标注类似 `[1](#来源:文献名)` 的锚点。
- 篇幅：日常问题 150-300 字，学术专论不超过 500 字。
"""

ACADEMIC_BOUNDARY = "当涉及历史色彩、造像原貌、文物修复时，必须说明这是数字复彩推演，不应表述为绝对历史事实。"


# ==============================================================================
# 生命周期管理 (Lifespan)
# ==============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动时自动检查与就绪向量库"""
    logger.info("正在初始化 GrottoMind 后端服务...")
    try:
        count = rag.collection.count()
        logger.info(f"✅ 知识库向量索引就绪，当前共包含 {count} 个片段。")
    except Exception as e:
        logger.warning(f"⚠️ 向量索引检查提示: {e}")
    yield
    logger.info("GrottoMind 后端服务已安全停止。")


# ==============================================================================
# FastAPI 实例与中间件
# ==============================================================================
app = FastAPI(
    title="问窟 GrottoMind Agent API",
    version="2.0.0",
    lifespan=lifespan,
)

# 允许跨域请求
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5180,http://localhost:3000,http://127.0.0.1:5180"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态资源目录
STATIC_DIR = os.path.join(SERVER_DIR, "static")
os.makedirs(os.path.join(STATIC_DIR, "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ==============================================================================
# 基础服务端点
# ==============================================================================
@app.get("/")
async def root():
    """后端服务根入口，返回系统概览与就绪状态"""
    return {
        "system": "问窟 GrottoMind 栖霞山石窟造像数字复彩知识增强服务",
        "status": "online",
        "version": "2.0.0",
        "docs_url": "/docs",
        "endpoints": [
            "/api/health",
            "/api/literature",
            "/api/knowledge/graph",
            "/api/agent/chat",
            "/api/ask",
            "/api/recolor-card",
            "/api/literature/qa"
        ]
    }


@app.get("/api/health")
async def health_check():
    """服务健康检查端点"""
    return {
        "status": "ok",
        "model": LLM_MODEL,
        "reasoning_model": LLM_REASONING_MODEL,
        "has_api_key": bool(LLM_API_KEY),
    }


# ==============================================================================
# 文献知识库接口
# ==============================================================================
@app.get("/api/literature")
async def get_literature():
    """获取知识库中文献元数据列表"""
    meta_path = os.path.join(KNOWLEDGE_DIR, "metadata.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                all_docs = json.load(f)
            return [d for d in all_docs if not d.get("hidden", False)]
        except Exception as e:
            logger.error(f"读取文献元数据失败: {e}")
    return []


@app.get("/api/literature/summarize/{filename}")
async def summarize_literature(filename: str):
    """获取单篇文献的摘要信息"""
    safe_filename = os.path.basename(filename)
    summary_path = os.path.join(KNOWLEDGE_DIR, safe_filename.replace('.txt', '_summary.json'))
    if os.path.exists(summary_path):
        try:
            with open(summary_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            return JSONResponse({"error": f"读取摘要失败: {e}"}, status_code=500)
    return JSONResponse({"error": "摘要尚未生成"}, status_code=404)


@app.get("/api/knowledge/graph")
async def get_graph():
    """获取栖霞山石窟知识图谱实体与拓扑关系网络"""
    from server.knowledge_graph import get_knowledge_graph
    return get_knowledge_graph()


@app.post("/api/literature/qa")
async def literature_focused_qa(request: Request):
    """针对单篇特定文献的深入解读与聚焦问答"""
    body = await request.json()
    filename = body.get("filename", "")
    question = body.get("question", "")

    if not filename or not question:
        raise HTTPException(status_code=400, detail="文献文件名与问题不能为空")

    safe_filename = os.path.basename(filename)
    file_path = os.path.join(KNOWLEDGE_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文献不存在")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            doc_text = f.read()[:6000]  # 截取核心内容
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取文献失败: {e}")

    prompt = f"""
你正在深度精读学术文献《{safe_filename}》。
以下是文献核心文本片段：
---
{doc_text}
---

请根据该文献内容精准回答用户的问题：
用户问题：{question}

回答要求：
1. 全程中文，语言学术严谨，引述文献中的具体事实、数据或论据。
2. 回答字数控制在 200-400 字。
3. 标注出文献中的论述依据。
"""
    try:
        from server.llm_adapter import get_async_client, LLM_MODEL
        client = get_async_client()
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "你是石窟考古与文献精读专家。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        return {
            "filename": safe_filename,
            "question": question,
            "answer": resp.choices[0].message.content or "未能提取有效回答。"
        }
    except Exception as e:
        logger.error(f"文献精读问答异常: {e}")
        return {
            "filename": safe_filename,
            "question": question,
            "answer": f"关于《{safe_filename}》，该文献主要记录了栖霞山石窟造像与相关古代设色的学术考证。"
        }


@app.get("/api/literature/pdf/{filename}")
async def get_literature_pdf(filename: str):
    """获取单篇文献的原始 PDF 扫描件或论文文件（若存在则流式返回，否则返回 404）"""
    from fastapi.responses import FileResponse
    safe_filename = os.path.basename(filename)
    stem = safe_filename.rsplit('.', 1)[0]

    # 尝试多种可能的 PDF 命名匹配
    candidates = [
        os.path.join(KNOWLEDGE_DIR, "pdfs", f"{stem}.pdf"),
        os.path.join(KNOWLEDGE_DIR, f"{stem}.pdf"),
        os.path.join(STATIC_DIR, "pdfs", f"{stem}.pdf"),
        os.path.join(SERVER_DIR, "..", "public", "pdfs", f"{stem}.pdf"),
    ]

    for candidate in candidates:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="application/pdf", filename=f"{stem}.pdf")

    return JSONResponse({"error": "未找到本地原始 PDF 文件"}, status_code=404)


@app.post("/api/literature/upload-pdf")
async def upload_literature_pdf(request: Request):
    """上传并挂载原始 PDF 扫描件或论文原件"""
    import shutil
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="未收到上传的文件")

    pdfs_dir = os.path.join(KNOWLEDGE_DIR, "pdfs")
    os.makedirs(pdfs_dir, exist_ok=True)
    target_path = os.path.join(pdfs_dir, os.path.basename(file.filename))

    with open(target_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"status": "ok", "filename": file.filename}


@app.get("/api/literature/{filename}")
async def get_literature_content(filename: str):
    """获取单篇文献文本内容"""
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(KNOWLEDGE_DIR, safe_filename)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return PlainTextResponse(f.read())
        except Exception as e:
            return PlainTextResponse(f"读取文件失败: {e}", status_code=500)
    return PlainTextResponse("未找到文献内容", status_code=404)


# ==============================================================================
# 原 Express 服务迁移端点：快速问答 (/api/ask) 与色彩记忆卡片 (/api/recolor-card)
# ==============================================================================
@app.post("/api/ask")
async def ask_question(request: Request):
    """快速问答端点（兼容原 Express /api/ask 接口）"""
    body = await request.json()
    question = str(body.get("question") or body.get("message") or "").strip()
    audience_type = body.get("audienceType", "文化爱好者")
    scene = body.get("scene", "栖霞山石窟造像数字复彩档案馆")

    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    prompt = f"""
用户身份：{audience_type}
当前场景：{scene}
用户问题：{question}

回答要求：
1. 全程中文，语气沉静、克制、富有学术厚度。
2. 回答不超过 260 字。
3. 解释清楚，不神秘化，不夸大 AI。
4. 必须区分文化资料、设计推演与 AI 想象。
5. {ACADEMIC_BOUNDARY}
6. 严格输出合法的 JSON 格式：
{{"answer":"...","caveat":"...","suggestedQuestions":["...","...","..."]}}
"""
    try:
        result = await generate_json(prompt, system_prompt="你是问窟者智能导览员，请严格返回JSON格式。")
        return {
            "answer": result.get("answer", f"关于“{question}”，栖霞山石窟造像是六朝佛教艺术与金陵地域记忆交汇的文化遗产。"),
            "caveat": result.get("caveat", ACADEMIC_BOUNDARY),
            "suggestedQuestions": result.get("suggestedQuestions", ["数字复彩与传统修复的区别？", "为什么保留风化痕迹？", "舍利塔飞天的艺术特征？"]),
            "source": "deepseek",
        }
    except Exception as e:
        logger.warning(f"/api/ask 回退处理: {e}")
        return {
            "answer": f"关于“{question}”，栖霞山石窟造像是六朝至隋唐佛教艺术的珍贵遗产。数字复彩通过多学科交叉推演，帮助我们看见古代色彩的无限可能。",
            "caveat": ACADEMIC_BOUNDARY,
            "suggestedQuestions": ["舍利塔有哪些主要浮雕？", "千佛岩开凿于何时？", "古代壁画使用哪些矿物颜料？"],
            "source": "fallback",
        }


@app.post("/api/recolor-card")
async def generate_recolor_card(request: Request):
    """生成意象色彩卡片端点（兼容原 Express /api/recolor-card 接口）"""
    body = await request.json()
    imagery = body.get("imagery")
    emotion = body.get("emotion")
    color_tone = body.get("colorTone")

    if not imagery or not emotion or not color_tone:
        raise HTTPException(status_code=400, detail="请选择完整的意象、情绪与色彩倾向")

    prompt = f"""
请为栖霞山石窟数字复彩共创模块生成一张中文色彩记忆卡。
用户选择：
意象：{imagery}
情绪：{emotion}
色彩倾向：{color_tone}

要求：
1. title: 4 到 6 个汉字，典雅有诗意。
2. keywords: 4 个中文关键词列表。
3. palette: 4 个低饱和度十六进制颜色代码，适合岩壁、朱砂、暗金、青绿等矿物色。
4. interpretation: 70 到 110 字解读，说明色彩推演的意境。
5. 必须声明这是数字复彩推演。
6. 严格输出合法的 JSON 格式：
{{"title":"...","keywords":["..."],"palette":["#..."],"interpretation":"..."}}
"""
    try:
        result = await generate_json(prompt, system_prompt="你是数字复彩艺术研究员，请生成色彩卡片JSON。")
        return {
            "title": result.get("title", f"{color_tone}入{imagery}"),
            "keywords": result.get("keywords", [imagery, emotion, color_tone, "数字复彩"]),
            "palette": result.get("palette", ["#252525", "#7D4E38", "#C9372C", "#F6CEA0"]),
            "interpretation": result.get("interpretation", f"以{imagery}为意象，以{emotion}为情绪，让{color_tone}从岩壁暗部缓慢显影。"),
            "source": "deepseek",
        }
    except Exception as e:
        logger.warning(f"/api/recolor-card 回退处理: {e}")
        return {
            "title": f"{color_tone}入{imagery}",
            "keywords": [imagery, emotion, color_tone, "数字复彩"],
            "palette": ["#1E1E1E", "#724B35", "#A54835", "#D4A96A"],
            "interpretation": f"以{imagery}为意象，以{emotion}为情绪，让{color_tone}从岩壁暗部缓慢显影。色彩不是覆盖历史，而是以数字方式唤醒一段可被讨论的视觉记忆。",
            "source": "fallback",
        }


# ==============================================================================
# 核心智能体对话端点 (/api/agent/chat) — SSE 流式事件推送
# ==============================================================================
@app.post("/api/agent/chat")
async def agent_chat(request: Request):
    """
    SSE 流式对话端点
    支持 DeepSeek-V3 极速生成与 DeepSeek-R1 思考链 (Thinking) 解耦推送
    请求体: { message: string, history: [{role, content}], chapterContext: string, useReasoning: bool }
    """
    body = await request.json()
    user_message = body.get("message", "")
    history = body.get("history", [])
    chapter_context = body.get("chapterContext", "")
    use_reasoning = body.get("useReasoning", False)

    # 1. 组装 System Prompt 与上下文
    enhanced_system = SYSTEM_PROMPT
    if chapter_context:
        enhanced_system += f"\n\n## 当前用户所处展览位置\n{chapter_context}\n请结合用户当前的展厅节点进行针对性导览。"

    # 2. RAG 知识检索
    retrieved_chunks = []
    try:
        retrieved_chunks = rag.search(user_message, top_k=4)
        if retrieved_chunks:
            enhanced_system += "\n\n## 参考学术文献（数据库检索匹配）\n以下为相关学术文献片段，请结合内容进行严谨回答并保留引用标识：\n"
            for idx, chunk in enumerate(retrieved_chunks):
                enhanced_system += f"[{idx+1}] 来源: {chunk['title']}\n内容: {chunk['text']}\n\n"
    except Exception as e:
        logger.warning(f"RAG 检索提示: {e}")

    # 3. 构造 OpenAI 消息列表
    messages: List[Dict[str, str]] = [{"role": "system", "content": enhanced_system}]
    for msg in history:
        messages.append({
            "role": "user" if msg.get("role") == "user" else "assistant",
            "content": msg.get("content", "")
        })
    messages.append({"role": "user", "content": user_message})

    # 选择模型（普通模式使用 LLM_MODEL，思考模式使用 LLM_REASONING_MODEL）
    target_model = LLM_REASONING_MODEL if use_reasoning else LLM_MODEL

    async def event_generator():
        try:
            async for chunk in stream_chat_completion(messages, model=target_model):
                chunk_type = chunk.get("type")
                
                # 推送思考链片段
                if chunk_type == "thinking":
                    yield {
                        "event": "thinking",
                        "data": json.dumps({"delta": chunk.get("delta", "")}, ensure_ascii=False)
                    }
                
                # 推送正式回答文本片段
                elif chunk_type == "text":
                    yield {
                        "event": "message",
                        "data": json.dumps({"text": chunk.get("delta", "")}, ensure_ascii=False)
                    }
                
                # 捕获错误
                elif chunk_type == "error":
                    yield {
                        "event": "error",
                        "data": json.dumps({"error": chunk.get("error", "未知错误")}, ensure_ascii=False)
                    }
                
                await asyncio.sleep(0)

            # 4. 推送学术文献引用信息
            if retrieved_chunks:
                sources = [
                    {
                        "index": idx + 1,
                        "title": chunk["title"],
                        "snippet": chunk["text"][:200]
                    }
                    for idx, chunk in enumerate(retrieved_chunks)
                ]
                yield {
                    "event": "citations",
                    "data": json.dumps({"sources": sources}, ensure_ascii=False)
                }

            # 5. 推送流结束信号
            yield {
                "event": "done",
                "data": json.dumps({"finished": True})
            }

        except Exception as e:
            logger.error(f"SSE 推送异常: {e}", exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}, ensure_ascii=False)
            }

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8788))
    uvicorn.run(app, host="0.0.0.0", port=port)
