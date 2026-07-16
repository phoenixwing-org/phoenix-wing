# KtCodegen 参数代码生成核心

这是从 `KtAutoCode` 本地归档标签 `kt-codegen-0.1.0` 迁入 Phoenix Wing 的参数驱动代码生成核心，npm 包名为 `@phoenix-wing/kt-codegen`。归档旧仓库继续作为 VB/C++/Qt 行为、许可和来源证据。

本包提供共享数据、旧格式兼容、只读源码标记扫描和32个生成块的 Core/Renderer；不写入真实项目源码，也不接产品 UI。

## 文件与命名规则

主要职责类直接平铺在 `src/`，不再为了 MVC-C 建立多层目录：

```text
src/
├── KtCodegenParam.ts       # 共享配置数据
├── KtCodegenItem.ts        # 单条17列参数数据
├── KtCodegenOptions.ts     # UI Combo 候选值
├── KtCodegenReader.ts      # CSV/JSON读取
├── KtCodegenAdapter.ts     # 旧格式写出、复制和清空
├── KtCodegenController.ts  # 宿主编排
├── KtCodegenCore.ts        # 核心生成算法入口
├── KtCodegenMarker.ts      # 旧自动代码标记构造与只读扫描
└── KtCodegenRenderer.ts    # 多目标生成器
```

规则如下：

- 所有主要类统一使用 `KtCodegen*` 前缀；
- `Pnw` 保留给 Phoenix Wing 通用基础设施；参数自动代码领域即使迁入 Phoenix Wing 也继续使用 `KtCodegen`；
- 一个类一个 `.ts` 文件，文件名与类名完全一致；
- 类专用的小接口、类型可以留在同一文件；
- 多个共享的小枚举或类型以后可以集中到一个 `KtCodegenTypes.ts`；
- `index.ts` 只导出，不放实现；
- MVC-C 是职责划分，不通过目录层级表达。

`api/`、`blocks/`、`legacy/`、`model/` 当前只放迁移初期的纯函数、旧格式 schema 和公共类型，不承载上述主要类。

完整的类型、函数、常量和运行时身份映射见[《KtCodegen 命名迁移说明》](doc/KtCodegen命名迁移说明.md)。

旧 VB/C++/Qt 权威实现、归档标签与许可证据见[《来源与许可归档》](doc/来源与许可归档.md)。

本次迁入的时间盒、仓库边界和发布门禁见[《两小时迁移计划与验收》](doc/两小时迁移计划与验收.md)。

32个旧生成块的分派依据、主目标、废弃状态和建议迁移顺序见[《参数代码生成块迁移矩阵》](doc/生成块迁移矩阵.md)。

旧 Start/End 文本协议、源码偏移和异常配对规则见[《自动代码标记扫描》](doc/自动代码标记扫描.md)。

首组已迁移 Renderer 的逐块行为和 golden 见[《普通 C++ 参数块迁移》](doc/普通C++参数块迁移.md)。

CAA 实现类/纯虚接口 Get/Set 差异见[《CAA 接口头文件块迁移》](doc/CAA接口头文件块迁移.md)。

CAA 单参数读写与 Param 聚合桥接见[《CAA 特征读写块迁移》](doc/CAA特征读写块迁移.md)。

CAA Catalog 注册、树工厂与标题规则见[《CAA 目录与树工厂块迁移》](doc/CAA目录与树工厂块迁移.md)。

CAA Dialog Agent 通知注册见[《CAA 对话框通知块迁移》](doc/CAA对话框通知块迁移.md)。

CAA/Qt Parameter 与 Dialog 的双向更新见[《CAA 与 Qt 对话框双向更新块迁移》](doc/CAA与Qt对话框双向更新块迁移.md)。

Dialog Field 枚举、Selector 访问与废弃兼容策略见[《Dialog 字段与废弃兼容块迁移》](doc/Dialog字段与废弃兼容块迁移.md)。

Command Agent 成员声明、构造初始化与析构清理见[《Command Agent 生命周期块迁移》](doc/CommandAgent生命周期块迁移.md)。

Command BuildGraph、FIA Clear 与 UpdateState 见[《Command 图与状态块迁移》](doc/Command图与状态块迁移.md)。

Command PDA/FIA Action、废弃选择逻辑与活动 Field 见[《Command 动作与活动字段块迁移》](doc/Command动作与活动字段块迁移.md)。

## 数据类边界

`KtCodegenParam` 和 `KtCodegenItem` 是纯数据类：只包含公开、可变字段和最小构造初始化，不包含 CSV/JSON、校验、清空、复制或生成算法。

