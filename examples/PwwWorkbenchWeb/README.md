# Pww Workbench Web fixture 示例

本目录用于《Pnw 工作台 Web 架构与示例计划》的 W3 视觉与交互回归。它是 Wing 仓内的第一方 fixture consumer，用消费者方式验证公共入口；它不是 npm 包、产品原型或第二套组件实现。

边界：

- 只使用本目录内的 fixture 数据，不连接 Router、登录、权限、业务 API 或持久化存储；
- Vue 组件与类型必须从 `phoenix-wing` 公共入口导入，公共实现继续维护在仓库根 `src/`；
- 导航默认树、布局管理 View、Pinia 状态与可持久化差量均属于本示例消费者，不得反向进入 Wing 公共组件；
- `App.vue` 只装配一个受控 `PnwWorkbenchShell` 和一个分组 facade；fixture 状态与事件编排在 `fixture/PwwFixtureWorkbenchController.ts`，当前 View 通过 Wing 的隔离 registry 登记 Primary/Secondary/Bottom 组件，Shell 动态装配，App 不再包含三个 Block 的业务模板；
- 通过 light/dark 切换和 `--pnw-*` token 覆盖验证主题；用户自定义样式只覆盖公共 token 或在宿主作用域内追加，不改写 Wing 组件源码；
- 不承载 Admin、Open Issue、Function、DeskTools、BOM Studio 或 VS Code 插件的业务适配；
- 构建产物仅用于本地验证，不进入根包发布文件。

## 新 consumer 如何采用

不要把 `src/fixture/` 整目录复制成产品代码。这里的 `PwwFixture*` 是为了运行和
回归示例而准备的假导航、假 View、Pinia 状态、设置页和演示内容，真实 consumer
通常全部替换为自己的 Router、页面 registry、Pinia store 与业务 View。

建议只参考根 `App.vue` 的三处接线：导入 `PnwWorkbenchShell`、传入受控状态、让
当前 View 通过 `usePnwViewContribution` 登记 Block。示例为了避免展开 30 个变量，
用一个 `pwwFixture` facade 按 appearance、navigation、layout、settings、view、
tabs、actions 分组；它不是 Wing 公共协议，consumer 可直接绑定已有 store，也可
建立自己的薄 adapter。

从 `phoenix-wing` 导入的公共 `Pnw*` 类型/组件、`pnw*` 函数、`usePnw*`
composable、`PNW_*` 常量及 `--pnw-*` CSS token 保持不变。只有选择性复制某个
fixture 实现时，才把其中 `PwwFixture* / pww* / PWW_FIXTURE_* / pww-*` 换成产品
自己的命名。

计划结构：

```text
examples/PwwWorkbenchWeb/
├── README.md
├── index.html
├── vite.config.ts
└── src/
    ├── App.vue
    ├── main.ts
    └── fixture/
        ├── PwwFixtureNavigation.ts
        ├── PwwFixtureNavigationLayout.ts
        ├── PwwFixtureNavigationLayoutView.vue
        ├── PwwFixtureViewBlockRegistry.ts
        ├── PwwFixtureViewDefinitions.ts
        ├── PwwFixtureViewPrimary.vue
        ├── PwwFixtureViewSecondary.vue
        ├── PwwFixtureViewBottom.vue
        ├── PwwFixtureWorkbenchController.ts
        ├── PwwFixtureDisplaySettingsExtras.vue
        ├── PwwFixtureWorkbenchStore.ts
        ├── PwwFixtureWorkbenchView.vue
        └── PwwFixtureWorkbench.css
```

## 运行

在仓库根执行：

```bash
pnpm example:workbench:typecheck
pnpm example:workbench:build
pnpm example:workbench:dev
```

开发服务器固定使用不常见的 `http://127.0.0.1:41789`，并启用 `strictPort`，不会静默占用其他端口。三个命令都会先构建根包，确保示例通过 `phoenix-wing` 公共 export 和 `dist/style.css` 消费，不使用源码 alias。

