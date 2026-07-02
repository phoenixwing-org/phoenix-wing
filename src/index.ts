// phoenix-wing — Phoenix Wing 共享 TypeScript 工具库
// 纯逻辑 + Vue3 控件 + 算法

export const PNW_VERSION = '0.1.2'

// ---------------------------------------------------------------------------
// 异步任务进度
// ---------------------------------------------------------------------------
export {
  type PnwAsyncProgressStep,
  type PnwAsyncTaskState,
  type PnwTaskKind,
  type PnwTaskStatus,
  type PnwStepStatus,
  type PnwStepError,
  type PnwFileTimingRecord,
  PNW_SCAN_STEP_LABELS,
  PNW_TEST_STEP_LABEL,
} from './utils/pnwAsyncProgressTypes.js'

export {
  pnwCreateScanTaskState,
  pnwCreateTestTaskState,
  pnwComputeStepStatus,
  pnwComputeProgressPercent,
  pnwIsTerminal,
  pnwFilterActiveTasks,
  pnwSortTasksByTime,
  pnwHasRunningTasks,
  pnwAppendTaskLog,
  pnwUpdateTaskFromPoll,
  pnwUpdateTaskFromStreamEvent,
  pnwRecordFileTiming,
  pnwAverageFileDuration,
  pnwFastestFileDuration,
  pnwSlowestFileDuration,
  pnwEstimateRemaining,
  pnwFormatDuration,
  pnwFormatSeconds,
} from './utils/pnwAsyncProgress.js'

// ---------------------------------------------------------------------------
// 防抖调度
// ---------------------------------------------------------------------------
export { pnwScheduleDebounced } from './utils/pnwScheduleDebounced.js'

// ---------------------------------------------------------------------------
// 色彩方案
// ---------------------------------------------------------------------------
export { type PnwColorScheme, pnwResolveColorScheme, pnwApplyColorScheme } from './utils/pnwColorScheme.js'

// ---------------------------------------------------------------------------
// 指针拖拽
// ---------------------------------------------------------------------------
export { pnwBindPointerDrag } from './utils/pnwPointerDrag.js'

// ---------------------------------------------------------------------------
// 浏览器存储
// ---------------------------------------------------------------------------
export { pnwClearPhoenixBrowserStorage } from './utils/pnwBrowserStorage.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export { type PnwComboOption } from './types/pnwComboTypes.js'

export {
  type PnwPagePropertyScalar,
  type PnwPagePropertySelectOption,
  type PnwPagePropertySelectOptionsSource,
  type PnwPagePropertyFieldBase,
  type PnwPagePropertyBooleanField,
  type PnwPagePropertyStringField,
  type PnwPagePropertyNumberField,
  type PnwPagePropertySelectField,
  type PnwPagePropertyInfoField,
  type PnwPagePropertyPathField,
  type PnwPagePropertyField,
  type PnwPagePropertyGroup,
  type PnwPagePropertiesSheet,
} from './types/pnwPageProperties.js'

// ---------------------------------------------------------------------------
// 属性表 Schema 构建器
// ---------------------------------------------------------------------------
export {
  pnwPropGroup,
  pnwPropBool,
  pnwPropEnum,
  pnwPropRadio,
  pnwPropString,
  pnwPropNumber,
  pnwPropPath,
  pnwPropReadonly,
  pnwPropSheet,
} from './utils/pnwPagePropertySchema.js'

// ---------------------------------------------------------------------------
// Composables — 壳层框架
// ---------------------------------------------------------------------------
export {
  type PnwShellLayout,
  type PnwSideDock,
  type PnwSideDockVisibility,
  type PnwSideDockVisibilityContext,
  pnwGitCommitPanelDock,
  pnwSideDockVisibility,
} from './composables/pnwSideDockLayout.js'

export {
  type PnwTableColumnDef,
  usePnwResizableTable,
} from './composables/usePnwResizableTable.js'

export {
  PNW_DEFAULT_APP_TITLE,
  usePnwDocumentTitle,
} from './composables/usePnwDocumentTitle.js'

export {
  pnwSetPropertiesActivePage,
  pnwRegisterPageProperties,
  pnwUnregisterPageProperties,
  usePnwPagePropertiesHost,
} from './composables/pnwPagePropertiesHost.js'

