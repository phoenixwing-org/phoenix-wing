# Pnw 本地工程工作空间能力提炼计划

状态：0.7.0 本地候选（WS1 与最小 Tauri command bridge 已实现，未发布）

Owner：Phoenix Wing maintainers

适用版本：0.7.0 本地候选

最后核验：2026-08-16

## 1. 修正后的定义

本计划中的“工作空间”首先指 **像 VS Code 一样打开的一个工作目录**，不是 Tab 或
多 View 会话。

工作目录建立了应用的资源边界：文件树、相对路径、索引、Git、SQLite、工作空间偏好和
页面会话都归属于它。多 View/Tab 是打开工作目录之后的第二层能力，不能反过来定义
Workspace。

```text
本地目录选择器 / 最近工作空间
             │
             ▼
Pnw Workspace：一个已授权、已规范化的真实文件系统目录
  ├─ canonical rootPath / workspaceId / display name
  ├─ read / write / watch / database 等 capabilities
  ├─ 工作空间相对路径安全边界
  ├─ workspace-scoped preferences / session
  └─ open / switch / close 生命周期
             │
             ▼
Workbench Session（子层）
  ├─ 打开的 View/Tab
  ├─ Editor MRU / floating presentation
  ├─ dirty close guard
  └─ 页面状态恢复
```

目标是让本地工程 Web UI 能快速获得可靠的“打开目录后工作”模式。Desk Tools 是公开的
第一真实样本；第二个本地工程 Web UI 只作为消费者证明，在 Wing 公共 API、fixture 和
本文中保持名称脱敏。

本计划同时记录已冻结的公共契约与后续阶段；当前实现只修改 Wing，不修改 Desk Tools，
也不发布。

产品名称及本地/服务器两条 Host 产品线遵循
[《Pnw 本地与服务器 Host 产品线边界》](Pnw本地与服务器Host产品线边界.md)。本文不把本地
Hono Host 描述为 Phoenix Admin，也不把纯浏览器降级当作本地文件系统能力。

## 2. 与远端纯 Web 的区别

| 形态 | 资源真源 | 目录能力 | 数据库 | Wing 使用方式 |
| --- | --- | --- | --- | --- |
| 本地工程 Web UI | 本机项目目录 | Host/sidecar 授权后可读写、监听 | 可用工作空间 SQLite | 完整 Workspace lifecycle + Host adapter |
| 远端纯 Web | 远端服务、对象存储或仓库 | 不假设本机路径；可由服务端提供虚拟 URI | 远端数据库 | 可复用描述符、session port 和 Workbench 子层 |

V1 的第一真源始终是本机文件系统目录。Wing 的 Vue 组件不能自行绕过 Host 权限读取
文件或 SQLite，但它必须明确持有当前目录及最近打开目录的受控状态，并通过 Node、Tauri
或 localhost sidecar adapter 操作。远端纯 Web 只是以后可复用部分协议的兼容形态，
不能反过来把本地目录抽象掉。

### 2.1 前端与后端的第一责任边界

本地工作空间不是“前端拿到一个路径字符串后自行访问文件”。它必须拆成两个明确层次：

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| Web 前端 / Webview | 欢迎页、打开按钮、当前目录、最近列表、目录树和文件状态呈现；loading/error/readonly；工作空间切换交互；按 Workspace 恢复 View、布局和偏好 | 不直接调用 `fs`；不自行 canonicalize；不拼绝对路径绕过 Host；不打开 SQLite 文件 |
| 本地后端 / sidecar | 目录选择；canonical real path；存在/可读/可写与授权；列目录、读写文件、watch；SQLite、Git、索引和任务；相对路径越界防护 | 不决定页面布局、Ribbon/Tree 外观、View 标签、空态和前端交互 |

前后端协议的推荐最小身份是：

```ts
interface PnwWorkspaceResourceRequest {
  workspaceId: string;
  relativePath: string;
}
```

