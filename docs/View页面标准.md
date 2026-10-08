# View 页面标准

状态：0.8.0 已发布 Registry；上下文菜单、实际 tarball 与隔离正式包回归见 [0.8.0 发布回执](releases/0.8.0发布候选.md)。此前 Header/Block 记录见 [0.7.6 回执](releases/0.7.6发布候选.md)；下文其他专项 TODO 不因本次发布自动完成。

当用户说“查 Wing 的 View 标准，按标准做 UI”时，从本页选范式，并核对实际 Wing 版本。字母编号只是文档别名，不是组件或 API 名称。

## 快速选型清单

用户可直接说：“查 Wing UI 标准，参考示例改造这个页面。”AI 先读取本页，再核对公开组件和真实示例；已有明确需求时直接选型，不要求用户理解组件 API。

### 页面类型

- A 普通 View：列表、详情、编辑。用 `PnwPageLayout`，页头固定，正文滚动；需要属性或筛选时贡献 Primary。
- B 可浮出 View：需要将整页移入非模态窗口。用 `PnwViewPresentationPortal`，保持稳定实例；不能把整页复制成第二份组件。
- C 可停靠工具：资源库、检查器等独立工具。用 `PnwDockableToolWindow` 与 `PnwDockablePrimarySection`，工具状态由宿主统一持有；不得把工具生命周期当作 View 生命周期。
- D 对话框：一次性确认、输入。先查现有对话框示例，不用可浮出 View 模拟阻塞确认。

### 可定制项

- Header：标题必需；center 搜索/配置可选，right 业务操作可选；未提供的区域不占位。框架操作不可替换。
- Primary：需要属性/筛选则使用；宽度和显隐走框架状态，不写第二套定位。
- Bottom：日志/问题按需贡献；Footer 默认保留。隐藏 Footer 前须接通显示设置的面板开关，绑定并持久化宿主状态。
- 正文：列表、表单、图形由业务选择；折叠分块沿用 Wing Block，不重复嵌套装饰卡片。
- 浮出：只在有独立查看需求时启用；同时检查收回、关闭语义和状态保留。
- 主题：默认继承 Wing token，不增加业务渐变背景；品牌色只用公开 token。
- 窄屏：沿用框架响应式默认行为；特殊左右布局先记录需求，不覆盖内部类名。
- 恢复：显隐、尺寸、当前 View、过滤条件由宿主持久化；服务数据不以浏览器缓存作为唯一存储。

### 示例入口

- `/?example=workbench`：工作台、完整 View 浮出、资源工具停靠 Primary、显示设置。
- `/?example=header`：center/right/旧插槽、窄容器、长标题、浮出与正文滚动。
- `/?example=tab-menu`：0.8.0 工作台标签上下文菜单、显式目标、批量范围、宿主保护与键盘焦点。
- `/`：内部 Tab 与浮窗排列，并列场景入口。
- `/page-layout.html`：独立页面布局验证。

### AI 实施顺序

1. 确认实际依赖来源是 Registry 还是本地主库，以及所需 API 是否存在。
2. 用一句话列出选型和非默认项，例如：“B，可浮出；Primary 属性；center 搜索；right 保存；Bottom 日志。”
3. 优先复用公开组件和领域共用 Block，只编写业务内容与状态接线；不复制示例壳层 CSS。
4. 缺少基础能力时先在 Wing 示例复现并修复；验证后按发布流程交付。
5. 点检固定页头、布局边界、交互、宽窄屏、浮出收回及刷新恢复；分别报告源码适配和实际页面验收，不能混为完成。

### 选型界面待办

- [ ] 在示例首页增加可视化选型面板：选择 A/B/C、Primary/Bottom、center/right 和浮出能力。
- [ ] 选型结果展示对应真实示例与最小接线代码；只列已实现配置，不生成不存在的 API。
- [ ] 输出可供 AI 使用的简短配置摘要，和本页保持同一术语；不另造一套布局框架。

## 标准 A：普通工作台页面

### Card 属性区块

使用 `<PnwSidebarBlock title="属性" variant="card">…</PnwSidebarBlock>`，业务操作放 `#actions`，折叠状态可用 `v-model:expanded`。原生 card 提供 1px 外框、8px 圆角、至少 40px 的标题行、8px/10px 正文内边距及 8px 内容 gap；展开时只有一条标题/正文分隔线，折叠时去除该线。actions 靠右，空间不足时换行而非挤出卡片。`bodyInset=false` 关闭正文 padding/gap，`bodyScroll` 控制内部滚动。

