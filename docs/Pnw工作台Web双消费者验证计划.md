# Pnw 工作台 Web 双消费者验证计划

状态：in-progress

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.0 本地候选（未发布）

最后核验：2026-07-29

## 1. 目标

W0–W3 已在 Wing 仓内完成公共壳层、受控导航、动态 View Block、布局状态、Footer、主题 token 与 `PwwWorkbenchWeb` fixture。W4 不再继续堆叠示例功能，而是让两个差异足够大的真实 Vue Web 消费者验证公共边界：

- Phoenix Open Issue 证明“简单消费者”：无权限菜单协议、默认不显示 Secondary、少量产品状态即可接入同树 Ribbon/Tree、页面标签、Bottom 与 Footer；
- Phoenix Admin 证明“复杂消费者”：复用既有权限菜单、Router、process/keep-alive、Pinia/后端偏好和按页面 View contribution，同时保留 classic/workbench 回退；
- Phoenix Wing 仍是公共组件与纯 TypeScript 契约的唯一写入目标。消费者任务只提交各自的 `Poi*` / `Pah*` adapter，不得复制或分叉 `Pnw*` 实现。

W4 完成前，`PnwWorkbenchShell`、`PnwNavigationNode` 和 View Block component contribution 继续按实验契约管理；本计划不触发 npm 发布。

## 2. 仓库、分支与并行边界

| 工作线 | 仓库 / 分支 | 当前状态 | 允许写入 | 禁止事项 |
|---|---|---|---|---|
| Wing 真源 | `phoenix-wing` / `develop` | W0–W3 与 fixture 已完成，0.6.0 本地候选 | 公共契约、组件、纯函数、测试与文档 | 消费者 Router、权限、业务 API、偏好存储 |
| Open Issue | `phoenix-open-issue` / `codex/single-pnw-workbench` | 0.6.0 偏好、空态与真实 View contribution 已提交 | Open Issue 薄 adapter、产品 Pinia、View contribution 与回归测试 | 修改 Wing 真源、引入本地路径依赖、复制 fixture 业务假数据 |
| Phoenix Admin | `phoenix-admin-vue` / `codex/pnw-workbench-shell` 隔离 worktree | 薄 adapter、权限导航投影、v3 偏好与 Shell 已提交 | 仅在独立干净分支或 worktree 中修改 `Pah*` adapter 与壳层 | 覆盖现有 dirty 文件、修改 Admin Node、一次替换 classic 模式 |

消费者工作线可以分别启动、测试和提交，但不得同时改 Wing。若消费者暴露公共缺口，先在本计划的“决策记录”中写清两个消费者证据，再回到唯一 Wing 工作线修改、验证和提交。

只读基线完成后，Open Issue、Phoenix Admin 与 Desk Tools 分别由独立 agent 在独立分支落地；Wing 公共契约、fixture 和文档仍只由主工作线写入。整个过程保持一仓一任务/分支，没有两个 agent 同时编辑同一消费者，也没有把消费者改动混入 Wing 提交。

Phoenix Admin 当前工作树的 `.gitignore` 修改与 `build/cool/eps.*` 删除属于既有工作，不能由 W4 自动暂存、恢复或提交。开始 Admin 适配前必须先由其原任务归档，或从已确认的提交创建独立 worktree。

## 3. W4-A：Open Issue 简单消费者

### 已有基线

- 通过进程级 resolver 消费并列 Wing 0.6.0 源码；manifest 与 lockfile 继续精确锁定 Registry `phoenix-wing@0.5.1`；
- `PnwWorkbenchShell` 已接入现有 Ribbon 导航、Router、页面标签、Bottom 日志和 Footer；
- “工作台显示设置”使用 Wing 单行图标快捷菜单与公共完整设置对话框；Open Issue 不复制表单，只绑定自己的 Pinia，并可按需提供 consumer action/界面 slot；
- 默认 View 不贡献 Secondary；Footer 左侧保留产品状态，右侧由 Wing 生成可用 Block 开关；
- 已通过 `verify:local-wing`，当前适配分支工作树干净。

