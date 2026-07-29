# Pnw 工作台 Web · Open Issue 应用分析

状态：in-progress

Owner：Phoenix Wing maintainers / Phoenix Open Issue maintainers

适用版本：Wing 0.6.0 本地候选、Open Issue `codex/single-pnw-workbench`

最后核验：2026-07-29

## 1. 目的

本文独立追踪 Open Issue 对 `PnwWorkbenchShell` 的真实应用情况。它回答的不是“页面视觉是否已经相似”，而是：

- Open Issue 的根 layout 是否真正收敛为薄壳；
- Router、页面标签、KeepAlive、View contribution、Bottom 与 Footer 是否只有一份状态；
- 哪些兼容代码可在真实 View 覆盖扩大后删除；
- 哪些产品差异应继续留在 `Poi*` adapter，而不是扩展 Wing。

本分析不修改 Open Issue 的业务 API、权限、Router 或领域页面，也不把本地源码消费描述为 Registry 发布完成。

## 2. 当前基线

当前验证分支为 `codex/single-pnw-workbench`，第一轮提交：

- `0f5d692 工作台：接入本地Wing组合壳层`
- `1ba5833 工作台：收敛快捷显示设置接线`
- `023fa9b 工作台：适配 Wing 0.6.0 显示偏好与空状态`
- `4fb5611 工作台：接入页面级 View 贡献`

工作树在本次核验时干净。主要接入文件：

| 文件 | 当前规模 | 责任 |
|---|---:|---|
| `packages/web/src/layout/AppShell.vue` | 207 行 | Shell 装配、品牌、RouterView、Footer 与当前固定 Bottom |
| `packages/web/src/composables/useOpenIssueWorkbench.ts` | 228 行 | Router、页面 Tab、session 与导航动作 adapter |
| `packages/web/src/stores/workbench.ts` | 79 行 | 显示、布局与本地偏好状态 |
| `packages/web/src/layout/workbench/openIssueNavigation.ts` | 15 行 | 既有 Ribbon contribution 到唯一导航树的投影 |

当前通过进程级 resolver 消费并列 Wing 0.6.0 源码；Open Issue manifest 与 lockfile 继续精确锁定 Registry `phoenix-wing@0.5.1`。

2026-07-29 命令级复核：`pnpm wing:check-local` 与 `pnpm verify:wing-dependencies` 均通过，正确命中并列 Wing `0.6.0`，两处 manifest 引用仍是 Registry `0.5.1` 且无 override。`pnpm verify:local-wing` 完成 Wing 构建和 37 篇 Open Issue 文档门禁后，19 个测试文件中 17 通过、1 失败、1 跳过；140 项中 134 通过、1 失败、5 跳过。唯一失败是 `wing-registry-contract.test.ts` 在本地模式仍硬编码期待 `PNW_VERSION === '0.5.1'`，实际值正确为 `0.6.0`；这是消费者测试没有区分 Registry/LOCAL，不是 resolver 或 Wing API 回归。

单独 `pnpm build:local-wing` 又证明 Open Issue core `tsc` 通过，但 Server `tsc` 在当前只读消费者仓写 `packages/server/dist` 时因 `EPERM` 中止，Web build 未开始。Open Issue 与 Wing tracked diff 均未由回归命令改变。当前 Node `23.7.0` / pnpm `9.15.9` 也不等于 Wing 文档统一的 Node 22 / pnpm 10.15.1 环境，因此本次结果只作为来源和局部回归证据，不能替代标准环境完整验收。

随后两笔实际适配修正了上述产品缺口：Registry/LOCAL 版本测试不再硬编码本地 0.5.1；品牌显示实际 `PNW_VERSION`；v2 显示偏好 envelope 兼容读取旧 v1；关闭最后或全部 Tab 后进入稳定空工作台。`Poi*` registry 让 Dashboard、列表/详情、组织、设置、Issue 点检与设置修复在真实 setup/KeepAlive 生命周期贡献 Primary/Secondary/Bottom，根 Shell 的固定日志 Bottom 已删除。

