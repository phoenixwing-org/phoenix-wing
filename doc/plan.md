# phoenix-wing 计划

## 项目定位

从 phoenix-desk-tools 提取可复用的 TypeScript 纯逻辑、Vue3 控件、算法，
做成独立 npm 包 `phoenix-wing`，供 Phoenix 生态多个项目共享。

## 核心理念

- 纯逻辑零框架依赖，可独立单测
- Vue3 控件通过 peerDependency 解耦
- 先小后大、先简后繁，每批迁移后立即在 desk-tools 验证
- **组件要做到自包含**，使用者只需 `import` 即可，不应需要额外配置 CSS 或了解内部类名

## 命名规范

详见 **[doc/命名规则.md](命名规则.md)** — 完整规则、前缀对照表、违规示例。

---

## 迁移策略（已全部完成）

### Phase 1: 项目骨架 ✅
- `npm init` + package.json
- TypeScript 配置（NodeNext）
- 目录结构 + pnpm workspace

### Phase 2: 纯工具函数 ✅
- pnwCreateScanTaskState, pnwCreateTestTaskState — 异步进度工厂
- pnwScheduleDebounced — 防抖
- pnwResolveColorScheme, pnwApplyColorScheme — 色彩方案
- pnwBindPointerDrag — 拖拽
- pnwClearPhoenixBrowserStorage — 存储清理

### Phase 3: Vue3 控件 ✅
- PnwAppModalOverlay — 全屏模态框
- PnwChoiceDialogHost — 选择对话框
- PnwComboTextInput — 组合输入框
- PnwExpandCaret — 展开三角图标
- PnwAsyncProgressOverlay — 任务进度浮层

### Phase 4: 类型系统 ✅
- pnwPropGroup, pnwPropBool, pnwPropEnum 等 — 属性表 schema
- PnwPagePropertyField, PnwPagePropertyGroup 等 — 属性面板类型
- PnwComboOption — 下拉选项类型

### Phase 5: 命名前缀 ✅
- 全部命名加 Pnw/pnw/pnw-/PNW_ 前缀
- desk-tools 全部 import 适配
- 对话框统一为 pnwPromptChoice

### Phase 6-8: 壳层框架 ✅
- PnwSidebarBlock, PnwSidebarBlockHead, PnwRibbonShell, PnwRibbonTabBar, PnwRibbonGroup, PnwRibbonToolButton, PnwRibbonUtilButton
- PnwPageHeader, PnwShellLogPanel, PnwWorkbenchTabBar, PnwWelcomeShell
- pnwCreateWorkbench, usePnwRibbonTabs, pnwRibbonIcons, pnwShellUrlSync
- pnwSideDockLayout, usePnwDocumentTitle, usePnwResizableTable
- pnwPagePropertiesHost, usePnwPagePropertySheet
- PnwRibbonConfig 类型, PnwWorkbench 类型

### Phase 9: 发布
- [ ] npm publish v0.1.0

---

## 技术栈

- TypeScript ES2022 / NodeNext 模块解析
- 测试: Vitest
- Vue 3 / Pinia / Element Plus (peerDependencies)

## 仓库

- Gitee: https://gitee.com/PhoenixWing321/phoenix-wing
- npm: phoenix-wing
