# C++ 成员排序算法规范

> **权威位置**：`phoenix-wing`。本文件描述 `src/code-core/` 的排序语义、保护边界与回归契约。  
> 消费方：`phoenix-desk-tools` 与 `kt-auto-code` 只能调用此 core，不复制或改写排序规则。  
> 产品界面、文件选择、编码读写、Git 操作与写盘确认属于各自宿主，见本文“宿主契约”。

## 1. 实现与公开接口

| 文件 | 接口 | 职责 |
| --- | --- | --- |
| `src/code-core/pnwReorderCpp.ts` | `pnwReorderCppText(text, fileStem)` | `.cpp/.cc/.cxx` 中同一类的成员实现排序与分隔线整理 |
| `src/code-core/pnwReorderHeader.ts` | `pnwReorderHeaderText(text, options)` | `.h/.hpp/.hh` 类声明、访问区与锁定段处理 |
| `src/code-core/pnwReorderHeader.ts` | `pnwFindLockedRegions` / `pnwExtractLockedRegionContents` | 锁定段发现与回归断言 |

core 只接受文本并返回文本、`changed` 和 header 警告；不读取文件、不写文件、不依赖 Git、VS Code、Node `fs`、Vue 或 Tauri。

## 2. 通用安全约束

- 保留原文件换行风格：LF、CRLF、CR 均不被统一成另一种风格。
- 排序必须幂等：同一输入连续执行两次，第二次 `changed === false`。
- 代码位置识别跳过注释和字符串，避免把注释或字符串中的 `Class::method` 当成声明/定义。
- 无法安全识别的结构宁可保留源顺序，并通过 header `warnings` 暴露风险；不得猜测后写盘。
- `GBK`、UTF-8 BOM 与文件字节写回不是 core 的职责：宿主须在调用前解码，并在写回时保持原编码/BOM。

## 3. `.cpp` 成员实现排序

### 3.1 作用范围与安全边界

1. 先从类限定实现中识别目标类；优先使用 `fileStem`，否则选择出现次数最多的首字母大写限定类名。
2. 没有可识别构造函数时不改写文件。这是为避免生成代码、Wizard 区和非典型实现被错误重排的保守边界。
3. 只重排类外成员定义；函数体内对 `Class::method()` 的调用不提取为独立块。
4. 函数前连续注释、分行返回类型与函数体随同一个块移动；函数之间的空白行被规范化。

### 3.2 排序顺序

特殊成员优先，随后普通成员按名称的大小写不敏感字母序排列：

1. 默认构造；
2. 其他构造；
3. 析构；
4. 拷贝构造；
5. 移动构造；
6. 拷贝赋值 `operator=`；
7. 移动赋值 `operator=`；
8. 其他 operator；
9. 其他成员实现。

同名 overload 依赖稳定排序，保持原有相对顺序。

### 3.3 分隔线与初始化列表

- 每个输出块使用已有 `//-----` 分隔线，缺失时使用默认分隔线。
- `//---static---`、`//---INSIDE FUNCTION---` 等注释型分隔线不被吸收到函数块中；不得生成连续双分隔线。
- `} //-----` 这类粘连分隔线会拆为独立行。
- 构造函数初始化列表由引擎按现有兼容规则规范化；算法变更必须更新 fixture 与 golden hash。

## 4. Header 类声明排序

### 4.1 识别范围

- 处理带导出宏、`final`、继承列表的 `class` 定义。
- 逐个 `public:`、`protected:`、`private:`、`public slots:`、`protected slots:` 与 `signals:` 访问区处理。
- 声明前的 Doxygen/普通注释随声明移动；宏、嵌套声明、Doxygen group 等无法安全展开的结构保持源顺序。

### 4.2 排序顺序

在每个可安全排序的访问区内：

1. 特殊成员按 `.cpp` 的同一优先级；
2. 普通方法按大小写不敏感字母序；
3. 成员变量默认保持原位置与相对顺序；仅 `sortMembers: true` 时才按名称排序。

含编号 Doxygen（如 `/** 1. ... */`）的声明保持源序并报告 warning，避免编号语义失效。

### 4.3 锁定段（P0）

以下成对区间整体冻结，段内字符顺序与内容不得变化；嵌套或重叠时合并为最外层区间：

| rule id | 起止标记 | 说明 |
| --- | --- | --- |
| `clang-format` | `// clang-format off` … `// clang-format on` | LLVM 格式化忽略段 |
| `kevin-caa-wizard` | `START KEVIN CAA WIZARD SECTION` … `END KEVIN CAA WIZARD SECTION` | Kevin CAA 向导生成段 |
| `caa2-wizard` | `// CAA2 WIZARD` … `// END CAA2 WIZARD` | CAA2 向导生成段 |
| `pragma-region` | `#pragma region` … `#pragma endregion` | IDE/生成代码折叠区 |

