# Pnw 工作台 Web · 扩展消费者接入审计

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.0（已发布）

最后核验：2026-07-31（发布后静态审计）

## 1. 结论

W0–W3 与本地候选验证完成后，Wing 0.6.0 已于 2026-07-31 公开发布。发布后静态复核确认：Open Issue、Phoenix Admin、Phoenix Function Develop 与 KT BOM Studio 的 manifest 已精确升级到 Registry `phoenix-wing@0.6.0`；Desk Tools 仍精确锁定 `phoenix-wing@0.5.1` 和六个 `@phoenix-wing/*@0.5.1`，只在 `codex/pnw-workbench-060` 分支通过进程级 resolver 消费并列 Wing 0.6.0 源码。

Open Issue、Admin、Desk、Function 与 BOM 均已有 `PnwWorkbenchShell` 真实接线，但收敛程度不同。BOM 和 Function 已删除第一批旧壳文件；Desk 的旧 Toolbar/Ribbon/Tab 文件仍形成无生产入口的封闭引用簇；Open Issue 与 Admin 在本次审计时分别有活动 Codex 任务和未提交改动，当前不得进入清理。发布后统计、问题和删除候选见第 9 节；以下第 3–5 节继续保留 2026-07-29 本地候选阶段的基线与回执。

审计同时确认，现有公共契约已经覆盖下一步共同接入缝，不需要为了三个消费者继续扩充公共数据结构：

- 宿主菜单、权限和页面注册表投影为一棵 `PnwNavigationNode[]`；
- 当前页面的 Primary / Secondary / Bottom 投影为实例级 View contribution；
- 宿主偏好投影为受控 `PnwWorkbenchLayoutState`、Tree/Ribbon 外观和 Tab 位置；
- 公共显示字段可组合为 `PnwWorkbenchDisplayPreferences`，从任意介质读入后调用 `pnwNormalizeWorkbenchDisplayPreferences`；
- Router、Tab session、dirty 关闭、业务日志、权限和持久化继续留在宿主。

## 2. 接入矩阵

| 消费者 | 当前接入 | 0.6.0 发布后状态 | 本轮决定 |
|---|---|---|---|
| Open Issue | `legacy` 已用 `PnwWorkbenchShell`、实例级 View registry 和页面 contribution；根 `AppShell.vue` 仍保留应用级 Bottom 的兼容写法 | manifest 已精确升级到 0.6.0；当前有活动任务修改业务功能和 `AppShell.vue` | 等活动任务完成后再采用 `defaultBottomBlock` 收敛根壳，不并行清理 |
| Phoenix Admin | `PahWorkbenchShell` 已接入 `PnwWorkbenchShell`、同树导航、显示偏好与 View registry；Cool classic/hybrid 入口继续保留 | manifest 已精确升级到 0.6.0 | Cool 遗留只列清单，不进入直接删除候选；后续单独讨论迁移策略 |
| Desk Tools | `codex/pnw-workbench-060` 已用 `PnwWorkbenchShell` 接管外壳；自有导航、Tab、Primary/Secondary/Bottom、Footer 与后端布局偏好保留 | manifest 仍为 0.5.1；本地 0.6.0 适配已提交 | 先升级 Registry 精确依赖并修复巡游锚点，再删除 11 个旧壳文件 |
| Function Develop | `develop` 已用 `PnwWorkbenchShell`，删除旧 Toolbar/Ribbon/Output 外壳并升级精确依赖 | manifest 已精确升级到 0.6.0 | 下一步删除 Editor 内第二套 `el-tabs`；`PhoenixPage` 兼容层按页面迁移，不整文件先删 |
| KT BOM Studio | `tree` 已用 `AppWorkbenchShell` 薄装配 `PnwWorkbenchShell`，删除旧 Header/Ribbon/Tabs/Content 与对应 CSS | manifest 已精确升级到 0.6.0 | 继续收敛 `KtDataPageLayout` 页眉和模块级 Primary registry，不重复拆壳 |

Open Issue 与 Phoenix Admin 作为 W4 主证据单独维护在[《双消费者验证计划》](Pnw工作台Web双消费者验证计划.md)和[《Open Issue 应用分析》](Pnw工作台Web-OpenIssue应用分析.md)。两者的最后页关闭、权限导航、process/KeepAlive、主题/图标和偏好迁移均已证明属于产品 adapter，没有要求新增 `PnwNavigationNode`、Shell 或 View contribution 字段。

## 3. Desk Tools（2026-07-29 本地候选基线与回执）

### 3.1 当前证据