export { usePnwPagePropertySheet } from './composables/usePnwPagePropertySheet.js'

// ---------------------------------------------------------------------------
// Ribbon 配置类型
// ---------------------------------------------------------------------------
export {
  type PnwRibbonItemSize,
  type PnwRibbonItemDef,
  type PnwRibbonGroupDef,
  type PnwRibbonTabDef,
} from './types/PnwRibbonConfig.js'

// ---------------------------------------------------------------------------
// 工作台 Tab 管理
// ---------------------------------------------------------------------------
export {
  type PnwWorkbenchTabPayload,
  type PnwWorkbenchTab,
  type PnwWorkbenchSessionTab,
  type PnwWorkbenchSessionSnapshot,
  type PnwOpenTabOptions,
  type PnwPageTabPolicy,
  type PnwWorkbenchConfig,
  type PnwWorkbenchContext,
  pnwCreateWorkbench,
} from './composables/pnwCreateWorkbench.js'

// ---------------------------------------------------------------------------
// Ribbon 图标 & Tab 切换
// ---------------------------------------------------------------------------
export { pnwRegisterRibbonIcons, pnwRibbonIconFor } from './composables/pnwRibbonIcons.js'
export { usePnwRibbonTabs } from './composables/usePnwRibbonTabs.js'

// ---------------------------------------------------------------------------
// URL 同步
// ---------------------------------------------------------------------------
export {
  type PnwUrlSyncTab,
  type PnwShellUrlIntent,
  type PnwUrlParser,
  pnwRegisterUrlParser,
  pnwParseShellUrl,
  pnwBuildShellSearchParams,
  pnwReplaceShellUrl,
} from './composables/pnwShellUrlSync.js'

// ---------------------------------------------------------------------------
// Pinia stores
// ---------------------------------------------------------------------------
export { usePnwAsyncTaskStore } from './stores/pnwAsyncTasks.js'

// ---------------------------------------------------------------------------
// Vue3 Composables
// ---------------------------------------------------------------------------
export {
  type PnwChoiceDialogOption,
  type PnwChoiceDialogCheckboxItem,
  type PnwChoiceDialogCheckboxes,
  type PnwChoiceDialogRequest,
  type PnwChoiceDialogResult,
  pnwChoiceDialogOpen,
  pnwChoiceDialogRequest,
  pnwPromptChoice,
  pnwResolveChoice,
  pnwAlert,
  pnwPromptInput,
} from './composables/pnwChoiceDialog.js'

// 壳层组件从子路径导入:
//   import PnwSidebarBlock from 'phoenix-wing/layout/PnwSidebarBlock.vue'
//   import PnwSidebarBlockHead from 'phoenix-wing/layout/PnwSidebarBlockHead.vue'
//   import PnwRibbonShell from 'phoenix-wing/layout/PnwRibbonShell.vue'
//   import PnwRibbonTabBar from 'phoenix-wing/layout/PnwRibbonTabBar.vue'
//   import PnwRibbonGroup from 'phoenix-wing/layout/PnwRibbonGroup.vue'
//   import PnwRibbonToolButton from 'phoenix-wing/layout/PnwRibbonToolButton.vue'
//   import PnwRibbonUtilButton from 'phoenix-wing/layout/PnwRibbonUtilButton.vue'
//   import PnwPageHeader from 'phoenix-wing/layout/PnwPageHeader.vue'
//   import PnwShellLogPanel from 'phoenix-wing/layout/PnwShellLogPanel.vue'
//   import PnwWorkbenchTabBar from 'phoenix-wing/layout/PnwWorkbenchTabBar.vue'
//   import PnwWelcomeShell from 'phoenix-wing/layout/PnwWelcomeShell.vue'
//   import PnwAppModalOverlay from 'phoenix-wing/components/PnwAppModalOverlay.vue'
//   import PnwChoiceDialogHost from 'phoenix-wing/components/PnwChoiceDialogHost.vue'
//   import PnwComboTextInput from 'phoenix-wing/components/PnwComboTextInput.vue'
//   import PnwExpandCaret from 'phoenix-wing/components/PnwExpandCaret.vue'
//   import PnwAsyncProgressOverlay from 'phoenix-wing/components/PnwAsyncProgressOverlay.vue'
