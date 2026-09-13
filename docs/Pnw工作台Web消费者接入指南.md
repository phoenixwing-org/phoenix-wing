# Pnw 工作台 Web 消费者接入指南

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.2（已发布，兼容 0.6.1）

最后核验：2026-08-03

本文同时给 Web 开发者与执行迁移的 AI 使用。目标是让消费者复用工作台结构，同时继续拥有 Router、权限、业务 API、页面状态和用户偏好。

## 1. 先选接入层级

优先使用 `PnwWorkbenchShell` 组合入口；只有产品确实需要不同结构时，才单独组合 `PnwWorkbenchHeader`、`PnwActivityBar`、`PnwWorkbenchLayout` 等低层组件。既有 `PnwRibbonShell`、`PnwRibbonGroup`、`PnwRibbonToolButton` 仍是兼容入口，不要求一次迁完。

推荐的默认界面不是四个面板全部打开：

1. 普通业务 Web 使用 `Activity + Primary + Editor`；
2. 筛选、目录和当前对象的简要属性可在 Primary 内上下分区；
3. Secondary 只给独立属性检查器、实时预览等复杂场景，默认隐藏；
4. Bottom 是工作台实例级能力，用于问题、输出、日志等可切换页签；应用提供默认
   Bottom，页面只在确有专用内容时覆盖；
5. 没有 contribution 的 Primary/Secondary 不生成空容器；Footer 三个入口仍保留，
   其中 Bottom 由应用默认层保持可用。

Desk Tools 可能同时使用 Primary 与 Secondary；Codegen、Open Issue 等多数页面通常一个 Primary 即可。消费者应按 View 贡献内容，不要在应用根组件写固定假面板。

## 2. 最小数据与壳层接线

导航只保留一棵受控树，Ribbon 与 Tree 不得各维护一份菜单：

```ts
import type { PnwNavigationNode } from "phoenix-wing";

export const APP_NAVIGATION: readonly PnwNavigationNode[] = [
  {
    id: "workspace",
    label: "工作空间",
    shortLabel: "工作",
    children: [
      {
        id: "project-tools",
        label: "项目工具",
        children: [
          { id: "dashboard", label: "仪表盘", icon: "pnw:dashboard" },
        ],
      },
    ],
  },
];
```

若消费者已经有 `PnwRibbonTabDef[]`，先用 `pnwNavigationFromRibbonTabs` 投影，不必重写数据：

```ts
const nodes = pnwNavigationFromRibbonTabs(existingRibbonTabs, {
  iconFor: appIconFor,
});
```

新 manifest / DTO 的图标必须使用显式 namespace 的 `PnwIconId`，例如
`pnw:dashboard` 或 `cool:folder`。`pnw` 由 Wing 保留；Host 用
`pnwRegisterIconNamespace("cool", { folder: CoolFolderIcon })` 注册自己的白名单。
裸 `home / search / document` 和 Vue Component 只作运行时兼容，不得再写入新的
持久化数据。未知 ID 会统一显示 `unknown` fallback，不再产生空 SVG。完整规则见
[《Pnw 工作台 Web 图标契约》](Pnw工作台Web图标契约.md)。

根组件只装配受控状态与产品动作：

```vue
<PnwWorkbenchShell
  :nodes="app.navigation.nodes"
  :presentation="preferences.presentation"
  :active-node-id="app.navigation.activeNodeId"
  :ribbon-appearance="preferences.ribbonAppearance"
  :tabs="app.tabs.items"
  :active-tab-id="app.tabs.activeId"
  :view-blocks="app.view.blocks"
  :default-bottom-block="app.view.defaultBottom"
  :layout-state="preferences.layoutState"
  :tree-collapsed="preferences.treeCollapsed"
  :tree-appearance="preferences.treeAppearance"
  :tab-bar-placement="preferences.tabBarPlacement"
  :display-settings-positions="preferences.settingsPositions"
  @activate="app.actions.activateNode"
  @select-tab="app.actions.selectTab"
  @close-tab="app.actions.closeTab"
  @update:layout-state="preferences.layoutState = $event"
  @update:display-settings-positions="preferences.settingsPositions = $event"
>
  <RouterView />
  <template #header-actions><AppUserArea /></template>
  <template #footer><AppConnectionStatus /></template>
</PnwWorkbenchShell>
```