- `web-ui/package.json` 与 `server/package.json` 的 Wing 依赖、根 `pnpm-lock.yaml` 均锁定 Registry `0.5.1`；`scripts/verify-wing-dependencies.mjs` 拒绝 `link:`、`file:`、`workspace:` 与 override。
- `web-ui/src/layout/AppShell.vue` 只直接复用 `PnwRibbonShell`；导航真源仍是 `web-ui/src/types/config.ts` 的产品 `NavItem` 和 `phoenix/config/app_config.json`。
- `web-ui/src/layout/ribbon/ribbonConfig.ts` 已从同一份产品导航生成 `PnwRibbonTabDef[]`，但尚未投影为层级 `PnwNavigationNode[]`。
- 约 23 个真实页面已经直接使用 `PnwPageHeader`，包括 Git 与 KtCodegen；0.6.0 新增的 eyebrow/summary/description 是兼容增强，不要求这些页面重写。
- `web-ui/src/pages/pageRegistry.ts`、`usePagePrimaryContribution.ts` 和 `useWorkbenchBottomContribution.ts` 已形成页面级 Primary / Bottom 生命周期；`GlobalWorkbenchBottomPanel.vue` 承载预检、问题和运行日志。
- `WorkspaceTreeSidebar.vue` 已包含 Workspace Tree、Workset、Properties 与 Git 等复合 Secondary 语义；第一步可整体包装为一个 contribution，不应先拆成 Wing 领域类型。
- `StatusBar.vue` 左侧含业务状态与 API 版本，右侧使用产品面板开关；未来必须保留 `PnwWorkbenchFooter` 的 consumer 内容 slot。
- 当前尚未使用 `PnwWorkbenchShell`、`PnwNavigationNode`、`PnwWorkbenchDisplayPreferences`、normalizer 或 Wing View contribution registry；布局偏好分散在前端 `uiPrefs` 与后端 `ShellLayout`。
- `useWorkbench.ts` 继续拥有 page policy、session 和 dirty close；`useAppShell.ts` 继续拥有布局清洗、后端增量持久化和并发响应保护。
- `server/src/lib/gitWorkspaceService.ts` 只用 `pnwRunGitCommand` 做状态、差异和暂存等操作，没有提交历史首屏或分页需求。

### 3.2 后续最小步骤

1. Wing 0.6.0 发布后统一升级精确依赖、lockfile 和版本门禁，先做 Registry 对照。
2. 将产品 `NavItem` 投影为 `PnwNavigationNode[]`，保持 JSON、权限过滤、page ID 和 Router 语义在 Desk。
3. 建立版本化偏好 envelope：Wing slice 每次读入都经 `pnwNormalizeWorkbenchDisplayPreferences`，Workspace Tree、Workset、Git、Properties 与日志策略继续是 Desk extension。
4. 创建每个 Shell 实例的 View registry，将现有 Primary 与 Bottom 包装成 contribution，复合 Secondary 先整体接入；保留日志总线、dirty/session 和 Footer 业务内容。
5. 用 `PnwWorkbenchShell` 接管外层四区尺寸、separator 与 Footer 开关，删除 Desk 重复的外层 width/margin/toggle；Editor KeepAlive、异步切页、Tab session 继续由 Desk 管理。
6. 只有新增提交历史 View 时才使用 Git summary/page；现有写操作不迁移。Workspace Switcher/Module Toggles 初期可通过完整 activity slot 保留，不能仅凭 Desk 新增细粒度 Ribbon action API。

当前 Desk `develop` 与远端对齐且工作树 clean；只读门禁 `pnpm wing:check-local` 与 `pnpm verify:wing-dependencies` 均通过，适合另建独立布局适配分支。

2026-07-29 的命令级复核进一步确认：两项来源门禁都识别并列 Wing `0.6.0`，Desk 清单内 9 处引用仍精确锁定 Registry `0.5.1`，没有 override。早期只读执行曾在 Server/Web Vite 写 `node_modules/.vite-temp` 时因 `EPERM` 中止；随后在可写消费者环境重新执行了完整门禁，见下方最终结果。该过程没有修改 manifest、lockfile、workspace 或 `node_modules`。

### 3.3 0.6.0 实际适配回执

Desk 已在 `codex/pnw-workbench-060` 提交 `8fa3d47 feat: Desk接入Pnw工作台0.6外壳`：同一份 `NavItem` 投影为 Ribbon/Tree，`PnwWorkbenchShell` 接管外层四区、Bottom Tab 与 Footer；既有页面 Primary、复合 Secondary、日志/问题 Bottom、KeepAlive/dirty/session 和 StatusBar consumer 内容继续由 Desk 持有。Pinia + versioned localStorage 保存完整显示偏好，读写均经 normalizer；旧 AppShell 的 margin/resizer 已删除，品牌点击与 Gitee header action 保留。

