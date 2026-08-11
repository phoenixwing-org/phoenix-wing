# Pnw 工作台 Web · Primary 展开与恢复开关

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.2（已发布）

## 1. 消费证据

Open Issue `SettingsView` 在 Editor 左上角自绘按钮，根据持久化的
`layoutState.visibility.primary` 切换 Element Plus `Expand / Fold` 图标，并调用 consumer store
的 `togglePrimary()`。页面同时通过 View contribution 注册 `PoiSettingsPrimary`。这证明按钮属于
工作台布局快捷入口，而不是 Settings 业务状态。

## 2. 0.6.2 决策

`PnwWorkbenchLayout` 在当前 View 同时声明 Primary contribution 并提供 Primary slot 时，自动
在 Editor Header 左侧提供一个位置稳定的紧凑开关：Primary 展开时显示向左箭头，收起时原位
切换为向右箭头。开关不会在 Primary 内部与 Editor 之间跳动；已使用公共 Header 的页面不会
建立贯穿 Editor 的空白 chrome rail。它直接调用既有 Block toggle 路径，并继续发出：

- `update:visibility`；
- `update:layoutState`；
- `toggle("primary")`，由 `PnwWorkbenchShell` 转发为既有 `toggleBlock`。

因此本轮不新增 prop、类型、事件、store 或持久化协议。Host 仍持有
`PnwWorkbenchLayoutState.visibility`，Wing 不复制状态。无 Primary contribution、没有对应 slot 或
Editor 最大化时不显示该入口。

按钮直接复用 Wing 已有的 `chevron-left / chevron-right` 矢量图标，不使用文本字符，也不新增
重复 icon ID。它使用亮暗主题 token、动态中英文 Tooltip 与 `aria-expanded`；鼠标 hover 只有
瞬时反馈，键盘 `focus-visible` 保留焦点环。按钮占框为 26px。`PnwPageHeader` 自动读取 Layout
提供的前导位 CSS 变量；只有实际 Primary 可用时才保留 32px，普通页面不永久留空槽。

兼容尚未迁移到 `PnwPageHeader` 的旧 View 时，Layout 自动提供 40px chrome rail，确保
自定义标题从框架开关之后开始；迁移后 rail 自动取消，只保留 Header 内前导位。消费者
不需要为开关增加 wrapper 或产品级 padding。

布局状态与点击动作仍属于 `PnwWorkbenchLayout`，不是业务 Header contribution；
`PnwPageHeader` 只承担视觉对齐。consumer 不再为按钮写 position、padding 或主题覆盖。

## 3. 公共边界

Open Issue 发布版仍保留自己的按钮；在 0.6.2 真正发布并由 consumer 主动升级前，不修改其业务
页面。升级后 consumer 应删除自绘按钮与对应样式，继续保留自己的 Pinia 持久化。

在第二个真实 Web consumer 证明需要差异化位置、图标或自定义内容前，不增加
`showPrimaryToggle`、位置 prop、render slot 或 View contribution 字段。当前自动行为和现有受控
事件足以覆盖已确认语义。

## 4. 验证

本地候选至少覆盖：

1. Primary 可用且隐藏时显示“展开”状态；
2. Primary 可用且显示时原位切换为向左箭头和“收起”状态；
3. 无 slot、无 contribution 和 Editor 最大化均不输出按钮；
4. `zh-CN / en-US`、亮暗主题、hover、键盘焦点和宽/窄状态保持；
5. 既有 `pnwToggleViewBlockVisibility` 继续保证不可用 Block 不能被打开。
