# Dialog 字段与废弃兼容块迁移

本文记录 ID 19～21 三个 CAA Dialog Field 块的 TypeScript 迁移结果，以及旧 VB 已标记废弃的方法如何在兼容模式下继续安全生成。

## 权威实现

行为以归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 为准（基线位置见[《来源与许可归档》](来源与许可归档.md)）：

- `GetCurrentSelectorList`：选择当前 Dialog/Command 使用的 Field Item；
- `AutoCodeStartSelector`：生成三个块共同使用的分隔线、`@key` 和说明；
- `DlgDefineFieldType`：生成 Field 枚举值；
- `DlgSetActiveField`：清理其他 Selector 的旧兼容逻辑；
- `DlgGetSelectorList`：按 Field 返回 Selector 的旧兼容逻辑。

旧 UI 仍会选择 ID 19～31，`CreateCAAItem` 也仍会分派 ID 20、21，因此本阶段保留可审计的兼容输出，而不是根据方法注释静默删除。

## 共享 Selector Field 分类

`KtCodegenCore.isSelectorField` 复现 `GetCurrentSelectorList` 的最终规则。Item 必须满足 `id >= 1`，且 `component` 精确等于以下五个字符串之一：

- `SelectorList`
- `MultiList`
- `QListWidget`
- `QTableWidget`
- `QTableView`

组件比较大小写敏感。旧代码从2023年起已注释掉 `ComponentCount` 检查，因此数量为0仍属于 Field；`DataType` 不参与判断。当前 Marker 的 `NameSuffix` 由 Renderer 另行过滤，最终顺序保持 `KtCodegenParam.items` 的原始顺序。

该判断放在 Core 而不是 Dialog Renderer 私有函数中，ID 22～31 的 Command Selector 迁移已经复用同一规则。

## 三个生成块

| ID | block key | 输出 | 当前策略 |
| ---: | --- | --- | --- |
| 19 | `DLG DEFINE FIELD TYPE` | `Field_<Class>_None = 0`，随后按顺序生成从1开始的 Field 值 | 正常迁移 |
| 20 | `DLG SET ACTIVE FIELD` | 对非活动 Field 调用 `_SelectorList<Name>->ClearSelect()`，最后设置 `_ActiveField` | 废弃兼容 |
| 21 | `DLG GET SELECTOR LIST` | `switch (field)` 返回对应 Selector；无 Field 时直接 `return NULL` | 废弃兼容 |

公共 Field 前缀严格保持 `Field_ + NamePrefix + NameMiddle + NameSuffix + _`。公共块头保持旧 `AutoCodeStartSelector` 的点分隔线、枚举式 `@key` 和原英文说明；Start/End、缩进、LF/CRLF 与末尾换行继续遵循 Marker/Renderer 的统一规则。

## 废弃兼容诊断

ID 20、21 在 [`legacy-blocks.ts`](../src/blocks/legacy-blocks.ts) 中继续标记为 `legacy-deprecated`，同时其迁移状态为 `migrated`。策略如下：

1. 只要用户或宿主没有请求相应 block key，Renderer 不生成兼容代码；
2. 请求了 key 但源码没有对应安全 Marker 区域时，不产生 artifact，也不发废弃 warning；
3. 实际生成兼容 artifact 时，返回 `renderer.legacy-deprecated-block` warning；
4. warning 不把目标降为 scaffold，也不阻止 `plan.canApply`；
5. 宿主可以通过 `blockKeys` 排除这两个块，但不能丢失其稳定身份和 Marker 解析能力。

这使旧项目能够无损迁移，也让新 UI 明确提示用户该代码已过时。未来若确认所有宿主都不再消费，可在新的兼容策略中停止生成，但必须单独记录，不能静默改变旧输出。

## 回归证据

- [`dialog-fields.cpp`](../tests/fixtures/source/dialog-fields.cpp)：三个旧 Marker 区域；
- [`expected/dialog-fields`](../tests/fixtures/expected/dialog-fields)：三份逐行 golden；
- [`dialog-field-renderer.test.ts`](../tests/dialog-field-renderer.test.ts)：覆盖五类组件、ID/后缀过滤、数量为0、未知 DataType、空 Field、两个 warning 和共享数据不变性；
- [`core.test.ts`](../tests/core.test.ts)：约束精确组件集合、大小写和无副作用。

本阶段仍只产生 Analyze/Preview，不访问或写入真实源码文件。