该真实接入暴露 `usePnwDocumentTitle` 只接受可写 `Ref` 的类型缺口。Wing 将三个输入最小放宽为只读 `MaybeRefOrGetter`，不改变标题语义；Desk 的 computed 调用随即通过 local Wing d.ts 类型检查。最终 `pnpm test:local-wing` 全量通过：Web 76 文件 / 413 项、Server 68 文件 / 258 项、core 11 文件 / 67 项；`pnpm build:local-wing` 同样通过，Web 生产构建转换 2449 个模块，Server sidecar 完成。提交 `abd5515 test: 固化Ribbon首项标签去重契约` 同步修正了消费者旧测试对去重后首项标签的错误期望。

运行时浏览器复核随后发现 `AppShell` 在自身 setup 中先 `provideAppShell()`、再由 Bottom composable 调用 `useAppShell()`；Vue 的 `inject` 不读取当前组件自己的 provide，因而抛出缺少 `Symbol(appShell)`。Desk 以 `81fdb7b` 让 `usePdtWorkbenchBottomPanel` 可接收显式 host，AppShell 传入已有 context，后代组件仍保留无参 inject 路径；本地 Wing 类型检查及 2 文件 / 5 项定向测试通过。这是 consumer 组合顺序修正，不要求 Wing 新 API。

直接运行 Registry 0.5.1 的 Web 测试会有 3 项 0.6 显示偏好测试因 `pnwNormalizeWorkbenchDisplayPreferences` 尚未发布而失败，这是刻意保留的 Registry/local 对照，不是本地 0.6 回归；正式依赖仍需等待 Wing 0.6.0 发布后精确升级。

## 4. Function Develop（2026-07-29 本地候选基线）

### 4.1 当前证据

- `frontend/package.json` 与 lockfile 精确消费 `phoenix-wing@0.5.1`；`frontend/scripts/PfdRunWithLocalWing.mjs` 同样固定校验 0.5.1，因此不能把未发布 0.6.0 当成已验收依赖。
- `HomeView.vue` 仍手工装配 `PfdAppToolbar`、Ribbon、Primary、Bottom 和 StatusBar；`PfdWorkbenchRegistry.ts` 已用一张产品表定义页面、权限和 Ribbon 关系。
- `HomeView.ts` 先按宿主权限过滤页面，符合 Wing 不拥有权限的边界。
- `PhoenixPage.vue` 当前通过 DOM ID 与 Teleport 注入 Primary；迁入 Admin 时应改为 View component contribution，不为旧 Teleport 新增公共协议。
- `PfdWorkbenchLayout.ts` 自持显隐、尺寸和 localStorage；后续投影到 Admin Pinia 持有的 `PnwWorkbenchLayoutState`。
- `PfdBottomPanel.vue` 已复用 `PnwShellLogPanel`，但日志来源仍是 Function 业务 store；`PfdStatusBar.vue` 的业务文字应进入 Footer consumer slot。
- `PfdEditorDrawerHost.vue` 已是正确的 Wing 薄适配，应继续保留。

### 4.2 迁入 Admin 的 TODO

1. 在 Admin adapter 中把 Function 页面注册表和权限结果投影为 `PnwNavigationNode[]`。
2. 用 `PnwWorkbenchShell` 替换五段手写壳，Tab、Router、权限和日志仍由 Admin/Function adapter 处理。
3. 页面直接贡献 Primary / Bottom，逐步移除 DOM-ID Teleport。
4. 保留 Function 关闭唯一页和 dirty 确认语义；不能无条件替换为另一套 Tab store。
5. 只有用户仍要求旧独立 Function 承担回归时，才同步升级 manifest、lockfile 和本地版本门禁。

Function 正在迁入 Phoenix Admin，不作为 W4/W5 独立示范消费者，也不据此扩展 Wing 公共协议。

## 5. KT BOM Studio（2026-07-29 本地候选基线）

### 5.1 当前证据

