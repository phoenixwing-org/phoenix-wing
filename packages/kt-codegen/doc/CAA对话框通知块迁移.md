# CAA 对话框通知块迁移

本文记录 ID 14 `DIALOG NOTIFY` 的迁移结果。该块为 CAA Dialog Agent 生成各控件的 `AcceptOnNotify` 注册语句。

## 旧实现与新边界

权威依据是归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 的 `CreateCAADialogNotifyValueChange`。TypeScript 实现在 [`KtCodegenRenderer.ts`](../src/KtCodegenRenderer.ts)；基线位置见[《来源与许可归档》](来源与许可归档.md)。

Renderer 只消费 `KtCodegenParam` 和已扫描区域，不修改 Item。旧 VB 在单个 RadioButton 分支会把共享 `ComponentCount` 从1改为2；新实现使用局部 `count = 2` 生成完全相同的两条通知语句，但不产生隐式数据副作用。这符合当前 `KtCodegenRenderer` 的只读契约，也避免 Analyze 改变 UI 表格。

## Item 选择与公共命名

- 只消费当前 `NameSuffix`；
- `id < 1` 跳过；
- 每个保留 Item 前生成空行和 `// ID, ParamString` 注释；
- `ParamString` 中所有下划线在控件成员名中删除；
- `isParamDlg === true` 时控件名前增加 `dialogMore->`；
- `componentCount <= 0` 只输出 `NO ACTION` 注释。

## 组件分支

所有组件判断保持旧代码的大小写敏感规则。

| Component 条件 | 生成行为 |
| --- | --- |
| 精确 `Spinner` | 标量生成一条 Spinner 通知；旧 CAA 点/向量/方向生成 X、Y、Z 三条 |
| 以 `CheckButton` 开头 | count=1 使用无下标成员；其他数量生成 0～count-1 |
| 以 `RadioButton` 开头 | count=1 按2处理；其他数量生成 0～count-1 |
| 以 `Combo` 开头 | 不论 count，生成一个 Combo 通知 |
| 精确 `Editor` | count=1 使用无下标成员；其他数量生成数组式成员 |
| 其他正数量 | 输出 `NOT SUPPORT` 注释，不生成注册语句 |

CAA 向量判断复用 `KtCodegenCore.isCaaVector`。`CATMathVector` 等 CAA 类型使用 XYZ；`KtMathVector` 不属于这一旧集合，因此仍按单 Spinner 生成。

## 目标状态

显式只请求 `DIALOG NOTIFY` 时，`caa.dialog` 可以返回 `ready` 和可关联区域的 artifact。`UPDATE DIALOG`、`UPDATE INFORS` 与 ID 19～21 的 Dialog Field 块也已在后续阶段迁移，因此默认请求该目标全部六块时同样返回 `ready`。只有源码中实际存在 ID 20、21 标记并生成兼容代码时，计划才附带废弃 warning。

## 回归证据

- [`caa-dialog-notify.cpp`](../tests/fixtures/source/caa-dialog-notify.cpp)：旧标记块；
- [`dialog-notify.txt`](../tests/fixtures/expected/caa-dialog/dialog-notify.txt)：逐行 golden；
- [`caa-dialog-renderer.test.ts`](../tests/caa-dialog-renderer.test.ts)：覆盖 Spinner 标量/CAA向量/Kt向量、Check、Radio、Combo、Editor、子对话框、No Action、不支持组件、ID/后缀过滤和共享数据不变性。

本阶段只生成 Analyze Plan，不执行真实源码写入。
