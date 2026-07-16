# KtCodegen 命名迁移说明

参数自动代码领域统一使用 `KtCodegen` 前缀。即使本包未来位于 Phoenix Wing，包的位置也不要求领域对象全部使用 `Pnw`：`Pnw` 留给 Phoenix Wing 通用基础设施，`Kt` 表示锟钛已有的参数驱动自动代码语义和兼容责任。

## 本阶段同步改名

- 源码目录由 `param-codegen` 改为 `kt-codegen`；
- npm 包名由 `@phoenix-wing/param-codegen` 改为 `@phoenix-wing/kt-codegen`；
- 原型运行时身份由 `kt.param-codegen.*` 改为 `kt.codegen.*`；
- CAA、Qt、C++ 生成块 key 和旧 `KEVIN CAA WIZARD` Marker 文本保持不变；
- 旧17列 CSV 与 v4 JSON 协议保持不变。

包名、目录、类名和运行时身份现在都明确指向 `KtCodegen` 领域，避免继续保留 `param-codegen` 与 `KtCodegen` 两套名称。

## TypeScript API 映射

| 旧前缀 | 新前缀 | 示例 |
| --- | --- | --- |
| `PnwCodegen*` | `KtCodegen*` | `KtCodegenParam`、`KtCodegenRenderer` |
| 其他公开 `Pnw*` 类型 | `KtCodegen*` | `KtCodegenDataResult`、`KtCodegenLegacyCsvDialect` |
| 内部 `pnw*` 函数 | `ktCodegen*` | `ktCodegenAnalyze` |
| `PNW_*` 常量 | `KT_CODEGEN_*` | `KT_CODEGEN_LEGACY_BLOCKS` |

九个主要类文件与类名同步改为：

- `KtCodegenParam.ts`
- `KtCodegenItem.ts`
- `KtCodegenOptions.ts`
- `KtCodegenReader.ts`
- `KtCodegenAdapter.ts`
- `KtCodegenController.ts`
- `KtCodegenCore.ts`
- `KtCodegenMarker.ts`
- `KtCodegenRenderer.ts`

原型尚未作为外部运行时依赖，因此本阶段直接完成破坏式重命名，不保留两套公开别名。这样可以在进入 Phoenix Wing 前消除长期双命名成本。

## 运行时稳定身份

运行时身份也同步使用小写 `kt` 领域前缀：

| 对象 | 稳定身份 |
| --- | --- |
| 共享数据 | `kt.codegen` |
| Analyze Plan | `kt.codegen.plan` |
| CAA Renderer | `kt.codegen.renderer.caa` |
| Qt Renderer | `kt.codegen.renderer.qt` |
| C++ Renderer | `kt.codegen.renderer.cpp` |
| Artifact | `kt.codegen.artifact:*` |

旧 v4 JSON 和17列 CSV 没有这些原型运行时字段，因此兼容读写协议不受影响。原生 TS 对象的 `kind` 属于当前原型 API，随类名一起更新。

## 验证边界

[`naming.test.ts`](../tests/naming.test.ts) 从公共 `src/index.ts` 导入新 API，验证数据、Plan、Renderer、Artifact 和常量的统一身份。全量 TypeScript 编译同时证明源码中不存在对旧类文件的残留 import。