打开成功时，后端一次性返回 `workspaceId + canonical rootPath + capabilities`。后续文件操作
优先传 `workspaceId + normalized relativePath`，由后端重新映射并检查仍在 root 下；不能信任
前端提交的任意绝对路径。`rootPath` 仍会在前端显示并成为用户理解的工作空间真源，但它
不是绕过 Host 权限的通行证。

因此 Wing 的公共化也分成两部分：

- Vue/UI 层提供 Workspace 页面效果和受控交互原语；
- Core/Node contract 提供生命周期、路径与 Host adapter 边界；
- 产品业务模块只调用 adapter，不复制安全校验，也不让 Wing UI 接管业务文件格式。

## 3. Desk Tools 的真实链路

### 3.1 打开目录

Desk Tools 当前已经具备：

1. 欢迎页或配置页发起“打开工作空间”；
2. Tauri 使用原生目录选择器，普通 Web 使用本地 Host API；
3. Host 对输入路径执行 trim、absolute resolve、目录存在性和可读性检查；
4. Host 拒绝把应用安装目录本身作为用户工作空间；
5. 成功后记录当前目录和最近工作空间；
6. 前端加载该目录的模块配置、onboarding、文件工作集和 Workbench session；
7. Header 显示短名称，完整路径只作辅助信息。

### 3.2 切换目录

切换不是简单改一个字符串。当前实际顺序包含：

- 检查打开的工具 Tab 和 dirty 页面；
- 用户确认后保存旧工作空间 session；
- 激活新目录并刷新 recent/current 状态；
- 加载新目录的模块范围和工作空间偏好；
- 恢复新目录自己的 Tab、页面状态与工作集；
- 清理旧目录的运行时 handler；
- 更新标题、状态栏和文件树。

这证明 Workspace 应有独立生命周期和两阶段切换，不能由每个页面自行 watch
`workspacePath` 后零散清理。

### 3.3 关闭目录

关闭工作空间需要：

- 统一检查 dirty/未完成 View；
- 保存或放弃工作空间会话；
- 关闭文件 watcher、数据库和长任务；
- 清空工作空间 scoped View、树、handler 与缓存；
- 回到欢迎页/空工作台；
- 保留最近工作空间列表，但清除 active workspace。

### 3.4 工作空间内能力

目录打开后，Desk Tools 才启用：

- 工作空间文件树与按扩展名过滤；
- 文件/目录相对路径选择；
- 源码、CAD、Git 等索引与搜索；
- `.phoenix` 下的结构化状态；
- `phoenix-workspace.sqlite`；
- 每工作空间导航模块、偏好和 UI session；
- 以 workspace root 为安全根的读写 API。

这些业务模块不应全部进入 Wing，但它们共同依赖的 Workspace identity、生命周期、路径
边界、capability 和 storage port 值得公共化。

## 4. 公共能力的作用

| 能力 | 解决的问题 | 第三方收益 |
| --- | --- | --- |
| 稳定 Workspace identity | 不能用易变显示名或任意原始路径作状态 key | 所有缓存、Tab、数据库、任务都能按同一 ID 隔离 |
| 受控 open/switch/close | 页面各自清理容易遗漏和竞态 | 一条生命周期协调 dirty、session、watcher、DB、任务 |
| Host capability 描述 | Web/Tauri/Node/远端能力不同 | UI 可按能力显示，而不是运行时报错 |
| 相对路径边界 | `../`、绝对路径、符号链接可能越界 | 文件 API 从入口统一安全校验 |
| recent workspace 投影 | 每个应用重复最近目录列表 | 可复用数据结构、去重和失效状态，不接管持久化 |
| workspace-scoped storage | 不同目录的布局/Tab/偏好不能串用 | 同一 port 可接 SQLite、HTTP、IndexedDB |
| 工作空间恢复 | 重新打开目录要恢复上次工作 | View session 成为 Workspace 的子快照 |
| 失败回滚 | 新目录打开失败不能破坏旧工作 | 两阶段切换保留原 Workspace，返回结构化错误 |

## 5. 建议进入 Wing 的能力

### 5.1 纯 Workspace 描述符

候选公共类型：

