# AGENTS.md — phoenix-wing

## 命名规则（强制）

phoenix-wing 是发布到 npm 的公共库，所有对外暴露的名称必须加前缀防止冲突：

| 类型 | 前缀 | 示例 |
|------|------|------|
| Vue 组件 | `Pnw` | `PnwAppModalOverlay` |
| CSS 类名 | `pnw-` | `.pnw-modal-overlay` |
| 全局函数 | `pnw` | `pnwIsTerminal` |
| Composables | `usePnw` | `usePnwDocumentTitle` |
| 全局类型 | `Pnw` | `PnwTaskKind` |
| 全局常量 | `PNW_` | `PNW_VERSION` |
| Store | `usePnw` | `usePnwAsyncTaskStore` |

**规则：从第一行代码就用前缀。禁止先写通用名再批量改名。**

详细规则见 `doc/命名规则.md`。

## 项目结构

- `src/components/` — Vue3 通用控件
- `src/layout/` — 壳层布局组件（Ribbon、Sidebar、TabBar 等）
- `src/composables/` — 框架级 composable（Workbench、RibbonTabs、ShellUrlSync 等）
- `src/utils/` — 纯工具函数（零框架依赖）
- `src/types/` — TypeScript 类型定义
- `src/stores/` — Pinia stores

## 文档

- `doc/overview.md` — 模块总览
- `doc/命名规则.md` — 命名规则详细说明
- `doc/naming-checklist.md` — 命名点检清单
- `doc/框架迁移计划.md` — 壳层框架迁移计划
- `doc/plan.md` — 项目计划
- `TODO.md` — 代办清单

## 技术栈

- TypeScript ES2022 / NodeNext（import 必须带 `.js` 后缀）
- Vue 3 / Pinia / Element Plus（均为 peerDependencies）
- Vitest 测试
- pnpm workspace