2026-07-29 对最终 0.6.0 API 的只读复核又确认：当前产品 store 已有 Pinia/localStorage，但还未用 `PnwWorkbenchDisplayPreferences` 与 `pnwNormalizeWorkbenchDisplayPreferences`；Shell 也未接 `treeAppearance`、`tabBarPlacement`、`displaySettingsPositions` 及相应 update 事件，`colorScheme` 目前只传入不回写。关闭最后一个 dashboard 标签后同路由 push 不触发 watcher，可能出现“标签已空、旧 View 仍在”；这是 Open Issue 的默认页/空态选择，不需要 Wing 新 API。

同日实际命令复核确认 local resolver 与依赖图门禁通过；`verify:local-wing` 的 140 项测试为 134 通过、1 失败、5 跳过，唯一失败是 Registry contract 在 LOCAL 模式硬编码期待 `0.5.1`，实际正确解析 `0.6.0`。单独 build 已通过 core `tsc`，随后因当前只读消费者仓不能写 Server `dist` 而停止。该证据仍不足以关闭 A1：必须在消费者修正测试分流后，用标准 Node/pnpm 和可写目录完成整套测试、Server/Web build 与浏览器回归。

后续实际适配已形成两笔中文提交：`023fa9b 工作台：适配 Wing 0.6.0 显示偏好与空状态`、`4fb5611 工作台：接入页面级 View 贡献`。Registry/LOCAL 版本期望已分流；v2 `PnwWorkbenchDisplayPreferences` envelope、Tree 外观、Tab 位置、设置坐标与最后 Tab 空态均已接通。Dashboard、列表/详情、组织和设置贡献真实 Primary，Issue 点检贡献真实 Secondary，设置数据库修正贡献真实 Bottom；根 Shell 不再固定业务 Block。

最终完整 `pnpm verify:local-wing` 已通过：Wing 0.6.0 构建、37 篇文档、LOCAL 140 passed / 5 skipped、core/server/Web 生产构建全部完成，Web 转换 3453 个模块；另有 9 项 LOCAL 生命周期/窄屏定向测试通过。Registry 对照为 138 passed / 7 skipped。manifest、lockfile 与 override 均未改变，先前 `.vite-temp` 写权限缺口已经关闭。

### 本阶段任务

1. 把 Open Issue 当前页面与 Block 的关系改为页面自身注册 contribution；应用根只装配 shell、当前 View 和产品动作，不写固定 Primary/Secondary/Bottom 模板。
2. 选择至少两个真实路由回归：一个普通 Issue 列表/详情 View，一个无 Primary/Secondary 的管理或组织 View；关闭标签后必须同步卸载或切换业务 View。
3. 验证 Bottom 日志多 Tab、Footer Bottom 开关和产品左侧状态；删除的旧 Footer 日志开关不得以第二套布局状态复活。
4. 验证 Ribbon/Tree 切换保持节点 ID、权限过滤后的可见性、排序、当前路由与选中状态一致。
5. 在约 700px 宽度验证 Activity Rail、页面标签和 Editor；只记录可复现的窄屏缺口，不先新增 Wing overlay/drawer API。
6. 将产品显示偏好迁入版本化 envelope：读写前统一 normalize，补齐 Tree 两轴外观、三个标签位置和设置浮窗坐标；`expandedNodeIds` 与页面 session 继续单独保存。
7. 明确关闭最后页面后的产品语义：选择显式重开 dashboard，或真正使用 Shell 空态；禁止留下已关闭 View。

### 扩大覆盖后的 Layout 复盘 TODO

Open Issue 第一轮接入在视觉上已经接近 Wing fixture，但“看起来一致”不等于产品 layout 已经充分精简。待列表详情、Issue 详情、组织、设置等更多真实 View 使用同一壳层后，必须进行一次专门复盘：

1. `AppShell.vue` 是否只保留 `PnwWorkbenchShell` 装配、RouterView、品牌和产品 action，不再内置固定业务 Block；
2. Primary / Secondary / Bottom 是否由各 View contribution 动态注册和释放，是否仍存在根组件固定 `contributions` 或固定 Bottom 内容；
3. 旧 Ribbon、Footer、日志展开、面板显隐和宽高状态是否已删除，是否与 `PnwWorkbenchLayoutState` 形成两份真源；
4. Router、workbench tabs、KeepAlive、关闭最后一个标签和独立路由回退是否只有一条生命周期链；
5. 页面 CSS 是否依赖旧壳 DOM、全局高度或重复断点，窄屏下 Activity、Editor 和 Block 是否仍按新 Grid 工作；
6. consumer adapter/controller 的字段是否能继续按 `navigation / tabs / view / layout / actions` 分组，还是因更多页面接入重新膨胀为逐项 ref；
7. Open Issue 的简单消费者证据是否足以删去兼容代码；若仍需产品特有行为，留在 `Poi*` adapter，不反推为 Wing 公共 API。