引入公共 `phoenix-wing/style.css`，用 `PnwOverlayThemeProvider` 或工作台主题提供明暗 token。不要额外补外框、圆角、标题高度、分隔线或 deep actions 样式；宿主仍可负责流式布局的 height/flex/min-width。旧 card 的上下 2px 直角外观改为完整卡片，strip 不变；原有外观补丁应在消费更新构建后撤除，避免双边框。超长且不可拆分的业务操作自身仍需提供合理尺寸。

独立验收入口 `/?example=cards`：相邻 card、表格、图表、展开折叠、actions、窄容器及明暗主题；示例没有外观补丁。

使用 `PnwWorkbenchLayout`（或宿主已有的 `PnwWorkbenchShell`）、`PnwPrimaryPanel`、`PnwPageLayout`。Primary 放属性与筛选；页头放标题及操作；正文使用 Wing Block。宿主已有布局时不再嵌套第二套 Workbench。

`PnwPageLayout` 负责满高页面、页头与正文滚动。Primary 切换由 Workbench 提供，不复制按钮，不隐藏原生开关或清零标题避让空间。

## 标准 B：可浮出完整 View

Portal 内的 `PnwPageHeader` 推荐只传 `title` 与业务插槽，框架自动提供浮出/收回，无需调用方判断 mode。兼容旧的显式 `presentationDetachable`、`presentationMode` 和动作事件接线；不要添加隐藏按钮的 CSS 或自建去重器。框架使用稳定 ID `pnw.view.detach` / `pnw.view.reattach`（导出常量 `PNW_VIEW_DETACH_ACTION_ID` / `PNW_VIEW_REATTACH_ACTION_ID`），在每个 Portal 私有的响应式注册域中按 ID 和优先级解析唯一所有者：嵌入 Header 提供浮出，浮窗 chrome 优先拥有收回。卸载释放注册，不跨 View 去重，不扫描 DOM 或匹配文案。`#center` / `#right` 只放业务动作；框架按钮保持最右。Portal 外独立 Header 的显式事件模式保持兼容。

`/page-layout.html` 可切换简化调用和旧显式调用，验证 embedded → floating → reattach 始终只有一个框架动作。AI 实施时先复用这套机制，不在消费者另做 mode 判断或注册框架动作副本。

沿用同一 Workbench，在稳定 View 宿主使用 `PnwViewPresentationPortal`。`contentLayout="page"` 将页头与正文滚动分离，默认 `flow` 保留旧行为。Header 插槽模式优先使用上述简化调用，旧显式属性与事件仍兼容；使用 header channel 自动贡献时将 `PnwPageHeader` 放在 Main 内，不要重复放到 Header 插槽导致贡献递归。不要把本地能力描述为旧 Registry 已支持。

公共入口示例：`examples/PwwWorkbenchWeb/src/page-layout/Page.vue`。构建当前 checkout 后运行示例，访问 `/page-layout.html`。统一 Router 宿主需要 header channel 的用法见 [完整 View 方案](Pnw工作台Web完整View浮出与收回方案.md)。

## 必须点检

### Header 业务插槽

`PnwPageHeader` 使用 Teleport 贡献页头，不承诺将组件上的 `class`、`style` 或原生 `pointerdown` 监听自动透传到 DOM 根。业务布局使用公开 props 和插槽；需要原生事件时绑定到业务插槽内的实际元素，不在 Header 上绑定窗口拖动事件。框架负责浮窗页头拖动。

窄屏（工作台容器不超过 840px）堆叠布局中，Primary、页面正文和 page 模式 View 的内部纵向滚动到达边界后应继续滚动外层内容区。宽屏和浮窗仍保留各自滚动边界；消费者不需要覆盖内部选择器。

推荐 `#center` 放搜索、筛选和配置，`#right` 放保存、刷新等业务工具；两者可同时存在。
未传 `#center` 且没有旧中间插槽时，中间容器和列均不存在，不挤占标题与右侧空间。
框架浮出/收回按钮独立于业务插槽，始终位于最右列。浮窗外框的收回按钮也不由业务覆盖。
`PnwPageLayout` 透传这两个插槽。旧 `#actions`、`#help` 与 `actionsAlign` 保留原行为，
仅作过渡兼容；确认依赖支持后应尽快迁移，新页面不要继续使用旧插槽。

