# @phoenix-wing/run-core

宿主无关的 Run project/target DTO、CAA/CMake 证据分类、平台筛选、CAA 版本解析和逻辑目标选择。

本包不扫描文件、不启动进程，也不依赖 Node、VS Code、Vue 或 DOM。

清理规则能力提供受限 YAML 解析、默认 `objects/build` 与常见编译产物规则，以及直属文件名匹配。
规则拒绝路径、`..` 和递归 glob；Node 预览/执行实现位于 `@phoenix-wing/run-node`。
