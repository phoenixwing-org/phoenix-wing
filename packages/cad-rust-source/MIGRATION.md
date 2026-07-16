# 迁移来源

首批 crate 从 `phoenix-desk-tools/server` 等价复制，用于建立 Wing 真源；Desk Tools 在切换构建脚本和 parity 测试前暂时保留兼容副本。

冻结来源提交：`phoenix-desk-tools@676bdd09db1dec7e1d6007bd5ad2315a4aa7e607`。迁入时逐文件 SHA-256 已核对一致；Cargo workspace 与统一 `Cargo.lock` 是 Wing 新增的发布结构，不属于源码算法改动。

三个 Desk 子目录原本没有共同锁文件，Wing 的统一 `Cargo.lock` 按原 Cargo manifest 约束重新解析，并不等于旧锁文件的逐项并集。因此本提交只声明“Rust 源码等价复制”，不声明依赖解析、二进制哈希或全量运行行为等价；后者必须由 CLI golden/parity 测试和多平台构建另行证明。

- `server/fcstd-reader` → `crates/fcstd-reader`
- `server/fcstd-xlink` → `crates/fcstd-xlink`
- `server/cli` → `crates/fcstd-cli`
- `server/fcstd-query` → `crates/fcstd-query`（迁移时固定 `phoenix-cad-query` v1，并绑定 workspace Schema v13）

算法迁入提交不得顺带改变 FCStd/XLink legacy 行为。Wing CLI 层新增共享的 `phoenix-cad-protocol` crate、`--protocol-version` 能力查询以及显式 `--protocol 1` 分派；原入口仍走原实现。

`source-manifest.json` 的 manifest Schema 当前为 v4：`legacy_protocol` 继续记录 `desk-tools-v0` mixed-case 事实，`native_protocol` 声明 FCStd/XLink v1，`database_query_protocol` 声明查询协议与 workspace Schema v13 身份，`database_tools` 固定 `fcstd-query` 的构建包、发现参数和能力。消费端必须先检查 manifest `schema_version`，不能把任一协议主版本误当作 manifest Schema 版本。

## Database query protocol v1

- 协议名：`phoenix-cad-query`，版本 `{ "major": 1, "minor": 0 }`。
- `fcstd-query --contract` 输出协议、命令集合及 `phoenix-workspace` v13 DDL SHA-256。
- 所有查询条件使用 SQLite 参数绑定，不接受宿主拼接 SQL 片段。
- 任一命令（包括 `file-upsert`）执行前读取 `phoenix_meta.schema_version`；不是 v13 时拒绝执行，避免旧库被新协议写入。
- `fixtures/database/query-v13.sql` 是 Rust、Desk Tools 与后续 Auto CAD parity 的共同最小数据库 fixture。

## Native protocol v1

- 协议名：`phoenix-cad-native`，版本 `{ "major": 1, "minor": 0 }`。
- `protocol_version` 表示首选版本，`supported_protocol_majors` 表示实际支持的主版本；客户端必须取双方 majors 交集后再选择调用版本。
- `fcstd-read` 的 v1 能力只有 `read`；成功 `result` 是 snake_case `FcstdDocument`。
- `fcstd-xlink` 的 v1 能力只有 `scan`。
- v1 success/error 使用同一顶层 envelope；stdout 只输出 JSON，诊断写入 stderr，失败使用非零退出码。
- `write-bom`、`patch`、`patch-labels` 只保留在 legacy 入口；v1 返回 `unsupported_operation`，不会执行写入。

`fcstd-read` 把 legacy `FcstdError` 稳定映射为 `io_error`、`invalid_fcstd_archive`、`missing_document_xml` 或 `invalid_document_xml`。协议主版本不支持时返回 `unsupported_protocol`，参数数量错误返回 `invalid_arguments`；所有当前错误都标记为 `retryable: false`。

v1 DTO 转换会逐一检查 placement 的 `x/y/z/q0/q1/q2/q3` 和所有浮点属性，NaN/Infinity 返回 `invalid_numeric_value`，不会进入 JSON success envelope；该校验不改变 legacy 路径。空 operation 归一为 `unknown`。正常响应若意外序列化失败，公共协议层生成固定的 `internal_error` envelope，CLI 保证 stdout 仍是 JSON、stderr 保留诊断并以 70 退出。

协议层集成测试直接执行两个 CLI，同时检查 legacy read/scan 仍输出原始裸 JSON。Desk Tools 完成能力探测与 envelope 消费前不得删除旧调用路径。

## 真实 fixture 基线

以下文件从同一 Desk Tools 提交复制，并核对 SHA-256：

- `073a643ddfd23dee161a2896f29fc5735dd31926e3b25a09d5ef31b3c8a47ee7` — `内部装配示例-Document.xml`
- `99f37e6a700f9104c1ce9eb575c41ee9b97e77c5fe0f5245be39567e903e7597` — `图纸-通过link来创建-Document.xml`

基线测试会诚实冻结两个已知差异：legacy reader 会先把 `Part::Feature` 视为 BOM item，且暂时漏掉嵌套 `App::PropertyXLink`。这两项必须在独立 parity 修复提交中解决，修复前 Desk Tools 不删除 Python/Node 参照实现。
