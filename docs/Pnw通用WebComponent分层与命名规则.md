# Pnw 通用 Web Component 分层与命名规则

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.7.x

最后核验：2026-08-20

## 目的与本次边界

本文冻结 Phoenix Wing 中通用 Web Component 的代码分层、公开入口、命名和输入安全边界，
避免把 Vue 工作台组件、浏览器 DOM renderer 与纯状态模型混在同一层。

本次只形成规则和后续计划：

- 不实现导航树组件；
- 不移动现有文件；
- 不新增、删除或修改 npm export；
- 不改变现有三个 Web Component 的行为；
- 不登记尚未实现的 capability。

文中的导航树名称是后续实现必须遵守的预留名称，不代表当前版本已经导出这些 API。

## 已确认的三层边界

### 1. Vue 工作台层

仓库根 `src/layout/**/*.vue` 属于 Vue 工作台专用层。它可以使用 Vue、Pinia、工作台
layout、slot、Teleport 和 Host adapter，但不能被描述为零框架 Web Component 入口。

如果未来需要为 Web Component 提供 Vue 包装层，包装层应留在根 Vue 包、独立 Vue adapter
或消费者中；Vue SFC、Vue Component、Pinia store 和 composable 不得进入
`@phoenix-wing/code-core`。

### 2. Web Component element 层

`@phoenix-wing/code-core/ui` 是不依赖 Vue、Element Plus、VS Code 或产品 Host 的浏览器
Web Component 公共入口。element 层可以依赖标准 DOM 和 Custom Elements API，负责：

- DOM renderer 与 Shadow DOM 样式；
- ARIA、焦点和键盘交互；
- 将用户动作投影为类型明确的 DOM event；
- 把受控 model 渲染为文本、行、选择态和安全图标；
- Host-neutral 的属性、property 与生命周期接线。

当前该入口已经公开：

- `PnwCodeReorderMembersPanel`；
- `PnwCodeUuidResultsPanel`；
- `PnwCodeRenameResultsPanel`。

### 3. model / projection 层

`@phoenix-wing/code-core/ui/model` 是零 DOM、零框架的纯状态和投影入口。它负责：

- 可序列化 model、node、selection 和 capabilities 类型；
- 排序、过滤、展开、选择与可见行投影；
- reducer、selector 和状态归一化；
- 可由 Node、Web、VS Code Webview 或其他 renderer 共同验证的纯函数。

model 层不得引用 `HTMLElement`、`customElements`、Vue、浏览器全局对象或产品 Host。

## 建议的物理目录

后续新增通用 UI 时采用以下物理目录；它们是内部真源组织方式，不是新的消费 subpath：

```text
packages/code-core/src/ui/
├── index.ts                    # 保持 @phoenix-wing/code-core/ui
├── model.ts                    # 保持 @phoenix-wing/code-core/ui/model
├── elements/                   # Web Component class、tag、DOM/ARIA/事件
└── model/                      # 纯 model、projection、reducer、selector
```

公开导入必须继续保持：

```ts
import { PnwCodeUuidResultsPanel } from "@phoenix-wing/code-core/ui";
import type { PnwCodeUuidResultsPanelModel } from "@phoenix-wing/code-core/ui/model";
```

消费者不得导入 `src/ui/elements/*`、`src/ui/model/*` 或猜测未来的
`@phoenix-wing/code-core/ui/elements` subpath。`index.ts` 和 `model.ts` 是稳定门面。

## 命名规则

### 通用规则

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| Web Component class | `Pnw` + PascalCase | `PnwCodeUuidResultsPanel` |
| Custom Element tag | `pnw-` + kebab-case | `<pnw-code-uuid-results-panel>` |
| model / node / event detail 类型 | `Pnw` + PascalCase | `PnwNavigationTreeNode` |
| define / project / reduce 函数 | `pnw` + camelCase | `pnwCodeDefineUuidResultsPanel` |
| tag / event 常量 | `PNW_` + UPPER_SNAKE | `PNW_CODE_UUID_RESULTS_PANEL_TAG` |
| Shadow DOM 内部 class / CSS token | `pnw-` / `--pnw-` | `.pnw-tree-row`、`--pnw-tree-indent` |