- `apps/bom-web/package.json` 与根 lockfile 精确消费 `phoenix-wing@0.5.1`；当前没有标准 local-Wing resolver。
- `App.vue` 手工装配 Header、Ribbon、Primary、Content 与 Tabs，不使用 `PnwWorkbenchShell`、`PnwWorkbenchLayout` 或 `PnwActivityBar`。
- `AppRibbon.vue` 使用兼容的 `PnwRibbonShell` / `PnwRibbonGroup`；`shell/shellModel.ts` 从同一份 `menuConfig` 投影工程/系统 Ribbon，但还不是唯一 `PnwNavigationNode[]`。
- `AppTabs.vue` 使用 `PnwWorkbenchTabBar` 并固定在 Header，因而 0.6.0 的 Tab 位置当前没有直接挂载点。
- `AppPrimaryPanel.vue` 与 `shell/primaryContributions.ts` 已有产品 Primary registry；约束仍包含产品 renderer、购物车 Footer 和拖动宽度。
- 当前已有 24 个页面向产品 Primary registry 登记内容，但 registry 是模块级 singleton；它证明 View contribution 的需求，却不满足多个工作台实例之间的隔离。
- `views/Settings/index.vue` 的产品“工作台设置”管理旧 Ribbon、Primary 和 Drawer 宽度，不等同于 Shell 级显示配置中心。未来 Drawer 宽度可通过扩展 slot 加入，但不能保留两个相似的导航/主题表单。
- `KtDataPageLayout.vue` 以及少量临时 `.page-header` 仍自行绘制页面 Header；全仓尚未使用 `PnwPageHeader`。该迁移应作为 Shell 稳定后的独立布局小步，不和第一笔壳层改造混在一起。
- 当前也没有全局 Secondary 或 Bottom contribution；页面内部 right pane 属业务布局，不能直接解释成工作台 Secondary，也不应为了演示造一个空 Bottom。
- `shell/workbenchPreferences.ts` 仍使用模块级 `ref + localStorage`；其中 `leftPanelCollapsed` 实际控制 Primary，不能迁移为 Activity Tree 的 `treeCollapsed`。
- 当前没有标准 local-Wing resolver，也没有 `wing:check-local`、`dev/typecheck/test/build:local-wing` 入口；在 0.6.0 未发布阶段不能靠修改 manifest 或 lockfile 绕过这一缺口。
- Router、登录守卫、TabsController、dirty 关闭、BOM/Part/API、购物车和 localStorage key 都是宿主状态。

### 5.2 后续最小步骤

1. 从当前干净 `tree` HEAD 建独立 `codex/kt-bom-wing-0.6-shell-adapter` 分支。该 HEAD 相对 `origin/tree` 领先 4 个布局提交；不得从远端旧基线起步，也不要继续把适配直接堆在 `tree`。
2. 先增加与 Phoenix 其他消费者同规则的进程级 local-Wing resolver：只认标准并列 `../phoenix-wing`，同时覆盖根入口和旧 subpath，统一 Vite、Vitest 与 `vue-tsc`，不修改 Registry `0.5.1` manifest/lockfile。
3. 新增单一 BOM adapter，把 `menuConfig + pageDefinitions` 投影为 `PnwNavigationNode[]`；权限过滤发生在 adapter 前或内部，图标解析、page ID 和激活路由继续属于 BOM。
4. 用 `PnwWorkbenchShell` 薄装配替换五段产品壳，保留 TabsController、dirty/session 和 Page Host；Footer slot 接购物车业务状态，显示设置 extension 接 Drawer 尺寸。
5. 建立 BOM 的 Pinia 偏好 envelope，读入后调用 `pnwNormalizeWorkbenchDisplayPreferences`；旧 `stacked/inline`、Primary 宽度与可见性做一次迁移，但 `ribbonModule`、Drawer 尺寸和 Activity Tree 收起保持不同责任。
6. 把模块级 Primary singleton 桥接为每工作台实例的 View registry；先用现有 24 个页面验证 Primary 不串页。Secondary 暂不引入，Bottom 只在有真实日志来源时加入。
7. Shell 稳定后单独让 `KtDataPageLayout` 采用 `PnwPageHeader`，再逐步收敛临时 page-header；完整 Wing 设置保留一个一级入口，避免两个相似表单。
8. 补 Ribbon/Tree 同树、三种 Tab 位置、Primary、购物车 Footer、主题和 `1440/900/840/700/640px` 回归；窄屏自动 Ribbon 后，宽屏必须恢复原用户偏好。

2026-07-29 已实际执行当前 Registry `0.5.1` 基线：Web 类型检查通过；Web Vitest 42 个文件、126 项测试通过；Web 构建通过。根 `pnpm verify` 也通过，API Jest 39 suites / 259 项与 Web 126 项合计 385 项测试；三个被忽略的 `dist` 被正常更新，tracked/cached diff 仍为空。唯一警告是 Web 主 chunk 约 1.1 MB、超过 500 kB。该结果证明当前 `tree` HEAD 是可用适配基点，不证明 0.6.0 Shell 已接入。

## 6. 公共能力判定