```ts
type PnwWorkspaceCapability =
  | "read"
  | "write"
  | "watch"
  | "database"
  | "native-directory-picker";

interface PnwWorkspaceDescriptor {
  workspaceId: string;
  name: string;
  rootPath: string;
  rootUri?: string;
  readonly: boolean;
  capabilities: readonly PnwWorkspaceCapability[];
}
```

约束：

- `rootPath` 是本地 Workspace 的第一真源，必须是 Host 校验后的 canonical absolute path；
- `workspaceId` 是与 canonical rootPath 绑定的稳定状态 key，不能替代或隐藏目录本身；
- `rootUri` 只是跨协议/远端 adapter 的可选表示，不能成为本地 V1 的唯一根；
- canonical real path、大小写、盘符、网络盘和符号链接由文件系统 Host adapter 决定；
- Header、欢迎页和最近列表默认可显示 `rootPath`，Host 可按隐私场景缩写，但不可用显示名
  代替权限判断；
- V1 只支持一个根目录。VS Code 式 multi-root workspace 留待真实需求，不预建。

### 5.2 Host adapter

```ts
interface PnwWorkspaceHostAdapter {
  pickDirectory?(request: PnwWorkspacePickRequest): Promise<PnwWorkspacePickResult>;
  open(request: PnwWorkspaceHostOpenRequest): Promise<PnwWorkspaceDescriptor>;
  close?(workspace: PnwWorkspaceDescriptor, signal?: AbortSignal): Promise<void>;
  validate?(workspace: PnwWorkspaceDescriptor, signal?: AbortSignal):
    Promise<PnwWorkspaceValidation>;
}
```

Wing 只定义 adapter 契约与纯 controller；具体实现可位于 Node sidecar、Tauri commands 或
远端 API。它不能在根 Vue 包引入 `fs`、Tauri、原生对话框或 SQLite 驱动。

### 5.3 Workspace 生命周期状态机

候选状态：

```text
closed
  └─ pick/open → opening → open
open
  ├─ switch → preparing-switch → opening-target → open
  └─ close  → preparing-close  → closed
opening/switching/closing
  ├─ cancel
  ├─ fail + rollback
  └─ stale revision ignored
```

`pnwCreateWorkspaceController()` 已管理：

- 当前真实目录 descriptor、最近打开目录列表、pending target、phase、revision 和结构化
  error；
- `requestOpen`、`requestSwitch`、`requestClose`；
- 事务式 prepare/commit/rollback hook；
- 快速重复选择时 only-latest-wins；
- `AbortSignal` 与不能取消时的 stale revision 拒绝；
- 同一 workspace 重复打开时聚焦/刷新，不重建；
- open 失败时旧 workspace 继续可用；
- close/release 幂等。

### 5.4 切换计划与资源释放

Workspace controller 不直接知道业务资源，而是让 Host 注册实例级 participants：

```ts
interface PnwWorkspaceLifecycleParticipant {
  id: string;
  prepare?(context: PnwWorkspaceTransitionContext):
    Promise<PnwWorkspaceTransitionVote | void>;
  commit?(context: PnwWorkspaceTransitionContext): Promise<void>;
  rollback?(context: PnwWorkspaceTransitionContext): Promise<void>;
}
```

参与者可包括 Workbench session、文件 watcher、SQLite handle、索引任务、Git provider 和
产品 cache。Wing 聚合 vote/result；确认对话框、业务保存文案和强制关闭策略归 Host。

必须防止：

- 某个页面关闭了，数据库仍指向旧目录；
- 新目录打开失败但旧 session 已被清空；
- 迟到的旧 watcher 事件写入新 workspace；
- 一个 participant 失败后重复 release 造成二次关闭异常。

### 5.5 打开过的工作空间列表

“打开过的工作空间”是 V1 必备能力，不是可选 UI 装饰。Workspace controller 至少持有：

```ts
interface PnwWorkspaceState {
  current?: PnwWorkspaceDescriptor;
  recent: readonly PnwRecentWorkspaceEntry[];
  phase: PnwWorkspacePhase;
}

interface PnwRecentWorkspaceEntry {
  workspaceId: string;
  rootPath: string;
  name: string;
  availability: "available" | "missing" | "unauthorized" | "unknown";
  lastOpenedAt?: string;
}
```

