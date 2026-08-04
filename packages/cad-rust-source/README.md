# @phoenix-wing/cad-rust-source

Phoenix CAD 的 Rust 源码发布包。它只随 npm 分发源码、Cargo workspace、统一锁文件和协议定位信息；没有 `postinstall`，不会在安装或应用激活时编译。

> 支持状态：**兼容冻结**。在出现明确的维护所有者和真实消费者支持决策前，本包只随
> Wing 锁步发布保留既有安装、构建与协议兼容，不再主动增加功能，也不推荐新的产品
> 依赖。0.6.2 对 package/source manifest/Cargo lock 的版本同步仅修正发布身份，不表示
> 重启 Rust 能力演进。移除发布单元或在 npm 标记 deprecated 需要单独的破坏性变更决策。

消费端通过 `@phoenix-wing/cad-rust-source/source-manifest.json` 定位 Cargo manifest，并在自身构建阶段执行：

```bash
CARGO_TARGET_DIR=<consumer-cache> cargo build --release --locked \
  --manifest-path <resolved-package>/Cargo.toml
```

当前 source manifest Schema 为 v4：`legacy_protocol` 描述兼容入口，`native_protocol` 描述 `phoenix-cad-native` v1，`database_query_protocol` 描述绑定 workspace Schema v13 的 `phoenix-cad-query` v1，`database_tools` 声明可由产品选择发布的查询 CLI。构建脚本必须分别校验 manifest Schema 与各协议主版本。

`parity_fixtures` 把真实 FreeCAD `Document.xml`、read/scan 参数和 `@phoenix-wing/cad-contracts` golden JSON 绑定在一起。产品构建 native tools 后必须临时生成 FCStd、执行 read/scan，并比较稳定摘要或完整协议输出，避免 Rust 与 TypeScript guard 各自通过却彼此漂移。

当前真源包含 `fcstd-reader`、`fcstd-xlink`、生成 `fcstd-read` 的 `fcstd-cli`，以及 `fcstd-query`。查询 CLI 只接受参数化筛选，执行任何命令前检查 `phoenix_meta.schema_version = 13`；`--contract` 可读取协议版本、Schema ID、版本和固定 DDL 哈希。共同 SQL fixture 位于 `fixtures/database/query-v13.sql`。

共享的 `phoenix-cad-protocol` crate 定义 `phoenix-cad-native` v1 发现信息和 success/error envelope。消费端可先查询工具能力：

```bash
fcstd-read --protocol-version
fcstd-xlink --protocol-version
```

发现信息中的 `protocol_version` 是工具首选版本，不等于唯一可接受版本；`supported_protocol_majors` 才是工具支持的主版本集合。客户端必须用自身支持集合与该数组求交集，并从交集中选择双方可用的主版本；没有交集时停止调用，不能仅因首选版本不同就误判不兼容。source manifest 的 `native_protocol.version` 同样表示首选版本，`supported_protocol_majors` 表示支持集合，`version_query_args` 给出能力查询参数。

再显式调用只读 v1 操作：

```bash
fcstd-read --protocol 1 read <file.fcstd>
fcstd-xlink --protocol 1 scan <xml_file|-> <target_basename>
```

v1 的 stdout 始终只有一个 JSON 值，失败诊断写入 stderr 并返回非零退出码。发现信息使用 `protocol_version`；调用 envelope 包含 `tool`、`operation` 和 `ok`，成功载荷放在 `result`，错误包含 `code`、`message` 与 `retryable: false`。即便正常载荷序列化失败，CLI 也会在 stdout 返回 `internal_error` JSON、把诊断写入 stderr 并以 70 退出。空 operation 统一报告为 `unknown`。

`fcstd-read` 的 v1 document 字段统一为 snake_case，并拒绝 placement 七个分量或浮点属性中的 NaN/Infinity，返回 `invalid_numeric_value`；legacy 裸输出路径不做此新增校验。写 BOM、patch 与 patch-labels 不暴露给 v1。

原有裸参数、`write-bom`、`scan`、`patch` 与 `patch-labels` 入口继续存在。首个迁入版本逐文件等价复制 Desk Tools Rust 算法源码，并携带两份真实 `Document.xml` 基线；统一 `Cargo.lock` 则按原 manifest 约束重新解析。BOM mount 与嵌套 PropertyXLink 的已知 parity 差异记录在 `MIGRATION.md`；在 CLI golden/parity 与后续独立修复通过前，不宣称依赖解析、二进制行为或 Python 全量等价。

最终用户只接收产品构建阶段生成并打入 VSIX/Tauri resources 的平台二进制，不需要 Cargo 或 Node.js。