实际适配没有发现需要新增的 Wing 公共字段或组件，只发现一个已有 composable 的只读输入类型过窄：

- 三者都能通过 adapter 生成现有 `PnwNavigationNode`，权限字段不应进入节点公共契约；
- Desk 与 BOM 已再次证明实例级 View contribution 的价值，但现有 registry/composable 足够；
- 三者都需要保留 Footer 宿主内容，现有 slot 足够；
- Tab 关闭差异属于产品 session/dirty 语义，不进入 Wing；
- Tree 收起与 Primary 收起必须是两个独立受控状态，现有类型已经分离；
- 显示配置中心的 consumer extension slot 足以接纳 Drawer 宽度等产品显示项，不应加入产品字段；
- Git 轻量 API 由 Auto 的历史列表需求证明，Desk 当前没有同类读取场景，不把它误用于 status/diff/stage。
- `usePnwDocumentTitle` 现在接受 `MaybeRefOrGetter`；该修正由 Desk 的 `ComputedRef` 真实调用证明，不引入新状态或产品语义。

Open Issue 与 Phoenix Admin 主验证、Desk Tools 针对性接入及完整本地回归均已形成独立提交；BOM Studio 保留为下一条独立 C1 工作线。Function 随 Admin 迁移，不建立独立公共语义。

## 7. 发布后验证入口

Wing 0.6.0 已发布。Open Issue、Admin、Function 与 BOM 的 manifest 已精确升级到 0.6.0；Desk
仍保持 0.5.1，必须先完成 Registry 基线，再在独立提交中升级并重复来源、测试与构建门禁。

- Desk Tools：当前先运行 `pnpm verify:wing-dependencies`、`pnpm test:registry`、`pnpm build:registry`；
  精确升级 0.6.0 后再次运行 Registry 门禁及 `pnpm test:local-wing`、`pnpm build:local-wing`。
- Function Develop：运行 frontend 测试、Registry build、local-Wing build 和认证工作台浏览器冒烟。
- KT BOM Studio：运行 `pnpm --filter kt-bom-web typecheck`、`pnpm --filter kt-bom-web test`、
  `pnpm --filter kt-bom-web build` 与根 `pnpm verify`。

Desk 的 local-Wing 测试与构建、Open Issue 的完整 local-Wing verify、Admin 隔离 worktree 的
类型/测试/构建已在本地候选阶段完成；它们不替代发布后精确 Registry 依赖的对照门禁。

## 8. 导航布局持久化复核（2026-07-29 本地候选记录）

fixture 已用 consumer 自己的 Pinia store 演示可刷新恢复的导航布局：它只保存带
`schemaVersion`、`baseLayoutVersion`、大分组定义和小模块归属的纯数据快照，启动时
再应用到默认 `PnwNavigationNode[]`。快照损坏、字段非法或基础布局版本变化时直接回退
默认布局；Wing 不读取 localStorage，也不拥有默认分组、用户作用域或合并策略。

四个真实消费者的复核结果如下：

- Open Issue 的导航由静态 Ribbon contribution 投影，同一份 versioned browser storage
  已保存完整显示偏好和树展开状态，但目前没有改组或排序 UI；若未来需要，应建立
  Open Issue 自己的布局偏好，而不是并入 `PnwWorkbenchDisplayPreferences`。
- Desk Tools 的 Pinia + versioned localStorage 已保存完整显示偏好，模块启用状态另由
  launcher 后端保存；导航层级和 fixture 不同，不能直接套用 `PwwNavigationLayoutPreferenceV1`。
  Tree 展开状态与 Bottom 活动 Tab 仍是 Desk 会话 TODO，不构成 Wing 公共字段缺口。
- Phoenix Admin 已将大分组名称、顺序、启用状态和模块归属提交给产品后端接口，权限菜单
  始终先过滤再投影；组内模块还没有独立排序字段。服务端的租户/用户作用域、RBAC、审计和
  并发版本必须留在 Admin，浏览器显示偏好后续也应改为用户命名空间的 Pinia facade。
- KT BOM Studio 仍以模块级 `ref + localStorage` 保存旧 Ribbon/Primary/Drawer 偏好，尚未
  接入 `PnwWorkbenchShell`，也没有用户导航改组语义；应先完成独立 Shell adapter 和
  BOM 偏好 envelope，再判断是否需要产品专用布局协议。

因此本轮不增加 Wing 公共导航偏好类型、存储接口或拖拽事件。只有至少两个真实消费者证明
相同的可移动层级、空组规则、权限求交、基础版本升级和冲突合并语义后，才考虑把无业务含义
的纯校验/应用函数提升为 `pnw*` 公共能力；持久化介质和后端 DTO 始终由 consumer 选择。
2026-07-31 的发布后状态和 BOM Shell 接入结果以第 9 节为准。