## 回归场景

1. Header 使用 `PnwPhoenixWingMark` 彩色品牌标志，同时显示顶层 Ribbon 大分组和已打开页面标签；点击导航会打开/激活内存 Tab，但不触发 Router；
2. Ribbon 最右侧的 `…` 与 Tree 底部设置图标打开 Wing 公共快捷菜单：四个预设均为单行 `PnwIcon + 文本`；点击“完整显示设置…”打开 Wing 公共约 420px 单列折叠对话框，集中设置导航呈现、主题、Ribbon 类别、合法图标尺寸、Title 与分组标签。fixture 通过 `display-settings-panel-extra` 追加 700px 模拟、自定义 CSS token 与 SVG 回归，不复制公共设置表单；Header 右侧 `KT` 仅演示 consumer 自定义用户区域；
3. Tree 首行可受控收起为 48px Activity Rail；Rail 只投影原树的末级节点，有图标时显示图标，无图标时显示标题首字，并继续激活相同末级 ID；
4. Tree 展开状态和 Rail 收起状态在切换后保持；
5. Ribbon 先选择“大 Ribbon / 紧凑工具条”，两边使用同一个 `PnwRibbonModeAppearance` 数据形状并分别保留尺寸与 Title；大 Ribbon 可选 `24/36px` 与分组标签，紧凑工具条可选 `16/24px` 且不显示分组标签；紧凑高度分别约为 `28/34px`，同尺寸打开或关闭 Title 高度不变；
6. Header 一级大分组只显示当前分组的 Ribbon 内容；紧凑位置优先显示同一节点的 `shortLabel`（工作 / 研发 / 协同 / 系统），完整标签仍用于提示和无障碍名称；模块区约容纳 8 个两字短标签，超过 `min(36vw, 360px)` 后横向滚动，不挤走页面标签；下方不重复竖排模块名，当前分组内模块仅以 `3px` 竖向句柄分隔；
7. 从“系统 / 工作台配置 / 导航布局”打开仓内第一方 fixture consumer 的布局管理 View：按当前大分组树折叠浏览小模块，用下拉整体移动；例如把包含 Open Issue 的“问题跟踪”移入“工作空间”，确认空的“协同管理”从 Ribbon/Tree 隐藏但仍是下拉目标。验证内置/自定义分组、全名/简称/顺序编辑、新建空组、删除空自定义组、内置分组恢复定义、恢复本模块和全部恢复默认；
8. 激活 Open Issue，确认无 Primary/Secondary/Bottom 和空 Footer；
9. 激活综合看板，确认默认只显示 Primary 与可调 Bottom：节点、模式、主题和状态摘要位于 Primary 下半部，不再为简单属性占用右侧宽度；Bottom 只与 Editor 对齐并只能拖动顶边横向句柄；
10. 激活模型目录，确认它声明了复杂 Secondary 检查器但默认隐藏；用 Footer 图标按需打开，再拖动其内侧竖向句柄；
11. 在 Bottom 的“问题 / 运行日志”受控 Tab 间切换；标签、计数、活动 ID 与内容生命周期由消费者持有，Wing 只提供 Tab 壳；
12. 逐个关闭 Header 页面标签，确认活动标签被删除时切换到相邻 View；全部关闭后旧 View 不再渲染，中心显示 Wing 默认空状态。消费者可通过 `empty` slot 替换内容；
13. 开启 `700px 窄屏`，检查 Header 页签、Tree/Ribbon 溢出和侧 Block 响应式折叠；
14. 切换白天、黑天、跟随系统与自定义 CSS token，并以 `16/24/36/48/64px` 尺寸列检查公共 SVG 清晰度；
15. 通过 fixture Pinia store 导出并 hydrate 仅含版本、全部大分组的同形轻量定义与模块归属/排序的可序列化偏好；内置/自定义从默认树推导，不序列化 Vue 图标/组件，也不在示例中绑定具体存储介质。

