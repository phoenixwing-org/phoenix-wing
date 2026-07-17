# @phoenix-wing/code-core

Phoenix Code 可跨宿主复用的纯 TypeScript 算法与数据契约。包内不依赖 Vue、Element Plus、Node 运行时 API、VS Code、Tauri、数据库驱动或平台二进制。

当前公共能力包括：

- C++ 实现文件与头文件成员排序、锁定区保护；
- UUID/GUID/CAA GUID 识别、花括号/大小写/布局保持、替换计划与纯文本 apply；
- Code Rename 计划与纯文本 apply；
- 工作集 Schema，以及 workspace 相对路径规范化、去重、文件/目录匹配、包含和 roots 相对化；
- CAA 工程环境和对话框 handoff 数据契约；
- 跨宿主文件结果分组与排序 ViewModel。

`kt-auto-code` 与 Desk Tools 应直接消费本包。旧 `phoenix-wing/code-core` subpath 仅保留兼容 re-export，不再持有算法真源。

`@phoenix-wing/code-core/fixtures/pure-capabilities-v1.json` 是 UUID 与 workspace path 的跨宿主 golden。其 SHA-256 为 `1d894c5ccffb8d8840c2fcf8a032ed34c79e7c5d2e44ad95fe1bf84665b32e8c`；消费者应比较字节与行为，不复制正则、格式器或路径包含算法。
