# @phoenix-wing/db-node

Phoenix 工作区 SQLite 的 Node.js adapter。当前实现使用 `node-sqlite3-wasm`，提供同步 `get/all/run/exec`、手动事务状态和幂等关闭。

本包只负责 Node 文件路径、连接与驱动适配；表结构、Schema 版本、DDL 哈希和兼容判定属于 `@phoenix-wing/workspace-schema`。浏览器、VS Code webview 和 Rust 不应依赖本包。

根包旧入口 `phoenix-wing/db/pnwDbAdapter` 仅作为迁移期 re-export；新代码直接依赖本包。
