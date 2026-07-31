# phoenix-wing v0.1 内容总览

> 命名规范详见 **[命名规则.md](命名规则.md)** | 点检清单见 **[naming-checklist.md](naming-checklist.md)**

## 目录结构

```
src/
├── index.ts                            ← 统一导出入口
├── utils/
│   ├── pnwAsyncProgress.ts             ← 异步任务进度纯函数
│   ├── pnwAsyncProgressTypes.ts        ← 进度类型定义
│   ├── pnwScheduleDebounced.ts         ← 防抖调度
│   ├── pnwColorScheme.ts               ← 色彩方案解析
│   ├── pnwPointerDrag.ts               ← 指针拖拽
│   ├── pnwFloatingPanel.ts             ← 浮动面板可见范围修正
│   ├── pnwBrowserStorage.ts            ← 浏览器存储
│   ├── pnwNavigationTree.ts             ← 受控导航树纯投影
│   ├── pnwWorkbenchWeb.ts               ← Ribbon 外观与 Block 状态纯规则
│   └── pnwPagePropertySchema.ts        ← 属性表 schema 构建器
├── types/
│   ├── pnwPageProperties.ts            ← 属性面板类型系统
│   ├── pnwComboTypes.ts                ← 下拉选项类型
│   ├── PnwRibbonConfig.ts              ← Ribbon 配置类型
│   ├── PnwWorkbench.ts                 ← 工作台 Tab 类型
│   └── PnwWorkbenchWeb.ts              ← Web 工作台实验契约
├── icons/
│   └── pnwIconCatalog.ts               ← 常用 SVG 图标名称与尺寸清单
├── components/
│   ├── PnwAppModalOverlay.vue          ← 全屏模态框
│   ├── PnwChoiceDialogHost.vue         ← 选择对话框
│   ├── PnwComboTextInput.vue           ← 组合输入框
│   ├── PnwExpandCaret.vue              ← 展开三角图标
│   ├── PnwFloatingPanel.vue            ← 无遮罩可拖动浮动面板
│   ├── PnwIcon.vue                     ← 常用 currentColor SVG 图标
│   ├── PnwPhoenixWingMark.vue          ← Phoenix Wing 彩色品牌标志
│   └── PnwAsyncProgressOverlay.vue     ← 任务进度浮层
├── layout/
│   ├── PnwSidebarBlock.vue             ← 可折叠侧栏块
│   ├── PnwSidebarBlockHead.vue         ← 侧栏块标题
│   ├── PnwActivityBar.vue              ← Ribbon / Tree 受控导航入口
│   ├── PnwActivityTree.vue             ← 侧面大目录树
│   ├── PnwRibbon.vue                   ← 导航 Ribbon 呈现
│   ├── PnwPrimaryBlock.vue             ← Primary Block 容器
│   ├── PnwSecondaryBlock.vue           ← Secondary Block 容器
│   ├── PnwBottomPanel.vue              ← Editor 底部面板
│   ├── PnwWorkbenchHeader.vue           ← 品牌/模块/页签/操作插槽页眉
│   ├── PnwWorkbenchLayout.vue          ← 工作台对齐与主题根
│   ├── PnwWorkbenchFooter.vue          ← Block 仅图标开关
│   ├── PnwRibbonShell.vue              ← Ribbon 容器
│   ├── PnwRibbonTabBar.vue             ← 功能标签切换
│   ├── PnwRibbonGroup.vue              ← 按钮分组
│   ├── PnwRibbonToolButton.vue         ← 工具按钮（双模式）
│   ├── PnwRibbonUtilButton.vue         ← 通用工具按钮
│   ├── PnwPageHeader.vue               ← 页面标题头
│   ├── PnwShellLogPanel.vue            ← 日志面板
│   ├── PnwWorkbenchTabBar.vue          ← 页面标签栏
│   └── PnwWelcomeShell.vue             ← 欢迎页骨架
├── composables/
│   ├── pnwChoiceDialog.ts              ← 选择对话框逻辑
│   ├── pnwCreateWorkbench.ts           ← Tab 管理引擎
│   ├── pnwPagePropertiesHost.ts        ← 属性表注册中心
│   ├── pnwRibbonIcons.ts               ← Ribbon 图标映射
│   ├── pnwShellUrlSync.ts              ← URL 同步
│   ├── pnwSideDockLayout.ts            ← 侧栏布局计算
│   ├── usePnwDocumentTitle.ts          ← 文档标题同步
│   ├── usePnwPagePropertySheet.ts      ← 属性表生命周期
│   ├── usePnwResizableTable.ts         ← 表格列宽拖拽
│   └── usePnwRibbonTabs.ts             ← Ribbon Tab 切换
└── stores/
    └── pnwAsyncTasks.ts                ← 异步任务 Pinia store
```

