# Phoenix Wing 当前路线

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.6.x

`0.6.0` 已完成锁步发布、归档、主分支合并与标签封存；`0.6.1`、`0.6.2` 与 `0.6.3`
均已完成 12 个 npm 发布单元的锁步公开发布和 Registry 干净消费验收。根 Vue/UI 包
`0.6.4` 正在准备兼容候选，统一 Primary Section 的 VS Code 风格左侧折叠箭头；
稳定 scoped 包保持 0.6.3。后续 patch
继续只实施经真实 consumer 证明的兼容修复；消费者仍以各自 manifest 中的已发布
精确版本为准。

最后核验：2026-08-10

## 已完成基线

- 八个 npm 发布单元已在 0.4.3 锁步公开发布；聚合包 Registry manifest 仅引用精确的 0.4.3 内部依赖，不含 `workspace:`、`link:` 或 `file:`。
- 注释标签 `0.4.3` 已封签到最终候选 `5211504` 并推送远端；Auto Code 0.5.1 与 Auto CAD 0.1.0 曾完成 Registry 消费、Marketplace 公开发布与人工审查。
- `code-core`、`kt-codegen`、CAD contracts/core、workspace schema、Node DB adapter 和 Rust source 已有真实消费者。
- Auto Code/Auto CAD、Desk Tools 与 Open Issue 均从 Registry 消费 Wing；各仓不使用相邻目录 override，当前精确版本由各自的 manifest、lockfile 和依赖门禁维护。
- 完整 workspace 测试、类型检查、release matrix、TypeScript/Rust tarball smoke 已进入 `pnpm verify:ci`。
- 聚合 UI 编译入口、跨宿主契约、两项纯能力 fixture 与消费者验证均已进入制品门禁；0.4.2 归档、Registry 和七个消费者结果见[《0.4.2 本地候选与公开发布验收》](0.4.2发布候选验收.md)。
- 大型 UI 分阶段拆分已经启动；Wing 的 `KtCodegenTable` 首轮治理已完成：领域编辑在 Core、布局与动作投影在无 DOM ViewModel、主题/滚动视觉规则在内部 Style，Web Component 保留单一 DOM renderer、焦点/事件接线与 Host 事件投影；`contained|page` 布局和公共 disclosure 属性/事件已经落地，公共 tag、数据方法和 browser 子路径保持稳定。

旧 Phase 1–9、框架迁移、组件改进、多包迁移和单 block 迁移文档是实施证据，不再承担当前操作指导；分类见 [`document-manifest.json`](document-manifest.json)。

## 当前优先级

