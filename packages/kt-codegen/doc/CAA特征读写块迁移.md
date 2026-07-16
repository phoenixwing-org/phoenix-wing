# CAA 特征读写块迁移

本文记录 CAA 实现类单参数 Get/Set，以及 Param 聚合对象桥接 Get/Set 四个 Feature I/O 自动代码块的迁移结果。

## 迁移范围

| ID | block key | 旧 VB 方法 | 新目标 | 状态 |
| ---: | --- | --- | --- | --- |
| 2 | `IMPLEMENTS CPP GET` | `CreateCAAImplementsCppGet` | `caa.feature-io` | 已迁移 |
| 3 | `IMPLEMENTS CPP SET` | `CreateCAAImplementsCppSet` | `caa.feature-io` | 已迁移 |
| 6 | `IMPLEMENTS PARAM GET` | `CreateCAAImplementsCppParamsClassGet` | `caa.feature-io` | 已迁移 |
| 7 | `IMPLEMENTS PARAM SET` | `CreateCAAImplementsCppParamsClassSet` | `caa.feature-io` | 已迁移 |

权威依据是归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 中对应四个方法。TypeScript 实现在 [`KtCodegenRenderer.ts`](../src/KtCodegenRenderer.ts)。Renderer 通过 `KtCodegenCaaAlgorithms` 使用 Core 中已验证的列表判断、默认值格式化和末尾大写字符解析，不复制这些规则；基线位置见[《来源与许可归档》](来源与许可归档.md)。

## 两组不同的 ID 边界

CPP 单参数函数与上一阶段接口头文件相同：

- 跳过 `id === -1`；
- 跳过 100～199；
- ID 0 和 ID 200 以上继续生成。

Param 聚合对象桥接使用更严格的旧规则，只允许 ID 1～99。ID 0、负数以及所有 ID 100 以上均跳过。两组 artifact 的 `sourceParameters` 保存实际参与生成的参数名，可供 UI 和测试审计。

## CPP Get

类名沿用旧 `GetECPPClassName`：

```text
NamePrefix + "E" + NameMiddle + NameSuffix
```

标量 Get 先用默认值构造局部 `value`，调用 `GetValue`，再返回 `value`。无默认值时生成普通未初始化声明。

以下分支保持旧行为：

- `tcKind === "tk_integer"` 且 `dataType` 不区分大小写后不是 `int`：先读入 `int`，返回时强制转换为目标枚举；`tk_integer` 本身仍区分大小写；
- `tcKind` 不区分大小写等于 `tk_specobject`：使用 `GetSpecValue`；
- 列表参数：返回 `ktcSpecRW.GetListValue` 的 `HRESULT`；
- `dataType` 精确等于 `<NameSpace>::SpecObjectCollect`：先 `RemoveAll`，再设置 `GetIsOrderBySerial`；参数名末尾存在单独大写字母时附加该后缀。

旧 VB 在 `SpecObjectCollect` 的第二个内嵌换行后只写四个空格，丢失块 `linePrefix`。TypeScript golden 有意保留这一历史输出，避免迁移时产生未审阅的格式变化。

## CPP Set

所有函数返回 `HRESULT`，并保留 `checkExist` 参数：

- 列表使用 `SetListValue`；
- SpecObject 使用 `SetSpecValue`；
- `tk_integer` 枚举先转换为局部 `int valueInput`，再调用 `SetValue`；
- 其他标量直接调用 `SetValue`。

分支优先级与旧方法一致：列表优先于 SpecObject 和枚举转换。

## Param 聚合对象桥接

Get 对标量执行赋值，对列表传入聚合对象成员作为引用：

```cpp
value.MachineId = GetMachineId();
GetGuardLength(value.GuardLength);
```

Set 逐项调用单参数 Set。失败时向既有 `msg` 追加带 `\n` 的错误文本并设置 `findError`；全部 Item 完成后统一调用 `SetErrMsg` 并返回 `E_FAIL`。旧代码中 `msg`、`findError` 的声明已被注释，因此 Renderer 不擅自新增变量。

## 目标状态与回归证据

ID 0 `CATALOG PARAMS` 已在后续阶段迁移，因此 `caa.feature-io` 的 Catalog 与本阶段四块均已完成。默认请求全部 block 时，该目标不再因本目标遗留块保持 scaffold。

回归材料：

- [`caa-feature-io.cpp`](../tests/fixtures/source/caa-feature-io.cpp)：四个旧标记块；
- [`expected/caa-feature-io`](../tests/fixtures/expected/caa-feature-io)：四份逐行 golden；
- [`caa-feature-renderer.test.ts`](../tests/caa-feature-renderer.test.ts)：覆盖 golden、替换边界、枚举大小写、SpecObject、排序列表、两组 ID 边界和部分迁移状态。

本阶段仍只生成 Analyze Plan，不执行真实文件写回。