## 9. 2026-07-31 发布后统计与清理审计

### 9.1 口径与执行边界

本节是发布后的只读静态审计，不修改消费者源码，不删除文件，也不运行可能写入缓存、构建目录
或数据库的测试。统计以各仓当前工作树为准；版本读取 `package.json`，行数使用 `wc -l`，生产
引用使用 `rg` 覆盖 Vue/TypeScript 源码，历史差异使用已提交的适配提交。行数只用于发现壳层
责任是否迁移，不把“单文件变短”当作架构完成。

本次审计开始时只有两个相关 Codex 任务处于 active：

| 仓库 | 分支 / 状态 | 任务占用 | 本轮约束 |
|---|---|---|---|
| `phoenix-open-issue` | `legacy`，工作树有业务与 `AppShell.vue` 未提交改动 | `Open Issue 适配layout` 正在实现推送、8D 等业务 | 不修改、不删除；清理只登记为后续 |
| `phoenix-admin-vue` | `codex/open-issue-plugin`，Pah 文件有未提交改动，另有用户已暂存 Cool 文件 | Admin 工作台任务仍显示 active | 不修改；Cool 遗留只列清单，不给直接删除结论 |
| `phoenix-desk-tools` | `codex/pnw-workbench-060`，clean | 没有 active 任务 | 可作为第一条独立清理工作线 |
| `phoenix-function-develop` | `develop`，clean | 相关任务 idle | 可规划小步收敛，不与 Admin 迁移混改 |
| `kt-bom-studio` | `tree`，clean | 相关任务 not loaded | 可规划 Page layout 小步 |
| `phoenix-wing` | `develop`，审计前 clean | W0–W3 任务 idle | 本文是本轮唯一写入 |

任务状态只是 2026-07-31 的瞬时协调证据，不是跨任务锁。任何实际删除开始前必须重新查询任务
状态和 `git status --short --branch`；出现 active 任务、dirty worktree 或目标文件被另一任务修改时
立即停止该仓清理。

### 9.2 当前规模与收敛结果

| 消费者 | Registry manifest | 主入口适配前 → 当前 | 已完成清理 | 当前主要遗留 |
|---|---:|---:|---|---|
| Open Issue | `0.6.0` | `AppShell.vue` 207 → HEAD 332 行；当前工作树 333 行 | 页面级实例 View registry、Primary/Secondary/Bottom 生命周期已接入 | 根壳仍手写 `contributions.bottom + #bottom` 回退；活动任务占用中 |
| Phoenix Admin | `0.6.0` | `PahWorkbenchShell.vue` 1323 → 576 行 | Pnw Shell、同树导航、偏好、View registry 已接入 | Cool classic/hybrid 壳继续兼容；不以删除换取行数 |
| Desk Tools | `0.5.1` | `AppShell.vue` 560 → 557 行 | 外层四区、Bottom、Footer 已交给 Pnw Shell | 11 个旧 Toolbar/Ribbon/Tab 文件共 2136 行仍在仓内；巡游仍引用旧 DOM 锚点 |
| Function Develop | `0.6.0` | `HomeView.vue` 138 → 148 行 | 已删除 5 个旧壳文件共 751 行；提交净减少 335 行 | Editor 内第二套 `el-tabs`；385 行 `PhoenixPage` 仍保留 Teleport/旧 Aside 双路径 |
| KT BOM Studio | `0.6.0` | `App.vue` 90 → 72 行 | 已删除 8 个旧 Layout/CSS 文件共 676 行；提交净减少 449 行 | 375 行 `KtDataPageLayout` 被 22 个页面使用，另有 2 个手写 `.page-header`；Primary registry 仍为模块级 singleton |

解释：Open Issue 与 Function 的主入口没有继续变短，不等于接入失败。Open Issue 把更多真实页面
贡献和应用品牌接到了根壳；Function 把旧文件责任合并进一个受控 Shell adapter。真正需要关注的
是是否仍有第二套可见导航、Tab、Block、尺寸或生命周期真源，以及旧文件是否已经没有生产入口。

### 9.3 已发现问题

#### D1：Desk 界面巡游仍指向已经退出生产装配的旧 DOM

`useShellTour.ts` 仍查找 `data-tour='ribbon-tabs'`、`ribbon-bar` 和 `tab-bar`。当前生产
`AppShell.vue` 只保留 `main-content`，`ribbon-tabs` / `tab-bar` 只存在于未被生产入口导入的旧
`AppToolbar.vue` / `WorkbenchTabBar.vue`，`ribbon-bar` 在当前源码中完全没有提供者。因此旧文件
不能直接删除后就结束：应先把巡游锚点映射到 Pnw Header/Ribbon/TabBar 的稳定 consumer wrapper
或公共可访问节点，并做一次实际巡游回归。

