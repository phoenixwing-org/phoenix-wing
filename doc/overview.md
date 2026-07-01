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
│   ├── pnwBrowserStorage.ts            ← 浏览器存储
│   └── pnwPagePropertySchema.ts        ← 属性表 schema 构建器
├── types/
│   ├── pnwPageProperties.ts            ← 属性面板类型系统
│   ├── pnwComboTypes.ts                ← 下拉选项类型
│   ├── PnwRibbonConfig.ts              ← Ribbon 配置类型
│   └── PnwWorkbench.ts                 ← 工作台类型
├── components/
│   ├── PnwAppModalOverlay.vue          ← 全屏模态框
│   ├── PnwChoiceDialogHost.vue         ← 选择对话框
│   ├── PnwComboTextInput.vue           ← 组合输入框
│   ├── PnwExpandCaret.vue              ← 展开三角图标
│   └── PnwAsyncProgressOverlay.vue     ← 任务进度浮层
├── layout/
│   ├── PnwSidebarBlock.vue             ← 可折叠侧栏块
│   ├── PnwSidebarBlockHead.vue         ← 侧栏块标题
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
| `pnwBrowserStorage`     | 浏览器存储清理        | `pnwClearPhoenixBrowserStorage`                                                                                                                                 |
| `pnwPagePropertySchema` | 属性表 schema 构建器 | `pnwPropGroup`, `pnwPropBool`, `pnwPropEnum`, `pnwPropString`, `pnwPropNumber`, `pnwPropPath`, `pnwPropReadonly`, `pnwPropSheet`                                |

### 类型定义

| 模块 | 说明 |
|------|------|
| `pnwPageProperties` | 属性面板完整类型系统（`PnwPagePropertyField`, `PnwPagePropertyGroup`, `PnwPagePropertiesSheet` 等） |
| `pnwComboTypes` | 下拉选项 `PnwComboOption` 类型 |
| `PnwRibbonConfig` | Ribbon 配置类型（`PnwRibbonTabDef`, `PnwRibbonGroupDef`, `PnwRibbonItemDef`）                |
| `PnwWorkbench`    | 工作台类型（`PnwWorkbenchTab`, `PnwOpenTabOptions`, `PnwPageTabPolicy` 等）                    |

### Vue3 控件

| 组件 | 说明 | 依赖 |
|------|------|------|
| `PnwAppModalOverlay` | 全屏模态框，Teleport 到 body，Escape 关闭 | Vue 3 |
| `PnwChoiceDialogHost` | 多按钮选择对话框，支持复选框 | Vue 3 + Element Plus |
| `PnwComboTextInput` | 带下拉选项的文本输入框 | Vue 3 |
| `PnwExpandCaret` | 展开/折叠三角图标 | 无 |
| `PnwAsyncProgressOverlay` | 任务进度浮层（全屏/浮动/最小化三态） | Vue 3 + Element Plus + Pinia |

### 壳层布局组件

| 组件 | 说明 | 依赖 |
|------|------|------|
| `PnwSidebarBlock` | 可折叠侧栏块，支持 strip/card 两种变体 | Vue 3 |
| `PnwSidebarBlockHead` | 侧栏块标题行 | PnwExpandCaret |
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
| `pnwChoiceDialog`         | Promise 风格的确认对话框（`pnwPromptChoice`, `pnwResolveChoice`）       |

### 状态管理

| 模块           | 说明                                                  |
| ------------ | --------------------------------------------------- |
| `pnwAsyncTasks` | 异步任务 Pinia store（`usePnwAsyncTaskStore`），多任务、持久化、取消 |
