# Tasks

## Phase 1: 架构搭建（Foundation）
- [ ] Task 1: 创建单页长卷滚动架构
  - [ ] SubTask 1.1: 在 `src/App.tsx` 中引入 6 个章节组件，使用 `id` 锚点管理
  - [ ] SubTask 1.2: 实现点击"进入"按钮平滑滚动到 `#mountain-cave` 章节
  - [ ] SubTask 1.3: 创建固定导航栏组件（滚动到非首屏时显示）
  - [ ] SubTask 1.4: 使用 GSAP ScrollTrigger 为各章节添加入场动画触发

## Phase 2: 内容章节（Content Sections）
- [ ] Task 2: 山与窟 - 文化背景时间线
  - [ ] SubTask 2.1: 创建 `src/sections/MountainCave.tsx`
  - [ ] SubTask 2.2: 实现纵向时间线布局（山→寺→窟→像→色→复）
  - [ ] SubTask 2.3: 滚动触发节点依次浮现动画（fade-up + stagger）
  - [ ] SubTask 2.4: 添加背景：暗色岩壁纹理 + 微弱金色光点（CSS 或 Canvas）

- [ ] Task 3: 看见褪色 - 风化与残损叙事
  - [ ] SubTask 3.1: 创建 `src/sections/SeeFade.tsx`
  - [ ] SubTask 3.2: 实现图层叠加容器（5 层图片/视频叠加）
  - [ ] SubTask 3.3: 创建图层切换按钮组（岩壁层/风化层/残损层/线稿层/复彩层）
  - [ ] SubTask 3.4: 点击切换时更新对应图层 opacity，文字说明同步更新
  - [ ] SubTask 3.5: 使用占位图片（后续替换为真实石窟素材）

- [ ] Task 4: 复彩实验室 - 核心交互展示
  - [ ] SubTask 4.1: 创建 `src/sections/RecolorLab.tsx`
  - [ ] SubTask 4.2: 实现 before/after 对比滑杆组件（拖拽分割线）
  - [ ] SubTask 4.3: 实现色彩方案切换按钮组（5 种方案）
  - [ ] SubTask 4.4: 添加局部热点点击区域（头光/面部/衣纹/佛龛边缘/底座/背光）
  - [ ] SubTask 4.5: 点击热点弹出解释卡片（模态框或侧边栏）
  - [ ] SubTask 4.6: 嵌入 TouchDesigner 视频展示位（预留 `<video>` 标签）

## Phase 3: AI 与共创（Interactive Features）
- [ ] Task 5: 问窟者 AI - 智能体导览
  - [ ] SubTask 5.1: 创建 `src/sections/AskGrotto.tsx`
  - [ ] SubTask 5.2: 实现身份切换标签（普通游客/设计师/研究者/小朋友）
  - [ ] SubTask 5.3: 实现预设问题按钮组（6-8 个问题）
  - [ ] SubTask 5.4: 实现自由输入框 + 发送按钮
  - [ ] SubTask 5.5: 对接现有后端 API `/api/ask`，显示 AI 回答、免责声明、追问建议
  - [ ] SubTask 5.6: 设计 AI 界面：暗色半透明面板 + 金色边框 + 打字机效果

- [ ] Task 6: 共创一龛 - 用户生成复彩卡片
  - [ ] SubTask 6.1: 创建 `src/sections/CoCreate.tsx`
  - [ ] SubTask 6.2: 实现三步选择流程（意象 → 情绪 → 色彩倾向）
  - [ ] SubTask 6.3: 每步使用卡片式选择界面，选中状态有金色高亮
  - [ ] SubTask 6.4: 对接后端 API `/api/recolor-card` 生成卡片内容
  - [ ] SubTask 6.5: 实现卡片预览（标题/关键词/色板/AI 释义）
  - [ ] SubTask 6.6: 使用 `html-to-image` 实现卡片导出为 PNG

## Phase 4: 收尾与说明（Closing）
- [ ] Task 7: 作品说明 - 技术流程展示
  - [ ] SubTask 7.1: 创建 `src/sections/About.tsx`
  - [ ] SubTask 7.2: 实现技术流程图（SVG 路径绘制动画）
  - [ ] SubTask 7.3: 分块展示：设计背景/方法/技术流程/AI 边界
  - [ ] SubTask 7.4: 添加项目团队信息与致谢

- [ ] Task 8: 全局优化与验证
  - [ ] SubTask 8.1: 统一各章节视觉风格（间距、字体、色彩、动效节奏）
  - [ ] SubTask 8.2: 移动端适配检查（文字不溢出、按钮不重叠）
  - [ ] SubTask 8.3: 性能优化：图片懒加载、视频预加载策略
  - [ ] SubTask 8.4: 运行 `npm run lint` 和 `npm run build` 确保无错误

# Task Dependencies

- Task 1 必须在所有其他 Task 之前完成
- Task 2、3、4 可并行开发（依赖 Task 1）
- Task 5、6 可并行开发（依赖 Task 1，不依赖 2/3/4）
- Task 7 可在 Task 2-6 之后进行
- Task 8 在所有 Task 完成后进行
