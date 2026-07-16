# CAA 目录与树工厂块迁移

本文记录 `CATALOG PARAMS` 和旧拼写 `FACTRY ON TREE` 两个 CAA 自动代码块的迁移结果。完成后，迁移矩阵 ID 0～13 已连续迁移。

## 迁移范围

| ID | block key | 旧 VB 方法 | 新目标 | 状态 |
| ---: | --- | --- | --- | --- |
| 0 | `CATALOG PARAMS` | `CreateCAACatalogParam` | `caa.feature-io` | 已迁移 |
| 1 | `FACTRY ON TREE` | `CreateCAAFactoryOnTree` | `caa.model` | 已迁移 |

权威依据是归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 中的两个生成方法和 `ConvertNameOnTree`。TypeScript 实现位于 [`KtCodegenRenderer.ts`](../src/KtCodegenRenderer.ts)，树标题格式化迁入 [`KtCodegenCore.ts`](../src/KtCodegenCore.ts) 作为可单测纯 helper；基线位置见[《来源与许可归档》](来源与许可归档.md)。

## Catalog 参数注册

Catalog 只排除 ID 100～199；ID -1、0、其他负数以及 ID 200 以上均按旧行为保留。每个 Item 生成三行：

1. 使用分号和 Tab 保存 ID、名称、作者、日期及可选备注的注释；
2. 调用 `item.SetValue` 或 `item.SetTKListValue`；
3. 把 `item` 追加到 `itemList`。

当 `isList` 为 true，或 `dataType` 属于 Core 维护的旧3D点/向量集合时，使用 `SetTKListValue`。`tcKind` 和 `catAttrInOut` 继续作为普通字符串原样写入，未知 Combo 值不会被 Renderer 清空或替换。

## Factory On Tree 选择规则

Factory 仅保留：

- `id === -1` 的临时项，不要求 `isOnTree`；
- `id >= 0` 且 `isOnTree === true` 的普通项。

ID 小于 -1 或非树上普通项跳过。ID -1 固定创建 `CreateInteger("Temp Spec", 0)`，并写入 `ListOnTree.Append(false)`；普通项写入 true。

## 单位与数据类型映射

单位比较不区分大小写：

| 条件 | 工厂函数 |
| --- | --- |
| `unit === mm` | `CreateLength` |
| `unit === degree` | `CreateAngle` |
| `dataType === int` | `CreateInteger` |
| `dataType === double` | `CreateReal` |
| `dataType === CATBoolean` | `CreateBoolean` |
| `dataType === CATUnicodeString` | `CreateString` |

除单位外，`dataType` 比较保持旧代码的大小写敏感。未知类型仍生成旧中文占位函数名，便于 golden 识别未支持分支，不擅自改成错误、异常或空输出。

旧代码把以下校验信息直接写入候选代码，且不附加块缩进：

- `TCKind` 不精确等于 `tk_specobject`；
- 长度/角度的 `dataType` 不精确等于 `double`。

新实现保留这些行，同时通过测试固定顺序和内容。

## 树标题格式化

`KtCodegenCore.formatTreeName` 只在“当前字符大写、前一字符不是大写”时插入空格：

| 输入 | 输出 |
| --- | --- |
| `MachineId` | `Machine Id` |
| `AxisX` | `Axis X` |
| `URLValue` | `URLValue` |

连续大写缩写不会被拆开，保持旧 `ConvertNameOnTree` 行为。

## 目标状态与证据

完成 ID 0 后，`caa.feature-io` 的 Catalog、CPP Get/Set、Param Get/Set 五块全部迁移；完成 ID 1 后，`caa.model` 的 Factory 与纯虚接口 Get/Set 三块全部迁移。默认请求全部 block key 时，这两个目标不再因本目标遗留块而保持 scaffold。

回归材料：

- [`caa-catalog-factory.cpp`](../tests/fixtures/source/caa-catalog-factory.cpp)：两个旧标记块；
- [`expected/caa-catalog-factory`](../tests/fixtures/expected/caa-catalog-factory)：逐行 golden；
- [`caa-catalog-factory.test.ts`](../tests/caa-catalog-factory.test.ts)：覆盖 Catalog ID 边界、3D列表、未知字符串、Factory 选择、全部类型映射、旧错误行和树标题；
- [`core.test.ts`](../tests/core.test.ts)：覆盖 `formatTreeName` 独立行为。

本阶段只形成 Analyze Plan，不执行真实文件写入。