该 TODO 在真实 View 覆盖扩大后执行，不因当前页面外观相似而提前标记完成。复盘结果应记录删除项、保留的产品适配点、文件行数趋势和浏览器回归证据。

完整基线、适配矩阵和持续复盘记录由[《Pnw 工作台 Web · Open Issue 应用分析》](Pnw工作台Web-OpenIssue应用分析.md)维护；本计划只跟踪阶段是否关闭。

### 退出门禁

```bash
cd ../phoenix-open-issue
pnpm verify:local-wing
```

另需浏览器回归 `/dashboard`、`/org`、Ribbon/Tree、关闭全部标签、Bottom 开关和窄屏。验收结果必须明确写成“本地候选源码消费”，不得表述为 Registry 或 npm 发布完成。

## 4. W4-B：Phoenix Admin 复杂消费者

### 当前只读审计

Phoenix Admin 尚未适配 W4 的 `PnwWorkbenchShell`。当前 `PahWorkbenchShell.vue` 仍手工绘制 Header、Tree、四区、Bottom 拖拽和 Footer，只复用了 Wing 0.5.1 的低层 Ribbon/Tab/Log 组件；也尚未建立唯一 `PnwNavigationNode[]` 投影、`PnwWorkbenchDisplayPreferences`、动态 View contribution、Bottom tabs 或公共显示设置接线。

当前截图中多个功能都显示九宫格图标的直接原因也在 Admin：`ribbonGroupItems()` 把每个条目的图标硬编码为 `Grid`，而菜单数据与 `PahRibbonMenuAdapter` 已保留各自的 `icon` 字段。后续应先在 Admin 用产品侧 `PahMenuIcon` resolver 消费既有 SVG sprite；Wing 只继续维护跨至少两个 Web 消费者验证过的壳层通用图标，不把约 65 个 Admin 业务图标整体迁入公共库。

2026-07-29 再次只读核验确认：Admin 当前分支 `codex/open-issue-plugin` 相对 develop 已有独立提交，且暂存区包含 `.gitignore` 与 `build/cool/eps.*` 的无关改动，不适合直接混入 0.6 适配。现有偏好模型还存在“类型定义为 v2、实际保存 version 1”的产品迁移问题。下一步必须从已确认提交建立独立 `codex/pnw-workbench-shell` worktree，再新增 `PahWorkbenchAdapter` 与 v3 display envelope；不得在 Wing 内增加 route path、权限表达式或 Admin 菜单类型。

同日命令级基线显示当前仓甚至不具备直接开工条件：`pnpm test` 在 Vite 写根目录临时配置时受当前只读权限阻止，未执行测试；显式无增量 `vue-tsc` 则因暂存删除的 `build/cool/eps.d.ts` 报 `Cannot find namespace 'Eps'`。执行前后仍只有 `.gitignore` 与两个 EPS 文件的原暂存差异，没有生成新文件。该失败是 Admin 分支/EPS 基线与工作区权限问题，不是 Wing 0.6.0 类型或 API 回归；在独立干净 worktree 和 local-Wing resolver 建立前不得把它记为消费者适配失败。

后续已从当前已提交 HEAD 建立 `/private/tmp/phoenix-admin-pnw-workbench` 隔离 worktree 和 `codex/pnw-workbench-shell`，提交 `d06b873 适配 Wing 0.6 工作台壳层`。该提交新增 local-Wing resolver、`PahWorkbenchAdapter`、唯一权限导航投影、v3 显示偏好迁移与 `PnwWorkbenchShell` 薄装配；默认不制造 Secondary，只保留真实全局日志 Bottom，`navigation.vue` 使用 `PnwPageHeader`。Wing 0.6.0 构建、Admin 聚焦 `vue-tsc`、8 个文件 26 项测试、2731 模块生产构建、Prettier 与 diff check 均通过；manifest/lock/workspace 未改。原 `codex/open-issue-plugin` 的 staged `.gitignore`/EPS 状态严格未变。

