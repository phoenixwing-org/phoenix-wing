# Pnw 工作台 Web · 侧目录外观可行性

状态：current（四种外观已实现，真实消费者验证中）

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.0（已发布）

最后核验：2026-07-29

## 1. 结论

在现有侧面目录树内增加 Cool Admin 风格的目录外观可行，但它应是 **Tree 呈现内部的外观轴**，不能成为第三份菜单数据，也不应把 Router、权限或后台菜单字段带入 Wing。

推荐保持三个相互独立的受控状态：

```ts
type PnwActivityBarPresentation = 'ribbon' | 'tree'

type PnwActivityTreeExpandedMode = 'outline' | 'admin-menu'
type PnwActivityTreeCollapsedMode = 'leaf-rail' | 'root-flyout'

interface PnwActivityTreeAppearance {
  expanded: PnwActivityTreeExpandedMode
  collapsed: PnwActivityTreeCollapsedMode
}
```

- `presentation` 决定导航在顶部还是左侧；
- `treeAppearance.expanded` 只决定左侧展开后的行高、层级和选中态；
- `treeAppearance.collapsed` 只决定目录收起后是“把所有叶子平铺成图标栏”，还是“一级菜单图标 + 子菜单浮层”；
- 两种外观继续消费同一份 `PnwNavigationNode[]`、active ID、expanded IDs、hidden/disabled/order；
- consumer 受控保存偏好，Wing 不选择 Pinia、localStorage 或后端数据库。

展开的 Admin 菜单与可选的 `root-flyout` 已进入 0.6.0 本地候选；`root-flyout` 仍需在真实消费者完成浮层、焦点、越界与触屏回归。现有 `leaf-rail` 继续作为默认并保持兼容。展开外观与收起外观可以任意组合，不绑定成一个“Admin 模式”。

## 2. 现状对照

| 能力 | Wing 当前 `outline` | Phoenix Admin / Cool Admin | 可共用边界 |
|---|---|---|---|
| 数据来源 | `PnwNavigationNode[]` | 后端菜单先转换成产品 Menu Tree | Wing 只接收宿主已经过滤的节点树 |
| 展开态 | 32px 紧凑树行、caret、层级缩进 | 约 50px 菜单行、图标 + 文本、整行 hover/active、子菜单 | 递归、active、expanded 和键盘移动可共用 |
| 收起态 | 把所有可激活叶子平铺成图标栏，继续保留为 `leaf-rail` | 一级菜单图标 + 子菜单浮层，作为可选 `root-flyout` | 两者并存，数据可共用，交互模型不能假装相同 |
| 搜索 | 无 | 产品菜单提供关键字搜索并自动展开 | 暂留 consumer View，不进入第一版公共外观 |
| 路由/权限 | 不持有 | 产品 Store 负责路由、权限、动态菜单 | 必须留在 consumer adapter |
| 主题 | Wing CSS tokens 支持 light/dark/system | 当前 Admin 左栏偏深色 | 新外观必须同时支持浅色与深色，不复制产品配色 |

Admin 的 `bmenu.tsx` 证明了这种导航的真实需求，也证明 Router、动态权限、搜索与菜单 Store 是产品语义。Wing 只能提炼呈现和交互，不能直接搬运 Cool Admin 的 Element Plus 菜单实现。

### 2.1 收起浮层的触发调研（2026-07-29）

Phoenix Admin / Cool Admin 当前没有自定义一级菜单浮层计时器。`src/modules/base/pages/main/components/bmenu.tsx` 在折叠垂直模式下直接使用 Element Plus `el-menu` / `el-sub-menu`，且没有覆盖 `show-timeout`、`hide-timeout`。因此真实行为继承 Element Plus 默认值：

- 鼠标进入一级分组后以 hover 打开，显示延时 `300ms`；
- 鼠标离开一级分组或浮层后，隐藏延时 `300ms`；
- 折叠垂直模式下，一级分组标题的 click handler 不负责切换浮层；叶子仍通过 click 激活；
- 鼠标从一级图标移入已经打开的浮层时，浮层内部以更短的保护延时维持打开，避免跨越图标与浮层间隙时闪退。

