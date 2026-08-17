# Pnw 工作台 Web · 可浮动与 Primary 停靠工具宿主

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.7.0 候选

最后核验：2026-08-15

## 目标与边界

Wing 为工程工具提供一套受控的 `closed / floating / primary` 状态机。同一个工具
definition 和 state 在任一时刻最多只有一个呈现；业务数据、Router、权限、活动 View、
持久化介质仍由 Host 持有。浮动和停靠切换可以重建呈现组件，因此工具的业务状态必须
位于组件上层的 store/composable，不能依赖浮窗内部的临时局部状态。

本能力复用现有 `PnwFloatingPanel`、`PnwPrimarySection` 和 overlay theme，不引入消费者
名称、私有文件格式或其他产品字段。Tool 与完整 View 共用 `PnwPresentationFrameDefinition` 的
拖动、缩放、推荐尺寸、记忆 bounds 与窗口栈，但不合并 owner/销毁状态机。

## 为什么使用 application / view

公开名称固定为 `scope: "application" | "view"`。`application` 精确表达“同一个 Web
应用中跨 View 存活”，而 `workspace` 容易被误解为项目目录或多窗口工作区，`global`
又容易被误解为跨应用 singleton。Wing 不定义这两种额外生命周期。

- `application`：只要 mode 不是 `closed`，切换任意 View 仍应呈现。
- `view`：definition 必须提供 `ownerViewId`。仅 owner View 激活时呈现；离开时只派生
  为不可见，不改变 mode、浮窗坐标、Primary 首尾位置或折叠状态。重新激活后自然恢复。

作用域判断由 `pnwIsDockableToolVisible` 完成。它是纯函数，不会偷偷关闭工具或写入
Host 状态。

## 公共 API

```ts
import {
  PNW_DEFAULT_DOCKABLE_TOOL_STATE,
  PnwDockablePrimarySection,
  PnwDockableToolWindow,
  pnwIsDockableToolVisible,
  pnwNormalizeDockableToolState,
  pnwReduceDockableToolState,
  type PnwDockableToolDefinition,
  type PnwDockableToolState,
} from "phoenix-wing";
```

`PnwDockableToolDefinition` 只包含稳定 ID、标题、可选无障碍名称和作用域。
可选 `frame` 使用 `ownerKind: "tool"`、`closeBehavior: "close"`，并声明 `movable`、
`resizable`、`recommendedSize / minSize / maxSize` 与 `rememberBounds`。
`PnwDockableToolState` 包含：

- `mode`：`closed | floating | primary`；
- `floatingPosition`：受控 `x/y`，`PnwFloatingPanel` 拖动及边界修正后回传；
- `floatingSize`：受控 `width/height`；resize、恢复推荐尺寸与 viewport clamp 后回传；
- `primaryPlacement`：`first | last`；当前只提供确定的最小排序，不承诺任意拖拽；
- `primaryExpanded`：Primary Section 的受控折叠状态。

`pnwReduceDockableToolState` 接受以下命令：`open-floating`、`dock-primary`、`close`、
`set-floating-position`、`set-floating-size`、`set-primary-placement`、
`set-primary-expanded`。切换 mode 不清除
其他字段。`pnwNormalizeDockableToolState` 用于读取 Host 持久化数据时补默认值和修正
非法值；Wing 不选择 Pinia、localStorage 或后端。

## 状态机与交互

| 当前状态 | 动作 | 下一状态 | 保留数据 |
|---|---|---|---|
| closed | 打开浮窗 | floating | 上次 bounds、Primary 位置/折叠 |
| floating | 停靠到 Primary | primary | 当前 bounds、Primary 位置/折叠 |
| primary | 浮出 | floating | 当前 bounds、Primary 位置/折叠 |
| floating / primary | X 或 Escape（浮窗） | closed | bounds、位置、折叠仍保留供下次打开 |
| primary | 移到首部/尾部 | primary | 仅更新 `primaryPlacement` |
| primary | 展开/折叠 | primary | 仅更新 `primaryExpanded` |

Primary 标题栏始终提供浮出和 X；可选首/尾动作默认开启。浮窗标题栏提供停靠动作，
`PnwFloatingPanel` 的 X、活动窗 Escape、拖动、八向/轴向 resize、恢复推荐尺寸、viewport
约束和 Teleport light/dark 主题继续生效。多个 Tool/View 浮窗默认进入同一 Document
窗口栈和 `presentation` overlay layer；它高于 Workbench Header、低于 modal。
pointer/focus 会跨 Tool/View 置顶，关闭活动窗后焦点返回前一窗；消费者无需为两类窗口
分别指定 z-index。两边的 X 都发出同一个 `close` 状态转换。

## Host 装配

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import {
  PnwDockablePrimarySection,
  PnwDockableToolWindow,
  PNW_DEFAULT_DOCKABLE_TOOL_STATE,
  pnwIsDockableToolVisible,
  type PnwDockableToolDefinition,
} from "phoenix-wing";

