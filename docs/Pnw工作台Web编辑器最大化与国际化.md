# Pnw 工作台 Web · Editor 最大化、标签动作与国际化

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.1+；标签上下文菜单为 0.8.0 新增

最后核验：2026-10-07

## 1. 产品边界

Editor 最大化是工作台布局的瞬时状态，不是 View contribution，也不是用户显示偏好。
View 只提供自己的 Editor 内容；它不能隐藏 Header、Activity、Footer 或其他 Block，
也不能把最大化写入 `PnwWorkbenchDisplayPreferences`。

状态仍由 Host 持有。Wing 负责区域显隐、TabBar 还原入口和 Escape 行为：

```vue
<PnwWorkbenchShell
  v-model:editor-maximized="app.isFull"
  :locale="appLocale"
  :can-refresh-active-tab="Boolean(activeTabId)"
  :can-close-other-tabs="tabs.length > 1"
  @refresh-active-tab="refreshActiveTab"
  @close-other-tabs="closeOtherTabs"
/>
```

`editorMaximized = true` 时，Wing 隐藏 Header 的品牌/模块/Host actions、Activity、
Primary、Secondary、Bottom 与 Footer，只保留一个 Editor 和一个 TabBar。TabBar 原在
Header 时，Header 退化成仅含 TabBar 的还原条；原在 Editor 顶部或底部时保持原位。
这样不复制 RouterView、Process、KeepAlive 或页面组件。Escape 发出
`update:editorMaximized(false)`；若浮动面板先消费并 `preventDefault()`，该次 Escape
只关闭面板，不同时退出最大化。

最大化不修改 `presentation`、`tabBarPlacement`、`layoutState.visibility`、面板尺寸或
设置面板坐标。退出后 Host 原状态完整恢复。

若 Host 覆盖 `pages` 或低层 `header` slot，应使用 `PnwWorkbenchLayoutSlotProps`
的 `editorMaximized / requestEditorMaximized` 在自定义 TabBar 保留等价还原动作；
默认 Shell 已自动完成，不需要额外接线。

## 2. TabBar 通用动作

`PnwWorkbenchTabBar` 和组合入口 `PnwWorkbenchShell` 提供三类无业务语义动作：

| 能力 | 受控输入 | 事件 | Wing 责任 |
|---|---|---|---|
| 刷新当前标签 | `canRefreshActiveTab` | `refreshActiveTab` | 图标、禁用与 a11y |
| 关闭其他标签 | `canCloseOtherTabs` | `closeOtherTabs` | 图标、少于两个标签时禁用 |
| 最大化/还原 | `editorMaximized` | `update:editorMaximized` | 布局、图标、Escape |

Wing 不刷新 Router、不更新 Process、不决定缓存 key，也不实现“返回、主页、产品源码
链接”。这些仍由 Host 自己的 Header action 或标签控制器处理。独立使用低层
`PnwWorkbenchTabBar` 时，`showEditorMaximizeAction` 缺省为 `false`；组合
`PnwWorkbenchShell` 缺省开启，并完成 Layout 事件接线。

### 0.8.0：显式目标的标签上下文菜单

Shell 和 TabBar 均通过 `tabContextActions` 显式启用；默认空数组，不拦截浏览器右键。
支持 `refresh`、`close`、`close-others`、`close-right`、`close-all`，重复动作去重。
`tabAction` 事件携带 `PnwWorkbenchTabActionRequest { action, tabId }`；`tabId` 是右键或键盘
唤起菜单的标签，不是当前活动标签。打开菜单不会发出选中事件，也不会自行关闭或刷新资源。

```vue
<PnwWorkbenchShell
  :tabs="tabs" :active-tab-id="activeTabId"
  :tab-context-actions="['refresh', 'close', 'close-others', 'close-right', 'close-all']"
  :tab-action-disabled="isTabActionDisabled"
  @tab-action="handleTabAction"
/>
```

Host 使用公开纯函数 `pnwWorkbenchTabActionTargets(tabs, request)` 得到有序目标集合。
刷新/关闭返回目标本身；关闭其他排除目标；关闭右侧按当前顺序取目标之后；关闭全部返回全部。
目标已不存在则一律返回空数组。无目标范围或 `closingAllTabs` 为真时自动禁用；
`tabActionDisabled(request)` 用于附加权限、脏数据、忙碌等策略。回调不得产生副作用；
真正执行时 Host 必须再次核验，异步确认后还须重算范围，不能把 UI 禁用当作事务保护。
旧工具栏事件 `refreshActiveTab` / `closeOtherTabs` 保留原义，不与上下文菜单事件混用。

