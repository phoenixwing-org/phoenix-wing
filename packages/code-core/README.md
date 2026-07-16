# @phoenix-wing/code-core

Phoenix Code 可跨宿主复用的纯 TypeScript 算法与数据契约。包内不依赖 Vue、Element Plus、Node 运行时 API、VS Code、Tauri、数据库驱动或平台二进制。

当前公共能力包括：

- C++ 实现文件与头文件成员排序、锁定区保护；
- UUID 识别、格式保持、替换计划与纯文本 apply；
- Code Rename 计划与纯文本 apply；
- 工作集 Schema 与安全相对路径校验；
- CAA 工程环境和对话框 handoff 数据契约；
- 跨宿主文件结果分组与排序 ViewModel。

`kt-auto-code` 与 Desk Tools 应直接消费本包。旧 `phoenix-wing/code-core` subpath 仅保留兼容 re-export，不再持有算法真源。
