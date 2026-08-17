# Phoenix Wing packages

- `@phoenix-wing/cad-core`：无宿主依赖的 CAD TypeScript 领域算法，首批包含 BOM 文件名推断与生成。
- `@phoenix-wing/cad-contracts`：CAD JSON、native protocol 与 provider 契约。
- `@phoenix-wing/cad-rust-source`：由消费端自行编译、由 Desk Tools 随安装包发布的 Rust 真源。
- `@phoenix-wing/db-node`：Node.js SQLite 连接与驱动 adapter；旧根入口仅兼容 re-export。
- `@phoenix-wing/git-core`：宿主无关的 commit 摘要、连续区间校验与 squash 计划。
- `@phoenix-wing/git-node`：Node 22 Git CLI、仓库读取、隔离 worktree 与原子 ref 事务。
- `@phoenix-wing/run-core`：宿主无关的 Run 项目/目标模型、CAA/CMake 分类与平台计划。
- `@phoenix-wing/run-node`：Node 22 脚本、可执行文件、JSONC Task 发现与内置 runner launch plan。
- `@phoenix-wing/workspace-schema`：跨宿主工作区数据库 Schema 真源。
- `@phoenix-wing/kt-codegen`：共享参数模型、旧17列 CSV/v4 JSON 兼容，以及 CAA、Qt、普通 C++ 的32类参数驱动生成规则。

本目录承载 Phoenix Wing 的按需 npm 子包。迁移期仓库根目录仍是可发布的 `phoenix-wing` 兼容包，不移动现有 `src/` 和 Vue SFC。

计划中的子包及实施顺序以 [`docs/跨语言多包架构与三库迁移计划.md`](../docs/跨语言多包架构与三库迁移计划.md) 为准：

1. 白名单提取 `core`、`code-core`，建立稳定 JS/`.d.ts` 构建；
2. 增加 `cad-contracts`、`cad-core`；
3. 增加 `cad-rust-source` Cargo workspace；
4. `workspace-schema` 已冻结生产 v13 组合 DDL，`db-node` adapter 已拆分并由 Desk 直接消费，`fcstd-query` 已绑定 v13/DDL 哈希并迁入 Rust source 包；
5. 最后迁移 `ui-vue`，继续兼容旧根入口。

禁止为占位一次性创建全部空包。每个目录必须同时具备真实消费者、精确 exports、测试和 tarball 验收。
