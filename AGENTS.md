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

## 项目定位

phoenix-wing 正在从单一 TypeScript/Vue npm 包升级为 Phoenix 跨语言共享核心与 UI 底座。权威路线见 `doc/跨语言多包架构与三库迁移计划.md`。

- 仓库根 `phoenix-wing` 在迁移期仍是兼容发布包，禁止直接改成 private 或一次性搬走 Vue SFC。
- 新 npm 子包必须输出稳定 JavaScript 和 `.d.ts`；源码直出只允许作为旧聚合包兼容行为。
- Rust source 包只发布源码和锁文件，禁止 npm `postinstall` 或运行时自动编译。
- `core` 采用白名单迁移；依赖 DOM、Vue、Node 或产品宿主的模块不得放入无框架 core。

## 当前项目结构

- `src/components/` — Vue3 通用控件
- `src/layout/` — 壳层布局组件（Ribbon、Sidebar、TabBar 等）
- `src/composables/` — 框架级 composable（Workbench、RibbonTabs、ShellUrlSync 等）
- `src/utils/` — 纯工具函数（零框架依赖）
- `src/types/` — TypeScript 类型定义
- `src/stores/` — Pinia stores

目标新增 `packages/` npm workspace 与 Cargo workspace；实施前以总计划的阶段门禁为准，不预建无真实消费者的包。

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
- Rust 2021+ / Cargo workspace（CAD source 包；构建阶段使用 `--locked`）

## Rust 与协议命名

- Rust crate/binary 使用 kebab-case，如 `fcstd-reader`、`fcstd-xlink`。
- 跨语言 JSON 字段使用 snake_case，并由版本化 JSON Schema 固定。
- CLI stdout 只输出协议 JSON，诊断写 stderr；写盘命令必须支持协议版本检查。
- 产品路径发现、VS Code/Tauri/Hono API 不得进入 Rust 领域 crate。
