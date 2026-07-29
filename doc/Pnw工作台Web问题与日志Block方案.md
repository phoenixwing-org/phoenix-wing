# Pnw 工作台 Web · 问题与日志 Block 方案

状态：0.6.0 本地候选已实现；Problems 契约仍实验

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.x 后续实验

最后核验：2026-07-29

## 1. 目标

工作台 Bottom 应接近 VS Code Panel 的信息密度和交互，而不是页面式大标题、说明卡片或 fixture 文章：

- `问题` 显示当前未解决的结构化诊断；
- `运行日志` 显示按频道组织的流式日志；
- 两者由 Wing 提供通用 Block 外观与最小数据接口；
- 框架、公共组件和 consumer 都通过同一实例级总线发布信息；
- Router、打开文件、业务定位、持久化与脱敏仍由 consumer 处理。

这里“模仿 VS Code”指信息架构、紧凑行布局、频道/过滤和可定位问题等交互，不复制 VS Code 源码、图标或样式资产。

## 2. 现有消费者盘点

| 消费者 | 当前实现 | 可提炼证据 | 不应进入 Wing |
|---|---|---|---|
| Wing | `PnwShellLogPanel` 接收一个 `logText` 字符串，自动滚动并提供清空/收起 | 已有三个消费者复用，兼容入口必须保留 | 单一字符串不能表达级别、频道和问题生命周期 |
| Phoenix Admin Workbench | `PahWorkbenchShell` 使用 `PnwShellLogPanel`，保存最近约 50 行内存日志 | 证明壳层需要全局运行日志、清空、收起和高度偏好 | `sys-log` CRUD、任务日志 API/分页/权限是 Admin 业务 View，不是框架日志 |
| Open Issue | `AppShell` 使用 `PnwShellLogPanel` 与 Bottom 开关 | 证明简单消费者也需要统一 Bottom 日志入口 | 当前 `logText` 基本没有生产者；Issue 领域问题不是编译诊断 |
| Desk Tools | `GlobalWorkbenchBottomPanel` 提供“预检 / 问题 / 运行日志”；日志跨 View 保留、限长、可自动展开；Codegen 问题含 severity/code/message/location 和点击定位 | 当前最完整的真实 Web 证据，应作为交互基线 | Codegen store、文件打开、预检指纹和页面路由仍属 Desk Tools |
| BOM Studio | 尚无统一工作台日志/问题 Panel；API 错误多为 toast/console，操作日志仍是业务占位 | 说明不能假定所有消费者已有诊断 store | 后端请求日志、审计日志和 Dispatch 操作日志属于产品数据 |

结论：`PnwLogBlock` 已有 Admin、Open Issue、Desk Tools 三个 Web 证据；结构化 `PnwProblemsBlock` 当前主要由 Desk Tools 证明，Wing 可按用户确认方向建立实验接口，但在 Admin 或第二消费者落地前不冻结为稳定协议。

Admin 没有比 Wing 更通用的日志控件。它的壳层日志已经复用 `PnwShellLogPanel`；另外两套 `sys-log` 和任务日志是带后端服务、权限、分页的业务界面，不能搬入 Wing。Desk Tools 的全局 Bottom Panel 更接近目标，但仍需去除产品字段后才能回收到 Wing。

## 3. 目标视觉

```text
┌ 问题  2  │ 运行日志  38 ─────────────── [频道▼] [级别] [过滤] [清空] ┐
│ ERROR   marker.missing-end   缺少 End 标记   Foo.cpp:128   codegen │
│ WARNING config.deprecated    配置项已弃用     config.json:42  host │
│────────────────────────────────────────────────────────────────────│
│ 21:14:02  INFO   pnw.workbench   ActivityBar 切换为 tree          │
│ 21:14:03  ERROR  poi.api         请求失败：403                    │
└────────────────────────────────────────────────────────────────────┘
```

公共 Block 不再出现 `BOTTOM · VIEW CONTRIBUTION`、大号“运行与诊断”标题或灰色大卡片。

### Problems Block

- 一行显示 severity 图标/文本、消息、code/source、resource:line:column；
- error / warning / info 可过滤，计数回写 Bottom tab；
- 支持文本和 source 过滤；
- 可定位项发出 `open`，consumer 决定 Router、文件编辑器或领域页面动作；
- owner/source 替换问题集合，已解决问题能从列表移除；
- 空态只显示一行“未检测到问题”。

### Log Block

- 等宽字体紧凑行，时间、级别、频道、来源和消息可分列或在窄屏合并；
- 支持频道选择、级别过滤、文本过滤、清空和自动滚动；
- 新错误可更新计数，但是否自动打开 Bottom 由 consumer 偏好决定；
- 默认只保留有界内存记录，防止长时间运行无限增长；
- 复制、导出文件和服务端查询以后按真实消费者需求追加。

## 4. 最小数据契约候选

以下形状用于 W5 原型，命名遵守 Wing 前缀，但在两个 Problems 消费者完成前不承诺冻结：

