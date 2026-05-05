"""
batch_summarize.py
批量为 knowledge 目录下的所有 txt 文献生成摘要和关键词，并保存为 JSON 缓存。
"""

import os
import json
import re
import time
from dotenv import load_dotenv

# 自动加载根目录下的 .env 文件
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
from google import genai

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KNOWLEDGE_DIR = os.path.join(SCRIPT_DIR, "knowledge")
META_PATH = os.path.join(KNOWLEDGE_DIR, "metadata.json")

# 初始化 Gemini 客户端（从环境变量读取，禁止硬编码）
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    print("❌ 错误：GEMINI_API_KEY 未设置。请在环境变量中配置后重试。")
    exit(1)
SUMMARY_MODEL_ID = "gemini-3.1-pro-preview"
client = genai.Client(api_key=GEMINI_API_KEY)

def generate_summary_for_text(text: str) -> dict:
    summarize_prompt = """请通读以下完整学术文献，输出一个符合要求的 JSON 对象，包含两个字段：
1. "summary": 一段 200-400 字的中文研读摘要，用 Markdown 格式，对关键学术概念、技术方法名称、重要结论使用 **加粗**。内容应涵盖研究背景、核心方法、主要发现与结论。
2. "keywords": 一个包含 4-8 个关键词短语的数组，涵盖学科领域、技术方法和核心主题。
注意不要加任何前缀，直接输出纯 JSON。

文献全文：
""" + text

    from google.genai import types
    response = client.models.generate_content(
        model=SUMMARY_MODEL_ID,
        contents=[{"role": "user", "parts": [{"text": summarize_prompt}]}],
        config=types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
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
        txt_path = os.path.join(KNOWLEDGE_DIR, filename)
        summary_path = os.path.join(KNOWLEDGE_DIR, f"{stem}_summary.json")

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
