# phoenix-wing

Phoenix Wing 跨语言共享核心与 UI 底座 — TypeScript 多包 · Rust CAD 源码 · Vue3 控件 · 壳层框架

## 按需安装

```bash
npm install @phoenix-wing/code-core
npm install @phoenix-wing/kt-codegen
npm install @phoenix-wing/cad-contracts @phoenix-wing/cad-core
npm install @phoenix-wing/workspace-schema
npm install phoenix-wing vue pinia
```

只有 Desk Web UI 或旧消费者需要 Vue 聚合包时才安装 `phoenix-wing`。参数驱动 CAA/Qt/C++ 代码生成使用 `@phoenix-wing/kt-codegen`。Node SQLite adapter 单独安装 `@phoenix-wing/db-node`；构建 Desk native tools 时单独安装 `@phoenix-wing/cad-rust-source`。`cad-contracts` 还提供无驱动的 Schema v13 只读查询核心，VS Code 可接宿主内置 SQLite 而不安装 Desk Tools。纯 Code/CAD/Codegen 小包不会带入 Vue、Element Plus、SQLite 或 Rust 二进制。

`phoenix-wing` 聚合 UI 只发布 `dist` 编译产物。根入口和保留的 `.vue` 兼容子路径均落到同一份 JavaScript 模块图，避免 Vite 分别预构建根入口与源码 SFC 时产生 Vue/Pinia singleton 双实例。新代码优先使用根入口的命名导出；组件样式由编译入口自动加载。

跨宿主兼容性不依靠 npm 版本猜测：KtCodegen Plan、Ribbon contribution、workspace schema、CAD native/provider/query 都有独立的 schema/protocol 版本与运行时拒绝门禁。Canonical fixtures 随对应 npm 包发布，产品仓直接导入同一 Registry fixture，只保留宿主 adapter，不再维护消费副本。

单仓 CI 使用 `pnpm verify:ci`，只依赖 Wing checkout；多消费者联调按
[消费者本地联调与验证](docs/本地验证方法.md)分别运行各产品的受控 local/Registry 命令。
仓库没有一个会静默修改消费者依赖图的通用 `verify:consumers` 命令。

## 消费者本地联调

Phoenix 消费者统一使用 `pnpm dev` 启动 Registry Wing，使用 `pnpm wing` 启动同级 `../phoenix-wing` 本地源码；旧的根级 `pnpm dev:registry` 和本地开发同义命令均删除。找不到同级 Wing 时本地命令必须停止，不会回退 Registry，也不需要 `pnpm link` 或修改依赖文件。未完成 Wing 修改放在独立 working worktree，验证、提交归档并提升到主库 `develop` 后，其他目录可通过文件系统目录链接把同级 `phoenix-wing` 指向该主库。

正式 npm 包行为必须另跑显式 Registry 对照命令。完整目录、命令、安全边界与消费者验收入口见 **[docs/本地验证方法.md](docs/本地验证方法.md)**。

## 快速使用

详见 **[docs/快速使用.md](docs/快速使用.md)**

## 模块概览

| 分类 | 数量 | 说明 |
|------|------|------|
| 🧰 纯工具函数 | 7 | 异步进度、防抖、色彩方案、拖拽、存储等 |
| 🎨 Vue3 控件 | 5 | 模态框、选择对话框、组合输入框、进度浮层等 |
| 🏗 壳层布局组件 | 12 | Ribbon 工具栏、侧栏块、标签栏、欢迎页骨架等 |
| ⚙️ Composable/引擎 | 10 | 工作台引擎、URL 同步、属性表注册、侧栏布局等 |
| 📦 类型系统 | 6 | 属性面板、Ribbon 配置、工作台等类型定义 |
| 🗄 Store | 1 | 异步任务 Pinia store |

当前模块与发布单元入口见 **[docs/文档索引.md](docs/文档索引.md)**。

## 命名规则

所有公共 API 使用前缀防止冲突：

| 类型 | 前缀 | 示例 |
|------|------|------|
| Vue 组件 | `Pnw` | `PnwAppModalOverlay` |
| CSS 类名 | `pnw-` | `.pnw-modal-overlay` |
| 全局函数 | `pnw` | `pnwIsTerminal` |
| 类型 | `Pnw` | `PnwTaskKind` |
| 常量 | `PNW_` | `PNW_VERSION` |
| KtCodegen 领域 API | `KtCodegen` / `ktCodegen` / `KT_CODEGEN_` | `KtCodegenParam` |

`KtCodegen` 是参数代码生成领域的显式命名例外；其余 Phoenix Wing 公共 API 继续遵守 `Pnw` 前缀。

详见 **[docs/命名规则.md](docs/命名规则.md)**

## 文档

| 文档 | 内容 |
|------|------|
| [docs/文档索引.md](docs/文档索引.md) | 当前文档唯一导航、历史资料入口与维护责任 |
| [docs/快速使用.md](docs/快速使用.md) | 各类 API 快速上手示例 |
| [docs/本地验证方法.md](docs/本地验证方法.md) | 三仓并列目录、Auto/Desk 本地 Wing 命令与 Registry 对照边界 |
| [docs/架构图.md](docs/架构图.md) | 壳层组件树和引擎清单 |
| [docs/plan.md](docs/plan.md) | 当前路线、已完成基线和后续治理顺序 |
| [docs/命名规则.md](docs/命名规则.md) | 命名规则、前缀对照、违规示例 |
| [docs/naming-checklist.md](docs/naming-checklist.md) | 命名点检清单 |
| [docs/三库版本矩阵.md](docs/三库版本矩阵.md) | Wing 各发布物精确版本、消费端允许依赖与发布门禁 |
| [docs/独立版本发布规则.md](docs/独立版本发布规则.md) | 0.6.4 起按真实改动确定版本、依赖和发布集合 |
| [docs/C++成员排序算法规范.md](docs/C++成员排序算法规范.md) | `code-core` 成员排序的唯一算法规范、锁定规则与回归契约 |
| [packages/kt-codegen/README.md](packages/kt-codegen/README.md) | `kt-codegen` 数据模型、17列兼容、32个生成块与类图 |

## Peer Dependencies

- `vue` ^3.0（可选，仅使用控件时需要）
- `pinia` ^2.0 \|\| ^3.0（可选，仅使用 store 时需要）
- `element-plus` ^2.0（可选，部分控件需要）

## 相关项目

| 项目 | 地址 | 说明 |
|------|------|------|
| **phoenix-wing** | [Gitee](https://gitee.com/phoenixwing/phoenix-wing) | 本仓库 — 共享 TypeScript 工具库与壳层框架 |
| **phoenix-desk-tools** | [Gitee](https://gitee.com/phoenixwing/phoenix-desk-tools) | 源项目 — FreeCAD 桌面辅助工具，phoenix-wing 的提炼来源 |
| **kt-auto-code** | [Gitee](https://gitee.com/phoenixwing/kt-auto-code) | VS Code 自动化扩展，按需消费 `@phoenix-wing/code-core` 的成员排序、UUID 与工作集能力 |
| **phoenix-open-issue** | [Gitee](https://gitee.com/phoenixwing/phoenix-open-issue) | 应用案例 — 基于 phoenix-wing 框架搭建的 Open Issue 管理应用 |

## 许可

Copyright © 2024–2026 凤凰之翼（PhoenixWing）贡献者。项目使用
[Apache License 2.0](LICENSE) 开源。