菜单 Teleport 到 body，继承显式 `colorScheme` 和 Shell locale，按 viewport 边缘收敛坐标。
Shift+F10 / 菜单键打开；↑↓跳过禁用项并循环，Home/End 到首尾，Enter/Space 执行；
全禁用时菜单容器仍可聚焦，Esc 可退出。Esc 回到目标标签，Tab/Shift+Tab 关闭并继续
正常焦点顺序；外部指针、外部滚动、resize 或目标移除会关闭菜单。
动作后若目标移除，焦点回退到活动/首个剩余标签，不覆盖 Host 已选择的对话框焦点。
关闭最后一个标签导致整个 TabBar 卸载时，空工作台焦点位置由 Host 负责。

Wing 自身验收页：`examples/PwwWorkbenchWeb/?example=tab-menu`，首页可发现。
公开示例涵盖三种位置、独立合成标签、未保存/忙碌保护、中英文明暗主题及窄容器。
DOM 回归与真实浏览器范围见 [0.8.0 发布记录](releases/0.8.0发布候选.md)。

## 3. Host 驱动国际化

Wing 0.6.1 内置 `PnwLocale = "zh-CN" | "en-US"`。Host 只把当前语言传给 Shell：

```vue
<PnwWorkbenchShell :locale="locale" />
```

Wing 自有的显示设置、标签动作、布局句柄、Footer、浮动面板和相关无障碍文案随之
切换。`PNW_DEFAULT_LOCALE` 为 `zh-CN`；未知值经 `pnwNormalizeLocale` 回退。
`PNW_LOCALE_MESSAGES` 与 `pnwTranslateLocaleMessage` 可用于同一工作台组合中的适配
测试，但 Host 不应修改该常量。

Wing 不读取浏览器语言，不写 Pinia/localStorage，也不切换 Element Plus locale。
Host 的语言 store、后端用户偏好、URL 和产品业务文案仍由 Host 管理。

## 4. Overlay stacking 契约

`PNW_WORKBENCH_OVERLAY_LAYERS` 固定语义顺序：

```text
content(0) < chrome(100) < floatingPanel(1200)
           < hostTools(1400) < modal(2000)
```

Wing 的 `PnwFloatingPanel` 缺省使用 `floatingPanel`；Header 的 Host action 区使用
`hostTools`。第三方 dropdown/popover 若 Teleport 到 body，应把其 z-index 设为
`PNW_WORKBENCH_OVERLAY_LAYERS.hostTools` 或更高；模态框使用 `modal`。这使语言菜单等
Host 工具不会被工作台显示设置遮挡，同时无需在 Wing 写入任一产品 URL 或 Element
Plus 专用配置。

低层 `PnwFloatingPanel` 提供 `layer` 与有限的 `zIndex` 覆盖；CSS 还可通过
`--pnw-floating-panel-z-index` 适配既有叠层系统。自定义值应保持上述相对顺序。

叠层顺序与空间避让是两件事。工作台显示设置继续位于 `floatingPanel`，不会为了越过
Header 而提升到 `hostTools`；它使用 `PnwFloatingPanel.constrainInsets` 和纯函数
`pnwClampFloatingPanelPosition` 避让同一 Workbench Header，并按剩余 viewport 高度滚动
正文。其他 Host chrome 也可传入 `top/right/bottom/left` 安全区域，但 Wing 不持久化
这些瞬时几何值。

## 5. 验收

- Header、Editor 顶部和 Editor 底部三种标签位置都只有一个 TabBar；
- 最大化前后只存在一个 Editor，active/dirty/顺序不变；
- 最大化隐藏六类壳层区域，Header 标签位置仍有明确还原按钮；
- Escape 不与已打开的 modeless 设置面板同时触发；
- zh-CN/en-US 下按钮 title、aria-label、设置文案一致；
- Host dropdown 层高于 Wing 设置面板，modal 又高于 Host dropdown；
- 工作台设置面板位于 Header 下方，受控旧坐标和窗口 resize 后仍保留可见标题与关闭动作；
- 最大化不进入显示偏好 normalizer，也不改变面板显隐或尺寸。