旧系统的关键优势是 MVC-C（Model–View–Control–Core）围绕同一份 Parameter 数据协作。Parameter 采用类似 C/C++ `struct` 的全公开成员形式，不生成 getter/setter。Model、View、Control、Core、CAA 特征读写、Qt 对话框和普通 C++ 代码可以直接持有同一个实例；一处修改后，其他持有者立即看到新值。

这种设计主动牺牲一部分封装，换取调用路径短、表格/JSON/CSV 映射直接、自动代码模板样板少。代价是公开成员没有 setter 防线，调用者必须协调修改。新 TS 实现保留这一取舍，但把输入、适配、诊断、核心算法和源码 Apply 分离，避免数据类继续膨胀。

旧数据载体统一为：

| 旧实现 | 新对应 |
| --- | --- |
| VB `KevinCAAFileGuide` 的 `_Name*` 与 `_FieldList` | `KtCodegenParam` |
| VB `KevinCAAParamInfor` | `KtCodegenItem` |
| C++ `KtaControlConfigData` | `KtCodegenParam` |
| C++ `KtaControlConfigItem` | `KtCodegenItem` |
| Qt `KtdAutoCodeParam` 的配置字段 | `KtCodegenParam`；文件、搜索、选中行等宿主状态不迁入 |
| Qt `KtdAutoCodeItem` | `KtCodegenItem` |

## 类图

```mermaid
classDiagram
    class KtCodegenParam {
        +string namePrefix
        +string nameMiddle
        +string nameSpace
        +string appendFunction
        +KtCodegenItem[] items
    }

    class KtCodegenItem {
        +string nameSuffix
        +number id
        +string name
        +string paramString
        +string dataType
        +string tcKind
        +string defaultValue
        +string catAttrInOut
        +boolean isList
        +boolean isOnTree
        +string component
        +number componentCount
        +boolean isParamDlg
        +string unit
        +string author
        +string createDate
        +string notes
    }

    class KtCodegenOptions {
        +tcKinds$
        +catAttrInOutValues$
        +components$
        +hasTcKind(value)$ boolean
        +hasCatAttrInOut(value)$ boolean
        +hasComponent(value)$ boolean
    }

    class KtCodegenReader {
        +readJson(input) Result~KtCodegenParam~
        +readCsv(text) Result~KtCodegenParam~
    }

    class KtCodegenAdapter {
        +replace(target, source)
        +clear(target)
        +writeJson(param)
        +writeCsv(param)
    }

    class KtCodegenController {
        +KtCodegenParam param
        +KtCodegenReader reader
        +KtCodegenAdapter adapter
        +KtCodegenCore core
        +readJson(input)
        +readCsv(text)
        +writeJson()
        +writeCsv()
        +analyze(request)
    }

    class KtCodegenCore {
        +KtCodegenRenderer[] renderers
        +KtCodegenMarker marker
        +analyze(param, request) KtCodegenPlan
    }

    class KtCodegenMarker {
        +createClassId(param, nameSuffix) string
        +createStart(param, nameSuffix, blockKey, linePrefix) string
        +createEnd(param, nameSuffix, blockKey, linePrefix) string
        +scan(param, snapshot, blockKeys) KtCodegenMarkerScanResult
    }

    class KtCodegenRenderer {
        +string id
        +string[] targets
        +render(context)
    }

    KtCodegenParam "1" *-- "0..*" KtCodegenItem
    KtCodegenController "1" o-- "1" KtCodegenParam : maintains shared instance
    KtCodegenController "1" o-- "1" KtCodegenReader
    KtCodegenController "1" o-- "1" KtCodegenAdapter
    KtCodegenController "1" o-- "1" KtCodegenCore
    KtCodegenCore "1" o-- "1..*" KtCodegenRenderer
    KtCodegenCore "1" o-- "1" KtCodegenMarker
    KtCodegenReader ..> KtCodegenParam : creates
    KtCodegenAdapter ..> KtCodegenParam : copies and writes
    KtCodegenRenderer ..> KtCodegenParam : consumes
    KtCodegenRenderer ..> KtCodegenMarker : consumes safe regions
    KtCodegenMarker ..> KtCodegenParam : derives class identity
    KtCodegenOptions ..> KtCodegenItem : UI checks strings
```

图中的关键边界是：`KtCodegenParam` 没有操作方法；Controller 只维护同一个共享实例；Reader 先产生临时数据，读取完整成功后再由 Adapter 用原数组 `splice` 更新共享实例；Marker 只消费 Param 和宿主源码快照，不把文件状态放回数据类；Core 把默认值算法注入 Renderer，避免 Renderer 反向依赖 Core。

