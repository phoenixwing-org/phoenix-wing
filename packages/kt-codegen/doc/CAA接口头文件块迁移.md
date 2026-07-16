# CAA 接口头文件块迁移

本文记录 CAA 实现类与纯虚接口类头文件中四个 Get/Set 自动代码块的 TypeScript 迁移结果。

## 迁移范围

| ID | block key | 旧 VB 调用 | 新目标 | 状态 |
| ---: | --- | --- | --- | --- |
| 4 | `IMPLEMENTS HEAD GET` | `CreateCAAInterfacesGet(False)` | `caa.core` | 已迁移 |
| 5 | `IMPLEMENTS HEAD SET` | `CreateCAAInterfacesSet(False)` | `caa.core` | 已迁移 |
| 8 | `INTERFACES HEAD GET` | `CreateCAAInterfacesGet(True)` | `caa.model` | 已迁移 |
| 9 | `INTERFACES HEAD SET` | `CreateCAAInterfacesSet(True)` | `caa.model` | 已迁移 |

权威依据是归档基线 `KtaAutoCodeBase/KevinCAAFileGuide.vb` 中的 `CreateCAAInterfacesGet`、`CreateCAAInterfacesSet` 和 `CodeAppendNotes`。TypeScript 实现在 [`KtCodegenRenderer.ts`](../src/KtCodegenRenderer.ts)，列表判断由 `KtCodegenCore.isParamSpecList` 注入 Renderer，避免复制类型规则；基线位置见[《来源与许可归档》](来源与许可归档.md)。

## 共享数据与过滤

四块都直接消费同一个 `KtCodegenParam.items`，按数组顺序筛选当前标记的 `NameSuffix`：

- `id === -1` 跳过；
- `100 <= id < 200` 跳过；
- ID 0、其他负数和 ID 200 以上保持旧行为，继续生成；
- 其他 `NameSuffix` 的 Item 不进入当前类；
- Reader、Renderer 和 Analyze 都不修改共享 Item。

这一规则与普通 C++ Parameter 块的 `id >= 1` 不同，因此分别保留，不能抽成一个统一过滤条件。

## Get 生成规则

实现类块生成普通成员声明，接口类块增加 `virtual` 和 `= 0`：

```cpp
int GetMachineId() const;
virtual int GetMachineId() const = 0;
```

`KtCodegenCore.isParamSpecList` 为 false 时，Get 直接返回 `DataType`；为 true 时改为旧 CAA 的 `HRESULT + 引用输出参数`：

```cpp
HRESULT GetGuardLength(double& value) const;
virtual HRESULT GetGuardLength(double& value) const = 0;
```

Doxygen `@return` 与函数形式使用同一次列表分类规则。3D 点/向量的优先排除顺序沿用 Core 已有 golden，不会因为 `isList = true` 自动变成列表 Get。

## Set 生成规则

Set 不区分标量与列表，统一保留旧签名：

```cpp
HRESULT SetMachineId(const int& value, const CATBoolean& checkExist = CATTrue);
```

纯虚接口版本在末尾增加 `= 0`。Doxygen 保留 `@param[in] value <DataType>`、`@return HRESULT`、可选 author/date/note 和稳定 ID。

## 历史格式兼容

- `public: // Get` 和 `public: // Set` 来自旧 `CodeAppendLine`，不附加 Start 行的 `linePrefix`；
- 注释和函数声明继续使用 Start 标记提取的 `linePrefix`；
- Start/End、`clang-format off/on`、文件换行和末尾换行复用公共区域 artifact 逻辑；
- 每个 artifact 绑定 `regionId`，并由 Analyze 验证区域存在。

## 目标状态

`caa.core` 当前矩阵只有 ID 4、5，因此请求这两个块时目标为 `ready`。

ID 1 `FACTRY ON TREE` 已在后续阶段迁移，因此 `caa.model` 的 Factory 与 ID 8、9 均已完成。使用默认全部 block key 时，CAA Model 不再因本目标遗留块保持 scaffold。

## 回归证据

- [`caa-interface-heads.hpp`](../tests/fixtures/source/caa-interface-heads.hpp) 保存四个待替换旧块；
- [`expected/caa-interface`](../tests/fixtures/expected/caa-interface) 保存四份逐行 golden；
- [`caa-renderer.test.ts`](../tests/caa-renderer.test.ts) 覆盖实现/纯虚差异、列表 Get、部分迁移状态、ID 边界和后缀过滤。

本阶段仍只产生 Analyze Plan，不负责真实文件写回。
