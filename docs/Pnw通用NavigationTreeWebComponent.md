# Pnw 通用 Navigation Tree Web Component

状态：current

Owner：Phoenix Wing maintainers

适用版本：`phoenix-wing@0.7.1` / `@phoenix-wing/code-core@0.6.4` 本地候选

最后核验：2026-08-21

## 定位

`PnwNavigationTreeView` 是零 Vue、零产品 Host 的通用树形 Web Component。截图或 fixture
可以只有两层，但数据与 UI 均按递归树处理，消费者只需继续提供 `children`，不需要为第三层、
第四层编写新的 renderer。

公开入口保持为：

```ts
import {
  PNW_NAVIGATION_TREE_ACTION,
  pnwCodeDefineNavigationTree,
  type PnwNavigationTreeActionDetail,
} from "@phoenix-wing/code-core/ui";
import type {
  PnwNavigationTreeModel,
  PnwNavigationTreeNode,
} from "@phoenix-wing/code-core/ui/model";
```

内部物理目录不是消费 subpath。消费者不得直接导入 `src/ui/elements/*` 或
`src/ui/model/*`。

## 最小使用

```ts
pnwCodeDefineNavigationTree();

const tree = document.createElement("pnw-navigation-tree");
tree.colorScheme = "system";
tree.model = {
  ariaLabel: "工程目录",
  expandedNodeIds: ["catalog"],
  selectedNodeId: "missing",
  nodes: [
    {
      id: "catalog",
      label: "Catalog",
      iconKey: "catalog",
      children: [
        {
          id: "missing",
          label: "未找到 Catalog",
          description: "XYC*Frm / XYC*Catalog.m",
          iconKey: "info",
        },
      ],
    },
    { id: "settings", label: "配置", iconKey: "settings" },
  ],
};

tree.addEventListener(PNW_NAVIGATION_TREE_ACTION, (event) => {
  const action = (event as CustomEvent<PnwNavigationTreeActionDetail>).detail;
  // Host 更新 selectedNodeId / expandedNodeIds，或执行 activate。
});
```

组件采用受控模型：`select`、`toggle`、`activate` 事件只报告意图，不偷偷改写业务树。
含 `children` 的节点点击整行时按顺序报告 `select` 与一次 `toggle`；Host 根据
`toggle.expanded` 回写自己的 `expandedNodeIds`。整行单击是稳定、推荐的折叠手势。
同一 DOM 行实例收到标准双击序列时，组件会忽略 `detail > 1` 的第二次 `click`；
但 Host 若在第一次 toggle 后同步重建 Tree/行，浏览器可能把新节点上的第二次点击
重新计为 `detail=1`。Wing 不跨 Host 重建保存短时交互状态，因此不承诺这种场景的
双击去重；产品若必须支持双击，需要在 Host 生命周期内保留交互身份或自行跨重建
去重。叶子在稳定行实例上的双击仍报告一次 `activate`。
键盘焦点属于瞬时 UI 状态，由组件维护。

## 多层与键盘

- `children` 可递归任意层级；每行自动计算缩进、`aria-level`、`aria-posinset` 和
  `aria-setsize`；
- 组件自身使用 `overflow: auto`；Host 只需给它可用高度，窄宽与长列表不需要
  再套一层产品滚动容器，文本在行内省略而不撑宽 Primary；
- `ArrowUp` / `ArrowDown` 在可见且未禁用的行之间移动；
- `Home` / `End` 移到首尾；
- `ArrowRight` 展开或进入第一个子节点，`ArrowLeft` 折叠或回到父节点；
- `Space` 选择，`Enter` 激活；
- 空 ID 和重复 ID 会被拒绝，防止焦点、选择和事件身份歧义。

## VS Code 风格状态

初版遵循 VS Code 树的低干扰层级：

| 状态 | 浅色默认 | 深色默认 | 语义 |
| --- | --- | --- | --- |
| hover | `#e8e8e8` | `#2a2d2e` | 整行轻量底色 |
| selected | `#d4d4d4` | `#37373d` | 整行稳定选择底色 |
| focused | `#0078d4` | `#007fd4` | 整行 1px 内描边 |
| selected + focused | 选择底色 + 描边 | 选择底色 + 描边 | 不只依赖颜色表达焦点 |

组件优先读取 VS Code 的 `--vscode-list-*` / `--vscode-focusBorder`，其他 Host 可以覆盖：

```css
pnw-navigation-tree {
  --pnw-navigation-tree-bg: var(--app-surface);
  --pnw-navigation-tree-text: var(--app-text);
  --pnw-navigation-tree-muted: var(--app-muted);
  --pnw-navigation-tree-hover-bg: var(--app-hover);
  --pnw-navigation-tree-selected-bg: var(--app-selection);
  --pnw-navigation-tree-selected-text: var(--app-selection-text);
  --pnw-navigation-tree-focus: var(--app-focus);
  --pnw-navigation-tree-row-height: 28px;
  --pnw-navigation-tree-indent: 20px;
}
```

`colorScheme` / `color-scheme` 支持 `light`、`dark`、`system`；`system` 通过
`prefers-color-scheme` 解析。明暗两套默认值都可由语义 token 覆盖。

## 数据与图标安全

- `label`、`description` 始终通过 `textContent` 渲染；
- `iconKey` 只能取 `PNW_NAVIGATION_TREE_ICON_KEYS` 中的受控值；
- 内置 SVG 使用 `24×24`、`currentColor`、`1.75` stroke；
- 不接收任意 HTML、SVG 字符串、DOM node、Vue Component 或渲染回调；
- `hidden` 只影响可见投影，不改变原始数据；`disabled` 节点不参与键盘移动和动作。

## 候选边界

当前已具备 model、element、公开导出、单元/DOM/ARIA/主题测试、包构建和隔离 tarball
消费。真实扩展宿主已用本地 sibling Wing 完成数据映射、受控 `expandedNodeIds` 回写、临时
展开补丁删除与自动门禁回归。跨 Host 同步重建的双击去重限制仍按本文“最小使用”章节处理，
不作为整行单击契约的阻断。

本地候选不等于 Registry 已发布；`@phoenix-wing/code-core@0.6.4` 正式发布并完成 Registry
consumer 回归后，才能登记到只收录已发布能力的共享能力目录。