消费者仍需实现 `activateNode`：它可以调用 Vue Router、页面加载器或内部命令，但 Wing 不读取 `path`，也不猜权限和路由语义。

## 3. View 动态贡献 Block

为每个工作台实例创建自己的 registry，禁止使用跨应用全局注册表：

```ts
export const APP_VIEW_BLOCKS =
  pnwCreateViewContributionRegistry<PnwViewBlockComponentContributions>();
```

页面在自己的 setup 中登记；KeepAlive 激活、停用和卸载由 `usePnwViewContribution` 管理。
普通页面只贡献自己的 Primary/Secondary：

```ts
usePnwViewContribution(APP_VIEW_BLOCKS, () => props.viewId, {
  primary: {
    component: AppProjectPrimary,
    props: computed(() => ({ projectId: props.projectId })),
  },
});
```

只有复杂 View 才增加 Secondary；只有 Settings、任务执行结果等确有专用 Bottom
的页面才增加 Bottom：

```ts
secondary: {
  component: AppPropertyInspector,
  props: computed(() => ({ selection: selection.value })),
},
bottom: {
  component: AppDatabaseRepairResults,
  tabs: computed(() => repairResultTabs.value),
},
```

组件、业务 props 与 Bottom 内容均属于消费者。Wing 只负责容器、显隐、句柄、页签外观和生命周期接线。

### 3.1 应用级默认 Bottom

认证工作台应为每个 Shell 实例创建一个默认 Bottom，而不是要求 Dashboard、空页面
和每个普通业务 View 重复注册日志/消息组件：

```ts
const appDefaultBottom: PnwBottomViewBlockComponentContribution = {
  component: AppWorkbenchMessages,
  props: computed(() => ({
    logs: diagnostics.value.logs,
    problems: diagnostics.value.problems,
  })),
  tabs: computed(() => appBottomTabs.value),
}
```

把它传给 `PnwWorkbenchShell.defaultBottomBlock` 后，Wing 使用固定分层：

1. 当前 `viewBlocks.bottom` 存在时，显示当前 View 的专用 Bottom；
2. 当前 View 未贡献 Bottom 时，自动显示 `defaultBottomBlock`；
3. tabs 按“当前 View tabs、默认 Bottom tabs、旧 `bottomTabs`”顺序回退；
4. 默认 Bottom 决定跨 View 的 Bottom 可用性；Primary/Secondary 仍只看当前 View；
5. 切换 View 只替换解析出的组件与 tabs，不修改受控
   `layoutState.visibility.bottom` 或 `layoutState.sizes.bottomHeight`。

因此 consumer 不应监听当前 View contribution 并在缺少 `bottom` 时把
`layoutState.visibility.bottom` 写成 `false`。显隐与高度由用户布局状态持有；页面
专用 tabs 中不存在当前 `activeBottomTabId` 时，容器只在呈现层临时选择第一个可用
tab，不改面板显隐和尺寸。

旧 `#bottom` slot 仍是显式结构覆盖入口，0.6.0 的 `viewBlocks.bottom` 和
`bottomTabs` 也保持兼容。新消费者优先使用 `defaultBottomBlock + viewBlocks.bottom`，
避免在 `#bottom` 内重复编写组件优先级。

### 3.2 业务 View 自己的内部 Header 与正文

`PnwWorkbenchHeader` 是整个壳层的品牌、一级导航、打开页签和用户区；每个业务页面自己的标题、当前对象和操作应放在 `PnwPageHeader`，不要继续堆入壳层 Header。新页面优先使用 `PnwPageLayout` 直接组合 Header 与正文：结构层和 `.pnw-page-layout-body` 的外边距/内边距均为 0，body 自行承担滚动；默认插槽自动由无业务 provider 的 `PnwPageMainBlock` 承载并提供 10px，普通消费者无需逐页写 padding。