Wing 提供数据结构和纯操作：

- 以 canonical `rootPath` / `workspaceId` 去重；
- `available/missing/unauthorized` 状态；
- 打开成功后移到列表首位；
- 上限和 MRU 排序；
- 当前项投影；
- 移除 recent 不等于删除目录；
- missing 项可展示或清理，由 Host 选择。

建议同时定义 `PnwRecentWorkspaceStore` port，让 Host 负责落盘：

```ts
interface PnwRecentWorkspaceStore {
  load(): Promise<readonly PnwRecentWorkspaceEntry[]>;
  save(entries: readonly PnwRecentWorkspaceEntry[]): Promise<void>;
}
```

本地 JSON、Pinia、SQLite、系统菜单或远端账号同步是 adapter 选择。Wing controller 应负责
什么时候更新列表，避免每个页面重复实现“打开成功后记 recent、失效后标 missing、关闭不
删除 recent”。

### 5.6 工作空间相对路径

Wing 已有 `@phoenix-wing/code-core` 的：

- `pnwNormalizeWorkspacePath`；
- `pnwIsWorkspacePathWithin`；
- `pnwRelativeToWorkspaceRoots`。

计划优先复用这些纯函数，不再在 UI 包复制路径规则。Node adapter 还需要补文件系统级
canonical/realpath 检查，处理 symlink 越界、大小写文件系统、UNC 与权限变化。UI/API 传输
优先使用规范化相对路径或 opaque resource ID，不接受页面自由拼接绝对路径。

### 5.7 Workspace-scoped storage port

```ts
interface PnwWorkspaceStorage {
  read<T>(workspace: PnwWorkspaceDescriptor, namespace: string, key: string): Promise<T | undefined>;
  write<T>(workspace: PnwWorkspaceDescriptor, namespace: string, key: string, value: T): Promise<void>;
  delete(workspace: PnwWorkspaceDescriptor, namespace: string, key: string): Promise<void>;
}
```

要求：

- 只接受 JSON 可序列化纯数据；
- namespace 由 Host 白名单管理，避免插件互相覆盖；
- 写入失败不破坏内存 Workspace；
- 不保存令牌、凭证、函数、DOM、Vue Component、绝对路径或临时 z-index；
- schema/version 由具体 namespace 的 codec 负责；
- Wing 不选择 localStorage、SQLite、IndexedDB 或 HTTP。

### 5.8 本地 SQLite 的合理边界

SQLite 可以进入“本地工程 Web UI 能力范围”，但应是可选 adapter，不是 Vue 核心：

```text
Vue/Webview
  │ PnwWorkspaceStorage / HTTP or IPC
  ▼
Node/Tauri/localhost sidecar
  │ @phoenix-wing/db-node（可选）
  ▼
<workspace>/.phoenix/phoenix-workspace.sqlite
```

评估结果：

- `@phoenix-wing/db-node` 已能提供 Node SQLite 连接和基础 get/all/run/exec，可复用；
- `@phoenix-wing/workspace-schema` v13 是 Phoenix 组合业务 schema，包含 CAD、审计、Code、
  CAA 等域，不能要求第三方为 Workspace 基础能力整体采用；
- 现有 `phoenix_ui_session(scope, payload_json, updated_at)` 和
  `phoenix_workspace_pref(section, value_json, updated_at)` 是最小 adapter 的真实证据；
- 若 Desk Tools 与第二个本地 Web UI 都只需要 `namespace/key/payload/version/updatedAt`，可
  进一步提炼独立的 Workbench/Workspace metadata DDL 与 repository；
- SQLite path、目录创建、WAL、备份、锁、加密、schema migration 与连接生命周期由
  sidecar 持有；前端不得直接打开数据库文件；
- 数据库连接必须随 workspace generation 绑定，旧 generation 的读写在切换后拒绝；
- 只读目录可以打开 Workspace，但 capability 中不含 write/database-write，UI 相应禁用；
- SQLite 不可用时可降级内存或其他 store，不应阻止只读浏览目录。