1. **[已完成：0.5.0 锁步发布]** 新增 Git/Run 四个发布包，并纳入 KtCodegen Workbench UI 与 CAD FCStd BOM XML 能力；12 个发布物已统一提升到 0.5.0，完成全量门禁、中文提交、pnpm 发布与 Registry 干净消费。下一步依次升级 Auto Code 0.6.0 和 Desk Tools；Open Issue 本轮不动。
2. **[已完成：核心平台基线]** Apply、UUID/GUID、workspace path、32 个 Renderer family、跨宿主 golden fixture、聚合 UI 单出口与 AST/import graph 均由 Wing 保持真源，Auto/Desk/Open Issue 已通过 Registry 0.4.2 验证；原八条重复完成项合并由本条追踪。
3. **[已完成：0.4.3 功能范围]** Marker 在下一 Start/End 边界恢复并输出结构化诊断；仅 `missing-end`/`orphan-end` 时可安全应用其余完整区域；`KtCodegenTable` 已完成 ViewModel/Style 分层、`contained|page`、disclosure 与高对比选中态治理，公共入口保持兼容。
4. **[进行中：PnwEditorDrawerHost 第二消费者验证]** Wing 已公开发布 `PnwEditorDrawerHost`、关闭守卫契约与单元测试。下一步由 Phoenix Open Issue 使用已发布的 `phoenix-wing@0.5.1` Registry 包，在 Issue 新建/编辑场景完成第二个真实消费者验证；验证完成后再判断公共契约是否稳定。

   - [x] 定义 `view/create/edit` 模式、可选标题/工具/页脚插槽、加载状态、左右停靠、宽度与移动端响应式回退。
   - [x] 定义 dirty 状态、同步/异步关闭守卫、防重复关闭请求、Esc/遮罩关闭和 Element Plus 焦点行为。
   - [x] 定义工作台身份：`editorId`/`pageId`/`tabId`/`resourceKey`，状态仍由各消费者逐实例持有，避免 Host 形成第二份业务状态。
   - [x] 业务表单、DTO、API、权限判断和领域校验留在消费者；Wing 只提供容器、生命周期契约、插槽和状态事件。
   - [x] 首个真实消费者已完成两处抽屉的本地候选验收；其业务表单保持在消费者仓库，Wing 只维护容器与契约。
   - [ ] Phoenix Open Issue 以 Issue 新建/编辑场景作为第二个真实消费者，精确使用 Registry `phoenix-wing@0.5.1`；复用抽屉契约但不共享业务表单。
   - [ ] 在 Open Issue 完成 Registry 验证后，检查 dirty 关闭保护、多 Tab 状态隔离、独立路由回退和键盘操作，再决定是否宣布公共契约稳定。