```vue
<PnwPageLayout
  title="参数代码"
  :subtitle="activeFileName"
>
  <template #leading><AppBackButton /></template>
  <template #actions>
    <AppPreflightButton />
    <AppSaveButton />
  </template>
  <template #help><AppPageHelp /></template>
  <p class="app-view-description">修改参数并生成当前工程源码。</p>
  <AppCodegenTable />
</PnwPageLayout>
```

`PnwPageLayout` 内部复用 `PnwPageHeader`；`bodyInset` 默认 `true`，但 10px 不落在 body，而落在默认插入的 `PnwPageMainBlock`。已有完整卡片、画布或 `.cl-crud` 自己持有 padding 时设为 `false`，避免叠加；`bodyScroll=false` 可由页面自己的虚拟表格承担滚动。该层次与 Cool Admin 一致：Header/结构/content(body) 为 0，实际 `.cl-crud` 或 `PnwPageMainBlock` 为 10px。Wing 不依赖 `.cl-crud`，也不复制其 provider、mitt、权限与配置语义。

`PnwPageHeader` 固定为单行，使用 3px 纵向 padding，常见 32px Host 操作按钮不会把默认
40px Header 撑高。`leading` 放返回/导航动作，标题位于左侧，业务 `actions/help` 位于右侧；
过宽操作区横向滚动而不换成第二行。`eyebrow / summary / description` 仅保留类型兼容，
不再进入 Header；分类、状态和长说明应放进 main。不要用产品 CSS 固定操作按钮或 Header
的 top/height。

旧 View 尚未使用 `PnwPageHeader` 时，Layout 会自动提供 40px Primary 开关兼容 rail，
不要求消费者添加 wrapper 或 padding；迁移为公共 Header 后，兼容 rail 自动消失。

Router、文件名、保存和帮助内容仍由 View 持有。当前 View 有 Primary 时，Layout 自动在
Page Header 左侧加入同高的展开/收起按钮和动态前导位；没有 Primary 时不渲染按钮，也
不保留空槽。

多个真实消费者已有页面使用 `PnwPageHeader`；fixture 也直接消费该公共组件，不再保留一份
`PwwFixtureViewHeader`。示例把多类 Editor View 分文件呈现，证明差异应留在业务 View 的
props、actions/help slot 与页内工具条，而不是复制多套 Header。新消费者只参考最接近
自己的 View 组合，不要整目录复制或改名一个 Header 组件。

### 3.3 Editor 最大化、标签动作与语言

最大化是 Shell/Layout 瞬时状态，不是 View contribution，也不加入显示偏好：

```vue
<PnwWorkbenchShell
  v-model:editor-maximized="workbenchEditorMaximized"
  :locale="locale"
  :can-refresh-active-tab="Boolean(activeTabId)"
  :can-close-other-tabs="tabs.length > 1"
  @refresh-active-tab="refreshActiveTab"
  @close-other-tabs="closeOtherTabs"
/>
```

Wing 最大化时隐藏 Header chrome、导航、三个 Block 与 Footer，保留唯一 Editor 和
TabBar；Header placement 仍以仅标签还原条提供出口，Escape 发出受控还原事件。
Host 不应为了最大化改写 `layoutState.visibility` 或尺寸。

`locale` 只接受 `zh-CN / en-US` 并驱动 Wing 自有设置、动作与 a11y 文案。Host
继续持有语言 store、Element Plus locale 和持久化。刷新当前标签与关闭其他标签只
发事件；Router、Process、KeepAlive 和 dirty 处理仍由 consumer 执行。完整边界见
[《Editor 最大化、标签动作与国际化》](Pnw工作台Web编辑器最大化与国际化.md)。

## 4. Problems / Log 与实例级诊断

默认“输出”使用 `PnwOutputBlock` 原样呈现 consumer 已格式化的自由文本，不添加频道或级别 UI。`PnwLogBlock` 和 `PnwProblemsBlock` 用于结构化诊断内容与过滤；`PnwBottomPanel` 继续负责页签、计数和容器。日志/问题真源由 consumer 持有，也可以为每个工作台显式创建一个有界内存 hub：

