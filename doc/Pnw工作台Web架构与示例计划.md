# Pnw 工作台 Web 架构与示例计划

状态：in-progress

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.1 候选（兼容 0.6.0）

最后核验：2026-07-31

## 1. 目的与边界

本计划定义 Phoenix 的 Web 工作台公共呈现层，供 Phoenix Admin Host、DeskTools、Open Issue 与 BOM Studio 复用。Function 正在向 Phoenix Admin 迁移，不作为独立 Web 示例或独立消费者验收对象；其后续页面通过 Admin Host 消费此架构。首要目标是让一份导航树可以在 Ribbon 与侧面大目录树之间切换，让当前 View 按需贡献 Primary/Secondary 与专用 Bottom，并由 Shell 实例提供跨 View 稳定的应用默认 Bottom。

本计划不迁移任何业务页面、路由、菜单权限、用户偏好存储或领域数据；这些仍是各产品宿主的责任。

VS Code 插件继续使用既有 Webview/Custom Element 和固定样式，不强制消费 Vue 组件。它未来最多复用纯 TypeScript 契约，不复用本计划的 Vue 渲染层。

## 2. 已确认决策

1. Web 呈现层采用 Wing Vue 组件，不先注册浏览器原生 Custom Element。
2. `PnwActivityBar` 维护一份受控导航树，内部切换 `ribbon` 与 `tree` 两种呈现；两种模式不得维护两份菜单配置。
3. `PnwRibbon` 负责 Ribbon 的尺寸、分组标签、溢出、键盘导航、tooltip 与无障碍语义；产品只提供数据、路由动作与外观偏好。
4. `PnwPrimaryBlock`、`PnwSecondaryBlock` 由当前 View 显式贡献；认证工作台由
   Shell 实例提供应用级默认 `PnwBottomPanel`，当前 View 可贡献专用 Bottom 覆盖，
   缺失时自动回退。没有 Primary/Secondary 内容时不得留下空白区域。
5. Bottom Panel 采用 VS Code 式 Editor 底部布局：左右边界与 Editor 对齐，不横跨 ActivityBar、Primary Block 或 Secondary Block。
6. 首个示例放在 Wing 仓内，不新建 `phoenix-架构-示例` 独立 Git 仓。

### 2.1 W3 视觉与交互增补需求（2026-07-28）

以下需求由运行中 fixture 的视觉评审补充，仍受 W4 双消费者验证边界约束：

1. **Phoenix 品牌标志归 Wing。** 以 Admin Host 已使用的 `pah-phoenixwing-mark.svg` 几何和渐变为来源，在 Wing 内维护 `PnwPhoenixWingMark`；示例和未来消费者不得跨仓引用 `/pah-phoenixwing-mark.svg`。SVG 是单一矢量真源，16px 到大尺寸均不得改用低分辨率位图。
2. **建立常用图标资源清单。** 先盘点 Admin Host、BOM Studio、Open Issue 与 Desk Tools 的真实用法；只有至少两个 Web 消费者共有的导航/壳层动作才进入 `Pnw` 公共图标资源。产品 Logo、文件类型、CAA/Widget/FreeCAD 等领域图标继续由产品持有，不因数量多而整批迁入。
3. **常用图标必须适配小/大两档。** 公共 SVG 使用稳定 `viewBox`、`currentColor` 和非缩放描边或等效矢量路径；至少回归 `16/24/36px`，需要品牌展示时额外检查 `48/64px`。图标组件不得依赖产品 iconfont、绝对静态路径或 Router。
4. **Tree 可受控收起为 Activity Rail。** 完整工具树与 Primary 并排过宽时，Tree 首行提供收起动作；收起后默认成为单列图标，没有图标的末级节点显示标题首字。Rail 继续使用同一导航树的末级 ID、禁用、隐藏、排序和激活语义，不猜测顶层模块的默认路由。
5. **工作台显示设置始终可达，快捷菜单与完整对话框均由 Wing 封装。** Ribbon 最右侧保留 Wing 内置的一个 `…` 快捷入口；Tree 模式在目录底部保留设置图标，它不属于 `PnwNavigationNode`，不会产生额外菜单数据、路由或权限语义。快捷菜单以单行 `PnwIcon + 文本` 提供“侧面目录树 / 紧凑图标 / 紧凑图标 + Title / 大 Ribbon”四个一键预设，不使用两行卡片。末尾“完整显示设置…”打开 Wing 公共、可移动、约 420px 的单列折叠对话框，集中设置导航呈现、light/dark/system、Ribbon 类别、合法图标尺寸、Title 与分组标签。两者操作同一份受控状态，consumer 不复制设置 View、不增加 Router。导航布局仍是系统分组中的 consumer View；Header 右侧只保留 `header-actions`。

### 2.2 工作台显示快捷菜单与完整对话框定稿（2026-07-28）

快捷菜单文字与排布如下；四个预设图标来自 `PnwIcon` 公共矢量资源，内容保持单行：

```text
┌ 工作台显示设置                 ×
│ [目录树图标] 侧面目录树
│ [工具条图标] 紧凑图标
│ [标题图标]   紧凑图标 + Title
│ [Ribbon图标] 大 Ribbon
├────────────────────────────────
│ [设置图标]   完整显示设置…
├────────────────────────────────
│ [consumer 追加动作 slot]
└────────────────────────────────
```

“完整显示设置…”直接打开公共 `PnwWorkbenchDisplaySettingsPanel`，不再使用二级菜单或让 consumer 重写对话框：

```text
┌ 工作台显示设置                         ×
│ 拖动这里可边看边调
├────────────────────────────────────────
│ 导航结构   顶部 Ribbon / 侧面目录树
│ 颜色主题   跟随系统 / 白天 / 黑天
│ Ribbon     大 Ribbon / 紧凑工具条
│            合法图标尺寸 / Title / 分组标签
│
│ [consumer 自定义界面 slot]
├────────────────────────────────────────
│ 状态由宿主受控；Wing 不选择持久化介质   完成
└────────────────────────────────────────
```

菜单和完整对话框均不提供“恢复默认”：默认值、偏好生命周期与持久化属于 consumer。`display-settings-actions` 作用域 slot 只用于开发者在快捷菜单追加少量按钮；slot 获得 `emitAction(actionId)`，信号按 `PnwWorkbenchDisplaySettings → PnwRibbon/PnwActivityTree → PnwActivityBar → PnwWorkbenchShell` 原样转发，最终由宿主监听 `display-settings-action`。Wing 不注册 action ID、不解释 payload、不调用 Router 或业务 API。

