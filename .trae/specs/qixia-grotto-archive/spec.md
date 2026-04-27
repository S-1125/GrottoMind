# 《岩色重生》问窟交互档案馆 Spec

## Why

当前项目已完成高质量的首页入场动画（视频滚动叙事 + 文字浮现），但点击"进入"后没有后续内容。需要构建一个完整的单页长卷叙事网站，承接入场动画，展示栖霞山石窟造像的 AI 数字复彩交互体验。

## What Changes

- 在现有入场动画后追加 6 个功能模块的单页长卷
- 每个模块采用轻量级实现：CSS 叙事排版、视频背景、简单 WebGL/Canvas 特效
- 保留现有后端 API（问窟者 AI、共创卡片）
- 视觉风格参考 `https://persepolis.getty.edu/`：高级展览质感、克制动效、暗色调 + 金色点缀
- **BREAKING**: 从纯入场动画扩展为完整单页应用，需增加路由或滚动锚点管理

## Impact

- Affected specs: 首页入场动画（保持不变）、新增 6 个叙事模块
- Affected code: `src/App.tsx`（增加模块路由/滚动管理）、新增 `src/sections/*`、后端 API 保持不变

## ADDED Requirements

### Requirement: 单页长卷叙事架构
The system SHALL provide a single-page scroll narrative with 6 sections after the intro animation.

#### Scenario: 用户点击"进入"
- **WHEN** 用户在最后一页点击"进入"按钮
- **THEN** 页面平滑滚动到"山与窟"章节，导航栏出现

#### Scenario: 用户滚动浏览
- **WHEN** 用户向下滚动
- **THEN** 各章节依次进入视口，触发对应入场动画

### Requirement: 山与窟 - 文化背景时间线
The system SHALL display a horizontal or vertical timeline of Qixia Mountain's cultural history.

#### Scenario: 滚动触发
- **WHEN** 该章节进入视口
- **THEN** 时间线节点依次浮现，每个节点包含：年代、关键词、简短描述

### Requirement: 看见褪色 - 风化与残损叙事
The system SHALL allow users to toggle layers showing the grotto's deterioration process.

#### Scenario: 图层切换
- **WHEN** 用户点击图层按钮（岩壁层/风化层/残损层/线稿层/复彩层）
- **THEN** 对应图层叠加或隐藏，文字说明更新

### Requirement: 复彩实验室 - 核心交互展示
The system SHALL provide interactive recoloring demonstrations with before/after comparison.

#### Scenario: 滑杆对比
- **WHEN** 用户拖动对比滑杆
- **THEN** 左右两侧显示石窟现状与数字复彩效果

#### Scenario: 色彩方案切换
- **WHEN** 用户点击色彩方案按钮
- **THEN** 复彩效果切换为对应色调（朱砂显影/石青石绿/暗金佛光/丹枫栖霞）

### Requirement: 问窟者 AI - 智能体导览
The system SHALL integrate the existing AI backend for cultural Q&A.

#### Scenario: 身份切换
- **WHEN** 用户选择身份（普通游客/设计师/研究者/小朋友）
- **THEN** AI 回答深度和风格适配对应身份

#### Scenario: 预设问题
- **WHEN** 用户点击预设问题按钮
- **THEN** AI 返回对应回答，附带追问建议

### Requirement: 共创一龛 - 用户生成复彩卡片
The system SHALL allow users to create personalized "Qixia Color Memory" cards.

#### Scenario: 三步共创
- **WHEN** 用户依次选择意象、情绪、色彩倾向
- **THEN** 系统生成包含标题/关键词/色板/AI 释义的卡片

#### Scenario: 保存卡片
- **WHEN** 用户点击保存
- **THEN** 卡片导出为 PNG 图片

### Requirement: 作品说明 - 技术流程展示
The system SHALL display the design methodology and technical workflow.

#### Scenario: 流程图展示
- **WHEN** 该章节进入视口
- **THEN** 技术流程图逐步绘制，各阶段说明浮现

## MODIFIED Requirements

### Requirement: 首页入场动画
现有入场动画保持不变，但需要在最后一页"进入"按钮添加滚动到下一章节的逻辑。

## REMOVED Requirements

### Requirement: 复杂 3D 模型展示
**Reason**: 保持轻量级，避免加载大型 GLB/GLTF 模型
**Migration**: 使用视频、图片序列、Canvas 2D 特效替代

### Requirement: TouchDesigner 实时控制器
**Reason**: 毕业设计展示不需要实时 TD 控制
**Migration**: 嵌入 TD 导出视频和截图作为展示

## 视觉原则（参考 persepolis.getty.edu）

- **色彩**: 暗色背景（#1a1a1a / #252525）+ 金色点缀（#d4a96a / #f6cea0）+ 纯白文字
- **字体**: 哥特体标题（ZiXinFangMengHuanGeTeTi）+ 衬线体正文（Noto Serif SC）
- **动效**: 慢速、克制、有呼吸感，重点表现"显影"概念
- **布局**: 大量留白、居中构图、单栏叙事
- **避免**: 廉价卡片堆叠、厚重投影、霓虹赛博、模板化渐变

## 技术约束

- 轻量级优先：视频 > Canvas 2D > WebGL > Three.js
- 单页应用，使用滚动触发（Intersection Observer + GSAP ScrollTrigger）
- 移动端适配：文字不溢出、按钮不重叠、简化特效
- AI 边界：明确区分"数字复彩推演"与"历史事实"
