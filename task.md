# 《岩色重生》任务清单

## 已完成

- 初始化 React、Vite、TypeScript 工程。
- 接入 Three.js，完成首页 WebGL 岩壁背景与复彩实验室粒子场。
- 新增参考站式滚动电影场景：固定全屏画面、滚动驱动进度、伪 3D 背景层、洞窟轮廓、暗金显影与圆形控制按钮。
- 预留滚动控制视频位：`public/assets/grotto-flight.mp4`，后续可替换为 AI 场景视频。
- 完成 Express 后端代理，提供 `/api/ask` 与 `/api/recolor-card`。
- 完成无 OpenAI 密钥时的中文降级回答。
- 完成首页、山与窟、看见褪色、复彩实验室、问窟者 AI、共创一龛、作品说明。
- 完成共创卡片保存为图片。
- 完成中文项目说明文档与环境变量模板。

## 待替换素材

- 将 AI 场景推进视频放入 `public/assets/grotto-flight.mp4`。
- 将 360 场景图或石窟入口长图替换 `public/assets/bg-landscape.png`，也可以新增后再由代码切换。
- 将 TouchDesigner 视频放入 `public/assets/td-demo.mp4`。
- 将 TouchDesigner 截图放入 `public/assets/td-stills/`。
- 将石窟造像照片或参考图放入 `public/assets/grotto/`。
- 替换复彩实验室中的程序化占位佛龛视觉。

## 运行任务

- 安装依赖：`npm install`。
- 启动前端与后端：`npm run dev`。
- 构建检查：`npm run build`。
- 代码检查：`npm run lint`。

## AI 配置

- 复制 `.env.example` 为 `.env.local`。
- 填入 `OPENAI_API_KEY`。
- 默认模型为 `gpt-5.4-mini`，可通过 `OPENAI_MODEL` 调整。

## 答辩前检查

- 首屏标题、佛龛轮廓和暗金显影是否完整。
- 复彩滑杆是否流畅。
- 图层开关是否能清楚表达“复彩不是覆盖残缺”。
- 问窟者是否能正常返回中文回答。
- 共创卡片是否可以生成并保存。
- 手机端文字是否溢出，按钮是否重叠。
