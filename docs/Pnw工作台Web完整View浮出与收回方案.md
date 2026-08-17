# Pnw 工作台 Web · 完整 View 浮出与收回方案

状态：current（Web 公共候选已实现；Tauri adapter 等待真实桌面实证）

Owner：Phoenix Wing maintainers

适用版本：0.7.0 candidate / 后续兼容演进

最后核验：2026-08-15

## 1. 决策

完整业务 View 的“浮出”不是参数检查器，也不是新建第二个 View：

- `PnwViewDialog` 继续服务参数编辑器、检查器、选择器等独立内容；
- 完整 View 浮出使用单独的 **View presentation lease**；
- 一个打开的 Tab 始终是 View 的稳定 owner，浮出不新增 Tab、不改变 Router 身份；
- 第一版迁移整个 View frame，包括 View Header、工具条、Canvas、矩阵与统计 Block；
- 每个业务 View 自有一个稳定的 presentation handle；handle 以同一个 mode 原子切换
  `headerTarget` 与 `mainTarget`，不要求 Main 业务组件修改实现；
- Web 在同一个 Vue renderer 实例上切换 inline / Teleport；
- Tauri 无法跨 Webview 移动同一 DOM，必须由主窗口持有唯一业务真源和 lease，子
  Webview 使用同一个 `rendererId` 呈现完整 frame，并通过受控 bridge 收发命令与事件；
- 关闭浮出窗口默认收回到 Editor；关闭 owner Tab 才销毁 View 与浮出呈现。
- Editor 激活历史与浮窗 z-order 是两套状态：前者用于 MRU 回退，后者只决定非模态窗口
  前后层级；不得继续用单一 `activeViewId` 混合表达。

这项能力适合工程分析画布、CAD/BOM 画布、波形/日志分析器等需要把完整工作面移到第二显示
区域、同时继续操作主工作台的场景。它不适合确认框，也不应用来绕过合理的窄屏布局。

## 2. 目标效果

以完整“工程分析”View 为例：

1. embedded 时，整个 frame 位于 Editor；
2. 用户点击“浮出”，owner 记录与 Tab 顺序保留；标签栏可按策略保留标签，或只在
   floating 期间隐藏其投影；
3. Web 将同一个 frame 移入无蒙层浮窗；Tauri 创建带 parent、非模态的 Webview 窗口，
   显示相同 `rendererId` 对应的完整 frame；
4. Editor 自动激活 `editorActivationHistory` 中最近的、仍 open 且 embedded 的 View；
   正在 floating/opening/reattaching/closing 的 View 一律跳过，找不到则显示 Home/空工作台；
5. 切换其他 Tab 不隐藏已浮出的 View；点击保留的 floating owner Tab 只聚焦/置顶浮窗，
   不替换当前 Editor 背景 View；
6. 点击浮窗关闭按钮或按约定的 Escape，默认执行 reattach；
7. reattach 恢复 owner Tab 投影（尽量保持原顺序）、迁回完整 frame，并激活该 Editor
   View；关闭 owner Tab 才先关闭浮出呈现再销毁 View owner；
8. 收回完成后销毁空的 dialog host，不留下第二个 renderer 或 pending Promise。

第一版虽然为 Header 与 Main 记录两个挂载目标，但不把它们设计成两个可独立迁移的
frame：两者共享一个 handle、一个 mode、一个 lease 和一次原子迁移。Web 浮窗会有一条
最小宿主拖动栏，下面仍保留完整 View Header；Tauri 可能同时有系统标题栏和 View Header。
这是有意的 V1 边界。只有在两个真实消费者都证明重复标题影响使用后，才研究让 View
Header 融入宿主标题栏的可选双插槽模式。

## 3. 三类能力不得混用

| 能力 | 内容所有权 | 关闭语义 | 是否保留 owner Tab |
| --- | --- | --- | --- |
| `PnwViewDialog` | 独立检查器/编辑草稿 | 返回 result 或取消 | 不适用 |
| `PnwDockableTool` | 应用级或 View 级小工具 | `closed` | 不要求拥有 Tab |
| 完整 View presentation | owner Tab 的整个 View frame | 默认收回；关 Tab 才销毁 | 是 |

