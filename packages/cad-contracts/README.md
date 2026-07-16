# @phoenix-wing/cad-contracts

Phoenix CAD 跨宿主、跨语言的 JSON 协议与 DTO。包内不依赖 Vue、Node、VS Code、Tauri 或数据库驱动。

- 当前先冻结 Desk Tools 已发布行为：`desk-tools-v0` 裸 `FcstdDocument`。
- legacy 字段混用 `typeId`、`isValidBomItem` 与 `root_names`，这是兼容事实，不是新命名规范。
- `schemas/` 与 `fixtures/` 共同锁定 legacy 输出；Rust 等价迁入不得顺带改字段。
- `phoenix-cad-native` v1 提供 snake_case 成功/错误 envelope，以及 `--protocol-version` 能力查询。
- v1 首期只开放无写盘的 `fcstd-read/read` 和 `fcstd-xlink/scan`；legacy 入口保持不变。
- `pnwQueryCadWorkspaceSummaryV1` 提供无数据库驱动的 Schema v13 BOM/引用只读查询核心；VS Code 可接 `node:sqlite`，Desk 可接 `db-node`，Rust CLI 继续用同一 fixture 验证结果契约。

本基线只冻结 `fcstd-read` 成功读取时输出的裸 `FcstdDocument`。`write-bom`、`fcstd-xlink` 的 scan/patch 命令、错误文本和退出码仍是未版本化 legacy 行为；`PNW_CAD_LEGACY_NATIVE_TOOLS` 只列出来源中已有的 native tools，不表示这些命令都已有稳定契约。

v1 跨语言 JSON 统一使用 snake_case；兼容的 minor 版本可增加可选字段，因此 Schema 和 runtime guard 会保留未知字段。删除字段、修改含义或改变必填性必须提升协议主版本。

`native-provider-v1` 统一 Desk Tools 安装资源与 thin CAD 插件之间的发现清单：除 native tool 路径、哈希和能力外，还必须声明 Wing workspace Schema ID、版本、DDL SHA-256 和数据库文件名。生成端与消费端都必须运行同一个 `pnwIsCadNativeProviderManifestV1` guard，宿主再额外校验平台和自己支持的精确 Schema。

```bash
fcstd-read --protocol-version
fcstd-read --protocol 1 read <file.fcstd>
fcstd-xlink --protocol 1 scan <Document.xml|-> <target_basename>
```

消费者先读取 `--protocol-version`，确认 `protocol === "phoenix-cad-native"`，再从自身支持集合与 `supported_protocol_majors` 的交集中选择主版本。`protocol_version` 是工具当前首选版本，不代表它只支持这个版本；能力以返回的 `capabilities` 为准，不能仅凭二进制文件名猜测。