新旧插槽并存时，center 控件不参与 flex 压缩，最大宽度受中区约束；超出内容在中区横向滚动，
Tab 焦点可进入旧操作与帮助。不能把搜索框压成细线，也不能挤走 right 或最右框架动作。
短标题按内容占位而非与中区等分（标题最多占 35%）；right 按内容占位（最多 45%），
剩余宽度自动交给 center。消费者可以在自己的 center 容器中按实际可用宽度切换紧凑筛选，
不需要覆盖 Wing 内部列宽。`?example=header` 的长/短标题与窄容器用于验证此行为。

### Block 外观与 Header 插槽

复用现有 `PnwSidebarBlock variant`，不根据 DOM 所在位置自动改样式，避免移动/浮出时改变外观。

| 使用位置 | 推荐公开入口 | 默认视觉 |
| --- | --- | --- |
| Primary | `PnwPrimarySection`；外层 `PnwPrimaryPanel` 使用 `strip` | 连续横向分隔线，无左右卡片边框、无圆角 |
| Main 正文 | `PnwSidebarBlock variant="card"` | 1px 实线四边框，默认 8px 圆角，正文有内边距 |
| Block Header | `#title` / `#suffix` / `#actions` | 用间距分组，不绘制操作区竖线 |

`PnwSidebarBlock` 保持原默认 `variant="strip"`；Main 显式选择 `card`，用户也可选择 `strip`。
`collapsible`、`v-model:expanded`、`bodyInset` 与 `bodyScroll` 保持现有职责；固定 Block 可设置
`:collapsible="false"`。`--pnw-sidebar-block-radius` 可覆盖 card 圆角；颜色统一来自工作台主题 token。
card / PrimarySection Header 默认带淡色背景，dark 下使用对应深色浅层，而非固定白色。
普通 `strip`（包括卡片中的嵌套小块）默认透明标题背景和上下横线，默认可折叠；只传 title 和内容即可，
不必逐块设置背景或折叠开关。PrimaryPanel 仍可提供自己的标题底色。消费者可在自己的容器 CSS
设置 `--pnw-block-header-bg`（包括 `transparent`）覆盖 SidebarBlock 与 PrimarySection 的标题底色；
原 `--panel-head-bg` / `--pnw-primary-section-header-bg` 仍可使用。不需要穿透内部样式。
这里的 Block 不是 `PnwPageMainBlock`：后者只负责页面正文默认留白，不自动给整个页面套卡片。

```vue
<PnwSidebarBlock title="结果" variant="card" :collapsible="false">
  <template #actions><button type="button">刷新</button></template>
  <p>消费者自己的正文</p>
</PnwSidebarBlock>
```

验证入口：本仓示例 `/` → 左侧「Block 样式」。可切换 strip/card，检查 Primary、Main、Header，
以及 light/dark、窄屏、草稿保留和折叠；示例只负责排列，不覆盖组件边框 CSS。
也可直接进入 `/?example=blocks`。其中 Main 的一级「图片与属性」Block 展示左侧 SVG 图片、右侧两个连续 strip 小块，
窄容器改为上下排列；这是 slot 组合示例，不将图片或字段模型固化到公共 Block API。

- [x] 公共 Header 与 PageLayout 新插槽实现。
- [x] 库内 Header 示例页头源码适配；浏览器完整验收另行点检。
- [x] 0.7.6 Registry 发布及隔离安装同一示例的回归。

### 后续点检

2026-09-21 发布前小批收口：Header 示例增加长/短标题快捷切换与旧操作对齐选项；定向测试覆盖新插槽动态组合、框架动作独立性及过渡状态禁用。Header、PageLayout 和显示设置共 13 项通过，库构建、示例类型检查与文档门禁通过。此记录不替代下列真实浏览器和制品验收，也不表示已发布。

- [x] 当前文档移除私有项目描述；目录链接示例移除本机路径，已有路径不自动覆盖。
- [ ] 发布前复核历史材料的公开授权；无明确依据的身份、仓库和业务数据不得保留。
- [x] 0.7.6 实际 npm tarball 及 sourcemap 的隐私扫描与本次 diff 人工复核；关键词扫描不代替历史材料的授权审查。

