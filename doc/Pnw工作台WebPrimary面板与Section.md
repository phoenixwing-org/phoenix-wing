# Pnw 工作台 Web · Primary 面板与 Section

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.2（已发布）

## 1. 消费证据与目标

BOM、Open Issue 与 Function 都需要在工作台 Primary 中呈现筛选、统计、属性和快捷动作。此前
各消费者分别维护外层 padding、Section 标题条、折叠状态和 caret，导致相同结构出现不同的
左右 gap、焦点态与主题颜色。

0.6.2 提供两个不含业务数据模型的结构原语：

- `PnwPrimaryPanel`：Primary 专用满宽容器，Sidebar body 默认无 inset、`gap: 0`，内容可滚动；
- `PnwPrimarySection`：满宽连续 Section，默认可折叠，支持受控或非受控状态。

Wing 不拥有 contribution、字段、动作、排序、草稿、Router 或持久化。BOM 的两列表单、Open
Issue 的筛选条件、Function 的属性模型仍由各插件维护。

## 2. API

```vue
<PnwPrimaryPanel title="BOM Primary">
  <template #summary>当前对象摘要</template>

  <PnwPrimarySection
    v-model:expanded="expandedByView.filters"
    title="搜索与排序"
  >
    <div class="consumer-form">...</div>
  </PnwPrimarySection>

  <PnwPrimarySection title="固定信息" :collapsible="false">
    ...
  </PnwPrimarySection>
</PnwPrimaryPanel>
```

`PnwPrimaryPanel` props：`title`、`ariaLabel`、`bodyScroll`；slots：`title`、`suffix`、
`actions`、`summary`、default、`footer`。它使用 `PnwSidebarBlock :body-inset="false"`，但
`PnwSidebarBlock` 的既有默认仍为有 inset，旧消费者不变。

`PnwPrimarySection` props：`title`、`expanded`、`defaultExpanded`、`collapsible`、
`ariaLabel`；events：`update:expanded`、`toggle`；slots：`title`、`suffix`、`actions`、
default / `body`。省略 `expanded` 时组件维护内部状态；传入时由 Host 持有状态。

## 3. BOM 金样本冻结值

- Panel body：左右贴边、`width: 100%`、`gap: 0`；
- Panel Header：使用 `--pnw-workbench-view-header-height`，默认 `40px`，与紧凑 Editor
  `PnwPageHeader` 的上沿和底边对齐；Primary 展开/收起按钮不再占用其右上角；
- Section 标题条：最小高度 `28px`，padding `4px 8px`；
- caret：向右为收起，展开旋转 `90°`，动画 `120ms`；
- Section 间使用连续底边，不增加横向 margin、圆角或卡片 gap；
- Section body 默认无 inset；表单、按钮、controls/actions 由消费者保留自身 `8px` inset；
- BOM 两列布局、label 最大 `124px`、value 最小 `34px` 属于 BOM 业务呈现，不进入 Wing。

主题只使用 `--pnw-workbench-*`、`--pnw-control-hover-bg` 和 `--pnw-focus-ring` 语义 token，
适配亮色、暗色与 Host 高对比覆盖；组件不依赖 Element Plus、Pah 或业务 contribution 类型。

## 4. 接入与清理

1. 用 `PnwPrimaryPanel` 替换消费者自己的 Primary `aside` 和外层 padding 覆盖；
2. 用 `PnwPrimarySection` 替换手写 Section header、ArrowRight/caret、折叠 Set 与 toggle 函数；
3. 按 route / view ID 在消费者 store 中隔离需要持久化的 `expanded`，Wing 不保存；
4. 保留业务表单和动作区的 `8px` inset，不把字段/动作 schema 搬入 Wing；
5. 删除 `:deep(.pnw-sidebar-block-body) { padding: 0 }` 等跨组件 CSS 覆盖。

最小 fixture 见 `examples/PwwWorkbenchWeb/src/fixture/PwwFixtureViewPrimary.vue`。
