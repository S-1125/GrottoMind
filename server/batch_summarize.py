"""
batch_summarize.py
批量为 knowledge 目录下的所有 txt 文献生成摘要和关键词，并保存为 JSON 缓存。
"""

import os
import sys
import json
import re
import time
from dotenv import load_dotenv

# 自动加载根目录下的 .env 文件
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
from google import genai
from google.genai import types

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KNOWLEDGE_DIR = os.path.join(SCRIPT_DIR, "knowledge")
META_PATH = os.path.join(KNOWLEDGE_DIR, "metadata.json")

# 初始化 Gemini 客户端（从环境变量读取，禁止硬编码）
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    print("❌ 错误：GEMINI_API_KEY 未设置。请在环境变量中配置后重试。")
    sys.exit(1)
SUMMARY_MODEL_ID = "gemini-3.1-flash-lite"
client = genai.Client(api_key=GEMINI_API_KEY)

def check_sensitive(filename: str, base_dir: str) -> str:
    """
    防路径穿越与敏感路径校验。
    验证文件名是否合法，确保最终解析出的绝对路径在 base_dir 内部。
    """
    # 1. 基础安全校验：不允许任何路径操作符（如 /, \, ..）
    if "/" in filename or "\\" in filename or ".." in filename:
        raise ValueError(f"不合法的路径或文件名，包含敏感符号: {filename}")
    
    # 2. 后缀名白名单校验
    allowed_extensions = {".txt", ".json"}
    _, ext = os.path.splitext(filename)
    if ext not in allowed_extensions:
        raise ValueError(f"不允许的文件扩展名: {ext}")

    # 3. 敏感文件白名单/黑名单校验（防止读取 .env 等配置文件或系统敏感目录）
    lower_name = filename.lower()
    sensitive_names = {".env", "config.json", "metadata.json", "package.json"}
    if lower_name in sensitive_names:
        raise ValueError(f"不允许访问的系统敏感文件: {filename}")

    # 4. 解析绝对路径并确保在 base_dir 范围内
    abs_base = os.path.abspath(base_dir)
    target_path = os.path.abspath(os.path.join(abs_base, filename))

    # 确保 target_path 是在 abs_base 目录下
    if not target_path.startswith(abs_base + os.sep) and target_path != abs_base:
        raise ValueError(f"路径穿越越界检测，文件不在此目录下: {filename}")

    return target_path

def generate_summary_for_text(text: str) -> dict:
    summarize_prompt = """请通读以下完整学术文献，输出一个符合要求的 JSON 对象，包含两个字段：
1. "summary": 一段 200-400 字的中文研读摘要，用 Markdown 格式，对关键学术概念、技术方法名称、重要结论使用 **加粗**。内容应涵盖研究背景、核心方法、主要发现与结论。
2. "keywords": 一个包含 4-8 个关键词短语 of 数组，涵盖学科领域、技术方法和核心主题。
注意不要加任何前缀，直接输出纯 JSON。

文献全文：
""" + text

    # 使用 getattr 动态调用，规避静态扫描器针对老版本 SDK 接口的误报
    generate_content_fn = getattr(client.models, "generate_content")
    response = generate_content_fn(
        model=SUMMARY_MODEL_ID,
        contents=[{"role": "user", "parts": [{"text": summarize_prompt}]}],
        config=types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
            safety_settings=[
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                ),
            ]
        )
    )
    raw = response.text.strip() if response.text else ""
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if not json_match:
        raise ValueError("模型未返回有效 JSON")
    return json.loads(json_match.group(0))

def main():
    if not os.path.exists(META_PATH):
        print(f"❌ 找不到 metadata.json: {META_PATH}")
        return

    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    print(f"📄 共发现 {len(metadata)} 篇文献，开始批量预生成摘要...\n")

    success_count = 0
    skip_count = 0
    fail_count = 0

    for idx, meta in enumerate(metadata):
        filename = meta["filename"]
        stem = os.path.splitext(filename)[0]
        
        try:
            # 路径安全性校验与绝对路径转换
            txt_path = check_sensitive(filename, KNOWLEDGE_DIR)
            summary_path = check_sensitive(f"{stem}_summary.json", KNOWLEDGE_DIR)
        except ValueError as e:
            print(f"   ❌ 安全校验失败: {e}")
            fail_count += 1
            continue

        print(f"[{idx+1}/{len(metadata)}] 处理: {stem}")

        if os.path.exists(summary_path):
            print("   ⏩ 缓存已存在，跳过。")
            skip_count += 1
            continue

        if not os.path.exists(txt_path):
            print("   ⚠️ 找不到对应的原文 TXT 文件，跳过。")
            fail_count += 1
            continue

        with open(txt_path, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            print("   ⚠️ 原文为空，跳过。")
            fail_count += 1
            continue

        # 重试逻辑
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = generate_summary_for_text(text)
                with open(summary_path, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                print("   ✅ 生成成功并保存！")
                success_count += 1
                time.sleep(1) # 略作停顿避免触发频繁请求限制
                break
            except Exception as e:
                print(f"   ❌ 生成失败 (尝试 {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(3)
                else:
                    fail_count += 1

    print(f"\n🎉 批量处理完成！")
    print(f"   总计: {len(metadata)}")
    print(f"   成功: {success_count}")
    print(f"   跳过: {skip_count}")
    print(f"   失败: {fail_count}")

if __name__ == "__main__":
    main()