- [ ] 独立 Header 验证页：宽窄屏、长标题、无 center、无 right、两者同时存在、旧插槽并存均做浏览器验收。
- [ ] Footer 关闭偏好刷新恢复、无 Footer 时三个面板的开关和不可用状态完整验证。
- [ ] 资源工具停靠自动展开 Primary、折叠、移动首尾与多实例状态隔离。
- [ ] 在本仓示例验证完整页面的固定页头、主题、刷新恢复和宽窄屏，不依赖外部页面作为验收入口。
- [ ] 用中性图形示例验证浮出、回嵌和状态保留，不在 Wing 复制业务图形逻辑。

- 页面只保留一套主标题，Primary 切换可操作。
- 滚动长正文时页头和外层 Editor 不移动，内容末尾可到达。
- 页头按钮、输入与链接不触发窗口拖动；空白页头仍可拖动。
- 浮出、调整尺寸、收回后内容与组件状态保留。
- 宽窄屏都验证。现有 Workbench 在 840px 以下默认纵向堆叠；桌面工具若要求保持左右布局，必须明确方案，不私自覆盖内部样式。
- 宿主负责刷新恢复与资源权限，框架组件本身不等于已持久化业务状态。

遇到缺口：先区分 API 接线错误、示例缺失、框架能力缺失，再记录复现与验收。不要让用户补充更长提示词来代替标准。


## 嵌套模态与第三方确认

0.8.1 本地候选提供 document 级模态所有权域。PnwAppModalOverlay 与 PnwChoiceDialogHost 自动注册；全局 ChoiceDialogHost 每个应用只挂载一次。层级由存活模态的 baseZIndex 下限及打开顺序计算，不以固定值强行覆盖宿主，也不扫描第三方组件私有 DOM。只有顶层响应 Escape、Tab 和焦点限制；关闭顶层后焦点返回仍存活父窗的触发元素。父所有者释放时，子确认取消并结算 Promise；ChoiceDialogHost 卸载也取消待决请求。

第三方弹窗通过公共 pnwGetDocumentModalStack(document).register(options) 对接。options.element 返回调用方拥有的模态内容根（没有可聚焦控件时提供 tabindex=-1）；baseZIndex 包含实际遮罩层级。onChange({ zIndex, isTopmost }) 同步第三方遮罩/弹窗的公开 z-index 配置，并暂停非顶层的独立焦点限制。onClose(reason) 请求关闭宿主，reason 为 escape 或 owner-disposed。返回的 PnwModalLayer 提供 state、disposed、focus()、updateBaseZIndex(value)、dispose()；关闭或卸载时幂等释放，不在 Vue 响应式回调中重复注册同一所有者。

pnwPromptChoice({ parentLayer, ...request }) 可显式关联该父所有者；省略时使用子模态注册时当前 document 的顶层。父句柄必须属于同一 document 且未释放；调用方如需动态改变基础层级，使用 updateBaseZIndex。第三方独立 Escape 处理应停用，由公共 onClose 接收顶层关闭；backdrop 关闭和焦点恢复也应尊重 isTopmost，避免后方宿主关闭抢焦点。

无法通过公开接口暂停第三方 focus trap 时，注册 options.childContainer: () => ownedContainer，容器由调用方在父弹窗插槽内建立。Wing 子模态 Teleport 到它，使其焦点仍属于父框架允许范围，同时顶层模态栈接管子确认的 Tab/Escape。容器必须位于父焦点范围内，不得带裁剪、transform、独立 stacking context 或额外模态遮罩；不要将非顶层父容器设为 inert/aria-hidden，否则会一并禁用其中的子模态。父窗进入动画结束后注册，再允许发起子确认。

示例 /?example=modal-stack 演示 Wing modal → choice 和真实 Element Plus ElDialog → choice。第三方示例使用调用方插槽中的 div ref、公开 z-index 与 close-on-press-escape 配置，不依赖组件内部类名或私有 focus-trap 实例。采用 body Teleport 时，宿主负责暂停第三方独立 trap；采用 childContainer 时，宿主负责容器的布局与焦点范围。未注册且保持独立 focus trap 的第三方弹窗不保证兼容，iframe/跨 document 与浏览器原生 top layer 不在此模态栈内。


模态遮罩、面板与确认按钮拥有自身 border-box 及宽度约束，不要求宿主设置全局 reset。/modal-sizing.html 为无 reset 的独立回归入口，覆盖 390×844 窄屏与 916px 对照。替换 pnwPromptChoice 请求时旧请求按现有约定取消，新请求重新注册父所有者和子容器；释放旧父不会关闭已转属新父的确认。