因此 W4-B 必须从薄 adapter、偏好迁移和少量真实路由开始，不能把当前页面外观当作新框架 layout 已完成。Admin 详细文件级适配清单由后续独立消费者任务在干净分支中维护；本计划只固定公共边界和退出门禁。

### 前置条件

1. 先归档当前 `codex/open-issue-plugin` 工作，或从确认过的提交创建独立 `codex/pnw-workbench-shell` worktree；
2. 完整阅读 Admin 的 `PahWorkbenchShell.vue`、`main/index.vue`、`Views.vue`、菜单/process store、`PahRibbonMenuAdapter`、`PahModuleGroupAdapter`、`PahGroupedNavigationStore` 与 `PahWorkbenchPreferences`；
3. 建立与 Open Issue 同规则的进程级本地 Wing resolver；不得运行 `pnpm link`，不得改 manifest、lockfile、workspace、override 或 `node_modules`；
4. 保留 `classic / workbench / hybrid` 入口与回退，第一阶段只改 Vue Web，不改 Phoenix Admin Node。

### 分步实施

1. 新建薄 `PahWorkbenchAdapter`：权限过滤、后端菜单排序和稳定产品 ID 在 Admin 内完成，再投影为一份 `PnwNavigationNode[]`；激活仍调用 Admin Router。
2. 把 `process.list` 投影为 `PnwWorkbenchTabItem[]`；选择、关闭、dirty 守卫、keep-alive 和路由恢复仍调用既有 process/router。
3. 用 `PnwWorkbenchShell` 替换 `PahWorkbenchShell` 中可直接复用的 Header、Activity、Tab、四区布局、句柄与 Footer 结构；`<views />` 继续放 Editor，Admin 用户区继续放 `header-actions`。
4. 建立 Admin 自己的 View contribution registry。普通页面默认 `Primary + Editor`；只为属性检查器、预览或 Desk Tools 类复杂页面贡献 Secondary；日志/问题面板投影为 Bottom tabs。
5. 将现有 `PahWorkbenchPreferences` 映射为一份 `PnwWorkbenchLayoutState` 与 Ribbon/Tree 外观状态；Pinia、本地存储或未来后端数据库仍由 Admin 选择。
   推荐新增 Admin 自有版本化 envelope，迁移旧 `navigationStyle / ribbonLayout / primaryOpen / propertiesOpen / logOpen / logHeight`，再由 `pnwNormalizeWorkbenchDisplayPreferences` 统一校验；设置坐标写入须防抖，旧 key 第一阶段保留用于回滚。
6. 先验证少量 workbench 路由，再扩大覆盖。classic 模式始终可用于行为对照与安全回退。

### 退出门禁

- Admin 权限过滤前后没有新增可见菜单，Ribbon/Tree 共用同一投影树；
- process tab 的选择、关闭、keep-alive 和独立路由回退保持现有语义；
- 无 contribution 的区域不渲染，普通页面不因框架默认生成 Secondary；
- Footer、Bottom tabs、三个 separator、light/dark/system 和 Admin token 覆盖可用；
- Admin 仓类型、测试、构建门禁通过，manifest 与 lockfile 没有本地路径污染；
- `classic / workbench / hybrid` 三种入口至少完成启动 smoke，且没有修改 Admin Node API。

建议命令以 Admin 仓当时实际脚本为准，最低包含：

```bash
cd ../phoenix-admin-vue
pnpm test
pnpm type-check
pnpm build
```

本地 Wing resolver 建立后再补充 `dev:local-wing`、`build:local-wing` 与依赖污染门禁，并把标准命令写回 Admin 仓文档。

## 5. 独立启动与端口

| 服务 | 地址 | 用途 |
|---|---|---|
| Wing fixture | `http://127.0.0.1:41789/` | 公共组件与主题视觉真源 |
| Open Issue Web | `http://127.0.0.1:41791/` | 简单消费者回归 |
| Open Issue API | `http://127.0.0.1:41792/` | Open Issue 本地业务 API |
| Phoenix Admin Web | `http://127.0.0.1:9000/` | 复杂消费者基线与后续适配 |
| Phoenix Admin API | `http://127.0.0.1:8101/` | Admin 既有后端；W4 不修改 |