#### D2：Desk 存在 11 文件、2136 行的封闭旧壳引用簇

以下生产文件没有从当前 `AppShell.vue`、页面 registry 或其他生产入口进入；搜索到的源码引用只在
该旧簇内部。`ribbonConfig.ts` 与 `ribbonIcons.ts` 仍由新 Shell 使用，不在删除清单。

| 待删除候选 | 行数 | 当前引用结论 |
|---|---:|---|
| `web-ui/src/layout/AppToolbar.vue` | 328 | 只引用旧 RibbonTabBar / WorkbenchTabBar；自身无生产导入 |
| `web-ui/src/layout/NavSidebar.vue` | 116 | 无生产导入；文档仍称“保留待用” |
| `web-ui/src/layout/WorkbenchTabBar.vue` | 526 | 只由旧 AppToolbar 导入 |
| `web-ui/src/layout/ribbon/RibbonGroup.vue` | 64 | 只在旧 RibbonPanel 簇内使用 |
| `web-ui/src/layout/ribbon/RibbonModuleToggles.vue` | 128 | 只在旧 RibbonPanel 簇内使用 |
| `web-ui/src/layout/ribbon/RibbonPanel.vue` | 203 | 无生产导入 |
| `web-ui/src/layout/ribbon/RibbonTabBar.vue` | 82 | 只由旧 AppToolbar 导入 |
| `web-ui/src/layout/ribbon/RibbonToolButton.vue` | 161 | 只在旧 RibbonGroup / RibbonPanel 内使用 |
| `web-ui/src/layout/ribbon/RibbonUtilButton.vue` | 70 | 无生产导入 |
| `web-ui/src/layout/ribbon/RibbonWorkspaceSwitcher.vue` | 371 | 只在旧 RibbonPanel 内使用 |
| `web-ui/src/layout/ribbon/useRibbonTabs.ts` | 87 | 无生产调用；新 Shell 只在注释中提到旧行为 |

同时发现 `AppShell.vue` 连续两次写了相同的 `v-else-if="loadError"`，第二个分支永远不可达。该项可
与旧簇清理一起删除。旧壳文件仍被若干规划、用户说明和新手指引文档点名；删除提交必须同步把
current 文档改为 Pnw Shell 真源，历史归档只需注明文件已移除，不改写历史事实。

#### F1：Function 仍在 Editor 内显示第二套页面 Tab

`PnwWorkbenchShell` 已渲染并管理 Header 页面标签，但 `HomeView.vue` 仍用 `el-tabs / el-tab-pane`
遍历 `pfdVisiblePages`。这会保留第二套可见标签和第二套页面容器语义。下一步应只渲染活动页面组件，
选择、关闭和 dirty 守卫继续由现有 `tabStore` 与 Wing Header 事件处理。

#### F2：Function 的 `PhoenixPage` 仍是 13 个页面共用的过渡兼容层

`PhoenixPage.vue` 共 385 行；13 个 View 使用它，其中 11 个传入 `pfd-primary-id`。它同时维护：

- Teleport 到 `PfdPrimaryPanel`；
- Primary 关闭时的隐藏 fallback host；
- 找不到 Pnw Primary host 时的旧右侧 `el-aside` 与独立宽度/localStorage；
- 自绘 48px Page Header。

该文件不能直接删除。应先把 11 个 Primary 页面改为显式 contribution/受控 props，再把 13 个页面
的 Header 迁入 `PnwPageHeader`；只有无 Teleport、无旧 Aside、无调用者后才删除兼容分支或文件。

#### B1：BOM 已完成壳层删除，但页面布局仍有第二层公共页眉

BOM 本次已删除 `AppContent.vue`、`AppHeader.vue`、`AppRibbon.vue`、`AppTabs.vue` 以及对应 4 个
CSS 文件，共 676 行，不能重复列为待删。剩余 `KtDataPageLayout.vue` 被 22 个真实页面使用，除滚动、
业务右栏外还自绘 Page Header；`DispatchManifest.vue` 与 `ModuleRelDetail.vue` 又各自保留一套
`.page-header`。正确动作是先让 `KtDataPageLayout` 内部组合 `PnwPageHeader`，再处理两个例外页，
不是一次删除 375 行组件。

#### B2：BOM Primary registry 仍是模块级 singleton