最终在可写消费者环境执行完整 `pnpm verify:local-wing`，Wing 0.6.0 构建、37 篇文档、19 个测试文件、Open Issue core/server/Web 构建全部通过：LOCAL 为 140 passed / 5 skipped，Web 生产构建转换 3453 个模块；另有 9 项生命周期与窄屏有效布局定向测试通过。Registry 对照仍为 138 passed / 7 skipped。构建只保留常规 chunk-size 提示，没有 manifest、lockfile、override 或 tracked diff 污染。该结果关闭了先前 `.vite-temp` / `dist` 写权限造成的验证缺口，但仍不等于 Registry 0.6.0 已发布。

2026-07-29 的主题与 Footer 复核又形成 `2e900ad 工作台：接通应用主题与 Footer 契约`。Open Issue 使用 Wing 已有 `pnwApplyColorScheme`，把 `light / dark / system` 同步到 HTML `data-theme`、`.dark` 与 Element Plus 暗色变量；system 会响应 `prefers-color-scheme`，不新增公共主题 API。Wing 同期以 `88afafe` 将 Footer 的 Primary / Bottom / Secondary 三个入口改为固定渲染、无 contribution 时禁用，并让 Layout/Shell 默认保留 Footer；consumer 只有显式 `showFooter = false` 才关闭。Open Issue 没有伪造 contribution 或复制 Footer。最终 Registry 为 141 passed / 7 skipped，LOCAL 为 144 passed / 5 skipped，完整 local-Wing 构建通过，Web 转换 3455 个模块。

## 3. 当前适配矩阵

| 能力 | 状态 | 当前判断 |
|---|---|---|
| `PnwWorkbenchShell` 组合入口 | 已接入 | 根 Shell 已不再手工组合 Wing Header/Ribbon/Footer |
| Ribbon/Tree 同一导航树 | 已接入 | `pnwNavigationFromRibbonTabs` 从一份既有 Ribbon contribution 投影 |
| Router 与页面 Tab | 已接入第一轮 | 仍由 `useOpenIssueWorkbench` 持有，Wing 不读取 path |
| 品牌与 Header actions | 已接入 | 品牌 slot、用户和退出保持产品语义 |
| `PnwWorkbenchLayoutState` | 已接入 | 显隐和尺寸由产品 Pinia 持有 |
| Footer | 已接入 | 左侧产品状态，右侧 Wing 三个固定 Block 开关；无 contribution 时禁用 |
| Bottom | 已动态接入 | 设置数据库修正按当前 View 贡献真实 Bottom；根 Shell 不再固定日志内容 |
| 动态 View contribution | 已接入 | Dashboard、列表/详情、组织、设置、Issue 点检在 setup/KeepAlive 生命周期登记并释放真实 Block |
| Secondary 默认策略 | 符合 | 当前不默认显示 Secondary |
| 工作台显示菜单 | 已接线 | Tree 外观、Tab 位置、主题与设置浮窗坐标均由产品 Pinia 双向绑定；主题真实作用到应用根与 Element Plus |
| 显示偏好持久化 | 已归一化 | v2 envelope 统一调用 normalizer，并兼容迁移旧 v1 快照 |
| 窄屏 Tree | 自动布局已验证 | 定向测试证明窄容器只改变 effective Ribbon/Tab 位置，不覆盖保存偏好；发布前仍需浏览器视觉复核 |
| layout 旧实现删除 | 已扩大覆盖 | 根 Shell 固定 Bottom 已删；真实筛选、组织树与点检内容迁入页面 contribution，生产 bundle 已通过 |

当前代码、生命周期、类型与生产 bundle 证据已达到“简单消费者本地候选接入完成”。浏览器发布回归和 Registry 精确升级仍应在 Wing 0.6.0 真正发布后执行，不能把本地源码消费写成发布验收完成。

## 4. 已确认的产品边界

- Open Issue Router、route name/path、动态详情 ID 和回退路径留在产品 adapter；
- 页面 Tab session 与 localStorage key 留在产品；
- 权限和页面可见性继续由 Open Issue 现有菜单/Router 决定；
- 普通页面默认不贡献 Secondary；
- 日志内容、页面状态和 Footer 左侧文案属于产品；
- Wing 只负责 Header、Activity、TabBar、四区布局、separator、Footer 开关、显示菜单和 View contribution 生命周期容器。