5. **[已发布 0.6.0；继续验证：Pnw Web 工作台]** W0–W3 的仓内架构、fixture、视觉与交互增补已完成并进入 `phoenix-wing@0.6.0`；后续消费者适配和 W5 研究不回写产品结果矩阵。执行边界见[《Pnw 工作台 Web 双消费者验证计划》](Pnw工作台Web双消费者验证计划.md)，架构结果见[《Pnw 工作台 Web 架构与示例计划》](Pnw工作台Web架构与示例计划.md)。

   - [x] 记录增补需求与边界：SVG 品牌真源归 Wing，图标资源只接纳至少两个 Web 消费者共有的壳层动作。
   - [x] 完成 Admin Host、BOM Studio、Open Issue、Desk Tools 图标用法盘点，记录设置、折叠、面板、关闭/更多及六类导航动作的重复证据；产品/领域图标不迁入。
   - [x] 建立 `PnwIcon` 公共矢量 catalog，替换 Wing/fixture 内联重复；消费者业务仓只记录后续迁移点，不在本任务改动。
   - [x] 将高层 Ribbon 外观整理为“大 Ribbon / 紧凑工具条”两类同形嵌套设置；共用一个数据类型，各自保存状态，紧凑模式使用时忽略分组标签。
   - [x] 紧凑工具条高度只跟随 16/24px 图标收缩为约 28/34px；Title 仅横向呈现，不改变同尺寸工具条高度。
   - [x] Header 一级大分组只投影当前分组的 Ribbon 内容；移除重复的竖排模块名，以 `3px` 非交互句柄分隔当前分组内模块。
   - [x] fixture 演示将包含 Open Issue 的“问题跟踪”小模块整体移入工作空间和恢复默认布局；默认树、当前树与持久化继续由宿主负责，公共拖拽协议留待 W4 双消费者确认。
   - [x] 工具树提供受控目录/Activity Rail 双态，Rail 复用原末级节点并以图标或标题首字呈现。
   - [x] 设置入口改用可移动 modeless 面板；位置由宿主/fixture Pinia 受控，Wing 纯函数负责越界修正且不持久化偏好。
   - [x] 将设置收紧为 420px 单列折叠检查器并限制高度滚动；Header 一级分组支持节点短标签、紧凑间距和受限区域横向滚动，7–8 个分组不挤占页面标签。
   - [x] 将大分组与小模块归属从浮动外观面板拆到“系统 / 工作台配置 / 导航布局”第一方 fixture consumer View；使用可折叠分组表格、移动下拉、内置/自定义分组、新建/删除、全名/简称/顺序编辑与分层恢复，Wing 不新增产品管理协议。
   - [x] 保留 Ribbon 右侧内置 `…` 与 Tree 底部显示入口；快捷菜单使用单行 PnwIcon 预设，“完整显示设置…”打开 Wing 公共可移动对话框。consumer 可追加 action 信号和对话框界面 slot，但不复制公共表单；Header 右侧只暴露 consumer action slot。
   - [x] 将完整显示设置提升为 `PnwWorkbenchShell` 第一级单一实例；切换 Ribbon / Tree 不再因子树卸载而关闭设置面板。Tree 两轴外观与 View 标签四个位置在同一配置中心受控，consumer 通过底部 slot 和公共折叠段追加自己的界面。详见[《可扩展的工作台显示配置中心》](Pnw工作台Web可扩展显示配置中心.md)。
   - [x] fixture Pinia store 持有当前布局并导出版本化纯数据偏好（自定义分组、模块归属/排序）；以独立 localStorage key 演示刷新恢复、损坏快照与基础版本变化回退。整棵导航树及 Vue 图标不序列化，真实消费者可改接 Admin 后端数据库。
   - [x] 无打开 View 时 Header 不再保留空页签带，右侧操作区仍贴齐；Wing 不自动打开默认页或决定空编辑器内容。
   - [x] 只读核对 Admin Host、BOM Studio、Open Issue、Desk Tools 的入口装配，增加受控 `PnwWorkbenchShell` 与旧 `PnwRibbonTabDef[]` 导航投影；fixture 的 `App.vue` 收敛为一个壳层引用，Router、权限、页面注册和持久化仍归宿主。
   - [x] 将 Primary / Editor / Secondary / Bottom 收敛为一个受控 `PnwWorkbenchLayoutState`；三个显式 separator 更新宿主持有的宽高，Bottom 只从顶边调高，不再暴露浏览器右下角 resize。
   - [x] Bottom Panel 支持消费者控制的多 Tab；fixture 演示问题/运行日志，Desk Tools/Admin 的面板注册和内容生命周期仍留在产品 adapter。
   - [x] Shell 增加可覆盖的 Phoenix 默认品牌和空 View；关闭最后一个页面标签会移除旧 View，消费者可替换空状态。示例设置、Editor 和 CSS 已从原千行 `App.vue` 拆分。
   - [x] 对照 BOM Studio 与 Desk Tools 的页面级 Primary registry，提炼 consumer 隔离的泛型 View contribution 生命周期；`PnwWorkbenchShell` 可动态装配当前 View 的三个 Block。`PwwWorkbenchWeb` 的 App 不再内置 Block 内容或展开三十余个 controller 变量，示例实现统一隔离在 `src/fixture/PwwFixture*`。
   - [x] 形成 Phoenix Admin 渐进适配映射：沿用 Admin 的权限菜单、Router、process/keep-alive 与 Pinia/后端持久化，只用薄 `Pah*` adapter 投影导航、Tab、布局和 Bottom contributions；本轮不改 Admin。
   - [x] Open Issue 已在独立分支完成第一轮本地 Wing 壳层接入、Footer/Bottom 与快捷显示设置验证，manifest 和 lockfile 仍保持 Registry 精确依赖。
   - [x] Footer 的 Primary / Bottom / Secondary 三个固定入口不再随 View contribution 隐藏；没有解析后内容时原生禁用并提示原因。`PnwWorkbenchLayout` 默认保留 Footer，consumer 仅可通过 `showFooter = false` 显式关闭。
   - [x] Footer 三个入口增加公共 on/off SVG 对：原 `panel-left / panel-bottom / panel-right` 保持轮廓兼容，新增对应 `-active` 名称并用 `currentColor` 填充左、下、右区域；Footer 按 contribution 与 visibility 选择图形，disabled 始终保持 off。on 不再产生常驻按钮底块，只有 hover 瞬时背景和 `focus-visible` 焦点环。
   - [x] `0.6.1` 候选增加应用级 `defaultBottomBlock` 分层：当前 View 的专用 Bottom
     优先，缺失时自动回退应用默认内容与 tabs；默认层使 Footer Bottom 在空 View、
     Dashboard 和普通页面保持可用，切页不改受控显隐与高度。Primary/Secondary
     继续由当前 View 决定，0.6.0 的 View Bottom、`bottomTabs` 与 slot 入口保持兼容。
   - [x] 2026-07-31 按锁步矩阵公开发布根包与 11 个 scoped packages 的 `0.6.0`；全部 `latest`、tarball 干净安装、可选 peer 补齐后的公共根入口及 `PNW_VERSION` 回归通过。详见[《0.6.0 发布验收》](0.6.0发布验收.md)。
   - [x] Open Issue 以 `2e900ad` 将 Wing 的 `light / dark / system` 真正同步到应用根与 Element Plus；Registry 141 项、LOCAL 144 项及完整 local-Wing build 通过。Desk 以 `81fdb7b` 修正 AppShell 自身不能 inject 自己 provide 的 Bottom context，并保留后代无参注入路径。
   - [x] 完成 0.6.0 候选后的 Desk Tools、Function Develop、KT BOM Studio 只读接入审计；新增 API 均不要求三个 0.5.1 消费者立即改动。Desk/BOM 等正式发布后走单一 Shell adapter，Function 随 Admin 迁移；未发现需要继续扩展的公共字段。详见[《扩展消费者接入审计》](Pnw工作台Web扩展消费者接入审计.md)。
   - [x] Open Issue 在 `023fa9b` / `4fb5611` 补齐完整显示偏好、稳定空态和真实页面级 View contribution；完整 `verify:local-wing` 已覆盖 LOCAL 140/5、9 项生命周期/窄屏定向测试及 core/server/Web 构建，Web 转换 3453 个模块；Registry 对照为 138/7。
   - [x] Phoenix Admin 从原 dirty HEAD 建立隔离 `codex/pnw-workbench-shell`，以 `d06b873` 完成 `Pah*` 权限导航投影、v3 偏好与 Shell；26 项测试、聚焦类型和 2731 模块构建通过，原 staged EPS 状态未动。classic/hybrid 的有后端浏览器 smoke 仍属发布前回归。
   - [x] 比较 Open Issue/Admin 未发现新的导航、Shell 或 Block 字段；真实 Desk 接入只证明 `usePnwDocumentTitle` 应接受只读 `MaybeRefOrGetter`，已在 Wing 最小修正并补测试。BOM Studio 仍待 C1 针对性接入，契约冻结和发布决定不提前。
   - [x] Desk Tools 在 `codex/pnw-workbench-060` 的 `8fa3d47` 保留现有 `NavItem`、KeepAlive、Tab/dirty/session 与业务 Primary/复合 Secondary/Bottom，通过薄 adapter 接入同树导航和显示偏好 normalizer；`abd5515` 固化 Ribbon 去重契约。完整 `test:local-wing` 通过 Web 76/413、Server 68/258、core 11/67，`build:local-wing` 通过 Web 2449 模块与 Server sidecar。
   - [ ] KT BOM Studio 先补不污染 manifest/lockfile 的 local-Wing resolver，再以单一 Shell adapter 接入同树导航、Tab、Primary contribution、Footer 和显示偏好；现有 `tree` HEAD 领先远端 4 个布局提交，必须从该干净基点另建适配分支。
   - [x] 2026-07-29 完成四消费者命令级基线并关闭三条实际适配验证：KT BOM Registry 全量 385 项测试与构建通过；Desk/Open Issue 的 local-Wing 完整测试与生产构建通过；Admin 在隔离 worktree 通过 26 项测试、聚焦类型和 2731 模块构建，原工作区 EPS 暂存状态未动。除 `usePnwDocumentTitle` 的只读响应式输入外，未发现 Wing 公共 API 缺口。
   - [x] 将窄屏定义为 Workbench 自身容器宽度不超过 `840px`，优先覆盖工程师常用的平板竖屏、半屏窗口与嵌入分栏。框架把当前有效呈现切为 Ribbon，把 Header 内 View 标签临时按 `after-navigation` 放置，并将 Primary / Editor / Secondary / Bottom / Footer 纳入同一纵向内容滚动流；显式 `editor-bottom` 标签仍位于 Bottom 与 Footer 之间。consumer 保存的 Tree、标签位置与面板尺寸不被改写，恢复宽屏后自动还原。
   - [ ] 中等宽度但多个可见侧 Block 使 Editor 实际宽度不足时，先由当前尺寸钳制保证 `320px` Editor；待 Open Issue / Admin 复盘真实阈值后，再决定是否自动进入纵向流，避免临界宽度在四区与纵向布局间振荡。
   - [ ] 手机完整体验降为后续项：参考 Cool Admin 等真实移动端消费者，验证触摸一级菜单、软键盘、安全区、手势和更小断点；当前 0.6.0 候选只保证窄容器结构完整可滚动，不增加手机模式配置。
   - [x] W5 完成 View 标签栏在 Header、导航后/Editor 顶部与 Editor 底部的受控位置；“导航前”因割裂 Ribbon 已删除，同一 TabBar 不因位置切换复制或改变 View 生命周期。
   - [x] W5 导出完整显示偏好默认值与 `pnwNormalizeWorkbenchDisplayPreferences`；设置窗口位置由 Shell 受控，fixture 作为 consumer 使用 Pinia + localStorage 验证刷新恢复，Wing 不选择持久化介质。
   - [ ] W5 下一步提供可取消的布局编辑 overlay。Activity/标签移动先行，任意 Block 拖动须先证明 Vue 实例不重建。见[《动态布局与拖动可行性》](Pnw工作台Web动态布局与拖动可行性.md)。
   - [x] W5 已将 fixture 的文章式 Bottom 改为 VS Code 类紧凑 `PnwProblemsBlock / PnwLogBlock`，并提炼实例级有界诊断总线、owner 问题快照与过滤纯函数；`PnwShellLogPanel` 保持兼容。Log 已有三个 Web 证据，Problems 契约在 Admin 或第二真实消费者完成前继续标为实验性，不增加全局 singleton 或 Router 语义。见[《问题与日志 Block 方案》](Pnw工作台Web问题与日志Block方案.md)。
   - [x] W5 统一业务 View 内部 Header：fixture 删除重复的 `PwwFixtureViewHeader`，直接使用 Desk Tools 与 Open Issue 已消费的 `PnwPageHeader`；新增可选 eyebrow、summary、description 和窄容器 actions 排布，旧 `title / subtitle / actions / help` 入口保持兼容。
   - [x] `0.6.2` 根据 Open Issue、BOM 与 Cool Admin 真实页面证据，由 `PnwWorkbenchLayout` 原生提供 Primary 展开/收起入口：仅在当前 View 的 contribution 与 slot 同时可用时显示，复用受控 `PnwWorkbenchLayoutState.visibility` 和既有 Block toggle 事件；按钮固定在 Editor Header 左侧，使用既有 `chevron-left / chevron-right` 原位切换。`PnwPageHeader` 只在 Primary 可用时自动保留前导位；旧式自定义 Header 由 Layout 自动获得 40px 兼容 rail；无 Primary 不留空槽。见[《Primary 展开与恢复开关》](Pnw工作台WebPrimary悬浮开关.md)。
   - [x] `0.6.2` 增加 `PnwPageLayout / PnwPageMainBlock`：结构 wrapper、Header 外部 inset 与承担滚动的 `.pnw-page-layout-body` 均为 0；默认插槽由无业务 provider 的 MainBlock 承载 10px，普通 raw table/表单无需逐页写 padding，已有完整卡片或 Cool `.cl-crud` 则用 `bodyInset=false` 避免叠加。Primary 与 Editor 紧凑 Header 共用默认 `40px` 高度。根据 BOM 真实消费，将单行 `PnwPageHeader` 默认纵向 padding 收敛为 3px，使常见 32px Host 操作按钮不再把 Header 撑到 49px；富摘要 Header 仍按内容增高。text/muted/border fallback 补齐 canonical dark default token，修复 Host 未显式覆盖 alias token 时暗色标题落到浅色常量。见[《页面布局与 Header》](Pnw工作台Web页面布局与Header.md)。
   - [ ] `0.6.2` 发布后继续支持 Function 真实项目与列表页使用 `PnwPageLayout / PnwPageMainBlock`：在正式 Registry 依赖下复核 Header/Body 为 0、默认 MainBlock 为 10px、Primary 开关不覆盖标题，并覆盖亮暗与 720/1440 宽度。该项属于消费者项目适配与发布后回归，不是 Wing 0.6.2 发布硬门禁；不得为 padding 引入 Cool CRUD provider 或产品级 Wing 定位覆盖。
   - [x] `0.6.2` 以 BOM Primary 为金样本增加 `PnwPrimaryPanel` 与 `PnwPrimarySection`：Panel 关闭 Sidebar body inset 并保持满宽、零 gap、可滚动；Section 默认可折叠，支持受控/非受控状态、actions/suffix/body slots、原生键盘与 `aria-expanded`，冻结 28px 标题条、`4px 8px` padding 和 120ms caret 动画。Open Issue、Function 与 BOM 只保留业务字段、动作、排序和持久化；见[《Primary 面板与 Section》](Pnw工作台WebPrimary面板与Section.md)。
   - [ ] 基于 BOM `/bom-studio/parts` 的可用样本评估可选紧凑 Editor CSS preset：只定义 inline/block inset、surface radius 与 surface tone 的 Pnw 语义 token/原语，不选择亮暗主题；Host 负责主题选择与持久化，产品逐页显式选择 preset。待 Issue、BOM、Function 三方宽窄屏及明暗证据一致后，再决定是否成为推荐默认；不得吸收产品 contribution、字段或动作模型。
   - [x] `0.6.2` 增加统一 Teleport 浮层主题根：`pnwApplyColorScheme` 把 Host 的解析后 scheme 传播给 `PnwOverlayThemeProvider`，Choice Dialog、通用 Modal、Floating Panel、Tree flyout 与异步任务浮层共用 canonical light/dark token；Element Plus 的 `html.dark / --el-*` 继续由 Host adapter 持有。见[《浮层主题契约》](Pnw工作台Web浮层主题契约.md)。
   - [x] `0.6.2` 为 `PnwFloatingPanel` 增加可归一化的 viewport 安全区域；完整/快捷显示设置自动测量同一 Workbench Header，受控旧坐标、拖动和 resize 均夹到 Header 下方，长内容按剩余高度滚动。浮层仍保持 `floatingPanel < hostTools` 层级，不遮挡 Host 用户与语言工具。
   - [x] `0.6.2` 修正聚合包入口：Vite 只收集会 emit JavaScript 的 `.ts` 与 Vue 组件，九个纯类型模块只由 `vue-tsc` 生成 `.d.ts`，构建不再产生 `Generated an empty chunk`；`./types/*` wildcard 收紧为类型专用，唯一含运行时逻辑的 `PnwRibbonConfig` 保留精确 import 子路径，聚合 dist 与干净 tarball consumer 同时验证类型和运行时解析。
   - [x] `0.6.1` 恢复受控 Editor 最大化：Shell/Layout 使用瞬时 `editorMaximized`，TabBar 提供最大化/还原且 Escape 退出；Header placement 退化为只含同一 TabBar 的还原条，其他壳层区域隐藏，Router/Process/KeepAlive、显示偏好和面板尺寸不被改写。
   - [x] `0.6.1` 增加 Host 驱动 `zh-CN / en-US` 工作台文案、TabBar 的刷新当前/关闭其他通用动作，以及 `floatingPanel < hostTools < modal` 公共叠层契约；语言持久化、标签行为和产品链接继续由 Host 持有。详见[《Editor 最大化、标签动作与国际化》](Pnw工作台Web编辑器最大化与国际化.md)。
   - [x] `0.6.1` 增加规范 `PnwIconId`、保留 `pnw` namespace、Host 白名单注册、
     `PnwIconRenderer` 与未知 ID 可见 fallback；新 manifest/DTO 必须显式写
     `pnw:*` / `cool:*`，裸名称与旧 pageId/Component 仅作运行时兼容。详见
     [《工作台 Web 图标契约》](Pnw工作台Web图标契约.md)。
   - [x] W5 将 fixture Editor 拆成摘要、目录、Codegen、检查和 Issue 五类真实工程 View；每类直接组合同一个 `PnwPageHeader`，Codegen 示例提供文件摘要、预检/Apply/保存动作与独立页内工具条，点击动作由 consumer controller 接收，不新增公共命令协议。
   - [x] W5 在 `tree` 呈现内实现 `outline / admin-menu` 展开外观与 `leaf-rail / root-flyout` 收起外观；四种组合独立受控并共享导航树、active 与 expanded，共享 resolver 剪掉 hidden 空目录。Router、权限 code 和后台菜单字段未进入 Wing。
   - [x] Wing 已统一 `root-flyout` 的桌面时序：精细指针 `280ms` 首开、`120ms` 跨一级分组切换、离开安全区 `280ms` 关闭；触摸只使用 click，键盘立即操作且关闭后恢复触发项焦点；窄屏由壳层统一使用 Ribbon，不再单独扩展 Tree drawer。见[《侧目录外观可行性》](Pnw工作台Web侧目录外观可行性.md)。
   - [ ] Open Issue / Admin 继续用真实导航树验证 `root-flyout` 菜单密度、权限剪枝、触屏和浏览器焦点；该项是消费者验收，不再扩展 Wing hover timer 或 Tree drawer API。
   - [x] 通过单元测试、typecheck、build、文档门禁，并在内置浏览器验证 light/dark/custom、桌面/窄屏和 `16/24/36/48/64px` SVG 清晰度。
   - [x] `0.6.1` 的代码、tarball 与真实 Host 候选验收通过，8 月 1 日的四条本地提交合并为一条；8 月 2 日更新 npm Token 后按依赖顺序发布 11 个 scoped packages 和根包。12 个 `latest` 均为 `0.6.1`，无相邻源码的 Registry 安装、精确内部依赖和公共入口 smoke 通过。详见[《0.6.1 发布验收》](0.6.1发布验收.md)。
   - [x] `0.6.2` 于 2026-08-04 按依赖顺序公开发布 11 个 scoped packages 和根包；12 个 `latest` 与精确版本均为 `0.6.2`，公开依赖无本地协议，全新 Registry cache 的隔离消费者通过 `PNW_VERSION`、Workbench/Output 与 SQLite smoke。本次未 push 或创建/推送 Git tag。详见[《0.6.2 发布验收》](0.6.2发布验收.md)。
   - [x] `0.6.3` 修复 Git 群消息简报丢失 commit body：subject 与完整 body 之间固定一个空行，只归一化换行并裁剪正文首尾，保留正文内部空行、列表和顺序。权威测试覆盖 Open Issue `b245527` 的五条正文；用户已用 `phoenix-function-develop@2f32a48` 在 KT Auto Code Extension Host 完成真实剪贴板验收。见[《Git 群消息简报完整正文修复》](Git群消息简报完整正文修复.md)。
   - [x] `0.6.3` 增加纯 Core 的 `PnwGitLazyHistoryState`：更多 commit 默认收缩且不产生 page request；每次从收缩变为展开都按当前游标规划下一条，同一次展开不重复，保持展开时只允许下一条/下 5 条；page 合并拒绝 stale HEAD 与重复 OID。Auto 只在收到 request 时调用现有 `pnwReadGitCommitPage`，UI、AbortController 和持久化仍归 Host。见[《Git 轻量仓库读取与 OID 分页计划》](Git轻量仓库读取与OID分页计划.md)。
   - [x] `0.6.3` 于 2026-08-09 按依赖顺序公开发布 11 个 scoped packages 和根包；12 个 `latest` 与精确版本均为 0.6.3，公开内部依赖精确，隔离 Registry consumer 通过 Workbench、Git 正文/懒历史与 SQLite smoke。本次未执行 Git push 或 tag。详见[《0.6.3 发布验收》](0.6.3发布验收.md)。
   - [ ] 根 `phoenix-wing@0.6.4` 兼容候选将 `PnwPrimarySection` 折叠箭头统一到标题左侧，保持收起向右、展开向下、键盘与 aria 契约不变；本轮不升级 11 个未变化 scoped packages，发布前仍需完成全量门禁和 Registry 干净消费。详见[《0.6.4 发布候选》](0.6.4发布候选.md)。