`display-settings-panel-extra` slot 用于把消费者自己的 Vue 界面追加到公共完整对话框，例如句柄方式、产品主题、700px fixture 模拟或 SVG 回归。扩展组件直接绑定 consumer Pinia；Wing 只提供容器，不读取字段、不持久化。fixture 分别演示“将当前显示状态写入日志”的快捷动作和 `PwwFixtureDisplaySettingsExtras` 对话框扩展；这不是让最终用户在 UI 内编辑菜单定义。

```vue
<PnwWorkbenchShell
  @display-settings-action="handleDisplaySettingsAction"
>
  <template #display-settings-actions="{ emitAction }">
    <button type="button" @click="emitAction('fixture.log-display-state')">
      将当前显示状态写入日志
    </button>
  </template>
  <template #display-settings-panel-extra>
    <ProductDisplaySettingsExtras />
  </template>
</PnwWorkbenchShell>
```
6. **恢复位置必须可见。** Wing 提供纯 TypeScript 位置修正函数；面板打开、拖动、内容尺寸变化和 viewport resize 时，将越界位置修正回可见范围。面板能放入时完整可见，面板大于视口时优先保留左上标题栏；负值、非有限值和视口缩小必须有单元测试。
7. **视觉回归覆盖亮/暗和窄屏。** 浏览器检查 Phoenix 标志、常用图标、Activity Rail 和浮动设置面板在 light/dark/custom token、桌面与 700px 窄屏下的尺寸、对比度、裁切、遮挡与可操作性。
8. **Ribbon 外观先分大类再配置，但复用同形数据。** 高层 `PnwRibbonAppearance` 改为 `ribbon`（大 Ribbon）与 `compact`（紧凑工具条）两类，两边都使用同一个 `PnwRibbonModeAppearance`，字段统一为图标尺寸、Title 和分组标签，切换大类不丢失另一类的设置。使用时才区分规则：大 Ribbon 允许 `24/36px` 并使用全部开关；紧凑工具条允许 `16/24px`，只使用尺寸与 Title，渲染时忽略分组标签。紧凑高度只跟随图标尺寸，16px / 24px 分别约为 28px / 34px；Title 横向显示、单行省略且不得撑高工具条。低层 `PnwRibbonShell`、`PnwRibbonGroup`、`PnwRibbonToolButton` 的现有入口与旧显示能力继续兼容。
9. **上方大分组筛选下方内容。** Header 的一级大分组标签来自导航树第一层；激活其中一个后，下方 Ribbon 只投影该分组的模块和工具，不得同时铺开其他一级分组。原竖排模块名删除，当前大分组内模块之间只保留约 `3px` 的非交互分隔句柄，避免与上方标签重复表达。
10. **用户布局仍是宿主受控状态。** 目标场景包括把包含 `Open Issue` 的一级小模块“问题跟踪”从“协同管理”整体移入“工作空间”，并允许恢复默认布局。Wing 继续只消费当前 `PnwNavigationNode` 树；宿主持有不可变默认树与用户当前树，负责移动、恢复和持久化，节点移动前后保持 ID、可见性、选中状态与路由语义不变。fixture 可演示该流程，但在至少两个真实消费者确认跨组权限、空组处理和配置合并规则前，不增加公共拖拽/偏好协议。
11. **Header 大分组为紧凑位置提供短标签。** `PnwNavigationNode.shortLabel` 是可选呈现文案，例如“工作空间 / 研发工具 / 协同管理”在 Header 中显示为“工作 / 研发 / 协同”；完整 `label` 继续用于 Tree、tooltip 和无障碍名称。模块区按最多约 8 个两字短标签完整显示设计，并封顶在 `min(36vw, 360px)`；超过该容量或文案更长时横向滚动，不再挤占页面标签。顺序仍由同一导航树的 `order` 与稳定输入顺序决定，Wing 不维护第二份排序状态。
12. **公共完整设置对话框使用窄单列检查器。** Wing 将 `PnwWorkbenchDisplaySettingsPanel` 控制在约 `420px`，标题栏可拖动、内容独立滚动、底部动作保持可见；导航与 Ribbon 两个高频区块默认展开，主题折叠。fixture 的窄屏、CSS token 与 SVG 回归通过扩展 slot 追加，不复制公共表单。
13. **分组关系进入独立 View。** 导航大分组、小模块归属、默认布局对照与恢复属于信息架构编辑，不放入即时外观浮动面板。仓内第一方 fixture consumer 在同一导航树的“系统 / 工作台配置 / 导航布局”节点打开 `PwwFixtureNavigationLayoutView`，以多列表格显示默认组、当前组和全部可移动小模块，并演示整体移动“问题跟踪”与恢复默认。该 View 属于 consumer 宿主，不因此新增 Wing 公共拖拽、权限或持久化协议。
14. **大分组定义可编辑但稳定身份不可变。** consumer 可编辑一级大分组全名、Header 简称与显示顺序；稳定 `id`、内置/自定义来源和模块归属不随编辑改变。内置分组支持“恢复定义”，只恢复默认名称、简称与顺序，不连带恢复已经移动的小模块；模块仍使用“恢复本模块”或“全部恢复默认”。
15. **窄模式是框架容器能力。** `PnwWorkbenchLayout` 观察自身容器而不是 UA 或整个窗口；宽度不超过 `840px` 时，当前有效导航统一为顶部 Ribbon，Header 内的 View 标签临时按 `after-navigation` 移到 Ribbon 后，Primary / Editor / Secondary / Bottom / Footer 按当前 contribution 进入同一个纵向内容滚动流。显式 `after-navigation` 标签位于 Primary 前，显式 `editor-bottom` 标签位于 Bottom 与 Footer 之间，其他位置不被重写。`presentation`、`tabBarPlacement` 与面板宽高仍是 consumer 可持久化偏好，响应式覆盖不发出更新、不改 Pinia，宽屏恢复后 Tree、Header 标签位置与四区尺寸自动还原。窄屏快捷菜单禁用 Tree 预设，完整设置锁定 Tree / Ribbon 大分类并显示实际 Ribbon，避免可点击却没有即时布局反馈；Ribbon 外观、主题及宽屏 Tree 外观预设仍可调整。Header 一级大分组只在有效 Ribbon 呈现时存在，宽屏 Tree 不重复显示。

首批常用图标的确切名称、路径和消费者证据在完成仓库盘点后记录；在盘点完成前不预建大而全的图标包，也不复制来源/许可不清晰的 SVG。

### 2.3 多项目图标重复盘点与首批收口

