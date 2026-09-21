# Pnw 工作台 Web · 页面布局与 Header

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.7.2 候选

## 1. 真实页面结论

Cool Admin `/sys/user`、`/dict/list` 的稳定结构是：左右分栏、Header 和 content wrapper
本身 `padding: 0; margin: 0`；真正承载工具条、表格和表单的 `.cl-crud` 使用 `10px`
padding。该规则减少重复留白，同时没有把业务控件贴到窗口边缘。

Wing 复用这个结构规律，不依赖 Cool 类名：

- `PnwPageLayout` 外层结构固定为 `margin: 0; padding: 0`；
- `PnwPageHeader` 紧贴 Editor 上沿并固定为单行；即使包含 32px Host 操作按钮，默认
  实际高度仍为 `40px`；分类、状态和长说明移入 main，不再把 Header 撑成两行；
- `.pnw-page-layout-body` 是结构与滚动层，固定 `padding: 0`；
- 默认插槽由无业务 provider 的 `PnwPageMainBlock` 承载，使用
  `--pnw-page-main-block-padding`（回退 `--pnw-page-body-padding`，默认 `10px`）；
- 普通 raw table、表单和 CRUD 页面无需逐页声明 10px；Cool Host 的 `.cl-crud` 与
  `PnwPageMainBlock` 位于同一视觉层级；
- 已有完整 MainBlock、卡片或画布自行持有内部 padding 时传 `bodyInset=false`，避免叠加；
- 默认由 body 滚动，虚拟表格可传 `bodyScroll=false`。

Host 可在 Workbench 根统一覆盖，不修改各业务 View：

```css
.pnw-workbench-layout {
  --pnw-page-main-block-padding: 10px;
}
```

使用 `bodyInset=false` 的自带卡片/MainBlock 若也希望跟随全局密度，应让其内部 padding
回退到该 token，而不是再次写死数值。

## 2. Primary 对齐

Primary 是否可用由当前 View contribution 与 slot 共同决定。可用时，
`PnwWorkbenchLayout` 在 Editor Header 左侧显示唯一 26px 开关，并向后代提供 32px
前导位；展开为 `chevron-left`，收起原位变为 `chevron-right`。没有 Primary 时，按钮、
属性和前导位同时消失，不永久留空。

尚未迁移到 `PnwPageHeader` 的旧 View 由 Layout 自动获得 40px 的兼容 chrome rail，
Editor 内容从 rail 之后开始，避免开关覆盖自定义标题。迁移为 `PnwPageHeader` 或
`PnwPageLayout` 后，rail 自动取消，只在 Header 内保留 32px 前导位；结构 body 默认
保持 0。默认 `PnwPageMainBlock` 自动提供 10px；页面已有完整卡片/MainBlock 时关闭
`bodyInset`，由该 block 自己提供内部 padding。消费者不需要为开关增加 wrapper 或
产品级定位补丁。

状态和事件属于 Layout；Header 只负责视觉对齐。`PnwPrimaryPanel` 与
`PnwPageHeader` 共用 `--pnw-workbench-view-header-height`，默认 `40px`。公共 Header 的默认
纵向 padding 是 `3px`，可容纳常见 32px Host 按钮而不把单行 Header 撑到 49px；业务
Header 采用公共三段式：左侧 `leading/title` 保底并省略，中间 `actions/help` 使用剩余宽度，
右侧框架浮出/恢复/收回/关闭动作保持固定宽度。业务 actions 的直接子项禁止 flex-shrink；
空间不足时只在中区完整收纳并横向滚动，不能裁掉半个按钮，也不能挤掉右侧框架动作。
消费者不应为普通按钮覆盖 Header 高度或定位。

## 3. 主题

`PnwPageHeader` 依次读取 Host alias 与 Wing canonical default token：

- `--pnw-workbench-text` / `--pnw-workbench-default-text`；
- `--pnw-workbench-muted` / `--pnw-workbench-default-muted`；
- `--pnw-workbench-border` / `--pnw-workbench-default-border`。

因此只选择 `data-pnw-color-scheme="dark"` 也不会回落到浅色硬编码。消费者可覆盖语义
token，但不应对 `.pnw-page-title` 写产品级 dark CSS。

## 4. 最小用法

```vue
<PnwPageLayout title="用户列表" subtitle="COOL">
  <template #leading><AppBackButton /></template>
  <template #actions>
    <AppRefreshButton />
    <AppCreateButton />
  </template>

  <p>筛选、批量操作和权限说明放在 main，不进入 Header。</p>
  <AppCrud />
</PnwPageLayout>
```

中间业务操作区默认居中。需要更接近右侧框架动作时使用公开语义配置，不写产品 CSS：

```vue
<PnwPageLayout title="品牌管理" actions-align="end">
  <template #actions>
    <AppRuntimeCheckButton />
    <AppRefreshButton />
  </template>
</PnwPageLayout>
```

`actionsAlign` 的稳定取值为 `"center" | "end"`，默认 `center`。两种模式只改变空间充足时
的中区对齐；窄宽发生溢出时均安全回退到中区起点，所有动作保持完整并可通过键盘聚焦。

这只是页面结构原语。`PnwPageMainBlock` 不注册 CRUD provider、mitt、权限或路由；它只把
Cool `.cl-crud` 的视觉层级提炼为 Wing 通用能力。若 `<AppCrud />` 已经提供自己的 10px，
在 `PnwPageLayout` 上显式传 `:body-inset="false"`。查询、表格、权限、Router、Primary
内容和状态持久化仍属于 Host。

## 5. 完整 View 浮出时的 Header channel

统一 Router/View Host 在业务 View 挂载前调用 `pnwProvideViewPresentationContext()`。
Wing 会为该 View 自动创建隔离的 `PnwViewPresentationHeaderChannel`：

- 嵌入态，`PnwPageHeader` 在 Editor 原位渲染；
- 浮出态，同一个 Header DOM 通过 Teleport 进入 `PnwViewPresentationPortal` 的单行 chrome；
- `leading / title / actions / help` 保持原 Vue renderer 与事件，不复制按钮或业务状态；
- 三段结构固定为“标题区 → 业务 actions 中区 → Host 动作区”；`leading / title` 保留
  最小可见宽度并省略，Host 动作保持固定最小宽度；
- 业务 actions 中区默认居中，可通过 `actionsAlign="end"` 靠右；超宽时只在中区横向
  收纳，动作子项不收缩、不被裁成半截，也不能覆盖 Host 的恢复、收回和关闭动作；
- Portal 发现已登记的公共 Header 后隐藏 Host fallback title，避免两行或重复标题；
- 无公共 Header 的旧 View 继续使用 Portal 的 `title/#header` fallback。

浮窗 chrome 使用 `--pnw-view-presentation-header-min-height`、
`--pnw-view-presentation-header-gap` 与 `--pnw-view-presentation-header-padding-inline`，默认
分别为 `40px / 8px / 8px`。业务 View 不应穿透覆盖 `.pnw-floating-panel__header`。
标题与中间区默认共享剩余宽度，长标题省略，避免挤没搜索区。
`--pnw-page-header-title-min-width` 仍可显式设置标题保底宽度，默认改为 `0px`；
设置非零值时须验证窄屏下搜索与工具按钮仍可用，不应按单个页面写定位或溢出补丁。
