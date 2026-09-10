# 命名前缀点检清单

规则：PascalCase → `Pnw` / camelCase → `pnw` / kebab-case → `pnw-` / UPPER_CASE → `PNW_`

## Run Node 统一清理导出

- 函数：`pnwPreviewRecursiveCleanupArtifacts`、`pnwCleanPreviewedRecursiveArtifacts`、`pnwPreviewGitUntrackedCleanup`、`pnwExecuteGitUntrackedCleanup`。
- 类型：`PnwRecursiveCleanupArtifactPreview`、`PnwGitUntrackedRepositoryPreview`、`PnwGitUntrackedCleanupPreview`、`PnwGitUntrackedCleanupResult`。
- Node 文件/Git 执行留在 `@phoenix-wing/run-node`；消费端保留确认、日志和 preview token 生命周期。递归/单 force 未跟踪清理不替换原直属/双 force 强制恢复入口。

---

## Vue 组件（5 个）— 全局注册，必须加

| 原名 | 新名 |
|------|------|
| `AppModalOverlay` | **`PnwAppModalOverlay`** |
| `ChoiceDialogHost` | **`PnwChoiceDialogHost`** |
| `ComboTextInput` | **`PnwComboTextInput`** |
| `ExpandCaret` | **`PnwExpandCaret`** |
| `AsyncProgressOverlay` | **`PnwAsyncProgressOverlay`** |

### Pnw Web 工作台实验组件

- `PnwPhoenixWingMark`、`PnwIcon`、`PnwFloatingPanel`
- `PnwActivityBar`
- `PnwActivityTree`
- `PnwRibbon`
- `PnwPrimaryBlock`、`PnwSecondaryBlock`、`PnwBottomPanel`
- `PnwWorkbenchLayout`、`PnwWorkbenchShell`、`PnwWorkbenchFooter`

### Pnw Web Component

- `PnwNavigationTreeView` / `<pnw-navigation-tree>`
- `PnwNavigationTreeModel`、`PnwNavigationTreeNode`、`PnwNavigationTreeRow`
- `pnwCodeDefineNavigationTree`、`pnwProjectNavigationTreeRows`
- `PNW_NAVIGATION_TREE_TAG`、`PNW_NAVIGATION_TREE_ACTION`、`PNW_NAVIGATION_TREE_ICON_KEYS`
- `PnwGitCommitGraph*`、`pnwReadGitCommitGraphPage`、`pnwProjectGitCommitGraphRows`
- `PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION`

---

## CSS 类名（~60 个）— 必须加 `pnw-`

| 组件 | 原名示例 | 新名示例 |
|------|----------|----------|
| AppModalOverlay | `.app-modal-overlay` `.app-modal-panel` | `.pnw-modal-overlay` `.pnw-modal-panel` |
| ChoiceDialogHost | `.choice-overlay` `.choice-dialog` `.choice-btn` 等 | `.pnw-choice-*` |
| ComboTextInput | `.combo-wrap` `.combo-text-input` `.combo-menu` 等 | `.pnw-combo-*` |
| ExpandCaret | `.phoenix-expand-twistie` `.is-expanded` | `.pnw-expand-twistie` `.pnw-is-expanded` |
| AsyncProgressOverlay | `.backdrop` `.overlay` `.panel` `.card` `.toast` `.minibar` 等 | `.pnw-*` |

---

## 全局函数（30 个）— 建议统一加 `pnw`