第一阶段只稳定 storage port 和 Workspace lifecycle。SQLite repository 等两个本地消费者
证明字段一致后再批准实现。

### 5.9 已实现的 0.7.0 最小公共入口

根聚合包已经导出：

- `PnwWorkspaceDescriptor`、capability、phase、failure、transition 与 participant 类型；
- `pnwCreateWorkspaceController`：open/switch/close、only-latest、AbortSignal、失败回滚、
  recent MRU；
- `pnwNormalizeWorkspaceRelativePath`、`pnwCreateWorkspaceResourceRef` 与
  `PnwWorkspaceResourcePort`；
- `PnwRecentWorkspaceStore` 和 `PnwWorkspaceStorage` ports；
- `pnwCreateTauriWorkspaceAdapter`：只接收注入的 `invoke` / picker，不引入任何 Tauri 包。

默认 command 名为 `pnw_workspace_open/read_resource/write_resource` 等 `pnw_workspace_*`。
它们只是 Host bridge 协议，不是已经交付的 Rust command。后端仍必须把 `workspaceId`
重新解析到 canonical root，并在每次资源操作时做 realpath/symlink 越界检查。浏览器端的
相对路径校验只能提前拒绝明显非法输入，不能替代文件系统安全边界。

应用数据目录只保存全局用户偏好、recent workspace 列表和当前 workspace 指针；项目输出、
项目缓存、Workbench session 与其他 workspace-scoped 数据默认落在当前目录边界内，通过
`PnwWorkspaceResourcePort` 或 `PnwWorkspaceStorage` 访问。Host 若选择别的介质，仍必须按
`workspaceId` 隔离，并明确其备份、隐私和清理策略。

## 6. Workbench Session 是 Workspace 的子层

现有 `pnwCreateWorkbench`、`PnwWorkbenchTabBar`、View presentation、Primary/Secondary/
Bottom 都保留，但它们必须按 `workspaceId` 隔离：

- Workspace open 后恢复该目录自己的 Tab/View session；
- Workspace switch 前统一执行 dirty close plan 和 snapshot capture；
- 切换成功后释放旧 View runtime，再加载新 Workspace session；
- 切换失败时不销毁旧 Workspace 的 Tab 和页面状态；
- floating View、Editor MRU 和布局偏好都不能跨目录串用；
- Home/欢迎页可以是 application scope，不属于某个工作目录；
- 业务页声明 `workspaceRequired`，未打开目录时由 Host 禁用或显示空态。

多 View reducer、页会话 registry 和异步加载仍值得后续提炼，但归入
`PnwWorkbenchSession`，不再命名为 Workspace 主体。本计划第一目标是目录 Workspace。

## 7. 不应进入 Wing 的内容

| 保留在 Host/业务 | 原因 |
| --- | --- |
| 具体文件类型、目录树过滤与扫描算法 | 产品领域不同 |
| CAD、源码、Git 等业务索引 schema | 不是 Workspace 基础协议 |
| Router、权限、导航模块内容 | Wing 只消费受控结果 |
| 原生文件对话框具体实现 | Node/Tauri/浏览器能力不同 |
| 当前目录和 recent 的持久化介质 | Host 用户偏好与隐私策略 |
| SQLite 业务表、DDL 迁移与备份策略 | 领域与部署相关 |
| 页面 payload、表单草稿与保存 API | 通过 session/storage port 适配 |
| 多 root、远程 SSH、容器工作空间 | 无当前消费者证据，V1 不预建 |
| 任意绝对路径读写 | 必须经过 Host 授权和 Workspace root 校验 |

## 8. “一切皆插件”只作为架构参考

本计划聚焦本地工作台，不在 Wing 中设计 Agent、MCP、领域工具注册、执行沙箱或 AI
编排。DSH（deepseek-harness）的“一切皆插件”理念只提供一条有用约束：Workspace、
Workbench Session、导航、View 和诊断都应通过稳定契约组合，而不是把特定 Host 或领域
逻辑写进框架。

