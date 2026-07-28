# Pnw 工作台 Web 双消费者验证计划

状态：in-progress

Owner：Phoenix Wing maintainers

适用版本：Wing 0.5.2 本地候选（未发布）

最后核验：2026-07-28

## 1. 目标

W0–W3 已在 Wing 仓内完成公共壳层、受控导航、动态 View Block、布局状态、Footer、主题 token 与 `PwwWorkbenchWeb` fixture。W4 不再继续堆叠示例功能，而是让两个差异足够大的真实 Vue Web 消费者验证公共边界：

- Phoenix Open Issue 证明“简单消费者”：无权限菜单协议、默认不显示 Secondary、少量产品状态即可接入同树 Ribbon/Tree、页面标签、Bottom 与 Footer；
- Phoenix Admin 证明“复杂消费者”：复用既有权限菜单、Router、process/keep-alive、Pinia/后端偏好和按页面 View contribution，同时保留 classic/workbench 回退；
- Phoenix Wing 仍是公共组件与纯 TypeScript 契约的唯一写入目标。消费者任务只提交各自的 `Poi*` / `Pah*` adapter，不得复制或分叉 `Pnw*` 实现。

W4 完成前，`PnwWorkbenchShell`、`PnwNavigationNode` 和 View Block component contribution 继续按实验契约管理；本计划不触发 npm 发布。

## 2. 仓库、分支与并行边界

| 工作线 | 仓库 / 分支 | 当前状态 | 允许写入 | 禁止事项 |
|---|---|---|---|---|
| Wing 真源 | `phoenix-wing` / `develop` | W0–W3 与 fixture 已完成，0.5.2 本地候选 | 公共契约、组件、纯函数、测试与文档 | 消费者 Router、权限、业务 API、偏好存储 |
| Open Issue | `phoenix-open-issue` / `codex/single-pnw-workbench` | 第一轮本地适配已提交且工作树干净 | Open Issue 薄 adapter、产品 Pinia、View contribution 与回归测试 | 修改 Wing 真源、引入本地路径依赖、复制 fixture 业务假数据 |
| Phoenix Admin | `phoenix-admin-vue` / 待建 `codex/pnw-workbench-shell` | 当前 `codex/open-issue-plugin` 有未归档改动 | 仅在独立干净分支或 worktree 中修改 `Pah*` adapter 与壳层 | 覆盖现有 dirty 文件、修改 Admin Node、一次替换 classic 模式 |

消费者工作线可以分别启动、测试和提交，但不得同时改 Wing。若消费者暴露公共缺口，先在本计划的“决策记录”中写清两个消费者证据，再回到唯一 Wing 工作线修改、验证和提交。

Phoenix Admin 当前工作树的 `.gitignore` 修改与 `build/cool/eps.*` 删除属于既有工作，不能由 W4 自动暂存、恢复或提交。开始 Admin 适配前必须先由其原任务归档，或从已确认的提交创建独立 worktree。

## 3. W4-A：Open Issue 简单消费者

### 已有基线

- 通过进程级 resolver 消费并列 Wing 0.5.2 源码；manifest 与 lockfile 继续精确锁定 Registry `phoenix-wing@0.5.1`；
- `PnwWorkbenchShell` 已接入现有 Ribbon 导航、Router、页面标签、Bottom 日志和 Footer；
- “工作台显示设置”使用 Wing 单行图标快捷菜单与公共完整设置对话框；Open Issue 不复制表单，只绑定自己的 Pinia，并可按需提供 consumer action/界面 slot；
- 默认 View 不贡献 Secondary；Footer 左侧保留产品状态，右侧由 Wing 生成可用 Block 开关；
- 已通过 `verify:local-wing`，当前适配分支工作树干净。

### 本阶段任务

1. 把 Open Issue 当前页面与 Block 的关系改为页面自身注册 contribution；应用根只装配 shell、当前 View 和产品动作，不写固定 Primary/Secondary/Bottom 模板。
2. 选择至少两个真实路由回归：一个普通 Issue 列表/详情 View，一个无 Primary/Secondary 的管理或组织 View；关闭标签后必须同步卸载或切换业务 View。
3. 验证 Bottom 日志多 Tab、Footer Bottom 开关和产品左侧状态；删除的旧 Footer 日志开关不得以第二套布局状态复活。
4. 验证 Ribbon/Tree 切换保持节点 ID、权限过滤后的可见性、排序、当前路由与选中状态一致。
5. 在约 700px 宽度验证 Activity Rail、页面标签和 Editor；只记录可复现的窄屏缺口，不先新增 Wing overlay/drawer API。

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

Phoenix Admin 尚未适配 W4 的 `PnwWorkbenchShell`。当前 `PahWorkbenchShell.vue` 仍手工绘制 Header、Tree、四区、Bottom 拖拽和 Footer，只复用了 Wing 0.5.1 的低层 Ribbon/Tab/Log 组件；也尚未建立唯一 `PnwNavigationNode[]` 投影、`PnwWorkbenchLayoutState`、动态 View contribution、Bottom tabs 或公共显示设置接线。

当前截图中多个功能都显示九宫格图标的直接原因也在 Admin：`ribbonGroupItems()` 把每个条目的图标硬编码为 `Grid`，而菜单数据与 `PahRibbonMenuAdapter` 已保留各自的 `icon` 字段。后续应先在 Admin 用产品侧 `PahMenuIcon` resolver 消费既有 SVG sprite；Wing 只继续维护跨至少两个 Web 消费者验证过的壳层通用图标，不把约 65 个 Admin 业务图标整体迁入公共库。

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
2. **A1 待完成：** Open Issue 真实 View contribution、窄屏与关闭生命周期回归；
3. **B0 待开始：** Admin dirty 工作归档并建立独立适配分支/worktree；
4. **B1 待完成：** Admin 薄 adapter 与少量 workbench 路由接入；
5. **B2 待完成：** Admin classic/workbench/hybrid、权限、多 Tab、动态 Block 和布局偏好回归；
6. **C0 待完成：** 比较两个消费者，只把共同且稳定的最小差异回收到 Wing；
7. **C1 待完成：** 决定实验契约是否冻结、是否仍需 BOM Studio/Desk Tools 针对性验证，以及何时发布 Wing 新版本。

任一消费者“能启动”只表示进入 smoke，不等于 W4 完成；发布决定必须在 C0 之后单独确认。