`PnwOutputBlock` 只接收 `text` snapshot。Host 可为每个工作台创建一个 `pnwCreateOutputBuffer()`，并通过 `append / appendLine / replace / clear` 信号更新；View 不直接持有 Block，也不创建全局 singleton。该信号形状参考 VS Code `OutputChannel`，但 Phoenix 当前只提供一个 Host 受控的默认输出流，不暴露频道选择 UI。

```ts
const diagnostics = pnwCreateDiagnosticsHub({ maxLogEntries: 1000 })
const snapshot = shallowRef(diagnostics.getSnapshot())
const unsubscribe = diagnostics.subscribe((next) => {
  snapshot.value = next
})
onScopeDispose(unsubscribe)

diagnostics.dispatch({
  type: "log.append",
  entry: {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    level: "info",
    channel: "app.workbench",
    message: "页面已加载",
  },
})
```

日志按追加顺序限长，相同 ID 更新后移到末尾；可按频道清空。问题是状态快照，必须用 `problems.replace(ownerId)` / `problems.clear(ownerId)` 按 owner 整组更新，使已解决项从面板消失。`PnwProblemItem.resource` 只产生 `open` 事件；consumer 决定打开 Router、文件编辑器或领域页面。

不要把 hub 建成模块级 singleton；同一页面的多个工作台、微前端和测试实例必须隔离。不要直接放入 `Error`、请求体、token 或任意业务对象；consumer 先脱敏并投影为可序列化字符串。Admin 审计日志、服务端任务日志和分页查询仍是业务 View，不接入这个内存总线。`PnwProblemsBlock` 在第二个真实 Problems consumer 完成前仍是实验契约。

## 5. 状态与持久化责任

建议消费者在自己的 Pinia store 保存 `PnwWorkbenchDisplayPreferences`。它集中以下可序列化公共显示状态：

- `presentation`、`treeCollapsed` 与 `treeAppearance`；
- `ribbonAppearance` 与 `colorScheme`；
- `tabBarPlacement`；
- `layoutState`；
- `settingsPositions`（快捷与完整设置面板坐标）。

从 localStorage、工作区配置或后端读取后，先经过统一 checker：

```ts
const stored = JSON.parse(rawPreference)
const display = pnwNormalizeWorkbenchDisplayPreferences(
  stored.display,
  PRODUCT_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES,
)
```

checker 为缺字段、非法枚举、非有限坐标和越界面板尺寸补默认值。`expandedNodeIds`、当前 Bottom tab、页面 Tab session 和导航分组偏好不属于显示快照，consumer 按自己的作用域另行保存。

Wing 只发出完整新状态，不选择 localStorage、IndexedDB 或后端数据库。若未来由 Admin 后端保存，用户/租户作用域、权限、并发版本和布局升级合并都应留在 Admin。

不要序列化含 Vue Component 的整棵导航树。保存稳定 ID、顺序、分组归属和文本覆盖，
再由产品默认树 hydrate；确需随菜单/manifest 保存图标时，只保存经过
`pnwIsIconId` 校验的显式 namespace ID。这样升级时可以恢复默认并处理新增模块。

## 6. 品牌、Header 与主题

- `brandTitle` / `brandSubtitle` 适合简单品牌；结构不同用 `brand` slot；
- 用户、租户、显示身份和退出放 `header-actions`；
- Ribbon 最右侧 `…` 与 Tree 底部设置图标打开 Wing 公共单行快捷菜单；“完整显示设置…”继续打开 Wing 公共 `PnwWorkbenchDisplaySettingsPanel`，consumer 只绑定受控状态，不复制设置表单；
- consumer 可在 `display-settings-actions` 追加源码定义的快捷动作，通过 `display-settings-action` 处理 action ID；也可在 `display-settings-panel-extra` 插入自己的 Vue 设置区，例如句柄方式或产品主题。Wing 不提供最终用户编辑菜单定义的 UI，也不读取扩展字段；
- Footer 左侧 `footer` slot 可显示消费者自己的页面、连接或任务状态；右侧三个面板
  开关始终由 Wing 生成。Primary/Secondary 根据当前 View contribution 启用，
  Bottom 在提供 `defaultBottomBlock` 后跨 Dashboard、空 View 和普通页面保持启用；