## Combo 字符串规则

`tcKind`、`catAttrInOut`、`component` 等字段保持普通 `string`，不改为严格枚举。

- Reader 原样保留旧 CSV/JSON 字符串；
- Adapter 写回原始字符串，不清空、不替换；
- `KtCodegenOptions` 提供旧 Qt/VB 界面的固定候选值和查询函数；
- 当前值不在候选列表时，UI 负责提示错误并显示原值；
- 只有用户从 Combo 主动选择新值后，UI 才修改共享数据。

因此，配置即使经过界面打开，只要用户没有主动修正，未知值仍可无损写回。

## 已迁移的参数核心语义

`KtCodegenCore` 已从 `KevinCAAParamInfor.vb` 提取第一组不依赖文件系统的纯 helper：

- 字符串默认值补引号；
- 分号恢复为 C++ 默认值列表中的逗号；
- `Spinner`/`QDoubleSpinBox` 的 `mm` 与 `degree/deg` 单位表达式转换；
- 旧3D点、向量、方向和射线类型集合；
- `IsParamSpecList` 的原判断顺序；
- 参数名末尾单独大写字符的提取规则；
- 五类 Dialog/Command Selector Field 的精确组件判断规则。

这些 helper 不修改 `KtCodegenItem`。默认值输出使用 [`core-default-values.json`](tests/fixtures/expected/core-default-values.json) 保存 golden cases，确保后续 Renderer 复用时保持旧行为。

## 使用方式

```ts
const controller = new KtCodegenController();

const loaded = controller.readCsv(csvText);
if (!loaded.ok) console.error(loaded.diagnostics);

// 数据类没有 getter/setter，也没有读写操作。
controller.param.items[0].defaultValue = "42";

// UI 可提示未知 Combo 值，但不能自动清空。
const known = KtCodegenOptions.hasComponent(
  controller.param.items[0].component,
);

const json = controller.writeJson();
const plan = controller.analyze({
  targets: ["caa.core", "qt.dialog", "cpp.parameter"],
  snapshot: {
    files: [{ path, text, fingerprint }],
  },
});
```

## 已实现范围

- 旧17列 CSV 读取与写出；
- CSV 转旧 v4 JSON；
- 旧 v4 JSON 读取与写出；
- `Count`/`ComponentCount` 等历史别名；
- 未知 Combo 字符串无损保留；
- 32个旧 block key；
- 32个 block 的 VB 调用、源码位置、主目标和废弃状态迁移矩阵；
- 第一组默认值、类型和列表核心 helper；
- 旧 Kevin Start/End 标记构造、只读扫描和精确替换偏移；
- 标记孤立、缺失、嵌套、错配和未知 block 诊断；
- 标记区域进入 Analyze Plan；
- 普通 C++ Parameter 的构造、声明、析构和赋值四块 Renderer；
- CAA 实现类与纯虚接口的 Get/Set 四块 Renderer；
- CAA 单参数 CPP Get/Set 与 Param 聚合桥接四块 Renderer；
- CAA Catalog 参数注册与 Factory On Tree 两块 Renderer；
- CAA Dialog Notify 控件通知注册块 Renderer；
- CAA Dialog Field 枚举及两个废弃 Selector 访问兼容块 Renderer；
- 废弃兼容块实际生成时返回不阻止 Apply 的结构化 warning；
- CAA Command Agent 声明、构造和析构三个宏块 Renderer；
- CAA Command BuildGraph、FIA Clear 与 UpdateState 三块 Renderer；
- CAA Command PDA/FIA Action、废弃 ElementSelected 与活动 Field 四块 Renderer；
- CAA/Qt Parameter 与 Dialog 双向更新四块 Renderer；
- artifact 通过 `regionId` 关联安全区域，并保留文件指纹、缩进和 LF/CRLF；
- 32个归档旧 block 全部具备 Renderer、Marker artifact 与迁移状态测试；
- fixtures、结构化预期数据和单元测试。

当前 Analyze 可以读取调用者提供的不可变源码快照，但不自行打开或写入文件。请求目标与标记完整时，计划可以返回 `canApply: true`；真实 Apply 仍由未来宿主或通用 code-core 完成。

## 运行

```bash
pnpm typecheck
pnpm test
```

## 后续评审重点

1. `KtCodegenItem` 的17个公开字段是否完整。
2. `KtCodegenParam` 是否还有遗漏的类级共享字段。
3. Reader 与 Adapter 的职责边界是否需要继续合并。
4. `KtCodegenController` 是否只保留宿主编排职责。
5. CAA 的 model/core/control/dialog/parameter/feature-io 目标划分是否正确。