不得把 View 的一组参数做成 snapshot 表单后宣称“完整 View 已浮出”。snapshot 在 Tauri
模式只允许承担首次 hydration；用户看到的必须是完整业务 renderer。

## 4. 身份与唯一所有权

身份必须拆成四个稳定字段，不能只靠 route 或窗口 label：

```ts
interface PnwViewPresentationIdentity {
  /** 组件/renderer registry 的稳定 ID；同一类型的多个 View 可共用。 */
  rendererId: string;
  /** 当前打开 View 实例 ID。 */
  viewInstanceId: string;
  /** 唯一 owner Tab；关闭它等于销毁 View。 */
  ownerTabId: string;
  /** Host 窗口、IPC 与审计使用的唯一实例键。 */
  instanceKey: string;
}
```

约束：

- `rendererId` 可重复，后三项在当前工作台内唯一；
- owner Tab 不因浮出、聚焦、切 Tab 或收回而变化；
- `tabPresentation: "keep" | "hide-when-floating"` 只控制 TabBar projection；MDI 推荐
  `hide-when-floating`。隐藏绝不等于 close/remove，owner identity、顺序、dirty 与上下文
  菜单状态仍由 Host 保留；
- `instanceKey` 只来自 Host 的受控生成器，不直接接受产品 URL；
- 任一时刻只有一个有效 presentation lease；不得同时显示 embedded 与 detached 两份
  可操作 renderer。

### 4.1 每个 View 自有的两段式 handle

每个打开的业务 View 自己拥有一个 `ViewPresentationHandle`。它不是全局窗口对象，也不
复制业务 Store；它把可恢复的纯数据记录与当前 renderer 的运行时绑定分开：

```ts
interface PnwViewPresentationRecord {
  identity: PnwViewPresentationIdentity;
  mode: "embedded" | "opening" | "floating" | "reattaching";
  dialogPosition: PnwFloatingPanelPosition;
  dialogSize: PnwFloatingPanelSize;
  revision: number;
}

interface PnwViewPresentationRuntimeBinding {
  viewInstanceId: string;
  /** Header 当前应进入的宿主挂载点。 */
  headerTarget: Element | null;
  /** Main 当前应进入的宿主挂载点。 */
  mainTarget: Element | null;
}

interface PnwViewPresentationManagerState {
  activeEditorViewId?: string;
  activeFloatingViewId?: string;
  /** 第一项是最近实际在 Editor 中激活的 View。 */
  editorActivationHistory: readonly string[];
}
```

公开候选已按第二消费者的完整 frame 原型收敛为上述边界：

- `record` 由该 View/Host 的受控状态持有；可持久化的仅有 `mode`、dialog 坐标/尺寸与
  revision；`editorActivationHistory` 可由 Host 持久化纯 ID；临时活动浮窗与 z-index 只
  属于 renderer 内 `floatingWindowStack`，禁止当成 Editor MRU 或持久化单调 z-index；
- `runtime binding` 只存在于当前 renderer 的非持久化 registry；Vue 组件、DOM `Element`、
  Teleport target、事件取消函数和 Tauri handle 一律不得写入 Pinia 持久化或跨窗口消息；
- `viewInstanceId` 是 record 与 runtime registry 的唯一连接键；不得用标题或 route path
  查找 DOM；
- handle 负责 `embedded/dialog` 模式、可见性、父宿主选择与迁移事务；业务 Main 继续只
  接收原 props/store，不感知自己位于 Editor 还是 dialog；
- Header 可以根据 mode 显示“浮出 / 聚焦 / 收回”按钮和少量状态提示，但不复制业务
  Header，也不能脱离 Main 独立切换宿主；
- Header/Main 两个 target 必须在同一 revision 内同时就绪后再提交模式变化。任一目标
  缺失时保持旧宿主并报告失败，避免出现 Header 已浮出但 Main 仍在 Editor 的半迁移态。