因此本轮只要求：

- Workspace controller 和 Host adapter 可由不同本地运行时实现；
- 文件、任务和工具能力通过 capability/adapter 暴露，Wing Vue 层不直接执行；
- 工作台 UI 不依赖某个 Agent runtime，非 AI 本地应用同样可消费；
- 将来接入任何插件运行时时，只做独立 adapter，不新增带外部项目名称的 Pnw 公共 API。

“用户用自然语言要求分析一个或多个工程文件，由 AI 自动选择领域库、MCP/Tool 和 Agent，
再把结构化结果交给 Wing View”的上层架构讨论归 `phoenix-ai-workspaces`，不在本文复制。
DSH 的源码、许可证、权限与 plugin API 审计也由该独立任务负责；其结论不得反向扩大本轮
Workspace V1。

## 9. 建议实施阶段

### WS0：计划与候选分支脱敏（已完成）

- 本计划已经评审并进入 0.7.0 本地候选；
- 对独立候选分支相对 `develop` 建立 archive ref；
- Desk Tools 可点名作为开源实证；其他特定消费者统一写成“第二个本地工程 Web UI”或
  “第三方消费者”；
- 公共 fixture 使用“工程目录、分析 View、资料库工具”等中立数据；
- 临时提交在最终归档前合并压缩，先确保 tree 等价和可回滚。

### WS1：纯目录 Workspace 契约（已完成）

- `PnwWorkspaceDescriptor/Capability/Phase/Error`；
- open/switch/close controller；
- revision、AbortSignal、only-latest-wins、rollback；
- lifecycle participant registry；
- recent entry pure normalizer；
- 不引入 Vue、Node、Tauri 或 SQLite。

### WS2：本地 Host adapter 基线（完成 command bridge，真实 Host 后置）

- 已完成无 Tauri 运行时依赖的 injected command bridge；Node sidecar 参考 adapter 后置；
- 已完成 workspace-relative lexical path 测试；symlink/realpath 越界测试随真实 Host 后置；
- read-only、missing、permission denied、安装目录拒绝；
- V1 单根目录；
- 根 UI 包仍无 Node 依赖。

### WS3：Workspace storage 与 SQLite 评估（port 已冻结，repository 后置）

- 稳定 `PnwWorkspaceStorage` 和 namespace codec；
- Workbench session、布局偏好以当前 canonical rootPath/workspaceId scope 接入；
- Desk Tools 先用现有 HTTP/session/SQLite 实现该 port；
- 第二个本地工程 Web UI 验证相同最小字段；
- 两份证据一致后，再决定是否为 `@phoenix-wing/db-node` 增加最小 repository/DDL；
- 远端纯 Web 用 HTTP adapter 验证前端制品没有 SQLite 驱动。

### WS4：可选公共 UI（Gate、欢迎页与最近列表候选已完成）

Desk Tools 与仓内 fixture 已形成相同的欢迎页/最近目录交互证据，0.7.0 候选新增：

- `PnwWelcomeShell`：兼容保留并升级为语义主题 token 和窄屏单列；
- `PnwRecentWorkspaceList`：当前、missing、unauthorized、打开、移除与条目扩展 slot；
- `PnwWorkspaceWelcome`：直接消费 `PnwWorkspaceState`，转场期间统一禁用动作；
- `PnwWorkspaceGate`：默认 required；无 Workspace 固定 Welcome，关闭后回 Welcome；optional
  允许用户显式无 Workspace 进入；
- `PnwWorkspaceTypeSelect`：内置 mixed/code/cad/lighting，允许 Host 追加稳定类型并排序；
- `PnwWorkbenchHome`：普通 Home View 的标题、说明、动作、内容与页脚壳体；内部卡片和巡游由
  消费者 slot 提供，不把 Home 混入 Welcome/Tab Gate；
- picker、最近记录持久化和目录验证仍由 controller/Host 负责；
- 产品 onboarding、文件树、模块分类、链接和 Router 不进入公共组件。

