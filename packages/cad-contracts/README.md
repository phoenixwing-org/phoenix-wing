# @phoenix-wing/cad-contracts

Phoenix CAD 跨宿主、跨语言的 JSON 协议与 DTO。包内不依赖 Vue、Node、VS Code、Tauri 或数据库驱动。

当前 CAD 实现为 TypeScript。下述 native/provider v1 是历史数据与消费者的兼容契约，不代表 Wing 仍提供 Rust/Python CAD 后端或这些 CLI 的安装包。

- 当前先冻结已发布兼容协议：`desk-tools-v0` 裸 `FcstdDocument`。
- legacy 字段混用 `typeId`、`isValidBomItem` 与 `root_names`，这是兼容事实，不是新命名规范。
- `schemas/` 与 `fixtures/` 共同锁定 legacy 输出；兼容维护不得顺带改字段。
- `phoenix-cad-native` v1 提供 snake_case 成功/错误 envelope，以及 `--protocol-version` 能力查询。
- v1 首期只开放无写盘的 `fcstd-read/read` 和 `fcstd-xlink/scan`；legacy 入口保持不变。
- `pnwQueryCadWorkspaceSummaryV1` 提供无数据库驱动的 Schema v13 BOM/引用只读查询核心；宿主可接 `node:sqlite` 或 `db-node`，SQL 测试夹具由本包持有，不再跨目录依赖已退役的原生实现。

本基线只冻结 `fcstd-read` 成功读取时输出的裸 `FcstdDocument`。`write-bom`、`fcstd-xlink` 的 scan/patch 命令、错误文本和退出码仍是未版本化 legacy 行为；`PNW_CAD_LEGACY_NATIVE_TOOLS` 只列出来源中已有的 native tools，不表示这些命令都已有稳定契约。

v1 跨语言 JSON 统一使用 snake_case；兼容的 minor 版本可增加可选字段，因此 Schema 和 runtime guard 会保留未知字段。删除字段、修改含义或改变必填性必须提升协议主版本。

`native-provider-v1` 统一桌面安装资源与 thin CAD 插件之间的发现清单：除 native tool 路径、哈希和能力外，还必须声明 Wing workspace Schema ID、版本、DDL SHA-256 和数据库文件名。生成端与消费端都必须运行同一个 `pnwIsCadNativeProviderManifestV1` guard，宿主再额外校验平台和自己支持的精确 Schema。

```bash
fcstd-read --protocol-version
fcstd-read --protocol 1 read <file.fcstd>
fcstd-xlink --protocol 1 scan <Document.xml|-> <target_basename>
```

消费者先读取 `--protocol-version`，确认 `protocol === "phoenix-cad-native"`，再从自身支持集合与 `supported_protocol_majors` 的交集中选择主版本。`protocol_version` 是工具当前首选版本，不代表它只支持这个版本；能力以返回的 `capabilities` 为准，不能仅凭二进制文件名猜测。

## 共享索引事务候选

`pnwReadCadIndexRevisionV1` 在发现文件前读取代数；`pnwWriteCadWorkspaceIndexV1` 接收
cad-core 的完整计划及同步 SQLite port（exec/get/all/run）。当前仅支持 `scope=workspace`、
`complete=true`，不接受局部目录伪装全量。宿主负责目录发现、ZIP 读取、文件身份、取消和权限，
通过 `assertCurrent` 在事务内复核；本包没有 Node/驱动/GUI 依赖，也不执行建库或 Schema 迁移。

writer 使用 `BEGIN IMMEDIATE` 与预期代数共同防止跨宿主过期提交。失败整批回滚；普通刷新
保留人工 PartKey 字段、已有关联和忽略状态，范围外资产不动；缺失文件仅标记。历史 `./` 身份
可以沿用，多个别名指向同一路径则拒绝提交，不能自动删除冲突记录。

引用的 `rule_label` 由共享标签规则按目标属性生成，与原实例 `link_label` 分开保存；
`ts-light-index` 只用于扫描阶段，不得作为业务标签。旧候选曾误写该占位值的索引，
使用修复后的 writer 正常全量更新即可重新生成，无需先清理数据库或改写 CAD 文件。

前提是 Host 数据库连接使用互相兼容的锁协议：WASM SQLite 的目录锁与原生 SQLite 的 OS 锁
并不等价，混合驱动宿主必须在 adapter 层协调所有连接，不能仅依赖本函数的事务 SQL。

`pnwPreviewCadIndexResetV1` / `pnwResetCadWorkspaceIndexV1` 是独立的显式清理协议：要求
确认删除文件关联、核对预览计数/代数，并在写锁内先调用 Host 的可恢复备份回调。清空 CAD
文件资产、所有文件关联（含人工关联）、派生引用/BOM 与扫描历史；保留 PartKey 资料、偏好、
审计及其他模块表。审计中指向已删除资产的外键按 Schema 置空，审计记录仍保留。清理后写入
新的 `cleared` 代数，阻止之前的扫描提交。任何失败回滚；备份由 Host 保存和恢复，不删除整库。

这些是 TypeScript/SQLite 候选 API，不扩展 native JSON 协议。正式发布前必须跑实际 tarball
隔离消费；当前 manifest 版本不表示新增 API 已进入 Registry。

## 开源样本来源：phoenix-freecad-study

2026-10-07 核对本地检出的 [phoenix-freecad-study](https://gitee.com/PhoenixWing321/phoenix-freecad-study)；仓库许可证为 MIT，版权声明为 Copyright (c) 2026 Phoenix，随本包保留于 [LICENSE.phoenix-freecad-study.txt](LICENSE.phoenix-freecad-study.txt)。维护者已明确确认 8008.001、8003.001 等为此开源学习项目的样本，不是用户私有业务工程；不能仅因含零件编号、装配结构或来自真实 FreeCAD 文件就判为隐私泄露。

- `native-xlink-real-success-v1.json` 来自 8003 滑轨图纸学习示例。本地检出基线 `a0bf6df` 包含该图纸；旧 XML 与其对象标识/类型一致，链接字段曾适配。
- `native-read-real-summary-v1.json` 来自 8008 内部装配学习示例。核对到同一学习仓库的本地备份，对象标识/类型与旧 XML 一致；标签/可见性有差异。8008 独立文件不在所核对的 `a0bf6df` 跟踪树中，因此不宣称该份派生 XML 与某个远端提交逐字节相同；学习项目来源和可公开用途由维护者确认。
- 两份 JSON 作为已经导出的兼容夹具保留原始字节与字段；`source_fixture` 为历史来源标识，不再是当前可读取的仓内文件路径。完整 XML 随 Rust source 技术路线退役移除，而非因开源样本涉及隐私。
- 本次未改写该学习仓库或其本地文件；新测试优先使用独立最小样本。其他工程、路径和夹具仍须分别核对，不能把本条当作所有个人工程的公开授权。

核验依据为本地许可证、Git 跟踪文件、对象结构比对和维护者确认；本轮远端页面读取不可用，未冒称完成远端可见性复核。
