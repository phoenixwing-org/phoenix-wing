# Pnw 信息卡片组

状态：current

适用版本：0.7.0 候选

## 1. 目标与边界

`PnwInformationCardGroup` 把 Desk Tools 欢迎页与第二个本地工作台消费者共同出现的
“JSON/DTO → 多张信息卡片”模式收敛为 Wing 能力。消费者只提供中立数据，不再编写 grid、
断点、逐卡片 `v-for`、主题颜色或折叠箭头修正。

Wing 负责：

- 基于容器宽度的 `auto-fit` 布局，宽容器自动多列、窄容器自动单列；
- 默认 `8px 12px` 外围 inset、8px gap、240px 推荐最小卡宽和卡片等高；
- 单卡片 surface、border、主题、长文本换行与 ARIA；
- 卡片默认不可折叠；只有定义显式声明 `collapsible: true` 时才出现折叠按钮；
- 少量 scoped slots 与可选受控展开 ID，供确有差异的 Host 使用。

Host 继续负责读取 JSON、字段语义、格式化、业务动作和数据生命周期。Wing 不提供文件读取，
也不在 DTO 中预置产品、人员或贡献者字段。

## 2. 最小 DTO 与调用

```ts
const informationCards: PnwInformationCardGroupDefinition = {
  id: "runtime",
  ariaLabel: "运行信息",
  cards: [
    {
      id: "environment",
      title: "运行环境",
      status: "Ready",
      items: [
        { id: "version", label: "版本", value: "1.0.0" },
        { id: "adapter", label: "Adapter", value: "Local", note: "由 Host DTO 提供" },
      ],
    },
  ],
};
```

```vue
<PnwInformationCardGroup :definition="informationCards" />
```

`PnwInformationCardGroupDefinition` 只有 `id / ariaLabel / cards`；卡片使用
`id / title / status / items / collapsible / defaultExpanded`，条目继续复用
`PnwInformationBlockItem` 的 `id / label / value / note`。全部字段均可序列化。

## 3. 可选受控状态与 slots

默认卡片不折叠，因此大多数消费者不需要状态。需要折叠时，卡片定义必须显式写
`collapsible: true`；可通过 `v-model:expanded-card-ids` 保存这些卡片的展开 ID。

组件提供：

- `#card="{ card, index, expanded }"`：完整替换一张卡片；
- `#card-header`：替换标题内容；
- `#card-item`：替换单条信息；
- `#card-footer`：追加卡片尾部。

Slots 是例外扩展点，不是推荐的默认调用方式。消费者若只是标题、状态和 label/value/note
不同，应继续只传 DTO。

## 4. 布局、主题与可访问性

卡片组使用 `repeat(auto-fit, minmax(min(100%, 240px), 1fr))`，无需产品媒体查询；容器窄于
240px 时不会产生横向溢出。默认主题来自 `PnwInformationBlock` 的 canonical
`--pnw-workbench-*` token，因而 light/dark/system 共用一份实现。

可选公共 CSS token：

```css
.host-information-cards {
  --pnw-information-card-min-width: 260px;
  --pnw-information-card-group-padding: 10px;
  --pnw-information-card-group-gap: 10px;
}
```

默认 inset 与 `PnwInformationBlock` 条目的内容节奏一致，因此卡片组放入
`PnwInformationBlock` 的 item/slot 时不会贴住外层边框。根节点使用 `border-box`，
自定义 inset 不会使 100% 宽度溢出容器。

组根节点是带 `aria-label` 的 `region`；不可折叠卡片没有伪按钮和错误 caret；可折叠卡片复用
`PnwInformationBlock` 的原生 button、`aria-expanded / aria-controls` 与可见焦点。

## 5. 消费迁移

已有欢迎页可删除：产品 grid、`@media`、逐卡片 `v-for<PnwSidebarBlock>`、卡片边框/主题 CSS，
以及为隐藏默认 caret 添加的补丁。迁移后只保留产品 JSON/DTO 和确有必要的业务 slot。

## 6. 消费者验证

第二个本地工作台消费者已对候选实现完成真实界面验收：宽屏双列、窄屏单列、
卡间 gap 和组四周默认 inset 均通过。消费侧已删除私有 grid、media query、`:deep`
与 padding 覆盖，证明仅传 JSON/DTO 即可成立。产品内部业务组件的配色仍由产品负责，
不属于本公共卡片组契约。