2026-07-28 对四个目标 Web 消费者做只读盘点，确认以下壳层语义已经重复实现：

| 语义 | Admin Host | BOM Studio | Open Issue | Desk Tools | Wing 收口 |
|---|---|---|---|---|---|
| Phoenix 品牌 | 新 `pah-phoenixwing-mark.svg` | 文本品牌 | CSS 渐变字母 `P` | 旧 `phoenix.svg` / 位图应用图标 | `PnwPhoenixWingMark`；保留彩色矢量真源 |
| 设置 | Element Plus `Setting` + `set.svg` | `Setting` | `Setting` | `Setting` | `PnwIcon name="settings"` |
| 折叠/展开 | `ArrowRightBold`、`fold.svg` / `expand.svg` | `Expand` / `Fold`、`ArrowRight` | `ArrowUpBold` / `ArrowDownBold` | `ArrowUpBold` / `ArrowDownBold` | `chevron-*`；具体方向由组件状态决定 |
| 左/下/右面板 | 产品内设置项 | 左侧面板折叠 | Ribbon 折叠 | 独立 `WorkbenchPanelToggleIcon.vue` | `panel-left` / `panel-bottom` / `panel-right`，Wing Footer 先自用 |
| 关闭/更多 | `close.svg`、`MoreFilled` | `Close` | `MoreFilled` | Tab 关闭与操作菜单 | `close` / `more` |
| 通用导航/动作 | `home/search/plus/refresh/icon-folder/icon-file.svg` | `Search`、`Plus`、`Refresh`、`Folder`、`Document` | `HomeFilled`、`Search`、`Plus` | `HomeFilled`、`Search`、`Refresh`、`FolderOpened`、`Document` | `home` / `search` / `add` / `refresh` / `folder` / `document` |

首批 `PnwIconName` 固定为：`settings`、`more`、`close`、`chevron-left`、`chevron-right`、`chevron-up`、`chevron-down`、`panel-left`、`panel-left-active`、`panel-bottom`、`panel-bottom-active`、`panel-right`、`panel-right-active`、`home`、`search`、`add`、`refresh`、`folder`、`document`。原有三个 `panel-*` 轮廓名称保持兼容并表示 off；对应 `panel-*-active` 使用同一几何并以 `currentColor` 实心填充左、下、右区域，供亮色/暗色 Footer 的 on 状态使用。它们统一使用 Wing 自有的干净 SVG 几何，不直接复制带 iconfont 元数据和来源不明的 Admin SVG，也不把 Element Plus 组件重新导出成 Wing 名称。

本轮清理只建立公共真源并替换 Wing/fixture 自身的重复内联图形。Admin、BOM Studio、Open Issue、Desk Tools 的迁移必须在各自后续适配任务中逐项进行；当前任务不改这些业务仓或依赖。Desk 的 CAA/Widget 图标、FreeCAD Part、Gitee Logo，Admin 的上传文件类型与模块业务图标，BOM 的购物车/制造领域图标继续留在产品侧。

### 2.4 W5 动态布局与诊断面板候选

后续扩展分为两个独立方向，本计划只记录入口，不把未经双消费者验证的字段加入当前实验契约：

1. View 标签栏已支持 Header 内、导航后/Editor 上方、Bottom 下方/Footer 上方三个受控位置；默认仍为 Header，移动时只渲染一个 TabBar。“导航前”因割裂 Ribbon 已删除，非法值由统一 checker 回到 Header。下一阶段布局编辑使用轻量遮罩、明确投放区和可取消 draft，先移动 Activity 与 View 标签。详见[《动态布局与拖动可行性》](Pnw工作台Web动态布局与拖动可行性.md)。
2. Bottom 的“问题 / 运行日志”改为 VS Code 类紧凑面板。Wing 提供 Problems/Log Block 和实例级诊断总线，consumer 只桥接日志、诊断与定位动作；Admin 的审计日志、任务分页日志等业务 View 不进入框架。Log 已有三个 Web 消费者证据，Problems 在第二真实消费者前保持实验性。详见[《问题与日志 Block 方案》](Pnw工作台Web问题与日志Block方案.md)。
3. 侧面目录保持 `presentation = tree`，`outline / admin-menu` 展开外观与 `leaf-rail / root-flyout` 收起外观已作为两个独立受控偏好落地；四种组合共用同一导航树与状态。现有“把所有叶子平铺成图标栏”保持默认兼容，“一级菜单图标 + 子菜单浮层”继续做真实消费者交互验证；Admin 权限只由 consumer adapter 计算成通用 hidden/disabled，共享递归 resolver 剪掉空目录，搜索、Router、权限 code 和后台菜单字段继续由 consumer 持有。详见[《侧目录外观可行性》](Pnw工作台Web侧目录外观可行性.md)。
4. 完整显示设置已提升为 Shell 级单一实例，公共设置与 consumer 底部扩展共存；详细边界和示例见[《可扩展的工作台显示配置中心》](Pnw工作台Web可扩展显示配置中心.md)。

任意业务 Block 跨 Primary/Secondary/Bottom 移动需要先分离稳定内容 ID 与 placement，并证明移动不会卸载重建 Vue 组件。Problems/Log 将作为首批生命周期原型，未通过前不增加通用 dock contribution API。

选择仓内示例的原因：当前目标 Web 消费者均为 Vue 3 + Vite，示例需要直接验证 Wing 的公开组件、类型和样式；单独仓会新增版本、依赖和设计真源，容易与真实组件漂移。更重要的是，Function 正在迁移、DeskTools 保留但工具域较重、Open Issue 又刻意不使用 Primary/Secondary，三者都不适合作为最小架构样板。只有出现非 Vue Web 消费者、需要独立公开演示站或独立发布节奏时，才重新评估独立演示仓。

## 3. 分层与责任

```text
产品 Router / 菜单 / 模块 manifest / 权限过滤
                    │
                    ▼
        PnwNavigationNode（纯 TypeScript 契约）
                    │
                    ▼
              PnwActivityBar（Vue）
              ├─ ribbon → PnwRibbon
              └─ tree   → PnwActivityTree
                    │
                    ▼
 PnwPrimaryBlock / Editor slot / PnwSecondaryBlock / PnwBottomPanel
```

### 3.1 Wing 负责

- 稳定的 `PnwNavigationNode`、`PnwActivityBarPresentation`、`PnwRibbonAppearance` 与 View Block contribution 类型；
- 受控的选中、展开、禁用、隐藏、排序、键盘行为和无障碍语义；
- Ribbon 与 Tree 的视觉呈现；
- Primary、Secondary、Bottom 的容器、尺寸约束、显隐动画和 Footer 图标组件；
- 不带任何产品路由、权限判断、业务 API、领域状态或持久化方案的 fixture 与示例。