fixture View 在自己的 `setup` 中按需登记 Block。综合看板只登记 Primary 与 Bottom；模型目录额外登记 Secondary，但示例默认显隐状态仍关闭 Secondary。`PwwFixtureViewPrimary.vue`、`PwwFixtureViewSecondary.vue` 与 `PwwFixtureViewBottom.vue` 只是演示内容；`PnwWorkbenchShell` 只读取动态组件、props 和 Bottom tabs。切换 View 或 KeepAlive 停用/卸载时，`usePnwViewContribution` 会按 owner 释放旧登记，避免 App 维护固定面板或显示上一个页面的内容。

`PnwRibbon` 右侧 `…` 与 Tree 底部设置图标默认存在。快捷预设和 `PnwWorkbenchDisplaySettingsPanel` 都由 Wing 封装，并操作同一个受控 `PnwRibbonAppearance` / presentation / color scheme；consumer 只保存状态，不复制设置 UI。fixture 在 `display-settings-actions` 中追加“将当前显示状态写入日志”，由 controller 处理 action ID；在 `display-settings-panel-extra` 中追加独立 `PwwFixtureDisplaySettingsExtras`，证明消费者可把句柄方式、产品主题或测试工具放入同一对话框。两项都是源码 slot 示例，不提供最终用户编辑菜单定义的 UI。Header `header-actions` 留给 consumer 的用户、租户、显示或退出动作。宿主还可按模式覆盖 `--pnw-ribbon-icon-height`、`--pnw-ribbon-icon-title-height`、`--pnw-ribbon-large-height`，或用 `--pnw-ribbon-height` 统一固定高度。可序列化导航布局只包含版本、大分组轻量定义和模块归属，不包含整棵树中的图标/组件引用。示例不选择 `localStorage` 或后端 API，真实宿主可把该纯数据接到自己的持久化 adapter。

真实消费者入口可只引用 `PnwWorkbenchShell`；`nodes`、活动节点、展开状态、Ribbon 外观、`PnwWorkbenchLayoutState`、Bottom Tab 和页面 Tab 列表仍由宿主受控。最小装配保持在几十行以内：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { PnwWorkbenchShell, PNW_DEFAULT_WORKBENCH_LAYOUT_STATE } from "phoenix-wing";
import { PRODUCT_NAVIGATION_NODES } from "./ProductNavigationAdapter.js";

const pwwActiveNodeId = ref("");
const pwwLayoutState = ref(PNW_DEFAULT_WORKBENCH_LAYOUT_STATE);
</script>

<template>
  <PnwWorkbenchShell
    v-model:layout-state="pwwLayoutState"
    :nodes="PRODUCT_NAVIGATION_NODES"
    :active-node-id="pwwActiveNodeId"
    @activate="pwwActiveNodeId = $event"
  >
    <RouterView />
  </PnwWorkbenchShell>
</template>
```

Router、权限过滤、页面注册、dirty 关闭守卫和 Pinia/后端持久化仍留在消费者 adapter。若旧项目已有 `PnwRibbonTabDef[]`，可先用 `pnwNavigationFromRibbonTabs` 投影为同一导航树，产品权限、路由和图标注册继续留在原 adapter。

## 已记录但暂不固化的窄屏 Tree 问题

`700px` Tree 模式在 Activity Rail 已收起时，当前响应式规则仍把整个 Activity 容器放在 Editor 上方一行；图标列虽已变窄，容器高度仍占位，造成上方大块空白。该问题不是单纯的宽度 CSS 缺陷，而是窄屏 Tree 的布局语义尚未确认：候选方向是“常驻图标轨 + 临时目录抽屉”，或“目录/图标轨继续作为 Editor 左侧列并隐藏侧 Block”。W4 结合 Admin 和第二消费者决定后再固化；本轮不加入未经验证的 drawer/overlay 公共状态。
