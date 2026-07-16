# Command 图与状态块迁移

本文记录 ID 25～27 三个 CAA Command Graph/State 块的 TypeScript 迁移结果：建立选择 Agent 状态图、清理 FIA 状态，以及按活动 Field 更新 FIA。

## 权威实现

旧行为以归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 为准（基线位置见[《来源与许可归档》](来源与许可归档.md)）：

- `CmdAgentBuildGraph`
- `CmdAgentFiaClear`
- `CmdAgentUpdateState`
- 共同使用的 `AutoCodeStartSelector`、`GetCurrentSelectorList` 和 `GetFieldTypePrefix`

旧 `CmdAgentBuildGraph` 在创建 notes 前调用过一次 `AutoCodeStartSelector`，随后带 notes 再调用一次。第二次调用会清空 `_codes`，所以第一次结果不会进入最终输出。TypeScript 直接生成最终可见的带说明版本，不保留无效中间副作用。

## 两层 Field 规则

第一层仍由 `KtCodegenCore.isSelectorField` 决定：当前后缀、`id >= 1`，Component 属于五类 Selector Field。第二层由新增的 `KtCodegenCore.isCommandAutoField` 判断某个 Field 是否能使用旧 Command 自动宏：

- Component 必须精确等于 `SelectorList` 或 `QListWidget`；
- `componentCount` 必须不等于0；
- 旧代码只判断 `= 0`，因此负数没有被当成0，本迁移保留该边界；
- 不支持的 Field 仍进入 switch 或编号序列，以注释说明“控件数量为0”或“组件不支持”，不被静默丢弃。

这条规则已由后续迁移的 ID 28、29、31 复用。

## BuildGraph 建议过滤器

`KtCodegenCore.getCommandSuggestedFilter` 按旧优先级对 `ParamString` 做不区分大小写的包含判断：

1. `GRID_AXIS`
2. `AXIS_SYSTEM`
3. `DIRECTION`
4. `SUPPORT`
5. `POINT`（命中 `point` 或 `origin`）
6. `LINE`
7. `CURVE`
8. `PLANE`
9. `FACE`（命中 `face` 或 `surface`）
10. `AXIS`
11. `DEFAULT`

具体名称先于通用 `AXIS`，因此 `GridAxis` 不会错误落入 `AXIS`。Renderer 先生成 `KT_AUTO_CMD_BUILD_FIA_<FILTER>`，再生成 `KT_AUTO_CMD_BUILD_FIELD`；不支持时保留人工实现提示。

## 三个块的差异

| ID | block key | 行为 |
| ---: | --- | --- |
| 25 | `CMD AGENT BUILD GRAPH` | Build Start/End、Field 数量、编号、建议 FIA 与 Field 宏 |
| 26 | `CMD AGENT UPDATE STATE` | 按 `Field_<Class>_<Param>` switch；支持项更新状态，不支持项输出原因；最后保留 `case 0` 错误宏 |
| 27 | `CMD AGENT FIA CLEAR` | 对第一层筛选后的所有 Field 生成 FIA Clear 宏，不应用第二层自动支持判断 |

空 Field 时 BuildGraph 仍生成 Start/End 和数量0；FIA Clear 不生成 Field 宏；UpdateState 只生成数量0，不生成 switch。所有块继续保留旧 `@key`、说明、Marker 缩进、换行和末尾换行。

## 目标状态与回归证据

显式请求 ID 25～27 时，`caa.control` 返回 `ready`，安全 Marker 可形成 `canApply: true` 的预览计划。ID 28～31 已在后续阶段迁移，因此默认请求全部 Control 块时也返回 `ready`；只有实际生成废弃兼容 ID 30 时才附加 warning。

- [`command-graph-state.cpp`](../tests/fixtures/source/command-graph-state.cpp)：三个旧 Marker 区域；
- [`expected/command-graph-state`](../tests/fixtures/expected/command-graph-state)：三份逐行 golden；
- [`command-graph-renderer.test.ts`](../tests/command-graph-renderer.test.ts)：覆盖自动与人工分支、过滤器、Field 顺序、目标状态和共享数据不变性；
- [`core.test.ts`](../tests/core.test.ts)：覆盖支持组件、数量0/负数和完整过滤器优先级。

本阶段仍只产生 Analyze/Preview，不执行真实源码 Apply。
