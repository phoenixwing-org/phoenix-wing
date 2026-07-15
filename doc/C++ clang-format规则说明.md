# C++ clang-format 规则说明

> 基线来源：`KtAlarmClock/.clang-format`（version 1.0）。为避免测试依赖另一个工作区，原始配置已复制为 `src/code-core/fixtures/ktalarmclock.clang-format.yaml`。该 fixture 用于兼容性审计，不作为 Wing 仓库自身的全局格式化配置。

## 1. 与成员排序的关系

Phoenix 的 Header 成员排序首先兼容这套 clang-format 风格，尤其兼容项目自定义项。排序 core 只调整声明顺序和与排序直接相关的稳定空白，不承担完整格式化器职责。

直接约束排序输出的规则如下：

1. **类尾不留空行**：最后一个普通成员变量、成员函数或 `// clang-format on` 之后直接是类结束标记 `};`。排序不得依赖用户随后运行 clang-format 才清理；但不同注释段之间已有的空行必须保留，例如 `//END ...` 与 `// clang-format on` 之间的空行。
2. **访问修饰符保持项目缩进**：`AccessModifierOffset: -4` 配合 `IndentWidth: 4`，访问修饰符相对成员退一级；排序移动声明时必须保留声明自身缩进和访问区标签。
3. **大括号风格稳定**：`BreakBeforeBraces: Custom` 且 class/struct/function/control 的 `After*` 多数为 `false`，左大括号通常不另起一行；排序不能主动改写类声明或函数体的大括号布局。
4. **空行最多保留一行**：`MaxEmptyLinesToKeep: 1`。访问区内部已有的有意义分组可保留一行，但类尾空行必须收敛为零。
5. **锁定段内容保护**：`// clang-format off` 到 `// clang-format on` 属于成员排序锁定段，生成声明、注释、顺序和内部空白均不得改变。类尾清理只允许删除最终项与 `};` 之间的纯空行，不得删除 `// clang-format on` 之前的空行。

对应回归样例是 `src/code-core/fixtures/clang_format_class_tail.h`；测试同时覆盖 LF、CRLF、成员函数结尾、成员变量结尾、类尾 Wizard 锁定段和二次执行幂等。

## 2. 风格解读

### 基础与行宽

| 配置 | 含义 |
| --- | --- |
| `BasedOnStyle: LLVM` | 以 LLVM 为默认基线，下面项目配置覆盖基线。 |
| `Language: Cpp` | 按 C++ 语法格式化。 |
| `ColumnLimit: 100` | 目标行宽为 100 列，超长声明可能换行。 |
| `IndentWidth: 4` / `TabWidth: 4` / `UseTab: Never` | 四空格缩进，不写 Tab。 |
| `IndentWrappedFunctionNames: true` | 函数声明换行时，函数名参与缩进布局。 |

### 对齐

`AlignAfterOpenBracket: Align`、`AlignOperands: true` 会对齐括号后的续行和表达式操作数。连续赋值、连续声明、行尾注释分别由 `AlignConsecutiveAssignments`、`AlignConsecutiveDeclarations`、`AlignTrailingComments` 对齐。转义续行也使用左对齐策略。

这些规则可能改变列位置，但不改变成员排序次序；因此 core 不模拟对齐，只保留声明文本随成员整体移动。

### 大括号与短语句

- `BreakBeforeBraces: Custom` 启用 `BraceWrapping` 的逐项控制。
- class、struct、enum、function、namespace、control statement 和 extern block 的左大括号通常不另起一行；union 例外。
- `BeforeCatch`、`BeforeElse` 为 `true`，`catch` 和 `else` 与前一个右大括号分行。
- 仅空函数允许单行；一般 block、case label、enum、loop 不压成单行；短 `if` 可以单行。
- 空函数、空 record、空 namespace 允许拆分为多行。

这些主要属于 clang-format 的排版职责。成员排序不得进入函数体重新排版，也不得为了排序改变短语句形式。

### 构造函数、指针与空格

- `BreakConstructorInitializersBeforeComma: true`：构造初始化列表采用项目前置逗号换行风格。
- `PointerAlignment: Left`：`*`、`&` 靠近类型。
- C 风格 cast 后不额外加空格；赋值运算符前保留空格；普通圆括号内不加空格；方括号和容器字面量按配置保留空格。

Header 排序只移动完整声明块，不应重新生成上述标点和空格。`.cpp` 构造初始化列表若由排序 core 兼容处理，输出变更必须由 fixture 固定。

### 其他规则

- `AllowAllParametersOfDeclarationOnNextLine: true`：声明参数允许整体放到下一行。
- `AlwaysBreakAfterDefinitionReturnType: None`：不强制定义的返回类型后换行。
- `IndentCaseLabels: false`：case 标签不增加一级缩进。
- `KeepEmptyLinesAtTheStartOfBlocks: true`：block 开头已有空行可保留；这不意味着允许类结束标记前保留空行。
- `CommentPragmas: '^ IWYU pragma:'`：匹配的 IWYU 注释作为格式化 pragma 处理。
- Objective-C 选项仅影响 ObjC block/property，不属于当前 C++ 成员排序范围。

## 3. 兼容与维护原则

1. 这份 fixture 保留项目实际配置的语义；除非 KtAlarmClock 基线主动改变，不随意“现代化”字段名或默认值。
2. clang-format 不同版本可能对旧字段名给出弃用提示。升级工具链时，应先用目标版本验证配置，再单独更新项目配置和 fixture。
3. 排序结果应在 clang-format 前后保持相同的成员顺序；格式化器只负责布局，不应成为修复排序输出的必需步骤。
4. 新发现的格式冲突先补最小 fixture 和幂等测试，再修改 `phoenix-wing/code-core`；DeskTools 与 KT Auto Code 不复制修正规则。