### 3.2 产品宿主负责

- 从菜单、模块 manifest 与权限模型生成并过滤导航树；
- 以 Router/Process/KeepAlive 作为活动页面唯一真源；
- 存储用户外观偏好、面板尺寸和展开状态；
- 注册或注销当前 View 的 Block contribution；
- 为导航节点和 Ribbon 工具项提供图标、路由动作、业务状态与页面内容。

### 3.3 不可违反的约束

- `ribbon` 与 `tree` 使用同一节点 ID、可见性、排序、禁用与选中状态；切换不能改变 URL 或路由语义。
- ActivityBar 是全局导航，不是 Primary Block。Admin 的 Tree 模式只是将 ActivityBar 加宽为可显示四字中文三级目录的树。
- Open Issue 当前 View 不贡献 Primary/Secondary；示例和框架不得为了视觉完整性创建空面板。
- 公共组件对外名称、类型、CSS 类均遵循 `Pnw` / `pnw-` 命名规则。

## 4. 首期 API 草案

以下为方向性草案；实现前应以真实 Admin Host 与 BOM Studio 消费场景确认字段，不提前冻结为发布协议。

```ts
export type PnwActivityBarPresentation = 'ribbon' | 'tree'

export type PnwRibbonDisplayMode =
  | 'icon'
  | 'icon-title'
  | 'large'

export interface PnwRibbonModeAppearance {
  iconSize: 16 | 24 | 36
  showTitles: boolean
  showGroupLabels: boolean
}

export interface PnwRibbonAppearance {
  mode: 'ribbon' | 'compact'
  ribbon: PnwRibbonModeAppearance
  compact: PnwRibbonModeAppearance
}

export interface PnwNavigationNode {
  id: string
  label: string
  shortLabel?: string
  icon?: unknown
  disabled?: boolean
  hidden?: boolean
  order?: number
  children?: readonly PnwNavigationNode[]
}

export interface PnwViewBlockContributions {
  primary?: boolean
  bottom?: boolean
  secondary?: boolean
}
```

外观组合由 `PnwRibbon` 验证：紧凑工具条允许 `16/24px`，大 Ribbon 允许 `24/36px`；两类各自保存 Title 开关，分组标签只由大 Ribbon 使用。非法组合应在开发期输出清晰诊断并回退到安全默认值。

Footer 使用三个固定顺序的仅图标布局开关：Primary、Bottom、Secondary。每个按钮按受控 visibility 在 `panel-*` 轮廓图标与 `panel-*-active` 实心区域图标间切换，on/off 只由 SVG 图形表达，不产生常驻按钮底色、边框或阴影；鼠标 hover 保留轻量瞬时背景，键盘 `focus-visible` 保留焦点环。三个入口始终显示，Primary/Secondary 在当前 View 未贡献时使用原生 `disabled`；Bottom 在 Shell 提供应用默认层后跨 View 保持可用，只有 legacy consumer 完全未提供默认或页面 Bottom 时才禁用。只有 consumer 显式设置 `showFooter = false` 时才移除整个 Footer。Ribbon 的外观设置收敛到右侧 `…` 菜单，不散落多个 Header/Ribbon 按钮。

## 5. 仓内示例方案

在公共 API 初稿完成后创建非发布的 Vite 示例目录：

```text
phoenix-wing/
└── examples/
    └── PwwWorkbenchWeb/
        ├── README.md
        ├── src/
        │   ├── App.vue
        │   ├── main.ts
        │   └── fixture/
        │       ├── PwwFixtureNavigation.ts
        │       ├── PwwFixtureNavigationLayout.ts
        │       ├── PwwFixtureNavigationLayoutView.vue
        │       ├── PwwFixtureViewBlockRegistry.ts
        │       ├── PwwFixtureViewDefinitions.ts
        │       ├── PwwFixtureViewPrimary.vue
        │       ├── PwwFixtureViewSecondary.vue
        │       ├── PwwFixtureViewBottom.vue
        │       ├── PwwFixtureWorkbenchController.ts
        │       ├── PwwFixtureDisplaySettingsExtras.vue
        │       ├── PwwFixtureWorkbenchStore.ts
        │       ├── PwwFixtureWorkbenchView.vue
        │       └── PwwFixtureWorkbench.css
        └── vite.config.ts
```

示例只使用 fixture 数据，至少演示：

1. 同一导航树在 Ribbon 与 Tree 间切换；
2. Tree 展开状态、当前节点和 Ribbon 当前节点同步；
3. 大 Ribbon / 紧凑工具条先分大类，再分别验证 Title 与 `16/24/36px` 合法尺寸；
4. 大 Ribbon 的分组标签开关、紧凑模式强制无分组标签，以及 `…` 外观菜单；
5. 无 Primary/Secondary 的 Issue 风格 View；
6. 有 Primary、Secondary、可调 Bottom Panel 的完整工作台 View；
7. Footer 三个仅图标开关始终显示；Primary/Secondary 按 View contribution
   启用，Bottom 由应用默认层保持可用；
8. 窄屏下 Tree、Ribbon 溢出和 Block 折叠行为。

该示例是设计/视觉/交互回归夹具，不是新 npm 包、产品原型或第二套组件实现。它必须通过 Wing 的公开入口导入组件与类型，避免只验证源码内部偶然可用的 API。

## 6. 实施阶段与验收

| 阶段 | 工作 | 退出条件 |
|---|---|---|
| W0 | 文档、术语、受控数据模型与消费者边界 | 本文、能力目录和 API 草案完成评审 |
| W1 | `PnwActivityBar`、Tree 与 Ribbon 呈现适配 | 一份 fixture 树可无差别切换；类型/单测通过 |
| W2 | Ribbon 外观、Block 容器、Footer 图标 | 尺寸组合、无内容禁用、键盘和无障碍测试通过 |
| W3 | 仓内 `PwwWorkbenchWeb` 示例 | 八项演示场景可运行；不引入产品 API 或重复组件 |
| W4 | 两个真实 Web 消费者验证 | Open Issue 验证简单壳层与无 Secondary 页面；Admin Host 验证权限、多 Tab、动态 Block 与偏好映射；详见[双消费者验证计划](Pnw工作台Web双消费者验证计划.md) |
| W5 | 扩展验证 | 仅在 W4 仍有公共边界未被证明时，由 BOM Studio / DeskTools 做针对性 shell adapter 验证；Function 随 Admin 迁移消费，不单列独立接入 |

