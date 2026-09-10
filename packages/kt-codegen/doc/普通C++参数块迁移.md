# 普通 C++ 参数块迁移

本文记录 `cpp.parameter` Renderer 第一组已迁移能力：旧 `KevinCAAFileGuide` 的参数声明、构造、析构和赋值四个自动代码块。

## 迁移范围

| ID | block key | 旧 VB 方法 | 当前状态 |
| ---: | --- | --- | --- |
| 10 | `PARAM CONSTRUCTOR` | `CreateCAAParamConstructor` | 已迁移 |
| 11 | `PARAM DECLARATION` | `CreateCAAParamDeclaration` | 已迁移 |
| 12 | `PARAM DESTRUCTOR` | `CreateCAAParamDestructor` | 已迁移 |
| 13 | `PARAM EQUAL` | `CreateCAAParamEqual` | 已迁移 |

权威实现仍是归档基线中的 `KtaAutoCodeBase/KevinCAAFileGuide.vb`。TypeScript 版本位于 [`KtCodegenRenderer.ts`](../src/KtCodegenRenderer.ts)，由 `KtCodegenCore` 注入旧默认值格式化函数，避免 Renderer 反向依赖 Core；基线位置见[《来源与许可归档》](来源与许可归档.md)。

## 数据流与职责

```mermaid
flowchart LR
    Param["KtCodegenParam<br/>共享公开数据"] --> Core["KtCodegenCore<br/>默认值等纯算法"]
    Snapshot["KtCodegenSnapshot"] --> Marker["KtCodegenMarker<br/>安全区域"]
    Marker --> Renderer["KtCodegenRenderer<br/>cpp.parameter"]
    Core -->|"注入默认值格式化函数"| Renderer
    Param --> Renderer
    Renderer --> Artifact["KtCodegenArtifact<br/>regionId + content"]
    Artifact --> Plan["KtCodegenPlan<br/>仅预览，不写文件"]
```

每个 artifact 对应一个已扫描的 `KtCodegenMarkerRegion.id`。区域保存文件指纹和替换偏移，artifact 保存目标、block、类身份和候选文本。当前包只形成 Analyze Plan；真实 Apply 必须由宿主根据 `regionId` 找到区域，在写入前重新检查文件指纹。

## 保留的旧行为

四个块都只消费与当前 `NameSuffix` 相同且 `id >= 1` 的 Item，并保持数据数组顺序。

### 参数构造

- `id === 1` 使用 `: `，其余 Item 使用 `, `；不按数组位置自动修正；
- 默认值复用 Core 中已经 golden 化的字符串、分号、毫米和角度规则；
- 旧方法对 `m_CurrentControlEnd.Trim()`，所以历史输出把 `clang-format on` 和 End 标记写到第 1 列。2026-09-10 用户授权以规则 `1.0.1` 修正这一明确缺陷：读取同一源码快照中 End 之后的第一条非空、非纯注释语义行，两条结束标记与该行对齐；后续初始化项和只剩 `{` 分别按各自真实缩进处理，不统一套用 Start 缩进。
- 空行、单行注释和跨行块注释不决定结束标记缩进；保留空格与 tab 原样。无后续语义行时保留现有 End 缩进，不猜测函数体。只替换已有安全区域，不改 End 后的用户初始化项、注释或函数体；Parser/Analyze/Apply 的安全边界不变。

### 参数声明

- 保留 `@app Kt Auto Code`。旧迁移基线使用 `@version 5.0.0, (2024)`，独立系列从 `1.0.0` 开始，当前输出 `@codegen-rules-version 1.0.1`，由公开的 `KT_CODEGEN_GENERATOR_VERSION` 常量生成；这是独立的生成规则版本，不是旧 Windows App、Wing/npm、插件、输入 JSON 或 Plan schema 版本；
- 旧注释仍可被控制符扫描正常读取，不批量改写已有源码；新注释只随后续显式生成与 Apply 写入。规则变化须同步使消费者的旧预检缓存失效，不能仅更新注释；
- 按 `CodeAppendNotes(item, 0)` 输出 `brief`、可选 `author/date/note` 和 `id`；
- 相邻 Item 声明之间保留一个空行。

### 参数析构

- `CATISpecObject_var` 不区分大小写，重置为 `NULL_var`；
- 类型中任意位置包含 `*` 时重置为 `NULL`；
- 其他类型保留旧行为，输出被注释的默认值恢复语句。

### 参数赋值

- 普通类型生成 `value = iOriginal.value`；
- 旧代码判断条件是 `DataType.IndexOf("*") > 0`，因此常规指针复制语句被注释；
- 若 `*` 恰好是类型首字符，旧判断返回 false，新实现也不会擅自改变。

## 换行、缩进与可验证性

- Start 行最后一个 `//` 之前的 `linePrefix` 用于生成块缩进；
- 显式 `snapshot.eol` 优先，否则从文本检测 CRLF，默认使用 LF；
- 原 End 行有换行时 artifact 保留末尾换行，无换行时不额外添加；
- [`cpp-parameter-blocks.hpp`](../tests/fixtures/source/cpp-parameter-blocks.hpp) 提供四块旧源码；
- [`expected/cpp-parameter`](../tests/fixtures/expected/cpp-parameter) 保存逐块可人工审阅的 golden 文本；
- 测试另外覆盖 CRLF、`CATISpecObject_var`、常规指针和首字符星号。
- [`constructor-boundary.test.ts`](../tests/constructor-boundary.test.ts) 覆盖两组最小完整输出、LF/CRLF、重复生成、注释间隔、tab、缺少后续行及区域外文本保留。此次仅更新声明版本戳 golden 和跨 Host fixture 对应声明内容 SHA-256；其他旧 golden 不变。
- 本地消费候选已用 macOS CppTools clang-format 23.1.0 和来源工程的 LLVM/4 空格样式对上述两组 LF/CRLF 生成结果做两次格式化：完整文本均未变化。未执行 Windows clang-format；Windows 版本、执行参数及最终样式来源仍应由消费工程记录，不把本机结果宣传为所有格式化环境保证。

## 当前边界

`cpp.parameter` 目标对这四个 block 返回 `ready`。只有源码标记结构无 error、存在至少一个 artifact、所有 artifact 都能关联区域，且本次请求的全部目标均为 `ready` 时，`plan.canApply` 才为 true。

这只表示计划具备 Apply 的基本条件，不表示本包已经写入文件。CAA 的二十六块和 Qt 的两个双向更新块已在后续阶段迁移，归档的32个旧 block 已全部建立 Renderer 与 golden 基线。
