# CAA 与 Qt 对话框双向更新块迁移

本文记录 ID 15～18 四个参数/控件双向更新块的迁移结果：

- `UPDATE DIALOG`：CAA Parameter → Dialog；
- `UPDATE INFORS`：CAA Dialog → Parameter；
- `QT UPDATE DIALOG`：Parameter → Qt Dialog；
- `QT UPDATE INFORS`：Qt Dialog → Parameter。

## 权威实现与职责边界

旧行为以归档基线中的 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 所含 `CreateCAAUpdateDialog`、`CreateCAAUpdateInfors`、`CreateQTUpdateDialog` 和 `CreateQTUpdateInfors` 为准。TypeScript 实现在 [`KtCodegenRenderer.ts`](../src/KtCodegenRenderer.ts)，3D 类型判断由 [`KtCodegenCore.ts`](../src/KtCodegenCore.ts) 注入；基线位置见[《来源与许可归档》](来源与许可归档.md)。

Renderer 只消费共享的 `KtCodegenParam`、`KtCodegenItem` 和 Marker 已确认安全的区域。它产生候选 artifact，不访问真实 UI、不写文件，也不在 Analyze 期间修改 Parameter 或 Item。

## 公共筛选与命名规则

四个块都保持以下旧规则：

- 只处理与 Marker `NameSuffix` 相同的 Item；
- `id < 1` 跳过；
- `componentCount <= 0` 只生成 `NO ACTION` 注释；
- `isParamDlg === true` 时使用 `dialogMore->`；CAA 主对话框不加前缀，Qt 主对话框使用 `ui->`；
- 控件成员名会删除 `ParamString` 中的全部下划线；参数访问仍保留原符号名；
- Component 和 DataType 分支保持大小写敏感，未知字符串不从共享数据中清除。

## CAA 双向规则

| Component | Parameter → Dialog | Dialog → Parameter |
| --- | --- | --- |
| `Spinner` | 标量 `SetValue`；CAA 点/向量生成 XYZ；受支持集合按下标展开 | 标量 `GetValue`；`int` 使用 `Kt::round`；CAA 点/向量生成 `SetX/Y/Z` |
| `CheckButton*` | 单控件写状态；多控件按位掩码写状态 | 单控件读布尔值；非 `int` 保留旧强制转换；多控件重新组合位掩码 |
| `RadioButton*` | 越界时修正为0，再按序设置状态 | 默认0，从索引1开始读取选中项；枚举按 DataType 转换 |
| `Combo*` | `int` 用 `SetSelect`，`double`/`CATUnicodeString` 用 `SetField` | 对应使用 `GetSelect`、`GetField`；其他类型只生成错误注释 |
| `SelectorList` | 生成 `KT_AUTO_FIELD_SET_LINE`；坐标/方向特殊参数增加未选择提示 | 旧方法不自动回写，生成 `NO ACTION` 注释 |
| `Editor` | 数值用 `SetValue`，其他类型用 `SetText`；多控件使用1起始参数下标 | 仅 `double` 用 `GetValue`，其他类型用 `GetText`；多控件使用1起始参数下标 |

CAA 点/向量的 `mm` 单位在 Parameter → Dialog 时乘 `0.001`，Dialog → Parameter 时乘 `1000.0`。`CATRawColldouble` 的多控件参数下标从1开始，`ListKtfloat/ListKtdouble/ListKtint` 从0开始。

## Qt 双向规则

| Component | Parameter → Qt Dialog | Qt Dialog → Parameter |
| --- | --- | --- |
| `QListWidget` | 生成 `KT_AUTO_FIELD_SET_LINE` | 旧方法不支持自动回写，保留可见的 `NO ACTION` |
| `QDoubleSpinBox` / `QSpinBox` | 标量、XYZ 或集合调用 `setValue` | 调用 `value`；`QDoubleSpinBox + int` 使用 `Kt::round` |
| `QCheckBox*` | 单布尔值或按位掩码调用 `setChecked` | 单值调用 `isChecked`；多值重新组合掩码 |
| `QRadioButton*` | 越界修正后逐项 `setChecked` | 默认0，再按选中序号回写；枚举执行显式转换 |
| `QComboBox*` | 整数索引用 `setCurrentIndex`，字符串用 `setEditText` | 整数读 `currentIndex`，字符串读 `currentText` 并按类型转换 |
| `QLineEdit` | 调用 `setText`，`KtString` 经过本地编码转换 | 调用 `text`，`KtString` 转为本地8位字符串 |

Qt 3D 类型复用 `KtCodegenCore.isPointOrVector3DType`。`mm` 的双向因子与 CAA XYZ 相同；集合下标仍保留旧 `CATRawColldouble=1`、Kt List=0 的约定。

## 有意保留的旧不对称和可见缺陷

本阶段目标是建立可审计的等价基线，以下旧输出由 golden 固定，未静默“修好”：

1. Qt Parameter → Dialog 的 `QDoubleSpinBox` 集合不接受 `ListKtfloat`，反方向却接受；
2. Qt `QComboBox + KtString` 的旧普通字符串中包含字面量 `{strParamSame}`，候选源码继续显示该占位符；
3. Qt 枚举 Radio 回写分支会在赋值末尾生成额外的 `}`；
4. CAA Radio 的 Parameter → Dialog 分支会重复生成参数注释；
5. 旧 VB 会把单 Radio 的共享 `ComponentCount` 从1改成2。TS 只使用局部 `count=2`，输出不变，但不污染共享 Parameter。

这些可见缺陷以后可以在“兼容模式/修正模式”明确分流后处理，不能在首轮迁移中无记录地改变。未知或不支持的 Component/DataType 仍通过候选代码或注释暴露给用户。

## 回归证据

- [`dialog-updates.cpp`](../tests/fixtures/source/dialog-updates.cpp)：四个旧 Marker 区域；
- [`dialog-updates`](../tests/fixtures/expected/dialog-updates)：四份逐行 golden；
- [`dialog-update-renderer.test.ts`](../tests/dialog-update-renderer.test.ts)：验证四个 artifact、目标状态、Marker 关联、单位/下标不对称、旧可见缺陷和共享数据不变性；
- [`dialog-update-fixtures.ts`](../tests/dialog-update-fixtures.ts)：同一 Parameter 中的 CAA/Qt 多后缀测试数据。

显式请求这四个块时，`caa.dialog`、`qt.dialog` 和 `qt.parameter` 均可返回 `ready`。ID 19～21 也已在后续阶段迁移，因此默认请求 `caa.dialog` 的全部六块时不再是 scaffold；两个废弃兼容块只在实际命中源码标记并生成时附加 warning。

本阶段仍只有 Analyze/Preview，不执行真实源码 Apply。