### 导航树预留名称

未来通用导航树若满足真实消费者和实现门禁，统一使用：

- Web Component class：`PnwNavigationTreeView`；
- Custom Element tag：`<pnw-navigation-tree>`；
- 数据模型：`PnwNavigationTreeModel`；
- 节点类型：`PnwNavigationTreeNode`。

`View` 表示 DOM 呈现类，`Model` / `Node` 表示可序列化数据；不得用同一个名称同时表示
Vue 组件、Custom Element class 和数据模型。根 Vue 工作台已有的导航树投影不因此改名，
未来 Vue wrapper 也不得进入 `code-core`。

## 安全输入与图标边界

通用 Web Component 的 model 只能携带数据和受控 key：

- 文本必须按文本渲染，不把消费者字符串写入 `innerHTML`；
- 图标字段只能使用公共契约列出的受控 icon key；renderer 将 key 映射到内置安全几何；
- 未知 icon key 必须使用可见 fallback 或明确拒绝，不能静默执行消费者内容；
- 公共 API 不接收任意 HTML、SVG 字符串、Vue Component、DOM node 或渲染函数；
- action 通过类型明确、可冒泡且 `composed` 的事件回传，不在 model 中嵌入回调和 Host 对象。

若未来需要扩展图标，先扩充受控 key catalog 和测试；不得以 `innerHTML`、任意 SVG path
或产品 icon component 作为快捷扩展口。

## 现有组件的后续整理

当前三个组件和状态文件仍位于 `packages/code-core/src/ui/` 根目录，这是有效且已发布的
内部布局。未来可另立一个纯机械任务，把 element 移入 `elements/`、model 移入 `model/`，
但必须同时满足：

1. `@phoenix-wing/code-core/ui` 与 `@phoenix-wing/code-core/ui/model` 导入完全不变；
2. class、tag、事件、DOM、焦点和样式行为不变；
3. `.d.ts`、tarball、clean consumer 和现有双消费者测试通过；
4. 只做无功能搬迁，不混入导航树、重命名、样式重写或新 API。

本次文档任务不执行该搬迁。

## 后续实施顺序

### WC0：规则冻结（本次）

- [x] 明确 Vue / element / model 三层；
- [x] 保持两个公开导入入口；
- [x] 冻结导航树名称与图标安全边界；
- [x] 明确现有组件搬迁必须是独立无功能任务。

### WC1：可选的内部目录整理

- [ ] 仅在维护收益明确时机械迁移现有三个组件；
- [ ] 保持 re-export、产物和行为完全兼容；
- [ ] 用包测试、tarball 与 clean consumer 证明没有入口漂移。

### WC2：导航树候选

- [ ] 取得真实消费者的数据、键盘、图标和大数据量约束；
- [ ] 先实现 `PnwNavigationTreeModel` / `PnwNavigationTreeNode` 及纯投影；
- [ ] 再实现 `PnwNavigationTreeView` 与 `<pnw-navigation-tree>`；
- [ ] 验证受控 icon key、ARIA tree pattern、焦点、折叠和安全文本；
- [ ] 在实现、导出、测试和制品同时存在前，不登记为已提供能力。

## 点检清单

- [ ] 新 element 是否只从 `@phoenix-wing/code-core/ui` 暴露？
- [ ] 新 model 是否只从 `@phoenix-wing/code-core/ui/model` 暴露？
- [ ] model 是否完全不依赖 DOM、Vue、Node 和产品 Host？
- [ ] Web Component 是否未接收任意 HTML/SVG/组件？
- [ ] class、tag、类型、函数、常量和 CSS token 是否遵循 Pnw 前缀？
- [ ] 是否避免把未来目录路径误当公开 subpath？
- [ ] 是否保持现有导入和 tarball 兼容？
- [ ] 候选能力是否在真实实现前没有写入共享能力目录？