W0–W3 只能构建通用壳和 fixture。没有第二个真实消费者验证前，新增 API 保持实验性，不发布为不可变协议。

2026-07-29 已完成 Desk Tools、Function Develop 与 KT BOM Studio 的 0.6.0 候选只读接入审计。三者现有 0.5.1 接口均保持兼容，本轮不修改业务仓或依赖；共同 adapter 边界与发布后验证顺序见[《扩展消费者接入审计》](Pnw工作台Web扩展消费者接入审计.md)。

### W0 基线结果

- 实验契约真源为 `src/types/PnwWorkbenchWeb.ts`，由根入口导出，但不建立 schema version，也不声明为稳定跨宿主协议；W4 完成 Open Issue 与 Admin Host 两个差异化真实 Web 消费者验证后再评估冻结。若两者仍无法证明某项复杂面板语义，再由 BOM Studio / Desk Tools 做针对性验证。
- 导航树只包含身份、标签、宿主图标、受控禁用/隐藏/同级排序和子节点；Router、URL、权限、模块 manifest、业务 metadata 与激活动作继续由宿主 adapter 持有。
- Ribbon 把第一层投影为模块、下一层投影为分组、末级可激活节点投影为工具项；若真实消费者需要不同层级语义，先由宿主适配，不向节点增加产品专有 role 字段。
- View contribution 声明当前页面的 Primary、专用 Bottom、Secondary；Shell 的
  `defaultBottomBlock` 是每个工作台实例的应用默认层。`PnwWorkbenchLayoutState`
  用一份纯 TypeScript 受控状态承载三块显隐和 `primaryWidth` /
  `secondaryWidth` / `bottomHeight`。切换页面只重新解析 Bottom 内容与 tabs，不写
  显隐或尺寸；Wing 负责安全缺省、边界修正与交互事件，持久化 key、用户作用域和
  保存介质仍不进入 Wing。
- Web 样式以 `--pnw-*` token 为扩展面，内置 light/dark 基线且不依赖 Element Plus 主题实现。宿主可提供 Vue 图标组件、覆盖 token 或追加自己的作用域 CSS；Wing 不接管主题偏好存储。

### W1 实现结果

- `PnwActivityBar` 只接收一份 `nodes`，以受控 `presentation` 在 `PnwRibbon` 与 `PnwActivityTree` 间切换；选中 ID 和 Tree 展开 ID 均由宿主传入，切换呈现不产生路由或状态副作用。
- `pnwNavigationTree` 纯函数负责隐藏过滤、稳定同级排序、Tree 可见行和 Ribbon 模块/分组投影。两种呈现激活相同的末级节点对象，保留节点 ID、禁用状态和宿主图标引用。
- Tree 支持受控展开、上下/左右/Home/End/Enter/Space 键盘行为和 `tree` / `treeitem` / `aria-*` 语义；分支仅展开，末级节点通过 `activate(id)` 把动作交回宿主。
- `PnwRibbonShell` 仅新增默认开启的 `showLayoutToggle` 可选属性，`PnwRibbonGroup` / `PnwRibbonToolButton` 只放宽文本图标兼容；既有 props、事件和直接子路径入口保持不变。

### W2 实现结果

- 高层 `PnwRibbon` 使用“大 Ribbon / 紧凑工具条”两个外观类别，两类共用 `PnwRibbonModeAppearance` 数据形状并分别保留配置；纯函数明确紧凑图标仅 `16/24px`、大 Ribbon 图标仅 `24/36px`，非法组合返回诊断并安全回退到 `24px`。`pnwResolveRibbonNaturalHeight` 让紧凑 16px / 24px 图标对应 28px / 34px 自然高度，Title 开关不改变高度；低层 `PnwRibbonDisplayMode` 的 `icon` / `icon-title` / `large` 继续供既有 Group/ToolButton 兼容入口使用。
- 大 Ribbon 提供 Title 与分组标签，紧凑工具条只使用 Title；外观类别、合法尺寸和当前类别开关只出现在 Ribbon 右侧单一 `…` 菜单中。`PnwRibbonShell` 原布局切换入口仍默认保留，只有新 `PnwRibbon` 主动关闭它。
- `PnwWorkbenchLayout` 只在解析后 contribution 与对应 slot 同时存在时渲染
  `PnwPrimaryBlock`、`PnwSecondaryBlock`、`PnwBottomPanel`。Shell 先以“当前
  View Bottom → 应用默认 Bottom”分层生成同一个 Bottom slot。Bottom 位于 Editor
  栈内部，DOM 与 CSS Grid 均不会跨过 ActivityBar 或两个侧 Block。
- `PnwWorkbenchLayout` 在组合层为 Primary 右边、Secondary 左边和 Bottom 顶边提供三个显式 `separator`；鼠标/触控与方向键都只更新同一份 `PnwWorkbenchLayoutState`。Bottom 不再使用浏览器右下角原生 `resize`，其高度只能从顶边改变；纯函数按 Editor 最小空间和面板上下限修正尺寸，可脱离 Vue 单测。
- `PnwBottomPanel` 接收受控 `PnwBottomPanelTab[]` 和活动 Tab ID，可承载问题、日志等多个内容页；Wing 只渲染标签、计数、状态和插槽，不拥有 Desk Tools / Admin 的面板注册表或内容生命周期。
- `PnwWorkbenchFooter` 左侧接受无业务语义的 consumer 内容 slot，右侧固定渲染 Primary、Bottom、Secondary 三个仅图标按钮；可用按钮按 visibility 切换公共 `panel-*` / `panel-*-active` SVG，on 不产生常驻按钮底块，hover 与 `focus-visible` 反馈仍保留。Primary/Secondary 未由当前 View 提供时使用原生 `disabled` 并保持轮廓 off 图形；提供 `defaultBottomBlock` 后 Bottom 的 availability 由应用默认层稳定提供。按钮继续输出 `aria-label` / `aria-pressed`，只向宿主发送显隐状态更新。`PnwWorkbenchLayout` 默认始终保留 Footer，避免切换 View 时三个入口和页面高度跳动；consumer 只有显式传入 `showFooter = false` 才关闭整个 Footer。
- `light`、`dark`、`system` 由布局根提供默认 token；系统主题使用 `prefers-color-scheme`。示例和宿主可以在外层覆盖最终 `--pnw-*` token，例如：

  ```css
  .my-workbench-theme {
    --pnw-workbench-bg: #fff7ed;
    --pnw-workbench-surface: #fffbeb;
    --pnw-control-active-bg: #fed7aa;
    --pnw-control-active-text: #9a3412;
    --pnw-focus-ring: #f97316;
  }
  ```

  组件不导入 Element Plus CSS，也不假设任一图标库；`PnwNavigationNode.icon` 可由宿主适配为文本或 Vue Component。宿主自定义 CSS 应限定在自己的工作台外层，并优先覆盖 token，避免依赖内部 DOM。

