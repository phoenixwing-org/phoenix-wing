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
- Host-neutral `<pnw-combo>`：分组候选、逐行删除、全部清空和自动避让可见边界；
- Host-neutral `<pnw-cleanup-dialog>`：多方式/多目标、冻结预览 token 与默认启用的高风险二次确认。Host 可设置 `requireHighRiskConfirmation: false` 省略额外勾选；高风险标记、有效预览和显式执行按钮仍保留。

通用浏览器 UI 从稳定门面导入：

```ts
import { pnwCodeDefineNavigationTree } from "@phoenix-wing/code-core/ui";
import type { PnwNavigationTreeModel } from "@phoenix-wing/code-core/ui/model";
```

物理目录 `src/ui/elements/` 与 `src/ui/model/` 不是公共 subpath。完整契约见仓库
[`docs/Pnw通用NavigationTreeWebComponent.md`](../../docs/Pnw通用NavigationTreeWebComponent.md)和
[`docs/Pnw可管理Combo与统一清理能力.md`](../../docs/Pnw可管理Combo与统一清理能力.md)。

`kt-auto-code` 与 Desk Tools 应直接消费本包。旧 `phoenix-wing/code-core` subpath 仅保留兼容 re-export，不再持有算法真源。

`@phoenix-wing/code-core/fixtures/pure-capabilities-v1.json` 是 UUID 与 workspace path 的跨宿主 golden。其 SHA-256 为 `1d894c5ccffb8d8840c2fcf8a032ed34c79e7c5d2e44ad95fe1bf84665b32e8c`；消费者应比较字节与行为，不复制正则、格式器或路径包含算法。

## 测试样本来源与发布边界

2026-10-07 核对 [PNXCaaStudy](https://gitee.com/PhoenixWing321/PNXCaaStudy) 本地基线 `a677a6c` 的 `KTCAutoCodeWsp`：本包十份 `ktca_*` 夹具对应 Dialog、AttrAccess、BuildGSM、PartDoc 的头/实现文件及 CatalogParam、GSM 的头文件。来源和夹具均有逐文件 MIT 声明；五份忽略换行后与此基线一致，其余为排序回归所用的适配版本，不宣称全部逐字节复制。保留既有版权头和 [上游许可证](LICENSE.PNXCaaStudy.txt)，其 CATIA/第三方边界仍适用，不将学习仓库许可扩张为第三方 SDK 的再分发许可。

此前三份 BOM 相关样本和一份业务命名的 widget 样本，不继续依赖摘录范围判断：改为四份独立构造的 `generated_*` 最小输入，仅表达无构造函数、锁定区域、system-code 分段与 widget 标记；不复制零件、业务字段或工程结构。新的断言验证这些算法条件，不用重写旧开源样本 golden 哈希掩盖行为变化。

`ktalarmclock.clang-format.yaml` 对应 KtAlarmClock 的 Apache-2.0 格式风格；该学习项目许可证已本地核对。其余通用最小夹具不包含业务模型。npm 按审核后的明确文件清单打包；后续增加夹具时必须同步来源审查及制品门禁。