- `PnwViewPresentationLeaseRegistry` 以 `viewInstanceId + revision` 管理宿主 lease；不读取
  `childCount` 判断空窗。正常 reparent/HMR 重建可在延迟复核前由同 generation 接管，陈旧
  generation 的 release 不得回收新 Dialog。

两段式指“同一个 View frame 有 Header/Main 两个挂载目标”，不是两个 renderer、两个
lease 或两个业务实例。未来若引入标题栏融合，也只是在 handle 内选择 Header 的目标，
Main 的生命周期与业务实现仍保持不变。

### 4.2 状态所有权

| 状态 | 所有者 | 是否持久化 |
| --- | --- | --- |
| owner View、Tab 顺序、dirty、业务 Store | Host / consumer | 按 Host 规则 |
| `PnwViewPresentationRecord` 的 mode/bounds/revision | Host 受控状态 | 可以，纯数据 |
| `editorActivationHistory` | Wing reducer 定义，Host 保存 | 可以，只存稳定 ID |
| Header/Main DOM target、Vue 实例、lease handle | Wing runtime registry | 禁止 |
| `floatingWindowStack` 的 active/z-order | Wing 当前 renderer | 默认不持久化 |

Wing 不接管 Router、KeepAlive、Pinia 持久化或业务 renderer registry；Host 只需把已有 View
记录映射成 availability/instance 列表，并消费 reducer 的下一状态，不能再复制 MRU、窗口栈
或 orphan recovery 算法。

## 5. 状态机

稳定状态：

```text
embedded ── detach ──> opening ── targets-ready(revision) ──> floating
    ▲                                                            │
    └── frames-returned(revision) <── reattaching <── reattach / X

任意稳定/过渡状态 ── closeByView(ownerTabId) ──> destroyed
```

Web 候选已经使用 `opening / reattaching` 与递增 revision，避免快速重复点击创建两份
renderer。两个完成命令必须匹配当前 revision；陈旧 target-ready/frames-returned 不推进
状态。owner Tab 销毁时组件树自然销毁；跨 Webview adapter 仍须显式实现 closeByView。

命令语义：

| 命令 | 结果 |
| --- | --- |
| `detach(viewInstanceId, preferred)` | 能力满足时桌面浮出，否则 Web 浮出；不创建 Tab；Editor 选择 MRU embedded View/Home |
| `focus(viewInstanceId)` | 聚焦已有浮出呈现；embedded 时聚焦 owner Tab/Editor |
| `reattach(viewInstanceId)` | 把完整 frame 收回 Editor，再销毁空 host |
| `closeByView(ownerTabId)` | 关闭呈现并销毁 lease；用于关 Tab/应用退出 |
| host `close-requested` | 默认转成 `reattach`，不是关闭 Tab |

`activeEditorViewId`、`activeFloatingViewId` 与 `ownerTabId` 必须独立。切换 Editor Tab 不是
presentation 状态机命令，不得把 detached 改成 hidden 或 embedded。Host 使用
`pnwReduceViewPresentationManagerState` 记录实际 Editor 激活，并用
`pnwSelectMostRecentEmbeddedEditorView` 自动过滤关闭、浮出与过渡中的候选。

## 6. Web：单 renderer 的整体 frame 迁移

Vue 官方 `Teleport` 只改变渲染后的 DOM 位置，不改变组件逻辑父子关系，props、emit 与
inject 继续工作；`disabled` 可以动态切换 inline 与目标容器。这正适合 Web 第一版。

推荐结构：

```vue
<PnwViewPresentationPortal v-model:record="record" title="工程分析">
  <template #header="{ detach, reattach }"><ViewHeader /></template>
  <template #main><CompleteBusinessView /></template>
</PnwViewPresentationPortal>
```

`PnwViewPresentationPortal` 必须满足：

