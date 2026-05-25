"""
问窟 AI Agent — FastAPI 后端
提供 /api/agent/chat SSE 流式端点，接入 Google Gemini API
"""

import os
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse
from google import genai
from google.genai import types
from dotenv import load_dotenv
import rag

# 自动加载根目录下的 .env 文件
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
KNOWLEDGE_DIR = os.path.join(SERVER_DIR, "knowledge")

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

# ————————————————————————————————————————————
# 配置
# ————————————————————————————————————————————
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    print("⚠️  警告：GEMINI_API_KEY 未设置，AI 对话将不可用。请在环境变量中配置。")
MODEL_ID = "gemini-3.1-flash-lite-preview"       # 对话模型（已验证可用）
SUMMARY_MODEL_ID = "gemini-3.1-flash-lite-preview"  # 摘要模型（已验证可用）

# 初始化客户端
client = genai.Client(api_key=GEMINI_API_KEY)

# "问窟者"人设 Prompt — 深度知识版
SYSTEM_PROMPT = """你是"问窟者"，栖霞山石窟造像数字复彩档案馆的智能考古导览员。

## 身份与气质
- 你是一位沉静、克制、有深厚文化素养的数字考古学家
- 你的语气如同博物馆中一位低声细语、博学的研究员
- 你的存在感来自于知识的深度，而非表演性的热情

## 核心知识库：栖霞山石窟（南京）

### 基本历史
- 栖霞山，又名"摄山"，位于南京城东北22公里，因山中遍生摄生草而得名
- 栖霞寺由南齐居士明僧绍舍宅而建，始建于南齐永明七年（489年），隋文帝时扩建，唐改名"栖霞寺"
- 千佛岩石窟群：开凿于南齐至隋唐年间，沿山壁绵延约200米，共有大小佛龛500余个，造像700余尊
- 主要造像年代：南齐（479—502年）、梁（502—557年）、隋（581—618年），以南齐作品最为精湛

### 舍利塔（五重石塔）
- 始建于隋仁寿年间（601年），现存塔身为五代南唐时期（937—975年）吴越王钱弘俶重建
- 八角五级密檐石塔，通高约18米，塔身精雕横带式浮雕：飞天、供养人、伎乐天、七宝庄严
- 塔基须弥座浮雕：释迦八相成道图，共八组叙事场景，细节极为精微
- 现存铁质塔刹（相轮）为1930年代金陵女子大学贝德士教授组织修缮时更换
- 飞天特点：南唐风格，体态丰腴而不失飘逸，帔帛舒展，面部沿袭唐风圆润，是南京地区五代佛教艺术的孤本

### 千佛岩主要龛窟
- 无量寿佛龛（最大，高约10米）：主尊弥陀坐佛，胁侍观音、势至，背光华丽，南齐精品
- 毗卢佛龛：多层宝盖华盖，装饰繁复，隋代风格
- 小型单体龛：散布岩壁，多为平民供养刻像，北朝至唐代风格并存

### 颜色与数字复彩（核心知识）
- 现存造像均为裸露石灰岩本色，但通过多学科分析可推演原有彩绘
- 颜料分析方法：便携式XRF荧光光谱、拉曼光谱、扫描电镜（SEM-EDS）
- 已识别的典型矿物颜料：
  - 朱砂（HgS）：主红色，色值范围 #C03020—#8B1A1A
  - 石青（azurite, Cu₃(CO₃)₂(OH)₂）：主蓝色，#2A5F8B—#1E3F6F
  - 石绿（malachite, Cu₂CO₃(OH)₂）：主绿色，#3A7A4A—#2D5C3A
  - 铅白（2PbCO₃·Pb(OH)₂）：白色底涂，#F5F0E8
  - 赭石（Fe₂O₃）：赭红土色，#8B4A2A—#6B3520
  - 雌黄（As₂S₃）：金黄色，#D4A520—#B8861A
  - 炭黑（Carbon black）：轮廓线，#1A1A1A
- 数字复彩推演步骤：文献记载 → 同期案例比对（龙门、云冈、敦煌）→ 科学检测结合 → 计算机渲染推演

## 色彩卡片输出协议（CRITICAL！）
当用户询问任何涉及颜色、色彩复原、颜料的问题时，你必须在回答正文之后，
在一个单独的行中输出以下格式的色卡标记（可输出1-5张）：

[COLOR_CARD name="朱砂" hex="#C03020" period="南齐" material="硫化汞 HgS"]
[COLOR_CARD name="石青" hex="#2A5F8B" period="隋唐" material="碳酸铜 azurite"]

注意：
- 严格使用 [COLOR_CARD ...] 格式，不要用代码块包裹
- name 为颜料中文名，hex 为推演色值，period 为主要使用朝代，material 为矿物成分
- 只有在讨论颜色时才输出，普通问题不要输出任何 COLOR_CARD 标记

## 回复规范
- 语言：中文，语言要有文化厚度，格式必须结构化清晰。
- 排版格式：**极其重要**！你必须使用清晰的 Markdown 排版，使用 **加粗** 突出重点词汇，如果列举多项内容，必须使用列表（- 或 1. 2. 3.）。绝不能输出一大坨不分段的纯文本。
- 文献引用：如果有具体的文献来源（尤其是通过 RAG 检索到的内容），必须在文中对应句子末尾添加引用标号，并且**强制使用 Markdown 链接格式**，如：`[1](#来源:文献名称)`、`[2](#来源:另一篇文献)`。括号内必须是以 `#来源:` 开头的确切文献标题。
- 长度：正常问题150-300字，复杂问题最多500字。
- 边界：对于超出栖霞山范围的问题，委婉引导回石窟话题。
"""

