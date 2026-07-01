# phoenix-wing 计划

## 项目定位

从 phoenix-desk-tools 提取可复用的 TypeScript 纯逻辑、Vue3 控件、算法，
做成独立 npm 包 `phoenix-wing`，供 Phoenix 生态多个项目共享。

## 核心理念

- 纯逻辑零框架依赖，可独立单测
- Vue3 控件通过 peerDependency 解耦
- 先小后大、先简后繁，每批迁移后立即在 desk-tools 验证

## 迁移策略

### Phase 1: 项目骨架 ✅
- `npm init` + package.json
- TypeScript 配置（NodeNext）
- 目录结构 + pnpm workspace

### Phase 2: 纯工具函数 ✅
- asyncProgress — 异步任务进度状态机
- scheduleDebounced — 防抖调度
- colorScheme — 色彩方案解析
- pointerDrag — 指针拖拽
- phoenixBrowserStorage — 浏览器存储

### Phase 3: Vue3 控件 ✅
- AppModalOverlay — 全屏模态框
- ChoiceDialogHost — 选择对话框
- ComboTextInput — 组合输入框
- ExpandCaret — 展开三角图标
- AsyncProgressOverlay — 任务进度浮层

### Phase 4: 类型系统 ✅
- pagePropertySchema — 属性表 schema 构建器
- pageProperties — 属性面板类型系统
- comboTypes — 下拉选项类型

### Phase 5: 验证 & 发布
- [x] desk-tools 导入验证 — `asyncTasks.ts` + `AsyncProgressOverlay.vue` build 通过
- [ ] npm publish v0.1.0

## 技术栈

- TypeScript ES2022 / NodeNext 模块解析
- 测试: Vitest
- Vue 3 / Pinia / Element Plus (peerDependencies)

## 仓库

- Gitee: https://gitee.com/PhoenixWing321/phoenix-wing
- npm: phoenix-wing
