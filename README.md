# 问窟 GrottoMind

> 栖霞山石窟造像 AI 数字复彩交互档案馆

让沉默的石窟重新被看见、被理解、被参与。

---

## 项目简介

「问窟」是一个以栖霞山千佛岩石窟造像数字复彩为核心的交互式网站。它不是一个普通的文化介绍网站，而是一次用数字技术重新"进入"石窟的旅程。

整个网站以**单页长卷叙事**展开，用户从远望栖霞山开始，逐步走进石窟内部，了解造像的历史与风化，亲手参与数字复彩实验，与 AI 智能体对话，最终生成属于自己的"栖霞色彩记忆"。

### 核心立场

> 本项目中的"复彩"并非对历史原貌的绝对复原，而是基于文化资料、视觉研究与 AI 技术的**数字化色彩推演**。

## 叙事结构

| 章节 | 标题 | 说明 |
|------|------|------|
| 序章 | 远望 | 滚动驱动视频 + 水墨雾气 + 叙事文案（✅ 已完成） |
| 第一章 | 山与窟 | 文化背景时间线，6 个关键节点 |
| 第二章 | 看见褪色 | 风化与残损的视觉叙事 |
| 第三章 | 复彩实验室 | 对比滑杆 + 色彩方案 + 局部热点 + TD 作品 |
| 第四章 | 问窟 AI | 智能体"问窟者"对话系统 |
| 第五章 | 共创一龛 | 用户生成栖霞色彩记忆卡 |
| 尾声 | 作品说明 | 设计理念与技术流程 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 8 |
| 动画 | GSAP 3 + ScrollTrigger |
| 平滑滚动 | Lenis |
| 3D / 着色器 | Three.js（仅用于开场水墨雾气） |
| 后端 | Express 5 + OpenAI API |
| 图片导出 | html-to-image |

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 + 后端 API 同时启动）
npm run dev
```

- 前端：Vite 提供的本地地址（默认 `http://localhost:5173`）
- 后端 API：`http://localhost:8787`

## AI 配置

复制 `.env.example` 为 `.env.local`，填入：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-5.4-mini
PORT=8787
```

> **没有 API Key 也能运行**：问窟 AI 和共创卡片会使用内置的中文降级内容，所有界面和交互功能均可正常演示。

## 项目结构

```
├── src/
│   ├── App.tsx                     # 应用入口
│   ├── App.css                     # 全局样式系统
│   ├── components/
│   │   ├── IntroAnimation.tsx      # 序章 · 滚动视频叙事
│   │   ├── AtmosphereShader.tsx    # 水墨雾气着色器
│   │   ├── AtmosphereEffects.tsx   # 浮尘粒子系统
│   │   ├── GlowText.tsx           # 标题发光特效
│   │   └── SandTextAnimation.tsx   # 沙化文字动画
│   ├── types.ts                    # API 类型定义
│   └── main.tsx                    # 入口文件
├── server/
│   └── index.ts                    # Express API（问窟 AI + 共创卡片）
├── public/assets/                  # 静态素材
│   ├── qixia-scrub-1080p.mp4      # 开场滚动视频
│   ├── grotto-flight.mp4          # TD 作品录屏
│   ├── ZiXinFangMengHuanGeTeTi-2.ttf  # 中文艺术字体
│   ├── ornament.png               # 曼陀罗装饰
│   ├── logo.png / logo-en.png     # 品牌 Logo
│   └── ...
├── 项目开发计划书.md                # 详细开发计划
├── index.html
└── package.json
```

## 常用命令

```bash
npm run dev          # 启动开发环境（前端 + API）
npm run dev:client   # 仅启动前端
npm run dev:api      # 仅启动后端 API
npm run build        # 生产构建
npm run lint         # 代码检查
```

## 设计原则

- **博物馆级叙事感**：每一屏都像一个展厅，不是网页
- **呼吸感节奏**：大量留白、缓慢动效、沉静文案
- **轻量化实现**：优先使用预渲染视频 + CSS/GSAP 动画，避免重度 WebGL
- **文化严谨性**：区分历史依据、视觉推演与 AI 想象

## 与 TouchDesigner 的关系

| TouchDesigner 作品 | GrottoMind 网站 |
|-------------------|----------------|
| 沉浸式视觉输出 | 文化背景解释 |
| 动态复彩效果 | 复彩逻辑说明 |
| 光影、粒子、色彩扩散 | AI 智能导览 |
| 现场交互体验 | 用户在线交互与共创 |

> TouchDesigner 作品是"看见色彩重生"的沉浸式现场，网站是"理解色彩重生"的智能交互档案。两者共同构成完整的数字复彩设计系统。

## License

本项目为毕业设计作品，仅用于学术展示与研究。