## 模块说明

### 纯工具函数（零框架依赖）

| 模块                      | 说明             | 主要导出                                                                                                                                                            |
| ----------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnwAsyncProgress`      | 异步任务进度状态机      | `pnwCreateScanTaskState`, `pnwCreateTestTaskState`, `pnwUpdateTaskFromPoll`, `pnwUpdateTaskFromStreamEvent`, `pnwComputeProgressPercent`, `pnwFormatDuration` 等 |
| `pnwAsyncProgressTypes` | 进度相关类型定义       | `PnwAsyncTaskState`, `PnwAsyncProgressStep`, `PnwTaskStatus`, `PnwStepStatus`, `PNW_SCAN_STEP_LABELS`, `PNW_TEST_STEP_LABEL` 等                                  |
| `pnwScheduleDebounced`  | 防抖调度           | `pnwScheduleDebounced`                                                                                                                                          |
| `pnwColorScheme`        | 色彩方案解析         | `PnwColorScheme`, `pnwResolveColorScheme`, `pnwApplyColorScheme`                                                                                                |
| `pnwPointerDrag`        | 指针拖拽交互         | `pnwBindPointerDrag`                                                                                                                                            |
| `pnwFloatingPanel`      | 浮动面板边界修正     | `pnwClampFloatingPanelPosition`、`PnwFloatingPanelPosition`、`PnwFloatingPanelSize`                                                                            |
| `pnwBrowserStorage`     | 浏览器存储清理        | `pnwClearPhoenixBrowserStorage`                                                                                                                                 |
| `pnwNavigationTree`     | 导航树受控投影        | `pnwVisibleNavigationNodes`, `pnwFlattenNavigationTree`, `pnwNavigationLeafIds`, `pnwProjectNavigationRibbon`                                                  |
| `pnwWorkbenchWeb`       | Ribbon 外观与 Block 纯规则 | `pnwValidateRibbonAppearance`, `pnwNextRibbonFocusIndex`, `pnwResolveViewBlockVisibility`, `pnwToggleViewBlockVisibility`                              |
| `pnwPagePropertySchema` | 属性表 schema 构建器 | `pnwPropGroup`, `pnwPropBool`, `pnwPropEnum`, `pnwPropString`, `pnwPropNumber`, `pnwPropPath`, `pnwPropReadonly`, `pnwPropSheet`                                |

### 类型定义

| 模块 | 说明 |
|------|------|
| `pnwPageProperties` | 属性面板完整类型系统（`PnwPagePropertyField`, `PnwPagePropertyGroup`, `PnwPagePropertiesSheet` 等） |
| `pnwComboTypes` | 下拉选项 `PnwComboOption` 类型 |
| `PnwRibbonConfig` | Ribbon 配置类型（`PnwRibbonTabDef`, `PnwRibbonGroupDef`, `PnwRibbonItemDef`）                |
| `PnwWorkbench`    | 工作台类型（`PnwWorkbenchTab`, `PnwOpenTabOptions`, `PnwPageTabPolicy` 等）                    |
| `PnwWorkbenchWeb` | 受控导航、Ribbon 外观、统一布局状态、Bottom Tab 与 View Block contribution 实验契约（W4 前不冻结） |

### Vue3 控件

| 组件 | 说明 | 依赖 |
|------|------|------|
| `PnwAppModalOverlay` | 全屏模态框，Teleport 到 body，Escape 关闭 | Vue 3 |
| `PnwChoiceDialogHost` | 多按钮选择对话框，支持复选框 | Vue 3 + Element Plus |
| `PnwComboTextInput` | 带下拉选项的文本输入框 | Vue 3 |
| `PnwExpandCaret` | 展开/折叠三角图标 | 无 |
| `PnwFloatingPanel` | 无背景遮罩、受控位置、可拖动且自动修正到可见范围的浮动面板 | Vue 3 |
| `PnwIcon` | 首批 16 个常用壳层 currentColor SVG 图标，回归 16/24/36/48/64px | Vue 3 |
| `PnwAsyncProgressOverlay` | 任务进度浮层（全屏/浮动/最小化三态） | Vue 3 + Element Plus + Pinia |

### 壳层布局组件

| 组件 | 说明 | 依赖 |
|------|------|------|
| `PnwSidebarBlock` | 可折叠侧栏块，支持 strip/card 两种变体 | Vue 3 |
| `PnwPhoenixWingMark` | Phoenix Wing 红橙/青蓝羽翼与中央火焰品牌标志，支持装饰/可访问语义 | Vue 3 |
| `PnwSidebarBlockHead` | 侧栏块标题行 | PnwExpandCaret |
| `PnwActivityBar` | 同一导航树的 Ribbon / Tree 受控入口 | PnwRibbon、PnwActivityTree |
| `PnwActivityTree` | 可展开、键盘可操作的侧面目录树；可受控收起为末级节点 Activity Rail | Vue 3 |
| `PnwRibbon` | 导航树的模块/分组 Ribbon 投影 | PnwRibbonShell、PnwRibbonGroup |
| `PnwPrimaryBlock` / `PnwSecondaryBlock` | 当前 View 可选侧 Block | Vue 3 |
| `PnwBottomPanel` | 与 Editor 左右边界对齐、由顶边句柄调高的受控多 Tab 底部面板 | Vue 3 |
| `PnwWorkbenchHeader` | 品牌、Ribbon 大分组、打开页签和操作区的无状态插槽壳 | Vue 3 |
| `PnwWorkbenchLayout` | 以统一 `PnwWorkbenchLayoutState` 受控 Header、ActivityBar、四区尺寸/显隐、Bottom Tab 与主题 token | Vue 3 |
| `PnwWorkbenchShell` | 默认 Phoenix 品牌/空状态、动态 View Block 组件与全层命名 slot 的消费者组合入口 | Vue 3 |
| `PnwWorkbenchFooter` | 按 contribution 显示三个仅图标布局开关 | Vue 3 |
| `PnwRibbonShell` | Ribbon 容器（折叠/展开） | Vue 3 |
| `PnwRibbonTabBar` | Ribbon 功能标签切换条 | Vue 3 |
| `PnwRibbonGroup` | Ribbon 按钮分组容器 | PnwRibbonToolButton |
| `PnwRibbonToolButton` | Ribbon 工具按钮（大按钮 stacked / 小按钮 inline 双模式） | Vue 3 |
| `PnwRibbonUtilButton` | Ribbon 通用工具按钮 | Vue 3 |
| `PnwPageHeader` | 页面标题头（标题 + 操作区 + 帮助区） | Vue 3 |
| `PnwShellLogPanel` | 日志面板（自动滚动 + 清空/关闭） | PnwSidebarBlock |
| `PnwWorkbenchTabBar` | 页面标签栏（支持 header 模式） | Vue 3 |
| `PnwWelcomeShell` | 欢迎页骨架（品牌栏 + 操作 + 主内容区，slot 化） | Vue 3 |

### 组合式函数 / 引擎

| 模块                        | 说明                                                            |
| ------------------------- | ------------------------------------------------------------- |
| `pnwCreateWorkbench`      | Tab 管理引擎（开/关/切换/去重/session 恢复）                                |
| `usePnwRibbonTabs`        | Ribbon Tab 切换逻辑（module 联动过滤）                                  |
| `pnwRibbonIcons`          | Ribbon 图标注册与查找（`pnwRegisterRibbonIcons` + `pnwRibbonIconFor`） |
| `pnwShellUrlSync`         | URL ↔ 应用状态同步（`pnwParseShellUrl`, `pnwReplaceShellUrl`）        |
| `pnwSideDockLayout`       | 侧栏布局可见性计算                                                     |
| `usePnwDocumentTitle`     | 文档标题同步                                                        |
| `usePnwResizableTable`    | 表格列宽拖拽                                                        |
| `pnwPagePropertiesHost`   | 属性表注册中心                                                       |
| `usePnwPagePropertySheet` | 属性表注册生命周期                                                     |
| `usePnwViewContribution` | consumer 隔离的 View contribution 登记、切换与 KeepAlive 生命周期        |
| `pnwChoiceDialog`         | Promise 风格的确认对话框（`pnwPromptChoice`, `pnwResolveChoice`）       |

### 状态管理

| 模块           | 说明                                                  |
| ------------ | --------------------------------------------------- |
| `pnwAsyncTasks` | 异步任务 Pinia store（`usePnwAsyncTaskStore`），多任务、持久化、取消 |

### 非发布示例

`examples/PwwWorkbenchWeb/` 通过根公共入口演示同一导航树的 Ribbon/Tree、View 动态 Block、Footer、响应式和 light/dark/system/custom token；假导航、假 View、Pinia 状态和设置 UI 均隔离在 `src/fixture/PwwFixture*`，不是 consumer 必须复制的接入文件，也不是 npm 包或产品实现。
