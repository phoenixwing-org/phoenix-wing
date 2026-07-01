# phoenix-wing

Phoenix Wing 共享 TypeScript 工具库 — 纯逻辑 · Vue3 控件 · 壳层框架 · 算法

## 安装

```bash
npm install phoenix-wing
```

## 快速使用

详见 **[doc/快速使用.md](doc/快速使用.md)**

## 模块概览

| 分类 | 数量 | 说明 |
|------|------|------|
| 🧰 纯工具函数 | 7 | 异步进度、防抖、色彩方案、拖拽、存储等 |
| 🎨 Vue3 控件 | 5 | 模态框、选择对话框、组合输入框、进度浮层等 |
| 🏗 壳层布局组件 | 12 | Ribbon 工具栏、侧栏块、标签栏、欢迎页骨架等 |
| ⚙️ Composable/引擎 | 10 | 工作台引擎、URL 同步、属性表注册、侧栏布局等 |
| 📦 类型系统 | 6 | 属性面板、Ribbon 配置、工作台等类型定义 |
| 🗄 Store | 1 | 异步任务 Pinia store |

完整清单见 **[doc/overview.md](doc/overview.md)**

## 命名规则

所有公共 API 使用前缀防止冲突：

| 类型 | 前缀 | 示例 |
|------|------|------|
| Vue 组件 | `Pnw` | `PnwAppModalOverlay` |
| CSS 类名 | `pnw-` | `.pnw-modal-overlay` |
| 全局函数 | `pnw` | `pnwIsTerminal` |
| 类型 | `Pnw` | `PnwTaskKind` |
| 常量 | `PNW_` | `PNW_VERSION` |

详见 **[doc/命名规则.md](doc/命名规则.md)**

## 文档

| 文档 | 内容 |
|------|------|
| [doc/快速使用.md](doc/快速使用.md) | 各类 API 快速上手示例 |
| [doc/架构图.md](doc/架构图.md) | 壳层组件树和引擎清单 |
| [doc/overview.md](doc/overview.md) | 模块总览与 API 说明 |
| [doc/命名规则.md](doc/命名规则.md) | 命名规则、前缀对照、违规示例 |
| [doc/框架迁移计划.md](doc/框架迁移计划.md) | 壳层框架迁移计划 |
| [doc/naming-checklist.md](doc/naming-checklist.md) | 命名点检清单 |

## Peer Dependencies

- `vue` ^3.0（可选，仅使用控件时需要）
- `pinia` ^2.0 \|\| ^3.0（可选，仅使用 store 时需要）
- `element-plus` ^2.0（可选，部分控件需要）

## 相关项目

| 项目 | 地址 | 说明 |
|------|------|------|
| **phoenix-wing** | [Gitee](https://gitee.com/PhoenixWing321/phoenix-wing) | 本仓库 — 共享 TypeScript 工具库与壳层框架 |
| **phoenix-desk-tools** | [Gitee](https://gitee.com/PhoenixWing321/phoenix-desk-tools) | 源项目 — FreeCAD 桌面辅助工具，phoenix-wing 的提炼来源 |
| **phoenix-open-issue** | [Gitee](https://gitee.com/PhoenixWing321/phoenix-open-issue) | 应用案例 — 基于 phoenix-wing 框架搭建的 Open Issue 管理应用 |

## 许可

MIT