# ————————————————————————————————————————————
# FastAPI 应用
# ————————————————————————————————————————————
app = FastAPI(title="GrottoMind Agent API")

# 允许前端跨域访问（生产环境请设置 ALLOWED_ORIGINS 环境变量为前端域名）
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5180,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录（PDF 提取图片）
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(STATIC_DIR, "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "model": MODEL_ID}

@app.get("/api/literature")
async def get_literature():
    """获取本地知识库中的文献列表（过滤掉 hidden 内部文献）"""
    meta_path = os.path.join(KNOWLEDGE_DIR, "metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            all_docs = json.load(f)
        # 过滤掉标记为 hidden 的内部文献（仍保留 RAG 索引）
        return [d for d in all_docs if not d.get("hidden", False)]
    return []

import re
from fastapi.responses import PlainTextResponse, JSONResponse

def is_binary_garbage(line: str) -> bool:
    """检测一行是否是 PDF 二进制乱码"""
    if not line:
        return False
    # 计算非打印字符（控制字符）的比例
    non_printable = sum(1 for c in line if ord(c) < 32 and c not in '\t\n\r')
    if len(line) > 0 and non_printable / len(line) > 0.15:
        return True
    # 检测明显的 PDF 二进制特征：大量连续特殊字符
    if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]{3,}', line):
        return True
    # 检测像素/二进制流特征：>40% 非 ASCII 非中文字符
    weird = sum(1 for c in line if not (c.isascii() or '\u4e00' <= c <= '\u9fff' or '\u3000' <= c <= '\u303f'))
    if len(line) > 10 and weird / len(line) > 0.4:
        return True
    return False

def clean_notebooklm_text(text: str) -> str:
    """清洗 NotebookLM 导出文本，过滤乱码行，将图片链接转为 Markdown"""
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned.append("")
            continue

        # 跳过二进制乱码行
        if is_binary_garbage(stripped):
            continue

        # 将 NotebookLM CDN 图片链接转为 Markdown 图片语法
        # 浏览器 <img> 标签天然携带用户的 Google Session Cookie，可以正常加载
        if stripped.startswith('https://lh3.googleusercontent.com/'):
            cleaned.append(f"\n![插图]({stripped})\n")
            continue

        # 跳过无意义的纯 UUID 行
        if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', stripped):
            continue

        # 加上两个空格实现 Markdown 的强制软换行，保留原始排版
        cleaned.append(stripped + "  ")

    # 合并多余空行
    result = re.sub(r'\n{3,}', '\n\n', '\n'.join(cleaned))
    return result.strip()

# 注意：summarize 路由必须在 {filename} 路由之前声明，
# 否则 "summarize" 会被当作 filename 参数匹配走
@app.get("/api/literature/summarize/{filename}")
async def summarize_literature(filename: str):
    """用 Gemini Pro 为单篇文献生成全文摘要和关键词"""
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(KNOWLEDGE_DIR, safe_filename)
    if not os.path.exists(file_path):
        return JSONResponse({"error": "文献不存在"}, status_code=404)

    # 改为读取本地静态 JSON 缓存
    summary_path = os.path.join(KNOWLEDGE_DIR, safe_filename.replace('.txt', '_summary.json'))
    if not os.path.exists(summary_path):
        return JSONResponse({"error": "摘要尚未生成，请稍后刷新。"}, status_code=404)

    try:
        with open(summary_path, "r", encoding="utf-8") as f:
            result = json.load(f)
        return result
    except Exception as e:
        return JSONResponse({"error": f"读取摘要失败: {e}"}, status_code=500)

@app.get("/api/literature/{filename}")
async def get_literature_content(filename: str):
    """获取单篇文献的原始文本内容（已清洗）"""
    # 防止路径穿越
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(KNOWLEDGE_DIR, safe_filename)
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            raw_text = f.read()
        return PlainTextResponse(clean_notebooklm_text(raw_text))
    return PlainTextResponse("未找到文献内容", status_code=404)

@app.post("/api/agent/chat")
async def agent_chat(request: Request):
    """
    SSE 流式对话端点
    请求体: { message: string, history: [{role, content}], chapterContext: string }
    """
    body = await request.json()
    user_message = body.get("message", "")
    history = body.get("history", [])
    chapter_context = body.get("chapterContext", "")

    # 组装上下文增强的 System Prompt
    enhanced_system = SYSTEM_PROMPT
    if chapter_context:
        enhanced_system += f"\n\n## 当前用户浏览位置\n{chapter_context}\n请根据用户当前所处的展览位置，适当关联相关内容进行回复。"

    # 1. 向量检索 (RAG)
    retrieved_chunks = rag.search(user_message, top_k=5)
    if retrieved_chunks:
        enhanced_system += "\n\n## 参考学术文献（RAG 检索结果）\n以下是从专属数据库中检索到的文献片段，请结合这些学术背景进行准确回答：\n"
        for idx, chunk in enumerate(retrieved_chunks):
            enhanced_system += f"[{idx+1}] 来源: {chunk['title']}\n内容: {chunk['text']}\n\n"

    # 构建 Gemini 消息格式
    contents = []
    for msg in history:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("content", "")}]
        })
    # 添加当前用户消息
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    async def event_generator():
        """SSE 事件流生成器"""
        try:
            response = client.models.generate_content_stream(
                model=MODEL_ID,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=enhanced_system,
                    max_output_tokens=2000,
                    thinking_config=types.ThinkingConfig(thinking_level="low")
                )
            )

            for chunk in response:
                if chunk.text:
                    yield {
                        "event": "message",
                        "data": json.dumps({"text": chunk.text}, ensure_ascii=False)
                    }
                # 让出事件循环，避免阻塞
                await asyncio.sleep(0)

            # 流结束后，返回 RAG 引用源，供前端引用跳转使用
            if retrieved_chunks:
                sources = []
                for idx, chunk in enumerate(retrieved_chunks):
                    sources.append({
                        "index": idx + 1,
                        "title": chunk["title"],
                        "snippet": chunk["text"][:200]  # 取前200字作为定位片段
                    })
                yield {
                    "event": "message",
                    "data": json.dumps({"sources": sources}, ensure_ascii=False)
                }

            # 流结束信号
            yield {
                "event": "done",
                "data": json.dumps({"finished": True})
            }

        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}, ensure_ascii=False)
            }

    return EventSourceResponse(event_generator())


# ————————————————————————————————————————————
# 启动时自动检查索引
# ————————————————————————————————————————————
@app.on_event("startup")
async def startup_check_index():
    """启动时检测向量索引是否为空，如果为空则自动重建"""
    try:
        count = rag.collection.count()
        if count == 0:
            print("📦 向量索引为空，正在自动重建...")
            rag.build_index()
            print(f"✅ 索引重建完成，共 {rag.collection.count()} 个向量。")
        else:
            print(f"✅ 向量索引已就绪，共 {count} 个向量。")
    except Exception as e:
        print(f"⚠️  索引检查失败：{e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8788)