- 始终只调用一次默认 slot；不得用两个 `v-if` 分支分别创建 embedded/dialog renderer；
- embedded 时禁用 Teleport，frame 原位呈现；
- web-detached 时启用 Teleport，把同一 frame 移到已存在的浮窗 target；
- 浮出后不在 Editor 生成提示/占位页；Editor 由 manager 切换到 MRU embedded View/Home；
- 浮窗无 mask、无 `aria-modal`、不做 focus trap；
- 主题根、拖动、边界修正和 overlay 层级复用 Wing 能力；
- 测试记录 renderer `setup/mounted/unmounted` 次数，往返一次仍须为 `1/1/0`。

V1 的 Portal 可以在内部为 Header/Main 各使用一个 Teleport，但必须由同一 handle 在同一
revision 中启停；不能把两个 Portal 暴露成可分别受控的公共 presentation。embedded 与
dialog host 应分别先注册两个目标锚点，handle 确认目标完整后再原子切换。Main slot 的
组件树、key 与业务状态不随目标变化。

Portal 必须挂在 owner Tab 的稳定 View host 中。Host 若在切换 Tab 时直接销毁未激活 View，
就无法满足“切 Tab 后浮窗仍可见”；应复用现有 Process/KeepAlive 或稳定 View registry，
而不是在 Wing 内再造 Router。

