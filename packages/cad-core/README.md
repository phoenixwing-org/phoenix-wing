# @phoenix-wing/cad-core

Phoenix CAD 可跨宿主复用的纯 TypeScript 领域算法。包内不依赖 Vue、Element Plus、Node、VS Code、Tauri、数据库驱动或平台二进制。

首批 API 固化 FreeCAD BOM 文件名规则：

- 从 `.FCStd`、`.ASSY.FCStd`、`.Drawing.FCStd` 文件名推断 BOM 字段；
- 判定 Part、Assembly、Drawing 文档类型；
- 生成 BOM 标签和推荐文件名；
- 规范化工作区相对路径并阻止路径越界。
- 从 FreeCAD `Document.xml` 提取、去重 XLink，选择 Object Label、解码 XML entity。
- 在宿主提供文件存在性结果后，纯计算 XLink 目标的 direct/self/missing/ambiguous 状态，并复用相同的目录、三位项目版本和标签回退规则。
- 从宿主查询出的边数组计算 direct/indirect 入向引用、`via_chain` 和受循环保护的装配树 ViewModel。

消费者直接消费本包，宿主层只负责文件系统、数据库、native provider 与界面交互。

推荐文件名只追加一次所选标准文档后缀：当 PartName（或其 Label 回退值）末尾已经有
匹配的 `.ASSY`、`.Drawing` 或 `.FCStd` 标记时，在生成结果中去重，大小写不敏感。
不改写传入的属性，不裁剪名称内部的点号/连字符，不删除与所选文档类型不匹配的标记；
自定义后缀仍按调用方原样处理。修正推荐结果不等于磁盘文件已经改名。

## 共享索引候选 API

- `pnwAnalyzeCadIndexDocumentXml(xml)`：有界检查 XML 结构后输出对象数量、XLink 和内嵌 BOM 字段；不读取 ZIP，不启动几何引擎。拒绝 DTD、损坏结构和超限文档，不是通用 XML 解析器。
- `pnwBuildCadWorkspaceIndex(records)`：从完整文件快照生成只读文件/引用/基础 BOM 计划，复用文件名推断和 XLink 解析；内嵌非空字段优先。歧义目标保留候选，不擅自选择写入对象。
- `pnwCadIndexRelativePath` / `pnwCadIndexIncludesPath` / `PNW_CAD_INDEX_EXCLUDED_DIRECTORIES`：统一安全相对路径与排除目录。拒绝重复或大小写冲突身份、越界路径、无效快照。

基础 BOM 只表达 XML 文件引用图；同宿主重复引用计数、循环标记和有界递归不等于几何实例或制造数量。超过深度/行数限制明确失败，不静默截断后声称完整。解析失败计划不得交给 writer 覆盖旧索引。

此组 API 是本地候选；包版本号不代表它已经发布。正式采用前核对 tarball 的实际导出。
