# 岩色重生

栖霞山石窟造像 AI 数字复彩交互档案馆。

## 项目简介

本项目是一个 React/Vite 可运行网站原型，包含 WebGL 岩壁显影、复彩实验室、问窟者 AI 智能体、共创一龛卡片生成与 TouchDesigner 作品展示位。

最终版不接 TouchDesigner 控制器，只嵌入 TD 视频与截图。

## 本地运行

```bash
npm install
npm run dev
```

前端默认运行在 Vite 提供的本地地址，后端 API 默认运行在 `http://localhost:8787`。

## AI 配置

复制 `.env.example` 为 `.env.local`，填入：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-5.4-mini
PORT=8787
```

没有密钥时，问窟者与共创卡片会使用中文降级内容，方便继续演示界面。

## 常用命令

```bash
npm run build
npm run lint
```

## 素材替换

素材说明见 `public/assets/README.md`。