| 原名 | 新名 |
|------|------|
| `isTerminal` | **`pnwIsTerminal`** |
| `formatDuration` | **`pnwFormatDuration`** |
| `formatSeconds` | **`pnwFormatSeconds`** |
| `scheduleDebounced` | **`pnwScheduleDebounced`** |
| `propGroup` | **`pnwPropGroup`** |
| `propBool` | **`pnwPropBool`** |
| `propEnum` | **`pnwPropEnum`** |
| `propRadio` | **`pnwPropRadio`** |
| `propString` | **`pnwPropString`** |
| `propNumber` | **`pnwPropNumber`** |
| `propPath` | **`pnwPropPath`** |
| `propReadonly` | **`pnwPropReadonly`** |
| `propSheet` | **`pnwPropSheet`** |
| `promptChoice` | **`pnwPromptChoice`** |
| `resolveChoice` | **`pnwResolveChoice`** |
| `computeStepStatus` | **`pnwComputeStepStatus`** |
| `computeProgressPercent` | **`pnwComputeProgressPercent`** |
| `sortTasksByTime` | **`pnwSortTasksByTime`** |
| `averageFileDuration` | **`pnwAverageFileDuration`** |
| `fastestFileDuration` | **`pnwFastestFileDuration`** |
| `slowestFileDuration` | **`pnwSlowestFileDuration`** |
| `estimateRemaining` | **`pnwEstimateRemaining`** |
| `resolveColorScheme` | **`pnwResolveColorScheme`** |
| `applyColorScheme` | **`pnwApplyColorScheme`** |
| `bindPointerDrag` | **`pnwBindPointerDrag`** |
| `filterActiveTasks` | **`pnwFilterActiveTasks`** |
| `hasRunningTasks` | **`pnwHasRunningTasks`** |
| `appendTaskLog` | **`pnwAppendTaskLog`** |
| `recordFileTiming` | **`pnwRecordFileTiming`** |
| `choiceDialogOpen` | **`pnwChoiceDialogOpen`** |
| `choiceDialogRequest` | **`pnwChoiceDialogRequest`** |
| `createScanTaskState` | `pnwCreateScanTaskState` |
| `createTestTaskState` | `pnwCreateTestTaskState` |
| `updateTaskFromPoll` | `pnwUpdateTaskFromPoll` |
| `updateTaskFromStreamEvent` | `pnwUpdateTaskFromStreamEvent` |
| `clearPhoenixBrowserStorage` | `pnwClearPhoenixBrowserStorage` |

---

## 全局常量（3 个）— 必须加

| 原名 | 新名 |
|------|------|
| `VERSION` | **`PNW_VERSION`** |
| `SCAN_STEP_LABELS` | **`PNW_SCAN_STEP_LABELS`** |
| `TEST_STEP_LABEL` | **`PNW_TEST_STEP_LABEL`** |

---

## 全局类型（22 个）— 建议统一加 `Pnw`

| 原名 | 新名 |
|------|------|
| `ColorScheme` | **`PnwColorScheme`** |
| `TaskKind` | **`PnwTaskKind`** |
| `TaskStatus` | **`PnwTaskStatus`** |
| `StepStatus` | **`PnwStepStatus`** |
| `StepError` | **`PnwStepError`** |
| `ComboOption` | **`PnwComboOption`** |
| `FileTimingRecord` | `PnwFileTimingRecord` |
| `ChoiceDialogOption` | `PnwChoiceDialogOption` |
| `ChoiceDialogCheckboxItem` | `PnwChoiceDialogCheckboxItem` |
| `ChoiceDialogCheckboxes` | `PnwChoiceDialogCheckboxes` |
| `ChoiceDialogRequest` | `PnwChoiceDialogRequest` |
| `ChoiceDialogResult` | `PnwChoiceDialogResult` |
| `AsyncProgressStep` | `PnwAsyncProgressStep` |
| `AsyncTaskState` | `PnwAsyncTaskState` |
| `PagePropertyScalar` | `PnwPagePropertyScalar` |
| `PagePropertySelectOption` | `PnwPagePropertySelectOption` |
| `PagePropertySelectOptionsSource` | `PnwPagePropertySelectOptionsSource` |
| `PagePropertyFieldBase` | `PnwPagePropertyFieldBase` |
| `PagePropertyBooleanField` | `PnwPagePropertyBooleanField` |
| `PagePropertyStringField` | `PnwPagePropertyStringField` |
| `PagePropertyNumberField` | `PnwPagePropertyNumberField` |
| `PagePropertySelectField` | `PnwPagePropertySelectField` |
| `PagePropertyInfoField` | `PnwPagePropertyInfoField` |
| `PagePropertyPathField` | `PnwPagePropertyPathField` |
| `PagePropertyField` | `PnwPagePropertyField` |
| `PagePropertyGroup` | `PnwPagePropertyGroup` |
| `PagePropertiesSheet` | `PnwPagePropertiesSheet` |

### Pnw Web 工作台实验类型