`#pragma region VirtualFunction` 当前按通用 `pragma-region` 处理，不另行赋予特殊排序语义。

### 4.4 Kevin system-code 兼容

`kevinSystemCodeMode` 取值如下：

- `merge_strip`（默认）：合并可兼容的 system-code 声明并移除 START/END 标记；
- `keep_markers`：保留标记；
- `off`：不进行该兼容转换。

该兼容层与锁定段不同：只处理已识别的声明区，不能越过锁定段。

## 5. 宿主契约（必须遵守）

| 环节 | 要求 |
| --- | --- |
| 扫描/预检 | 只计算 core 结果，默认只展示 `changed` 文件；点击文件只能打开原文件，不创建临时 `untitled` Diff。 |
| 写盘 | 必须经显式确认；写前比较当前原始字节与预检快照，不一致则阻止写入。 |
| 写盘后 | 仅更新缓存表格行状态，不重新扫描或清空用户勾选状态。不得对批量结果逐个自动弹出 Diff。 |
| 差异预览 | 只在用户点击已写盘行的“预览差异”时，调用宿主的内置 Git 查看；不实现自定义 Diff。 |
| 还原 | 仅可恢复本次会话中成功写盘的文件；恢复前比较当前字节是否仍等于本次输出，避免覆盖用户后续修改；恢复的是排序前快照，不是盲目 `git restore`。 |

## 6. 回归契约与已知边界

当前 core fixture 位于 `src/code-core/fixtures/`：15 个 header 与 7 个 `.cpp`。测试覆盖：

- `.cpp` 的 Python 历史 golden hash、特殊成员、注释分隔线、函数体内部调用、分行返回类型、CRLF、初始化列表与幂等；
- header 的访问区、特殊成员、成员变量可选排序、导出宏、嵌套锁定段、Kevin/CAA2 Wizard、通用 pragma region、Kevin system-code、Doxygen 编号警告、CRLF 与幂等。

仍需补充最小 fixture 后再放宽的边界：

1. 带 `requires`、尾置返回类型、复杂模板实参或函数指针的类外定义；
2. 函数体中含有未覆盖的大括号字符串/原始字符串、复杂预处理条件时的 `.cpp` 块边界；
3. 多个同名/多命名空间类实现共存的 `.cpp`；
4. 更复杂的宏声明、C++20 module、Unicode 标识符；
5. 新的 CAA Wizard 标记。

新增或调整规则时：先新增最小 fixture，再写输出/锁定字节/幂等断言；若 `.cpp` 输出有意改变，更新历史 golden hash 并在提交说明中写明原因。

### 6.1 原实现迁移审计（2026-07）

对 DeskTools 历史 Python `reorder_members.py` 与当前 `code-core` 的逐项审计结论：

| 能力 | core 状态 | 证据 |
| --- | --- | --- |
| `.cpp` 类名识别、构造函数安全边界、块扫描、函数体内调用排除、前置注释/返回类型、分隔线与特殊成员排序 | 已迁入 | `pnwReorderCpp.ts`；7 个 Python 历史输出 hash |
| header 访问区、导出宏、声明分类、特殊成员、成员变量可选排序、Doxygen group/编号保护 | 已迁入 | `pnwReorderHeader.ts`；15 个 header fixture 的语义与幂等测试 |
| clang-format、Kevin、CAA2、pragma 锁定段及嵌套合并 | 已迁入 | `pnwFindLockedRegions`、锁定字节断言 |
| Kevin system-code 的合并/保留/关闭三种模式 | 已迁入 | `kevinSystemCodeMode` 测试 |
| 文件枚举、ignore、工作集、偏好、GBK 文件 I/O、进度、Git/Web/VS Code UI | 有意不迁入 | 产品宿主 adapter 的职责，不是算法遗漏 |

审计发现的主要测试缺口是：`.cpp` 已固定 Python hash，但 header 尚未对全部 fixture 固定 Python 输出 hash。当前 header 测试覆盖行为、锁定字节和幂等；在放宽复杂 header 语法前，应补逐 fixture golden 输出，而不是直接扩展正则。

## 7. 文档归属

- `phoenix-wing`（本文）：算法语义、公开接口、锁定规则、回归契约的唯一规范。
- `phoenix-desk-tools/doc/code/`：Web/CLI 使用、工作集、Python 兼容入口与 DeskTools 页面行为；算法规则链接到本文。
- `kt-auto-code/doc/`：VS Code 扫描、选择、Git 预览、会话还原与发布验收；算法规则链接到本文。
