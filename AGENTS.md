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

### KtCodegen 领域例外

`packages/kt-codegen` 迁移自锟钛既有参数自动代码核心，用户已明确决定其
公开领域类继续使用 `KtCodegen*`、函数使用 `ktCodegen*`、常量使用
`KT_CODEGEN_*`。该包名为 `@phoenix-wing/kt-codegen`，运行时身份使用
`kt.codegen.*`。此例外只适用于该兼容领域；其他 Phoenix Wing 公共 API
仍必须遵守上表的 `Pnw` 命名规则。

详细规则见 `docs/命名规则.md`。

## 项目定位

phoenix-wing 是 Phoenix 跨语言共享核心与 UI 底座。当前路线见 `docs/plan.md`，历史迁移决策由 `docs/document-manifest.json` 标记为 archived/superseded。

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

`packages/` npm workspace 与 Cargo workspace 已落地；继续遵循真实消费者驱动，不预建无消费者的包。

## 消费者本地联调（AI 强制）

Phoenix 三个开发仓库使用唯一的标准并列目录，目录名不得自行变体：

```text
phoenix/
├── phoenix-wing/
├── kt-auto-code/
└── phoenix-desk-tools/
```

- Auto Code 本地联调在 `kt-auto-code` 根运行 `pnpm dev`；AI 只构建和验证来源时运行 `pnpm ext:dev:prepare`。Registry 对照分别使用 `pnpm dev:registry` 或不启动 GUI 的 `pnpm ext:dev:registry:prepare`。
- Desk Tools 本地联调在 `phoenix-desk-tools` 根按目的运行 `pnpm dev`、`pnpm test:local-wing` 或 `pnpm build:local-wing`。Registry 对照使用对应的 `pnpm dev:registry`、`pnpm test:registry` 或 `pnpm build:registry`。
- 标准本地命令找不到同级 `../phoenix-wing` 时必须说明上述目录要求并停止；若只需验证已发布包，应提示并改用显式 Registry 命令。禁止静默回退，也禁止由 AI 另造路径分支绕过目录错误。
- 禁止运行 `pnpm link`，禁止写入 `link:`、`file:`、`workspace:` 本地依赖或 `pnpm.overrides`，禁止临时修改消费者 `pnpm-workspace.yaml`、`package.json`、`pnpm-lock.yaml`，禁止替换或编辑 `node_modules`。
- 本地联调成功只证明并列源码消费，不等于 npm tarball、Registry 或真实发布完成；不得因此修改 Wing 版本、标签或发布矩阵。

详细责任、命令与消费者验收入口见 `docs/本地验证方法.md`。

## 文档

- `docs/文档索引.md` — 当前文档唯一导航
- `docs/命名规则.md` — 命名规则详细说明
- `docs/naming-checklist.md` — 命名点检清单
- `docs/plan.md` — 当前路线和治理状态
- `docs/document-manifest.json` — 全量文档分类清单（由脚本生成）

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
