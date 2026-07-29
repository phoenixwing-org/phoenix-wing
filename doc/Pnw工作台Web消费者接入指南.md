# Pnw 工作台 Web 消费者接入指南

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.0 本地候选（未发布）

最后核验：2026-07-29

本文同时给 Web 开发者与执行迁移的 AI 使用。目标是让消费者复用工作台结构，同时继续拥有 Router、权限、业务 API、页面状态和用户偏好。

## 1. 先选接入层级

优先使用 `PnwWorkbenchShell` 组合入口；只有产品确实需要不同结构时，才单独组合 `PnwWorkbenchHeader`、`PnwActivityBar`、`PnwWorkbenchLayout` 等低层组件。既有 `PnwRibbonShell`、`PnwRibbonGroup`、`PnwRibbonToolButton` 仍是兼容入口，不要求一次迁完。

推荐的默认界面不是四个面板全部打开：

1. 普通业务 Web 使用 `Activity + Primary + Editor`；
2. 筛选、目录和当前对象的简要属性可在 Primary 内上下分区；
3. Secondary 只给独立属性检查器、实时预览等复杂场景，默认隐藏；
4. Bottom 用于问题、输出、日志等可切换页签；
5. 没有 contribution 的 Block 不应生成空容器或 Footer 开关。

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
          { id: "dashboard", label: "仪表盘", icon: DashboardIcon },
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

页面在自己的 setup 中登记；KeepAlive 激活、停用和卸载由 `usePnwViewContribution` 管理：

```ts
usePnwViewContribution(APP_VIEW_BLOCKS, () => props.viewId, {
  primary: {
    component: AppProjectPrimary,
    props: computed(() => ({ projectId: props.projectId })),
  },
  bottom: {
    component: AppProblemsAndOutput,
    tabs: computed(() => problemTabs.value),
  },
});
```

只有复杂 View 才增加：

```ts
secondary: {
  component: AppPropertyInspector,
  props: computed(() => ({ selection: selection.value })),
}
```

组件、业务 props 与 Bottom 内容均属于消费者。Wing 只负责容器、显隐、句柄、页签外观和生命周期接线。

### 3.1 业务 View 自己的内部 Header

`PnwWorkbenchHeader` 是整个壳层的品牌、一级导航、打开页签和用户区；每个业务页面自己的标题、当前对象和操作应放在 `PnwPageHeader`，不要继续堆入壳层 Header：

```vue
<PnwPageHeader
  eyebrow="代码工具"
  title="参数代码"
  :subtitle="activeFileName"
  summary="READY"
  description="修改参数并生成当前工程源码。"
>
  <template #actions>
    <AppPreflightButton />
    <AppSaveButton />
  </template>
  <template #help><AppPageHelp /></template>
</PnwPageHeader>
```

`eyebrow / summary / description` 都是可选的；既有消费者只传 `title / subtitle / actions / help` 时保持紧凑兼容。工具条过宽时由组件允许横向滚动，窄工作台把 actions 放到第二行。Router、文件名、保存和帮助内容仍由 View 持有。

Desk Tools 与 Open Issue 已有多个真实页面使用 `PnwPageHeader`；fixture 也直接消费该公共组件，不再保留一份 `PwwFixtureViewHeader`。示例把摘要、目录、Codegen、检查和 Issue 五种 Editor View 分文件呈现，证明差异应留在业务 View 的 props、actions/help slot 与页内工具条，而不是复制五套 Header。新消费者只参考最接近自己的 View 组合，不要整目录复制或改名一个 Header 组件。

## 4. Problems / Log 与实例级诊断

`PnwLogBlock` 和 `PnwProblemsBlock` 只负责紧凑内容与过滤；`PnwBottomPanel` 继续负责页签、计数和容器。日志/问题真源由 consumer 持有，也可以为每个工作台显式创建一个有界内存 hub：

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

不要序列化含 Vue 组件或图标引用的整棵导航树。保存稳定 ID、顺序、分组归属和文本覆盖，再由产品默认树 hydrate；这样升级时可以恢复默认并处理新增模块。

## 6. 品牌、Header 与主题

