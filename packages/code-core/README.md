# @phoenix-wing/code-core

Phoenix Code 可跨宿主复用的纯 TypeScript 算法与数据契约。包内不依赖 Vue、Element Plus、Node 运行时 API、VS Code、Tauri、数据库驱动或平台二进制。

当前公共能力包括：

- C++ 实现文件与头文件成员排序、锁定区保护；
- UUID/GUID/CAA GUID 识别、花括号/大小写/布局保持、替换计划与纯文本 apply；
- Code Rename 计划与纯文本 apply；
- Phoenix Ignore 子集的规则解析、大小写策略、路径/名称/目录匹配；
- 搜索替换规则校验、去重/冲突检测、最长匹配、文本行号与名称建议；
- 工作集 Schema，以及 workspace 相对路径规范化、去重、文件/目录匹配、包含和 roots 相对化；
- CAA 工程环境和对话框 handoff 数据契约；
- 跨宿主文件、成员排序、UUID 与搜索替换结果 ViewModel；成员排序、UUID 与搜索替换另提供 Host-neutral Web Components；
- 递归多层 `PnwNavigationTreeModel` 与 `<pnw-navigation-tree>`：受控选择/展开事件、ARIA 键盘、受控图标以及 VS Code 风格 light/dark 状态。

通用浏览器 UI 从稳定门面导入：

```ts
import { pnwCodeDefineNavigationTree } from "@phoenix-wing/code-core/ui";
import type { PnwNavigationTreeModel } from "@phoenix-wing/code-core/ui/model";
```

物理目录 `src/ui/elements/` 与 `src/ui/model/` 不是公共 subpath。完整契约见仓库
[`docs/Pnw通用NavigationTreeWebComponent.md`](../../docs/Pnw通用NavigationTreeWebComponent.md)。

`kt-auto-code` 与 Desk Tools 应直接消费本包。旧 `phoenix-wing/code-core` subpath 仅保留兼容 re-export，不再持有算法真源。

`@phoenix-wing/code-core/fixtures/pure-capabilities-v1.json` 是 UUID 与 workspace path 的跨宿主 golden。其 SHA-256 为 `1d894c5ccffb8d8840c2fcf8a032ed34c79e7c5d2e44ad95fe1bf84665b32e8c`；消费者应比较字节与行为，不复制正则、格式器或路径包含算法。