## 5. 扩大真实 View 后的 Layout 复盘

至少让列表详情、Issue 详情、组织和设置等页面经过新 Shell 后，再执行以下复盘：

1. `AppShell.vue` 是否只剩 Shell、RouterView、品牌和产品 action，是否仍有固定业务 Block；
2. Primary / Secondary / Bottom 是否由页面动态注册、停用和卸载，根组件固定 `contributions="{ bottom: true }"` 是否可以删除；
3. Bottom 日志是否应成为产品级常驻 contribution、页面 contribution 或两者合并的受控 tabs；
4. 是否仍存在旧 Ribbon、Footer、日志展开、面板宽高或断点 CSS，形成第二套 layout 真源；
5. Router watcher、workbench tab、KeepAlive、关闭活动标签和关闭全部是否只有一条生命周期链；
6. 关闭最后一个标签时 Editor、路由与空状态是否一致，不残留已关闭 View；
7. `useOpenIssueWorkbench` 是否仍保持按 `navigation / tabs / actions` 分组，或因更多页面接入膨胀为业务状态仓库；
8. 约 700px 下 Activity Rail、页面标签、Editor 和 Bottom 是否遮挡，是否能为 Wing 窄屏 Tree 决策提供证据；
9. 页面 CSS 是否依赖旧 Shell DOM、固定 viewport 高度或重复 padding；
10. 能否删除兼容代码并给出删除清单、文件行数趋势与浏览器回归截图。

2026-07-29 只读复核已复现一个产品生命周期缺口：关闭最后一个 dashboard 后再次 `push('/dashboard')` 属于同路由，route watcher 不会重开 Tab，因而可能出现标签为空但旧 View 仍渲染。Open Issue 必须在 adapter 内选择“显式重开默认 dashboard”或“真正进入 Shell 空态”，不能要求 Wing 猜默认路由。

同次复核还确认：当前 store 直接断言 localStorage JSON，尚未保存 `treeAppearance / tabBarPlacement / settingsPositions`，Shell 也没有接齐这些 update 事件；根 Shell 的 Bottom 仍固定使用几乎没有生产者的字符串日志。O1/O2 应改为完整 `PnwWorkbenchDisplayPreferences` envelope，并把实际日志桥接到 `PnwLogBlock` 或实例 hub，再由真实页面注册 Bottom contribution。品牌副标题中的 “local 0.5.2” 也应改为 resolver 注入或当前 0.6 候选文案，但 Registry 依赖仍保持 0.5.1。

## 6. 显示设置与 consumer 扩展示例

Open Issue 应直接获得 Wing 的公共显示能力：

- 快捷下拉为单行 `PnwIcon + 文本`；
- “完整显示设置…”打开 Wing 公共可移动对话框；
- 主题、导航呈现、Ribbon 模式、合法图标尺寸、Title 和分组标签不由 Open Issue 重写；
- Open Issue 只绑定自己的 Pinia，并决定如何持久化。

如果 Open Issue 需要追加产品动作，可使用 `display-settings-actions` slot，通过 `emitAction(actionId)` 把信号交给产品 handler。如果需要在完整对话框中追加产品自定义界面，例如句柄方式或产品主题，可以把独立 `Poi*` 组件放入 `display-settings-panel-extra`；组件直接绑定产品状态，Wing 不解释字段。

## 7. 后续阶段

1. **O1 已完成：** v2 `PnwWorkbenchDisplayPreferences` envelope、normalizer 和完整双向接线；
2. **O2 已完成：** 实例级真实 View contribution 与根 Shell 固定 Bottom 删除；
3. **O3 已完成本地候选：** 已扩大到详情、组织和设置页面，生产 Web bundle 通过；发布前仍保留浏览器 CSS 冒烟；
4. **O4 已完成语义修正：** 关闭最后/全部 Tab 使用 Shell 空态，不再同路由重建 dashboard；
5. **O5 已完成本地候选：** Registry/LOCAL contract、两套全量测试、类型与 core/server/Web 构建通过；Registry 升级和发布浏览器回归不属于本地候选完成声明。

任何阶段都不得通过 `link:`、`file:`、`workspace:`、`pnpm link`、override 或修改 `node_modules` 消费本地 Wing。