- `brandTitle` / `brandSubtitle` 适合简单品牌；结构不同用 `brand` slot；
- 用户、租户、显示身份和退出放 `header-actions`；
- Ribbon 最右侧 `…` 与 Tree 底部设置图标打开 Wing 公共单行快捷菜单；“完整显示设置…”继续打开 Wing 公共 `PnwWorkbenchDisplaySettingsPanel`，consumer 只绑定受控状态，不复制设置表单；
- consumer 可在 `display-settings-actions` 追加源码定义的快捷动作，通过 `display-settings-action` 处理 action ID；也可在 `display-settings-panel-extra` 插入自己的 Vue 设置区，例如句柄方式或产品主题。Wing 不提供最终用户编辑菜单定义的 UI，也不读取扩展字段；
- Footer 左侧 `footer` slot 可显示消费者自己的页面、连接或任务状态，右侧面板开关仍由 Wing 根据当前 View contribution 生成；
- `light`、`dark`、`system` 通过受控 `colorScheme` 传入；
- 产品主题覆盖 `--pnw-*` CSS token，不依赖组件内部 DOM，也不要复制 Wing scoped CSS；
- 用户贡献 CSS 时应由产品白名单、作用域和发布流程治理，Wing 不执行任意远程 CSS。

## 7. 本地未发布 Wing 联调

依赖清单和 lockfile 继续精确锁定已发布 Registry 版本。本地联调只能是单次进程的 resolver/alias，不是依赖安装方式：

- 禁止 `pnpm link`；
- 禁止 `link:`、`file:`、本地 `workspace:` 与 `pnpm.overrides`；
- 禁止修改消费者 `node_modules`；
- 本地命令必须验证标准并列 `../phoenix-wing`，构建 Wing 后再启动消费者；
- 日志必须明确显示 `[Wing][LOCAL]` 与实际路径、版本；
- 本地通过不代表 npm 已发布，也不能据此改发布标签。

Open Issue 的独立验证分支采用上述方式：manifest 仍锁定 `phoenix-wing@0.5.1`，`pnpm dev:local-wing` / `pnpm build:local-wing` 在进程内消费并列 Wing `0.6.0`。这是本地候选证据，不是 Registry 验收。

## 8. 开发者与 AI 验收清单

每次接入至少验证：

1. Ribbon/Tree 来自同一节点树，切换后 ID、排序、隐藏、选中和动作不变；
2. Header 页面标签关闭后，当前业务 View 也同步切换或卸载；
3. 无 contribution 时不出现空 Primary、Secondary、Bottom 或 Footer；
4. Primary/Secondary/Bottom 尺寸由消费者状态写回，Bottom 只与 Editor 对齐；
5. 紧凑 16/24px 与大 Ribbon 24/36px 外观有效，Title 不撑高紧凑工具条；
6. light/dark/system 与产品 token 覆盖均可读；
7. 700px 附近的窄屏行为不遮挡活动 View；
8. 修改显示设置和设置窗口位置后刷新仍恢复；损坏/缺字段快照回到合法默认值；
9. 类型、测试、构建、文档门禁通过；
10. manifest、lockfile、node_modules 没有本地路径污染；
11. 记录尚无两个真实消费者证明的产品语义，不把它扩成 Wing API。
12. diagnostics hub 按工作台实例创建；日志有界，问题可按 owner 替换/清除，定位动作仍由 consumer 处理。

AI 修改消费者前应完整阅读该仓 `AGENTS.md`、现有 Shell/Router/Pinia 和本地联调规则。优先建立产品侧薄 adapter，避免把几十个 ref 逐项暴露到 `App.vue`，也不要把示例的 `PwwFixture*` 复制成公共协议。

## 9. 当前契约状态

W0-W3 完成的是实验性 Vue Web 工作台。`PnwNavigationNode`、`PnwWorkbenchShell` 和 View Block component contribution 已有 fixture 与 Open Issue 第一轮本地适配证据；W4 将由 Open Issue 补齐简单消费者生命周期回归，并由 Phoenix Admin 验证权限、多 Tab、动态 Block 与偏好映射。完成双消费者比较后，才能决定哪些字段冻结为稳定协议；执行顺序见[《Pnw 工作台 Web 双消费者验证计划》](Pnw工作台Web双消费者验证计划.md)。