6. **[已发布：Git 轻量仓库读取与 OID 分页]** `0.6.0` 已公开提供 `pnwReadGitRepositorySummary`、`pnwReadGitCommitPage` 和 read-only `AbortSignal`。commit 数据每页只执行一次 NUL 分隔 `git log`，summary 不读取 status、operation、remote reachability 或全部 refs；完整 `pnwReadGitRepository` / `pnwAnalyzeGitSquash` 继续承担 squash 安全预检。详见[《Git 轻量仓库读取与 OID 分页计划》](Git轻量仓库读取与OID分页计划.md)。具体消费者是否升级由其仓库独立决定。

7. **[兼容冻结：CAD Rust source]** `@phoenix-wing/cad-rust-source` 在 0.6.2 继续作为
   既有锁步发布单元，保持 tarball、协议和无安装期编译门禁；在维护所有者与真实消费
   支持重新明确前不再增加功能，也不推荐新消费者接入。0.6.2 只修正 npm package、
   source manifest、`fcstd-query` crate 与 Cargo lock 的发布身份一致性；删除包或 npm
   deprecate 必须另行决策，不混入兼容发布准备。

Auto Code 已随 0.5.1 接入 `KtCodegenTable` 的 page/disclosure API；下一优先级是 Desk Tools 的 Registry 0.4.3 升级与消费验收。Windows NSIS 回执由用户手工并行，不阻塞本阶段代码目标。

后期条件 TODO：只有出现第二个 DOM renderer/消费者，或出现可复现的渲染、焦点、dirty 事件维护缺陷时，才继续提炼 DOM renderer / action adapter。当前 577 行 Web Component 剩余职责内聚，继续为降行数拆分会增加焦点、折叠和事件顺序风险。

大型 UI 拆分不改变 0.4.x 公共兼容门禁：Registry 消费、发布客户端限制、tarball、公共协议与真实宿主行为必须持续通过。

## 变更规则

- 公共能力必须先有第二个真实消费者或明确的跨宿主契约。
- 0.6.4 起默认按包独立版本；`release-matrix.json` 分别维护每个发布物的精确版本与协议。没有源码、公开 API、制品或依赖变化的包不得空升 patch；详见[《独立版本发布规则》](独立版本发布规则.md)。消费者当前精确版本由各消费仓库维护，不在 Wing 中复制。
- 测试数量和 bundle 大小由 CI 产出；当前文档只描述门禁范围，不手写易漂移计数。
- 完成态计划转为 archived；被新真源替代的文档标为 superseded，并保留跳转关系至少一个发布周期。