- `light`、`dark`、`system` 通过受控 `colorScheme` 传入；
- 产品主题覆盖 `--pnw-*` CSS token，不依赖组件内部 DOM，也不要复制 Wing scoped CSS；
- 用户贡献 CSS 时应由产品白名单、作用域和发布流程治理，Wing 不执行任意远程 CSS。
- Host dropdown/popover 使用 `PNW_WORKBENCH_OVERLAY_LAYERS.hostTools`，业务模态框使用
  `modal`；Wing 显示设置使用较低的 `floatingPanel`，避免语言菜单被遮挡。

## 7. 本地未发布 Wing 联调

依赖清单和 lockfile 继续精确锁定已发布 Registry 版本。本地联调只能是单次进程的 resolver/alias，不是依赖安装方式：

- 禁止 `pnpm link`；
- 禁止 `link:`、`file:`、本地 `workspace:` 与 `pnpm.overrides`；
- 禁止修改消费者 `node_modules`；
- 本地命令必须验证标准并列 `../phoenix-wing`，构建 Wing 后再启动消费者；
- 日志必须明确显示 `[Wing][LOCAL]` 与实际路径、版本；
- 本地通过不代表 npm 已发布，也不能据此改发布标签。

Open Issue 的独立验证分支当时采用进程级 resolver：manifest 仍锁定 `phoenix-wing@0.5.1`，本地启动命令现统一为 `pnpm wing`，构建门禁仍可使用 `pnpm build:local-wing`。这是本地候选证据，不是 Registry 验收。

## 8. 开发者与 AI 验收清单

每次接入至少验证：

1. Ribbon/Tree 来自同一节点树，切换后 ID、排序、隐藏、选中和动作不变；
2. Header 页面标签关闭后，当前业务 View 也同步切换或卸载；
3. 无 contribution 时不出现空 Primary/Secondary；应用默认 Bottom 在空 View、
   Dashboard 和普通页面都可用，专用 View Bottom 能自动覆盖后再回退；
4. Primary/Secondary/Bottom 尺寸由消费者状态写回，Bottom 只与 Editor 对齐；
   切换 View 不修改 Bottom 显隐与高度；
5. 紧凑 16/24px 与大 Ribbon 24/36px 外观有效，Title 不撑高紧凑工具条；
6. light/dark/system 与产品 token 覆盖均可读；
7. 700px 附近的窄屏行为不遮挡活动 View；
8. 修改显示设置和设置窗口位置后刷新仍恢复；损坏/缺字段快照回到合法默认值；
9. 类型、测试、构建、文档门禁通过；
10. manifest、lockfile、node_modules 没有本地路径污染；
11. 记录尚无两个真实消费者证明的产品语义，不把它扩成 Wing API。
12. diagnostics hub 按工作台实例创建；日志有界，问题可按 owner 替换/清除，定位动作仍由 consumer 处理。
13. Editor 最大化不改显示偏好或 View contribution；三个标签位置均有还原入口，Escape 与浮动面板不重复响应。
14. zh-CN/en-US、刷新当前、关闭其他和 Host dropdown 层级均通过键盘与 a11y 检查。

AI 修改消费者前应完整阅读该仓 `AGENTS.md`、现有 Shell/Router/Pinia 和本地联调规则。优先建立产品侧薄 adapter，避免把几十个 ref 逐项暴露到 `App.vue`，也不要把示例的 `PwwFixture*` 复制成公共协议。

## 9. 当前契约状态

W0-W3 完成的是实验性 Vue Web 工作台。`PnwNavigationNode`、`PnwWorkbenchShell` 和 View Block component contribution 已有 fixture 与 Open Issue 第一轮本地适配证据；W4 将由 Open Issue 补齐简单消费者生命周期回归，并由 Phoenix Admin 验证权限、多 Tab、动态 Block 与偏好映射。完成双消费者比较后，才能决定哪些字段冻结为稳定协议；执行顺序见[《Pnw 工作台 Web 双消费者验证计划》](Pnw工作台Web双消费者验证计划.md)。