这些端口的服务彼此独立，不把一个消费者的代理、Pinia 或登录状态引入另一个消费者。启动前检查端口占用；已有正确服务时复用，不再开重复实例。若需规避冲突，只通过进程参数或环境变量改开发端口，不把个人端口写入公共依赖配置。

## 6. 双消费者比较与 Wing 回收门

只有下列证据同时出现，才允许回到 Wing 增加或调整公共 API：

| 决策点 | Open Issue 要提供的证据 | Phoenix Admin 要提供的证据 | 默认处理 |
|---|---|---|---|
| 窄屏 Tree | Activity Rail 是否遮挡真实 Issue View | 权限菜单和多 Tab 下是否需要临时目录抽屉 | 继续记录，不新增 drawer 状态 |
| View contribution | 无 Block 与 Bottom-only 页面生命周期 | Primary/Secondary/Bottom 动态页面生命周期 | 只稳定组件/props 最小交集 |
| 显示设置 | 公共快捷菜单/完整对话框是否覆盖简单产品 | Admin 是否只需 slot 追加产品字段 | Wing 维护公共表单；产品字段留 consumer slot |
| 导航分组偏好 | 简单前端状态是否需要移动分组 | 权限、默认分组和后端持久化如何合并 | 保持宿主数据，不定义公共存储 DTO |
| Tab/关闭语义 | Router 标签与最后 View 关闭 | process/keep-alive/dirty 守卫 | Wing 只发事件，不拥有会话 |
| Footer/Bottom | 产品状态和日志开关 | 多日志/问题面板与状态区 | 保留无业务语义 slot/tab 契约 |

若两个消费者仅需要不同产品语义，各自在 `Poi*` / `Pah*` adapter 解决，不增加 `PnwNavigationNode` 字段。公共修改必须补 Wing 单测、fixture 回归、类型、构建与文档门禁，并使用独立中文提交。

## 7. 阶段完成定义

W4 按以下顺序关闭：

1. **A0 已完成：** Open Issue 第一轮壳层接入、本地验证和分支归档；
2. **A1 已完成本地候选证据：** Open Issue 真实 View contribution、窄屏、关闭生命周期、类型与 core/server/Web 生产 bundle 全部通过；
3. **B0 已完成：** 原 dirty 工作未动，已建立独立 `codex/pnw-workbench-shell` worktree；
4. **B1 已完成：** Admin 薄 adapter、权限导航、偏好迁移与工作台路由接入；
5. **B2 待完成：** Admin classic/workbench/hybrid、权限、多 Tab、动态 Block 和布局偏好回归；
6. **C0 已完成本轮比较：** Open Issue/Admin 未要求扩充导航或 Shell 数据结构；真实 Desk 消费只暴露标题 composable 的只读输入类型过窄，已在 Wing 最小修正；
7. **C1 进行中：** Desk Tools 已完成针对性布局接入与完整 local-Wing 测试/构建，BOM Studio 仍作为独立 Shell adapter 工作线；
8. **C2 待完成：** 汇总四个消费者证据，决定实验契约是否冻结以及何时发布 Wing 新版本。

2026-07-29 两个独立只读复核均得出相同结论：当前 0.6.0 候选不再缺强制公共 API。Open Issue 的最后页关闭、Admin 的权限/Router/KeepAlive/图标、两边的持久化 envelope 都属于产品 adapter；不得为这些差异继续扩充 `PnwNavigationNode` 或 Shell。

同日 KT BOM Studio 的独立复核确认：当前仍是 `0.5.1 +` 五段自建壳，尚未接入 Shell、统一导航树、显示偏好、`PnwPageHeader` 或实例级 View contribution。它已正式纳入 C1；先补标准 local-Wing resolver，再在独立分支用一个 BOM Shell adapter 收敛，现有 24 个 Primary 页面作为真实生命周期证据，Secondary/Bottom 不造假数据。

任一消费者“能启动”只表示进入 smoke，不等于 W4 完成；发布决定必须在 C0 之后单独确认。
