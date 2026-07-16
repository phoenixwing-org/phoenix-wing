# Command 动作与活动字段块迁移

本文记录最后一组 ID 28～31 CAA Command 块的 TypeScript 迁移结果：PDA/FIA Action、已经被替代的旧 ElementSelected 兼容逻辑，以及活动 Field 的 HSO 更新。

## 权威实现与 Field 筛选

旧行为以归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 中以下方法为准（基线位置见[《来源与许可归档》](来源与许可归档.md)）：

- `CmdActionPda`
- `CmdActionFia`
- `CmdElementSelected`
- `CmdSetActiveField`

四块先复用 `KtCodegenCore.isSelectorField` 取得当前后缀的五类 Selector Field。ID 28、29、31 再复用 `KtCodegenCore.isCommandAutoField`：只有精确 `SelectorList`/`QListWidget` 且 `componentCount !== 0` 才生成自动宏；其他 Field 仍保留 switch case，并输出数量为0或组件不支持的原因。

ID 30 是旧实现，按归档行为对所有第一层 Field 生成代码，不检查组件或数量。它只按 `dataType === "CATListValCATISpecObject_var"` 区分列表切换与单值切换。

## 四个生成块

| ID | block key | 行为 | 策略 |
| ---: | --- | --- | --- |
| 28 | `CMD ACTION PDA` | Field 变化时清空 HSO，按 Field 调用 PDA 宏 | 正常迁移 |
| 29 | `CMD ACTION FIA` | 保留局部 `int count = 0`，按 Field 调用 FIA 宏 | 正常迁移 |
| 30 | `CMD ELEMENT SELECTED` | 列表参数执行 Locate/Append/Remove，单值参数切换选择对象 | 废弃兼容 |
| 31 | `CMD SET ACTIVE FIELD` | 先清空 HSO，再按 Field 调用 HSO Add，保留 default 分支 | 正常迁移 |

ID 31 的旧方法虽然名为 SetActiveField，但不会写 `_ActiveField = field`；TypeScript 不根据名称补写。ID 29 的 `count` 局部变量即使后续片段没有直接使用也保留。以上可见细节均由 golden 固定。

## 废弃兼容策略

旧 VB 明确注明 ID 30 已被 `CMD ACTION FIA` 替代，但旧 UI 和分派仍能请求它，因此采用与 ID 20、21 相同的兼容策略：

1. 元数据同时保留 `migrationStatus: migrated` 与 `legacyState: legacy-deprecated`；
2. 实际命中安全 Marker 并生成 artifact 时发出 `renderer.legacy-deprecated-block` warning；
3. warning 不阻止 `plan.canApply`，`caa.control` 仍为 `ready`；
4. 宿主可通过 `blockKeys` 排除 ID 30，排除后不产生 artifact 或 warning；
5. 稳定 key 和 Marker 解析能力继续保留，不能静默删除。

## 回归证据

- [`command-actions.cpp`](../tests/fixtures/source/command-actions.cpp)：四个旧 Marker 区域；
- [`expected/command-actions`](../tests/fixtures/expected/command-actions)：四份逐行 golden；
- [`command-action-renderer.test.ts`](../tests/command-action-renderer.test.ts)：覆盖支持/不支持分支、列表/单值兼容逻辑、warning、宿主排除和共享数据不变性；
- [`command-action-fixtures.ts`](../tests/command-action-fixtures.ts)：同时包含 SelectorList、QListWidget、MultiList、数量0与非 Field 数据。

至此归档枚举 ID 0～31 的32个旧自动代码块均已完成 TypeScript Renderer 与 golden 基线。本包仍只产生 Analyze/Preview，不执行真实源码 Apply。