- `PnwActivityBarPresentation`
- `PnwRibbonDisplayMode`、`PnwRibbonIconSize`、`PnwRibbonMode`、`PnwRibbonModeAppearance`、`PnwRibbonAppearance`
- `PnwIconName`、`PnwIconTestSize`
- `PnwFloatingPanelPosition`、`PnwFloatingPanelSize`、`PnwFloatingPanelInsets`
- `PnwNavigationNode`、`PnwWorkbenchTabItem`
- `PnwViewBlockId`、`PnwViewBlockContributions`、`PnwViewBlockVisibility`
- `PnwViewBlockComponentContribution`、`PnwBottomViewBlockComponentContribution`、`PnwViewBlockComponentContributions`
- `PnwViewContributionRegistry`、`PnwViewContributionRegistration`
- `PnwNavigationTreeRow`、`PnwNavigationRibbonGroup`、`PnwNavigationRibbonModule`、`PnwRibbonNavigationAdapterOptions`
- `PnwRibbonAppearanceIssueCode`、`PnwRibbonAppearanceValidation`

### Pnw Web 工作台实验函数

- `pnwVisibleNavigationNodes`
- `pnwFlattenNavigationTree`
- `pnwNavigationLeafIds`
- `pnwNavigationLeaves`、`pnwNavigationNodeContains`
- `pnwProjectNavigationRibbon`
- `pnwNavigationFromRibbonTabs`
- `pnwClampFloatingPanelPosition`、`pnwNormalizeFloatingPanelInsets`
- `pnwRibbonIconSizesFor`、`pnwResolveRibbonNaturalHeight`、`pnwValidateRibbonAppearance`、`pnwNextRibbonFocusIndex`
- `pnwAvailableViewBlockIds`、`pnwResolveViewBlockVisibility`、`pnwToggleViewBlockVisibility`
- `pnwCreateViewContributionRegistry`、`pnwCreateViewContributionRegistration`
- `usePnwViewContribution`、`usePnwRegisteredViewContribution`
- `pnwViewBlockComponentAvailability`、`pnwResolveViewBlockComponentProps`、`pnwResolveBottomViewBlockTabs`

### Pnw Web 工作台实验常量

- `PNW_DEFAULT_RIBBON_APPEARANCE`
- `PNW_VIEW_BLOCK_IDS`
- `PNW_ICON_NAMES`、`PNW_ICON_TEST_SIZES`

### Pnw Web 工作台 CSS token

- 主题表面：`--pnw-workbench-bg`、`--pnw-workbench-surface`、`--pnw-workbench-text`、`--pnw-workbench-muted`、`--pnw-workbench-border`
- 浮层语义：`--pnw-overlay-backdrop`、`--pnw-overlay-shadow`、`--pnw-control-bg`、`--pnw-primary-bg`、`--pnw-primary-text`、`--pnw-danger-bg`、`--pnw-danger-border`、`--pnw-danger-text`
- 导航与状态：`--pnw-activity-tree-bg`、`--pnw-ribbon-bg`、`--pnw-ribbon-module-bg`、`--pnw-ribbon-module-handle`、`--pnw-control-hover-bg`、`--pnw-control-active-bg`、`--pnw-control-active-text`、`--pnw-focus-ring`
- 尺寸：`--pnw-activity-tree-width`、`--pnw-activity-rail-width`、`--pnw-primary-block-width`、`--pnw-secondary-block-width`、`--pnw-bottom-panel-height`、`--pnw-floating-panel-width`、`--pnw-floating-panel-max-height`、`--pnw-workbench-header-modules-max-width`、`--pnw-ribbon-module-tab-gap`、`--pnw-ribbon-module-tab-padding-inline`、`--pnw-ribbon-module-tab-font-size`、`--pnw-ribbon-module-tab-indicator-inset`

---

## Store（1 个）

| 原名 | 新名 |
|------|------|
| `useAsyncTaskStore` | **`usePnwAsyncTaskStore`** |

---

## 汇总

| 类别 | 数量 | 加前缀 | 规则 |
|------|------|--------|------|
| Vue 组件 | 5 | ✅ 全部 | `PnwXxx` |
| CSS 类名 | ~60 | ✅ 全部 | `pnw-xxx` |
| 全局函数 | 30 | ✅ 全部 | `pnwXxx` |
| 全局常量 | 3 | ✅ 全部 | `PNW_XXX` |
| 全局类型 | 22 | ✅ 全部 | `PnwXxx` |
| Store | 1 | ✅ | `usePnwXxxStore` |
