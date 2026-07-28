# Pnw 工作台 Web · Open Issue 应用分析

状态：in-progress

Owner：Phoenix Wing maintainers / Phoenix Open Issue maintainers

适用版本：Wing 0.5.2 本地候选、Open Issue `codex/single-pnw-workbench`

最后核验：2026-07-28

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

工作树在本次核验时干净。主要接入文件：

| 文件 | 当前规模 | 责任 |
|---|---:|---|
| `packages/web/src/layout/AppShell.vue` | 207 行 | Shell 装配、品牌、RouterView、Footer 与当前固定 Bottom |
| `packages/web/src/composables/useOpenIssueWorkbench.ts` | 228 行 | Router、页面 Tab、session 与导航动作 adapter |
| `packages/web/src/stores/workbench.ts` | 79 行 | 显示、布局与本地偏好状态 |
| `packages/web/src/layout/workbench/openIssueNavigation.ts` | 15 行 | 既有 Ribbon contribution 到唯一导航树的投影 |

当前通过进程级 resolver 消费并列 Wing 0.5.2 源码；Open Issue manifest 与 lockfile 继续精确锁定 Registry `phoenix-wing@0.5.1`。

## 3. 当前适配矩阵

| 能力 | 状态 | 当前判断 |
|---|---|---|
| `PnwWorkbenchShell` 组合入口 | 已接入 | 根 Shell 已不再手工组合 Wing Header/Ribbon/Footer |
| Ribbon/Tree 同一导航树 | 已接入 | `pnwNavigationFromRibbonTabs` 从一份既有 Ribbon contribution 投影 |
| Router 与页面 Tab | 已接入第一轮 | 仍由 `useOpenIssueWorkbench` 持有，Wing 不读取 path |
| 品牌与 Header actions | 已接入 | 品牌 slot、用户和退出保持产品语义 |
| `PnwWorkbenchLayoutState` | 已接入 | 显隐和尺寸由产品 Pinia 持有 |
| Footer | 已接入 | 左侧产品状态，右侧 Wing Block 开关 |
| Bottom | 部分接入 | 已进入 Wing Bottom 区，但当前仍由根 Shell 固定贡献日志 |
| 动态 View contribution | 未完成 | 真实页面尚未各自在 setup/KeepAlive 生命周期登记 Primary/Bottom/Secondary |
| Secondary 默认策略 | 符合 | 当前不默认显示 Secondary |
| 工作台显示菜单 | 公共 UI 已接入，主题回写待补 | 浏览器已看到单行 PnwIcon 快捷菜单与公共完整对话框；当前只传入 `colorScheme`，未监听 `update:colorScheme`，点击主题后仍保持 `system` |
| 窄屏 Tree | 待复盘 | 需要更多真实页面与约 700px 场景证据 |
| layout 旧实现删除 | 第一轮完成 | 仍需扩大页面覆盖后检查遗留 CSS、状态和固定 Block |

当前结论只能是“第一轮壳层接入成功”，不能据此宣布 layout 已充分精简。

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

## 6. 显示设置与 consumer 扩展示例

Open Issue 应直接获得 Wing 的公共显示能力：

- 快捷下拉为单行 `PnwIcon + 文本`；
- “完整显示设置…”打开 Wing 公共可移动对话框；
- 主题、导航呈现、Ribbon 模式、合法图标尺寸、Title 和分组标签不由 Open Issue 重写；
- Open Issue 只绑定自己的 Pinia，并决定如何持久化。

如果 Open Issue 需要追加产品动作，可使用 `display-settings-actions` slot，通过 `emitAction(actionId)` 把信号交给产品 handler。如果需要在完整对话框中追加产品自定义界面，例如句柄方式或产品主题，可以把独立 `Poi*` 组件放入 `display-settings-panel-extra`；组件直接绑定产品状态，Wing 不解释字段。

## 7. 后续阶段

1. **O1：** 跟随 Wing 当前本地候选，补齐 `v-model:color-scheme` 或等价的 `update:colorScheme` 回写，再验证主题更新；公共快捷菜单和完整设置对话框已完成浏览器 smoke，产品 action/扩展 slot 按实际需要接入；
2. **O2：** 选取真实页面建立实例级 View contribution，首先移除根 Shell 固定 Bottom；
3. **O3：** 扩大到详情、组织和设置页面，执行本文 Layout 复盘；
4. **O4：** 记录删除的旧 layout、保留的产品 adapter、行数趋势和窄屏证据；
5. **O5：** 运行 `pnpm verify:local-wing` 与浏览器回归，再决定 Open Issue 适配是否可作为 W4 简单消费者完成证据。

任何阶段都不得通过 `link:`、`file:`、`workspace:`、`pnpm link`、override 或修改 `node_modules` 消费本地 Wing。