### W3 实现结果

- 非发布示例位于 `examples/PwwWorkbenchWeb/`，定位为仓内第一方 fixture consumer，而不是公共实现目录。根 `src/` 只保留 `App.vue` 与 `main.ts`；假导航、假 View、Pinia 状态、设置面板和布局管理页全部进入 `src/fixture/`，文件统一使用 `PwwFixture*`，因此新 consumer 不应误以为这些文件都必须复制或改名。消费者只需参考 Shell、受控状态和 View registry 的接线，直接绑定已有 Router/Pinia 或建立自己的薄 adapter；选择性复制 fixture 片段时才替换 `PwwFixture*` 命名。Wing 导入的 `Pnw*`、`pnw*`、`usePnw*`、`PNW_*` 和 `--pnw-*` 公共名称保持不变。示例没有 `package.json`、产品 API 或源码 alias；typecheck/build 先构建根包，再从 `phoenix-wing` 与 `phoenix-wing/style.css` 公共 export 消费。
- fixture 覆盖同树 Ribbon/Tree、受控展开与选中、两类同形 Ribbon 外观及合法尺寸、分组标签、Issue 无 Primary/Secondary 或专用 Bottom、应用默认 Bottom 回退、完整三 Block、Footer 开关、可调 Bottom 和 700px 窄屏。
- 示例额外覆盖 `light` / `dark` / `system` 与宿主自定义 CSS token。主题切换和 token 覆盖只保存在示例内存状态，不写浏览器存储。
- 本地开发固定 `127.0.0.1:41789` 且 `strictPort`；2026-07-28 已用内置浏览器验证桌面/窄屏、ARIA 状态、实际计算颜色、Ribbon 横向溢出和 Block DOM 数量，控制台无 error/warn。
- 浏览器视觉回归发现并修正了自定义 `--pnw-workbench-surface` 未向 Editor/Block 传播的问题；最终自定义浅色 token 可覆盖 dark 基线，同时保持可读对比度。

### W3 后续视觉与既有 Web 适配增强

