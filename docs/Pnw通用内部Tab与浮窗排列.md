# Pnw 通用内部 Tab 与浮窗排列

状态：current（0.7.5 已发布；见[发布验收](releases/0.7.5发布验收.md)）

Owner：Phoenix Wing maintainers

适用版本：Phoenix Wing 0.7.x

## 1. 能力边界

本能力只提供两类业务无关的 Web UI 原语：

- `PnwTabContainer`：在一个已存在的 View、对话框或页面内部切换内容；
- `pnwArrangeFloatingViewBounds` / `pnwArrangeViewPresentationRecords`：计算调用方显式指定
  浮窗的平铺或层叠位置。

Wing 不读取业务目录、Router、iframe URL 或页面数量，不负责补齐未打开的业务 View，也不
替调用方决定哪些 embedded View 需要浮出。排列函数不会创建、关闭、浮出、收回或聚焦窗口，
因此不会接管 `PnwViewPresentationPortal` 的 lease、拖动、缩放和浮窗栈。

## 2. 内部 Tab 容器

### 2.1 公共模型

```ts
import type { PnwTabDefinition } from "phoenix-wing";

const tabs: readonly PnwTabDefinition[] = [
  { id: "overview", title: "概览" },
  { id: "parameters", title: "参数" },
  { id: "diagnostics", title: "诊断" },
];
```

`id` 和 `title` 必须是非空字符串，同一容器内的 `id` 不得重复。`disabled` 只影响切换，
不会删除已经挂载的内容。

`PnwTabContainer` 的 `activeTabId` 完全受控，通过 `v-model:active-tab-id` 接线；用户切换时
同时发出：

- `update:activeTabId(tabId)`；
- `change(tabId, previousTabId, reason)`，其中 `reason` 为 `"pointer" | "keyboard"`。

### 2.2 iframe / 未保存输入保活

```vue
<script setup lang="ts">
import { ref } from "vue";
import { PnwTabContainer, type PnwTabDefinition } from "phoenix-wing";

const activeTabId = ref("overview");
const tabs: readonly PnwTabDefinition[] = [
  { id: "overview", title: "概览" },
  { id: "parameters", title: "参数" },
  { id: "diagnostics", title: "诊断" },
];
const sources: Readonly<Record<string, string>> = {
  overview: "/views/overview",
  parameters: "/views/parameters",
  diagnostics: "/views/diagnostics",
};
</script>

<template>
  <PnwTabContainer
    v-model:active-tab-id="activeTabId"
    :tabs="tabs"
    aria-label="内容页签"
    lazy-mount
    :panel-scrollable="false"
  >
    <template #default="{ tab }">
      <iframe :src="sources[tab.id]" :title="tab.title" />
    </template>
  </PnwTabContainer>
</template>
```

`lazyMount=true` 时每个面板首次激活才创建；创建后只通过 `hidden` 切换可见性，不销毁
DOM，因此重复切换保留同一个 iframe 实例和未保存输入。`lazyMount=false` 会在初次渲染时
挂载全部面板。默认由 `tabpanel` 滚动；iframe、虚拟列表或画布自行滚动时设置
`panelScrollable=false`。

这个保证只覆盖同一个 `PnwTabContainer` 实例内部的页签切换。父 View 被业务 Host 关闭、
销毁或在其他容器中重新创建时，内部内容仍会随父实例销毁；完整 View 的浮出/收回是否保持
DOM 实例继续由现有 Portal/Host 接线决定，不能用 Tab 保活结论替代。

### 2.3 可访问性与主题

- 容器输出 `tablist → tab → tabpanel`，并建立 `aria-controls / aria-labelledby`；
- `ArrowLeft/ArrowRight`（同时兼容上下方向键）循环切换，`Home/End` 跳到首尾可用页签；
- disabled 页签跳过，活动页签使用 roving `tabindex=0`；
- 所有类名使用 `pnw-`，颜色从 Workbench 的 text/muted/surface/background/border/focus token
  读取，随 `PnwOverlayThemeProvider` 的明暗主题自动变化；