参考：[Vue Teleport](https://vuejs.org/guide/built-ins/teleport)。官方明确说明 Teleport 只
改变 DOM 结构，不改变逻辑组件层级，并支持动态 `disabled`。

### 6.1 第二消费者实证与 target-ready 修正

第二消费者已用完整工程分析 View 验证整体 frame：Header/Main 在浮窗目标中为
`1/1`、Editor 为 `0/0`；收回后反向为 `0/0` 与 `1/1`；表单输入往返不丢失，
无新 Tab、无 mask、`aria-modal` 为空。产品最初把两个动态 Teleport 指向同一帧内刚由
另一个 Teleport 创建的目标，即使等待 `nextTick/RAF` 仍出现空 Dialog。这证明公共能力
必须先确认两个 target ready，再以同一 revision 原子启用两个 Teleport。

其后完成的第二阶段 MDI 实证证明：浮出的工程分析与 Editor 中的结果预览可同时
操作；floating owner 只隐藏 Tab projection，Editor 按独立 MRU 回退；HMR 后 persisted
floating record 会重新认领 Header/Main，失败则收回。产品仓临时 helper 只作为金样本，
Wing 公共 API 可用后应删除，不能反向成为产品特例。

`PnwViewPresentationPortal` 已内置该握手；消费者不得再手写 `append`、双 `v-if` renderer
或分别推进 Header/Main。第二消费者原型中的 DOM reparent 只作为语义实证，后续本地
候选接入应删掉产品状态机并改用 Wing Portal。

### 6.2 空宿主回收与 HMR 恢复

Dialog 是否有效由 presentation lease 决定，不由 DOM 子节点数量推断：

1. owner View record 是业务强所有者；Portal 获取当前 `viewInstanceId + revision` lease；
2. Header/Main 两个 target 同 revision ready 后，lease 才原子 commit，准备阶段的空外壳
   保持不可见；
3. unmount、迁移失败和异常关闭统一幂等 `release()`；lease 归零后延迟到 microtask 后的
   animation frame 复核，避免正常 reparent 的瞬时空态被误回收；
4. owner 存活的孤儿触发 `rollback`，应收回 Editor；owner 已关闭才触发 `dispose`；
5. stale revision release 不影响新 generation；`reconcileOwners()` 用于启动/HMR 后核对；
6. record 已是 `floating` 但 Portal 重建时，Portal 会重新建立 target 与 lease，避免外壳
   打开而 Header/Main 留在 Editor 的空窗故障。

## 7. 共享 presentation chrome、缩放与窗口栈

统一的是外壳，不是业务生命周期：

- `PnwFloatingPanel` 是 tool/view 共用 chrome，负责拖动、缩放、主题、viewport clamp、
  推荐尺寸恢复、活动视觉态与窗口栈；
- `PnwDockableToolWindow` 是 `ownerKind: "tool"` 适配器，X 为 `close`，可停靠 Primary；
- `PnwViewPresentationPortal` 是 `ownerKind: "view"` 适配器，X 为 `reattach`，owner Tab
  关闭才销毁；
- 不新增同义的 `PnwPresentationFrame.vue`，避免再包一层却没有生命周期所有权。

`PnwPresentationFrameDefinition` 的稳定字段为 `ownerKind`、`movable`、`resizable`、
`recommendedSize`、`minSize`、`maxSize`、`rememberBounds` 与 `closeBehavior`。`resizable`
支持 `false / horizontal / vertical / both`；`both` 内部提供八方向抓手。抓手可聚焦并用
方向键调整，Shift 使用大步长。完整 View 默认 `760×560`、Tool 默认 `640×480`，避免
一打开就占满工作台；最终 bounds 始终按 viewport 与 min/max 修正，标题栏和关闭/收回
动作保持可见。恢复推荐尺寸动作由公共 chrome 提供。

同一 renderer 的所有 `PnwFloatingPanel` 默认进入 Document 级共享窗口栈；Host 也可用
`pnwCreateFloatingWindowStack()` 显式隔离。pointerdown/focusin 会 bring-to-front；只有
活动窗口处理 Escape；关闭活动窗口后焦点回到前一窗口。z-order 由存活窗口顺序计算，
不会单调增长，也不进入持久化快照。完整 View 与 dockable Tool 默认使用统一
`presentation` overlay layer（1600），高于 Workbench Header 的 `hostTools`（1400）、
低于 `modal`（2000），标题栏与 X 不会被 Header 覆盖。`floatingPanel`（1200）继续保留给
旧设置面板等兼容浮层，不应再作为完整 View/Tool 的默认层。

共享 stack 把所有存活 presentation 归一到当前最高 base 后再按全局 live order 排序。
因此历史 Host 即使曾给 Tool/View 传入不同 base，点击较低窗口仍能跨类型置前；显式
`zIndex` 只作为该 stack 的最低集成基线，不再形成互相不可穿越的私有子层。消费者不应
长期为每个产品窗口手工选择 `1800` 或复制 z-index CSS。

`pnwCreatePresentationBoundsSnapshot` 只在 `rememberBounds` 开启时返回纯数据快照；Pinia、
localStorage 或后端介质仍由 Host 选择。DOM target、stack identity 与临时 z-index 不得
写入快照。

### 7.1 标签投影与统一“浮动窗口”入口

`tabPresentation` 默认推荐 `hide-when-floating`，但 Wing 不删除 owner record：

- `pnwShouldProjectViewPresentationOwnerTab()` 派生是否投影到 TabBar；
- `pnwResolveViewPresentationOwnerTabAction()` 让 embedded Tab 激活 Editor、floating Tab
  只聚焦窗口；即便策略为 `keep`，floating owner Tab 也不显示 Editor active 高亮；
- 隐藏 owner Tab 时，Host 必须从 `floatingWindowStack.snapshot()` 提供统一“浮动窗口”
  入口/计数，可聚焦任何 Tool/View，避免窗口移出屏幕后无法找回；
- V1 提供聚焦与全部收回所需的稳定 identity/stack 基础；层叠、水平平铺、垂直平铺、
  全部收回/最小化是后续 MDI 命令，不在 0.7.0 假装完成。

## 8. Tauri：唯一 lease + command/event bridge

不同 Webview 有独立 JavaScript/Vue 运行时，不可能真正搬移同一个 DOM 或共享 Pinia
内存。Tauri 模式的“同一个 View”定义为：同一 identity、同一业务真源、同一时刻只有一
个可操作 presentation。

主窗口职责：

1. owner Tab 与业务 Store 保持唯一真源；
2. 创建 `parent` 关联但非模态的 `WebviewWindow`，不禁用父窗口；
3. 把 `rendererId + identity + hydration` 送到子 Webview；
4. 子 Webview 从同一 renderer registry 装配完整 frame；
5. 后续只通过带 `instanceKey / sequence / revision` 的 command/event bridge 同步；
6. 主端校验过期 sequence、revision 与已销毁 lease；
7. 收回时先停止子端输入、确认最后事件、关闭子窗口，再恢复 embedded；
8. owner Tab 关闭时使用 destroy 路径，不把子窗口关闭误当作收回后的新 View。

建议桥消息最小包络：

```ts
interface PnwViewPresentationBridgeMessage<TPayload> {
  protocolVersion: 1;
  instanceKey: string;
  sequence: number;
  revision: string | number;
  type: string;
  payload: TPayload;
}
```

Wing 只定义包络、lease 与 adapter 边界；业务 command/event union 由 renderer 所有者定义。
不得把 Token、任意 URL、Vue Component 或未验证的对象放入窗口 URL。Tauri capability
只开放创建/聚焦/关闭该受控窗口及所需事件范围。

Tauri `WebviewWindow` 以唯一 label 标识并支持事件收发；`parent` 在 Windows 建立 owner
关系、Linux 建立 transient 关系、macOS 建立 child 关系。具体平台行为必须实测，不能
只凭类型声明验收。参考：[Tauri WebviewWindow](https://v2.tauri.app/reference/javascript/api/namespacewebviewwindow/)
与 [Tauri Window parent](https://v2.tauri.app/reference/javascript/api/namespacewindow/)。

## 9. 交互与可访问性

### 9.1 Editor 与 owner Tab

- 浮出后 Editor 不显示“View 已浮出”大提示页，立即展示 MRU embedded View 或 Home；
- owner Tab 若保留，显示“已浮出”状态但不进入 Editor active 高亮，激活行为为聚焦浮窗；
- owner Tab 若隐藏，只隐藏 TabBar projection，仍保留顺序、关闭、dirty 与上下文状态；
- 浮动窗口菜单暴露名称、活动态、聚焦和收回动作，并以 `aria-live="polite"` 简短播报
  detach/reattach，不重复播报整个业务 View。

### 9.2 Web 浮窗

- `role="dialog"`，但不得设置 `aria-modal="true"`；
- 打开后可聚焦宿主拖动栏，但不强制夺走正在输入的焦点；
- Escape 默认收回；输入法组合或产品已消费 Escape 时不得抢占；
- 收回后焦点返回恢复的 owner Tab 或 View Header 对应按钮；
- resize/drag 后至少保留标题栏与关闭按钮可见。

### 9.3 主题

- Web 使用 `PnwOverlayThemeProvider` 的解析后 light/dark/system；
- Tauri 在首帧前写入解析后的 scheme 与 CSS token，避免白屏闪烁；
- View frame 只消费 Wing/Host 语义 token，不在 detached 模式硬编码另一套颜色。

## 10. 公共 API 与低接入成本

当前 0.7.0 Web 候选导出：

```ts
PnwPresentationFrameDefinition
PnwViewPresentationContribution / Record / Command / PortalHandle
PnwViewPresentationManagerState / PnwEditorViewAvailability
pnwResolveViewPresentationContribution / pnwResolveOpenViewPresentationAction
pnwCreateViewPresentationRecord / pnwReduceViewPresentationRecord
pnwCreateViewPresentationManagerState / pnwReduceViewPresentationManagerState
pnwSelectMostRecentEmbeddedEditorView
PnwViewPresentationPortal / PnwFloatingWindowMenu
pnwCreateViewPresentationLeaseRegistry
PnwFloatingPanelBounds / pnwClampFloatingPanelBounds
pnwCreateFloatingWindowStack / pnwGetDocumentFloatingWindowStack
pnwCreatePresentationBoundsSnapshot
```

普通稳定 owner View 缺省 `detachable=true`，Home、无稳定 owner、平台不支持或显式
`detachable:false` 自动禁用。`PnwPageHeader` 接收解析后的 mode/availability 后，在最右侧
自动提供统一浮出/收回图标、Tooltip 与 ARIA；Primary 开关继续位于最左 Workbench rail，
业务 action 位于中间，应用不再逐 View 手写浮出按钮。

完整 View 的单页接入保持在约 18 行，业务 Main 不感知宿主变化：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { PnwViewPresentationPortal, pnwCreateViewPresentationRecord,
  pnwResolveViewPresentationContribution } from "phoenix-wing";
const frame = { ownerKind: "view", movable: true, resizable: "both",
  recommendedSize: { width: 960, height: 640 }, minSize: { width: 420, height: 320 },
  rememberBounds: true, closeBehavior: "reattach" } as const;
const record = ref(pnwCreateViewPresentationRecord({ rendererId: "engineering-analysis",
  viewInstanceId: "analysis:1", ownerTabId: "tab:analysis:1", instanceKey: "analysis-1" },
  { frame }));
const contribution = pnwResolveViewPresentationContribution(undefined,
  { hasStableOwner: true });
</script>
<template><PnwViewPresentationPortal v-model:record="record" title="工程分析" :frame="frame">
  <template #header="{ mode, detach, reattach }"><PnwPageHeader title="工程分析"
    :presentation-detachable="contribution.detachable" :presentation-mode="mode"
    @detach-view="detach" @reattach-view="reattach" /></template>
  <template #main><EngineeringAnalysisView /></template>
</PnwViewPresentationPortal></template>
```

Workbench/Tab adapter 只维护一份公共 manager state。实际激活 Editor 时发
`activate-editor`；Portal 的 `detached/reattached` 事件发同名 reducer 命令。TabBar 使用
`pnwShouldProjectViewPresentationOwnerTab()` 派生投影，不能移除 owner record。请求从
Canvas 直接打开另一个 View 时使用：

```ts
pnwResolveOpenViewPresentationAction(
  { viewId: "analysis.result-preview", preferredPresentation: "floating" },
  resultContribution,
  openInstances,
);
// 首次 => create/floating；已存在 floating => focus-existing；能力不足 => create/embedded
```

默认单实例避免重复点击创建多个结果窗口；只有 `allowParallel:true + instanceKey` 才允许
未来并行实例。Router、组件 registry 与 instance ID 生成仍由 Host 负责。

工程资源库工具使用同一个 frame 字段结构，只把 `ownerKind` 改为 `tool`、
`closeBehavior` 改为 `close`，并交给 `PnwDockableToolWindow / PnwDockablePrimarySection`；
拖动、缩放、bring-to-front、主题、clamp 与快照规则不重复实现。

仓内 fixture 用 `PwwFixturePresentationView` 分别演示“完整 View 浮出”和“结果预览”两类
完整 View（后者首次请求 floating），用
`PwwFixtureDockableToolView + PwwFixtureDockableToolPrimary` 演示资源库 Tool；二者均
使用同一 `PnwFloatingPanel` chrome 与 Document 窗口栈。

## 11. 实施计划

### VP0：交互与架构冻结（本轮）

- [x] 区分检查器 dialog、dockable tool 与完整 View presentation；
- [x] 冻结整体 frame、owner Tab、关闭/收回与切 Tab语义；
- [x] 冻结 Web 单 renderer Teleport 与 Tauri lease/bridge 边界；
- [x] 冻结每 View 自有的两段式 handle：纯数据 record 与非持久化 Header/Main target
  registry 分离，两个 target 只允许原子迁移；
- [x] 定义主题、可访问性和验收矩阵；
- [x] 第二消费者回传完整 frame、状态保持与动态 target 失败实证。
- [x] 第二消费者回传 MRU、隐藏标签投影、结果预览默认浮出与 HMR 空宿主恢复实证。

### VP1：Web 公共能力

- [x] 提炼 identity、纯数据 record、revision 状态机与受控 Portal；
- [x] 用第二消费者原型验证 handle 由 View 自有、Header/Main target 同 revision 切换，
  且 Main 业务组件无需适配宿主模式；
- [x] 提炼 `PnwViewPresentationPortal`，证明 frame 往返不重建；
- [x] 公共化 Editor activation history、availability selector 与 manager reducer；浮出后
  切 MRU embedded View/Home，不生成 Editor 占位页；
- [x] contribution 默认覆盖普通稳定 owner View；Home/无 owner/显式 false 自动禁用；
- [x] `PnwPageHeader` 自动提供最右浮出/收回动作，不要求业务 View 手写按钮；
- [x] 加入两个不同的完整 View fixture，覆盖 Header + Canvas/内容 Block与首次 floating；
- [x] 公共 chrome 支持 capability、八向/轴向 resize、推荐尺寸恢复与受控 bounds；
- [x] 公共窗口栈覆盖点击/焦点置顶、活动视觉、Escape 与关闭后焦点恢复；
- [x] 统一浮动窗口计数/菜单可聚焦 Tool/View、收回单个或全部 View；
- [x] generation lease 覆盖原子 commit、HMR floating 恢复、幂等 release、orphan rollback
  与 owner close dispose；
- [x] 第二消费者删除产品 MRU/reparent/resize/stack helper 并完成
  两个完整 View 同时浮出；由此发现并关闭 Tool/View 层级不同导致无法跨类型置前的缺口；
- [x] 第二消费者精确消费 Wing 公共候选，删除产品 `1800`、Tool layer/z-index
  与 View Portal z-index 覆盖；浏览器实测 Header=1400、两个 presentation 初始=1600，
  双向点击交替为 1601，Escape 只作用活动窗且按栈顺序恢复，未发现新公共缺口；
- [x] 覆盖陈旧 revision、主题、焦点、状态保持与 renderer 计数。

### VP2：Tauri Host adapter（真实桌面证据后）

- [ ] 冻结能力探测、窗口生命周期和 bridge version；
- [ ] Desk Tools 或第二个真实 Host 完成 macOS 证据；
- [ ] Windows 环境补 owner/minimize/close/多显示器证据；
- [ ] 第二消费者重复后，才决定是否增加独立 Tauri adapter 包。

## 12. 验收证据

| 场景 | 必须证据 |
| --- | --- |
| Web 往返 | 同一 renderer `setup/mount=1`，detach/reattach 不丢输入、Canvas 状态 |
| 两段目标 | Header/Main 同 revision 同时迁移；无半迁移；Main props/store/组件 key 不变 |
| 持久化 | 只有 mode/bounds/revision 等纯数据；临时 active/z-index 与 Element/组件/Tauri handle 不进入快照 |
| resize | 八向/轴向、键盘、min/max、viewport clamp、推荐尺寸恢复，标题栏始终可见 |
| 多浮窗 | 资源库 Tool 与完整 View 同层置顶；pointer/focus 激活；Escape 只影响 active |
| Editor MRU | 只按最近实际 Editor 激活历史选择 open+embedded；跳过 floating/closing，无候选回 Home |
| 原 Tab | 浮出不新增或删除 Tab；keep 时点击只聚焦且不高亮 Editor；hide 时只隐藏投影，收回恢复原顺序 |
| 切 Tab | detached View 保持可见且可操作，presentation lease 不变 |
| 直接打开 | `preferredPresentation:floating` 首次创建浮窗；重复单实例请求只 focus；能力不足降级 embedded |
| 关闭浮窗 | 默认收回 Editor，不关闭 owner Tab |
| 关闭 Tab | 浮窗销毁、bridge 清理、无 pending/幽灵 renderer |
| 重复操作 | detaching/reattaching 期间不会创建重复窗口或双 renderer |
| 空宿主/HMR | opening 外壳提交前不可见；floating record 重建可恢复；stale release 不回收新 generation |
| Web 主题/a11y | light/dark/system、无 mask、非模态 ARIA、焦点可恢复 |
| Tauri | parent 非模态、可移出主窗口、主端唯一业务真源、序列/revision 拒绝陈旧事件 |
| 应用退出 | 所有 lease、监听和子窗口清理，下一次启动不伪恢复未提交状态 |

## 13. 暂不做

- 不做任意多窗口工作空间、跨进程共享 Store 或第二套 Router；
- 不允许 detached View 自己拥有第二个 Tab；
- 不在第一版拆 Header/Main frame；
- 不把业务参数、私有文件算法、Canvas command 写入 Wing；
- 不把当前 Web 候选描述成已经完成 Tauri 跨 Webview 实现。
