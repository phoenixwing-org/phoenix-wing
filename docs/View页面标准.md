# View 页面标准

状态：0.7.6 已发布 Registry；本仓示例、实际 tarball 与隔离正式包回归见 [0.7.6 发布回执](releases/0.7.6发布候选.md)。后续专项点检仍按下文单独记录。

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

使用 `PnwWorkbenchLayout`（或宿主已有的 `PnwWorkbenchShell`）、`PnwPrimaryPanel`、`PnwPageLayout`。Primary 放属性与筛选；页头放标题及操作；正文使用 Wing Block。宿主已有布局时不再嵌套第二套 Workbench。

`PnwPageLayout` 负责满高页面、页头与正文滚动。Primary 切换由 Workbench 提供，不复制按钮，不隐藏原生开关或清零标题避让空间。

## 标准 B：可浮出完整 View

沿用同一 Workbench，在稳定 View 宿主使用 `PnwViewPresentationPortal`。`contentLayout="page"` 将页头与正文滚动分离，默认 `flow` 保留旧行为。显式 Header 插槽模式需传入 `presentationDetachable`、mode 和动作；使用 header channel 自动贡献时将 `PnwPageHeader` 放在 Main 内，不要重复放到 Header 插槽导致贡献递归。不要把本地能力描述为旧 Registry 已支持。

公共入口示例：`examples/PwwWorkbenchWeb/src/page-layout/Page.vue`。构建当前 checkout 后运行示例，访问 `/page-layout.html`。统一 Router 宿主需要 header channel 的用法见 [完整 View 方案](Pnw工作台Web完整View浮出与收回方案.md)。

## 必须点检

### Header 业务插槽

推荐 `#center` 放搜索、筛选和配置，`#right` 放保存、刷新等业务工具；两者可同时存在。
未传 `#center` 且没有旧中间插槽时，中间容器和列均不存在，不挤占标题与右侧空间。
框架浮出/收回按钮独立于业务插槽，始终位于最右列。浮窗外框的收回按钮也不由业务覆盖。
`PnwPageLayout` 透传这两个插槽。旧 `#actions`、`#help` 与 `actionsAlign` 保留原行为，
仅作过渡兼容；确认依赖支持后应尽快迁移，新页面不要继续使用旧插槽。

新旧插槽并存时，center 控件不参与 flex 压缩，最大宽度受中区约束；超出内容在中区横向滚动，
Tab 焦点可进入旧操作与帮助。不能把搜索框压成细线，也不能挤走 right 或最右框架动作。

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