const activeViewId = ref("parts");
const tool = {
  id: "product.inspector",
  title: "检查器",
  scope: "application",
  frame: { ownerKind: "tool", movable: true, resizable: "both",
    recommendedSize: { width: 640, height: 480 },
    rememberBounds: true, closeBehavior: "close" },
} as const satisfies PnwDockableToolDefinition;
const toolState = ref({ ...PNW_DEFAULT_DOCKABLE_TOOL_STATE });
const toolInPrimary = computed(() =>
  toolState.value.mode === "primary"
  && pnwIsDockableToolVisible(tool, toolState.value, activeViewId.value),
);

function showPrimary(): void {
  // 使用既有 PnwWorkbenchLayoutState.visibility；Wing 不持有第二份布局状态。
  layoutState.value.visibility.primary = true;
}
</script>

<template>
  <!-- application 工具停靠时，Host 将 toolInPrimary 纳入 Primary availability。 -->
  <PnwDockablePrimarySection
    v-model:state="toolState"
    :definition="tool"
    :active-view-id="activeViewId"
  >
    <ProductInspector />
  </PnwDockablePrimarySection>

  <PnwDockableToolWindow
    v-model:state="toolState"
    :definition="tool"
    :active-view-id="activeViewId"
    @dock-primary="showPrimary"
  >
    <ProductInspector />
  </PnwDockableToolWindow>
</template>
```

示例中的两个 `<ProductInspector>` 位置不会同时呈现，但 mode 切换时可能卸载并重建。
需要严格保留的草稿、选择和 I/O 状态应放在同一个上层 store，并由两个位置消费；不要
把两个业务实例各自维护为两份真源。若 View 已有 `PnwPrimaryPanel`，把
`PnwDockablePrimarySection` 加到其 sections 列表；若是 application 工具，Host 的应用级
Primary 组合必须在没有 View Primary 时也提供 Primary availability。停靠事件还应使用
既有 `PnwWorkbenchLayoutState.visibility.primary` 请求显示 Primary。

仓内可运行 fixture 由
[`PwwFixtureDockableToolView.vue`](../examples/PwwWorkbenchWeb/src/fixture/PwwFixtureDockableToolView.vue)
与
[`PwwFixtureDockableToolPrimary.vue`](../examples/PwwWorkbenchWeb/src/fixture/PwwFixtureDockableToolPrimary.vue)
共同演示资源库类 Tool 的 floating/Primary 互斥呈现。

## 样式、主题与可访问性

- 公共类名均为 `pnw-`；颜色只消费 `--pnw-workbench-*`、`--pnw-control-*` 和
  `--pnw-focus-ring` 语义 token。
- 浮窗复用 `PnwOverlayThemeProvider`，Teleport 到 `body` 后仍携带解析后的 light/dark
  scheme；Host 的第三方 overlay 继续遵循单独的 overlay root 契约。
- 所有动作是原生 button，含 localized title/aria-label、hover 和 `focus-visible`。
- resize 句柄可聚焦并使用方向键；Shift 为大步长。`resizable` 可限定 horizontal、
  vertical 或 both，固定检查器可设为 false。
- `pnwCreatePresentationBoundsSnapshot` 仅在 `rememberBounds` 开启时返回纯数据；临时
  active/z-index 不进入 Pinia/localStorage/后端。
- Primary 折叠复用 `PnwPrimarySection` 的整行点击、`aria-expanded` 和键盘行为；关闭后
  正文不残留占位。

## 暂不扩展

- 不提供任意 Primary 拖拽排序，只提供 first/last；
- 不持有工具业务数据、权限、Router、I/O 或用户偏好；
- 不增加跨浏览器窗口、跨应用或“全局 singleton”语义；Document 栈只管理当前 renderer；
- 不强制 Workbench Shell 注册工具。Host 继续组合自己的 View Primary 与应用级工具，
  并使用现有受控 layout state；取得两个真实消费者的装配证据后再评估 registry。

## 本地开发与验证

Wing 禁止 `pnpm link`、`link:`、`file:`、`workspace:` 或编辑 consumer `node_modules`。
在 Wing 根执行：

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm docs:check
pnpm example:workbench:typecheck
pnpm example:workbench:build
```

需要持续构建时使用两个终端：

```bash
pnpm exec vite build --watch --emptyOutDir false
pnpm exec vue-tsc -p tsconfig.build.json --declaration --emitDeclarationOnly --watch
```

消费者必须使用其仓库既有的“并列 `../phoenix-wing` 源码 resolver”命令；若尚未提供，
应先在消费者建立显式 local/registry 双入口，而不是临时 link。只有 Registry 安装和
clean consumer tarball 验证才证明正式发布可用。
