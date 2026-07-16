# @phoenix-wing/cad-core

Phoenix CAD 可跨宿主复用的纯 TypeScript 领域算法。包内不依赖 Vue、Element Plus、Node、VS Code、Tauri、数据库驱动或平台二进制。

首批 API 固化 Desk Tools 已投入使用的 FreeCAD BOM 文件名规则：

- 从 `.FCStd`、`.ASSY.FCStd`、`.Drawing.FCStd` 文件名推断 BOM 字段；
- 判定 Part、Assembly、Drawing 文档类型；
- 生成 BOM 标签和推荐文件名；
- 规范化工作区相对路径并阻止路径越界。
- 从 FreeCAD `Document.xml` 提取、去重 XLink，并按 Desk Tools 既有规则选择 Object Label、解码 XML entity。
- 在宿主提供文件存在性结果后，纯计算 XLink 目标的 direct/self/missing/ambiguous 状态，并复用相同的目录、三位项目版本和标签回退规则。
- 从宿主查询出的边数组计算 direct/indirect 入向引用、`via_chain` 和受循环保护的装配树 ViewModel。

Desk Tools 和 KT Auto CAD 应直接消费本包，宿主层只负责文件系统、数据库、native provider 与界面交互。
