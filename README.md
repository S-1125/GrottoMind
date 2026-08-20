# 问窟 GrottoMind

<p align="center">
  <img src="public/assets/wenku-logo-white.png" alt="GrottoMind Logo" width="120" />
</p>

<p align="center">
  <strong>栖霞山石窟造像 AI 数字复彩交互档案馆</strong>
</p>

<p align="center">
  <em>让沉默的石窟重新被看见、被理解、被参与。</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Three.js-r184-000000?logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python 3.12" />
</p>

---

## 🏛️ 项目概览

「问窟（GrottoMind）」是一座以**南京栖霞山石窟造像（千佛岩与南唐舍利塔）数字复彩**为核心的博物馆级全栈数字化交互档案馆。项目打破传统单向科普网站的静态陈列模式，以**单页长卷电影级叙事**为骨架，融合 3D 点云测量、多通道光谱显影、知识增强智能体（RAG Agent）与程序化金石音效，带领观众展开一场跨越千年的数字考古与色彩推演之旅。

> **核心学术立场**  
> 本项目所呈现的"复彩"并非对历史原貌的主观虚构或实体干预，而是基于多学科光谱分析（XRF/XRD/拉曼光谱）、文献典籍考证与 AI 大模型推理的**数字化色彩推演（Digital Recoloring Inference）**。

---

## 📜 章节架构与核心展厅

| 章节 | 展厅名称 | 核心交互与学术内容 | 状态 |
| :--- | :--- | :--- | :---: |
| **序章** | **远望 · 金陵古刹** | 滚动驱动 4K 叙事视频 + 水墨雾气着色器 + 沉浸式开场序幕 | ✅ 已就绪 |
| **第一章** | **塔与窟 · 南唐遗珍** | 3D 粒子舍利塔全维漫游 + 8 大核心节点深度精读 + 矿物颜料指纹系统 | ✅ 已就绪 |
| **第二章** | **数字焕颜 · 光谱显影** | 风化对比滑块（InkReveal）+ 粒子流体推演实验室 + 多通道测绘档案 | ✅ 已就绪 |
| **第三章** | **问窟枢纽 · 智慧导览** | "问窟者" AI 智能体 + 73 篇学术文献知识库 + 记忆色卡 + 发问志手稿 | ✅ 已就绪 |

---

## 🔍 核心模块详解

### 1. 第一章 · 塔与窟（南唐五重舍利塔）
- **3D 粒子舍利塔**：基于 Three.js 定制点云渲染管线，支持鼠标滚轮在 8 个关键构件视角之间平滑插值切换。
- **GSAP 状态机协同**：全站时间线与相机镜头精准对齐，辅以高级金石定焦音频反馈。
- **8 处学术精读画廊**：涵盖南唐皇家敷金涂彩工艺、1930年修缮考、无斗拱密檐力学考、褒衣博带佛龛美学、四大天王法器断代、普贤文殊图像考、须弥座六朝别字悬案，以及华严宗《八相成道图》唯一建筑浮雕实录。
- **色彩指纹系统（Color Fingerprint）**：针对重点浮雕提供朱砂、石青、泥金、石绿等矿物颜料配比推演色卡。

### 2. 第二章 · 数字焕颜（光谱考古与流体推演）
- **显影对比滑块（InkReveal）**：采用 GPU 加速的双层视差对比系统，实时比对造像自然风化状态与光谱重建后的矿物设色。
- **流体推演实验室**：图文科研排版融合优化后的粒子流体力场仿真，具象化呈现矿物颜料在风化剥落与数字聚合之间的形态演变。
- **赛博考古视觉语言**：采用卡纸级阴影装裱、等宽测绘数据面板与激光十字准星等界面微动效。

### 3. 第三章 · 问窟枢纽（学术导览智能体）
- **"问窟者" 智能体**：基于 LLM 适配层（支持 NVIDIA NIM / DeepSeek / Gemini），赋予沉静克制、学术严谨的数字考古学家角色。
- **文献级 RAG 检索体系**：接入 73 篇精校栖霞山石窟学术文献，回复中自动标注文献角标 `[1][2]`，支持悬浮预览与**正文段落毫秒级穿透定位**。
- **意象色彩卡片生成**：根据对话内容自适应解析输出结构化矿物色卡标记 `[COLOR_CARD]`。
- **发问志与笔记系统**：支持一键收藏问答记录至本地手稿，持久化存储于 `localStorage`。

### 4. 声音设计 · 金石回响（Web Audio 引擎）
- **空灵禅境声场**：集成 256kbps 栖霞古刹空灵自然环境音轨（216Hz/432Hz 调谐）。
- **程序化金石玉磬音效**：使用 Web Audio API 合成定焦、翻页、展开等触觉级音频反馈，支持全站全局一键静音。

---

## 🛠️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端展示层 (React 19)                    │
│  Three.js 粒子引擎 │ GSAP 状态机 │ Lenis 平滑滚动 │ Lucide   │
└──────────────────────────────┬──────────────────────────────┘
                               │  SSE 流式事件 / REST API
