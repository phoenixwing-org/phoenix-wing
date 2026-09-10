# KtCodegenTable 布局与折叠契约

状态：current

Owner：@phoenix-wing/kt-codegen maintainers

适用版本：0.4.x

最后核验：2026-07-18

## 目标与责任边界

`KtCodegenTable` 同时支持“组件拥有可用高度”和“页面拥有唯一纵向滚动”两种宿主，但不感知 VS Code、Vue、路由或 Host session。表格数据仍只由 `setData()`/`getData()` 与既有 change/dirty 事件交换；布局与折叠是本地展示状态，不进入 `KtCodegenTableData`，也不改变 `documentRevision`。

```text
Host / Page shell
├─ layout、collapsible、collapsed（展示状态）
└─ KtCodegenTable
   ├─ Header
   │  ├─ 普通标题或原生 disclosure button
   │  └─ 既有九个表格工具（始终保留）
   ├─ table shell（收起时 hidden）
   └─ statusbar（收起时 hidden）
```

## 公共 API

| 名称 | 类型 | 默认值 | 契约 |
|---|---|---|---|
| `layout` / `layout` attribute | `"contained" \| "page"` | `"contained"` | property 与 attribute 双向反射；未知运行时值归一化为 `contained` |
| `collapsible` / `collapsible` attribute | `boolean` | `false` | 存在时把 Header 非工具区切换为原生 disclosure button |
| `collapsed` / `collapsed` attribute | `boolean` | `false` | 保留宿主折叠偏好；只有 `collapsible && collapsed` 才真正隐藏内容 |
| `kt-codegen-table-collapse-change` | `CustomEvent<{ collapsed: boolean }>` | — | 只由用户点击发出，`bubbles: true`、`composed: true` |

宿主可以按 property 或 attribute 使用同一契约：

```ts
import type { KtCodegenTable } from "@phoenix-wing/kt-codegen/table";

const table = document.querySelector<KtCodegenTable>("kt-codegen-table")!;
table.layout = "page";
table.collapsible = true;
table.collapsed = false;
```

```html
<kt-codegen-table layout="page" collapsible></kt-codegen-table>
```

程序执行 `table.collapsed = true`、`setAttribute("collapsed", "")` 或恢复持久化偏好时必须保持静默：不发 `kt-codegen-table-collapse-change`，也不发 `kt-codegen-table-change` / `kt-codegen-table-dirty-change`。只有 disclosure button 的用户动作发折叠事件，宿主若需持久化 UI 偏好应监听这一事件。

## 两种布局

### contained（兼容默认）

- Host 提供高度；组件继续使用 `height: 100%` 与兼容的 `min-height`。
- table shell 保持 `overflow: auto`，长行和长表都在组件内部滚动。
- 既有 sticky 表头、sticky 行号、状态栏与工具栏行为不变。

### page（页面自然高度）

- Host 高度为 `auto`，table shell 按表头和所有数据行自然撑高。
- table shell 使用 `overflow-x: auto; overflow-y: hidden`：宽表只产生横向滚动，纵向由外层 Page shell 统一承担。
- 空表提示从绝对定位改为文档流内容，表头、提示和状态栏共同决定自然高度，不被裁切。
- Page shell 不应再给组件设置固定 `vh`、内部纵向 `overflow` 或穿透 Shadow DOM 修改高度。

## 折叠、工具与无障碍

- 未设置 `collapsible` 时显示普通“参数表”标题，不暴露无动作的箭头或 button。
- 设置 `collapsible` 后，Header 非工具区是原生 `<button type="button">`；九个既有工具按钮仍是相邻兄弟节点，收起后可继续操作。
- disclosure button 维护 `aria-expanded`、`aria-controls`、焦点框和“展开参数表”/“收起参数表”动态标签。
- 收起只设置 table shell 与 statusbar 的 `hidden`，不销毁表格、选择、剪贴板或 dirty 状态。
- 若程序或用户收起时焦点位于将隐藏的 shell/statusbar，焦点先移到 disclosure button，避免焦点遗留在不可见控件。

## 验证

### 2026-09-10 自动代码 Block Header 对齐

`collapsible` 模式下，参数表与预检结果共用 `KtCodegenBlockHeader.ts` 的 Header 样式，按编译工具 Block 的基线统一旋转箭头、13px/600 标题、3px/7px 内边距和 4px 外圆角。标题及非工具空白区域均可折叠；原生 disclosure button 支持 Enter/空格，右侧工具、筛选、路径 checkbox 保持独立。参数表数据/选择及预检筛选/分栏状态不随折叠清空。

此处复用的是 Header 展示基线，不是迁移所有 View 到新的折叠组件；未启用 `collapsible` 的旧消费者及 Body 的 contained/page、列表/详情滚动责任不变。纯 UI 修订不升级 `codegen-rules-version 1.0.0`。

自动门禁：

```bash
pnpm --filter @phoenix-wing/kt-codegen test
pnpm --filter @phoenix-wing/kt-codegen typecheck
pnpm --filter @phoenix-wing/kt-codegen build
pnpm docs:check
```

`table-view-model.test.ts` 冻结归一化与 disclosure 纯投影；`table-dom.test.ts` 实例化组件并验证点击、属性反射、事件静默、工具保留和焦点转移；`table-style.test.ts` 冻结 contained/page 与空表样式责任。

真实浏览器夹具在构建后使用：

```text
packages/kt-codegen/test-fixtures/table-runtime.html?layout=page&collapsible
packages/kt-codegen/test-fixtures/table-runtime.html?layout=page&collapsible&empty
packages/kt-codegen/test-fixtures/table-runtime.html?layout=page&collapsible&collapsed
```

夹具公开 `window.__wingTableMetrics()`，用于核对 page 模式 shell 的 `clientHeight === scrollHeight`、横向溢出、页面总高、工具数量、动态 ARIA 与用户事件计数。真实 VS Code 主题、Registry 消费升级和产品 Host 接线属于后续消费者验收；本契约本身不修改包版本、发布标签或 Registry 状态。

2026-07-18 使用构建后的真实 `dist/table/index.js` 在 Chrome 完成以下尺寸点检，控制台无错误：

| 场景 | Page client/scroll | Host client/scroll | Shell 高 client/scroll | Shell 宽 client/scroll | computed overflow x/y |
|---|---:|---:|---:|---:|---|
| page，1000×650，24 行 | 650 / 963 | 917 / 917 | 850 / 850 | 720 / 1872 | `auto` / `hidden` |
| page，560×420，空表 | 420 / 420 | 201 / 201 | 134 / 134 | 528 / 1872 | `auto` / `hidden` |
| contained，360×260，24 行 | — | 260 / 260 | 193 / 850 | 360 / 1872 | `auto` / `auto` |

空表提示实际高度约 68px，完整位于 shell 内。page 长表点击“收起参数表”后 Host 高度变为 38px，shell/statusbar 均 hidden，九个工具按钮仍保留，`aria-expanded` 变为 `false`、标签变为“展开参数表”，夹具只收到一次 `{ collapsed: true }` 用户事件。