```ts
type PnwLogLevel = 'debug' | 'info' | 'warning' | 'error'

interface PnwLogEntry {
  id: string
  timestamp: number
  level: PnwLogLevel
  channel: string
  source?: string
  message: string
  details?: string
  correlationId?: string
}

type PnwProblemSeverity = 'error' | 'warning' | 'info'

interface PnwProblemItem {
  id: string
  ownerId: string
  severity: PnwProblemSeverity
  message: string
  source?: string
  code?: string
  resource?: string
  line?: number
  column?: number
  details?: string
}

type PnwProblemInput = Omit<PnwProblemItem, 'ownerId'>
```

不直接保存 `Error`、Vue Component、Router location 或任意业务对象。consumer adapter 负责把异常安全地规范化，避免 token、密码、请求体和个人信息进入日志。

## 5. 实例级诊断总线

总线必须按工作台实例创建，禁止模块级全局 singleton，避免同页多应用、测试和微前端互相串日志。

建议总线区分追加型日志和状态型问题：

```ts
type ExperimentalDiagnosticsCommand =
  | { type: 'log.append'; entry: PnwLogEntry }
  | { type: 'log.clear'; channel?: string }
  | { type: 'problems.replace'; ownerId: string; items: readonly PnwProblemInput[] }
  | { type: 'problems.clear'; ownerId: string }
```

- 日志是时间序列，按最大条数/字符数截断旧记录；
- 问题是当前快照，同一 `ownerId` 使用 replace/clear，避免已解决问题永久残留；
- hub 提供 `dispatch`、`subscribe` 和不可变 `snapshot`；
- Vue composable 只负责 provide/inject 与响应式 snapshot；
- consumer 可把 Pinia、WebSocket、任务流、API interceptor 或页面诊断桥接进 hub；
- Wing 自身使用 `pnw.workbench` 频道报告布局回退、无效配置和框架错误；
- hub 不上传遥测、不写 localStorage、不调用 Router，也不替代浏览器 `console`。

## 6. 与现有 API 的兼容

- `PnwShellLogPanel` 继续保留，避免破坏 Admin、Open Issue 和旧消费者；
- 可在内部把 `logText` 按行适配给新 `PnwLogBlock`，但不反向伪造级别和频道；
- `PnwBottomPanel` 继续负责 tabs、summary 和容器；`PnwProblemsBlock` / `PnwLogBlock` 只负责内容；
- `PnwWorkbenchShell` 不自动创建全局 hub。简单 consumer 可显式传入 snapshot，复杂 consumer 可 provide 一个实例；
- `PnwAsyncTaskState.logs` 暂时保持字符串数组，后续只通过 adapter 投影，不修改异步任务领域协议。

## 7. 与动态布局的关系

诊断总线与渲染位置必须解耦。Problems/Log 初期固定在 Bottom；动态布局原型稳定后，`pnw.problems` 和 `pnw.output` 可成为第一批允许放入 Bottom 或 Primary 的框架 dock item。移动只改变 Block 宿主，不清空日志、不改变 owner/source，也不重新创建总线。

具体拖动与组件生命周期风险见[《Pnw 工作台 Web · 动态布局与拖动可行性》](Pnw工作台Web动态布局与拖动可行性.md)。

## 8. 分阶段路线

1. **W5-L0（已完成）：** fixture 已用新公共 Block 替换文章式 Bottom 内容；数据继续由 fixture consumer 产生。
2. **W5-L1（已完成）：** 已提炼纯 TS entries/problems/hub、日志限长、owner replace/clear、频道/级别/source/文本过滤及单元测试。
3. **W5-L2（已完成本地候选）：** 已实现 `PnwLogBlock`、`PnwProblemsBlock`，使用公共主题 token、窄容器样式、原生键盘控件和 ARIA log/list 语义；`PnwShellLogPanel` 保持兼容。真实浏览器和第二 Problems consumer 回归继续放在 L3/L4。
4. **W5-L3：** 先让 Open Issue 通过 adapter 写入框架日志，再让 Admin 把 Pah 壳层日志接入；不接入 Admin 的审计日志数据库。
5. **W5-L4：** 让 Admin 或第二真实 Web 页面提供结构化 Problems，比较 Desk Tools 后再冻结 `PnwProblemItem`。
6. **W5-L5：** 作为动态布局第一个稳定 dock item，验证 Bottom / Primary 移动不丢状态。

当前公共 hub 是显式创建的纯 TypeScript 实例，不是全局 singleton，也不由 `PnwWorkbenchShell` 自动创建。fixture 订阅不可变 snapshot 后传入两个 Block，证明 View 切换时日志不丢失、验证页的问题可按 owner 整组出现/清除。Vue provide/inject 暂不增加：Pinia、普通 `shallowRef` 和微前端容器对实例所有权的选择不同，尚无两个消费者证明必须统一为 composable。

## 9. 退出门禁

- fixture Bottom 与 VS Code 类似，为紧凑问题行和日志行，没有页面式大标题；
- 同一工作台只有一个 diagnostics hub，切换 View 不丢全局日志；
- 问题能按 owner 替换和清除，已解决项不会残留；
- 日志限长、频道/级别/文本过滤、清空和自动滚动有测试；
- `open problem` 只发事件，不读取 Router/path 权限；
- 原始 `Error` 和敏感业务 payload 不直接进入公共状态；
- `PnwShellLogPanel` 兼容消费者继续通过类型与构建；
- Admin/Open Issue/Desk Tools adapter 不复制公共 UI；
- 至少两个真实 Problems 消费者完成后才把实验契约标为稳定。