- 只读核对 BOM Studio、Open Issue 与 Desk Tools 后，三者的页眉都可归纳为“品牌、Ribbon 大分组、已打开页面标签、右侧操作”。Wing 因此增加无状态 `PnwWorkbenchHeader` 插槽壳，并让 `PnwWorkbenchLayout` 接受可选 `header` slot；没有把任一产品的用户菜单、Router、Tab 会话或偏好持久化带入公共层。
- BOM Studio 与 Open Issue 已直接使用 `PnwRibbonTabBar` / `PnwWorkbenchTabBar`，Desk Tools 保留自己的 Header/Tab adapter 并继续复用 `PnwRibbonShell`。本轮只把共同排布反馈到 fixture，不修改这些消费者，也不据此宣布 W4 验收完成。
- `PnwRibbon` 根据外观类别、合法图标尺寸、Title 和分组标签自动形成紧凑/展开高度，并通过 `--pnw-ribbon-height`、`--pnw-ribbon-icon-height`、`--pnw-ribbon-icon-title-height`、`--pnw-ribbon-large-height` 允许宿主覆盖。Header 一级大分组激活后只投影对应 Ribbon 内容；重复的竖排模块名已删除，当前分组内模块使用 `--pnw-ribbon-module-handle` 控制的 `3px` 分隔句柄。
- fixture Header 直接组合 Ribbon 大分组标签和内存中的已打开页面标签，右侧 `header-actions` 仅放 consumer 的 `KT` 用户区占位，不实现登录或退出。Ribbon 最右侧与 Tree 底部复用 Wing 单行图标快捷菜单；“完整显示设置…”打开公共 `PnwWorkbenchDisplaySettingsPanel`，fixture 用 `display-settings-panel-extra` 追加窄屏、CSS token 与 SVG 回归。该面板没有背景遮罩，标题栏可拖动，并由 `pnwClampFloatingPanelPosition` 修正到可见范围。点击普通导航只更新同一受控节点和内存 Tab，不接 Router 或存储。
- Header 一级分组可从同一节点的可选 `shortLabel` 取得紧凑文案；fixture 使用“工作 / 研发 / 协同”，同时让 `PnwRibbonTabBar` 的 tooltip 与无障碍名称保留完整标签。分组区默认最多占 `min(36vw, 360px)`，约 8 个两字短标签可完整显示，超出后横向滚动且不会挤走页面标签；排序仍由受控导航树决定。
- fixture 设置面板已收紧为 `420px` 单列检查器；区块可折叠，默认仅展开导航与 Ribbon，内容超高时在固定标题栏与底部动作之间滚动。`--pnw-floating-panel-max-height` 允许宿主约束高度，Wing 仍不保存面板内容或用户偏好。
- fixture Header 使用 `PnwPhoenixWingMark` 呈现与 Admin Host 同源的红橙/青蓝羽翼及中央火焰标志；Wing 内联维护 SVG 几何与渐变，不跨仓引用 Admin 的 `/pah-phoenixwing-mark.svg` 路径。组件支持可访问名称、装饰模式和 `--pnw-phoenix-wing-mark-size` 尺寸 token。
- Tree 首行提供受控目录收起动作，`PnwActivityBar.treeCollapsed` / `update:treeCollapsed` 把完整目录切换为默认 `48px` 的 Activity Rail。Rail 只投影原树可激活的末级节点：复用节点图标，没有图标时显示标题首字，不为顶层模块猜测默认路由。
- fixture consumer 的宿主层持有默认导航树与当前树，可把包含 `issues` 的“问题跟踪”小模块从“协同管理”整体移入“工作空间”并恢复默认；Ribbon/Tree 仍消费同一棵树且 ID 不变。跨组权限、空组保留与持久化合并策略列为 W4 双消费者决策点，不扩展本轮公共协议。
- 分组调整已从浮动外观面板迁入独立“导航分组布局”fixture View。该 View 使用按当前大分组树分段的表格，大分组父行可单独或全部折叠；每个小模块行列出模块内工具/View、默认大分组、当前大分组，并以“移动到”下拉选择目标。所有一级子模块均可整体移动，模块内工具/View 不拆散。页面同时提供整树“全部恢复默认”和已调整行的“恢复本模块”。移动后为空的大分组由 fixture 宿主在同一树中标为 `hidden`，Ribbon/Tree 同时隐藏；空组仍保留为可折叠父行和下拉目标，恢复默认或重新移入后再次显示。这个分离也与 Admin Host 已有“管理大分组与模块归属”独立页面入口一致。
- fixture 将“导航布局”放在“系统 / 工作台配置”下，但 `system` 不是 Wing 保留 ID，也不是固定配置 schema。真实消费者可在自己的最终导航树中追加任意数量的系统配置小模块；关系 View 按一级直接子节点自动枚举，并让每个大分组列独立纵向滚动。配置表单、配置数据来源和权限仍属于消费者。
- fixture 的“新建大分组”只填写名称与可选 Header 简称；宿主生成 ID、排序和空 `children`，不会在同一动作里创建小模块或 View。新组为空时在同一树上标为 `hidden`，因此只作为布局表格下拉目标；移入小模块后才出现在 Ribbon/Tree。“全部恢复默认”会移除 fixture 新建组。
- 大分组定义表同时显示全名、Header 简称、顺序、内置/自定义来源、空组状态和操作。consumer 可就地编辑全名、简称和顺序，但不改稳定 ID；是否内置由宿主不可变默认树中的 ID 判定，不污染公共 `PnwNavigationNode`。内置分组不可删除，可单独恢复默认定义且不改变当前模块归属；自定义分组可删除，但含有小模块时必须先移出，避免隐式丢失导航节点。
- fixture 将当前导航布局迁入 `usePwwFixtureWorkbenchStore`。可持久化对象不是含图标/组件引用的整棵 `PnwNavigationNode`，而是带 `schemaVersion` 与 `baseLayoutVersion` 的纯数据：全部大分组共用同形的 `id/label/shortLabel/order` 定义，以及全部小模块的 `moduleId/rootId/order` 归属。内置/自定义由默认树推导，不再维护另一种分组数据类型。fixture 作为真实前端 consumer 用 Pinia 持有当前树，并把该纯数据快照防抖写入独立 `localStorage` key；启动时 hydrate，损坏或基础版本不兼容时回退默认树。Wing 仍不选择存储介质；Admin 后续可由自己的 Pinia action 通过后端 API 保存同形宿主状态，但数据库 DTO、用户/租户作用域、并发版本与权限不进入 Wing 公共协议。
- 四个 Web 的入口虽然业务状态不同，但都重复装配 Header、一级模块标签、已打开页面标签、Ribbon/Tree 和 View Blocks。Wing 因此增加实验性 `PnwWorkbenchShell` 组合入口：它只把现有 `PnwWorkbenchLayout`、`PnwWorkbenchHeader`、`PnwActivityBar` 和两个 TabBar 接到同一组受控 props/events；fixture 的 `App.vue` 从五个壳层组件引用收敛为一个。每个低层组件和原有兼容入口继续保留，消费者可以逐步采用或用命名 slot 覆盖任一层。
- Shell 默认品牌由 `PnwPhoenixWingMark`、`brandTitle` 与 `brandSubtitle` 组成，`brand` slot 可整体替换；Header 右侧继续只由 `header-actions` slot 承载消费者账户/租户动作。fixture 删除了重复品牌模板，Admin 可只覆盖标题或完全覆盖品牌而不复制 Header。
- Header 在没有打开 View 时不生成空的页面 Tab 区，右侧操作仍贴齐右边；关闭最后一个标签后，宿主可用 `showEmptyView` 显示 Wing 默认空状态，并以 `empty` slot 覆盖。Wing 不自动打开默认页、不关闭业务 View，也不决定欢迎页语义。
- fixture 将原本超过千行的 `App.vue` 拆为消费者 Shell 装配和 `src/fixture/` 下的演示实现；`App.vue` 只创建一个按 `appearance/navigation/layout/settings/view/tabs/actions` 分组的 `pwwFixture` facade，不再逐项展开三十余个变量，也不含 Block 业务模板。该 facade 只是示例 adapter，不新增 Wing 公共状态协议。
- Primary、Secondary、Bottom 的显隐与三项尺寸现在由 fixture Pinia 中一个 `PnwWorkbenchLayoutState` 持有；Bottom 的“问题 / 运行日志”使用受控多标签。Pinia 仅作消费者状态示例，是否写浏览器存储或同步 Admin 后端数据库仍由消费者决定。
- BOM Studio 与 Desk Tools 都已采用“页面在 setup 登记 Primary contribution、壳层按活动页/Tab ID 读取、停用或卸载时释放”的模式，因此 Wing 提炼无产品语义的泛型 `pnwCreateViewContributionRegistry` / `usePnwViewContribution` 生命周期；registry 实例仍由每个 consumer 创建，Wing 不建立全局页面仓库。`PnwWorkbenchShell.viewBlocks` 可直接动态装配当前 View 提供的 Primary/Secondary/Bottom 组件、props 与 Bottom tabs，命名 slot 继续作为兼容和覆盖入口。
- `PwwFixtureWorkbenchView` 在自己的 setup 中登记 `PwwFixtureViewPrimary`、`PwwFixtureViewSecondary`、`PwwFixtureViewBottom`；`App.vue` 只传 `viewBlocks`，不再写固定 Block 内容。Secondary/Bottom 的业务注册 schema 尚无两个真实消费者共同证明，本轮只复用通用组件容器，不增加字段、路由或持久化语义。
- 示例默认不显示 Secondary。常见 View 优先采用 `Primary + Editor`：筛选、树和当前对象属性摘要可在 Primary 内上下分区，减少左右占用；只有 Desk Tools 一类需要独立检查器的复杂工具才贡献 Secondary，并由用户从 Footer 按需打开。该选择是示例布局原则，不改变三个 Block 的公共能力。
- Open Issue 与 Desk Tools 均仍以 `PnwRibbonTabDef[]` 保存既有 Ribbon contribution，故增加纯函数 `pnwNavigationFromRibbonTabs` 作为迁移投影；它只保留 tab/group/page ID、文案和可选图标，不读取权限、不执行 Router、不复制 action。Admin Host 与 BOM Studio 的产品菜单 adapter 仍留在产品侧。
- 2026-07-28 内置浏览器回归测得大 Ribbon `36px` 图标 + 分组标签为 `85px`；紧凑工具条改为随图标缩放，`16px` 为约 `28px`、`24px` 为约 `34px`，同尺寸开关 Title 高度不变；Activity Rail 为约 `48px`。暗色卡片与浮动面板计算背景均为 `rgb(17, 24, 39)`；modeless 面板打开时背景仍可见。700px 工作台容器会收起品牌文字、保留模块与页面标签空间；真实窄视口下面板内容改为单列。