- 根容器和 panel 使用 `min-width/min-height: 0` 与 flex 伸缩，可放入
  `PnwViewPresentationPortal` 的 main 区域。

## 3. 浮窗平铺与层叠

### 3.1 通用几何入口

`pnwArrangeFloatingViewBounds` 接收：

- `mode: "tile" | "cascade"`；
- fixed-position 坐标系中的 `area.position/area.size`；
- 按确定顺序排列的 `targets[]`；
- 可选 `gap`、`cascadeOffset`、`cascadeMinimumVisibleSize`；
- 每个目标的 `preferredSize` 与 `min/max` 约束。

平铺会根据可用宽高与最小宽度选择列数；每行独立分配宽度，因此最后一行自动占满可用
宽度。层叠按输入顺序使用固定错位，并在窄区域自动缩小错位和窗口尺寸，确保最后一个窗口
仍位于区域内。

区域不足以容纳全部声明最小尺寸时，算法优先保证：

1. 所有结果留在调用方可用区域；
2. 平铺窗口互不重叠；
3. 输入顺序不变；
4. 返回 `compressedBelowMinimum=true` 与可直接应用的 `effectiveMinSize`。

### 3.2 View presentation record 接入

```ts
import {
  pnwArrangeViewPresentationRecords,
  type PnwPresentationFrameDefinition,
  type PnwViewPresentationRecord,
} from "phoenix-wing";

const frame: PnwPresentationFrameDefinition = {
  ownerKind: "view",
  movable: true,
  resizable: "both",
  recommendedSize: { width: 940, height: 640 },
  minSize: { width: 320, height: 260 },
  rememberBounds: true,
  closeBehavior: "reattach",
};

function arrange(
  mode: "tile" | "cascade",
  area: DOMRect,
  records: readonly PnwViewPresentationRecord[],
) {
  return pnwArrangeViewPresentationRecords({
    mode,
    area: {
      position: { x: area.left, y: area.top },
      size: { width: area.width, height: area.height },
    },
    gap: 8,
    targets: records.map((record) => ({ record, frame })),
  });
}
```

每个结果同时返回：

- `record`：只更新 `dialogPosition/dialogSize`；
- `frame`：保留原声明，并在窄区把 `minSize` 临时收敛到实际结果；
- `bounds/order/viewInstanceId`：供 Host 更新索引或按确定顺序聚焦。

调用方应先按自己的业务清单创建缺少的 View，并通过既有 Portal handle 浮出 embedded View；
等 `nextTick` 后测量 Header/Ribbon 下方可用区域，再一次性把返回的 `record/frame` 写入原有
响应式映射。Portal 的 `key`、record identity、mode 和 revision 均不变化，所以重复排列不会
重建已经 floating 的窗口、iframe 或内部输入。若调用方需要统一 z-order，可在应用 bounds 后
按结果 `order` 调用既有 handle/stack 的 `focus`；Wing 几何函数本身不移动未列入 targets 的
设置弹窗或其他 Tool 浮层。

完整 View 从 embedded 浮出或收回时仍使用原有 Teleport/lease 生命周期。若消费者当前的
iframe 在这两个动作中会因自身 Host 结构重挂载，排列 API 不会声称消除该限制；它只保证
对已经 floating 的同一组窗口重复平铺/层叠时不改变实例身份。

## 4. 验证入口

```bash
pnpm exec vitest run \
  src/components/PnwTabContainer.test.ts \
  src/utils/pnwFloatingViewArrangement.test.ts
pnpm typecheck
pnpm build
pnpm verify:aggregate-dist
```

本地源码联调继续遵守[《消费者本地联调与验证》](本地验证方法.md)：不得把 `link:`、
`file:`、`workspace:` 或本机绝对路径写进消费者 manifest/lockfile，也不能把本地构建成功
冒充 Registry 已发布。
