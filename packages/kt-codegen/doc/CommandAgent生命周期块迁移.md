# Command Agent 生命周期块迁移

本文记录 ID 22～24 三个 CAA Command Agent 生命周期块的 TypeScript 迁移结果。它们根据共享 Parameter 中的 Selector Field，生成 Command 头文件成员声明、构造函数初始化列表和析构清理宏。

## 权威实现与共享规则

旧行为以归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 中以下方法为准（基线位置见[《来源与许可归档》](来源与许可归档.md)）：

- `CmdAgentDeclare`
- `CmdAgentConstructor`
- `CmdAgentDestructor`
- 三者共同调用的 `AutoCodeStartSelector` 与 `GetCurrentSelectorList`

Renderer 复用 `KtCodegenCore.isSelectorField`，因此只保留当前 Marker `NameSuffix`、`id >= 1` 且 Component 精确属于 `SelectorList`、`MultiList`、`QListWidget`、`QTableWidget`、`QTableView` 的 Item。`componentCount` 和 `dataType` 不参与筛选，输出顺序保持共享 `items` 顺序。

旧 `CmdAgentDeclare` 会计算一个没有被使用的 `paramClass` 局部变量。该变量不影响生成文本，因此不进入 TypeScript 数据流。

## 三个生成块

| ID | block key | 生成内容 |
| ---: | --- | --- |
| 22 | `CMD AGENT DECLARE` | Common/Base 声明宏、Field 数量和逐 Field 声明宏 |
| 23 | `CMD AGENT CONSTRUCTOR` | 以逗号开头的 Common 与逐 Field 构造初始化宏 |
| 24 | `CMD AGENT DESTRUCTOR` | Field 数量、逐 Field 析构宏，最后生成 Common 清理宏 |

Base 宏参数严格保持旧拼接方式：第一个参数是 `NamePrefix`，第二个参数是 `NameMiddle + NameSuffix`。例如 `Kt + CourseGuard + Cmd` 输出：

```cpp
KT_AUTO_CMD_AGENT_DECLARE_BASE(Kt, CourseGuardCmd);
```

三个块都保留旧 `KevinControlID.ToString()` 形成的 `@key`、点分隔线、Marker 缩进、LF/CRLF 和末尾换行。构造宏末尾不擅自增加分号；析构 Common 宏前保留空行与 `// place at the end`。

## 目标状态

显式只请求 ID 22～24 时，`caa.control` 返回 `ready`，完整 Marker 可形成 `canApply: true` 的预览计划。ID 25～31 也已在后续阶段迁移，因此默认请求 `caa.control` 全部10块时同样返回 `ready`。废弃兼容 ID 30 只在源码实际存在对应 Marker 并生成时附加 warning。

Renderer 只消费 `KtCodegenParam` 与安全 Marker 区域，不修改共享 Item，也不访问真实文件系统。

## 回归证据

- [`command-agent-lifecycle.cpp`](../tests/fixtures/source/command-agent-lifecycle.cpp)：三个旧 Marker 区域；
- [`expected/command-agent-lifecycle`](../tests/fixtures/expected/command-agent-lifecycle)：三份逐行 golden；
- [`command-agent-renderer.test.ts`](../tests/command-agent-renderer.test.ts)：验证三块输出、Selector 筛选、目标 ready/scaffold 边界和共享数据不变性；
- [`command-agent-fixtures.ts`](../tests/command-agent-fixtures.ts)：包含数量为0、未知 DataType、非 Field、ID 和后缀排除案例。

本阶段仍只产生 Analyze/Preview，不执行真实源码 Apply。