这与 [Element Plus Menu](https://element-plus.org/en-US/component/menu.html) 公布的 `show-timeout=300`、`hide-timeout=300` 一致。其他后台框架并不完全相同：[Ant Design Menu](https://ant.design/components/menu/) 默认也使用 hover，但 `subMenuOpenDelay=0s`、`subMenuCloseDelay=0.1s`，并允许改成 click。两者共同点是延时都在 `0–300ms` 范围，不使用 `2s` 级等待；两秒会明显破坏连续浏览多个模块的效率。

Wing `root-flyout` 的建议交互不是照搬任一依赖，而是采用桌面工程工具的混合规则：

1. 精细指针第一次 hover 一级分组，`250–300ms` 后打开，过滤无意路过；
2. 已有浮层打开时，移到另一个一级分组后以 `100–150ms` 切换，不要求再次 click，也不等待 `2s`；
3. 从图标移向对应浮层时，把 rail、间隙安全区和浮层视为同一 hover 区；完全离开后延时 `250–300ms` 关闭；
4. click、`Enter`、`Space` 始终立即打开；触屏只使用 click，不依赖 hover；
5. 叶子 click 后立即激活并关闭；`Escape` 关闭并把键盘焦点还给触发图标；点击外部关闭但不抢走新目标的焦点；
6. 键盘在已打开菜单间移动时应立即切换，不叠加指针延时。键盘与 `aria-haspopup` / `aria-expanded` 语义遵守 [WAI-ARIA Menu and Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)。

当前 Wing 0.6.0 本地候选已把上述时序收进 `PnwActivityTreeRail`：精细指针首开为 `280ms`、已有浮层时跨一级分组切换为 `120ms`，完全离开 Rail / 间隙 / 浮层后以 `280ms` 关闭；进入浮层会取消关闭，因此不需要产品侧计算安全走廊。鼠标和支持悬停的笔使用该路径，触摸仍只使用 click；click、`Enter`、`Space` 保持立即打开。跨一级分组切换会在原焦点位于旧浮层时把焦点转给新浮层首项；`Escape` 关闭并恢复触发项焦点，外部 click 关闭但不抢走新点击目标的焦点。

2026-07-29 fixture 人工验收确认：普通鼠标快速划过不会立刻弹出子菜单，有意停留后才打开，跨一级分组的延时仍能保持连续操作。当前数值先保持固定，不增加 consumer 延时配置；Admin 真实权限树、触屏设备和视口边缘仍是后续消费者门禁。

这些延时是 Wing 内部交互常量，不进入 `PnwActivityTreeAppearance`、Pinia 或后端偏好。纯函数单元测试固定首次打开、快速切换与触摸分流；真实 Admin 权限树仍需验证菜单密度、触屏和浏览器焦点，但 consumer 不再需要自己补 hover 计时器。

## 3. 两种 Tree 外观

### 3.1 `outline`

保持当前默认，适合 IDE、对象树和工具目录：

- 行高紧凑；
- caret 位于前方，所有层级连续展开；
- 收起时默认保持当前 Activity Bar 式叶子快捷栏，也允许独立选择分组浮层；
- 适合 Open Issue、Desk Tools 等工具型消费者。

### 3.2 `admin-menu`

面向后台管理和业务模块导航：

- 一级/分组行更高，图标与文本一行显示；
- 分组使用右侧 chevron，展开后子项按层级缩进；
- 叶子选中采用整行强调，父级在后代 active 时显示弱强调；
- 允许 badge 作为未来候选，但没有第二消费者前不写入公共节点契约；
- 展开态仍使用 `role="tree"` / `treeitem` 语义，不依赖 Element Plus；
- 必须由 CSS token 同时提供 light、dark、system 外观。

`admin-menu` 只描述展开态，不强制改变收起态。若用户另行选择 `root-flyout`，收起后遵循 Admin 菜单习惯：

- 顶层叶子点击后直接发出 `activate(id)`；
- 顶层分组只显示图标；无图标时使用 `shortLabel`，再回退到 `label` 首字；
- 点击或键盘确认分组后打开相邻子菜单浮层，不把全部后代平铺到 rail；
- active 后代使对应顶层图标保持 active；
- 浮层必须修正到 viewport 可见区域，复用 Wing 已有浮层边界函数，而不是由 consumer 计算位置。

当前版本以 click / Enter / Space 打开；桌面 hover 按 2.1 节的短延时混合规则作为下一阶段增强，触屏和键盘不依赖 hover。

## 4. 设置界面

完整“工作台显示设置”的“导航结构”建议改成三个独立控件：

```text
导航位置
[ 顶部 Ribbon ] [ 侧面目录 ]

目录展开外观
[ 紧凑大纲树 ] [ Admin 菜单 ]

目录收起外观
[ 把所有叶子平铺成图标栏 ] [ 一级菜单图标 + 子菜单浮层 ]
```

- 快速显示菜单仍只负责“顶部 Ribbon / 侧面目录”的快速切换；
- 选择“侧面目录”时保留用户上一次 `treeAppearance.expanded` 和 `treeAppearance.collapsed`，不强制改回默认；
- 两个详细目录外观只放完整设置，避免快速菜单再次膨胀；
- 两项外观偏好始终可以选择：当前是 Ribbon、目录展开或目录收起，都可预先配置下一次状态；
- 当前状态不适用某项时只显示“将在展开/收起时生效”的说明，不禁用、不隐藏，也不覆盖已保存值；
- consumer 可通过现有设置扩展 slot 追加产品项，不需要复制整个对话框。

如果未来布局编辑模式允许把 ActivityBar 拖到左侧，应只改变 `presentation`；它不应顺带修改 `treeAppearance`。

## 5. 封装边界

消费者只面对现有 `PnwActivityBar` 门面，不应直接组合四种渲染器：

```vue
<PnwActivityBar
  :nodes="navigationNodes"
  :presentation="presentation"
  :tree-appearance="treeAppearance"
  :tree-collapsed="treeCollapsed"
  :expanded-node-ids="expandedNodeIds"
  @update:tree-appearance="treeAppearance = $event"
/>
```

建议的 Wing 内部分层如下；内部子组件默认不从包入口导出：

- `PnwActivityBar`：根据顶部/侧面位置选择 Ribbon 或 Tree，透传单个受控外观对象；
- `PnwActivityTree`：唯一公共 Tree 门面，保持 activate、expanded、collapsed 与设置入口兼容；
- 内部 Expanded renderer：只处理 `outline / admin-menu` 的行布局；
- 内部 Rail renderer：只处理 `leaf-rail / root-flyout` 和子树浮层；
- 纯 TypeScript resolver：从同一导航树生成可见行、rail 入口、active ancestor 和浮层子树；
- `PnwWorkbenchDisplaySettingsPanel`：编辑同一个 `PnwActivityTreeAppearance`，一次发出完整新值。

默认值必须集中在 Wing 常量中，例如展开 `outline`、收起 `leaf-rail`。consumer 不复制默认对象、不判断节点层级、不计算浮层坐标，也不为四种组合准备四份模板。若内部 renderer 需要拆文件，文件名仍用 `Pnw*`，CSS 仍用 `pnw-`，但“内部拆文件”不等于“增加公共 API”。

## 6. 状态与事件边界

两种 Tree 外观必须保持以下等价性：

- 节点 ID、排序、hidden、disabled 和 active 不变；
- 展开态共用同一 `expandedNodeIds`；
- `activate(nodeId)` 只对可激活叶子发出；
- 分组点击只改变展开/浮层状态，不伪造业务路由；
- 切换外观不复制树、不重建 View、不关闭工作台标签；
- `treeCollapsed` 与 `treeAppearance.expanded/collapsed` 相互独立；
- `leaf-rail` 保持当前全部叶子平铺、点击直接激活的兼容行为；
- `root-flyout` 只改变收起后的入口组织，不改变叶子 ID、排序或激活事件。

Admin 后端菜单需要由 `PahNavigationAdapter` 一类 consumer adapter 转换为 `PnwNavigationNode[]`。权限过滤、动态路由、首页重定向、搜索、badge 计算和菜单持久化仍在 Admin；Wing 不增加 `path`、`permission`、`router`、`menuType` 等字段。

### Admin 权限适配

权限关系可以建立在现有通用 `hidden` 结果上，不需要把权限表达式加入导航协议：

```text
Admin 用户/角色/租户权限
        ↓ Pah adapter 计算
PnwNavigationNode.hidden / disabled
        ↓ Wing 可见树投影
Ribbon / Outline / Admin Menu / 两种收起栏
```

- Admin 在传入 Wing 前完成权限判断；权限场景优先由 adapter 直接过滤无权节点，Wing 不接触权限 code；
- `hidden` 是另一条等价的受控可见性路径，适合运行时开关、feature flag、租户能力或保持输入结构时使用；它同样不是权限表达式；
- 无权看到或 `hidden` 的节点都不得进入 DOM、浮层、搜索结果或无障碍树；前端过滤只控制呈现，后端 API 仍须独立鉴权；
- `disabled` 表示“可见但当前不能执行”，不能拿来代替权限隐藏；
- 同一节点在有权/无权状态间切换时 ID 保持不变，四种目录组合使用同一结果；
- 当前 active 节点被权限更新隐藏后，Wing 可报告“active 不再可见”，但新路由或回退页由 Admin/consumer 决定。

统一实现使用 `pnwNormalizeNavigationVisibility` 自底向上派生一次有效 `hidden`，再由现有可见树投影消费。约定如下：

- 可激活叶子省略 `children`；
- 目录节点保留 `children`，包括暂时为空的 `children: []`；
- resolver 对“adapter 已过滤”和“节点带 hidden”两条输入路径给出相同投影：父目录为自身 `hidden`，或所有子节点均为有效 `hidden` 时派生 `hidden: true`；同时保持输入只读、未变化节点引用、同级 `order` 和稳定顺序；
- Ribbon、两种展开目录和两种收起栏只消费 resolver 的同一结果，禁止各写一套权限过滤。

纯 TypeScript 单元测试覆盖隐藏单个叶子、隐藏整棵子树、权限变化后空一级目录消失、输入不被修改、第二次归一化保持引用、排序与原节点引用不变。叶子必须省略 `children`；`children: []` 明确表示一个当前为空、因此应隐藏的目录。

## 7. 实现路线

1. **W5-T0：** fixture 只读预览两种展开外观与两种收起外观的四种组合，确认同树、同 active、同 expanded；不导出新类型。
2. **W5-T1：** 先审计消费者的叶子 `children` 写法，提炼递归可见树 resolver；再把 Tree 行渲染与键盘逻辑拆成共享模型，增加受控 `admin-menu` 展开态及 light/dark/700px 回归。
3. **W5-T2：** 在完整设置面板增加始终可选的“展开外观 / 收起外观”，验证当前状态不适用时仍能预设且不覆盖偏好。
4. **W5-T3：** 保持 `leaf-rail` 默认与兼容，实现可选 `root-flyout`，补 click、键盘、焦点恢复、越界修正与触摸 click；已按 2.1 节落地 `280ms` 首开、`120ms` 跨一级分组切换及 `280ms` 安全区关闭，不开放产品级延时配置。剩余工作是 Admin 真实权限树与触屏设备回归。
5. **W5-T4：** Phoenix Admin 以 adapter 验证动态菜单；再由 Open Issue、BOM Studio 或另一真实 Web 消费者验证后，决定是否稳定导出单一 `PnwActivityTreeAppearance` 对象。
6. **后续移动端：** 手机优先级低于桌面、平板与半屏；参考 Cool Admin 的真实触摸菜单后，再验证安全区、软键盘和小屏手势。当前窄容器直接使用 Ribbon，不给 Tree 增加移动 drawer 状态。

## 8. 退出门禁

- Ribbon、Outline、Admin Menu 三种画面只消费一份导航树；
- 外观切换不改变 active、expanded、View tabs、Router 或可见节点集合；
- Outline / Admin Menu 可分别与 Leaf Rail / Group Flyout 任意组合；
- 两种展开态与两种收起态均可用键盘完成导航，浮层关闭后焦点回到触发项；
- 浮层在窗口边缘、缩放和窄屏下保持可见；
- Workbench 容器不超过 `840px` 时由壳层使用同树 Ribbon，不实例化 Tree / Rail，因此 Tree 外观无需再承担移动端 drawer 或横向整行布局；
- 无图标节点依次回退 `shortLabel`、首字和默认标记；
- light/dark/system 以及 consumer CSS token 覆盖通过视觉回归；
- 不依赖 Element Plus 菜单、不引入 Admin Store/Router/权限模型；
- 权限只映射为通用 hidden/disabled，空目录不进入任何一种呈现；
- 现有 Leaf Rail 行为保持兼容，不因新增选项改变；
- consumer 只通过 `PnwActivityBar` 和一个受控外观对象使用能力，不复制内部 renderer 或浮层逻辑；
- 至少两个真实 Web 消费者证明共同语义后，才把候选外观对象标为稳定公共 API。