┌──────────────────────────────▼──────────────────────────────┐
│                  服务端架构 (FastAPI 2.0)                   │
│                                                             │
│  ┌────────────────────────┐    ┌─────────────────────────┐  │
│  │   LLM 统一适配器层     │    │   内存学术向量检索 RAG  │  │
│  │ (NVIDIA NIM / DeepSeek)│    │ (FastEmbed BGE / 语义双轨)│  │
│  └────────────────────────┘    └─────────────────────────┘  │
│                                              │              │
│  ┌───────────────────────────────────────────▼───────────┐  │
│  │        73 篇栖霞山石窟专论文献知识库 (TXT / PDF / JSON) │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

| 模块 | 选型与规格 |
| :--- | :--- |
| **前端架构** | React 19.2 + TypeScript 5 + Vite 8 |
| **视觉呈现** | Three.js (r184) + GSAP 3 + ScrollTrigger + Lenis |
| **排版与渲染** | Cormorant Garamond + Noto Serif SC + React-Markdown |
| **后端框架** | Python 3.12 + FastAPI + Uvicorn (异步高并发) |
| **推理模型** | NVIDIA NIM (`nvidia/nemotron-3.5-lightning-30b-a3b` 等) / DeepSeek |
| **知识库检索** | FastEmbed (BAAI/bge-small-zh-v1.5) + 滑动窗口关键词双轨检索 |
| **文献规模** | 73 篇精校学术专著/论文，切分为 3000+ 语义分块 |

---

## 🚀 本地快速启动

### 环境要求
- **Node.js**: >= 20.0.0 (推荐使用 `.nvmrc` 指定的 Node 22)
- **Python**: >= 3.10 (推荐 Python 3.12)

### 1. 克隆项目与安装前端依赖
```bash
git clone https://github.com/S-1125/GrottoMind.git
cd GrottoMind

# 安装前端依赖
npm install
```

### 2. 配置 Python 虚拟环境与后端依赖
```bash
# 一键创建 .venv 虚拟环境并安装服务端依赖
npm run setup:python
```

### 3. 配置环境变量
复制环境配置模板：
```bash
cp .env.example .env
```
编辑 `.env` 文件，填入您的 API 密钥与模型配置：
```env
NVIDIA_API_KEY=nvapi-your-key-here
LLM_API_KEY=nvapi-your-key-here
LLM_API_BASE=https://integrate.api.nvidia.com/v1
LLM_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
LLM_REASONING_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
```

### 4. 启动本地全栈开发服务
```bash
# 同时拉起 Vite 前端 (端口 5173) 与 FastAPI 后端 (端口 8788)
npm run dev
```

浏览器打开 `http://localhost:5173` 即可开始体验。

---

## 📁 目录结构

```
GrottoMind/
├── src/
│   ├── App.tsx                  # 主入口与长卷章节流转
│   ├── App.css                  # 全站核心视觉与金石设计系统
│   ├── components/
│   │   ├── IntroAnimation.tsx   # 序章 · 滚动视频与水墨开场
│   │   ├── TimelineHall.tsx     # 第一章 · 3D点云塔与节点控制
│   │   ├── ParticleStupa.tsx    # Three.js 3D 舍利塔粒子点云着色器
│   │   ├── DeepReadArticle.tsx  # 深度阅读全屏横向画廊
│   │   ├── FadingHall.tsx       # 第二章 · 颜料考古与流体推演实验室
│   │   ├── InkReveal.tsx        # 光谱显影前后视差对比滑块
│   │   ├── GrottoHub.tsx        # 第三章 · 问窟枢纽智能体交互主站
│   │   ├── GrottoHub.css        # 问窟枢纽电影级排版样式
│   │   ├── LiteratureLibrary.tsx# 73篇学术文献档案馆（带段落定位）
│   │   ├── SoundEngine.ts       # Web Audio 程序化金石音效引擎
│   │   └── agent/               # 全局悬浮光球与常驻对话系统
│   └── main.tsx
├── server/
│   ├── main.py                  # FastAPI 主服务（SSE 对话、文献端点、健康检查）
│   ├── llm_adapter.py           # 大模型统一适配层（流式传输、思考链、结构化JSON）
│   ├── rag.py                   # 内存学术向量检索与文献语义匹配管线
│   ├── requirements.txt         # 后端精简依赖清单
│   └── knowledge/               # 73 篇学术文献文本与元数据
├── public/
│   ├── assets/                  # 3D 模型、音效、白金石 Logo、字体素材
│   ├── 章节1图片素材/           # 舍利塔各节点高清微距摄影 (WebP)
│   └── 章节2素材/               # 颜料光谱扫描图与背景素材
├── Dockerfile                   # 云端容器化部署配置
├── package.json
└── vite.config.ts
```

---

## 📄 版权与学术声明

- 本项目为毕业设计学术成果，专注于**文化遗产数字化保护与智能交互体验设计**。
- 文献档案与石窟图录版权归原作者及相关文博机构所有，仅供非商业学术研究与教学展示使用。