### 多 Web 入口配置边界

`PnwWorkbenchShell` 不是新的状态仓库或“大而全配置中心”，而是减少 `index.vue` / `App.vue` 重复引用的受控组合组件。可跨消费者配置的只有已经在多个 Web 重复出现的界面效果：

| 配置面 | Wing 受控输入 | 宿主仍负责 |
|---|---|---|
| 导航 | `nodes`、`presentation`、`activeNodeId`、`expandedNodeIds`、`treeCollapsed` | 菜单来源、权限过滤、路由和节点移动/恢复 |
| Ribbon 外观 | `ribbonAppearance`、是否显示内置 `…` 菜单 | 偏好读取、保存、用户级合并 |
| Header 页面标签 | 最小 `PnwWorkbenchTabItem[]`、当前 tab ID、关闭/新增事件 | Tab session、dirty 关闭守卫、页面装载器 |
| View 布局 | `contributions`、`viewBlocks`、`PnwWorkbenchLayoutState`、Bottom Tab 与 Primary/Bottom/Secondary slots | 当前 View 判定、registry 实例、业务组件、面板状态和持久化 |
| 主题 | `light` / `dark` / `system` 与 `--pnw-*` token | 品牌主题选择、持久化、自定义 CSS 的发布与治理 |

品牌、Header 操作、模块标签、页面标签、ActivityBar、Editor 和三个 Block 都有命名 slot；产品只有确实需要不同结构时才覆盖。Admin Host 的模块权限与分组管理、BOM Studio 的异步页面定义、Open Issue 的会话/路由、Desk Tools 的页面注册表均不得进入 Wing。W4 前 `PnwWorkbenchShell` 与 `PnwWorkbenchTabItem` 仍是实验契约，不建立 schema version。

### Phoenix Admin 薄适配方案（W4 候选，不在本轮改 Admin）

只读核对 Phoenix Admin 当前结构后，不建议把其 Router、权限菜单、Process Tab 或后端分组配置迁入 Wing。Admin 已在 `main/index.vue` 以 `classic / workbench` 双模式选择 `PahWorkbenchShell`，也已有 `PahRibbonMenuAdapter`、`menu` / `process` Pinia store 和 `router-view + keep-alive`。因此适配应保持为 Admin 仓内的一层薄壳：

1. 保留现有 `classic` 回退和路由级开关，先让少量 workbench 路由使用 `PnwWorkbenchShell`，而不是一次替换整个 Admin；
2. `PahRibbonMenuAdapter` 在 Admin 完成权限过滤、后端菜单排序和稳定 `pah-menu-*` ID 后，投影为 `PnwNavigationNode[]`；`activate` 仍调用 Admin Router，Wing 不读取 path 或权限；
3. `process.list` 投影为 `PnwWorkbenchTabItem[]`，选择、关闭、dirty 守卫和 `keep-alive` 仍委托现有 process/router；Editor slot 继续放现有 `<views />`；
4. Admin topbar/user 区放入 `header-actions`，品牌使用 Shell 默认 Phoenix 标志并把标题设为 `Phoenix Admin`，或由 `brand` slot 完全覆盖；
5. `PahWorkbenchPreferences` 可把既有 Primary/Properties/Log 显隐与宽高映射到 `PnwWorkbenchLayoutState`，由 Admin Pinia/storage 或未来用户数据库保存；数据库 DTO、租户/用户作用域、并发版本与权限不进入 Wing；
6. Admin 的日志/问题等 Bottom contributions 投影为受控 `PnwBottomPanelTab[]`，内容继续使用 Admin 自己的组件注册与服务；导航分组管理仍是 Admin 独立业务 View。

这样 Admin 复用的是 Header、同树 Ribbon/Tree、页面标签、四区布局、句柄、Footer、主题 token 与空状态；产品行为仍由 `Pah*` adapter 承担。该方案需要在 Admin 仓单独实施并形成 W4 第一消费者证据，本轮未改 Admin 文件或依赖。

### 暂缓决策点

- 导航节点的业务路由、权限表达式、徽标、命令参数和动态加载状态，需至少两个真实 Web 消费者证明后再讨论。
- Block 的安全默认宽高、最小/最大尺寸、拖拽修正与 `840px` 窄容器结构兜底由 Wing 提供；持久化 key、用户级默认值、手机产品体验和跨版本合并仍属于宿主边界。
- 导航跨大分组移动的权限、可移动层级、空分组处理、默认布局版本升级与用户布局合并策略，需 Admin Host 与 BOM Studio 两个真实消费者共同证明；Wing 当前不拥有默认分组或偏好存储。
- `700px` Tree 空白占位已由统一响应式语义消除：窄容器实际渲染 Ribbon，不再把 Tree / Rail 放到 Editor 上方整行。框架同时把 Header 内 View 标签移到 Editor 顶部；保存的宽屏 Tree 与标签位置偏好保持不变。
- 产品基线是工程师桌面效率工作台。0.6.0 候选优先保证桌面、笔记本半屏与嵌入分栏；手机只做结构可用兜底。触摸菜单、虚拟键盘、安全区和更小断点需结合 Cool Admin / Phoenix Admin 的真实移动端入口再验证，不能据 fixture 增加一组手机配置。
- VS Code Webview 只可复用本文件中的纯 TypeScript 数据契约，不复用 Vue 组件或主题 CSS。

## 7. 风险与避免方式

| 风险 | 避免方式 |
|---|---|
| 预先设计过多通用字段 | 只固定导航与呈现最小契约；业务 metadata 留在宿主 adapter |
| Ribbon 与 Tree 数据逐渐分叉 | 只允许 `PnwActivityBar` 接收一份树；测试同 ID/选中/可见性一致 |
| 示例变成第二产品 | 不接 API、不接登录、不保存业务数据；只保留 fixture 和视觉回归；DeskTools 不承担示例职责 |
| 组件 API 未经消费者验证就发布 | W4 至少要求 Open Issue 与 Admin Host 两个差异化真实消费者；未覆盖的复杂语义继续保持实验性 |
| VS Code 强行复用 Vue | 仅共享纯 TypeScript 契约；保留 Webview 的既有原生实现 |