独立的紧凑 `PnwWorkspaceSwitcher` 仍需第二个 Header/菜单场景证明后再决定。

### WS5：Desk Tools 与第二消费者联合验证

- Desk Tools 独立分支改用 Wing contract，不一次重写业务页面；
- 删除/薄化重复的 workspace switch 状态机和路径 normalizer；
- 保留产品目录树、业务 API、导航模块和组合数据库 schema；
- 第二消费者只验证相同 Workspace contract，不把其名称和领域模型写回 Wing；
- 本地并列源码验证不等于 Registry 发布；
- 两个消费者都证明删除了相同重复逻辑后，再宣布公共能力稳定。

## 10. 测试与验收矩阵

| 类别 | 必测场景 |
| --- | --- |
| open | 选择目录、直接 URI、取消、重复打开当前目录、非法/缺失/不可读目录 |
| identity | rootPath 是 canonical 真源；显示名改变不改变 workspaceId；大小写/盘符/符号链接由 Host 一致处理 |
| switch | dirty cancel/save/discard；目标打开成功；目标失败回滚；快速连续切换 only-latest |
| close | clean、dirty、participant 拒绝、release 失败、重复 close 幂等 |
| participants | Workbench、watcher、SQLite、任务按 generation 释放；stale 回调被拒绝 |
| recent | 首次打开写入；再次打开置顶；当前项；去重、MRU、上限、missing、unauthorized、移除不删除目录 |
| path security | `..`、绝对路径、symlink 越界、UNC、大小写文件系统、只读目录 |
| storage | workspace 隔离、namespace 隔离、损坏 JSON、版本不兼容、写失败保持内存态 |
| SQLite | sidecar-only、连接随 workspace 切换、锁/只读/断开、前端 bundle 无驱动 |
| Workbench | 每目录 Tab/View/布局分别恢复；切换失败时旧 View 不丢；application View 不误清理 |
| 平台 | Web/Tauri/Node adapter；远端 HTTP adapter；macOS/Windows 路径行为 |
| 门禁 | 单测、typecheck、fixture build、`pnpm docs:check`、tarball clean consumer |

## 11. 预期最小消费形态

```ts
const workspace = pnwCreateWorkspaceController({
  host: localWorkspaceHost,
  participants: [workbenchSession, fileWatcher, workspaceDatabase],
  recentStore: applicationPreferenceStore,
});

await workspace.requestOpen({ source: "directory-picker" });
```

页面只读取受控 descriptor/capability：

```ts
const root = workspace.getSnapshot().current;
const canWrite = root?.capabilities.includes("write") ?? false;
```

文件和数据库操作继续发给 Host：

```ts
if (!root) throw new Error("Workspace is required");
await workspaceResources.read({
  workspace: root,
  relativePath: "src/example.ts",
});
```

消费者不再自行协调目录选择、dirty close、旧资源释放、新目录恢复和失败回滚。

## 12. 已冻结决策与待验证项

已冻结：V1 是单个本地工作目录；浏览器只持有 descriptor/ID；文件与 SQLite 经 Host；
lifecycle/participants 先于 UI；recent 是 controller 一等状态；storage 先于 SQLite repository；
multi-root 后置；纯 Web 单实例只允许一个 current Workspace。

仍待真实 Host 验证：

1. Tauri/Node 后端如何生成稳定 `workspaceId` 并处理大小写、UNC 与网络盘；
2. Rust/Node command 的 canonical/realpath、symlink、权限变化与安装目录拒绝；
3. watcher、SQLite、Workbench session 三类 participant 的 commit/rollback 顺序；
4. 紧凑 Workspace Switcher 是否确有两个 Header/菜单场景的重复 UI；
5. SQLite metadata repository 的最小字段是否能被两个本地消费者共同证明。
6. Tauri 新窗口打开另一个 Workspace 的 window/session/Host/端口/租约模型；先参考 VS Code
   多窗口与 DSH 类本地 Web Host，再单独立 ADR，不把多端口写死为现契约。

本候选不会修改 Desk Tools，不发布、不 push、不打 tag。