`primaryContributions.ts` 已提供可实例化 `createPrimaryContributionRegistry()`，但生产 composable
仍读取文件级 `primaryRegistry`。当前单工作台不会串页，未来测试、多工作台或嵌入宿主会共享状态。
应由 `AppWorkbenchShell` 创建并 provide 实例，页面 inject 同一实例；该修正是状态所有权收敛，不能
和 Page Header 大批迁移放进同一提交。

#### O1：Open Issue 根 Bottom 仍走兼容结构覆盖

当前根壳固定 `workbenchContributions = { bottom: true }`、`WORKBENCH_BOTTOM_TABS` 和 `#bottom`
手工回退 `PoiWorkbenchBottom`。Wing 0.6.0 已提供 `defaultBottomBlock`，可表达“页面专用 Bottom
优先，否则应用默认 Bottom”。待活动任务完成后应迁入该入口，删除根壳固定 contribution、手工
component 分支和重复 tabs；当前没有证据支持删除任一业务 Primary/Bottom 文件。

### 9.4 Phoenix Admin Cool 遗留清单（只列出，不删除）

Admin 的 classic/workbench/hybrid 是明确的产品兼容策略。本次只记录布局表面，不把它们归为死文件：

| 文件 | 行数 | 当前责任 |
|---|---:|---|
| `src/modules/base/pages/main/index.vue` | 150 | classic / workbench / hybrid 路由级分流 |
| `src/modules/base/pages/main/components/topbar.vue` | 223 | classic 使用，workbench 也通过 slot 复用 |
| `src/modules/base/pages/main/components/slider.vue` | 188 | Cool classic 左侧菜单 |
| `src/modules/base/pages/main/components/process.vue` | 279 | Cool classic Process 标签 |
| `src/modules/base/pages/main/components/views.vue` | 99 | classic 与 Pah workbench 共用 Router/KeepAlive View |
| `src/pah/PahWorkbenchShell.vue` | 576 | Pnw 0.6 adapter、权限导航、Process/KeepAlive 与产品 slot |

前五个 Cool 文件合计 939 行，但 `topbar.vue` 和 `views.vue` 已被两个模式共享，不能按 939 行直接
认定重复。后续讨论应先确定是否长期保留 classic 回退、hybrid 的路由粒度和 Cool 升级策略，再决定
`slider.vue` / `process.vue` 是否迁移或冻结；本轮不创建 Admin 删除清单。

### 9.5 分批执行计划

1. **C0：清理前协调门禁。** 每次开工前重查 Codex active tasks、仓库分支和 dirty 文件；Open Issue
   与 Admin 当前暂停清理。每仓单独分支、单独提交，不跨仓批量删除。
2. **C1：Desk Registry 与巡游先行。** 先把根包和六个 scoped 包精确升级到 Registry 0.6.0，执行
   来源门禁；把三处旧巡游锚点迁到当前 Pnw Shell 实际 DOM，并完成真实巡游回归。
3. **C2：Desk 删除封闭旧簇。** 删除 D2 的 11 个文件和不可达 `loadError` 分支；同步 current 用户
   文档与新手指引。执行 `pnpm verify:wing-dependencies`、Registry/local Wing 全量测试和构建；确认
   Ribbon/Tree、Tab 关闭、Workspace 切换、Bottom、Footer 和巡游无回归。
4. **C3：Function 去除双 Tab。** 先只删除 Editor 内 `el-tabs` 外壳并保持 active component、关闭守卫
   和 KeepAlive 行为；再以 1–2 个页面为一批迁移 `PhoenixPage` Primary/Header，禁止一次改完 13 页。
5. **C4：BOM 状态所有权与页眉分开。** 第一提交把 Primary registry 改为每 Shell 实例；第二阶段让
   `KtDataPageLayout` 内部采用 `PnwPageHeader`，再处理两个例外页。22 页迁移完成前不删除组件。
6. **C5：Open Issue 等活动任务结束。** 重查 `AppShell.vue` 差异后采用 `defaultBottomBlock`，目标是
   删除兼容接线而不是删除业务 Block；用 `pnpm verify:local-wing` 和 Registry 对照闭环。
7. **C6：Admin 单独决策。** 基于 Cool 升级路线、classic 使用量和 hybrid 路由覆盖率讨论保留/冻结/
   迁移，不把其他简单消费者的删除策略机械套到 Admin。

本轮只完成统计、问题登记和执行排序，没有删除消费者文件，也没有运行消费者测试。D2 的 11 文件
是唯一已具备“无生产入口”静态证据的整文件删除批次，但仍受 D1 巡游修正、文档同步、任务占用复查
和完整门禁四个前置条件约束。
